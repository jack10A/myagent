export type RiskLevel = "low" | "medium" | "high" | "blocked";

export type GuardianDecision = "allow" | "require_approval" | "block" | "request_more_context";

export type ConnectorType =
  | "gmail"
  | "google_calendar"
  | "weather"
  | "emergency_alerts"
  | "notion"
  | "google_drive";

export type Situation = {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: "normal" | "urgent";
};

export type Recommendation = {
  id: string;
  title: string;
  rationale: string;
  confidence: number;
  guardian: GuardianReview;
};

export type GuardianReview = {
  decision: GuardianDecision;
  risk_level: RiskLevel;
  approval_required: boolean;
  reason: string;
  safe_alternative?: string;
};

