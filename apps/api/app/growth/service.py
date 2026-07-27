from io import BytesIO
from datetime import datetime
from re import IGNORECASE, findall, search
from urllib.parse import urlencode
from xml.etree import ElementTree

import httpx

from app.growth.jobs import build_job_radar


def build_growth_plan(context: dict) -> dict:
    identity = context.get("identity", {})
    role = identity.get("target_role") or identity.get("role") or "AI software builder"
    industry = identity.get("industry") or "technology"
    life_stage = (identity.get("life_stage") or "builder").lower()
    github = context.get("github") or {}
    linkedin = context.get("linkedin") or {}
    gmail = context.get("gmail") or {}
    cv = context.get("cv") or {}
    github_languages = list((github.get("top_languages") or {}).keys())
    skills = merge_unique(context.get("skills") or [], github_languages) or ["problem solving", "communication"]
    skill_gaps = merge_unique(context.get("skill_gaps") or [], inferred_skill_gaps(skills, role)) or ["portfolio projects", "interview practice", "AI tooling"]

    track = "student" if "student" in life_stage else "professional"
    repos_scanned = github.get("repos_scanned") or github.get("public_repos") or 0
    strongest_language = github_languages[0] if github_languages else None
    important_emails = gmail.get("important_messages") or []
    career_emails = career_related_emails(important_emails)
    readiness = readiness_score(repos_scanned=repos_scanned, skills=skills, career_emails=career_emails, has_cv=bool(context.get("cv")), has_linkedin=bool(linkedin.get("sub")))
    source_status = {
        "github": "connected" if github.get("login") else "missing",
        "linkedin": "connected" if linkedin.get("sub") else "missing",
        "gmail": "connected" if gmail.get("email") else "missing",
        "cv": "connected" if context.get("cv") else "missing",
        "profile": "connected" if identity.get("name") and role else "partial",
    }

    return {
        "profile": {
            "track": track,
            "role": role,
            "industry": industry,
            "skills": skills,
            "skill_gaps": skill_gaps,
            "readiness_score": readiness,
            "source_status": source_status,
            "github": {
                "login": github.get("login"),
                "url": github.get("url"),
                "repos_scanned": repos_scanned,
                "top_languages": github.get("top_languages") or {},
            },
            "linkedin": {
                "name": linkedin.get("name"),
                "email": linkedin.get("email"),
                "picture": linkedin.get("picture"),
                "connected": bool(linkedin.get("sub")),
            },
            "gmail": {
                "email": gmail.get("email"),
                "important_count": gmail.get("important_count") or len(important_emails),
                "career_signals": career_emails[:3],
            },
            "cv": {
                "filename": cv.get("filename"),
                "role_guess": cv.get("role_guess"),
                "ats_score": cv.get("ats_score"),
                "detected_sections": cv.get("detected_sections") or [],
                "role_matches": cv.get("role_matches") or [],
                "missing_keywords": cv.get("missing_keywords") or [],
                "next_best_project": cv.get("next_best_project"),
                "summary": cv.get("summary"),
            } if cv else None,
        },
        "latest_studies": fetch_latest_studies(role=role, strongest_language=strongest_language, skills=skills, skill_gaps=skill_gaps)
        or fallback_studies(role=role, strongest_language=strongest_language, career_emails=career_emails, repos_scanned=repos_scanned),
        "job_recommendations": build_job_radar(
            role=role,
            industry=industry,
            track=track,
            skills=skills,
            skill_gaps=skill_gaps,
            strongest_language=strongest_language,
            repos_scanned=repos_scanned,
            career_emails=career_emails,
            cv=cv,
        ),
        "improvement_plan": [
            {
                "area": gap,
                "recommendation": f"Spend 3 focused sessions improving {gap}, then add evidence to your profile.",
            }
            for gap in skill_gaps[:4]
        ],
        "weekly_plan": build_weekly_plan(strongest_language, skill_gaps, career_emails),
        "source_insights": build_source_insights(source_status, repos_scanned, skills, important_emails, linkedin),
        "learning_resources": build_learning_resources(
            role=role,
            strongest_language=strongest_language,
            skills=skills,
            skill_gaps=skill_gaps,
            track=track,
        ),
    }


