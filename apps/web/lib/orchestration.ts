import { API_URL } from "@/lib/api";

export type AgentMessage = {
  agent: string;
  depends_on: string[];
  summary: string;
  data: Record<string, unknown>;
};

export type DemoTrace = {
  command?: string;
  intent?: string;
  approval?: {
    id: string;
    status: string;
    created_at: string;
  };
  situation: {
    type: string;
    title: string;
    description: string;
    severity: string;
  };
  recommendation: {
    title: string;
    rationale: string;
    confidence: number;
    primary_action_type: string;
  };
  actions: Array<{ type: string; payload: Record<string, unknown> }>;
  guardian: {
    decision: string;
    risk_level: string;
    approval_required: boolean;
    reason: string;
  };
  agent_messages: AgentMessage[];
};

export async function runAgentCommand(message: string): Promise<DemoTrace> {
  const response = await fetch(`${API_URL}/orchestration/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });

  if (!response.ok) {
    throw new Error("Could not process command");
  }

  return response.json() as Promise<DemoTrace>;
}

export async function runDemoTrace(eventType: string): Promise<DemoTrace> {
  const payloadByType: Record<string, Record<string, unknown>> = {
    cv_analyzed: {
      source: "cv",
      event_type: "cv_analyzed",
      payload: {
        title: "CV analysis completed",
        description: "The user uploaded a CV and MyAgent extracted career signals."
      }
    },
    email_received: {
      source: "gmail",
      event_type: "email_received",
      payload: {
        subject: "Can we move tomorrow's meeting?",
        sender: "client@example.com"
      }
    },
    emergency_alert: {
      source: "guardian_alerts",
      event_type: "emergency_alert",
      payload: {
        title: "Severe weather near your route",
        description: "Heavy rain may affect travel to your next meeting.",
        severity: "urgent"
      }
    }
  };

  const response = await fetch(`${API_URL}/orchestration/demo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadByType[eventType] ?? payloadByType.cv_analyzed)
  });

  if (!response.ok) {
    throw new Error("Could not run demo trace");
  }

  return response.json() as Promise<DemoTrace>;
}
