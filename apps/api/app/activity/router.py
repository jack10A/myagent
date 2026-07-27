from fastapi import APIRouter

from app.activity.store import read_activity

router = APIRouter()


@router.get("")
def list_activity() -> dict:
    items = read_activity()
    return {"items": items, "count": len(items)}
