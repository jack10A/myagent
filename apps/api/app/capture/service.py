from __future__ import annotations

import re
import xml.etree.ElementTree as ET
import json
from collections import Counter
from datetime import UTC, datetime
from html import unescape
from typing import Any
from uuid import uuid4

import httpx
from youtube_transcript_api import YouTubeTranscriptApi

from app.guardian.schemas import GuardianReviewRequest
from app.guardian.service import review_action
from app.profile.store import read_profile, write_profile

STOP_WORDS = {
    "about",
    "after",
    "again",
    "also",
    "because",
    "before",
    "between",
    "could",
    "from",
    "have",
    "into",
    "just",
    "like",
    "more",
    "need",
    "should",
    "that",
    "their",
    "there",
    "this",
    "what",
    "when",
    "where",
    "which",
    "with",
    "would",
    "your",
}


def analyze_capture(payload) -> dict[str, Any]:
    transcript = normalize_text(payload.transcript)
    fetched_transcript = False
    if payload.capture_type == "youtube" and not transcript and payload.source_url:
        transcript = fetch_youtube_transcript(payload.source_url) or ""
        fetched_transcript = bool(transcript)
    if payload.capture_type == "youtube" and not transcript:
        return build_missing_youtube_transcript_result(payload)

    if payload.capture_type == "meeting" and not payload.consent_confirmed:
        guardian = review_action(
            GuardianReviewRequest(
                action_type="record_meeting",
                payload={"title": payload.title, "reason": "Meeting capture requires consent confirmation."},
            )
        )
        return {
            "capture_type": payload.capture_type,
            "title": payload.title or "Meeting capture",
            "source_url": payload.source_url,
            "transcript_text": None,
            "summary": "Guardian needs confirmation that recording or storing this meeting is allowed.",
            "short_summary": "Consent is required before saving this meeting.",
            "important_points": ["Ask participants for permission before recording or storing meeting content."],
            "action_items": ["Confirm consent, then run the capture again."],
            "decisions": [],
            "people": [],
            "questions_to_ask": ["Did everyone consent to recording or storing the meeting content?"],
            "answer": None,
            "relevant_parts": [],
            "next_tasks": ["Get consent, paste the transcript again, then save the meeting memory."],
            "source_kind": "meeting",
            "draft_follow_up": "I will summarize this meeting after you confirm everyone agreed to recording or storing the transcript.",
            "guardian": guardian.model_dump(),
            "saved_to_memory": False,
            "memory_id": None,
        }

    segments = split_segments(transcript)
    question_keywords = keywords(payload.question or payload.title or transcript)
    ranked_segments = rank_segments(segments, question_keywords)
    summary = build_summary(transcript, ranked_segments)
    short_summary = build_short_summary(summary)
    important_points = extract_points(transcript, ranked_segments)
    action_items = extract_action_items(transcript)
    decisions = extract_decisions(transcript)
    people = extract_people(transcript)
    questions_to_ask = build_questions_to_ask(payload.capture_type, important_points, decisions)
    answer = build_answer(payload.question, ranked_segments) if payload.question else None

    guardian = review_action(
        GuardianReviewRequest(
            action_type="capture_memory",
            payload={"capture_type": payload.capture_type, "title": payload.title, "source_url": payload.source_url},
        )
    ).model_dump()

    result = {
        "capture_type": payload.capture_type,
        "title": payload.title or infer_title(payload.capture_type, payload.source_url),
        "source_url": payload.source_url,
        "transcript_text": transcript if fetched_transcript else None,
        "summary": summary,
        "short_summary": short_summary,
        "important_points": important_points,
        "action_items": action_items,
        "decisions": decisions,
        "people": people,
        "questions_to_ask": questions_to_ask,
        "answer": answer,
        "relevant_parts": ranked_segments[:4],
        "next_tasks": build_next_tasks(payload.capture_type, action_items, decisions),
        "source_kind": detect_source_kind(payload.capture_type, payload.source_url),
        "draft_follow_up": build_follow_up(payload.capture_type, summary, action_items),
        "guardian": guardian,
        "saved_to_memory": True,
        "memory_id": None,
    }
    result["memory_id"] = save_capture_memory(result)
    return result


