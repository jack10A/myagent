from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.db.models import MemoryItem, User
from app.onboarding.schemas import CompleteOnboardingRequest, NextQuestionRequest
from app.onboarding.service import build_context_profile, next_question

router = APIRouter()


@router.post("/next-question")
def get_next_question(payload: NextQuestionRequest) -> dict:
    question = next_question(payload.answers)
    return {"complete": question is None, "question": question}


@router.post("/complete")
def complete_onboarding(
    payload: CompleteOnboardingRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    profile = build_context_profile(payload.answers)
    user.profile.context = profile
    user.profile.city = payload.city
    user.profile.timezone = payload.timezone

    db.add(
        MemoryItem(
            user_id=user.id,
            category="profile",
            title="User context profile",
            body=str(profile),
            importance=5,
            source="onboarding",
            metadata_json=profile,
        )
    )
    db.commit()
    return {"profile": profile, "guardian_enabled": user.profile.guardian_enabled}

