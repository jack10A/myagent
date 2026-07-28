from fastapi import APIRouter, HTTPException

from app.growth.service import build_growth_plan
from app.profile.store import clear_profile_memory, disable_profile_connector, export_profile_bundle, profile_to_context, read_profile, write_profile

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


@router.get("/export")
def export_profile() -> dict:
    return export_profile_bundle()


@router.delete("/memory")
def delete_memory(confirm: str) -> dict:
    if confirm != "DELETE":
        raise HTTPException(status_code=400, detail="confirm must be DELETE")
    profile = clear_profile_memory()
    return {"deleted": True, "profile": profile}


@router.patch("/connectors/{connector}/disable")
def disable_connector(connector: str) -> dict:
    profile = disable_profile_connector(connector)
    if profile is None:
        raise HTTPException(status_code=404, detail="Connector not found")
    return {"disabled": connector, "profile": profile}
