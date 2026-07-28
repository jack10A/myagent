"use client";

import Link from "next/link";
import { BriefcaseBusiness, CheckCircle2, Copy, ExternalLink, FileText, Mail, RefreshCw, Send, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { getJobs, prepareJobOutreach, updateJobStatus, type JobItem, type JobTask } from "@/lib/jobs";

export function JobTaskList() {
  const [tasks, setTasks] = useState<JobTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [outreachId, setOutreachId] = useState<string | null>(null);
  const [preparedApprovalId, setPreparedApprovalId] = useState<string | null>(null);
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

  async function prepareOutreach(id: string, recipient?: string) {
    setOutreachId(id);
    setError(null);
    try {
      const data = await prepareJobOutreach(id, recipient);
      setPreparedApprovalId(data.approval.id);
      window.dispatchEvent(new Event("myagent:approval-created"));
      await setStatus(id, "preparing");
    } catch {
      setError("Could not prepare outreach. Make sure the backend is running.");
    } finally {
      setOutreachId(null);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("Clipboard permission was blocked by the browser.");
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
      {preparedApprovalId ? (
        <div className="flex flex-col gap-3 rounded-md border border-teal/40 bg-teal/10 p-4 text-sm text-ink/70 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <span>Outreach draft is waiting in Approval Inbox. Review the recipient and body before approving.</span>
          <Link className="w-fit rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" href="#approval-inbox">
            Review approvals
          </Link>
        </div>
      ) : null}

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

                <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
                  <PrepPanel icon={<FileText size={16} className="text-teal" />} title="Application checklist">
                    <div className="grid gap-2">
                      {task.apply_prep.map((step, index) => (
                        <div className="flex gap-3 rounded-md bg-panel p-3 text-sm text-ink/70" key={step}>
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-teal">{index + 1}</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </PrepPanel>

                  <PrepPanel icon={<Sparkles size={16} className="text-gold" />} title="Interview talking points">
                    <ul className="space-y-2 text-sm leading-6 text-ink/70">
                      {task.talking_points.map((point) => <li key={point}>{point}</li>)}
                    </ul>
                  </PrepPanel>
                </div>

                <div className="mt-4 rounded-md border border-gold/35 bg-gold/10 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Recruiter email draft</p>
                      <p className="mt-1 text-sm text-ink/60">Prepare this as a Guardian approval before Gmail creates a draft.</p>
                    </div>
                    <button
                      className="inline-flex w-fit items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold"
                      onClick={() => void copyText(task.cover_email)}
                      type="button"
                    >
                      <Copy size={14} />
                      Copy
                    </button>
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap rounded-md bg-white p-4 font-sans text-sm leading-6 text-ink/75">{task.cover_email}</pre>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 lg:max-w-56 lg:justify-end">
                <button className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-45" disabled={savingId === task.id || outreachId === task.id} onClick={() => void prepareOutreach(task.id, task.recruiter_email)} type="button">
                  <Mail size={16} /> {outreachId === task.id ? "Preparing..." : "Prepare outreach"}
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

function PrepPanel({ children, icon, title }: { children: React.ReactNode; icon: React.ReactNode; title: string }) {
  return (
    <div className="rounded-md border border-line p-4">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
