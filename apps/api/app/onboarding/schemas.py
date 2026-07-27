from pydantic import BaseModel, Field


class OnboardingAnswer(BaseModel):
    question_id: str
    answer: str


class CompleteOnboardingRequest(BaseModel):
    answers: list[OnboardingAnswer] = Field(default_factory=list)
    city: str | None = None
    timezone: str | None = None


class NextQuestionRequest(BaseModel):
    answers: list[OnboardingAnswer] = Field(default_factory=list)

