from fastapi import APIRouter

from app.growth.service import build_growth_plan
from app.profile.store import profile_to_context, read_profile, write_profile

router = APIRouter()


@router.get("")
def get_profile() -> dict:
    return read_profile()


@router.put("")
def update_profile(payload: dict) -> dict:
    profile = write_profile(payload)
    return {"profile": profile, "context": profile_to_context(profile)}


@router.get("/growth-plan")
def get_profile_growth_plan() -> dict:
    profile = read_profile()
    context = profile_to_context(profile)
    plan = build_growth_plan(context)
    return {"profile": profile, "plan": plan}

