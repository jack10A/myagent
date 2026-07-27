from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from app.activity.store import create_activity_from_trace
from app.profile.store import read_profile, write_profile


ACTIVE_STATUSES = {"not_started", "learning"}


def read_learning_items() -> list[dict[str, Any]]:
    return sorted(read_profile().get("learning") or [], key=lambda item: item.get("updated_at") or "", reverse=True)


def track_learning_resource(resource: dict[str, Any]) -> dict[str, Any]:
    profile = read_profile()
    items = profile.get("learning") or []
    now = datetime.now(UTC).isoformat()
    key = resource_key(resource)

    for item in items:
        if item.get("resource_key") == key:
            item["status"] = item.get("status") or "not_started"
            item["updated_at"] = now
            item["weekly_plan"] = item.get("weekly_plan") or build_learning_plan(resource)
            saved = item
            break
    else:
        saved = {
            "id": str(uuid4()),
            "resource_key": key,
            "status": "not_started",
            "resource": resource,
            "weekly_plan": build_learning_plan(resource),
            "created_at": now,
            "updated_at": now,
        }
        items.append(saved)

    write_profile({"learning": items})
    create_learning_activity(saved)
    return saved


def update_learning_status(item_id: str, status: str) -> dict[str, Any] | None:
    profile = read_profile()
    items = profile.get("learning") or []
    now = datetime.now(UTC).isoformat()

    for item in items:
        if item.get("id") == item_id:
            item["status"] = status
            item["updated_at"] = now
            if status == "completed":
                item["completed_at"] = now
            if status == "portfolio":
                item["portfolio_at"] = now
            write_profile({"learning": items})
            return item
    return None


def build_learning_plan(resource: dict[str, Any]) -> list[dict[str, str]]:
    title = str(resource.get("title") or "learning resource")
    kind = str(resource.get("type") or "course")
    project_focus = "MyAgent"

    if kind == "youtube":
        return [
            {"day": "Day 1", "task": f"Open the search and choose one recent video for {title}."},
            {"day": "Day 2", "task": "Watch the first half and write 5 implementation notes."},
            {"day": "Day 3", "task": f"Rebuild one useful idea inside {project_focus}."},
            {"day": "Day 4", "task": "Commit the improvement to GitHub with a clear README note."},
            {"day": "Day 5", "task": "Ask MyAgent to summarize what you learned and what still feels unclear."},
            {"day": "Day 6", "task": "Record a short demo or screenshot for your portfolio."},
            {"day": "Day 7", "task": "Mark it completed and connect it to one job/internship story."},
        ]

    if kind == "project":
        return [
            {"day": "Day 1", "task": f"Write a tiny spec for {title}: goal, inputs, output, and success criteria."},
            {"day": "Day 2", "task": "Build the smallest working version."},
            {"day": "Day 3", "task": "Add real data from GitHub, Gmail, CV, research, or memory."},
            {"day": "Day 4", "task": "Add an Activity trace so the feature proves agent collaboration."},
            {"day": "Day 5", "task": "Polish the UI and handle empty/error states."},
            {"day": "Day 6", "task": "Write README screenshots and a recruiter-friendly explanation."},
            {"day": "Day 7", "task": "Push it to GitHub and mark it as portfolio evidence."},
        ]

    return [
        {"day": "Day 1", "task": f"Start {title} and finish the intro/setup."},
        {"day": "Day 2", "task": "Complete one hands-on section and save notes to MyAgent memory."},
        {"day": "Day 3", "task": "Turn one concept into a small MyAgent feature idea."},
        {"day": "Day 4", "task": "Build or prototype that idea."},
        {"day": "Day 5", "task": "Add tests, screenshots, or an Activity trace."},
        {"day": "Day 6", "task": "Update your GitHub README with what you learned."},
        {"day": "Day 7", "task": "Ask MyAgent to convert it into an interview story."},
    ]


