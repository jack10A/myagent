import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.core.demo_memory import read_memory_value, write_memory_value

ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT / "data"
APPROVALS_FILE = DATA_DIR / "demo_approvals.json"
APPROVALS_MEMORY_KEY = "demo_approvals"

ACTIVE_STATUSES = {"pending", "editing"}


def read_approvals() -> list[dict[str, Any]]:
    return list(reversed(_read_raw()))


def read_approval(approval_id: str) -> dict[str, Any] | None:
    for approval in _read_raw():
        if approval.get("id") == approval_id:
            return approval
    return None


def create_approval_from_trace(trace: dict[str, Any]) -> dict[str, Any] | None:
    guardian = trace.get("guardian") or {}
    actions = trace.get("actions") or []
    needs_approval = guardian.get("approval_required") or any(action.get("type") == "request_approval" for action in actions)

    if not needs_approval:
        return None

    now = datetime.now(UTC).isoformat()
    approval = {
        "id": str(uuid4()),
        "status": "pending",
        "created_at": now,
        "updated_at": now,
        "command": trace.get("command"),
        "intent": trace.get("intent"),
        "situation": trace.get("situation") or {},
        "recommendation": trace.get("recommendation") or {},
        "actions": actions,
        "guardian": guardian,
        "agent_messages": trace.get("agent_messages") or [],
    }

    approvals = _read_raw()
    approvals.append(approval)
    _write_raw(approvals)
    return approval


def update_approval_status(approval_id: str, status: str) -> dict[str, Any] | None:
    approvals = _read_raw()
    for approval in approvals:
        if approval.get("id") == approval_id:
            approval["status"] = status
            approval["updated_at"] = datetime.now(UTC).isoformat()
            _write_raw(approvals)
            return approval
    return None


def update_approval_execution(approval_id: str, execution: dict[str, Any]) -> dict[str, Any] | None:
    approvals = _read_raw()
    for approval in approvals:
        if approval.get("id") == approval_id:
            approval["execution"] = execution
            approval["updated_at"] = datetime.now(UTC).isoformat()
            _write_raw(approvals)
            return approval
    return None


def update_approval_draft(approval_id: str, draft: dict[str, Any]) -> dict[str, Any] | None:
    approvals = _read_raw()
    for approval in approvals:
        if approval.get("id") != approval_id:
            continue

        for action in approval.get("actions", []):
            if action.get("type") in {"draft_email", "draft_calendar_event"}:
                payload = action.setdefault("payload", {})
                payload.update({key: value for key, value in draft.items() if value is not None})
                if action.get("type") == "draft_calendar_event":
                    from app.calendar.service import add_draft_conflicts
                    from app.profile.store import read_profile

                    payload.update(add_draft_conflicts(read_profile(), payload))
                approval["status"] = "editing"
                approval["updated_at"] = datetime.now(UTC).isoformat()
                _write_raw(approvals)
                return approval
        return None
    return None


def pending_count() -> int:
    return sum(1 for approval in _read_raw() if approval.get("status") in ACTIVE_STATUSES)


def _read_raw() -> list[dict[str, Any]]:
    db_value = read_memory_value(APPROVALS_MEMORY_KEY)
    if isinstance(db_value, dict) and isinstance(db_value.get("items"), list):
        return db_value["items"]

    if not APPROVALS_FILE.exists():
        return []
    raw = APPROVALS_FILE.read_text(encoding="utf-8")
    approvals = json.loads(raw) if raw else []
    write_memory_value(APPROVALS_MEMORY_KEY, {"items": approvals})
    return approvals


def _write_raw(approvals: list[dict[str, Any]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    APPROVALS_FILE.write_text(json.dumps(approvals, indent=2), encoding="utf-8")
    write_memory_value(APPROVALS_MEMORY_KEY, {"items": approvals})
