from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.db.models import Action, ActionStatus, User

router = APIRouter()


@router.post("/{action_id}/approve")
def approve_action(action_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    action = db.get(Action, action_id)
    if action is None or action.user_id != user.id:
        raise HTTPException(status_code=404, detail="Action not found")
    action.status = ActionStatus.approved
    db.commit()
    return {"id": str(action.id), "status": action.status}


@router.post("/{action_id}/reject")
def reject_action(action_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    action = db.get(Action, action_id)
    if action is None or action.user_id != user.id:
        raise HTTPException(status_code=404, detail="Action not found")
    action.status = ActionStatus.rejected
    db.commit()
    return {"id": str(action.id), "status": action.status}

