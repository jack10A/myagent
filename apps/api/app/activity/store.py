import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT / "data"
ACTIVITY_FILE = DATA_DIR / "demo_activity.json"


def read_activity(limit: int = 30) -> list[dict[str, Any]]:
    items = list(reversed(_read_raw()))
    return items[:limit]


def create_activity_from_trace(trace: dict[str, Any]) -> dict[str, Any]:
    now = datetime.now(UTC).isoformat()
    item = {
        "id": str(uuid4()),
        "created_at": now,
        "updated_at": now,
        "kind": "command",
        "command": trace.get("command"),
        "intent": trace.get("intent"),
        "situation": trace.get("situation") or {},
        "recommendation": trace.get("recommendation") or {},
        "actions": trace.get("actions") or [],
        "guardian": trace.get("guardian") or {},
        "agent_messages": trace.get("agent_messages") or [],
        "approval": trace.get("approval"),
    }
    items = _read_raw()
    items.append(item)
    _write_raw(items)
    return item


def update_activity_approval(approval_id: str, status: str, execution: dict[str, Any] | None = None) -> None:
    items = _read_raw()
    changed = False
    for item in items:
        approval = item.get("approval") or {}
        if approval.get("id") == approval_id:
            approval["status"] = status
            if execution:
                approval["execution"] = execution
            item["approval"] = approval
            item["updated_at"] = datetime.now(UTC).isoformat()
            changed = True
    if changed:
        _write_raw(items)


def _read_raw() -> list[dict[str, Any]]:
    if not ACTIVITY_FILE.exists():
        return []
    raw = ACTIVITY_FILE.read_text(encoding="utf-8")
    return json.loads(raw) if raw else []


def _write_raw(items: list[dict[str, Any]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    ACTIVITY_FILE.write_text(json.dumps(items, indent=2), encoding="utf-8")
