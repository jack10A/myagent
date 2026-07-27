from fastapi import APIRouter

from app.calendar.service import build_calendar_agenda
from app.profile.store import read_profile

router = APIRouter()


@router.get("/agenda")
def get_agenda() -> dict:
    profile = read_profile()
    return {"agenda": build_calendar_agenda(profile)}


@router.get("/travel-guardian")
def get_travel_guardian() -> dict:
    profile = read_profile()
    agenda = build_calendar_agenda(profile)
    return {"travel_guardian": agenda["travel_guardian"], "next_event": agenda["next_event"]}
