from dataclasses import dataclass, field
from email.utils import parseaddr

from app.approvals.executor import build_draft_body
from app.calendar.service import build_calendar_agenda, build_calendar_write_draft
from app.guardian.schemas import GuardianReviewRequest
from app.guardian.service import review_action
from app.orchestration.schemas import IncomingEvent


@dataclass
class AgentMessage:
    agent: str
    depends_on: list[str]
    summary: str
    data: dict = field(default_factory=dict)


@dataclass
class CollaborationState:
    user_context: dict
    event: IncomingEvent
    messages: list[AgentMessage] = field(default_factory=list)

    def add(self, message: AgentMessage) -> AgentMessage:
        self.messages.append(message)
        return message

    def get(self, agent: str) -> AgentMessage | None:
        for message in reversed(self.messages):
            if message.agent == agent:
                return message
        return None


def run_agent_collaboration(user_context: dict, event: IncomingEvent, situation: dict) -> dict:
    state = CollaborationState(user_context=user_context, event=event)

    context = context_agent(state)
    specialist = specialist_agent(state, situation, context)
    memory = memory_agent(state, context, specialist)
    growth = growth_agent(state, context, memory)
    planning = planning_agent(state, situation, specialist, memory, growth)
    action = action_agent(state, situation, planning)
    guardian = guardian_agent(state, action)

    return {
        "messages": [serialize_message(message) for message in state.messages],
        "recommendation": planning.data["recommendation"],
        "actions": action.data["actions"],
        "guardian": guardian.data["guardian"],
    }


def context_agent(state: CollaborationState) -> AgentMessage:
    identity = state.user_context.get("identity", {})
    name = identity.get("name") or "the user"
    role = identity.get("target_role") or identity.get("role") or "their goals"
    message = AgentMessage(
        agent="context_agent",
        depends_on=[],
        summary=f"Understands {name}'s profile and current focus around {role}.",
        data={"identity": identity, "preferences": state.user_context.get("preferences", {})},
    )
    return state.add(message)


def specialist_agent(state: CollaborationState, situation: dict, context: AgentMessage) -> AgentMessage:
    event_type = state.event.event_type
    if event_type in {"weather_alert", "traffic_accident", "emergency_alert"}:
        agent = "location_agent"
        summary = "Detected a nearby safety or travel signal that may affect the user's day."
    elif event_type == "travel_guardian_request":
        agent = "travel_guardian_agent"
        agenda = build_calendar_agenda(profile_from_context(state.user_context))
        summary = agenda["travel_guardian"]["summary"]
    elif event_type in {"email_received", "email_request"}:
        agent = "email_agent"
        summary = "Detected an email that may need a reply, scheduling check, or memory lookup."
    elif event_type in {"github_connected", "cv_analyzed", "career_request"}:
        agent = "career_agent"
        summary = "Detected a career signal that can improve job and skill recommendations."
    elif event_type == "capture_request":
        agent = "capture_agent"
        summary = "Prepared the meeting, video, or transcript request for focused analysis."
    elif event_type == "health_request":
        agent = "health_agent"
        summary = "Reviewed the request as personal wellness context without making a medical diagnosis."
    elif event_type in {"planning_request", "calendar_write_request"}:
        agent = "calendar_agent"
        agenda = build_calendar_agenda(profile_from_context(state.user_context))
        if event_type == "calendar_write_request":
            summary = "Prepared a calendar change as a draft. Nothing will be created until the user approves it."
        else:
            summary = agenda["insight"] if agenda.get("connected") else "Calendar is not connected yet, so planning used profile memory only."
    else:
        agent = "intake_agent"
        summary = "Classified the incoming event and prepared it for planning."

    message = AgentMessage(
        agent=agent,
        depends_on=[context.agent],
        summary=summary,
        data={
            "event_type": event_type,
            "situation_type": situation["type"],
            "payload": state.event.payload,
            "agenda": build_calendar_agenda(profile_from_context(state.user_context)) if event_type in {"planning_request", "calendar_write_request", "travel_guardian_request"} else None,
        },
    )
    return state.add(message)


