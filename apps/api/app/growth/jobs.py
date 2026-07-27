from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlencode
from uuid import uuid4

from app.activity.store import create_activity_from_trace
from app.profile.store import read_profile, write_profile


ACTIVE_STATUSES = {"saved", "preparing", "applied"}


def build_job_radar(
    role: str,
    industry: str,
    track: str,
    skills: list[str],
    skill_gaps: list[str],
    strongest_language: str | None,
    repos_scanned: int,
    career_emails: list[dict],
    cv: dict | None,
) -> list[dict[str, Any]]:
    language = strongest_language or "Python"
    role_matches = (cv or {}).get("role_matches") or []
    missing_keywords = (cv or {}).get("missing_keywords") or skill_gaps
    base_roles = [
        {
            "title": "AI Software Intern" if track == "student" else "AI Software Engineer",
            "company_type": "AI SaaS startup",
            "location": "Remote or hybrid",
            "required_skills": ["Python", "FastAPI", "React", "GitHub", "AI agents"],
            "source": "Profile + GitHub + CV",
        },
        {
            "title": "Junior Backend Engineer",
            "company_type": "Product engineering team",
            "location": "Cairo, Giza, or remote",
            "required_skills": ["Python", "FastAPI", "SQL", "Docker", "APIs"],
            "source": "GitHub languages",
        },
        {
            "title": "Data / ML Intern" if track == "student" else "Machine Learning Engineer",
            "company_type": f"{industry.title()} analytics team",
            "location": "Remote or local internship",
            "required_skills": ["Python", "Machine Learning", "Data Analysis", "Jupyter Notebook", "Model Evaluation"],
            "source": "CV skill gaps",
        },
    ]

    if role_matches:
        for match in role_matches[:2]:
            base_roles.append(
                {
                    "title": match.get("title") or role,
                    "company_type": "CV-matched role",
                    "location": "Search locally and remote",
                    "required_skills": (match.get("matched") or []) + (match.get("missing") or []),
                    "source": "CV analyzer",
                }
            )

    jobs = []
    normalized_skills = {skill.lower() for skill in skills}
    for index, job in enumerate(base_roles):
        required = job["required_skills"]
        matched = [skill for skill in required if skill.lower() in normalized_skills or skill.lower() == language.lower()]
        missing = clean_skill_terms([skill for skill in required if skill not in matched])
        score = 48 + min(len(matched) * 9, 30) + min(repos_scanned, 12)
        if career_emails:
            score += 5
        if cv:
            score += 8
        if index == 0 and ("ai" in role.lower() or "software" in role.lower()):
            score += 6
        score = min(score, 96)

        query = f"{job['title']} {language} {'internship' if track == 'student' else 'job'}"
        jobs.append(
            {
                "id": job_key(job["title"], job["company_type"], job["location"]),
                "title": job["title"],
                "company_type": job["company_type"],
                "location": job["location"],
                "source": job["source"],
                "match_score": score,
                "matched_skills": matched[:6],
                "missing_skills": clean_skill_terms(missing + missing_keywords)[:6],
                "why": job_reason(job["title"], language, repos_scanned, career_emails, cv),
                "apply_prep": build_apply_prep(job["title"], language, missing, skill_gaps),
                "talking_points": build_talking_points(language, repos_scanned, skills),
                "cover_email": build_cover_email(job["title"], language),
                "search_links": {
                    "linkedin": external_search("https://www.linkedin.com/jobs/search/", {"keywords": query}),
                    "google": f"https://www.google.com/search?{urlencode({'q': query})}",
                },
                "next_action": f"Open a search link, choose one real posting, then ask MyAgent to tailor your CV for {job['title']}.",
            }
        )

    return sorted(unique_jobs(jobs), key=lambda item: item["match_score"], reverse=True)[:4]


def read_job_items() -> list[dict[str, Any]]:
    return sorted(read_profile().get("jobs") or [], key=lambda item: item.get("updated_at") or "", reverse=True)


def track_job(job: dict[str, Any]) -> dict[str, Any]:
    profile = read_profile()
    items = profile.get("jobs") or []
    now = datetime.now(UTC).isoformat()
    key = job_key(job.get("title"), job.get("company_type"), job.get("location"))

    for item in items:
        if item.get("job_key") == key:
            item["updated_at"] = now
            item["status"] = item.get("status") or "saved"
            item["job"] = job
            saved = item
            break
    else:
        saved = {
            "id": str(uuid4()),
            "job_key": key,
            "status": "saved",
            "job": job,
            "created_at": now,
            "updated_at": now,
        }
        items.append(saved)

    write_profile({"jobs": items})
    create_job_activity(saved)
    return saved


def update_job_status(item_id: str, status: str) -> dict[str, Any] | None:
    profile = read_profile()
    items = profile.get("jobs") or []
    now = datetime.now(UTC).isoformat()
    for item in items:
        if item.get("id") == item_id:
            item["status"] = status
            item["updated_at"] = now
            write_profile({"jobs": items})
            return item
    return None


def job_tasks() -> list[dict[str, Any]]:
    tasks = []
    for item in read_job_items():
        if item.get("status") not in ACTIVE_STATUSES:
            continue
        job = item.get("job") or {}
        prep = job.get("apply_prep") or []
        tasks.append(
            {
                "id": item.get("id"),
                "title": job.get("title") or "Tracked job",
                "company_type": job.get("company_type") or "Target company",
                "status": item.get("status") or "saved",
                "match_score": job.get("match_score") or 70,
                "next_step": prep[0] if prep else "Choose one real posting and tailor your CV.",
                "apply_prep": prep,
                "talking_points": job.get("talking_points") or [],
                "cover_email": job.get("cover_email") or "",
                "search_links": job.get("search_links") or {},
            }
        )
    return sorted(tasks, key=lambda item: item.get("match_score") or 0, reverse=True)


