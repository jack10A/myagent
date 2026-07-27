from fastapi import APIRouter, Query

from app.alerts.service import get_guardian_alerts
from app.core.config import settings

router = APIRouter()


@router.get("/nearby")
def nearby_alerts(
    lat: float = Query(default=settings.default_alert_lat),
    lon: float = Query(default=settings.default_alert_lon),
    city: str = Query(default=settings.default_alert_city),
) -> dict:
    return get_guardian_alerts(lat=lat, lon=lon, city=city)

