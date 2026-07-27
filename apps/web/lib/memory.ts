import { apiFetch } from "@/lib/api";

export type MemoryTimelineItem = {
  id: string;
  category: string;
  title: string;
  body: string;
  source: string;
  importance: number;
  created_at: string;
  metadata?: Record<string, unknown>;
  tags: string[];
};

export type MemoryTimeline = {
  query: string;
  total: number;
  stats: {
    categories: string[];
    sources: string[];
    high_importance: number;
  };
  items: MemoryTimelineItem[];
};

export async function getMemoryTimeline(query = "") {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set("q", query.trim());
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<MemoryTimeline>(`/memory/timeline${suffix}`);
}
