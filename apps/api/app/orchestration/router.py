from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.db.models import User
from app.orchestration.schemas import AgentCommand, IncomingEvent
from app.orchestration.service import process_command, process_event, run_demo_event

router = APIRouter()


@router.post("/events")
def ingest_event(
    payload: IncomingEvent,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return process_event(db, user, payload).model_dump()


@router.post("/demo")
def demo_event(payload: IncomingEvent) -> dict:
    return run_demo_event(payload)


@router.post("/command")
def agent_command(payload: AgentCommand) -> dict:
    return process_command(payload.message)
