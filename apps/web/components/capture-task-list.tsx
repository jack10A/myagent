"use client";

import { RefreshCw, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { getCaptureTasks, type CaptureTask } from "@/lib/capture";
import { getTaskState, hiddenTaskIds, setTaskStatus, taskStateId, type TaskStateItem } from "@/lib/tasks";

export function CaptureTaskList() {
  const [tasks, setTasks] = useState<CaptureTask[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [stateItems, setStateItems] = useState<Record<string, TaskStateItem>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [data, state] = await Promise.all([getCaptureTasks(), getTaskState()]);
      setTasks(data.tasks);
      setHiddenIds(hiddenTaskIds(state));
      setStateItems(state.items);
    } catch {
      setError("Could not load Capture tasks. Start the backend, then refresh.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    window.addEventListener("myagent:task-state-change", loadTaskState);
    return () => window.removeEventListener("myagent:task-state-change", loadTaskState);
  }, []);

  async function loadTaskState() {
    try {
      const state = await getTaskState();
      setHiddenIds(hiddenTaskIds(state));
      setStateItems(state.items);
    } catch {
      setError("Task progress could not refresh yet.");
    }
  }

  async function markTask(id: string, status: "done" | "snoozed") {
    setHiddenIds((current) => new Set([...current, id]));
    setSavingId(id);
    setError("");
    try {
      await setTaskStatus(id, status);
      window.dispatchEvent(new Event("myagent:task-state-change"));
    } catch {
      setError("Task was hidden locally, but could not be saved yet.");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <div className="rounded-md border border-line bg-white p-5 text-sm text-ink/65 shadow-soft">Loading Capture tasks...</div>;
  }

  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">Capture Agent</p>
          <h2 className="font-semibold">Capture follow-up tasks</h2>
        </div>
        <button aria-label="Refresh Capture tasks" className="flex h-10 w-10 items-center justify-center rounded-md border border-line" onClick={() => void load()} title="Refresh Capture tasks" type="button">
          <RefreshCw size={16} />
        </button>
      </div>

      {error ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {visibleTasks(tasks, hiddenIds).length === 0 ? (
        <article className="mt-4 rounded-md border border-dashed border-line p-4">
          <p className="font-semibold">No Capture tasks yet</p>
          <p className="mt-2 text-sm leading-6 text-ink/65">Analyze a meeting, notes, or YouTube transcript from Capture to create follow-up tasks.</p>
        </article>
      ) : null}

      <div className="mt-4 space-y-3">
        {visibleTasks(tasks, hiddenIds).map((task) => {
          const id = taskStateId("capture", task.id);
          return (
          <article className="rounded-md bg-panel p-4" key={task.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white">
                <Video size={16} className="text-teal" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold leading-snug">{task.title}</p>
                <p className="mt-1 text-sm text-ink/55">{task.source_title} | {task.capture_type}</p>
                {task.source_url ? (
                  <a className="mt-2 inline-flex rounded-md border border-teal/30 px-2 py-1 text-xs font-semibold text-teal hover:bg-teal hover:text-white" href={task.source_url} target="_blank">
                    Open source
                  </a>
                ) : null}
              </div>
              </div>
              <TaskButtons id={id} savingId={savingId} onMark={markTask} />
            </div>
          </article>
          );
        })}
      </div>

      <CompletedTasks items={stateItems} />
    </section>
  );
}

function visibleTasks(tasks: CaptureTask[], hiddenIds: Set<string>) {
  return tasks.filter((task) => !hiddenIds.has(taskStateId("capture", task.id)));
}

function TaskButtons({ id, onMark, savingId }: { id: string; onMark: (id: string, status: "done" | "snoozed") => void; savingId: string | null }) {
  const saving = savingId === id;
  return (
    <div className="flex flex-wrap gap-2">
      <button className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold disabled:opacity-45" disabled={saving} onClick={() => onMark(id, "done")} type="button">
        {saving ? "Saving..." : "Done"}
      </button>
      <button className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold disabled:opacity-45" disabled={saving} onClick={() => onMark(id, "snoozed")} type="button">
        Snooze
      </button>
    </div>
  );
}

function CompletedTasks({ items }: { items: Record<string, TaskStateItem> }) {
  const completed = Object.values(items).filter((item) => item.id.startsWith("capture-"));
  if (!completed.length) return null;
  return (
    <details className="mt-4 rounded-md border border-line p-4">
      <summary className="cursor-pointer text-sm font-semibold">Completed / snoozed capture tasks ({completed.length})</summary>
      <div className="mt-3 grid gap-2">
        {completed.map((item) => (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-panel p-3 text-sm" key={item.id}>
            <span>{item.id.replace(/^capture-/, "")}</span>
            <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-ink/55">{item.status}</span>
          </div>
        ))}
      </div>
    </details>
  );
}
