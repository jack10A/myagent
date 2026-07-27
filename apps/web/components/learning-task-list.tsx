"use client";

import { BookOpen, CheckCircle2, ExternalLink, RefreshCw, Rocket, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { getLearning, updateLearningStatus, type LearningItem, type LearningTask } from "@/lib/learning";

export function LearningTaskList() {
  const [tasks, setTasks] = useState<LearningTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getLearning();
      setTasks(data.tasks);
    } catch {
      setError("Could not load learning tasks. Start the backend, then refresh.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function setStatus(id: string, status: LearningItem["status"]) {
    setSavingId(id);
    setError(null);
    try {
      const data = await updateLearningStatus(id, status);
      setTasks(data.tasks);
    } catch {
      setError("Could not update learning progress.");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <div className="rounded-md border border-line bg-white p-5 text-sm text-ink/65 shadow-soft">Loading learning tasks...</div>;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-white p-4 shadow-soft">
        <div>
          <h2 className="font-semibold">Learning tasks</h2>
          <p className="mt-1 text-sm text-ink/60">Tracked courses, videos, and portfolio practice from Growth.</p>
        </div>
        <button
          aria-label="Refresh learning tasks"
          className="flex h-10 w-10 items-center justify-center rounded-md border border-line"
          onClick={() => void load()}
          title="Refresh learning tasks"
          type="button"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      {error ? <div className="rounded-md border border-coral/50 bg-coral/10 p-4 text-sm text-coral">{error}</div> : null}

      {!tasks.length ? (
        <div className="rounded-md border border-line bg-white p-5 shadow-soft">
          <h2 className="font-semibold">No learning tasks yet</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            Open Growth and track a course, YouTube search, or practice project. MyAgent will turn it into a weekly plan here.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4">
        {tasks.map((task) => (
          <article className="rounded-md border border-line bg-white p-5 shadow-soft" key={task.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-panel">
                    <BookOpen size={18} className="text-teal" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">
                      {task.provider} · {task.type}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">{task.title}</h3>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-md bg-panel px-3 py-1">{task.priority}% priority</span>
                  <span className="rounded-md bg-teal/10 px-3 py-1 text-teal">{task.status.replaceAll("_", " ")}</span>
                </div>

                <div className="mt-4 rounded-md bg-panel p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">{task.next_step.day}</p>
                  <p className="mt-2 text-sm leading-6 text-ink/70">{task.next_step.task}</p>
                </div>

                <details className="mt-3 rounded-md border border-line p-4">
                  <summary className="cursor-pointer text-sm font-semibold">7-day plan</summary>
                  <div className="mt-3 grid gap-2">
                    {task.weekly_plan.map((step) => (
                      <div className="rounded-md bg-panel p-3 text-sm" key={`${task.id}-${step.day}`}>
                        <span className="font-semibold">{step.day}: </span>
                        <span className="text-ink/65">{step.task}</span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>

              <div className="flex flex-wrap gap-2 lg:max-w-48 lg:justify-end">
                <button
                  className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-45"
                  disabled={savingId === task.id}
                  onClick={() => void setStatus(task.id, "learning")}
                  type="button"
                >
                  <Rocket size={16} /> Start
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold disabled:opacity-45"
                  disabled={savingId === task.id}
                  onClick={() => void setStatus(task.id, "completed")}
                  type="button"
                >
                  <CheckCircle2 size={16} /> Done
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold disabled:opacity-45"
                  disabled={savingId === task.id}
                  onClick={() => void setStatus(task.id, "portfolio")}
                  type="button"
                >
                  <Trophy size={16} /> Portfolio
                </button>
                {task.url ? (
                  <a className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold" href={task.url} rel="noreferrer" target="_blank">
                    Open <ExternalLink size={14} />
                  </a>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
