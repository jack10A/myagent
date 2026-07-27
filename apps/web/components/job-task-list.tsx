"use client";

import { BriefcaseBusiness, CheckCircle2, ExternalLink, Mail, RefreshCw, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { getJobs, updateJobStatus, type JobItem, type JobTask } from "@/lib/jobs";

export function JobTaskList() {
  const [tasks, setTasks] = useState<JobTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getJobs();
      setTasks(data.tasks);
    } catch {
      setError("Could not load job tasks. Start the backend, then refresh.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function setStatus(id: string, status: JobItem["status"]) {
    setSavingId(id);
    setError(null);
    try {
      const data = await updateJobStatus(id, status);
      setTasks(data.tasks);
    } catch {
      setError("Could not update job progress.");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <div className="rounded-md border border-line bg-white p-5 text-sm text-ink/65 shadow-soft">Loading job tasks...</div>;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-white p-4 shadow-soft">
        <div>
          <h2 className="font-semibold">Job application tasks</h2>
          <p className="mt-1 text-sm text-ink/60">Tracked job matches from Growth, with prep steps and outreach drafts.</p>
        </div>
        <button aria-label="Refresh job tasks" className="flex h-10 w-10 items-center justify-center rounded-md border border-line" onClick={() => void load()} title="Refresh job tasks" type="button">
          <RefreshCw size={17} />
        </button>
      </div>

      {error ? <div className="rounded-md border border-coral/50 bg-coral/10 p-4 text-sm text-coral">{error}</div> : null}

      {!tasks.length ? (
        <div className="rounded-md border border-line bg-white p-5 shadow-soft">
          <h2 className="font-semibold">No job tasks yet</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">Open Growth and track a job from Job Radar.</p>
        </div>
      ) : null}

      <div className="grid gap-4">
        {tasks.map((task) => (
          <article className="rounded-md border border-line bg-white p-5 shadow-soft" key={task.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-panel">
                    <BriefcaseBusiness size={18} className="text-teal" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">{task.company_type}</p>
                    <h3 className="mt-1 text-lg font-semibold">{task.title}</h3>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-md bg-gold/10 px-3 py-1 text-gold">{task.match_score}% match</span>
                  <span className="rounded-md bg-teal/10 px-3 py-1 text-teal">{task.status}</span>
                </div>

                <div className="mt-4 rounded-md bg-panel p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">Next step</p>
                  <p className="mt-2 text-sm leading-6 text-ink/70">{task.next_step}</p>
                </div>

                <details className="mt-3 rounded-md border border-line p-4">
                  <summary className="cursor-pointer text-sm font-semibold">Prep package</summary>
                  <div className="mt-3 grid gap-3">
                    {task.apply_prep.map((step) => (
                      <div className="rounded-md bg-panel p-3 text-sm text-ink/70" key={step}>{step}</div>
                    ))}
                    <div className="rounded-md bg-panel p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">Talking points</p>
                      <ul className="mt-2 space-y-2 text-sm leading-6 text-ink/70">
                        {task.talking_points.map((point) => <li key={point}>{point}</li>)}
                      </ul>
                    </div>
                    <pre className="whitespace-pre-wrap rounded-md bg-panel p-3 font-sans text-sm leading-6 text-ink/70">{task.cover_email}</pre>
                  </div>
                </details>
              </div>

              <div className="flex flex-wrap gap-2 lg:max-w-56 lg:justify-end">
                <button className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-45" disabled={savingId === task.id} onClick={() => void setStatus(task.id, "preparing")} type="button">
                  <Mail size={16} /> Prep
                </button>
                <button className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold disabled:opacity-45" disabled={savingId === task.id} onClick={() => void setStatus(task.id, "applied")} type="button">
                  <Send size={16} /> Applied
                </button>
                <button className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold disabled:opacity-45" disabled={savingId === task.id} onClick={() => void setStatus(task.id, "rejected")} type="button">
                  <CheckCircle2 size={16} /> Archive
                </button>
                {Object.entries(task.search_links ?? {}).map(([source, url]) => (
                  <a className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold" href={url} key={source} rel="noreferrer" target="_blank">
                    {source} <ExternalLink size={14} />
                  </a>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
