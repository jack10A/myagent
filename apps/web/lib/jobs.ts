import { API_URL } from "@/lib/api";
import type { ApprovalItem } from "@/lib/approvals";

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
  status: JobStatus;
  job: JobRecommendation;
  company_name?: string;
  job_url?: string;
  recruiter_email?: string;
  follow_up_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type JobStatus = "saved" | "preparing" | "applied" | "interview" | "offer" | "rejected";

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
  company_name?: string;
  job_url?: string;
  recruiter_email?: string;
  follow_up_at?: string;
  notes?: string;
};

export type JobDetailsUpdate = {
  company_name?: string;
  job_url?: string;
  recruiter_email?: string;
  follow_up_at?: string;
  notes?: string;
};

export type JobSearchResponse = {
  query: string;
  location: string;
  profile: {
    target_role: string;
    linkedin_ready: boolean;
    skills: string[];
    strongest_language: string;
  };
  results: JobRecommendation[];
};

export async function searchJobs(query: string, location?: string): Promise<JobSearchResponse> {
  const response = await fetch(`${API_URL}/growth/jobs/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, location })
  });
  if (!response.ok) {
    throw new Error("Could not search job targets");
  }
  return response.json() as Promise<JobSearchResponse>;
}

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

export async function updateJobDetails(id: string, details: JobDetailsUpdate): Promise<{ item: JobItem; tasks: JobTask[] }> {
  const response = await fetch(`${API_URL}/growth/jobs/${id}/details`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details)
  });
  if (!response.ok) {
    throw new Error("Could not update job details");
  }
  return response.json() as Promise<{ item: JobItem; tasks: JobTask[] }>;
}

export async function prepareJobOutreach(id: string, recipient?: string): Promise<{ approval: ApprovalItem }> {
  const response = await fetch(`${API_URL}/growth/jobs/${id}/outreach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient })
  });
  if (!response.ok) {
    throw new Error("Could not prepare job outreach");
  }
  return response.json() as Promise<{ approval: ApprovalItem }>;
}

export function jobKey(job: JobRecommendation) {
  return [job.title, job.company_type, job.location].map((part) => part.trim().toLowerCase()).join("|");
}
