from pydantic import BaseModel, Field


class IncomingEvent(BaseModel):
    source: str
    event_type: str
    payload: dict = Field(default_factory=dict)


class AgentCommand(BaseModel):
    message: str = Field(min_length=3, max_length=2000)


class OrchestrationResult(BaseModel):
    situation: dict
    recommendation: dict
    actions: list[dict]
    guardian: dict
    agent_messages: list[dict] = Field(default_factory=list)
