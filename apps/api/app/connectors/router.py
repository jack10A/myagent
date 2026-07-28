from datetime import UTC, datetime, timedelta
from html import escape
import json
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.db.models import ConnectorAccount, ConnectorType, User
from app.profile.store import read_profile, write_profile

router = APIRouter()


@router.get("/gmail/start")
def gmail_start() -> RedirectResponse:
    if not settings.google_client_id:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID is not configured")

    params = urlencode(
        {
            "client_id": settings.google_client_id,
            "redirect_uri": settings.gmail_redirect_uri,
            "response_type": "code",
            "scope": settings.gmail_scopes,
            "access_type": "offline",
            "include_granted_scopes": "true",
            "prompt": "consent",
            "state": "myagent-local-demo",
        }
    )
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/calendar/start")
def calendar_start() -> RedirectResponse:
    return gmail_start()


@router.get("/google/callback", response_class=HTMLResponse)
def google_callback(code: str = Query(...), state: str | None = Query(default=None)) -> str:
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured")
    if state and state != "myagent-local-demo":
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    token = exchange_google_code(code)
    access_token = token["access_token"]
    gmail_profile = fetch_gmail_profile(access_token)
    messages = fetch_recent_gmail_messages(access_token)
    important = summarize_important_messages(messages)
    calendar_events = fetch_calendar_events(access_token)
    current_gmail = (read_profile().get("gmail") or {})

    write_profile(
        {
            "gmail": {
                "email": gmail_profile.get("emailAddress"),
                "messages_total": gmail_profile.get("messagesTotal"),
                "threads_total": gmail_profile.get("threadsTotal"),
                "recent_scanned": len(messages),
                "important_count": len(important),
                "important_messages": important,
                "mode": "read_and_draft_after_approval",
                "oauth": {
                    "access_token": token.get("access_token"),
                    "refresh_token": token.get("refresh_token") or (current_gmail.get("oauth") or {}).get("refresh_token"),
                    "token_type": token.get("token_type"),
                    "expires_in": token.get("expires_in"),
                    "scope": token.get("scope"),
                },
            },
            "calendar": {
                "mode": "read_only_schedule_context",
                "upcoming_count": len(calendar_events),
                "events": calendar_events,
                "oauth_scope": token.get("scope"),
            },
        }
    )

    important_list = "".join(
        f"<li><strong>{escape(message.get('subject') or 'No subject')}</strong><br />"
        f"{escape(message.get('from') or 'Unknown sender')}<br />"
        f"<span>{escape(message.get('snippet') or '')}</span></li>"
        for message in important[:6]
    )
    event_list = "".join(
        f"<li><strong>{escape(event.get('summary') or 'Untitled event')}</strong><br />"
        f"{escape(event.get('start') or '')}<br />"
        f"<span>{escape(event.get('location') or '')}</span></li>"
        for event in calendar_events[:6]
    )

    return f"""
    <html>
      <head>
        <title>Gmail Connected - MyAgent</title>
        <style>
          body {{ font-family: Arial, sans-serif; background: #fbfaf7; color: #15181d; padding: 32px; }}
          main {{ max-width: 760px; margin: 0 auto; background: white; border: 1px solid #ded9d1; border-radius: 8px; padding: 24px; }}
          a {{ color: #367a7a; }}
          li {{ margin-bottom: 14px; }}
          .pill {{ display: inline-block; background: #f7f4ef; border-radius: 6px; padding: 6px 10px; margin-top: 8px; }}
        </style>
      </head>
      <body>
        <main>
          <p class="pill">Gmail connected</p>
          <h1>MyAgent can now read Gmail signals, Calendar context, and create drafts after approval.</h1>
          <p>Connected mailbox: <strong>{escape(gmail_profile.get('emailAddress') or 'Unknown')}</strong></p>
          <p>Recent emails scanned: <strong>{len(messages)}</strong></p>
          <p>Important-looking emails found: <strong>{len(important)}</strong></p>
          <h2>Important Email Signals</h2>
          <ul>{important_list or '<li>No urgent or important messages detected in the latest scan.</li>'}</ul>
          <h2>Upcoming Calendar Signals</h2>
          <ul>{event_list or '<li>No upcoming calendar events found in the next 14 days.</li>'}</ul>
          <p>MyAgent can create Gmail drafts after you approve an action. It still will not send messages automatically.</p>
          <p><a href="{settings.frontend_url}/connectors">Return to MyAgent Connectors</a></p>
        </main>
      </body>
    </html>
    """