def merge_unique(first: list[str], second: list[str]) -> list[str]:
    seen = set()
    merged = []
    for item in first + second:
        normalized = item.strip()
        key = normalized.lower()
        if normalized and key not in seen:
            seen.add(key)
            merged.append(normalized)
    return merged[:12]


def github_match_reason(industry: str, repos_scanned: int, strongest_language: str | None) -> str:
    if repos_scanned and strongest_language:
        return f"Matches your {industry} direction and GitHub proof-of-work: {repos_scanned} repos scanned, strongest signal is {strongest_language}."
    return f"Matches your current field: {industry}."


def github_next_action(strongest_language: str | None) -> str:
    if strongest_language:
        return f"Polish one {strongest_language} project with README, screenshots, demo link, and clear impact."
    return "Ask MyAgent to compare your skills against this role."


def inferred_skill_gaps(skills: list[str], role: str) -> list[str]:
    normalized = {skill.lower() for skill in skills}
    gaps = []
    if "python" in normalized and not any(skill in normalized for skill in ["fastapi", "react", "typescript"]):
        gaps.append("full-stack AI demo delivery")
    if "ai" in role.lower() and not any(skill in normalized for skill in ["machine learning", "data analysis"]):
        gaps.append("machine learning fundamentals")
    gaps.extend(["portfolio polish", "interview storytelling"])
    return gaps


def career_related_emails(messages: list[dict]) -> list[dict]:
    keywords = ["internship", "interview", "meeting", "career", "linkedin", "recruiter", "job", "offer", "zoom"]
    career = []
    for message in messages:
        haystack = f"{message.get('subject') or ''} {message.get('from') or ''} {message.get('snippet') or ''}".lower()
        if any(keyword in haystack for keyword in keywords):
            career.append(
                {
                    "subject": message.get("subject"),
                    "from": message.get("from"),
                    "reason": "career, internship, meeting, or network signal",
                }
            )
    return career


def readiness_score(repos_scanned: int, skills: list[str], career_emails: list[dict], has_cv: bool, has_linkedin: bool = False) -> int:
    score = 25
    score += min(repos_scanned, 20)
    score += min(len(skills) * 5, 25)
    score += 15 if career_emails else 0
    score += 15 if has_cv else 0
    score += 5 if has_linkedin else 0
    return min(score, 100)


def normalize_role_title(role: str) -> str:
    if role.lower() == "ai":
        return "AI Software Builder"
    return role.title()


def internship_reason(career_emails: list[dict], repos_scanned: int) -> str:
    if career_emails:
        return f"Your Gmail has {len(career_emails)} career-related signal(s), so MyAgent should help prepare replies, follow-ups, and interview notes."
    return f"Your GitHub has {repos_scanned} repo signal(s). Add Gmail/CV evidence to improve internship matching."


def career_email_reason(career_emails: list[dict], track: str) -> str:
    if career_emails:
        return f"Suggested because Gmail contains career or meeting signals, and your track is {track}."
    return f"Suggested from your profile stage and {track} track."


def build_weekly_plan(strongest_language: str | None, skill_gaps: list[str], career_emails: list[dict]) -> list[dict]:
    language = strongest_language or "Python"
    plan = [
        {"day": "Day 1", "task": f"Pick one {language} project and rewrite its README for recruiters."},
        {"day": "Day 2", "task": f"Build one small AI feature that demonstrates {skill_gaps[0] if skill_gaps else 'practical skill'}."},
        {"day": "Day 3", "task": "Prepare a 60-second explanation of your strongest project."},
    ]
    if career_emails:
        plan.insert(0, {"day": "Today", "task": f"Reply or prepare for: {career_emails[0].get('subject') or 'career email'}."})
    return plan[:4]


