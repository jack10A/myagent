from datetime import UTC, datetime
from typing import Any

from app.health.schemas import HealthCheckIn
from app.profile.store import read_profile, write_profile

URGENT_SYMPTOMS = {
    "chest pain",
    "shortness of breath",
    "fainting",
    "severe headache",
    "stroke symptoms",
    "suicidal thoughts",
    "severe bleeding",
}


def save_health_check_in(payload: HealthCheckIn) -> dict[str, Any]:
    check_in = payload.model_dump()
    check_in["created_at"] = datetime.now(UTC).isoformat()

    profile = read_profile()
    health = profile.get("health") or {}
    check_ins = list(health.get("check_ins") or [])
    check_ins.insert(0, check_in)

    updated_health = {
        "check_ins": check_ins[:30],
        "latest": check_in,
        "updated_at": datetime.now(UTC).isoformat(),
    }
    write_profile({"health": updated_health})

    insights = build_insights(check_in, check_ins[:7])
    urgent_warning = detect_urgent_warning(check_in)

    return {
        "saved": True,
        "check_in": check_in,
        "insights": insights,
        "urgent_warning": urgent_warning,
        "disclaimer": "MyAgent Health tracks patterns and reminders only. It does not diagnose, treat, or replace a doctor.",
    }


def get_health_summary() -> dict[str, Any]:
    health = (read_profile().get("health") or {})
    check_ins = list(health.get("check_ins") or [])
    latest = health.get("latest")
    return {
        "latest": latest,
        "check_ins": check_ins[:30],
        "insights": build_insights(latest, check_ins[:7]) if latest else [],
        "urgent_warning": detect_urgent_warning(latest) if latest else None,
        "disclaimer": "MyAgent Health tracks patterns and reminders only. It does not diagnose, treat, or replace a doctor.",
    }


def build_insights(latest: dict[str, Any], recent: list[dict[str, Any]]) -> list[dict[str, str]]:
    insights = []
    if latest["sleep_hours"] < 6:
        insights.append(
            {
                "title": "Sleep is low",
                "body": "You logged less than 6 hours of sleep. MyAgent can remind you to protect recovery time tonight.",
                "severity": "warning",
            }
        )
    if latest["water_glasses"] < 4:
        insights.append(
            {
                "title": "Hydration reminder",
                "body": "Water intake looks low today. Add a gentle reminder instead of waiting until you feel drained.",
                "severity": "safe",
            }
        )
    if latest["energy"] <= 2 and latest["mood"] <= 2:
        insights.append(
            {
                "title": "Low energy and mood",
                "body": "Your mood and energy are both low. Consider lighter tasks, rest, or contacting someone you trust.",
                "severity": "warning",
            }
        )
    if latest["exercise_minutes"] >= 20:
        insights.append(
            {
                "title": "Movement logged",
                "body": "You logged meaningful movement today. MyAgent will keep this as a positive habit signal.",
                "severity": "good",
            }
        )

    if len(recent) >= 3:
        average_sleep = sum(float(item.get("sleep_hours") or 0) for item in recent) / len(recent)
        if average_sleep < 6:
            insights.append(
                {
                    "title": "Sleep trend needs attention",
                    "body": "Your recent sleep average is under 6 hours. MyAgent should lower evening workload and suggest earlier wind-down time.",
                    "severity": "warning",
                }
            )

    return insights or [
        {
            "title": "Health check-in saved",
            "body": "No major pattern detected from this check-in. Keep logging daily to make trends more useful.",
            "severity": "safe",
        }
    ]


def detect_urgent_warning(check_in: dict[str, Any] | None) -> str | None:
    if not check_in:
        return None
    symptoms = {str(symptom).lower() for symptom in check_in.get("symptoms") or []}
    matched = sorted(symptoms.intersection(URGENT_SYMPTOMS))
    if matched:
        return (
            "Urgent symptom logged: "
            + ", ".join(matched)
            + ". If this is happening now or feels serious, contact local emergency services immediately."
        )
    return None
