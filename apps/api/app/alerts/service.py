from datetime import UTC, datetime

import httpx

from app.core.config import settings


def get_guardian_alerts(lat: float, lon: float, city: str) -> dict:
    if settings.emergency_alerts_provider == "nws":
        try:
            return get_nws_alerts(lat=lat, lon=lon, city=city)
        except httpx.HTTPError:
            return mock_alerts(city=city, provider_status="nws_unavailable")

    return mock_alerts(city=city, provider_status="mock")


def get_nws_alerts(lat: float, lon: float, city: str) -> dict:
    headers = {
        "User-Agent": "MyAgent local MVP, contact: local@example.com",
        "Accept": "application/geo+json",
    }
    url = "https://api.weather.gov/alerts/active"
    params = {"point": f"{lat},{lon}"}

    with httpx.Client(timeout=10, headers=headers) as client:
        response = client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

    alerts = []
    for feature in data.get("features", [])[:10]:
        properties = feature.get("properties", {})
        alerts.append(
            {
                "id": properties.get("id") or feature.get("id"),
                "title": properties.get("event") or "Weather alert",
                "severity": normalize_severity(properties.get("severity")),
                "certainty": properties.get("certainty"),
                "urgency": properties.get("urgency"),
                "area": properties.get("areaDesc"),
                "description": properties.get("headline") or properties.get("description"),
                "instruction": properties.get("instruction"),
                "source": "National Weather Service",
            }
        )

    return {
        "city": city,
        "lat": lat,
        "lon": lon,
        "provider": "nws",
        "generated_at": datetime.now(UTC).isoformat(),
        "alerts": alerts,
        "status": "ok",
    }


def normalize_severity(value: str | None) -> str:
    if value in {"Extreme", "Severe"}:
        return "urgent"
    if value in {"Moderate"}:
        return "warning"
    return "safe"


def mock_alerts(city: str, provider_status: str) -> dict:
    return {
        "city": city,
        "lat": settings.default_alert_lat,
        "lon": settings.default_alert_lon,
        "provider": settings.emergency_alerts_provider,
        "generated_at": datetime.now(UTC).isoformat(),
        "status": provider_status,
        "alerts": [
            {
                "id": "mock-weather-1",
                "title": "Severe weather watch",
                "severity": "warning",
                "certainty": "Likely",
                "urgency": "Expected",
                "area": city,
                "description": "Heavy rain may affect travel near your next calendar event.",
                "instruction": "Guardian can suggest leaving earlier or drafting a delay message.",
                "source": "Mock Guardian Alerts",
            },
            {
                "id": "mock-emergency-1",
                "title": "Traffic accident near route",
                "severity": "urgent",
                "certainty": "Observed",
                "urgency": "Immediate",
                "area": city,
                "description": "A major delay may affect your route.",
                "instruction": "Review alternate route, notify meeting attendees, or reschedule.",
                "source": "Mock Guardian Alerts",
            },
        ],
    }

