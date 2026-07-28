from datetime import UTC, date, datetime
from typing import Any
from urllib.parse import urlencode
from uuid import uuid4

from app.activity.store import create_activity_from_trace
from app.approvals.store import create_approval_from_trace
from app.profile.store import profile_to_context, read_profile, write_profile


ACTIVE_STATUSES = {"saved", "preparing", "applied", "interview", "offer"}


def search_jobs(query: str, location: str | None = None) -> dict[str, Any]:
    profile = read_profile()
    context = profile_to_context(profile)
    identity = context.get("identity") or {}
    github = context.get("github") or {}
    gmail = context.get("gmail") or {}
    linkedin = context.get("linkedin") or {}
    cv = context.get("cv") or {}
    skills = context.get("skills") or []
    github_languages = list((github.get("top_languages") or {}).keys())
    strongest_language = github_languages[0] if github_languages else (skills[0] if skills else "Python")
    career_emails = career_related_messages(gmail.get("important_messages") or [])
    target_role = linkedin.get("target_role") or identity.get("target_role") or query or "AI internship"
    search_location = location or preferred_location(profile, linkedin)
    normalized_query = query.strip() or f"{target_role} internship"

    templates = [
        {
            "title": normalize_search_title(normalized_query, target_role),
            "company_type": "Open internship search",
            "location": search_location,
            "source": "LinkedIn + Google + Indeed + Wellfound",
            "required_skills": infer_required_skills(normalized_query, strongest_language),
        },
        {
            "title": "AI Software Engineering Intern",
            "company_type": "AI product team",
            "location": search_location,
            "source": "Profile + LinkedIn + CV",
            "required_skills": ["Python", "FastAPI", "React", "TypeScript", "AI Agents"],
        },
        {
            "title": "Full-Stack AI Intern",
            "company_type": "SaaS startup",
            "location": search_location,
            "source": "MyAgent project fit",
            "required_skills": ["Python", "Next.js", "React", "PostgreSQL", "Docker"],
        },
        {
            "title": "Machine Learning Intern",
            "company_type": "Data or ML team",
            "location": search_location,
            "source": "CV skill gap search",
            "required_skills": ["Python", "Machine Learning", "Jupyter Notebook", "Model Evaluation"],
        },
    ]

    results = []
    normalized_skills = {skill.lower() for skill in skills}
    for index, template in enumerate(templates):
        required = template["required_skills"]
        matched = [skill for skill in required if skill.lower() in normalized_skills or skill.lower() == str(strongest_language).lower()]
        missing = clean_skill_terms([skill for skill in required if skill not in matched] + (context.get("skill_gaps") or []))
        score = 50 + min(len(matched) * 8, 32) + min(github.get("repos_scanned") or 0, 10)
        if linkedin.get("headline") or linkedin.get("about"):
            score += 6
        if cv:
            score += 6
        if career_emails:
            score += 4
        if index == 0:
            score += 3
        score = min(score, 98)
        search_text = build_search_text(template["title"], normalized_query, search_location, skills)
        results.append(
            {
                "id": job_key(template["title"], template["company_type"], template["location"]),
                "title": template["title"],
                "company_type": template["company_type"],
                "location": template["location"],
                "source": template["source"],
                "match_score": score,
                "matched_skills": matched[:6],
                "missing_skills": missing[:6],
                "why": job_search_reason(template["title"], strongest_language, github.get("repos_scanned") or 0, linkedin, cv, career_emails),
                "apply_prep": build_apply_prep(template["title"], strongest_language, missing, context.get("skill_gaps") or []),
                "talking_points": build_talking_points(strongest_language, github.get("repos_scanned") or 0, skills),
                "cover_email": build_cover_email(template["title"], strongest_language),
                "search_links": build_job_search_links(search_text, search_location),
                "next_action": f"Open LinkedIn or Google Jobs, choose one real posting, then track it for {template['title']} prep.",
            }
        )

    return {
        "query": normalized_query,
        "location": search_location,
        "profile": {
            "target_role": target_role,
            "linkedin_ready": bool(linkedin.get("headline") and linkedin.get("skills")),
            "skills": skills[:10],
            "strongest_language": strongest_language,
        },
        "results": sorted(unique_jobs(results), key=lambda item: item["match_score"], reverse=True),
    }


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


def build_job_search_links(query: str, location: str) -> dict[str, str]:
    google_query = f"{query} {location}".strip()
    return {
        "linkedin": external_search("https://www.linkedin.com/jobs/search/", {"keywords": query, "location": location}),
        "google": f"https://www.google.com/search?{urlencode({'q': google_query + ' jobs internships'})}",
        "indeed": external_search("https://www.indeed.com/jobs", {"q": query, "l": location}),
        "wellfound": f"https://wellfound.com/jobs?{urlencode({'query': query})}",
        "yc": f"https://www.ycombinator.com/jobs?{urlencode({'query': query})}",
    }


def build_search_text(title: str, query: str, location: str, skills: list[str]) -> str:
    important_skills = " ".join(skills[:4])
    return f"{title} {query} {important_skills} internship".strip()


