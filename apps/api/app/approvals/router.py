from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.activity.store import update_activity_approval
from app.approvals.executor import execute_approval
from app.approvals.store import read_approval, read_approvals, update_approval_draft, update_approval_execution, update_approval_status

router = APIRouter()


class ApprovalStatusUpdate(BaseModel):
    status: str


class DraftUpdate(BaseModel):
    to: str | None = None
    subject: str | None = None
    body: str | None = None
    title: str | None = None
    start: str | None = None
    end: str | None = None
    description: str | None = None
    reminders: list[dict] | None = None


@router.get("")
def list_approvals() -> dict:
    approvals = read_approvals()
    return {
        "approvals": approvals,
        "pending_count": sum(1 for item in approvals if item.get("status") in {"pending", "editing"}),
    }


@router.patch("/{approval_id}")
def update_approval(approval_id: str, payload: ApprovalStatusUpdate) -> dict:
    allowed = {"pending", "approved", "rejected", "editing"}
    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(sorted(allowed))}")

    approval = read_approval(approval_id)
    if approval is None:
        raise HTTPException(status_code=404, detail="Approval not found")
    if payload.status == "approved":
        execution = execute_approval(approval)
        approval = update_approval_status(approval_id, payload.status) or approval
        if execution:
            approval = update_approval_execution(approval_id, execution) or approval
        update_activity_approval(approval_id, payload.status, execution)
        return approval

    approval = update_approval_status(approval_id, payload.status)
    if approval is None:
        raise HTTPException(status_code=404, detail="Approval not found")
    update_activity_approval(approval_id, payload.status)
    return approval


@router.patch("/{approval_id}/draft")
def update_draft(approval_id: str, payload: DraftUpdate) -> dict:
    approval = update_approval_draft(approval_id, payload.model_dump())
    if approval is None:
        raise HTTPException(status_code=404, detail="Draft action not found")
    return approval