@router.get("/github/start")
def github_start() -> RedirectResponse:
    if not settings.github_client_id:
        raise HTTPException(status_code=500, detail="GITHUB_CLIENT_ID is not configured")

    params = urlencode(
        {
            "client_id": settings.github_client_id,
            "redirect_uri": settings.github_redirect_uri,
            "scope": settings.github_scopes,
            "allow_signup": "true",
        }
    )
    return RedirectResponse(f"https://github.com/login/oauth/authorize?{params}")


@router.get("/linkedin/start")
def linkedin_start() -> RedirectResponse:
    if not settings.linkedin_client_id:
        raise HTTPException(status_code=500, detail="LINKEDIN_CLIENT_ID is not configured")

    params = urlencode(
        {
            "response_type": "code",
            "client_id": settings.linkedin_client_id,
            "redirect_uri": settings.linkedin_redirect_uri,
            "scope": settings.linkedin_scopes,
            "state": "myagent-linkedin-local",
        }
    )
    return RedirectResponse(f"https://www.linkedin.com/oauth/v2/authorization?{params}")


@router.get("/github/callback", response_class=HTMLResponse)
def github_callback(code: str = Query(...)) -> str:
    if not settings.github_client_id or not settings.github_client_secret:
        raise HTTPException(status_code=500, detail="GitHub OAuth is not configured")

    token = exchange_github_code(code)
    profile = fetch_github_profile(token)
    repos = fetch_github_repos(token)
    top_languages = summarize_languages(repos)
    write_profile(
        {
            "github": {
                "login": profile.get("login"),
                "url": profile.get("html_url"),
                "public_repos": profile.get("public_repos"),
                "repos_scanned": len(repos),
                "top_languages": top_languages,
            }
        }
    )

    repo_list = "".join(
        f"<li><strong>{repo.get('name')}</strong> - {repo.get('language') or 'Unknown'} - {repo.get('html_url')}</li>"
        for repo in repos[:6]
    )
    language_list = "".join(f"<li>{language}: {count}</li>" for language, count in top_languages.items())

    return f"""
    <html>
      <head>
        <title>GitHub Connected - MyAgent</title>
        <style>
          body {{ font-family: Arial, sans-serif; background: #fbfaf7; color: #15181d; padding: 32px; }}
          main {{ max-width: 760px; margin: 0 auto; background: white; border: 1px solid #ded9d1; border-radius: 8px; padding: 24px; }}
          a {{ color: #367a7a; }}
          .pill {{ display: inline-block; background: #f7f4ef; border-radius: 6px; padding: 6px 10px; margin-top: 8px; }}
        </style>
      </head>
      <body>
        <main>
          <p class="pill">GitHub connected</p>
          <h1>MyAgent can read your GitHub career signal.</h1>
          <p>Connected account: <strong>{profile.get('login')}</strong></p>
          <p>Public repos scanned: <strong>{len(repos)}</strong></p>
          <h2>Top Languages</h2>
          <ul>{language_list or '<li>No languages detected yet.</li>'}</ul>
          <h2>Recent Repositories</h2>
          <ul>{repo_list or '<li>No repositories found.</li>'}</ul>
          <p><a href="{settings.frontend_url}/growth">Return to MyAgent Growth</a></p>
        </main>
      </body>
    </html>
    """


