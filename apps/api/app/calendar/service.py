from datetime import UTC, datetime, timedelta
from re import IGNORECASE, search
from typing import Any
from zoneinfo import ZoneInfo


LOCAL_TZ = ZoneInfo("Europe/Berlin")


def build_calendar_agenda(profile: dict[str, Any]) -> dict[str, Any]:
    calendar = profile.get("calendar") or {}
    events = normalize_events(calendar.get("events") or [])
    now = datetime.now(UTC)
    today = now.date()
    tomorrow = (now + timedelta(days=1)).date()
    week_end = today + timedelta(days=7)

    today_events = [event for event in events if event["start_date"] == today.isoformat()]
    tomorrow_events = [event for event in events if event["start_date"] == tomorrow.isoformat()]
    week_events = [event for event in events if today.isoformat() <= event["start_date"] <= week_end.isoformat()]
    conflicts = detect_conflicts(week_events)
    busy_days = summarize_busy_days(week_events)
    next_event = next((event for event in events if event.get("start_dt") and event["start_dt"] >= now), events[0] if events else None)

    return {
        "connected": bool(calendar),
        "upcoming_count": len(events),
        "next_event": public_event(next_event) if next_event else None,
        "today": [public_event(event) for event in today_events],
        "tomorrow": [public_event(event) for event in tomorrow_events],
        "week": [public_event(event) for event in week_events],
        "busy_days": busy_days,
        "conflicts": conflicts,
        "prep_tasks": build_prep_tasks(today_events, tomorrow_events, week_events, conflicts, profile),
        "travel_guardian": build_travel_guardian(week_events, profile),
        "insight": agenda_insight(today_events, tomorrow_events, conflicts, busy_days),
    }


def build_calendar_write_draft(profile: dict[str, Any], request: str) -> dict[str, Any]:
    explicit_event = build_explicit_event_draft(request)
    if explicit_event:
        return add_draft_conflicts(profile, explicit_event)

    agenda = build_calendar_agenda(profile)
    target = choose_target_event(agenda, request)
    requested_offset = requested_minutes(request)
    duration_minutes = 15 if any(term in request.lower() for term in ["remind", "reminder"]) else (requested_offset or 30)
    kind = "travel_reminder" if any(term in request.lower() for term in ["remind", "reminder"]) else "prep_block"

    if target and target.get("start"):
        target_start = parse_event_time(target.get("start"))
        if target_start:
            start_dt = target_start - timedelta(minutes=requested_offset or (180 if kind == "travel_reminder" else duration_minutes))
            end_dt = start_dt + timedelta(minutes=duration_minutes)
        else:
            start_dt = datetime.now(UTC) + timedelta(days=1)
            end_dt = start_dt + timedelta(minutes=duration_minutes)
    else:
        start_dt = datetime.now(UTC) + timedelta(days=1, hours=9)
        end_dt = start_dt + timedelta(minutes=duration_minutes)

    target_title = (target or {}).get("summary") or "upcoming event"
    title = "Travel reminder" if kind == "travel_reminder" else f"Prep for {target_title}"
    description = (
        f"Created by MyAgent after approval.\n\n"
        f"Original request: {request}\n"
        f"Target event: {target_title}\n\n"
        "Checklist:\n"
        "- Review Gmail, memory, route, weather, and calendar context.\n"
        "- Prepare documents, notes, and follow-up action.\n"
        "- Ask MyAgent to draft a delay or reschedule message if needed."
    )

    return add_draft_conflicts(profile, {
        "kind": kind,
        "title": title,
        "description": description,
        "start": start_dt.isoformat(),
        "end": end_dt.isoformat(),
        "timezone": None,
        "target_event": target,
        "request": request,
        "duration_minutes": duration_minutes,
    })


def build_explicit_event_draft(request: str) -> dict[str, Any] | None:
    normalized = request.lower()
    if not any(term in normalized for term in ["workshop", "class", "lecture", "meeting", "event"]):
        return None
    if "from" not in normalized and not search(r"\b\d{1,2}\s*(am|pm)\b", normalized, IGNORECASE):
        return None

    event_date = requested_day(normalized)
    start_hour, end_hour = requested_time_range(normalized)
    if event_date is None or start_hour is None or end_hour is None:
        return None

    title = requested_title(normalized)
    start_dt = datetime(event_date.year, event_date.month, event_date.day, start_hour, 0, tzinfo=LOCAL_TZ)
    end_dt = datetime(event_date.year, event_date.month, event_date.day, end_hour, 0, tzinfo=LOCAL_TZ)
    reminders = requested_absolute_reminders(normalized, start_dt)

    description = (
        "Created by MyAgent after approval.\n\n"
        f"Original request: {request}\n\n"
        "Checklist:\n"
        "- Attend the scheduled event.\n"
        "- Review any related Gmail, calendar, and memory context.\n"
        "- Save useful notes or follow-up tasks after it ends."
    )

    return {
        "kind": "calendar_event",
        "title": title,
        "description": description,
        "start": start_dt.isoformat(),
        "end": end_dt.isoformat(),
        "timezone": None,
        "target_event": None,
        "request": request,
        "duration_minutes": int((end_dt - start_dt).total_seconds() / 60),
        "reminders": reminders,
    }


