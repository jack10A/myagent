import base64
from email.message import EmailMessage
from email.utils import parseaddr
from typing import Any

import httpx
from fastapi import HTTPException

from app.core.config import settings
from app.profile.store import read_profile, write_profile


def execute_approval(approval: dict[str, Any]) -> dict[str, Any] | None:
    action_type = (approval.get("recommendation") or {}).get("primary_action_type")
    if action_type == "update_calendar":
        calendar_action = next((action for action in approval.get("actions", []) if action.get("type") == "draft_calendar_event"), None)
        if not calendar_action:
            return None
        return create_calendar_event(calendar_action.get("payload") or {})

    if action_type != "send_email":
        return None

    draft_action = next((action for action in approval.get("actions", []) if action.get("type") == "draft_email"), None)
    if not draft_action:
        return None

    return create_gmail_draft(draft_action.get("payload") or {})


def create_calendar_event(payload: dict[str, Any]) -> dict[str, Any]:
    profile = read_profile()
    gmail = profile.get("gmail") or {}
    oauth = gmail.get("oauth") or {}
    refresh_token = oauth.get("refresh_token")

    if not refresh_token:
        raise HTTPException(
            status_code=400,
            detail="Google must be reconnected with calendar event permission before MyAgent can create calendar events.",
        )

    access_token = refresh_google_access_token(refresh_token)
    start = {"dateTime": payload.get("start")}
    end = {"dateTime": payload.get("end")}
    if payload.get("timezone"):
        start["timeZone"] = payload["timezone"]
        end["timeZone"] = payload["timezone"]

    reminders = payload.get("reminders") or []
    body = {
        "summary": payload.get("title") or "MyAgent prep block",
        "description": payload.get("description") or "Created by MyAgent after approval.",
        "start": start,
        "end": end,
        "reminders": {"useDefault": False, "overrides": reminders} if reminders else {"useDefault": True},
    }

    with httpx.Client(timeout=20, headers=google_headers(access_token)) as client:
        response = client.post("https://www.googleapis.com/calendar/v3/calendars/primary/events", json=body)
        response.raise_for_status()
        event = response.json()
        calendar_events = fetch_calendar_events(client)

    write_profile(
        {
            "calendar": {
                **(profile.get("calendar") or {}),
                "mode": "read_and_write_after_approval",
                "upcoming_count": len(calendar_events),
                "events": calendar_events,
                "last_refreshed_after_approval": True,
            }
        }
    )

    return {
        "provider": "google_calendar",
        "type": "calendar_event_created",
        "event_id": event.get("id"),
        "html_link": event.get("htmlLink"),
        "summary": event.get("summary"),
        "start": (event.get("start") or {}).get("dateTime"),
        "calendar_refreshed": True,
    }


def fetch_calendar_events(client: httpx.Client) -> list[dict[str, Any]]:
    from datetime import UTC, datetime, timedelta

    now = datetime.now(UTC)
    response = client.get(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        params={
            "timeMin": now.isoformat().replace("+00:00", "Z"),
            "timeMax": (now + timedelta(days=14)).isoformat().replace("+00:00", "Z"),
            "singleEvents": "true",
            "orderBy": "startTime",
            "maxResults": 20,
        },
    )
    response.raise_for_status()
    events = []
    for event in response.json().get("items", []):
        start = event.get("start") or {}
        end = event.get("end") or {}
        events.append(
            {
                "id": event.get("id"),
                "summary": event.get("summary"),
                "start": start.get("dateTime") or start.get("date"),
                "end": end.get("dateTime") or end.get("date"),
                "location": event.get("location"),
                "html_link": event.get("htmlLink"),
                "status": event.get("status"),
            }
        )
    return events


def create_gmail_draft(payload: dict[str, Any]) -> dict[str, Any]:
    profile = read_profile()
    gmail = profile.get("gmail") or {}
    oauth = gmail.get("oauth") or {}
    refresh_token = oauth.get("refresh_token")

    if not refresh_token:
        raise HTTPException(
            status_code=400,
            detail="Gmail must be reconnected with draft permission before MyAgent can create Gmail drafts.",
        )

    access_token = refresh_google_access_token(refresh_token)
    raw_message = build_reply_message(
        sender=gmail.get("email") or "me",
        to=payload.get("to"),
        subject=payload.get("subject") or "Follow-up",
        request=payload.get("request") or "",
        snippet=payload.get("snippet") or "",
    )

    body: dict[str, Any] = {"message": {"raw": raw_message}}
    if payload.get("thread_id"):
        body["message"]["threadId"] = payload["thread_id"]

    with httpx.Client(timeout=20, headers=google_headers(access_token)) as client:
        response = client.post("https://gmail.googleapis.com/gmail/v1/users/me/drafts", json=body)
        response.raise_for_status()
        draft = response.json()

    return {
        "provider": "gmail",
        "type": "draft_created",
        "draft_id": draft.get("id"),
        "message_id": (draft.get("message") or {}).get("id"),
        "thread_id": (draft.get("message") or {}).get("threadId") or payload.get("thread_id"),
    }


def refresh_google_access_token(refresh_token: str) -> str:
    with httpx.Client(timeout=15) as client:
        response = client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        response.raise_for_status()
        payload = response.json()

    access_token = payload.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="Google did not return a refreshed access token")
    return access_token


def build_reply_message(sender: str, to: str | None, subject: str, request: str, snippet: str) -> str:
    _, email_address = parseaddr(to or "")
    recipient = email_address or to
    if not recipient:
        raise HTTPException(status_code=400, detail="No recipient was found for the Gmail draft")

    message = EmailMessage()
    message["To"] = recipient
    message["From"] = sender
    message["Subject"] = normalize_subject(subject)
    message.set_content(build_draft_body(request=request, snippet=snippet))
    return base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")


def build_draft_body(request: str, snippet: str) -> str:
    return "\n".join(
        [
            "Hi,",
            "",
            "Thanks for your message. I saw this and will follow up properly.",
            "",
            f"MyAgent draft context: {request}".strip(),
            f"Original email preview: {snippet}".strip(),
            "",
            "Best,",
        ]
    )


def normalize_subject(subject: str) -> str:
    cleaned = subject.strip() or "Follow-up"
    return cleaned if cleaned.lower().startswith("re:") else f"Re: {cleaned}"


def google_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "Accept": "application/json"}
