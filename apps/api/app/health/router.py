from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.health.schemas import HealthCheckIn, HealthCheckInResult, HealthShortcutSync
from app.health.service import get_health_summary, save_health_check_in, save_shortcut_sync

router = APIRouter()


@router.get("/summary")
def summary() -> dict:
    return get_health_summary()


@router.post("/check-in", response_model=HealthCheckInResult)
def check_in(payload: HealthCheckIn) -> dict:
    return save_health_check_in(payload)


@router.post("/shortcut")
def shortcut_sync(payload: HealthShortcutSync, token: str) -> dict:
    if token != settings.health_webhook_token:
        raise HTTPException(status_code=401, detail="Invalid health webhook token")
    return save_shortcut_sync(payload)
