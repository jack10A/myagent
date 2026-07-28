from datetime import UTC, datetime
from typing import Any
from uuid import NAMESPACE_URL, uuid5

from app.approvals.store import read_approvals
from app.calendar.service import build_calendar_agenda
from app.growth.jobs import application_followups, job_tasks
from app.growth.learning import learning_tasks
from app.health.service import get_health_summary
from app.notifications.demo import build_demo_notifications
from app.profile.store import read_profile


def build_morning_briefing() -> dict[str, Any]:
    profile = read_profile()
    agenda = build_calendar_agenda(profile)
    health = get_health_summary()
    notifications = build_demo_notifications(limit=20)
    approvals = [item for item in read_approvals() if item.get("status") in {"pending", "editing"}]
    jobs = job_tasks()
    learning = learning_tasks()
    followups = application_followups()

    cards = [
        *approval_cards(approvals),
        *calendar_cards(agenda),
        *gmail_cards(profile.get("gmail") or {}),
        *health_cards(health),
        *job_cards(jobs, followups),
        *learning_cards(learning),
    ]
    cards = sorted(unique_cards(cards), key=lambda item: (priority_score(item["priority"]), item["title"]), reverse=True)[:8]
    primary = cards[0] if cards else fallback_primary(profile)

    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "greeting": greeting(profile),
        "summary": briefing_summary(profile, agenda, health, approvals, jobs, learning),
        "primary": primary,
        "cards": cards,
        "signals": {
            "gmail": bool((profile.get("gmail") or {}).get("email")),
            "calendar": bool((profile.get("calendar") or {}).get("events")),
            "github": bool((profile.get("github") or {}).get("login")),
            "linkedin": bool((profile.get("linkedin") or {}).get("sub")),
            "health": bool((profile.get("health") or {}).get("latest_fitness") or (profile.get("health") or {}).get("latest")),
            "approvals": len(approvals),
            "notifications": notifications.get("count") or 0,
        },
        "timeline": build_timeline(agenda, health, cards),
        "agents": build_agent_collaboration(profile, agenda, health, cards),
        "guardian": build_guardian_summary(cards, health),
    }