def build_source_insights(source_status: dict, repos_scanned: int, skills: list[str], important_emails: list[dict], linkedin: dict | None = None) -> list[dict]:
    linkedin = linkedin or {}
    return [
        {"source": "GitHub", "status": source_status["github"], "insight": f"{repos_scanned} repositories scanned; skills inferred: {', '.join(skills[:4])}."},
        {"source": "LinkedIn", "status": source_status["linkedin"], "insight": linkedin_source_insight(source_status["linkedin"], linkedin)},
        {"source": "Gmail", "status": source_status["gmail"], "insight": f"{len(important_emails)} important message(s) available for career and follow-up signals."},
        {"source": "CV", "status": source_status["cv"], "insight": cv_source_insight(source_status["cv"], skills)},
    ]


def linkedin_source_insight(status: str, linkedin: dict) -> str:
    if status == "connected":
        name = linkedin.get("name") or "your LinkedIn identity"
        return f"{name} is connected through LinkedIn Sign In. Add headline/profile URL later for stronger career positioning."
    return "Connect LinkedIn to add a real professional identity signal to Growth."


def cv_source_insight(status: str, skills: list[str]) -> str:
    if status == "connected":
        return f"CV is connected; combined skills now include {', '.join(skills[:5])}."
    return "Upload or refresh your CV to improve role matching and skill gaps."


def build_learning_resources(role: str, strongest_language: str | None, skills: list[str], skill_gaps: list[str], track: str) -> dict:
    language = strongest_language or "Python"
    normalized_skills = {skill.lower() for skill in skills}
    wants_agents = "ai" in role.lower() or "agent" in " ".join(skill_gaps).lower()
    needs_ml = "machine learning" in " ".join(skill_gaps).lower() or "machine learning" not in normalized_skills

    courses = [
        {
            "title": "Hugging Face AI Agents Course",
            "provider": "Hugging Face",
            "level": "Beginner to intermediate",
            "duration": "Self-paced",
            "url": "https://huggingface.co/learn/agents-course/en/unit0/introduction",
            "why": "Directly matches MyAgent: agents, tools, LangGraph-style orchestration, agentic RAG, and a final agent project.",
            "priority": 96 if wants_agents else 86,
            "type": "course",
        },
        {
            "title": "Machine Learning Specialization",
            "provider": "DeepLearning.AI / Stanford Online on Coursera",
            "level": "Beginner",
            "duration": "About 2 months",
            "url": "https://www.coursera.org/specializations/machine-learning-introduction",
            "why": "Builds the ML foundation behind AI roles: supervised learning, neural networks, decision trees, recommender systems, evaluation, and Python tools.",
            "priority": 94 if needs_ml else 80,
            "type": "course",
        },
        {
            "title": "Agentic AI",
            "provider": "DeepLearning.AI",
            "level": "Intermediate",
            "duration": "About 7h45m",
            "url": "https://www.deeplearning.ai/courses/agentic-ai",
            "why": "Covers reflection, tool use, planning, multi-agent workflows, and evaluation. This maps tightly to your MyAgent architecture.",
            "priority": 92,
            "type": "course",
        },
        {
            "title": "Building AI Browser Agents",
            "provider": "DeepLearning.AI",
            "level": "Intermediate",
            "duration": "About 55m",
            "url": "https://www.deeplearning.ai/courses/building-ai-browser-agents",
            "why": "Useful later when MyAgent needs browser automation, forms, web tasks, and self-correction strategies.",
            "priority": 78,
            "type": "course",
        },
        {
            "title": "LangChain Deep Agents Course",
            "provider": "LangChain Academy",
            "level": "Intermediate",
            "duration": "Short course",
            "url": "https://academy.langchain.com/courses/foundation-introduction-to-deepagents",
            "why": "Good for long-running agents, tools, memory, human-in-the-loop, and subagent teams.",
            "priority": 86,
            "type": "course",
        },
    ]

    youtube = [
        {
            "title": f"{language} AI agents full project tutorial",
            "provider": "YouTube search",
            "level": "Project-based",
            "url": youtube_search_url(f"{language} AI agents full project tutorial LangGraph FastAPI Next.js"),
            "why": "Find a recent project tutorial and rebuild one feature inside MyAgent.",
            "priority": 91,
            "type": "youtube",
        },
        {
            "title": "LangGraph multi-agent tutorial",
            "provider": "YouTube search",
            "level": "Intermediate",
            "url": youtube_search_url("LangGraph multi agent tutorial memory tools human approval"),
            "why": "Directly supports your orchestration engine and agent collaboration page.",
            "priority": 90,
            "type": "youtube",
        },
        {
            "title": "RAG with FastAPI and vector database",
            "provider": "YouTube search",
            "level": "Project-based",
            "url": youtube_search_url("RAG FastAPI Qdrant PostgreSQL tutorial Python"),
            "why": "Helps improve MyAgent memory search across Gmail, GitHub, CV, and notes.",
            "priority": 84,
            "type": "youtube",
        },
    ]

    projects = [
        {
            "title": "MyAgent evaluation dashboard",
            "provider": "Portfolio project",
            "level": track,
            "url": "",
            "why": "Add tests that compare agent recommendations before and after Gmail/GitHub/CV context.",
            "priority": 95,
            "type": "project",
        },
        {
            "title": "Research-to-project generator",
            "provider": "Portfolio project",
            "level": track,
            "url": "",
            "why": "Turn one arXiv paper into a small implementation plan, tasks, and a GitHub README.",
            "priority": 88,
            "type": "project",
        },
    ]

    return {
        "courses": sorted(courses, key=lambda item: item["priority"], reverse=True)[:4],
        "youtube": sorted(youtube, key=lambda item: item["priority"], reverse=True),
        "projects": projects,
    }


