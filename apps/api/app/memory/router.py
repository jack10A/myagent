from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.db.models import MemoryItem, User
from app.memory.schemas import MemoryCreate
from app.memory.timeline import build_memory_timeline

router = APIRouter()


@router.get("/timeline")
def memory_timeline(q: str | None = None, limit: int = 80) -> dict:
    return build_memory_timeline(query=q, limit=limit)


@router.get("")
def list_memory(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[dict]:
    items = db.scalars(
        select(MemoryItem).where(MemoryItem.user_id == user.id).order_by(MemoryItem.created_at.desc()).limit(50)
    ).all()
    return [
        {
            "id": str(item.id),
            "category": item.category,
            "title": item.title,
            "body": item.body,
            "importance": item.importance,
            "source": item.source,
            "created_at": item.created_at.isoformat(),
        }
        for item in items
    ]


@router.post("")
def create_memory(
    payload: MemoryCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    item = MemoryItem(
        user_id=user.id,
        category=payload.category,
        title=payload.title,
        body=payload.body,
        importance=payload.importance,
        source="manual",
        metadata_json=payload.metadata,
    )
    db.add(item)
    db.commit()
    return {"id": str(item.id), "status": "created"}
