import enum
from datetime import UTC, datetime
from uuid import UUID as PyUUID, uuid4

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def now_utc() -> datetime:
    return datetime.now(UTC)


class ConnectorType(str, enum.Enum):
    gmail = "gmail"
    google_calendar = "google_calendar"
    weather = "weather"
    emergency_alerts = "emergency_alerts"
    notion = "notion"
    google_drive = "google_drive"
    linkedin = "linkedin"
    github = "github"
    cv_resume = "cv_resume"


class SituationStatus(str, enum.Enum):
    open = "open"
    dismissed = "dismissed"
    resolved = "resolved"


class RecommendationStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    completed = "completed"


class ActionStatus(str, enum.Enum):
    proposed = "proposed"
    approved = "approved"
    rejected = "rejected"
    executed = "executed"
    blocked = "blocked"


class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    blocked = "blocked"


class User(Base):
    __tablename__ = "users"

    id: Mapped[PyUUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    profile: Mapped["UserProfile"] = relationship(back_populates="user", cascade="all, delete-orphan")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[PyUUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[PyUUID] = mapped_column(ForeignKey("users.id"), unique=True)
    context: Mapped[dict] = mapped_column(JSONB, default=dict)
    city: Mapped[str | None] = mapped_column(String(120))
    timezone: Mapped[str | None] = mapped_column(String(80))
    guardian_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    location_mode: Mapped[str] = mapped_column(String(40), default="city")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    user: Mapped[User] = relationship(back_populates="profile")


class AgentDefinition(Base):
    __tablename__ = "agents"

    id: Mapped[PyUUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[PyUUID] = mapped_column(ForeignKey("users.id"), index=True)
    key: Mapped[str] = mapped_column(String(80))
    role: Mapped[str] = mapped_column(String(160))
    goal: Mapped[str] = mapped_column(Text)
    tools: Mapped[list] = mapped_column(JSONB, default=list)
    prompt: Mapped[str] = mapped_column(Text)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class ConnectorAccount(Base):
    __tablename__ = "connector_accounts"

    id: Mapped[PyUUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[PyUUID] = mapped_column(ForeignKey("users.id"), index=True)
    connector_type: Mapped[ConnectorType] = mapped_column(Enum(ConnectorType))
    status: Mapped[str] = mapped_column(String(40), default="disconnected")
    scopes: Mapped[list] = mapped_column(JSONB, default=list)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class MemoryItem(Base):
    __tablename__ = "memory_items"

    id: Mapped[PyUUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[PyUUID] = mapped_column(ForeignKey("users.id"), index=True)
    category: Mapped[str] = mapped_column(String(80))
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    importance: Mapped[int] = mapped_column(Integer, default=3)
    source: Mapped[str] = mapped_column(String(80), default="manual")
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class Event(Base):
    __tablename__ = "events"

    id: Mapped[PyUUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[PyUUID] = mapped_column(ForeignKey("users.id"), index=True)
    source: Mapped[str] = mapped_column(String(80))
    event_type: Mapped[str] = mapped_column(String(120))
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class Situation(Base):
    __tablename__ = "situations"

    id: Mapped[PyUUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[PyUUID] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String(120))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(40), default="normal")
    status: Mapped[SituationStatus] = mapped_column(Enum(SituationStatus), default=SituationStatus.open)
    source_event_ids: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[PyUUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    situation_id: Mapped[PyUUID] = mapped_column(ForeignKey("situations.id"), index=True)
    user_id: Mapped[PyUUID] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    rationale: Mapped[str] = mapped_column(Text)
    confidence: Mapped[int] = mapped_column(Integer, default=70)
    status: Mapped[RecommendationStatus] = mapped_column(Enum(RecommendationStatus), default=RecommendationStatus.pending)
    guardian_result: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class Action(Base):
    __tablename__ = "actions"

    id: Mapped[PyUUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    recommendation_id: Mapped[PyUUID] = mapped_column(ForeignKey("recommendations.id"), index=True)
    user_id: Mapped[PyUUID] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String(120))
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    risk_level: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel), default=RiskLevel.medium)
    approval_required: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[ActionStatus] = mapped_column(Enum(ActionStatus), default=ActionStatus.proposed)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[PyUUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[PyUUID] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    priority: Mapped[str] = mapped_column(String(40), default="normal")
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

class AgentRun(Base):
    __tablename__ = "agent_runs"

    id: Mapped[PyUUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[PyUUID] = mapped_column(ForeignKey("users.id"), index=True)
    situation_id: Mapped[PyUUID | None] = mapped_column(ForeignKey("situations.id"), nullable=True)
    agent_key: Mapped[str] = mapped_column(String(80))
    input: Mapped[dict] = mapped_column(JSONB, default=dict)
    output: Mapped[dict] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(40), default="completed")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