def youtube_search_url(query: str) -> str:
    return f"https://www.youtube.com/results?{urlencode({'search_query': query})}"


def fetch_latest_studies(role: str, strongest_language: str | None, skills: list[str], skill_gaps: list[str]) -> list[dict]:
    query_terms = ["cat:cs.AI"]
    search_query = " OR ".join(query_terms)
    params = urlencode(
        {
            "search_query": search_query,
            "start": 0,
            "max_results": 2,
            "sortBy": "submittedDate",
            "sortOrder": "descending",
        }
    )
    url = f"https://export.arxiv.org/api/query?{params}"

    return request_arxiv(url, query_terms, role=role, skills=skills, skill_gaps=skill_gaps)


def request_arxiv(url: str, query_terms: list[str], role: str, skills: list[str], skill_gaps: list[str]) -> list[dict]:
    try:
        with httpx.Client(timeout=18, headers={"User-Agent": "MyAgent local hackathon demo"}) as client:
            response = client.get(url)
            response.raise_for_status()
    except httpx.HTTPError:
        return []

    return parse_arxiv_entries(response.text, query_terms, role=role, skills=skills, skill_gaps=skill_gaps)


def research_terms(role: str, strongest_language: str | None, skills: list[str]) -> list[str]:
    if "cyber" in role.lower():
        return ["cat:cs.CR"]
    if any(skill.lower() in {"react", "typescript", "next.js", "fastapi"} for skill in skills):
        return ["cat:cs.SE"]
    if strongest_language and strongest_language.lower() in {"python", "jupyter notebook"}:
        return ["cat:cs.AI"]
    return ["cat:cs.AI"]


def parse_arxiv_entries(xml_text: str, query_terms: list[str], role: str, skills: list[str], skill_gaps: list[str]) -> list[dict]:
    namespace = {"atom": "http://www.w3.org/2005/Atom"}
    root = ElementTree.fromstring(xml_text)
    studies = []
    for entry in root.findall("atom:entry", namespace):
        title = clean_text(entry.findtext("atom:title", default="", namespaces=namespace))
        summary = clean_text(entry.findtext("atom:summary", default="", namespaces=namespace))
        published = entry.findtext("atom:published", default="", namespaces=namespace)
        link = next(
            (node.attrib.get("href") for node in entry.findall("atom:link", namespace) if node.attrib.get("rel") == "alternate"),
            entry.findtext("atom:id", default="", namespaces=namespace),
        )
        authors = [
            clean_text(author.findtext("atom:name", default="", namespaces=namespace))
            for author in entry.findall("atom:author", namespace)[:3]
        ]
        if not title:
            continue
        relevance = study_relevance(title=title, summary=summary, role=role, skills=skills, skill_gaps=skill_gaps)
        studies.append(
            {
                "title": title,
                "why_it_matters": study_reason(title, summary),
                "summary": summary[:420],
                "published": format_published_date(published),
                "authors": [author for author in authors if author],
                "url": link,
                "source_name": "arXiv",
                "source_type": "live_arxiv",
                "query": ", ".join(query_terms),
                "relevance_score": relevance["score"],
                "tags": relevance["tags"],
                "takeaway": relevance["takeaway"],
                "project_idea": relevance["project_idea"],
                "career_move": relevance["career_move"],
            }
        )
    return sorted(studies, key=lambda item: item["relevance_score"], reverse=True)


