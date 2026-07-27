from app.onboarding.schemas import OnboardingAnswer

BASE_QUESTIONS = [
    {"id": "name", "text": "What should MyAgent call you?"},
    {"id": "life_stage", "text": "Are you a student, working professional, founder, freelancer, or looking for a job?"},
    {"id": "role", "text": "What do you do day to day?"},
    {"id": "target_role", "text": "What job, field, or study path do you want MyAgent to help you grow toward?"},
    {"id": "goals", "text": "What are your top goals right now?"},
    {"id": "industry", "text": "What industry or field do you work in?"},
    {"id": "skills", "text": "What skills do you already have?"},
    {"id": "skill_gaps", "text": "What skills do you want to improve?"},
    {"id": "career_sources", "text": "For job recommendations, should MyAgent ask to connect LinkedIn, CV, GitHub, or all three?"},
    {"id": "weekly_tasks", "text": "Which tasks do you repeat every week?"},
    {"id": "decisions", "text": "What decisions do you usually struggle with?"},
    {"id": "notifications", "text": "What notifications are important enough to interrupt you?"},
    {"id": "travel", "text": "Do you travel often, and should Guardian watch for disruptions?"},
]


def next_question(answers: list[OnboardingAnswer]) -> dict | None:
    answered = {answer.question_id for answer in answers}
    for question in BASE_QUESTIONS:
        if question["id"] not in answered:
            return question
    return None


def build_context_profile(answers: list[OnboardingAnswer]) -> dict:
    raw = {answer.question_id: answer.answer for answer in answers}
    return {
        "identity": {
            "name": raw.get("name"),
            "life_stage": raw.get("life_stage"),
            "role": raw.get("role"),
            "target_role": raw.get("target_role"),
            "industry": raw.get("industry"),
        },
        "goals": split_list(raw.get("goals", "")),
        "skills": split_list(raw.get("skills", "")),
        "skill_gaps": split_list(raw.get("skill_gaps", "")),
        "career_sources": split_list(raw.get("career_sources", "")),
        "recurring_tasks": split_list(raw.get("weekly_tasks", "")),
        "decision_support": split_list(raw.get("decisions", "")),
        "preferences": {
            "notification_style": raw.get("notifications", "important only"),
            "travel_monitoring": raw.get("travel", "ask me first"),
        },
    }


def split_list(value: str) -> list[str]:
    parts = value.replace("\n", ",").split(",")
    return [part.strip() for part in parts if part.strip()]
