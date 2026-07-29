import { API_URL } from "@/lib/api";

export type CaptureRequest = {
  capture_type: "meeting" | "youtube" | "notes" | "lecture" | "interview" | "research";
  title?: string;
  source_url?: string;
  question?: string;
  transcript: string;
  consent_confirmed: boolean;
};

export type CaptureResult = {
  capture_type: string;
  title: string;
  source_url?: string | null;
  transcript_text?: string | null;
  backend_source?: "primary" | "local";
  summary: string;
  short_summary: string;
  important_points: string[];
  action_items: string[];
  decisions: string[];
  people: string[];
  questions_to_ask: string[];
  answer?: string | null;
  relevant_parts: Array<{ timestamp?: string | null; text: string; relevance: number }>;
  next_tasks: string[];
  source_kind: string;
  draft_follow_up: string;
  guardian: {
    decision: string;
    risk_level: string;
    approval_required: boolean;
    reason: string;
    safe_alternative?: string | null;
  };
  saved_to_memory: boolean;
  memory_id?: string | null;
};

const LOCAL_API_URL = "http://localhost:8000/api";

export type CaptureTask = {
  id: string;
  title: string;
  source_title: string;
  capture_type: string;
  source_url?: string | null;
  created_at?: string | null;
  status: string;
};

export async function analyzeCapture(payload: CaptureRequest): Promise<CaptureResult> {
  const primary = await postCaptureAnalyze(API_URL, payload);
  if (shouldTryLocalTranscriptFallback(payload, primary)) {
    const local = await tryLocalCaptureAnalyze(payload);
    if (local?.transcript_text) {
      return { ...local, backend_source: "local" };
    }
  }
  return { ...primary, backend_source: "primary" };
}

async function postCaptureAnalyze(apiUrl: string, payload: CaptureRequest): Promise<CaptureResult> {
  const response = await fetch(`${apiUrl}/capture/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Could not analyze capture");
  }

  return response.json() as Promise<CaptureResult>;
}

function shouldTryLocalTranscriptFallback(payload: CaptureRequest, result: CaptureResult) {
  return (
    isYoutubeUrl(payload.source_url) &&
    !payload.transcript.trim() &&
    !result.transcript_text &&
    !result.saved_to_memory &&
    !API_URL.includes("localhost")
  );
}

function isYoutubeUrl(url?: string | null) {
  return Boolean(url && /(youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts)/i.test(url));
}

async function tryLocalCaptureAnalyze(payload: CaptureRequest): Promise<CaptureResult | null> {
  try {
    return await postCaptureAnalyze(LOCAL_API_URL, payload);
  } catch {
    return null;
  }
}

export async function getCaptureTasks(): Promise<{ tasks: CaptureTask[]; count: number }> {
  const response = await fetch(`${API_URL}/capture/tasks`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Could not load capture tasks");
  }

  return response.json() as Promise<{ tasks: CaptureTask[]; count: number }>;
}
