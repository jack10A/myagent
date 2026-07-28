import re
from typing import Any

from pydantic import BaseModel, Field, field_validator


class HealthCheckIn(BaseModel):
    mood: int = Field(ge=1, le=5)
    energy: int = Field(ge=1, le=5)
    sleep_hours: float = Field(ge=0, le=24)
    water_glasses: int = Field(ge=0, le=30)
    exercise_minutes: int = Field(ge=0, le=600)
    symptoms: list[str] = Field(default_factory=list)
    notes: str | None = None
    medication_taken: bool | None = None


class HealthInsight(BaseModel):
    title: str
    body: str
    severity: str


class HealthCheckInResult(BaseModel):
    saved: bool
    check_in: dict
    insights: list[HealthInsight]
    urgent_warning: str | None = None
    disclaimer: str


class HealthShortcutSync(BaseModel):
    steps: int | None = Field(default=None, ge=0, le=200000)
    active_calories: float | None = Field(default=None, ge=0, le=20000)
    distance_km: float | None = Field(default=None, ge=0, le=500)
    exercise_minutes: int | None = Field(default=None, ge=0, le=1440)
    stand_hours: int | None = Field(default=None, ge=0, le=24)
    sleep_hours: float | None = Field(default=None, ge=0, le=24)
    resting_heart_rate: int | None = Field(default=None, ge=20, le=220)
    source: str = "ios_shortcut"
    synced_for: str | None = None
    notes: str | None = None

    @field_validator(
        "steps",
        "active_calories",
        "distance_km",
        "exercise_minutes",
        "stand_hours",
        "sleep_hours",
        "resting_heart_rate",
        mode="before",
    )
    @classmethod
    def coerce_shortcut_number(cls, value: Any) -> Any:
        if value is None or isinstance(value, (int, float)):
            return value
        if isinstance(value, list):
            return cls.coerce_shortcut_number(value[0]) if value else None
        if isinstance(value, dict):
            for key in ("value", "Value", "quantity", "Quantity", "amount", "Amount"):
                if key in value:
                    return cls.coerce_shortcut_number(value[key])
            return cls.coerce_shortcut_number(" ".join(str(part) for part in value.values()))

        text = str(value).replace(",", "").strip()
        match = re.search(r"-?\d+(?:\.\d+)?", text)
        if not match:
            return None
        number = float(match.group(0))
        return int(number) if number.is_integer() else number
