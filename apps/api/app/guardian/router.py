from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.db.models import User
from app.guardian.schemas import GuardianReviewRequest
from app.guardian.service import review_action

router = APIRouter()


@router.post("/review")
def review(payload: GuardianReviewRequest, user: User = Depends(get_current_user)) -> dict:
    payload.user_context = user.profile.context if user.profile else {}
    return review_action(payload).model_dump()

