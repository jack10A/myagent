from pydantic import BaseModel, Field


class GuardianReviewRequest(BaseModel):
    action_type: str
    payload: dict = Field(default_factory=dict)
    user_context: dict = Field(default_factory=dict)


class GuardianReview(BaseModel):
    decision: str
    risk_level: str
    approval_required: bool
    reason: str
    safe_alternative: str | None = None

