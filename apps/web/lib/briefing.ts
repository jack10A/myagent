import { apiFetch } from "@/lib/api";

export type MorningBriefingCard = {
  id: string;
  kind: string;
  title: string;
  body: string;
  priority: "urgent" | "high" | "medium" | "low";
  source: string;
  action_label: string;
  action_href: string;
  metadata?: Record<string, unknown>;
};

export type MorningBriefing = {
  generated_at: string;
  greeting: string;
  summary: string;
  primary: MorningBriefingCard;
  cards: MorningBriefingCard[];
  signals: {
    gmail: boolean;
    calendar: boolean;
    github: boolean;
    linkedin: boolean;
    health: boolean;
    approvals: number;
    notifications: number;
  };
  timeline: Array<{
    time: string;
    title: string;
    detail: string;
  }>;
  agents: Array<{
    agent: string;
    status: "ready" | "waiting" | "active" | string;
    summary: string;
    depends_on: string[];
  }>;
  guardian: {
    status: "urgent" | "watching" | "calm" | string;
    message: string;
    approval_rule: string;
  };
};

export async function getMorningBriefing() {
  return apiFetch<MorningBriefing>("/briefing/morning");
}