def add_draft_conflicts(profile: dict[str, Any], draft: dict[str, Any]) -> dict[str, Any]:
    start_dt = parse_event_time(draft.get("start"))
    end_dt = parse_event_time(draft.get("end"))
    if not start_dt or not end_dt:
        return {**draft, "conflicts": []}

    conflicts = []
    for event in normalize_events((profile.get("calendar") or {}).get("events") or []):
        event_start = event.get("start_dt")
        event_end = event.get("end_dt")
        if not event_start or not event_end:
            continue
        if start_dt < event_end and event_start < end_dt:
            conflicts.append(
                {
                    "title": event.get("summary") or "Untitled event",
                    "start": event.get("start"),
                    "end": event.get("end"),
                    "start_label": event.get("start_label"),
                    "location": event.get("location"),
                    "severity": "medium",
                }
            )
    return {**draft, "conflicts": conflicts[:4]}


def requested_day(normalized: str):
    now = datetime.now(LOCAL_TZ)
    if "tomorrow" in normalized or "tommorow" in normalized:
        return (now + timedelta(days=1)).date()
    if "today" in normalized:
        return now.date()
    return None


def requested_time_range(normalized: str) -> tuple[int | None, int | None]:
    match = search(r"from\s+(\d{1,2})\s*(am|pm)?\s+to\s+(\d{1,2})\s*(am|pm)?", normalized, IGNORECASE)
    if not match:
        return None, None
    start_raw, start_meridiem, end_raw, end_meridiem = match.groups()
    start_hour = normalize_hour(int(start_raw), start_meridiem or end_meridiem)
    end_hour = normalize_hour(int(end_raw), end_meridiem)
    if start_hour is not None and end_hour is not None and end_hour <= start_hour and not end_meridiem:
        end_hour += 12
    return start_hour, end_hour


def normalize_hour(hour: int, meridiem: str | None) -> int | None:
    if hour < 1 or hour > 24:
        return None
    if not meridiem:
        return hour
    value = hour % 12
    return value + 12 if meridiem.lower() == "pm" else value


def requested_title(normalized: str) -> str:
    for keyword in ["workshop", "lecture", "class", "meeting", "event"]:
        if keyword in normalized:
            return keyword.title()
    return "Calendar event"


def requested_absolute_reminders(normalized: str, event_start: datetime) -> list[dict[str, Any]]:
    match = search(r"remind me\s+(today|tomorrow|tommorow)\s+at\s+(\d{1,2})\s*(am|pm)?", normalized, IGNORECASE)
    if not match:
        return []

    day_word, hour_raw, meridiem = match.groups()
    now = datetime.now(LOCAL_TZ)
    reminder_date = (now + timedelta(days=1)).date() if day_word in {"tomorrow", "tommorow"} else now.date()
    reminder_hour = normalize_hour(int(hour_raw), meridiem) or int(hour_raw)
    reminder_dt = datetime(reminder_date.year, reminder_date.month, reminder_date.day, reminder_hour, 0, tzinfo=LOCAL_TZ)
    minutes_before = int((event_start - reminder_dt).total_seconds() / 60)
    if minutes_before <= 0:
        return []
    return [{"method": "popup", "minutes": min(minutes_before, 40320), "label": reminder_dt.isoformat()}]


def choose_target_event(agenda: dict[str, Any], request: str) -> dict[str, Any] | None:
    normalized = request.lower()
    candidates = agenda.get("week") or []
    if any(term in normalized for term in ["flight", "airport"]):
        return next((event for event in candidates if is_flight_event(event)), agenda.get("next_event"))
    if any(term in normalized for term in ["bus", "train", "station"]):
        return next((event for event in candidates if any(term in f"{event.get('summary') or ''} {event.get('location') or ''}".lower() for term in ["bus", "train", "station"])), agenda.get("next_event"))
    if "tomorrow" in normalized:
        return (agenda.get("tomorrow") or [None])[0] or agenda.get("next_event")
    return agenda.get("next_event")


