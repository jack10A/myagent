import { API_URL } from "@/lib/api";

export type CalendarEvent = {
  id?: string;
  summary: string;
  start?: string | null;
  end?: string | null;
  start_label?: string;
  end_label?: string;
  start_date?: string;
  location?: string | null;
  html_link?: string | null;
  status?: string | null;
};

export type CalendarPrepTask = {
  id: string;
  title: string;
  when: string;
  priority: string;
  steps: string[];
  event?: CalendarEvent | null;
};

export type CalendarAgenda = {
  connected: boolean;
  upcoming_count: number;
  next_event?: CalendarEvent | null;
  today: CalendarEvent[];
  tomorrow: CalendarEvent[];
  week: CalendarEvent[];
  busy_days: Array<{ date: string; events: number; label: string }>;
  conflicts: Array<{ title: string; events: string[]; when?: string; severity: string; conflict_type?: string; description?: string; event_classes?: string[] }>;
  prep_tasks: CalendarPrepTask[];
  travel_guardian: TravelGuardian;
  insight: string;
};

export type TravelRisk = {
  id: string;
  title: string;
  severity: "safe" | "warning" | "urgent";
  reason: string;
  when?: string;
  location?: string;
  event?: CalendarEvent | null;
  checks: string[];
  suggested_actions: string[];
};

export type TravelGuardian = {
  enabled: boolean;
  summary: string;
  risk_count: number;
  highest_severity: "safe" | "warning" | "urgent";
  risks: TravelRisk[];
};

export async function getCalendarAgenda(): Promise<{ agenda: CalendarAgenda }> {
  const response = await fetch(`${API_URL}/calendar/agenda`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not load calendar agenda");
  }
  return response.json() as Promise<{ agenda: CalendarAgenda }>;
}

export async function getTravelGuardian(): Promise<{ travel_guardian: TravelGuardian; next_event?: CalendarEvent | null }> {
  const response = await fetch(`${API_URL}/calendar/travel-guardian`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not load Travel Guardian");
  }
  return response.json() as Promise<{ travel_guardian: TravelGuardian; next_event?: CalendarEvent | null }>;
}
