import { apiFetch } from "@/lib/api";

export type TaskStatus = "done" | "snoozed" | "active";

export type TaskStateItem = {
  id: string;
  status: Exclude<TaskStatus, "active">;
  updated_at: string;
};

export type TaskStateResponse = {
  items: Record<string, TaskStateItem>;
  hidden_ids: string[];
  updated_at: string | null;
};

export async function getTaskState(): Promise<TaskStateResponse> {
  return apiFetch<TaskStateResponse>("/tasks/state");
}

export async function setTaskStatus(id: string, status: TaskStatus): Promise<{ saved: boolean }> {
  return apiFetch<{ saved: boolean }>(`/tasks/state/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export async function clearTaskState(): Promise<{ cleared: boolean }> {
  return apiFetch<{ cleared: boolean }>("/tasks/state", { method: "DELETE" });
}
