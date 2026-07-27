from pydantic import BaseModel, Field


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
