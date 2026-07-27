from fastapi import APIRouter

from app.capture.schemas import CaptureRequest, CaptureResult
from app.capture.service import analyze_capture, capture_tasks

router = APIRouter()


@router.post("/analyze", response_model=CaptureResult)
def analyze(payload: CaptureRequest) -> dict:
    return analyze_capture(payload)


@router.get("/tasks")
def tasks() -> dict:
    items = capture_tasks()
    return {"tasks": items, "count": len(items)}