def clean_text(value: str) -> str:
    return " ".join(value.split())


def format_published_date(value: str) -> str:
    if not value:
        return ""
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        return value[:10]


def study_reason(title: str, summary: str) -> str:
    haystack = f"{title} {summary}".lower()
    if "agent" in haystack:
        return "Useful because MyAgent is an agent platform; agent papers can inspire orchestration, tool use, and evaluation."
    if "retrieval" in haystack or "rag" in haystack:
        return "Useful because MyAgent memory and connectors need strong retrieval across user context."
    if "software" in haystack or "code" in haystack:
        return "Useful because your GitHub signal points toward AI software engineering and proof-of-work projects."
    return "Relevant to your AI learning path and weekly growth plan."


def study_relevance(title: str, summary: str, role: str, skills: list[str], skill_gaps: list[str]) -> dict:
    haystack = f"{title} {summary}".lower()
    tags = []
    score = 45

    tag_rules = [
        ("agents", ["agent", "tool use", "planning"]),
        ("rag", ["retrieval", "rag", "knowledge"]),
        ("vision", ["vision", "vlm", "image", "video", "3d"]),
        ("evaluation", ["benchmark", "evaluation", "reasoning"]),
        ("software", ["software", "code", "programming", "developer"]),
        ("learning", ["learning", "training", "model"]),
    ]
    for tag, keywords in tag_rules:
        if any(keyword in haystack for keyword in keywords):
            tags.append(tag)
            score += 8

    for skill in skills[:6]:
        if skill.lower() in haystack:
            score += 6
            tags.append(skill)

    for gap in skill_gaps[:4]:
        if any(part in haystack for part in gap.lower().split()):
            score += 4

    if "ai" in role.lower() or "software" in role.lower():
        score += 8

    tags = merge_unique(tags, [])[:5]
    return {
        "score": min(score, 98),
        "tags": tags or ["ai"],
        "takeaway": build_study_takeaway(tags, role),
        "project_idea": build_study_project(tags, skills),
        "career_move": build_study_career_move(tags, role),
    }


def build_study_takeaway(tags: list[str], role: str) -> str:
    if "agents" in tags:
        return "Look for orchestration, memory, tool-use, or evaluation ideas you can bring back into MyAgent."
    if "rag" in tags:
        return "Use this to improve how MyAgent retrieves context from Gmail, GitHub, CV, and memory."
    if "software" in tags:
        return f"Use this as evidence for your {normalize_role_title(role)} learning path."
    if "vision" in tags:
        return "This is not core to MyAgent yet, but it can inspire future multimodal features."
    return "Read the abstract and convert one useful idea into a portfolio improvement."


def build_study_project(tags: list[str], skills: list[str]) -> str:
    language = "Python" if any(skill.lower() == "python" for skill in skills) else (skills[0] if skills else "Python")
    if "agents" in tags:
        return f"Implement a small {language} experiment where two agents collaborate and log their decisions."
    if "rag" in tags:
        return f"Build a {language} retrieval demo over your CV, GitHub README files, and Gmail summaries."
    if "software" in tags:
        return "Add an evaluation page that scores MyAgent recommendations before and after connector data."
    return "Write a short project note: problem, paper idea, implementation plan, and demo screenshot."


def build_study_career_move(tags: list[str], role: str) -> str:
    if "agents" in tags or "rag" in tags:
        return "Mention this in interviews as a research-informed improvement to your agent SaaS project."
    if "evaluation" in tags:
        return "Use this to discuss testing and reliability, which makes junior AI projects look more mature."
    return f"Save one insight and connect it to your {normalize_role_title(role)} portfolio story."


