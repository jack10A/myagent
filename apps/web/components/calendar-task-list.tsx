"use client";

import { CalendarCheck, CalendarDays, Plane, RefreshCw, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { getCalendarAgenda, type CalendarAgenda } from "@/lib/calendar";
import { getTaskState, hiddenTaskIds, setTaskStatus, taskStateId, type TaskStateItem } from "@/lib/tasks";

export function CalendarTaskList() {
  const [agenda, setAgenda] = useState<CalendarAgenda | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [stateItems, setStateItems] = useState<Record<string, TaskStateItem>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [data, state] = await Promise.all([getCalendarAgenda(), getTaskState()]);
      setAgenda(data.agenda);
      setHiddenIds(hiddenTaskIds(state));
      setStateItems(state.items);
    } catch {
      setError("Could not load calendar prep tasks.");
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
    setError(null);
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
    return <div className="rounded-md border border-line bg-white p-5 text-sm text-ink/65 shadow-soft">Loading calendar prep...</div>;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-white p-4 shadow-soft">
        <div>
          <h2 className="font-semibold">Calendar prep tasks</h2>
          <p className="mt-1 text-sm text-ink/60">Meeting preparation, conflicts, and agenda work from Calendar Agent.</p>
        </div>
        <button aria-label="Refresh calendar prep" className="flex h-10 w-10 items-center justify-center rounded-md border border-line" onClick={() => void load()} title="Refresh calendar prep" type="button">
          <RefreshCw size={17} />
        </button>
      </div>

      {error ? <div className="rounded-md border border-coral/50 bg-coral/10 p-4 text-sm text-coral">{error}</div> : null}

      {!agenda?.connected ? (
        <div className="rounded-md border border-line bg-white p-5 shadow-soft">
          <h2 className="font-semibold">Calendar is not connected</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">Connect Google Calendar from Connectors to generate meeting prep tasks.</p>
        </div>
      ) : null}

      {agenda?.connected && !visibleTravelRisks(agenda, hiddenIds).length && !visiblePrepTasks(agenda, hiddenIds).length ? (
        <div className="rounded-md border border-line bg-white p-5 shadow-soft">
          <h2 className="font-semibold">No active calendar prep</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">{agenda.insight}</p>
        </div>
      ) : null}

      <div className="grid gap-4">
        {visibleTravelRisks(agenda, hiddenIds).map((risk) => {
          const id = taskStateId("travel", risk.id);
          return (
          <article className="rounded-md border border-coral/40 bg-white p-5 shadow-soft" key={risk.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-coral/10">
                    <ShieldAlert size={18} className="text-coral" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-coral">{risk.severity} travel check</p>
                    <h3 className="mt-1 text-lg font-semibold">{risk.title}</h3>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink/65">{risk.reason}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {risk.when ? <span className="rounded-md bg-panel px-3 py-1 text-xs font-semibold">{risk.when}</span> : null}
                  {risk.location ? <span className="rounded-md bg-panel px-3 py-1 text-xs font-semibold">{risk.location}</span> : null}
                </div>
                <div className="mt-4 grid gap-2">
                  {risk.checks.map((check) => (
                    <div className="rounded-md bg-panel p-3 text-sm text-ink/70" key={check}>
                      {check}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {risk.event?.html_link ? (
                  <a className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold" href={risk.event.html_link} rel="noreferrer" target="_blank">
                    <Plane size={16} /> Open trip
                  </a>
                ) : null}
                <TaskButtons id={id} savingId={savingId} onMark={markTask} />
              </div>
            </div>
          </article>
          );
        })}

        {visiblePrepTasks(agenda, hiddenIds).map((task) => {
          const id = taskStateId("calendar-task", task.id);
          return (
          <article className="rounded-md border border-line bg-white p-5 shadow-soft" key={task.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-panel">
                    <CalendarDays size={18} className="text-teal" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">{task.when || "Upcoming"}</p>
                    <h3 className="mt-1 text-lg font-semibold">{task.title}</h3>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`rounded-md px-3 py-1 text-xs font-semibold ${task.priority === "high" ? "bg-coral/10 text-coral" : "bg-teal/10 text-teal"}`}>
                    {task.priority}
                  </span>
                  {task.event?.location ? <span className="rounded-md bg-panel px-3 py-1 text-xs font-semibold">{task.event.location}</span> : null}
                </div>
                <div className="mt-4 grid gap-2">
                  {task.steps.map((step) => (
                    <div className="rounded-md bg-panel p-3 text-sm text-ink/70" key={step}>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {task.event?.html_link ? (
                  <a className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold" href={task.event.html_link} rel="noreferrer" target="_blank">
                    <CalendarCheck size={16} /> Open event
                  </a>
                ) : null}
                <TaskButtons id={id} savingId={savingId} onMark={markTask} />
              </div>
            </div>
          </article>
          );
        })}
      </div>

      <CompletedTasks items={stateItems} prefixLabels={[["travel-", "Travel"], ["calendar-task-", "Calendar"]]} />
    </section>
  );
}

function visibleTravelRisks(agenda: CalendarAgenda | null, hiddenIds: Set<string>) {
  return (agenda?.travel_guardian.risks ?? []).filter((risk) => !hiddenIds.has(taskStateId("travel", risk.id)));
}

function visiblePrepTasks(agenda: CalendarAgenda | null, hiddenIds: Set<string>) {
  return (agenda?.prep_tasks ?? []).filter((task) => !hiddenIds.has(taskStateId("calendar-task", task.id)));
}

function TaskButtons({ id, onMark, savingId }: { id: string; onMark: (id: string, status: "done" | "snoozed") => void; savingId: string | null }) {
  const saving = savingId === id;
  return (
    <>
      <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold disabled:opacity-45" disabled={saving} onClick={() => onMark(id, "done")} type="button">
        {saving ? "Saving..." : "Done"}
      </button>
      <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold disabled:opacity-45" disabled={saving} onClick={() => onMark(id, "snoozed")} type="button">
        Snooze
      </button>
    </>
  );
}

function CompletedTasks({ items, prefixLabels }: { items: Record<string, TaskStateItem>; prefixLabels: Array<[string, string]> }) {
  const completed = Object.values(items).filter((item) => prefixLabels.some(([prefix]) => item.id.startsWith(prefix)));
  if (!completed.length) return null;
  return (
    <details className="rounded-md border border-line bg-white p-4 shadow-soft">
      <summary className="cursor-pointer text-sm font-semibold">Completed / snoozed calendar tasks ({completed.length})</summary>
      <div className="mt-3 grid gap-2">
        {completed.map((item) => {
          const label = prefixLabels.find(([prefix]) => item.id.startsWith(prefix))?.[1] ?? "Task";
          return (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-panel p-3 text-sm" key={item.id}>
              <span>{label}: {item.id.replace(/^travel-|^calendar-task-/, "")}</span>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-ink/55">{item.status}</span>
            </div>
          );
        })}
      </div>
    </details>
  );
}
