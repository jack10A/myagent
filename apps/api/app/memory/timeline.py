from datetime import UTC, datetime
from typing import Any
from uuid import uuid5, NAMESPACE_URL

from app.activity.store import read_activity
from app.profile.store import read_profile


def build_memory_timeline(query: str | None = None, limit: int = 80) -> dict[str, Any]:
    profile = read_profile()
    items: list[dict[str, Any]] = []
    seen_keys: dict[str, int] = {}
    now = datetime.now(UTC).isoformat()

    def add(
        category: str,
        title: str | None,
        body: str | None,
        *,
        source: str,
        importance: int = 3,
        created_at: str | None = None,
        metadata: dict[str, Any] | None = None,
        tags: list[str] | None = None,
    ) -> None:
        if not title and not body:
            return
        metadata = metadata or {}
        key = f"{category}:{source}:{title}:{body}:{metadata.get('id') or metadata.get('url') or metadata.get('html_link')}"
        ordinal = seen_keys.get(key, 0)
        seen_keys[key] = ordinal + 1
        unique_key = f"{key}:{ordinal}"
        items.append(
            {
                "id": str(uuid5(NAMESPACE_URL, unique_key)),
                "category": category,
                "title": title or category,
                "body": body or "",
                "source": source,
                "importance": max(1, min(5, importance)),
                "created_at": created_at or now,
                "metadata": metadata,
                "tags": tags or [],
            }
        )

    name = profile.get("name")
    identity_parts = [part for part in [profile.get("lifeStage"), profile.get("field"), profile.get("city")] if part]
    add(
        "Identity",
        f"{name or 'User'} context profile",
        " | ".join(identity_parts) or "The onboarding interview has not captured enough identity context yet.",
        source="profile",
        importance=5,
        created_at=profile.get("updated_at"),
        tags=["profile", "identity"],
    )

    add(
        "Goal",
        profile.get("goal") or "No primary goal saved yet",
        "MyAgent uses this goal to prioritize study, jobs, calendar planning, and recommendations.",
        source="profile",
        importance=5 if profile.get("goal") else 2,
        created_at=profile.get("updated_at"),
        tags=["goal", "planning"],
    )

    gmail = profile.get("gmail") or {}
    for message in (gmail.get("important_messages") or [])[:12]:
        add(
            "Email",
            message.get("subject") or "Important email",
            f"{message.get('from') or 'Unknown sender'} - {message.get('snippet') or 'No preview available.'}",
            source="gmail",
            importance=4 if (message.get("importance_score") or 0) >= 2 else 3,
            created_at=message.get("date") or profile.get("updated_at"),
            metadata={"id": message.get("id"), "thread_id": message.get("thread_id"), "from": message.get("from")},
            tags=["gmail", "communication"],
        )

    calendar = profile.get("calendar") or {}
    for event in (calendar.get("events") or [])[:16]:
        add(
            "Calendar",
            event.get("summary") or "Calendar event",
            " | ".join(part for part in [event.get("start"), event.get("location")] if part) or "Upcoming calendar event.",
            source="google_calendar",
            importance=4 if event.get("location") else 3,
            created_at=event.get("start") or profile.get("updated_at"),
            metadata={"id": event.get("id"), "html_link": event.get("html_link"), "end": event.get("end")},
            tags=["calendar", "schedule"],
        )

    github = profile.get("github") or {}
    if github:
        languages = ", ".join(list((github.get("top_languages") or {}).keys())[:5]) or "not enough language data yet"
        add(
            "GitHub",
            f"@{github.get('login') or 'GitHub'} project signal",
            f"{github.get('repos_scanned') or 0} repositories scanned. Top languages: {languages}.",
            source="github",
            importance=4,
            created_at=profile.get("updated_at"),
            metadata={"url": github.get("url"), "public_repos": github.get("public_repos")},
            tags=["github", "career", "proof-of-work"],
        )

    linkedin = profile.get("linkedin") or {}
    if linkedin:
        add(
            "LinkedIn",
            linkedin.get("name") or "LinkedIn identity",
            f"Basic LinkedIn identity connected for Growth context. Email: {linkedin.get('email') or 'not returned'}.",
            source="linkedin",
            importance=4,
            created_at=linkedin.get("connected_at") or profile.get("updated_at"),
            metadata={"sub": linkedin.get("sub"), "picture": linkedin.get("picture")},
            tags=["linkedin", "career", "identity"],
        )

    cv = profile.get("cv") or {}
    if cv:
        skills = ", ".join((cv.get("detected_skills") or [])[:8])
        add(
            "CV",
            cv.get("role_guess") or "CV profile",
            cv.get("summary") or f"Detected skills: {skills}",
            source="cv",
            importance=4,
            created_at=profile.get("updated_at"),
            metadata={"skills": cv.get("detected_skills") or [], "improvements": cv.get("improvements") or []},
            tags=["cv", "career"],
        )
        for improvement in (cv.get("improvements") or [])[:5]:
            add("Growth", improvement, "CV analyzer marked this as an improvement area.", source="cv", importance=3, tags=["cv", "skill-gap"])

    for item in profile.get("learning") or []:
        add(
            "Learning",
            item.get("title") or item.get("topic") or "Tracked learning topic",
            item.get("reason") or item.get("summary") or "Saved from Growth Agent learning radar.",
            source="learning_radar",
            importance=4,
            created_at=item.get("created_at") or profile.get("updated_at"),
            metadata={"url": item.get("url"), "topic": item.get("topic")},
            tags=["learning", "study"],
        )

    for job in profile.get("jobs") or []:
        add(
            "Jobs",
            job.get("title") or job.get("role") or "Tracked job opportunity",
            job.get("company") or job.get("reason") or "Saved from Job Radar.",
            source="job_radar",
            importance=4,
            created_at=job.get("created_at") or profile.get("updated_at"),
            metadata={"url": job.get("url"), "company": job.get("company")},
            tags=["jobs", "career"],
        )

    health = profile.get("health") or {}
    latest_health = health.get("latest") or {}
    if latest_health:
        add(
            "Health",
            "Latest health check-in",
            f"Mood {latest_health.get('mood')}/5, energy {latest_health.get('energy')}/5, sleep {latest_health.get('sleep_hours')}h, movement {latest_health.get('exercise_minutes')} min.",
            source="health",
            importance=4,
            created_at=latest_health.get("created_at") or profile.get("updated_at"),
            metadata={"symptoms": latest_health.get("symptoms") or []},
            tags=["health", "wellness"],
        )

    for capture in profile.get("captures") or []:
        add(
            "Capture",
            capture.get("title") or "Captured knowledge",
            capture.get("summary") or "Meeting, YouTube, transcript, or note saved by Capture Agent.",
            source="capture",
            importance=4,
            created_at=capture.get("created_at") or profile.get("updated_at"),
            metadata={"url": capture.get("source_url"), "action_items": capture.get("action_items") or []},
            tags=["capture", capture.get("capture_type") or "knowledge"],
        )

    for activity in read_activity(limit=20):
        recommendation = activity.get("recommendation") or {}
        guardian = activity.get("guardian") or {}
        add(
            "Agent Activity",
            recommendation.get("title") or activity.get("intent") or "Agent collaboration",
            f"{activity.get('command') or 'Command'} | Guardian: {guardian.get('decision') or 'reviewed'}",
            source="agent_trace",
            importance=4 if (activity.get("approval") or {}).get("status") == "approved" else 3,
            created_at=activity.get("created_at"),
            metadata={"activity_id": activity.get("id"), "approval": activity.get("approval")},
            tags=["activity", "agents"],
        )

    filtered = filter_items(items, query)
    filtered.sort(key=lambda item: item.get("created_at") or "", reverse=True)
    filtered = filtered[:limit]
    return {
        "query": query or "",
        "total": len(filtered),
        "stats": build_stats(filtered),
        "items": filtered,
    }


def filter_items(items: list[dict[str, Any]], query: str | None) -> list[dict[str, Any]]:
    if not query:
        return items
    terms = [term.strip().lower() for term in query.split() if term.strip()]
    if not terms:
        return items
    results = []
    for item in items:
        haystack = " ".join(
            [
                item.get("category", ""),
                item.get("title", ""),
                item.get("body", ""),
                item.get("source", ""),
                " ".join(item.get("tags") or []),
            ]
        ).lower()
        if all(term in haystack for term in terms):
            results.append(item)
    return results


def build_stats(items: list[dict[str, Any]]) -> dict[str, Any]:
    categories = sorted({item["category"] for item in items})
    sources = sorted({item["source"] for item in items})
    return {
        "categories": categories,
        "sources": sources,
        "high_importance": sum(1 for item in items if item.get("importance", 0) >= 4),
    }