def memory_agent(state: CollaborationState, context: AgentMessage, specialist: AgentMessage) -> AgentMessage:
    goals = state.user_context.get("goals", [])
    skills = state.user_context.get("skills", [])
    gmail = state.user_context.get("gmail") or {}
    calendar = state.user_context.get("calendar") or {}
    github = state.user_context.get("github") or {}
    captures = state.user_context.get("captures") or []
    health = state.user_context.get("health") or {}
    learning = state.user_context.get("learning") or []
    jobs = state.user_context.get("jobs") or []
    memory_counts = {
        "goals": len(goals),
        "skills": len(skills),
        "important_emails": len(gmail.get("important_messages") or []),
        "calendar_events": len(calendar.get("events") or []),
        "github_connected": bool(github.get("login")),
        "captures": len(captures),
        "health_check_ins": len(health.get("check_ins") or []),
        "learning_topics": len(learning),
        "tracked_jobs": len(jobs),
    }
    active_sources = [
        label
        for label, active in [
            ("goals", bool(goals)),
            ("skills", bool(skills)),
            ("Gmail", memory_counts["important_emails"] > 0),
            ("Calendar", memory_counts["calendar_events"] > 0),
            ("GitHub", memory_counts["github_connected"]),
            ("CV/captures", bool(captures)),
            ("health", memory_counts["health_check_ins"] > 0),
            ("learning", memory_counts["learning_topics"] > 0),
            ("jobs", memory_counts["tracked_jobs"] > 0),
        ]
        if active
    ]
    message = AgentMessage(
        agent="memory_agent",
        depends_on=[context.agent, specialist.agent],
        summary=f"Checked unified memory across {', '.join(active_sources) if active_sources else 'profile basics'} before planning.",
        data={"goals": goals, "skills": skills, "memory_counts": memory_counts, "matched_memory": bool(active_sources)},
    )
    return state.add(message)


def growth_agent(state: CollaborationState, context: AgentMessage, memory: AgentMessage) -> AgentMessage:
    identity = context.data.get("identity", {})
    role = identity.get("target_role") or identity.get("role") or "career growth"
    message = AgentMessage(
        agent="growth_agent",
        depends_on=[context.agent, memory.agent],
        summary=f"Checked whether this event affects the user's study path, job search, or growth toward {role}.",
        data={"target_role": role, "career_relevant": state.event.event_type in {"github_connected", "cv_analyzed", "career_request"}},
    )
    return state.add(message)


def planning_agent(
    state: CollaborationState,
    situation: dict,
    specialist: AgentMessage,
    memory: AgentMessage,
    growth: AgentMessage,
) -> AgentMessage:
    if situation["type"] == "guardian_nearby_alert":
        title = "Guardian recommends adjusting your plan"
        rationale = "Location, calendar, and safety context should be merged into one clear next step."
        confidence = 0.84
        primary_action_type = "nearby_emergency_alert"
    elif situation["type"] == "email_assistance" or situation["type"] == "work_follow_up":
        important_messages = (state.user_context.get("gmail") or {}).get("important_messages") or []
        ranked_messages = rank_email_messages(important_messages, state.event.payload.get("message", ""))
        actionable_messages = [item for item in ranked_messages if item["message"].get("from")]
        if actionable_messages:
            title = "MyAgent prepared an email next step"
            rationale = "Email and memory context were checked before preparing a draft. Nothing will be sent without approval."
            confidence = 0.82
            primary_action_type = "send_email"
        else:
            title = "MyAgent needs a real email target first"
            rationale = "Gmail is connected, but MyAgent did not find an actionable important email with a real recipient in the latest scan."
            confidence = 0.72
            primary_action_type = "email_review_needed"
    elif situation["type"] == "capture_assistance":
        title = "MyAgent is ready to analyze the content"
        rationale = "The Capture Agent can extract the relevant section, summary, decisions, and action items."
        confidence = 0.86
        primary_action_type = "capture_memory"
    elif situation["type"] == "health_context":
        title = "MyAgent prepared a wellness check-in"
        rationale = "Your recent self-reported health context can be reviewed for trends without diagnosing or replacing medical care."
        confidence = 0.78
        primary_action_type = "health_insight"
    elif situation["type"] == "schedule_planning":
        if state.event.event_type == "calendar_write_request":
            title = "MyAgent prepared a calendar event draft"
            rationale = "Calendar Agent prepared the event details. Guardian requires approval before MyAgent changes Google Calendar."
            confidence = 0.86
            primary_action_type = "update_calendar"
        else:
            title = "MyAgent prepared your calendar briefing"
            rationale = "Calendar Agent checked upcoming events, possible conflicts, and prep tasks before recommending the next move."
            confidence = 0.84
            primary_action_type = "calendar_briefing"
    elif situation["type"] == "travel_guardian":
        title = "Travel Guardian checked your trip"
        rationale = "Calendar, route, weather-style checks, and Guardian safety rules were merged into one travel briefing."
        confidence = 0.86
        primary_action_type = "travel_guardian_check"
    elif growth.data.get("career_relevant"):
        title = "MyAgent found a career improvement opportunity"
        rationale = "The event can improve your profile, job targeting, or skill plan."
        confidence = 0.80
        primary_action_type = "career_recommendation"
    else:
        title = "MyAgent prepared a smart follow-up"
        rationale = "This looks related to your context and may need a reply, schedule check, or saved memory."
        confidence = 0.76
        primary_action_type = "general_insight"

    recommendation = {
        "title": title,
        "rationale": rationale,
        "confidence": confidence,
        "primary_action_type": primary_action_type,
    }
    message = AgentMessage(
        agent="planning_agent",
        depends_on=[specialist.agent, memory.agent, growth.agent],
        summary="Merged specialist, memory, and growth outputs into one recommendation.",
        data={"recommendation": recommendation},
    )
    return state.add(message)