@router.get("/linkedin/callback", response_class=HTMLResponse)
def linkedin_callback(code: str = Query(...), state: str | None = Query(default=None)) -> str:
    if not settings.linkedin_client_id or not settings.linkedin_client_secret:
        raise HTTPException(status_code=500, detail="LinkedIn OAuth is not configured")
    if state and state != "myagent-linkedin-local":
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    token = exchange_linkedin_code(code)
    profile = fetch_linkedin_userinfo(token)
    current_linkedin = (read_profile().get("linkedin") or {})
    linkedin_profile = {
        **{key: value for key, value in current_linkedin.items() if key in {"profile_url", "headline", "current_role", "target_role", "skills", "about"}},
        "sub": profile.get("sub"),
        "name": profile.get("name"),
        "given_name": profile.get("given_name"),
        "family_name": profile.get("family_name"),
        "picture": profile.get("picture"),
        "email": profile.get("email"),
        "email_verified": profile.get("email_verified"),
        "locale": profile.get("locale"),
        "connected_at": datetime.now(UTC).isoformat(),
        "mode": "oidc_basic_profile",
    }
    write_profile({"linkedin": linkedin_profile})
    sync_params = urlencode({"linkedin_profile": json.dumps(linkedin_profile)})
    sync_url = f"{settings.frontend_url}/connectors?{sync_params}"

    return f"""
    <html>
      <head>
        <title>LinkedIn Connected - MyAgent</title>
        <style>
          body {{ font-family: Arial, sans-serif; background: #fbfaf7; color: #15181d; padding: 32px; }}
          main {{ max-width: 760px; margin: 0 auto; background: white; border: 1px solid #ded9d1; border-radius: 8px; padding: 24px; }}
          a {{ color: #367a7a; }}
          .pill {{ display: inline-block; background: #f7f4ef; border-radius: 6px; padding: 6px 10px; margin-top: 8px; }}
          img {{ width: 72px; height: 72px; border-radius: 10px; object-fit: cover; }}
        </style>
      </head>
      <body>
        <main>
          <p class="pill">LinkedIn connected</p>
          <h1>MyAgent can now use basic LinkedIn identity for Growth.</h1>
          {f'<img src="{escape(profile.get("picture"))}" alt="LinkedIn profile photo" />' if profile.get("picture") else ''}
          <p>Name: <strong>{escape(profile.get('name') or 'Unknown')}</strong></p>
          <p>Email: <strong>{escape(profile.get('email') or 'Not returned by LinkedIn')}</strong></p>
          <p>This OIDC connection gives basic identity only. Add headline/profile URL in MyAgent later for stronger career analysis.</p>
          <p><a href="{sync_url}">Return to MyAgent Connectors and sync LinkedIn</a></p>
        </main>
      </body>
    </html>
    """


def exchange_github_code(code: str) -> str:
    with httpx.Client(timeout=15) as client:
        response = client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": settings.github_redirect_uri,
            },
        )
        response.raise_for_status()
        payload = response.json()

    token = payload.get("access_token")
    if not token:
        raise HTTPException(status_code=400, detail="GitHub did not return an access token")
    return token


def exchange_linkedin_code(code: str) -> str:
    with httpx.Client(timeout=15) as client:
        response = client.post(
            "https://www.linkedin.com/oauth/v2/accessToken",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": settings.linkedin_client_id,
                "client_secret": settings.linkedin_client_secret,
                "redirect_uri": settings.linkedin_redirect_uri,
            },
        )
        response.raise_for_status()
        payload = response.json()

    token = payload.get("access_token")
    if not token:
        raise HTTPException(status_code=400, detail="LinkedIn did not return an access token")
    return token


def exchange_google_code(code: str) -> dict:
    with httpx.Client(timeout=15) as client:
        response = client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.gmail_redirect_uri,
            },
        )
        response.raise_for_status()
        payload = response.json()

    if not payload.get("access_token"):
        raise HTTPException(status_code=400, detail="Google did not return an access token")
    return payload


def google_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "Accept": "application/json"}


def fetch_gmail_profile(token: str) -> dict:
    with httpx.Client(timeout=15, headers=google_headers(token)) as client:
        response = client.get("https://gmail.googleapis.com/gmail/v1/users/me/profile")
        response.raise_for_status()
        return response.json()


def fetch_recent_gmail_messages(token: str) -> list[dict]:
    with httpx.Client(timeout=20, headers=google_headers(token)) as client:
        list_response = client.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages",
            params={"maxResults": 10, "q": "newer_than:30d"},
        )
        list_response.raise_for_status()
        message_refs = list_response.json().get("messages", [])

        messages = []
        for message_ref in message_refs:
            detail_response = client.get(
                f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_ref['id']}",
                params={"format": "metadata", "metadataHeaders": ["Subject", "From", "Date"]},
            )
            detail_response.raise_for_status()
            payload = detail_response.json()
            headers = {
                header.get("name", "").lower(): header.get("value")
                for header in payload.get("payload", {}).get("headers", [])
            }
            messages.append(
                {
                    "id": payload.get("id"),
                    "thread_id": payload.get("threadId"),
                    "subject": headers.get("subject"),
                    "from": headers.get("from"),
                    "date": headers.get("date"),
                    "snippet": payload.get("snippet"),
                    "label_ids": payload.get("labelIds", []),
                }
            )
    return messages


