from datetime import UTC, datetime
from typing import Any
from uuid import uuid5, NAMESPACE_URL

from app.activity.store import read_activity
from app.approvals.store import read_approvals
from app.calendar.service import build_calendar_agenda
from app.capture.service import capture_tasks
from app.growth.jobs import application_followups, job_tasks
from app.growth.learning import learning_tasks
from app.health.service import get_health_summary
from app.profile.store import read_profile


def build_demo_notifications(limit: int = 40) -> dict[str, Any]:
    profile = read_profile()
    now = datetime.now(UTC).isoformat()
    items: list[dict[str, Any]] = []

    def add(
        kind: str,
        title: str,
        body: str,
        *,
        priority: str = "medium",
        source: str,
        action_label: str | None = None,
        action_href: str | None = None,
        created_at: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        key = f"{kind}:{source}:{title}:{body}:{action_href}:{(metadata or {}).get('id')}"
        items.append(
            {
                "id": str(uuid5(NAMESPACE_URL, key)),
                "kind": kind,
                "title": title,
                "body": body,
                "priority": priority,
                "source": source,
                "action_label": action_label,
                "action_href": action_href,
                "created_at": created_at or now,
                "read": False,
                "metadata": metadata or {},
            }
        )

    for approval in read_approvals():
        if approval.get("status") not in {"pending", "editing"}:
            continue
        recommendation = approval.get("recommendation") or {}
        guardian = approval.get("guardian") or {}
        add(
            "approval",
            recommendation.get("title") or "Approval needed",
            guardian.get("reason") or "MyAgent prepared an external action and needs your decision.",
            priority="high",
            source="Guardian",
            action_label="Review approval",
            action_href="/tasks",
            created_at=approval.get("updated_at") or approval.get("created_at"),
            metadata={"id": approval.get("id"), "status": approval.get("status")},
        )

    gmail = profile.get("gmail") or {}
    for message in (gmail.get("important_messages") or [])[:5]:
        add(
            "email",
            message.get("subject") or "Important email",
            f"{message.get('from') or 'Unknown sender'} - {message.get('snippet') or 'No preview available.'}",
            priority="high" if (message.get("importance_score") or 0) >= 2 else "medium",
            source="Gmail",
            action_label="Open dashboard",
            action_href="/dashboard",
            created_at=message.get("date") or profile.get("updated_at"),
            metadata={"id": message.get("id"), "thread_id": message.get("thread_id")},
        )

    agenda = build_calendar_agenda(profile)
    for conflict in agenda.get("conflicts") or []:
        add(
            "calendar",
            "Calendar conflict detected",
            conflict.get("description") or "Two events may overlap.",
            priority="high",
            source="Calendar Agent",
            action_label="Review tasks",
            action_href="/tasks",
            metadata={"id": conflict.get("id")},
        )
    next_event = agenda.get("next_event")
    if next_event:
        add(
            "calendar",
            f"Prepare for {next_event.get('summary') or 'your next event'}",
            "Calendar Agent can create prep tasks and check context before the event.",
            priority="medium",
            source="Calendar Agent",
            action_label="Open tasks",
            action_href="/tasks",
            created_at=next_event.get("start") or profile.get("updated_at"),
            metadata={"id": next_event.get("id")},
        )

    travel = agenda.get("travel_guardian") or {}
    for risk in travel.get("risks") or []:
        add(
            "guardian",
            risk.get("title") or "Travel risk",
            risk.get("body") or travel.get("summary") or "Travel Guardian found a risk.",
            priority="high" if risk.get("severity") in {"urgent", "warning"} else "medium",
            source="Travel Guardian",
            action_label="Open notifications",
            action_href="/notifications",
        )

    for task in capture_tasks()[:4]:
        add(
            "capture",
            "Capture follow-up",
            task.get("title") or "Review captured content.",
            priority="medium",
            source="Capture Agent",
            action_label="Open tasks",
            action_href="/tasks",
            created_at=task.get("created_at"),
            metadata={"id": task.get("id"), "source_title": task.get("source_title")},
        )

    for task in learning_tasks()[:4]:
        next_step = task.get("next_step") or {}
        add(
            "learning",
            f"Continue {task.get('title') or 'learning'}",
            next_step.get("task") or "Continue the next learning step.",
            priority="medium",
            source="Growth Agent",
            action_label="Open growth",
            action_href="/growth",
            metadata={"id": task.get("id")},
        )

    for followup in application_followups()[:6]:
        add(
            "job",
            followup["title"],
            followup["body"],
            priority=followup["priority"],
            source="Application Follow-Up Agent",
            action_label=followup["action_label"],
            action_href=followup["action_href"],
            created_at=followup.get("created_at"),
            metadata=followup.get("metadata"),
        )

    for task in job_tasks()[:3]:
        next_step = task.get("next_step") or "Continue this job application prep."
        add(
            "job",
            f"Job prep: {task.get('title') or 'tracked job'}",
            next_step.get("task") if isinstance(next_step, dict) else str(next_step),
            priority="medium",
            source="Job Radar",
            action_label="Open tasks",
            action_href="/tasks",
            metadata={"id": task.get("id")},
        )

    health = get_health_summary()
    if health.get("urgent_warning"):
        add(
            "health",
            "Health warning",
            health["urgent_warning"],
            priority="urgent",
            source="Health Agent",
            action_label="Open health",
            action_href="/health",
        )
    for insight in health.get("insights") or []:
        if insight.get("severity") in {"warning", "safe"}:
            add(
                "health",
                insight.get("title") or "Health reminder",
                insight.get("body") or "Health Agent found a pattern.",
                priority="medium" if insight.get("severity") == "warning" else "low",
                source="Health Agent",
                action_label="Open health",
                action_href="/health",
            )

    for activity in read_activity(limit=5):
        recommendation = activity.get("recommendation") or {}
        add(
            "activity",
            recommendation.get("title") or "Agent finished a trace",
            recommendation.get("rationale") or activity.get("command") or "A recent agent collaboration was logged.",
            priority="low",
            source="Agent Activity",
            action_label="Open activity",
            action_href="/activity",
            created_at=activity.get("created_at"),
            metadata={"id": activity.get("id")},
        )

    items.sort(key=lambda item: priority_rank(item["priority"]) + "|" + (item.get("created_at") or ""), reverse=True)
    items = items[:limit]
    return {"items": items, "count": len(items), "unread": len(items), "summary": summarize(items)}


def priority_rank(priority: str) -> str:
    ranks = {"urgent": "4", "high": "3", "medium": "2", "low": "1"}
    return ranks.get(priority, "0")


def summarize(items: list[dict[str, Any]]) -> dict[str, int]:
    return {
        "urgent": sum(1 for item in items if item["priority"] == "urgent"),
        "high": sum(1 for item in items if item["priority"] == "high"),
        "medium": sum(1 for item in items if item["priority"] == "medium"),
        "low": sum(1 for item in items if item["priority"] == "low"),
    }
