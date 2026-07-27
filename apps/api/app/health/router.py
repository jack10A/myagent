from fastapi import APIRouter

from app.health.schemas import HealthCheckIn, HealthCheckInResult
from app.health.service import get_health_summary, save_health_check_in

router = APIRouter()


@router.get("/summary")
def summary() -> dict:
    return get_health_summary()


@router.post("/check-in", response_model=HealthCheckInResult)
def check_in(payload: HealthCheckIn) -> dict:
    return save_health_check_in(payload)