def fallback_studies(role: str, strongest_language: str | None, career_emails: list[dict], repos_scanned: int) -> list[dict]:
    return [
        {
            "title": f"Live research feed unavailable: track AI agents for {strongest_language or 'Python'} builders",
            "why_it_matters": f"When arXiv is reachable, MyAgent will replace this with current papers. For now, focus on shipping a {strongest_language or 'Python'} AI agent project.",
            "source_type": "fallback",
            "source_name": "MyAgent fallback",
            "relevance_score": 70,
            "tags": ["agents", "portfolio"],
            "takeaway": "Use research ideas to make MyAgent feel more credible and less like a generic chatbot.",
            "project_idea": f"Build one {strongest_language or 'Python'} agent feature and write a short technical note.",
            "career_move": "Turn the feature into interview evidence.",
        },
        {
            "title": f"Internship readiness for {role}",
            "why_it_matters": internship_reason(career_emails, repos_scanned),
            "source_type": "gmail_github_profile",
            "source_name": "Profile signals",
            "relevance_score": 64,
            "tags": ["internship", "follow-up"],
            "takeaway": "Your connected signals suggest practical follow-up matters now.",
            "project_idea": "Prepare a concise project story and one email follow-up.",
            "career_move": "Reply to the most relevant career email and update your portfolio.",
        },
    ]


def analyze_cv(filename: str, content: bytes) -> dict:
    text = extract_pdf_text(content) if filename.lower().endswith(".pdf") else content.decode("utf-8", errors="ignore")
    normalized = " ".join(text.split())
    skills = extract_skills(normalized)
    sections = detect_sections(normalized)
    role_guess = guess_role(normalized, skills)
    improvements = build_cv_improvements(skills=skills, sections=sections, role_guess=role_guess)
    role_matches = build_role_matches(skills, role_guess)
    ats_score = calculate_cv_score(skills, sections, improvements)

    return {
        "filename": filename,
        "role_guess": role_guess,
        "detected_skills": skills,
        "detected_sections": sections,
        "strengths": build_strengths(skills, sections),
        "improvements": improvements,
        "role_matches": role_matches,
        "missing_keywords": missing_keywords(skills, role_guess),
        "ats_score": ats_score,
        "next_best_project": next_best_project(skills, role_guess),
        "summary": build_cv_summary(role_guess, skills, sections),
        "privacy": "The MVP analyzes the uploaded file in memory and does not store it.",
    }


def extract_pdf_text(content: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise RuntimeError("pypdf is required for PDF parsing. Install backend requirements.") from exc

    reader = PdfReader(BytesIO(content))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages)


def extract_skills(text: str) -> list[str]:
    known_skills = [
        "python",
        "javascript",
        "typescript",
        "react",
        "next.js",
        "fastapi",
        "sql",
        "postgresql",
        "docker",
        "git",
        "github",
        "machine learning",
        "ai",
        "data analysis",
        "cybersecurity",
        "cloud",
        "aws",
        "azure",
        "communication",
        "leadership",
        "project management",
    ]
    found = []
    for skill in known_skills:
        if search(rf"\b{skill.replace('.', r'\.')}\b", text, IGNORECASE):
            found.append(skill.title() if skill != "ai" else "AI")
    return found[:12]


def detect_sections(text: str) -> list[str]:
    section_names = ["education", "experience", "projects", "skills", "certifications", "languages", "achievements"]
    return [section.title() for section in section_names if search(rf"\b{section}\b", text, IGNORECASE)]


def guess_role(text: str, skills: list[str]) -> str:
    if search(r"\b(student|university|college|bachelor|degree)\b", text, IGNORECASE):
        if any(skill in skills for skill in ["Python", "React", "Typescript", "Fastapi", "AI"]):
            return "Student aiming for software or AI roles"
        return "Student or early-career candidate"
    if any(skill in skills for skill in ["React", "Next.Js", "Fastapi", "Python", "Typescript"]):
        return "Full-stack software candidate"
    if any(skill in skills for skill in ["Machine Learning", "AI", "Data Analysis"]):
        return "AI or data candidate"
    return "Career candidate"