def card(kind: str, title: str, body: str, priority: str, source: str, action_label: str, action_href: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
    key = f"{kind}:{title}:{body}:{source}:{action_href}:{(metadata or {}).get('id')}"
    return {
        "id": str(uuid5(NAMESPACE_URL, key)),
        "kind": kind,
        "title": title,
        "body": body,
        "priority": priority,
        "source": source,
        "action_label": action_label,
        "action_href": action_href,
        "metadata": metadata or {},
    }


def approval_cards(approvals: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result = []
    for approval in approvals[:3]:
        recommendation = approval.get("recommendation") or {}
        result.append(
            card(
                "approval",
                recommendation.get("title") or "Approval waiting",
                "Guardian is holding an external action until you review it.",
                "high",
                "Guardian",
                "Review approval",
                "/tasks",
                {"id": approval.get("id")},
            )
        )
    return result


def calendar_cards(agenda: dict[str, Any]) -> list[dict[str, Any]]:
    result = []
    for conflict in agenda.get("conflicts") or []:
        result.append(
            card(
                "calendar",
                "Schedule conflict",
                conflict.get("description") or "Calendar Agent found overlapping events.",
                "high",
                "Calendar Agent",
                "Open tasks",
                "/tasks",
                {"id": conflict.get("id")},
            )
        )

    next_event = agenda.get("next_event")
    if next_event:
        result.append(
            card(
                "calendar",
                f"Prepare for {next_event.get('summary') or 'your next event'}",
                "Check notes, email context, travel time, and one follow-up before it starts.",
                "medium",
                "Meeting Agent",
                "Open tasks",
                "/tasks",
                {"id": next_event.get("id"), "start": next_event.get("start")},
            )
        )
    return result


def gmail_cards(gmail: dict[str, Any]) -> list[dict[str, Any]]:
    result = []
    for message in gmail.get("important_messages") or []:
        haystack = f"{message.get('subject') or ''} {message.get('from') or ''} {message.get('snippet') or ''}".lower()
        if is_auth_or_verification_message(haystack):
            continue
        result.append(
            card(
                "email",
                message.get("subject") or "Important email",
                f"{message.get('from') or 'Unknown sender'} - {message.get('snippet') or 'No preview available.'}",
                "high" if (message.get("importance_score") or 0) >= 2 else "medium",
                "Email Agent",
                "Ask Email Agent",
                "/dashboard",
                {"id": message.get("id")},
            )
        )
    return result[:3]


def health_cards(health: dict[str, Any]) -> list[dict[str, Any]]:
    result = []
    if health.get("urgent_warning"):
        result.append(card("health", "Health warning", health["urgent_warning"], "urgent", "Health Agent", "Open health", "/health"))
    for insight in health.get("insights") or []:
        if insight.get("severity") not in {"warning", "safe", "good"}:
            continue
        priority = "medium" if insight.get("severity") == "warning" else "low"
        result.append(card("health", insight.get("title") or "Health insight", insight.get("body") or "Health Agent found a pattern.", priority, "Health Agent", "Open health", "/health"))
    return result[:2]


def job_cards(jobs: list[dict[str, Any]], followups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result = []
    for item in followups[:2]:
        result.append(card("job", item["title"], item["body"], item["priority"], "Application Agent", item["action_label"], item["action_href"], item.get("metadata")))
    for job in jobs[:2]:
        result.append(
            card(
                "job",
                f"Move job forward: {job.get('title') or 'tracked role'}",
                str(job.get("next_step") or "Choose one concrete application step today."),
                "medium",
                "Growth Agent",
                "Open tasks",
                "/tasks",
                {"id": job.get("id")},
            )
        )
    return result


def learning_cards(learning: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not learning:
        return []
    item = learning[0]
    next_step = item.get("next_step") or {}
    return [
        card(
            "learning",
            f"Continue learning: {item.get('title') or 'growth task'}",
            next_step.get("task") if isinstance(next_step, dict) else "Spend one focused session on your current Growth item.",
            "medium",
            "Learning Agent",
            "Open growth",
            "/growth",
            {"id": item.get("id")},
        )
    ]


def build_timeline(agenda: dict[str, Any], health: dict[str, Any], cards: list[dict[str, Any]]) -> list[dict[str, str]]:
    timeline = []
    next_event = agenda.get("next_event")
    if next_event:
        timeline.append({"time": "Next", "title": next_event.get("summary") or "Upcoming event", "detail": next_event.get("start") or "Calendar event"})
    latest_fitness = health.get("latest_fitness") or {}
    if latest_fitness:
        steps = latest_fitness.get("steps")
        timeline.append({"time": "Health", "title": f"{steps:,} steps" if isinstance(steps, int) else "Fitness synced", "detail": "iPhone health signal is available for today."})
    if cards:
        timeline.append({"time": "Focus", "title": cards[0]["title"], "detail": cards[0]["source"]})
    return timeline[:4]


def build_agent_collaboration(profile: dict[str, Any], agenda: dict[str, Any], health: dict[str, Any], cards: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {"agent": "Memory Agent", "status": "ready", "summary": "Loaded profile, connectors, health, jobs, learning, and approvals.", "depends_on": []},
        {"agent": "Calendar Agent", "status": "ready" if agenda.get("next_event") else "waiting", "summary": "Checked upcoming events and conflicts.", "depends_on": ["Memory Agent"]},
        {"agent": "Email Agent", "status": "ready" if (profile.get("gmail") or {}).get("email") else "waiting", "summary": "Filtered important Gmail signals and ignored verification codes.", "depends_on": ["Memory Agent"]},
        {"agent": "Health Agent", "status": "ready" if health.get("latest") or health.get("latest_fitness") else "waiting", "summary": "Reviewed check-ins and iOS Shortcut data for workload balance.", "depends_on": ["Memory Agent"]},
        {"agent": "Guardian", "status": "active", "summary": "Ranked risk and kept external actions approval-first.", "depends_on": ["Calendar Agent", "Email Agent", "Health Agent"]},
        {"agent": "Planning Agent", "status": "ready" if cards else "waiting", "summary": "Merged signals into one primary recommendation.", "depends_on": ["Guardian"]},
    ]


def build_guardian_summary(cards: list[dict[str, Any]], health: dict[str, Any]) -> dict[str, Any]:
    urgent = any(item["priority"] == "urgent" for item in cards)
    high = sum(1 for item in cards if item["priority"] == "high")
    return {
        "status": "urgent" if urgent else "watching" if high else "calm",
        "message": health.get("urgent_warning") or ("Review high-priority items before external actions." if high else "No urgent Guardian block right now."),
        "approval_rule": "Email, calendar, and outreach actions still require approval.",
    }


def briefing_summary(profile: dict[str, Any], agenda: dict[str, Any], health: dict[str, Any], approvals: list[dict[str, Any]], jobs: list[dict[str, Any]], learning: list[dict[str, Any]]) -> str:
    parts = []
    if approvals:
        parts.append(f"{len(approvals)} approval(s) waiting")
    conflicts = agenda.get("conflicts") or []
    if conflicts:
        parts.append(f"{len(conflicts)} calendar conflict(s)")
    if agenda.get("next_event"):
        next_title = agenda["next_event"].get("summary") or "next event"
        parts.append(f"next event is {next_title}")
    travel_risks = ((agenda.get("travel_guardian") or {}).get("risks") or [])
    if travel_risks:
        parts.append(f"{len(travel_risks)} travel risk(s)")
    if health.get("latest_fitness"):
        parts.append("health data synced")
    if health.get("urgent_warning"):
        parts.append("urgent health warning")
    if jobs:
        parts.append("job prep is active")
    if learning:
        parts.append("learning plan is active")
    if not parts:
        return "Connect Gmail, Calendar, GitHub, Health, or track a job so MyAgent can build a stronger morning briefing."
    name = profile.get("name") or "you"
    return f"MyAgent checked context for {name}: " + ", ".join(parts) + "."


def greeting(profile: dict[str, Any]) -> str:
    name = profile.get("name") or "Jack"
    hour = datetime.now().hour
    if hour < 12:
        return f"Good morning, {name}"
    if hour < 18:
        return f"Good afternoon, {name}"
    return f"Good evening, {name}"


def fallback_primary(profile: dict[str, Any]) -> dict[str, Any]:
    return card(
        "setup",
        "Finish connecting MyAgent",
        "Connect one more source or save LinkedIn details so the briefing can become personal.",
        "low",
        "Setup Agent",
        "Open connectors",
        "/connectors",
        {"name": profile.get("name")},
    )


def unique_cards(cards: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen = set()
    unique = []
    for item in cards:
        if item["id"] in seen:
            continue
        seen.add(item["id"])
        unique.append(item)
    return unique


def priority_score(priority: str) -> int:
    return {"urgent": 4, "high": 3, "medium": 2, "low": 1}.get(priority, 0)


def is_auth_or_verification_message(text: str) -> bool:
    return any(
        term in text
        for term in [
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
    )
