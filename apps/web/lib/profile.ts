import { API_URL } from "@/lib/api";

export type MyAgentProfile = {
  name?: string | null;
  age?: string | null;
  lifeStage?: string | null;
  field?: string | null;
  goal?: string | null;
  careerAuth?: string | null;
  city?: string | null;
  gmail?: {
    email?: string;
    messages_total?: number;
    threads_total?: number;
    recent_scanned?: number;
    important_count?: number;
    important_messages?: Array<{
      id?: string;
      thread_id?: string;
      subject?: string | null;
      from?: string | null;
      date?: string | null;
      snippet?: string | null;
      label_ids?: string[];
      importance_score?: number;
    }>;
    mode?: string;
  } | null;
  calendar?: {
    mode?: string;
    upcoming_count?: number;
    events?: Array<{
      id?: string;
      summary?: string | null;
      start?: string | null;
      end?: string | null;
      location?: string | null;
      html_link?: string | null;
      status?: string | null;
    }>;
  } | null;
  github?: {
    login?: string;
    url?: string;
    public_repos?: number;
    repos_scanned?: number;
    top_languages?: Record<string, number>;
  } | null;
  linkedin?: {
    sub?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    email?: string;
    email_verified?: boolean;
    locale?: string;
    connected_at?: string;
    mode?: string;
    profile_url?: string;
    headline?: string;
    current_role?: string;
    target_role?: string;
    skills?: string[];
    about?: string;
  } | null;
  cv?: {
    role_guess?: string;
    detected_skills?: string[];
    improvements?: string[];
    summary?: string;
  } | null;
  captures?: Array<{
    title?: string;
    capture_type?: string;
    summary?: string;
    source_url?: string | null;
    created_at?: string;
    action_items?: string[];
  }>;
  health?: {
    latest_fitness?: {
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
    } | null;
    fitness_syncs?: Array<Record<string, unknown>>;
    latest?: {
      mood?: number;
      energy?: number;
      sleep_hours?: number;
      water_glasses?: number;
      exercise_minutes?: number;
      symptoms?: string[];
      created_at?: string;
    };
    check_ins?: Array<Record<string, unknown>>;
  };
};

export async function saveProfile(profile: MyAgentProfile) {
  const response = await fetch(`${API_URL}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile)
  });

  if (!response.ok) {
    throw new Error("Could not save profile");
  }

  return response.json();
}

export async function getProfile(): Promise<MyAgentProfile> {
  const response = await fetch(`${API_URL}/profile`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Could not load profile");
  }

  return response.json() as Promise<MyAgentProfile>;
}

export async function getProfileGrowthPlan() {
  const response = await fetch(`${API_URL}/profile/growth-plan`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Could not load growth plan");
  }

  return response.json();
}

export async function exportProfileMemory(): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_URL}/profile/export`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not export memory");
  }
  return response.json() as Promise<Record<string, unknown>>;
}

export async function deleteProfileMemory(): Promise<{ deleted: boolean; profile: MyAgentProfile }> {
  const response = await fetch(`${API_URL}/profile/memory?confirm=DELETE`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error("Could not delete memory");
  }
  return response.json() as Promise<{ deleted: boolean; profile: MyAgentProfile }>;
}

export async function disableConnector(connector: string): Promise<{ disabled: string; profile: MyAgentProfile }> {
  const response = await fetch(`${API_URL}/profile/connectors/${connector}/disable`, { method: "PATCH" });
  if (!response.ok) {
    throw new Error("Could not disable connector");
  }
  return response.json() as Promise<{ disabled: string; profile: MyAgentProfile }>;
}
