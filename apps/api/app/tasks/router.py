from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.tasks.store import clear_task_state, read_task_state, write_task_status

router = APIRouter()


class TaskStateUpdate(BaseModel):
    status: str


@router.get("/state")
def get_task_state() -> dict:
    state = read_task_state()
    items = state.get("items", {})
    return {
        "items": items,
        "hidden_ids": [task_id for task_id, item in items.items() if item.get("status") in {"done", "snoozed"}],
        "updated_at": state.get("updated_at"),
    }


@router.patch("/state/{task_id}")
def update_task_state(task_id: str, payload: TaskStateUpdate) -> dict:
    state = write_task_status(task_id, payload.status)
    if state is None:
        raise HTTPException(status_code=400, detail="status must be done, snoozed, or active")
    return {"saved": True, "state": state}


@router.delete("/state")
def reset_task_state() -> dict:
    return {"cleared": True, "state": clear_task_state()}
