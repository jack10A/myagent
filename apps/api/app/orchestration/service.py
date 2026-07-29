from sqlalchemy.orm import Session

from app.activity.store import create_activity_from_trace
from app.agents.collaboration import run_agent_collaboration
from app.approvals.store import create_approval_from_trace
from app.db.models import Action, Event, Notification, Recommendation, Situation, User
from app.orchestration.schemas import IncomingEvent, OrchestrationResult
from app.profile.store import profile_to_context, read_profile


def process_event(db: Session, user: User, payload: IncomingEvent) -> OrchestrationResult:
    event = Event(user_id=user.id, source=payload.source, event_type=payload.event_type, payload=payload.payload)
    db.add(event)
    db.flush()

    situation = detect_situation(user, payload)
    db_situation = Situation(
        user_id=user.id,
        type=situation["type"],
        title=situation["title"],
        description=situation["description"],
        severity=situation["severity"],
        source_event_ids=[str(event.id)],
    )
    db.add(db_situation)
    db.flush()

    collaboration = run_agent_collaboration(
        user_context=user.profile.context if user.profile else {},
        event=payload,
        situation=situation,
    )
    recommendation = collaboration["recommendation"]
    guardian = collaboration["guardian"]

    db_recommendation = Recommendation(
        situation_id=db_situation.id,
        user_id=user.id,
        title=recommendation["title"],
        rationale=recommendation["rationale"],
        confidence=recommendation["confidence"],
        guardian_result=guardian,
    )
    db.add(db_recommendation)
    db.flush()

    actions = [
        Action(
            recommendation_id=db_recommendation.id,
            user_id=user.id,
            type=action["type"],
            payload=action["payload"],
            risk_level=guardian["risk_level"],
            approval_required=guardian["approval_required"],
        )
        for action in recommendation["actions"]
    ]
    db.add_all(actions)
    db.add(
        Notification(
            user_id=user.id,
            title=db_recommendation.title,
            body=db_recommendation.rationale,
            priority="urgent" if situation["severity"] == "urgent" else "normal",
            metadata_json={"recommendation_id": str(db_recommendation.id)},
        )
    )
    db.commit()

    return OrchestrationResult(
        situation={"id": str(db_situation.id), **situation},
        recommendation={
            "id": str(db_recommendation.id),
            "title": db_recommendation.title,
            "rationale": db_recommendation.rationale,
            "confidence": db_recommendation.confidence,
        },
        actions=[
            {
                "id": str(action.id),
                "type": action.type,
                "payload": action.payload,
                "approval_required": action.approval_required,
                "risk_level": action.risk_level,
            }
            for action in actions
        ],
        guardian=guardian,
        agent_messages=collaboration["messages"],
    )


def detect_situation(user: User, event: IncomingEvent) -> dict:
    if event.event_type in {"weather_alert", "traffic_accident", "emergency_alert"}:
        city = user.profile.city if user.profile else None
        return {
            "type": "guardian_nearby_alert",
            "title": event.payload.get("title", "Guardian nearby alert"),
            "description": event.payload.get("description", f"An alert may affect you near {city or 'your area'}."),
            "severity": event.payload.get("severity", "urgent"),
        }

    if event.event_type == "email_received":
        return {
            "type": "work_follow_up",
            "title": "Important email may need action",
            "description": "MyAgent found an email that may require a calendar or reply action.",
            "severity": "normal",
        }

    return {
        "type": "general_context_change",
        "title": "New context detected",
        "description": "MyAgent detected new information that may matter.",
        "severity": "normal",
    }


def run_demo_event(payload: IncomingEvent) -> dict:
    profile = read_profile()
    context = profile_to_context(profile)
    situation = detect_situation_from_context(context, payload)
    collaboration = run_agent_collaboration(user_context=context, event=payload, situation=situation)

    return {
        "profile": profile,
        "situation": situation,
        "recommendation": collaboration["recommendation"],
        "actions": collaboration["actions"],
        "guardian": collaboration["guardian"],
        "agent_messages": collaboration["messages"],
    }


def process_command(message: str) -> dict:
    profile = read_profile()
    context = profile_to_context(profile)
    event = command_to_event(message)
    situation = detect_situation_from_context(context, event)
    collaboration = run_agent_collaboration(user_context=context, event=event, situation=situation)

    trace = {
        "profile": profile,
        "command": message,
        "intent": event.event_type,
        "situation": situation,
        "recommendation": collaboration["recommendation"],
        "actions": collaboration["actions"],
        "guardian": collaboration["guardian"],
        "agent_messages": collaboration["messages"],
    }
    approval = create_approval_from_trace(trace)
    if approval:
        trace["approval"] = {
            "id": approval["id"],
            "status": approval["status"],
            "created_at": approval["created_at"],
        }
    create_activity_from_trace(trace)
    return trace