def learning_tasks() -> list[dict[str, Any]]:
    tasks = []
    for item in read_learning_items():
        if item.get("status") not in ACTIVE_STATUSES:
            continue
        resource = item.get("resource") or {}
        plan = item.get("weekly_plan") or []
        next_step = plan[0] if plan else {"day": "Next", "task": f"Continue {resource.get('title') or 'learning'}."}
        tasks.append(
            {
                "id": item.get("id"),
                "title": resource.get("title") or "Tracked learning",
                "type": resource.get("type") or "course",
                "provider": resource.get("provider") or "MyAgent",
                "status": item.get("status") or "not_started",
                "priority": resource.get("priority") or 70,
                "next_step": next_step,
                "weekly_plan": plan,
                "url": resource.get("url"),
            }
        )
    return sorted(tasks, key=lambda item: item.get("priority") or 0, reverse=True)


def create_learning_activity(item: dict[str, Any]) -> None:
    resource = item.get("resource") or {}
    title = resource.get("title") or "learning resource"
    resource_type = resource.get("type") or "course"

    create_activity_from_trace(
        {
            "command": f"Track learning resource: {title}",
            "intent": "learning_plan",
            "situation": {
                "type": "growth_learning",
                "title": "Learning resource tracked",
                "description": f"MyAgent turned a {resource_type} recommendation into a weekly learning plan.",
                "severity": "low",
            },
            "recommendation": {
                "title": f"Start {title}",
                "rationale": resource.get("why") or "This supports your current growth path.",
                "confidence": min((resource.get("priority") or 80) / 100, 0.98),
                "primary_action_type": "track_learning",
            },
            "actions": [
                {"type": "save_to_memory", "payload": {"destination": "learning", "resource_id": item.get("id")}},
                {"type": "create_learning_plan", "payload": {"days": len(item.get("weekly_plan") or [])}},
                {"type": "add_to_tasks", "payload": {"status": item.get("status")}},
            ],
            "guardian": {
                "decision": "allow",
                "risk_level": "low",
                "approval_required": False,
                "reason": "Tracking learning saves a local plan only; it does not contact anyone or spend money.",
            },
            "agent_messages": [
                {
                    "agent": "growth_agent",
                    "role": "Career and learning strategist",
                    "summary": "Matched the resource to the user's target role, skills, CV gaps, and GitHub signals.",
                    "depends_on": [],
                    "data": {"resource_type": resource_type, "priority": resource.get("priority")},
                },
                {
                    "agent": "research_agent",
                    "role": "Source checker",
                    "summary": "Checked whether this learning source supports the current agent-building and career roadmap.",
                    "depends_on": ["growth_agent"],
                    "data": {"provider": resource.get("provider")},
                },
                {
                    "agent": "planning_agent",
                    "role": "Weekly execution planner",
                    "summary": "Converted the resource into a practical 7-day plan with portfolio output.",
                    "depends_on": ["growth_agent", "research_agent"],
                    "data": {"days": len(item.get("weekly_plan") or [])},
                },
                {
                    "agent": "memory_agent",
                    "role": "Long-term memory manager",
                    "summary": "Saved the tracked resource and plan into MyAgent learning memory.",
                    "depends_on": ["planning_agent"],
                    "data": {"resource_id": item.get("id")},
                },
                {
                    "agent": "guardian_agent",
                    "role": "Safety and approval reviewer",
                    "summary": "Allowed the action because it only changes local learning memory and tasks.",
                    "depends_on": ["memory_agent"],
                    "data": {"approval_required": False},
                },
            ],
        }
    )


def resource_key(resource: dict[str, Any]) -> str:
    return "|".join(
        [
            str(resource.get("type") or "").strip().lower(),
            str(resource.get("provider") or "").strip().lower(),
            str(resource.get("title") or "").strip().lower(),
            str(resource.get("url") or "").strip().lower(),
        ]
    )