def build_missing_youtube_transcript_result(payload) -> dict[str, Any]:
    guardian = review_action(
        GuardianReviewRequest(
            action_type="capture_memory",
            payload={"capture_type": payload.capture_type, "title": payload.title, "source_url": payload.source_url},
        )
    ).model_dump()
    video_id = extract_youtube_id(payload.source_url or "")
    title = payload.title or (f"YouTube capture {video_id}" if video_id else "YouTube capture")
    return {
        "capture_type": "youtube",
        "title": title,
        "source_url": payload.source_url,
        "transcript_text": None,
        "summary": "Paste the YouTube transcript or the important notes from the video, then MyAgent can answer questions and point to the relevant timestamps.",
        "short_summary": "Paste the transcript so MyAgent can answer with timestamps.",
        "important_points": [
            "MyAgent tried to fetch public YouTube captions but this video did not expose a usable transcript.",
            "If the video has captions in the YouTube UI, paste them here and keep the YouTube link for source memory.",
        ],
        "action_items": ["Paste the transcript, then ask a specific question about the video."],
        "decisions": [],
        "people": [],
        "questions_to_ask": ["Which exact concept or timestamp should MyAgent explain after you paste the transcript?"],
        "answer": "I need transcript text before I can find the exact part of the video.",
        "relevant_parts": [],
        "next_tasks": ["Paste transcript for this YouTube link.", "Ask a focused question like: where does it explain transformers?"],
        "source_kind": "youtube",
        "draft_follow_up": "Paste the transcript and rerun Capture.",
        "guardian": guardian,
        "saved_to_memory": False,
        "memory_id": None,
    }


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def split_segments(text: str) -> list[dict[str, Any]]:
    timestamp_pattern = re.compile(r"(?:(\d{1,2}:)?\d{1,2}:\d{2})")
    raw_parts = re.split(r"(?=(?:(?:\d{1,2}:)?\d{1,2}:\d{2}))", text)
    segments = []
    for part in raw_parts:
        clean = part.strip()
        if not clean:
            continue
        timestamp_match = timestamp_pattern.match(clean)
        timestamp = timestamp_match.group(0) if timestamp_match else None
        body = clean[len(timestamp) :].strip(" -:") if timestamp else clean
        if body:
            segments.append({"timestamp": timestamp, "text": body[:700], "relevance": 0})

    if segments:
        return segments

    sentences = re.split(r"(?<=[.!?])\s+", text)
    grouped = [" ".join(sentences[index : index + 3]).strip() for index in range(0, len(sentences), 3)]
    return [{"timestamp": None, "text": item[:700], "relevance": 0} for item in grouped if item]


def keywords(text: str) -> list[str]:
    words = re.findall(r"[a-zA-Z][a-zA-Z0-9+#.]{2,}", text.lower())
    return [word for word, _ in Counter(word for word in words if word not in STOP_WORDS).most_common(12)]