def command_to_event(message: str) -> IncomingEvent:
    normalized = message.lower()
    intent_groups = [
        (
            {
                "add prep",
                "prep block",
                "create prep",
                "create calendar",
                "add calendar",
                "add to my calendar",
                "add to calendar",
                "put on my calendar",
                "schedule a",
                "schedule an",
                "add 30",
                "remind me",
                "reminder",
            },
            "calendar_write_request",
            "calendar",
        ),
        ({"trip", "travel", "flight", "bus", "train", "airport", "passport", "route"}, "travel_guardian_request", "calendar"),
        ({"calendar", "schedule", "plan my", "reschedule", "appointment", "tomorrow", "agenda", "prepare me", "prepare for"}, "planning_request", "calendar"),
        ({"emergency", "accident", "storm", "weather", "danger", "safe near", "near me"}, "emergency_alert", "guardian"),
        ({"email", "mail", "gmail", "inbox", "reply", "send a message"}, "email_request", "gmail"),
        ({"job", "career", "cv", "resume", "github", "study", "course", "skill"}, "career_request", "growth"),
        ({"meeting", "youtube", "transcript", "summarize", "summary", "record"}, "capture_request", "capture"),
        ({"health", "sleep", "steps", "calories", "exercise", "mood", "symptom"}, "health_request", "health"),
    ]
    for keywords, event_type, source in intent_groups:
        if any(keyword in normalized for keyword in keywords):
            return IncomingEvent(source=source, event_type=event_type, payload={"message": message})
    return IncomingEvent(source="myagent", event_type="general_request", payload={"message": message})


def detect_situation_from_context(context: dict, event: IncomingEvent) -> dict:
    if event.event_type in {"weather_alert", "traffic_accident", "emergency_alert"}:
        city = context.get("preferences", {}).get("guardian_city")
        return {
            "type": "guardian_nearby_alert",
            "title": event.payload.get("title", "Guardian nearby alert"),
            "description": event.payload.get("description", f"An alert may affect you near {city or 'your area'}."),
            "severity": event.payload.get("severity", "urgent"),
        }

    if event.event_type == "email_received":
        return {
            "type": "work_follow_up",
            "title": "Important email may need action",
            "description": "MyAgent found an email that may require a calendar or reply action.",
            "severity": "normal",
        }

    if event.event_type == "email_request":
        return {
            "type": "email_assistance",
            "title": "Email assistance requested",
            "description": event.payload.get("message", "Review email context and prepare a safe next step."),
            "severity": "normal",
        }

    if event.event_type in {"github_connected", "cv_analyzed", "career_request"}:
        return {
            "type": "career_growth_signal",
            "title": "Career profile updated",
            "description": "MyAgent found new career evidence that should improve job and skill recommendations.",
            "severity": "normal",
        }


    if event.event_type == "capture_request":
        return {
            "type": "capture_assistance",
            "title": "Content analysis requested",
            "description": event.payload.get("message", "Summarize content and extract useful follow-up."),
            "severity": "normal",
        }

    if event.event_type == "health_request":
        return {
            "type": "health_context",
            "title": "Wellness context requested",
            "description": event.payload.get("message", "Review personal wellness tracking context."),
            "severity": "normal",
        }

    if event.event_type == "planning_request":
        return {
            "type": "schedule_planning",
            "title": "Schedule planning requested",
            "description": event.payload.get("message", "Review context and prepare a schedule update."),
            "severity": "normal",
        }

    if event.event_type == "calendar_write_request":
        return {
            "type": "schedule_planning",
            "title": "Calendar action requested",
            "description": event.payload.get("message", "Prepare a calendar event draft for approval."),
            "severity": "normal",
        }

    if event.event_type == "travel_guardian_request":
        return {
            "type": "travel_guardian",
            "title": "Travel Guardian requested",
            "description": event.payload.get("message", "Check upcoming travel plans for weather, route, and delay risk."),
            "severity": "normal",
        }

    return {
        "type": "general_context_change",
        "title": "New context detected",
        "description": "MyAgent detected new information that may matter.",
        "severity": "normal",
    }
