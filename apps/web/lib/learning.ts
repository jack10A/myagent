import { API_URL } from "@/lib/api";

export type LearningResource = {
  title: string;
  provider: string;
  level: string;
  duration?: string;
  url?: string;
  why: string;
  priority: number;
  type: string;
};

export type LearningItem = {
  id: string;
  resource_key: string;
  status: "not_started" | "learning" | "completed" | "portfolio";
  resource: LearningResource;
  weekly_plan: Array<{ day: string; task: string }>;
  created_at: string;
  updated_at: string;
};

export type LearningTask = {
  id: string;
  title: string;
  type: string;
  provider: string;
  status: string;
  priority: number;
  next_step: { day: string; task: string };
  weekly_plan: Array<{ day: string; task: string }>;
  url?: string;
};

export async function getLearning(): Promise<{ items: LearningItem[]; tasks: LearningTask[]; count: number }> {
  const response = await fetch(`${API_URL}/growth/learning`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not load learning memory");
  }
  return response.json() as Promise<{ items: LearningItem[]; tasks: LearningTask[]; count: number }>;
}

export async function trackLearningResource(resource: LearningResource): Promise<{ item: LearningItem; tasks: LearningTask[] }> {
  const response = await fetch(`${API_URL}/growth/learning/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resource })
  });
  if (!response.ok) {
    throw new Error("Could not track learning resource");
  }
  return response.json() as Promise<{ item: LearningItem; tasks: LearningTask[] }>;
}

export async function updateLearningStatus(id: string, status: LearningItem["status"]): Promise<{ item: LearningItem; tasks: LearningTask[] }> {
  const response = await fetch(`${API_URL}/growth/learning/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  if (!response.ok) {
    throw new Error("Could not update learning status");
  }
  return response.json() as Promise<{ item: LearningItem; tasks: LearningTask[] }>;
}

export function learningResourceKey(resource: LearningResource) {
  return [resource.type, resource.provider, resource.title, resource.url ?? ""]
    .map((part) => part.trim().toLowerCase())
    .join("|");
}