def requested_minutes(request: str) -> int | None:
    tokens = request.lower().replace("-", " ").split()
    for index, token in enumerate(tokens):
        if token.isdigit():
            value = int(token)
            next_token = tokens[index + 1] if index + 1 < len(tokens) else ""
            if next_token.startswith("hour"):
                return min(value * 60, 240)
            if next_token.startswith("min"):
                return min(value, 180)
    return None


def normalize_events(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized = []
    for event in events:
        start_dt = parse_event_time(event.get("start"))
        end_dt = parse_event_time(event.get("end"))
        start_date = start_dt.date().isoformat() if start_dt else str(event.get("start") or "")[:10]
        normalized.append(
            {
                **event,
                "start_dt": start_dt,
                "end_dt": end_dt,
                "start_date": start_date,
                "start_label": format_event_time(start_dt, event.get("start")),
                "end_label": format_event_time(end_dt, event.get("end")),
            }
        )
    return sorted(normalized, key=lambda item: item.get("start_dt") or datetime.max.replace(tzinfo=UTC))


def parse_event_time(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        if len(value) == 10:
            return datetime.fromisoformat(value).replace(tzinfo=UTC)
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def format_event_time(dt: datetime | None, fallback: str | None) -> str:
    if not dt:
        return fallback or ""
    return dt.strftime("%a %d %b, %H:%M")


def public_event(event: dict[str, Any] | None) -> dict[str, Any] | None:
    if not event:
        return None
    return {
        "id": event.get("id"),
        "summary": event.get("summary") or "Untitled event",
        "start": event.get("start"),
        "end": event.get("end"),
        "start_label": event.get("start_label"),
        "end_label": event.get("end_label"),
        "start_date": event.get("start_date"),
        "location": event.get("location"),
        "html_link": event.get("html_link"),
        "status": event.get("status"),
    }


def detect_conflicts(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    timed = [event for event in events if event.get("start_dt") and event.get("end_dt")]
    conflicts = []
    for index, current in enumerate(timed):
        for other in timed[index + 1:]:
            if current["start_dt"] < other["end_dt"] and other["start_dt"] < current["end_dt"]:
                conflicts.append(
                    {
                        "title": "Possible meeting conflict",
                        "events": [current.get("summary") or "Untitled event", other.get("summary") or "Untitled event"],
                        "when": current.get("start_label"),
                        "severity": "medium",
                    }
                )
    return conflicts[:4]


def summarize_busy_days(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    counts: dict[str, int] = {}
    for event in events:
        day = event.get("start_date")
        if day:
            counts[day] = counts.get(day, 0) + 1
    return [
        {"date": date, "events": count, "label": "busy" if count >= 3 else "normal"}
        for date, count in sorted(counts.items(), key=lambda item: item[0])
    ]


def build_prep_tasks(today_events: list[dict[str, Any]], tomorrow_events: list[dict[str, Any]], week_events: list[dict[str, Any]], conflicts: list[dict[str, Any]], profile: dict[str, Any]) -> list[dict[str, Any]]:
    tasks = []
    target_events = today_events[:2] + tomorrow_events[:3]
    if not target_events:
        target_events = [event for event in week_events if looks_travel_related(event)][:3] or week_events[:2]
    for event in target_events:
        title = event.get("summary") or "Untitled event"
        tasks.append(
            {
                "id": f"calendar-{event.get('id') or title}",
                "title": f"Prepare for {title}",
                "when": event.get("start_label"),
                "priority": "high" if event in today_events else "normal",
                "steps": [
                    prep_step_for_event(event),
                    "Review related Gmail, memory, location, and weather context.",
                    "Prepare one follow-up action before the event starts.",
                ],
                "event": public_event(event),
            }
        )

    for conflict in conflicts:
        tasks.insert(
            0,
            {
                "id": f"conflict-{conflict['when']}",
                "title": "Resolve possible calendar conflict",
                "when": conflict["when"],
                "priority": "high",
                "steps": [
                    f"Check overlapping events: {', '.join(conflict['events'])}.",
                    "Decide which meeting matters most.",
                    "Ask MyAgent to draft a reschedule message if needed.",
                ],
                "event": None,
            },
        )

    if not tasks and profile.get("gmail"):
        tasks.append(
            {
                "id": "calendar-empty-email-followup",
                "title": "Use free calendar time for Gmail follow-up",
                "when": "This week",
                "priority": "normal",
                "steps": ["Review important Gmail signals.", "Draft one follow-up with approval.", "Save useful context to memory."],
                "event": None,
            }
        )
    return tasks[:6]


def agenda_insight(today_events: list[dict[str, Any]], tomorrow_events: list[dict[str, Any]], conflicts: list[dict[str, Any]], busy_days: list[dict[str, Any]]) -> str:
    if conflicts:
        return "Calendar Agent found possible overlap. MyAgent should help you reschedule or prepare a short message."
    if today_events:
        return f"You have {len(today_events)} event(s) today. MyAgent should prepare context before the next meeting."
    if tomorrow_events:
        return f"You have {len(tomorrow_events)} event(s) tomorrow. This is a good moment to prepare agenda notes."
    busy = [day for day in busy_days if day["label"] == "busy"]
    if busy:
        return "This week has at least one busy day. MyAgent should protect focus time."
    if busy_days:
        return f"You have {sum(day['events'] for day in busy_days)} upcoming event(s) this week. MyAgent should prepare travel, agenda, and follow-up context."
    return "No urgent calendar pressure detected in the next scanned events."


def looks_travel_related(event: dict[str, Any]) -> bool:
    text = f"{event.get('summary') or ''} {event.get('location') or ''}".lower()
    return any(keyword in text for keyword in ["flight", "bus", "train", "airport", "station", "travel", "hotel"])


def prep_step_for_event(event: dict[str, Any]) -> str:
    if looks_travel_related(event):
        return "Check weather, route timing, ticket details, passport/ID, and delay risk."
    return "Write 3 questions or talking points."


def is_flight_event(event: dict[str, Any]) -> bool:
    title = (event.get("summary") or "").lower()
    location = (event.get("location") or "").lower().strip()
    return "flight" in title or "airport" in location or location == "berlin ber" or location.endswith(" ber")


def build_travel_guardian(events: list[dict[str, Any]], profile: dict[str, Any]) -> dict[str, Any]:
    travel_events = [event for event in events if looks_travel_related(event)]
    risks = [travel_risk_for_event(event, profile) for event in travel_events[:6]]
    urgent_count = sum(1 for risk in risks if risk["severity"] == "urgent")
    warning_count = sum(1 for risk in risks if risk["severity"] == "warning")

    if urgent_count:
        summary = f"Travel Guardian found {urgent_count} urgent travel risk(s)."
    elif warning_count:
        summary = f"Travel Guardian found {warning_count} travel item(s) worth checking."
    elif risks:
        summary = "Travel Guardian found upcoming travel and prepared a safety checklist."
    else:
        summary = "No travel events detected in the scanned calendar window."

    return {
        "enabled": True,
        "summary": summary,
        "risk_count": len(risks),
        "highest_severity": "urgent" if urgent_count else "warning" if warning_count else "safe",
        "risks": risks,
    }


def travel_risk_for_event(event: dict[str, Any], profile: dict[str, Any]) -> dict[str, Any]:
    title = event.get("summary") or "Travel event"
    location = event.get("location") or profile.get("city") or "your route"
    text = f"{title} {location}".lower()
    checks = [
        "Check live weather near departure and arrival.",
        "Check route timing and transport delay status.",
        "Keep ticket, passport/ID, charger, and offline map ready.",
    ]
    suggested_actions = [
        "Leave earlier if route or weather risk is elevated.",
        "Ask MyAgent to draft a delay message before the event if needed.",
        "Open Guardian Map before leaving.",
    ]
    severity = "safe"
    reason = "General travel preparation."

    if is_flight_event(event):
        severity = "warning"
        reason = "Flight events are sensitive to airport timing, documents, and delay risk."
        checks.insert(0, "Confirm terminal, baggage rules, boarding time, and airport route.")
    elif any(keyword in text for keyword in ["bus", "station", "train"]):
        severity = "warning"
        reason = "Station travel can be affected by route timing, traffic, and platform changes."
        checks.insert(0, "Confirm station, platform/gate, ticket QR code, and traffic to departure point.")

    if any(keyword in text for keyword in ["cairo", "prague", "international"]):
        checks.append("Confirm roaming, currency/payment, accommodation, and arrival transport.")

    return {
        "id": f"travel-{event.get('id') or title}",
        "title": f"Travel check: {title}",
        "severity": severity,
        "reason": reason,
        "when": event.get("start_label") or event.get("start"),
        "location": location,
        "event": public_event(event),
        "checks": checks,
        "suggested_actions": suggested_actions,
    }
