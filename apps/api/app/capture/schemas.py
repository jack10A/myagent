from pydantic import BaseModel, Field


class CaptureRequest(BaseModel):
    capture_type: str = Field(pattern="^(meeting|youtube|notes)$")
    title: str | None = None
    source_url: str | None = None
    question: str | None = None
    transcript: str
    consent_confirmed: bool = False


class CaptureSegment(BaseModel):
    timestamp: str | None = None
    text: str
    relevance: int


class CaptureResult(BaseModel):
    capture_type: str
    title: str
    source_url: str | None = None
    summary: str
    important_points: list[str]
    action_items: list[str]
    decisions: list[str]
    people: list[str]
    answer: str | None = None
    relevant_parts: list[CaptureSegment]
    next_tasks: list[str]
    source_kind: str
    draft_follow_up: str
    guardian: dict
    saved_to_memory: bool
    memory_id: str | None = None
