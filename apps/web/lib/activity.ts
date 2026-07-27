import { API_URL } from "@/lib/api";
import type { AgentMessage } from "@/lib/orchestration";

export type ActivityItem = {
  id: string;
  created_at: string;
  updated_at: string;
  kind: string;
  command?: string | null;
  intent?: string | null;
  situation: {
    type?: string;
    title?: string;
    description?: string;
    severity?: string;
  };
  recommendation: {
    title?: string;
    rationale?: string;
    confidence?: number;
    primary_action_type?: string;
  };
  actions: Array<{ type: string; payload: Record<string, unknown> }>;
  guardian: {
    decision?: string;
    risk_level?: string;
    approval_required?: boolean;
    reason?: string;
  };
  approval?: {
    id?: string;
    status?: string;
    created_at?: string;
    execution?: Record<string, unknown>;
  } | null;
  agent_messages: AgentMessage[];
};

export async function getActivity(): Promise<{ items: ActivityItem[]; count: number }> {
  const response = await fetch(`${API_URL}/activity`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not load activity");
  }
  return response.json() as Promise<{ items: ActivityItem[]; count: number }>;
}