def infer_required_skills(query: str, strongest_language: str) -> list[str]:
    lowered = query.lower()
    skills = [strongest_language, "GitHub"]
    if "ai" in lowered or "agent" in lowered:
        skills.extend(["AI Agents", "FastAPI", "React"])
    if "backend" in lowered:
        skills.extend(["FastAPI", "SQL", "Docker"])
    if "full" in lowered or "react" in lowered:
        skills.extend(["React", "TypeScript", "Next.js"])
    if "data" in lowered or "ml" in lowered or "machine" in lowered:
        skills.extend(["Machine Learning", "Jupyter Notebook", "Model Evaluation"])
    return clean_skill_terms(skills)[:6]


def normalize_search_title(query: str, target_role: str) -> str:
    lowered = query.lower()
    if "intern" in lowered:
        return target_role if "intern" in target_role.lower() else f"{target_role} Intern"
    return query.title()


def preferred_location(profile: dict[str, Any], linkedin: dict[str, Any]) -> str:
    text = " ".join(str(value or "") for value in [profile.get("city"), linkedin.get("about"), linkedin.get("headline")]).lower()
    if "berlin" in text:
        return "Berlin or remote"
    if "egypt" in text or "cairo" in text:
        return "Egypt or remote"
    return profile.get("city") or "Remote"


def career_related_messages(messages: list[dict]) -> list[dict]:
    keywords = ["internship", "interview", "career", "job", "offer", "recruiter", "linkedin"]
    results = []
    for message in messages:
        haystack = f"{message.get('subject') or ''} {message.get('from') or ''} {message.get('snippet') or ''}".lower()
        if any(keyword in haystack for keyword in keywords):
            results.append(message)
    return results[:5]


def job_search_reason(title: str, language: str, repos_scanned: int, linkedin: dict, cv: dict | None, career_emails: list[dict]) -> str:
    parts = [f"Matched to {title} using your {language} proof-of-work."]
    if linkedin.get("headline") or linkedin.get("target_role"):
        parts.append("LinkedIn details clarify your target direction.")
    if repos_scanned:
        parts.append(f"GitHub adds {repos_scanned} repository signal(s).")
    if cv:
        parts.append("CV analysis adds skills and missing keyword context.")
    if career_emails:
        parts.append("Gmail contains internship/career signals for follow-up prep.")
    return " ".join(parts)


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


def update_job_details(item_id: str, details: dict[str, Any]) -> dict[str, Any] | None:
    allowed = {"company_name", "job_url", "recruiter_email", "follow_up_at", "notes"}
    profile = read_profile()
    items = profile.get("jobs") or []
    now = datetime.now(UTC).isoformat()
    for item in items:
        if item.get("id") == item_id:
            for key, value in details.items():
                if key in allowed:
                    item[key] = str(value or "").strip()
            item["updated_at"] = now
            write_profile({"jobs": items})
            return item
    return None


def create_job_outreach_approval(item_id: str, recipient: str | None = None) -> dict[str, Any] | None:
    item = next((job_item for job_item in read_job_items() if job_item.get("id") == item_id), None)
    if not item:
        return None

    job = item.get("job") or {}
    title = job.get("title") or "target role"
    company_type = job.get("company_type") or "target company"
    cover_email = job.get("cover_email") or build_cover_email(title, "Python")
    subject = f"Application interest: {title}"
    trace = {
        "command": f"Prepare outreach for tracked job: {title}",
        "intent": "job_application_outreach",
        "situation": {
            "type": "job_application",
            "title": "Application outreach prepared",
            "description": f"MyAgent prepared a recruiter email draft for {title}.",
            "severity": "medium",
        },
        "recommendation": {
            "title": f"Review outreach draft for {title}",
            "rationale": "Career Agent, CV Agent, GitHub Agent, and Guardian prepared an application message. Nothing is sent without approval.",
            "confidence": min((job.get("match_score") or 78) / 100, 0.96),
            "primary_action_type": "send_email",
        },
        "actions": [
            {
                "type": "draft_email",
                "payload": {
                    "to": recipient or item.get("recruiter_email") or "",
                    "subject": subject,
                    "body": cover_email,
                    "request": f"Apply or introduce Jack for {title} at {company_type}.",
                    "snippet": job.get("why") or "Tracked from MyAgent Job Search Agent.",
                    "job_id": item_id,
                    "job_title": title,
                    "company_type": company_type,
                },
            },
            {"type": "request_approval", "payload": {"reason": "Job outreach communicates on your behalf"}},
        ],
        "guardian": {
            "decision": "require_approval",
            "risk_level": "medium",
            "approval_required": True,
            "reason": "Sending or drafting outreach through Gmail affects an external communication channel.",
        },
        "agent_messages": [
            {
                "agent": "career_agent",
                "role": "Career matcher",
                "summary": "Selected the tracked role and converted it into an application outreach plan.",
                "depends_on": [],
                "data": {"job_id": item_id, "match_score": job.get("match_score")},
            },
            {
                "agent": "github_agent",
                "role": "Proof-of-work reviewer",
                "summary": "Added project and skill proof to the outreach angle.",
                "depends_on": ["career_agent"],
                "data": {"matched_skills": job.get("matched_skills") or []},
            },
            {
                "agent": "cv_agent",
                "role": "Resume optimizer",
                "summary": "Checked missing keywords and suggested what to emphasize before sending.",
                "depends_on": ["career_agent"],
                "data": {"missing_skills": job.get("missing_skills") or []},
            },
            {
                "agent": "guardian_agent",
                "role": "Approval reviewer",
                "summary": "Required user review before Gmail creates the draft.",
                "depends_on": ["career_agent", "github_agent", "cv_agent"],
                "data": {"approval_required": True},
            },
        ],
    }
    approval = create_approval_from_trace(trace)
    if approval:
        create_activity_from_trace({**trace, "approval": {"id": approval["id"], "status": approval["status"], "created_at": approval["created_at"]}})
    return approval


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
                "company_name": item.get("company_name") or "",
                "job_url": item.get("job_url") or "",
                "recruiter_email": item.get("recruiter_email") or "",
                "follow_up_at": item.get("follow_up_at") or "",
                "notes": item.get("notes") or "",
            }
        )
    return sorted(tasks, key=lambda item: item.get("match_score") or 0, reverse=True)