def build_strengths(skills: list[str], sections: list[str]) -> list[str]:
    strengths = []
    if skills:
        strengths.append(f"Clear technical signal from skills such as {', '.join(skills[:4])}.")
    if "Projects" in sections:
        strengths.append("Project section can support proof-of-work for job applications.")
    if "Education" in sections:
        strengths.append("Education section helps MyAgent recommend student or graduate opportunities.")
    return strengths or ["The CV gives MyAgent a starting point for career recommendations."]


def build_cv_improvements(skills: list[str], sections: list[str], role_guess: str) -> list[str]:
    improvements = []
    if "Projects" not in sections:
        improvements.append("Add a Projects section with links, impact, technologies, and what you personally built.")
    if "Skills" not in sections:
        improvements.append("Add a Skills section grouped by languages, frameworks, tools, and soft skills.")
    if "GitHub" not in skills:
        improvements.append("Add GitHub links for strong projects so MyAgent can evaluate proof-of-work.")
    improvements.append(f"Tailor the top summary toward: {role_guess}.")
    improvements.append("Add measurable outcomes, such as users, speed improvements, grades, awards, or shipped features.")
    return improvements[:5]


def build_cv_summary(role_guess: str, skills: list[str], sections: list[str]) -> str:
    skill_text = ", ".join(skills[:5]) if skills else "not enough explicit skills detected yet"
    section_text = ", ".join(sections) if sections else "no standard sections detected"
    return f"MyAgent reads this as: {role_guess}. Detected skills: {skill_text}. Detected sections: {section_text}."


def calculate_cv_score(skills: list[str], sections: list[str], improvements: list[str]) -> int:
    score = 35
    score += min(len(skills) * 4, 28)
    score += min(len(sections) * 5, 25)
    score -= min(len(improvements) * 3, 18)
    if "Projects" in sections:
        score += 8
    if "Experience" in sections:
        score += 8
    return max(20, min(score, 100))


def build_role_matches(skills: list[str], role_guess: str) -> list[dict]:
    normalized = {skill.lower() for skill in skills}
    roles = [
        ("AI Software Intern", {"python", "ai", "github", "fastapi", "react"}),
        ("Junior Backend Engineer", {"python", "fastapi", "sql", "postgresql", "docker"}),
        ("Data / ML Intern", {"python", "machine learning", "data analysis", "jupyter notebook"}),
        ("Full-stack AI Builder", {"python", "typescript", "react", "next.js", "fastapi"}),
    ]
    matches = []
    for title, required in roles:
        overlap = sorted(required.intersection(normalized))
        score = int((len(overlap) / len(required)) * 100)
        if title.lower() in role_guess.lower():
            score = min(score + 15, 100)
        matches.append(
            {
                "title": title,
                "score": score,
                "matched": [skill.title() if skill != "ai" else "AI" for skill in overlap],
                "missing": [skill.title() if skill != "ai" else "AI" for skill in sorted(required - normalized)[:4]],
            }
        )
    return sorted(matches, key=lambda item: item["score"], reverse=True)[:3]


def missing_keywords(skills: list[str], role_guess: str) -> list[str]:
    normalized = {skill.lower() for skill in skills}
    target = ["Python", "FastAPI", "React", "TypeScript", "SQL", "Docker", "Machine Learning", "GitHub"]
    if "data" in role_guess.lower() or "ai" in role_guess.lower():
        target.extend(["Data Analysis", "Jupyter Notebook", "Model Evaluation"])
    return [keyword for keyword in target if keyword.lower() not in normalized][:8]


def next_best_project(skills: list[str], role_guess: str) -> str:
    normalized = {skill.lower() for skill in skills}
    if "python" in normalized and ("ai" in role_guess.lower() or "software" in role_guess.lower()):
        return "Build a small AI agent dashboard with FastAPI, Next.js, Gmail/GitHub connectors, and a polished README."
    if "data analysis" in normalized or "jupyter notebook" in normalized:
        return "Publish a notebook-to-dashboard project that turns a dataset into clear decisions and visuals."
    return "Ship one end-to-end project with screenshots, live demo, problem statement, and measurable impact."
