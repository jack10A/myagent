from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.activity.store import create_activity_from_trace
from app.agents.collaboration import run_agent_collaboration
from app.auth.dependencies import get_current_user
from app.db.models import User
from app.growth.service import analyze_cv, build_growth_plan
from app.growth.jobs import create_job_outreach_approval, job_tasks, read_job_items, search_jobs, track_job, update_job_details, update_job_status
from app.growth.learning import learning_tasks, read_learning_items, track_learning_resource, update_learning_status
from app.orchestration.schemas import IncomingEvent
from app.orchestration.service import detect_situation_from_context
from app.profile.store import profile_to_context, read_profile, write_profile

router = APIRouter()


class LearningTrackRequest(BaseModel):
    resource: dict[str, Any]


class LearningStatusRequest(BaseModel):
    status: str


class JobTrackRequest(BaseModel):
    job: dict[str, Any]


class JobStatusRequest(BaseModel):
    status: str


class JobDetailsRequest(BaseModel):
    company_name: str | None = None
    job_url: str | None = None
    recruiter_email: str | None = None
    follow_up_at: str | None = None
    notes: str | None = None


class JobSearchRequest(BaseModel):
    query: str
    location: str | None = None


class JobOutreachRequest(BaseModel):
    recipient: str | None = None


@router.get("/plan")
def get_growth_plan(user: User = Depends(get_current_user)) -> dict:
    context = user.profile.context if user.profile else {}
    return build_growth_plan(context)


@router.post("/cv/analyze")
async def analyze_cv_upload(file: UploadFile = File(...)) -> dict:
    content = await file.read()
    result = analyze_cv(filename=file.filename or "resume.pdf", content=content)
    profile = write_profile({"cv": result})
    context = profile_to_context(profile)
    event = IncomingEvent(source="cv", event_type="cv_analyzed", payload={"filename": result["filename"], "role_guess": result["role_guess"]})
    situation = detect_situation_from_context(context, event)
    collaboration = run_agent_collaboration(user_context=context, event=event, situation=situation)
    create_activity_from_trace(
        {
            "command": f"Analyzed CV: {result['filename']}",
            "intent": "cv_analyzed",
            "situation": situation,
            "recommendation": collaboration["recommendation"],
            "actions": collaboration["actions"],
            "guardian": collaboration["guardian"],
            "agent_messages": collaboration["messages"],
        }
    )
    return result


@router.get("/learning")
def list_learning() -> dict:
    items = read_learning_items()
    return {"items": items, "tasks": learning_tasks(), "count": len(items)}


@router.post("/learning/track")
def track_learning(payload: LearningTrackRequest) -> dict:
    item = track_learning_resource(payload.resource)
    return {"item": item, "tasks": learning_tasks()}


@router.patch("/learning/{item_id}")
def update_learning(item_id: str, payload: LearningStatusRequest) -> dict:
    if payload.status not in {"not_started", "learning", "completed", "portfolio"}:
        raise HTTPException(status_code=400, detail="Unsupported learning status")
    item = update_learning_status(item_id, payload.status)
    if not item:
        raise HTTPException(status_code=404, detail="Learning item not found")
    return {"item": item, "tasks": learning_tasks()}


@router.get("/jobs")
def list_jobs() -> dict:
    items = read_job_items()
    return {"items": items, "tasks": job_tasks(), "count": len(items)}


@router.post("/jobs/search")
def search_job_targets(payload: JobSearchRequest) -> dict:
    return search_jobs(query=payload.query, location=payload.location)


@router.post("/jobs/track")
def track_job_target(payload: JobTrackRequest) -> dict:
    item = track_job(payload.job)
    return {"item": item, "tasks": job_tasks()}


@router.patch("/jobs/{item_id}")
def update_job(item_id: str, payload: JobStatusRequest) -> dict:
    if payload.status not in {"saved", "preparing", "applied", "interview", "offer", "rejected"}:
        raise HTTPException(status_code=400, detail="Unsupported job status")
    item = update_job_status(item_id, payload.status)
    if not item:
        raise HTTPException(status_code=404, detail="Job item not found")
    return {"item": item, "tasks": job_tasks()}


@router.patch("/jobs/{item_id}/details")
def update_job_metadata(item_id: str, payload: JobDetailsRequest) -> dict:
    item = update_job_details(item_id, payload.model_dump())
    if not item:
        raise HTTPException(status_code=404, detail="Job item not found")
    return {"item": item, "tasks": job_tasks()}


@router.post("/jobs/{item_id}/outreach")
def prepare_job_outreach(item_id: str, payload: JobOutreachRequest) -> dict:
    approval = create_job_outreach_approval(item_id, payload.recipient)
    if not approval:
        raise HTTPException(status_code=404, detail="Tracked job not found")
    return {"approval": approval}
