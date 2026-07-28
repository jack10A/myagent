from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT / "data"
PROFILE_FILE = DATA_DIR / "demo_profile.json"


class DemoProfile(BaseModel):
    name: str | None = None
    age: str | None = None
    lifeStage: str | None = None
    field: str | None = None
    goal: str | None = None
    careerAuth: str | None = None
    city: str | None = None
    gmail: dict[str, Any] | None = None
    calendar: dict[str, Any] | None = None
    github: dict[str, Any] | None = None
    linkedin: dict[str, Any] | None = None
    cv: dict[str, Any] | None = None
    captures: list[dict[str, Any]] = Field(default_factory=list)
    health: dict[str, Any] = Field(default_factory=dict)
    learning: list[dict[str, Any]] = Field(default_factory=list)
    jobs: list[dict[str, Any]] = Field(default_factory=list)
    updated_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


def read_profile() -> dict[str, Any]:
    if not PROFILE_FILE.exists():
        return DemoProfile().model_dump()
    return DemoProfile.model_validate_json(PROFILE_FILE.read_text(encoding="utf-8")).model_dump()


def write_profile(profile: dict[str, Any]) -> dict[str, Any]:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    current = read_profile()
    current.update({key: value for key, value in profile.items() if value is not None})
    current["updated_at"] = datetime.now(UTC).isoformat()
    model = DemoProfile.model_validate(current)
    PROFILE_FILE.write_text(model.model_dump_json(indent=2), encoding="utf-8")
    return model.model_dump()


def export_profile_bundle() -> dict[str, Any]:
    return {
        "exported_at": datetime.now(UTC).isoformat(),
        "profile": redact_sensitive(read_profile()),
        "note": "OAuth tokens and private auth values are redacted from this export.",
    }


def clear_profile_memory() -> dict[str, Any]:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    model = DemoProfile()
    PROFILE_FILE.write_text(model.model_dump_json(indent=2), encoding="utf-8")
    return model.model_dump()


def disable_profile_connector(connector: str) -> dict[str, Any] | None:
    allowed = {"gmail", "calendar", "github", "linkedin", "cv", "health"}
    if connector not in allowed:
        return None
    profile = read_profile()
    value: Any = {} if connector == "health" else None
    profile[connector] = value
    profile["updated_at"] = datetime.now(UTC).isoformat()
    model = DemoProfile.model_validate(profile)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    PROFILE_FILE.write_text(model.model_dump_json(indent=2), encoding="utf-8")
    return model.model_dump()


def redact_sensitive(value: Any) -> Any:
    sensitive_keys = {"access_token", "refresh_token", "id_token", "client_secret", "token", "oauth"}
    if isinstance(value, dict):
        redacted = {}
        for key, item in value.items():
            if str(key).lower() in sensitive_keys:
                redacted[key] = "[redacted]"
            else:
                redacted[key] = redact_sensitive(item)
        return redacted
    if isinstance(value, list):
        return [redact_sensitive(item) for item in value]
    return value


def profile_to_context(profile: dict[str, Any]) -> dict:
    linkedin = profile.get("linkedin") or {}
    linkedin_details = linkedin if isinstance(linkedin, dict) else {}
    linkedin_skills = linkedin_details.get("skills") or []
    cv_skills = (profile.get("cv") or {}).get("detected_skills", [])
    field = profile.get("field")
    target_role = linkedin_details.get("target_role") or field
    return {
        "identity": {
            "name": profile.get("name"),
            "age": profile.get("age"),
            "life_stage": profile.get("lifeStage"),
            "role": linkedin_details.get("current_role") or field,
            "target_role": target_role,
            "industry": field,
        },
        "goals": [profile["goal"]] if profile.get("goal") else [],
        "career_sources": split_sources(profile.get("careerAuth")),
        "github": profile.get("github") or {},
        "linkedin": profile.get("linkedin") or {},
        "gmail": profile.get("gmail") or {},
        "calendar": profile.get("calendar") or {},
        "cv": profile.get("cv"),
        "skills": merge_unique(cv_skills, linkedin_skills),
        "skill_gaps": (profile.get("cv") or {}).get("improvements", [])[:4],
        "captures": profile.get("captures") or [],
        "health": profile.get("health") or {},
        "learning": profile.get("learning") or [],
        "jobs": profile.get("jobs") or [],
        "preferences": {
            "guardian_city": profile.get("city"),
            "career_auth": profile.get("careerAuth"),
        },
    }


def split_sources(value: str | None) -> list[str]:
    if not value:
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


def merge_unique(first: list[str], second: list[str]) -> list[str]:
    seen = set()
    merged = []
    for item in first + second:
        normalized = str(item).strip()
        key = normalized.lower()
        if normalized and key not in seen:
            seen.add(key)
            merged.append(normalized)
    return merged
