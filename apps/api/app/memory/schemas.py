from pydantic import BaseModel, Field


class MemoryCreate(BaseModel):
    category: str
    title: str
    body: str
    importance: int = Field(default=3, ge=1, le=5)
    metadata: dict = Field(default_factory=dict)