def fetch_calendar_events(token: str) -> list[dict]:
    now = datetime.now(UTC)
    time_min = now.isoformat().replace("+00:00", "Z")
    time_max = (now + timedelta(days=14)).isoformat().replace("+00:00", "Z")
    with httpx.Client(timeout=15, headers=google_headers(token)) as client:
        response = client.get(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            params={
                "timeMin": time_min,
                "timeMax": time_max,
                "singleEvents": "true",
                "orderBy": "startTime",
                "maxResults": 10,
            },
        )
        if response.status_code in {401, 403}:
            return []
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


def summarize_important_messages(messages: list[dict]) -> list[dict]:
    important_terms = [
        "urgent",
        "asap",
        "important",
        "deadline",
        "interview",
        "offer",
        "meeting",
        "invoice",
        "action required",
        "security",
        "verification",
    ]
    important = []
    for message in messages:
        haystack = f"{message.get('subject') or ''} {message.get('snippet') or ''}".lower()
        if is_auth_or_verification_message(message, haystack):
            continue
        score = sum(1 for term in important_terms if term in haystack)
        if "IMPORTANT" in message.get("label_ids", []):
            score += 2
        if score > 0:
            important.append({**message, "importance_score": score})
    return sorted(important, key=lambda item: item["importance_score"], reverse=True)


def is_auth_or_verification_message(message: dict, haystack: str | None = None) -> bool:
    text = haystack or f"{message.get('subject') or ''} {message.get('from') or ''} {message.get('snippet') or ''}".lower()
    auth_terms = [
        "verification code",
        "verify it's you",
        "verify it&#39;s you",
        "security code",
        "one-time code",
        "2-step verification",
        "two-factor",
        "sign-in attempt",
        "login code",
    ]
    return any(term in text for term in auth_terms)


def fetch_github_profile(token: str) -> dict:
    with httpx.Client(timeout=15, headers=github_headers(token)) as client:
        response = client.get("https://api.github.com/user")
        response.raise_for_status()
    return response.json()


def fetch_linkedin_userinfo(token: str) -> dict:
    with httpx.Client(timeout=15, headers={"Authorization": f"Bearer {token}"}) as client:
        response = client.get("https://api.linkedin.com/v2/userinfo")
        response.raise_for_status()
        return response.json()


def fetch_github_repos(token: str) -> list[dict]:
    with httpx.Client(timeout=15, headers=github_headers(token)) as client:
        response = client.get(
            "https://api.github.com/user/repos",
            params={"sort": "updated", "per_page": 20, "type": "owner"},
        )
        response.raise_for_status()
        return response.json()


def github_headers(token: str) -> dict[str, str]:
    return {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def summarize_languages(repos: list[dict]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for repo in repos:
        language = repo.get("language")
        if language:
            counts[language] = counts.get(language, 0) + 1
    return dict(sorted(counts.items(), key=lambda item: item[1], reverse=True)[:6])


@router.get("")
def list_connectors(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[dict]:
    accounts = db.scalars(select(ConnectorAccount).where(ConnectorAccount.user_id == user.id)).all()
    connected = {account.connector_type.value: account for account in accounts}
    catalog = [
        ConnectorType.gmail,
        ConnectorType.google_calendar,
        ConnectorType.weather,
        ConnectorType.emergency_alerts,
        ConnectorType.notion,
        ConnectorType.google_drive,
        ConnectorType.linkedin,
        ConnectorType.github,
        ConnectorType.cv_resume,
    ]
    return [
        {
            "type": item.value,
            "status": connected[item.value].status if item.value in connected else "disconnected",
            "oauth_required": item not in {ConnectorType.weather, ConnectorType.emergency_alerts, ConnectorType.cv_resume},
        }
        for item in catalog
    ]


@router.post("/{connector_type}/mock-connect")
def mock_connect(
    connector_type: ConnectorType,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    account = ConnectorAccount(
        user_id=user.id,
        connector_type=connector_type,
        status="connected",
        scopes=["mock"],
        metadata_json={"mode": "mock"},
    )
    db.add(account)
    db.commit()
    return {"status": "connected", "connector_type": connector_type.value}
