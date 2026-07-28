from fastapi import APIRouter

from app.briefing.service import build_morning_briefing

router = APIRouter()


@router.get("/morning")
def morning_briefing() -> dict:
    return build_morning_briefing()