def rank_segments(segments: list[dict[str, Any]], terms: list[str]) -> list[dict[str, Any]]:
    ranked = []
    for segment in segments:
        lower = segment["text"].lower()
        score = sum(2 if term in lower else 0 for term in terms)
        score += min(len(segment["text"]) // 180, 3)
        ranked.append({**segment, "relevance": score})
    return sorted(ranked, key=lambda item: item["relevance"], reverse=True)


def build_summary(text: str, ranked_segments: list[dict[str, Any]]) -> str:
    if ranked_segments:
        top = ranked_segments[:2]
        return " ".join(segment["text"] for segment in top)[:650]
    return text[:650] if text else "No transcript content was provided."


def build_short_summary(summary: str) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", summary)
    short = " ".join(sentence for sentence in sentences[:2] if sentence).strip()
    return short[:260] or summary[:260] or "Capture analyzed."


def extract_points(text: str, ranked_segments: list[dict[str, Any]]) -> list[str]:
    candidates = [segment["text"] for segment in ranked_segments[:6]]
    points = []
    for candidate in candidates:
        short = clean_capture_sentence(candidate)
        if short and short not in points:
            points.append(short[:220])
    return points[:5] or ["The capture was saved, but there was not enough detail to extract clear points."]


def extract_action_items(text: str) -> list[str]:
    patterns = [
        r"[^.!?]*(?:action item|todo|to do|follow up|need to|we need to|should|must)[^.!?]*[.!?]?",
        r"(?:^|[.?!]\s+)(?:send|schedule|prepare|review|finish|build|create|connect|draft)\b[^.!?]*[.!?]?",
    ]
    items = []
    for pattern in patterns:
        for match in re.findall(pattern, text, flags=re.IGNORECASE):
            clean = clean_action_item(match)
            lower = clean.lower()
            if clean and lower not in {item.lower() for item in items} and not lower.startswith("important point"):
                items.append(clean[:220])
    return items[:5] or ["Review the summary and choose the next follow-up."]


def extract_decisions(text: str) -> list[str]:
    decisions = []
    for match in re.findall(r"[^.!?]*(?:decided|agreed|agrees|approved|we will|we chose|final decision|decision)[^.!?]*[.!?]?", text, flags=re.IGNORECASE):
        clean = clean_capture_sentence(match)
        if clean:
            decisions.append(clean[:220])
    return decisions[:4]


def extract_people(text: str) -> list[str]:
    people = re.findall(r"\b[A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})?\b", text)
    blocked = {"The", "This", "That", "Meeting", "YouTube", "Guardian", "MyAgent", "Important", "Action", "Decision", "Summary"}
    unique = []
    for person in people:
        if person not in blocked and person not in unique:
            unique.append(person)
    return unique[:8]


def build_questions_to_ask(capture_type: str, important_points: list[str], decisions: list[str]) -> list[str]:
    questions = []
    if decisions:
        questions.append("Who owns each decision and what is the deadline?")
    if important_points:
        questions.append(f"What is the next concrete step for: {important_points[0][:90]}?")
    if capture_type == "youtube":
        questions.append("Which timestamp should be turned into a practice project or learning task?")
    elif capture_type == "lecture":
        questions.append("Which concept should I review again before the next class?")
    elif capture_type == "interview":
        questions.append("Which answer should I practice before the interview?")
    elif capture_type == "research":
        questions.append("What idea from this paper can be turned into an experiment?")
    else:
        questions.append("Should MyAgent draft a follow-up message from this capture?")
    return questions[:4]


def clean_capture_sentence(text: str) -> str:
    clean = re.sub(r"^\s*(?:(?:\d{1,2}:)?\d{1,2}:\d{2})\s*", "", text).strip(" -")
    return "" if clean.isdigit() else clean


def clean_action_item(text: str) -> str:
    clean = clean_capture_sentence(text)
    clean = re.sub(r"^(?:action item|todo|to do)\s*:\s*", "", clean, flags=re.IGNORECASE)
    clean = clean.strip(" -")
    return "" if clean.isdigit() else clean


def build_answer(question: str | None, ranked_segments: list[dict[str, Any]]) -> str | None:
    if not question:
        return None
    if not ranked_segments:
        return "I could not find a relevant part in the transcript."
    best = ranked_segments[0]
    where = f" around {best['timestamp']}" if best.get("timestamp") else ""
    return f"The most relevant part is{where}: {best['text'][:500]}"


def build_next_tasks(capture_type: str, action_items: list[str], decisions: list[str]) -> list[str]:
    tasks = []
    for item in action_items[:4]:
        clean = item.strip()
        if clean and clean not in tasks:
            tasks.append(clean)
    if capture_type == "youtube":
        tasks.append("Save the best explanation into your learning plan if it matches your field.")
    if decisions:
        tasks.append("Review decisions and send a short follow-up to people involved.")
    if not tasks:
        tasks.append("Review this capture and decide whether it needs a follow-up.")
    return tasks[:5]


def detect_source_kind(capture_type: str, source_url: str | None) -> str:
    if capture_type == "youtube" or extract_youtube_id(source_url or ""):
        return "youtube"
    if capture_type == "meeting":
        return "meeting"
    if capture_type in {"lecture", "interview", "research"}:
        return capture_type
    return "notes"


def build_follow_up(capture_type: str, summary: str, action_items: list[str]) -> str:
    prefix = "Meeting follow-up" if capture_type == "meeting" else "Capture follow-up"
    actions = "\n".join(f"- {item}" for item in action_items[:4])
    return f"{prefix}\n\nSummary:\n{summary}\n\nAction items:\n{actions}"


def infer_title(capture_type: str, source_url: str | None) -> str:
    if capture_type == "youtube":
        video_id = extract_youtube_id(source_url or "")
        return f"YouTube capture {video_id}" if video_id else "YouTube capture"
    if capture_type == "meeting":
        return "Meeting capture"
    return "Knowledge capture"


def extract_youtube_id(url: str) -> str | None:
    match = re.search(r"(?:v=|youtu\.be/|shorts/)([A-Za-z0-9_-]{6,})", url)
    return match.group(1) if match else None


def fetch_youtube_transcript(url: str) -> str | None:
    video_id = extract_youtube_id(url)
    if not video_id:
        return None

    library_transcript = fetch_youtube_transcript_with_library(video_id)
    if library_transcript:
        return library_transcript

    try:
        with httpx.Client(timeout=12, headers={"User-Agent": "Mozilla/5.0 MyAgent Capture"}) as client:
            list_response = client.get("https://www.youtube.com/api/timedtext", params={"type": "list", "v": video_id})
            list_response.raise_for_status()
            tracks = ET.fromstring(list_response.text)
            track = choose_caption_track(tracks)
            if track is None:
                return fetch_youtube_transcript_from_watch_page(client, video_id)

            transcript_response = client.get(
                "https://www.youtube.com/api/timedtext",
                params={
                    "v": video_id,
                    "lang": track.get("lang_code"),
                    "name": track.get("name") or "",
                    "fmt": "srv3",
                },
            )
            transcript_response.raise_for_status()
            return parse_timedtext(transcript_response.text) or fetch_youtube_transcript_from_watch_page(client, video_id)
    except Exception:
        return None


def fetch_youtube_transcript_with_library(video_id: str) -> str | None:
    try:
        api = YouTubeTranscriptApi()
        transcript = None
        for languages in (["en"], ["en-US", "en-GB"], None):
            try:
                transcript = api.fetch(video_id, languages=languages) if languages else api.fetch(video_id)
                break
            except Exception:
                continue
        if not transcript:
            return None
        lines = []
        for snippet in transcript:
            text = normalize_text(snippet.text)
            if not text:
                continue
            lines.append(f"{format_caption_timestamp(str(snippet.start))} {text}".strip())
        return normalize_text(" ".join(lines)) or None
    except Exception:
        return None


def fetch_youtube_transcript_from_watch_page(client: httpx.Client, video_id: str) -> str | None:
    response = client.get("https://www.youtube.com/watch", params={"v": video_id, "hl": "en"})
    response.raise_for_status()
    caption_tracks = extract_caption_tracks(response.text)
    if not caption_tracks:
        return None

    track = choose_caption_track_from_json(caption_tracks)
    base_url = track.get("baseUrl") if isinstance(track, dict) else None
    if not base_url:
        return None

    separator = "&" if "?" in base_url else "?"
    transcript_response = client.get(f"{base_url}{separator}fmt=srv3")
    transcript_response.raise_for_status()
    return parse_timedtext(transcript_response.text)


def extract_caption_tracks(html: str) -> list[dict[str, Any]]:
    marker = '"captionTracks":'
    start = html.find(marker)
    if start == -1:
        return []
    array_start = html.find("[", start + len(marker))
    if array_start == -1:
        return []
    array_text = extract_balanced_json_array(html, array_start)
    if not array_text:
        return []
    try:
        tracks = json.loads(array_text)
        return tracks if isinstance(tracks, list) else []
    except json.JSONDecodeError:
        return []


def extract_balanced_json_array(text: str, start: int) -> str | None:
    depth = 0
    in_string = False
    escaped = False
    for index in range(start, len(text)):
        character = text[index]
        if escaped:
            escaped = False
            continue
        if character == "\\":
            escaped = True
            continue
        if character == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if character == "[":
            depth += 1
        elif character == "]":
            depth -= 1
            if depth == 0:
                return text[start : index + 1]
    return None


def choose_caption_track_from_json(tracks: list[dict[str, Any]]) -> dict[str, Any]:
    for language in ["en", "en-US", "en-GB"]:
        for track in tracks:
            if track.get("languageCode") == language:
                return track
    for track in tracks:
        if track.get("kind") == "asr":
            return track
    return tracks[0]


def choose_caption_track(tracks: ET.Element) -> ET.Element | None:
    track_items = list(tracks.findall("track"))
    if not track_items:
        return None
    preferred = ["en", "en-US", "en-GB"]
    for language in preferred:
        for track in track_items:
            if track.get("lang_code") == language:
                return track
    return track_items[0]


def parse_timedtext(raw_xml: str) -> str | None:
    root = ET.fromstring(raw_xml)
    lines = []
    for node in root.iter():
        if node.tag not in {"text", "p"}:
            continue
        text = "".join(node.itertext()).strip()
        if not text:
            continue
        start = node.get("start") or node.get("t")
        timestamp = format_caption_timestamp(start)
        lines.append(f"{timestamp} {unescape(text)}".strip())
    return normalize_text(" ".join(lines)) or None


def format_caption_timestamp(value: str | None) -> str:
    if not value:
        return ""
    try:
        seconds = float(value)
        if seconds > 100000:
            seconds = seconds / 1000
        minutes = int(seconds // 60)
        rest = int(seconds % 60)
        return f"{minutes:02d}:{rest:02d}"
    except ValueError:
        return ""


def save_capture_memory(result: dict[str, Any]) -> str:
    profile = read_profile()
    captures = list(profile.get("captures") or [])
    memory_id = str(uuid4())
    captures.insert(
        0,
        {
            "id": memory_id,
            "title": result["title"],
            "capture_type": result["capture_type"],
            "summary": result["summary"],
            "source_url": result.get("source_url"),
            "created_at": datetime.now(UTC).isoformat(),
            "action_items": result["action_items"][:5],
            "decisions": result["decisions"][:4],
            "important_points": result["important_points"][:5],
            "relevant_parts": result["relevant_parts"][:4],
            "next_tasks": result["next_tasks"][:5],
        },
    )
    write_profile({"captures": captures[:10]})
    return memory_id


def capture_tasks() -> list[dict[str, Any]]:
    profile = read_profile()
    tasks = []
    for capture in profile.get("captures") or []:
        for index, task in enumerate(capture.get("next_tasks") or capture.get("action_items") or []):
            tasks.append(
                {
                    "id": f"{capture.get('id') or capture.get('created_at')}-{index}",
                    "title": task,
                    "source_title": capture.get("title") or "Capture",
                    "capture_type": capture.get("capture_type") or "notes",
                    "source_url": capture.get("source_url"),
                    "created_at": capture.get("created_at"),
                    "status": "todo",
                }
            )
    return tasks[:12]