def action_agent(state: CollaborationState, situation: dict, planning: AgentMessage) -> AgentMessage:
    action_type = planning.data["recommendation"]["primary_action_type"]
    if action_type == "nearby_emergency_alert":
        actions = [
            {"type": "notify_user", "payload": {"message": situation["description"]}},
            {"type": "draft_calendar_update", "payload": {"reason": situation["title"]}},
        ]
    elif action_type == "career_recommendation":
        actions = [
            {"type": "suggest_job_search", "payload": {"source": state.event.source}},
            {"type": "update_growth_plan", "payload": {"reason": situation["title"]}},
        ]
    elif action_type == "capture_memory":
        actions = [
            {"type": "open_capture", "payload": {"request": state.event.payload.get("message", "")}},
            {"type": "save_summary", "payload": {"destination": "memory"}},
        ]
    elif action_type == "health_insight":
        actions = [
            {"type": "open_health_check_in", "payload": {"request": state.event.payload.get("message", "")}},
            {"type": "review_health_trends", "payload": {"mode": "read_only"}},
        ]
    elif action_type == "calendar_briefing":
        agenda = build_calendar_agenda(profile_from_context(state.user_context))
        actions = [
            {"type": "show_agenda", "payload": {"insight": agenda["insight"], "next_event": agenda["next_event"]}},
            {"type": "create_prep_tasks", "payload": {"tasks": agenda["prep_tasks"]}},
            {"type": "review_conflicts", "payload": {"conflicts": agenda["conflicts"]}},
        ]
    elif action_type == "travel_guardian_check":
        agenda = build_calendar_agenda(profile_from_context(state.user_context))
        travel = agenda["travel_guardian"]
        actions = [
            {"type": "show_travel_guardian", "payload": travel},
            {"type": "create_travel_tasks", "payload": {"risks": travel["risks"]}},
            {"type": "open_guardian_map", "payload": {"reason": "Check live location before travel"}},
        ]
    elif action_type == "update_calendar":
        draft = build_calendar_write_draft(profile_from_context(state.user_context), state.event.payload.get("message", ""))
        actions = [
            {"type": "draft_calendar_event", "payload": draft},
            {"type": "request_approval", "payload": {"reason": "Calendar changes affect an external system"}},
        ]
    elif action_type == "send_email":
        important_messages = (state.user_context.get("gmail") or {}).get("important_messages") or []
        request = state.event.payload.get("message", "")
        ranked_messages = rank_email_messages(important_messages, request)
        actionable_messages = [item for item in ranked_messages if item["message"].get("from")]
        target = actionable_messages[0] if actionable_messages else {}
        target_message = target.get("message") or {}
        request = state.event.payload.get("message", "")
        snippet = target_message.get("snippet") or ""
        recipient_name, recipient_email = parseaddr(target_message.get("from") or "")
        actions = [
            {
                "type": "draft_email",
                "payload": {
                    "request": request,
                    "message_id": target_message.get("id"),
                    "thread_id": target_message.get("thread_id"),
                    "to": recipient_email or target_message.get("from"),
                    "recipient_name": recipient_name,
                    "subject": target_message.get("subject") or state.event.payload.get("subject", "Follow-up"),
                    "snippet": target_message.get("snippet"),
                    "body": build_draft_body(request=request, snippet=snippet),
                    "selected_reason": target.get("reason") or "Matched the strongest actionable Gmail signal.",
                    "alternatives": [
                        {
                            "subject": item["message"].get("subject"),
                            "from": item["message"].get("from"),
                            "score": item["score"],
                            "reason": item["reason"],
                        }
                        for item in actionable_messages[1:4]
                    ],
                },
            },
            {"type": "request_approval", "payload": {"reason": "Sending email communicates on your behalf"}},
        ]
    elif action_type == "email_review_needed":
        gmail = state.user_context.get("gmail") or {}
        actions = [
            {
                "type": "show_gmail_signals",
                "payload": {
                    "connected": bool(gmail.get("email")),
                    "email": gmail.get("email"),
                    "recent_scanned": gmail.get("recent_scanned", 0),
                    "important_count": len(gmail.get("important_messages") or []),
                    "message": "Refresh Gmail or ask about a specific sender/subject before MyAgent prepares a draft.",
                },
            },
            {"type": "open_connectors", "payload": {"target": "gmail"}},
        ]
    else:
        actions = [
            {"type": "show_insight", "payload": {"request": state.event.payload.get("message", "")}},
            {"type": "save_to_memory", "payload": {"source": state.event.source}},
        ]

    message = AgentMessage(
        agent="action_agent",
        depends_on=[planning.agent],
        summary="Converted the recommendation into draft actions that can be approved or rejected.",
        data={"actions": actions, "primary_action_type": action_type},
    )
    return state.add(message)


