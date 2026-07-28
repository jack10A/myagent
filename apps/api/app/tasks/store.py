from datetime import UTC, datetime
from typing import Any

from app.core.demo_memory import delete_memory_value, read_memory_value, write_memory_value

TASK_STATE_MEMORY_KEY = "demo_task_state"
VALID_STATUSES = {"done", "snoozed", "active"}


def read_task_state() -> dict[str, Any]:
    value = read_memory_value(TASK_STATE_MEMORY_KEY)
    if isinstance(value, dict):
        return {
            "items": value.get("items", {}),
            "updated_at": value.get("updated_at"),
        }
    return {"items": {}, "updated_at": None}


def write_task_status(task_id: str, status: str) -> dict[str, Any] | None:
    if status not in VALID_STATUSES:
        return None

    state = read_task_state()
    items = state.get("items", {})
    if not isinstance(items, dict):
        items = {}

    if status == "active":
        items.pop(task_id, None)
    else:
        items[task_id] = {
            "id": task_id,
            "status": status,
            "updated_at": datetime.now(UTC).isoformat(),
        }

    saved = {"items": items, "updated_at": datetime.now(UTC).isoformat()}
    write_memory_value(TASK_STATE_MEMORY_KEY, saved)
    return saved


def clear_task_state() -> dict[str, Any]:
    delete_memory_value(TASK_STATE_MEMORY_KEY)
    return read_task_state()

