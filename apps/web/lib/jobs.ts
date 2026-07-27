import { API_URL } from "@/lib/api";

export type JobRecommendation = {
  id: string;
  title: string;
  company_type: string;
  location: string;
  source: string;
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  why: string;
  apply_prep: string[];
  talking_points: string[];
  cover_email: string;
  search_links: Record<string, string>;
  next_action: string;
};

export type JobItem = {
  id: string;
  job_key: string;
  status: "saved" | "preparing" | "applied" | "rejected";
  job: JobRecommendation;
  created_at: string;
  updated_at: string;
};

export type JobTask = {
  id: string;
  title: string;
  company_type: string;
  status: string;
  match_score: number;
  next_step: string;
  apply_prep: string[];
  talking_points: string[];
  cover_email: string;
  search_links: Record<string, string>;
};

export async function getJobs(): Promise<{ items: JobItem[]; tasks: JobTask[]; count: number }> {
  const response = await fetch(`${API_URL}/growth/jobs`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not load job memory");
  }
  return response.json() as Promise<{ items: JobItem[]; tasks: JobTask[]; count: number }>;
}

export async function trackJob(job: JobRecommendation): Promise<{ item: JobItem; tasks: JobTask[] }> {
  const response = await fetch(`${API_URL}/growth/jobs/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job })
  });
  if (!response.ok) {
    throw new Error("Could not track job");
  }
  return response.json() as Promise<{ item: JobItem; tasks: JobTask[] }>;
}

export async function updateJobStatus(id: string, status: JobItem["status"]): Promise<{ item: JobItem; tasks: JobTask[] }> {
  const response = await fetch(`${API_URL}/growth/jobs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  if (!response.ok) {
    throw new Error("Could not update job status");
  }
  return response.json() as Promise<{ item: JobItem; tasks: JobTask[] }>;
}

export function jobKey(job: JobRecommendation) {
  return [job.title, job.company_type, job.location].map((part) => part.trim().toLowerCase()).join("|");
}