def guardian_agent(state: CollaborationState, action: AgentMessage) -> AgentMessage:
    guardian = review_action(
        GuardianReviewRequest(
            action_type=action.data["primary_action_type"],
            payload={"actions": action.data["actions"], "agent_messages": [serialize_message(message) for message in state.messages]},
            user_context=state.user_context,
        )
    )
    message = AgentMessage(
        agent="guardian_agent",
        depends_on=[action.agent],
        summary="Reviewed the full agent collaboration trace for risk, privacy, confidence, and approval needs.",
        data={"guardian": guardian.model_dump()},
    )
    return state.add(message)


def serialize_message(message: AgentMessage) -> dict:
    return {
        "agent": message.agent,
        "depends_on": message.depends_on,
        "summary": message.summary,
        "data": message.data,
    }


def rank_email_messages(messages: list[dict], request: str) -> list[dict]:
    query_terms = meaningful_terms(request)
    ranked = []
    for message in messages:
        subject = message.get("subject") or ""
        sender = message.get("from") or ""
        snippet = message.get("snippet") or ""
        labels = set(message.get("label_ids") or [])
        haystack = f"{subject} {sender} {snippet}".lower()

        score = int(message.get("importance_score") or 0) * 4
        matched_terms = [term for term in query_terms if term in haystack]
        subject_sender = f"{subject} {sender}".lower()
        direct_matches = [term for term in query_terms if term in subject_sender]
        score += len(matched_terms) * 6
        score += len(direct_matches) * 8
        if len(direct_matches) >= 2:
            score += 14

        if any(term in haystack for term in ["internship", "interview", "meeting", "zoom", "career", "job", "offer"]):
            score += 8
        if any(term in haystack for term in ["security", "verification", "deadline", "action required"]):
            score += 5
        if "IMPORTANT" in labels:
            score += 4
        if "STARRED" in labels:
            score += 3
        if "CATEGORY_PROMOTIONS" in labels or any(term in haystack for term in ["temu", "discount", "shop", "reward"]):
            score -= 10
        if "CATEGORY_SOCIAL" in labels and not any(term in haystack for term in ["linkedin", "connect", "recruiter"]):
            score -= 3

        reason_parts = []
        if matched_terms:
            reason_parts.append(f"matched command terms: {', '.join(matched_terms[:4])}")
        if direct_matches:
            reason_parts.append("direct subject/sender match")
        if "IMPORTANT" in labels:
            reason_parts.append("marked important in Gmail")
        if any(term in haystack for term in ["internship", "interview", "meeting", "zoom"]):
            reason_parts.append("career or meeting related")
        if "CATEGORY_PROMOTIONS" in labels:
            reason_parts.append("promotion down-ranked")

        ranked.append(
            {
                "message": message,
                "score": score,
                "reason": "; ".join(reason_parts) or "ranked from Gmail importance and recent context",
            }
        )

    return sorted(ranked, key=lambda item: item["score"], reverse=True)


def meaningful_terms(text: str) -> list[str]:
    stopwords = {
        "reply",
        "email",
        "mail",
        "gmail",
        "important",
        "with",
        "professional",
        "short",
        "answer",
        "message",
        "the",
        "my",
        "to",
        "a",
        "an",
        "and",
    }
    terms = []
    for raw in text.lower().replace("-", " ").replace("_", " ").split():
        term = "".join(character for character in raw if character.isalnum())
        if len(term) >= 3 and term not in stopwords and term not in terms:
            terms.append(term)
    return terms


def profile_from_context(context: dict) -> dict:
    preferences = context.get("preferences") or {}
    identity = context.get("identity") or {}
    return {
        "name": identity.get("name"),
        "gmail": context.get("gmail") or {},
        "calendar": context.get("calendar") or {},
        "city": preferences.get("guardian_city"),
    }
