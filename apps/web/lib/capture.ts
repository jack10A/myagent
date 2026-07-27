import { API_URL } from "@/lib/api";

export type CaptureRequest = {
  capture_type: "meeting" | "youtube" | "notes";
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
  summary: string;
  important_points: string[];
  action_items: string[];
  decisions: string[];
  people: string[];
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
  const response = await fetch(`${API_URL}/capture/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Could not analyze capture");
  }

  return response.json() as Promise<CaptureResult>;
}

export async function getCaptureTasks(): Promise<{ tasks: CaptureTask[]; count: number }> {
  const response = await fetch(`${API_URL}/capture/tasks`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Could not load capture tasks");
  }

  return response.json() as Promise<{ tasks: CaptureTask[]; count: number }>;
}
