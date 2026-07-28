import { API_URL } from "@/lib/api";

export type HealthCheckIn = {
  mood: number;
  energy: number;
  sleep_hours: number;
  water_glasses: number;
  exercise_minutes: number;
  symptoms: string[];
  notes?: string;
  medication_taken?: boolean | null;
};

export type HealthInsight = {
  title: string;
  body: string;
  severity: string;
};

export type FitnessSync = {
  steps?: number | null;
  active_calories?: number | null;
  distance_km?: number | null;
  exercise_minutes?: number | null;
  stand_hours?: number | null;
  sleep_hours?: number | null;
  resting_heart_rate?: number | null;
  source?: string;
  synced_for?: string | null;
  notes?: string | null;
  created_at?: string;
};

export type HealthSummary = {
  latest?: (HealthCheckIn & { created_at?: string }) | null;
  latest_fitness?: FitnessSync | null;
  check_ins: Array<HealthCheckIn & { created_at?: string }>;
  fitness_syncs?: FitnessSync[];
  insights: HealthInsight[];
  urgent_warning?: string | null;
  disclaimer: string;
};

export async function getHealthSummary(): Promise<HealthSummary> {
  const response = await fetch(`${API_URL}/health/summary`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not load health summary");
  }
  return response.json() as Promise<HealthSummary>;
}

export async function saveHealthCheckIn(payload: HealthCheckIn): Promise<HealthSummary> {
  const response = await fetch(`${API_URL}/health/check-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Could not save health check-in");
  }
  return response.json() as Promise<HealthSummary>;
}
