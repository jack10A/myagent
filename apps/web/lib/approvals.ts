import { API_URL } from "@/lib/api";
import type { AgentMessage } from "@/lib/orchestration";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "editing";

export type ApprovalItem = {
  id: string;
  status: ApprovalStatus;
  created_at: string;
  updated_at: string;
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
  execution?: {
    provider?: string;
    type?: string;
    draft_id?: string;
    message_id?: string;
    thread_id?: string;
    event_id?: string;
    html_link?: string;
    summary?: string;
    start?: string;
    calendar_refreshed?: boolean;
  };
  agent_messages: AgentMessage[];
};

export async function getApprovals(): Promise<{ approvals: ApprovalItem[]; pending_count: number }> {
  const response = await fetch(`${API_URL}/approvals`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not load approvals");
  }
  return response.json() as Promise<{ approvals: ApprovalItem[]; pending_count: number }>;
}

export async function updateApprovalStatus(id: string, status: ApprovalStatus): Promise<ApprovalItem> {
  const response = await fetch(`${API_URL}/approvals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.detail || "Could not update approval");
  }
  return response.json() as Promise<ApprovalItem>;
}

export async function updateApprovalDraft(
  id: string,
  draft: Record<string, unknown>
): Promise<ApprovalItem> {
  const response = await fetch(`${API_URL}/approvals/${id}/draft`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft)
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.detail || "Could not update draft");
  }
  return response.json() as Promise<ApprovalItem>;
}
