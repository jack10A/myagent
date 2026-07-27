from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.db.models import User

router = APIRouter()


@router.get("/me")
def me(user: User = Depends(get_current_user)) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "created_at": user.created_at.isoformat(),
    }