def create_job_activity(item: dict[str, Any]) -> None:
    job = item.get("job") or {}
    title = job.get("title") or "job"
    create_activity_from_trace(
        {
            "command": f"Track job target: {title}",
            "intent": "job_application",
            "situation": {
                "type": "career_job_match",
                "title": "Job target tracked",
                "description": "MyAgent converted a job match into application prep tasks.",
                "severity": "low",
            },
            "recommendation": {
                "title": f"Prepare application for {title}",
                "rationale": job.get("why") or "This role matches current profile signals.",
                "confidence": min((job.get("match_score") or 75) / 100, 0.98),
                "primary_action_type": "track_job",
            },
            "actions": [
                {"type": "save_to_memory", "payload": {"destination": "jobs", "job_id": item.get("id")}},
                {"type": "create_apply_prep", "payload": {"steps": len(job.get("apply_prep") or [])}},
                {"type": "add_to_tasks", "payload": {"status": item.get("status")}},
            ],
            "guardian": {
                "decision": "allow",
                "risk_level": "low",
                "approval_required": False,
                "reason": "Tracking a job only saves local application prep. MyAgent will not apply or message recruiters without approval.",
            },
            "agent_messages": [
                {
                    "agent": "career_agent",
                    "role": "Career matcher",
                    "summary": "Matched the job target against role, track, CV, GitHub languages, and Gmail career signals.",
                    "depends_on": [],
                    "data": {"match_score": job.get("match_score")},
                },
                {
                    "agent": "github_agent",
                    "role": "Proof-of-work reviewer",
                    "summary": "Checked project and language signals that can support the application story.",
                    "depends_on": ["career_agent"],
                    "data": {"matched_skills": job.get("matched_skills") or []},
                },
                {
                    "agent": "cv_agent",
                    "role": "Resume optimizer",
                    "summary": "Prepared missing keywords and CV improvements for this target role.",
                    "depends_on": ["career_agent"],
                    "data": {"missing_skills": job.get("missing_skills") or []},
                },
                {
                    "agent": "planning_agent",
                    "role": "Application planner",
                    "summary": "Turned the match into prep steps, talking points, and a short outreach draft.",
                    "depends_on": ["github_agent", "cv_agent"],
                    "data": {"steps": len(job.get("apply_prep") or [])},
                },
                {
                    "agent": "guardian_agent",
                    "role": "Approval reviewer",
                    "summary": "Allowed save-only tracking and blocked any external application action until user approval.",
                    "depends_on": ["planning_agent"],
                    "data": {"approval_required": False},
                },
            ],
        }
    )


def build_apply_prep(title: str, language: str, missing: list[str], skill_gaps: list[str]) -> list[str]:
    gaps = clean_skill_terms(missing + skill_gaps)[:3]
    return [
        f"Tailor your CV summary toward {title}.",
        f"Pick one {language} project and add impact, screenshots, and a short demo explanation.",
        f"Add keywords: {', '.join(gaps) if gaps else 'APIs, testing, deployment, teamwork'}.",
        "Prepare a 60-second story: problem, what you built, result, and what you learned.",
    ]


def build_talking_points(language: str, repos_scanned: int, skills: list[str]) -> list[str]:
    return [
        f"I have proof-of-work in {language} from {repos_scanned} GitHub repository signal(s).",
        f"My current strongest skills are {', '.join(skills[:4]) if skills else language}.",
        "I am building MyAgent as an end-to-end SaaS with agents, memory, connectors, approvals, and a polished UI.",
    ]


def build_cover_email(title: str, language: str) -> str:
    return (
        f"Hi,\n\n"
        f"I am interested in the {title} role. I am building MyAgent, an AI SaaS platform with agent orchestration, memory, "
        f"connectors, approval workflows, and a full-stack {language} delivery path.\n\n"
        "I would be happy to share the project and explain what I built.\n\n"
        "Best,"
    )


def job_reason(title: str, language: str, repos_scanned: int, career_emails: list[dict], cv: dict | None) -> str:
    parts = [f"Matches your {language} proof-of-work and current {title} direction."]
    if repos_scanned:
        parts.append(f"GitHub has {repos_scanned} repository signal(s).")
    if cv:
        parts.append("CV analysis is available for keyword matching.")
    if career_emails:
        parts.append("Gmail has career or meeting signals that can support follow-up prep.")
    return " ".join(parts)


def external_search(base_url: str, params: dict[str, str]) -> str:
    return f"{base_url}?{urlencode(params)}"


def job_key(title: Any, company_type: Any, location: Any) -> str:
    return "|".join(str(part or "").strip().lower() for part in [title, company_type, location])


def unique_jobs(jobs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen = set()
    unique = []
    for job in jobs:
        if job["id"] in seen:
            continue
        seen.add(job["id"])
        unique.append(job)
    return unique


def clean_skill_terms(values: list[str]) -> list[str]:
    cleaned = []
    seen = set()
    for value in values:
        text = str(value or "").strip().strip(".")
        if not text or len(text) > 32:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(text)
    return cleaned