def application_followups() -> list[dict[str, Any]]:
    today = datetime.now(UTC).date()
    followups: list[dict[str, Any]] = []
    for item in read_job_items():
        job = item.get("job") or {}
        status = item.get("status") or "saved"
        title = job.get("title") or "tracked job"
        company = item.get("company_name") or job.get("company_type") or "target company"
        follow_up_at = parse_follow_up_date(item.get("follow_up_at"))
        days_since_update = days_between(parse_iso_date(item.get("updated_at")), today)

        if status == "applied" and follow_up_at and follow_up_at <= today:
            followups.append(
                {
                    "id": f"{item.get('id')}:followup-due",
                    "title": f"Follow up on {title}",
                    "body": f"Your follow-up date for {company} is today or overdue. MyAgent can draft a polite recruiter follow-up with Guardian approval.",
                    "priority": "high",
                    "action_label": "Open tasks",
                    "action_href": "/tasks",
                    "created_at": item.get("updated_at"),
                    "metadata": {"id": item.get("id"), "status": status, "follow_up_at": item.get("follow_up_at")},
                }
            )
        elif status == "applied" and not follow_up_at:
            followups.append(
                {
                    "id": f"{item.get('id')}:missing-followup",
                    "title": f"Set follow-up for {title}",
                    "body": f"{company} is marked applied, but there is no follow-up date. Add one so MyAgent can remind you.",
                    "priority": "medium",
                    "action_label": "Open tracker",
                    "action_href": "/tasks",
                    "created_at": item.get("updated_at"),
                    "metadata": {"id": item.get("id"), "status": status},
                }
            )
        elif status == "interview":
            followups.append(
                {
                    "id": f"{item.get('id')}:interview-prep",
                    "title": f"Prepare interview for {title}",
                    "body": "Interview stage detected. Review talking points, project proof, and questions to ask before the call.",
                    "priority": "high",
                    "action_label": "Open prep",
                    "action_href": "/tasks",
                    "created_at": item.get("updated_at"),
                    "metadata": {"id": item.get("id"), "status": status},
                }
            )
        elif status == "offer":
            followups.append(
                {
                    "id": f"{item.get('id')}:offer-decision",
                    "title": f"Review offer for {title}",
                    "body": "Offer stage detected. MyAgent should help compare learning value, location, timing, pay, and long-term career fit.",
                    "priority": "high",
                    "action_label": "Open tracker",
                    "action_href": "/tasks",
                    "created_at": item.get("updated_at"),
                    "metadata": {"id": item.get("id"), "status": status},
                }
            )
        elif status == "rejected":
            followups.append(
                {
                    "id": f"{item.get('id')}:rejection-learning",
                    "title": f"Extract learning from {title}",
                    "body": "This role is archived. Save what was missing and turn it into one Growth learning task.",
                    "priority": "low",
                    "action_label": "Open growth",
                    "action_href": "/growth",
                    "created_at": item.get("updated_at"),
                    "metadata": {"id": item.get("id"), "status": status},
                }
            )
        elif status == "preparing" and days_since_update is not None and days_since_update >= 3:
            followups.append(
                {
                    "id": f"{item.get('id')}:stale-prep",
                    "title": f"Finish application prep for {title}",
                    "body": "This application has been in preparing for a few days. Either draft outreach, apply, or archive it.",
                    "priority": "medium",
                    "action_label": "Open tasks",
                    "action_href": "/tasks",
                    "created_at": item.get("updated_at"),
                    "metadata": {"id": item.get("id"), "status": status},
                }
            )

    return followups


def parse_follow_up_date(value: Any) -> date | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text[:10])
    except ValueError:
        return None


def parse_iso_date(value: Any) -> date | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date()
    except ValueError:
        return None


def days_between(start: date | None, end: date) -> int | None:
    if not start:
        return None
    return (end - start).days


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
