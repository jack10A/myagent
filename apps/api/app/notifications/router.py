from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.db.models import Notification, User
from app.notifications.demo import build_demo_notifications

router = APIRouter()


@router.get("/demo")
def demo_notifications(limit: int = 40) -> dict:
    return build_demo_notifications(limit=limit)


@router.get("")
def list_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(
        select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(30)
    ).all()
    return [
        {
            "id": str(row.id),
            "title": row.title,
            "body": row.body,
            "priority": row.priority,
            "read": row.read,
            "created_at": row.created_at.isoformat(),
        }
        for row in rows
    ]
