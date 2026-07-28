"use client";

import { BriefcaseBusiness, CalendarClock, ExternalLink, Mail, RefreshCw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getJobs, updateJobDetails, updateJobStatus, type JobDetailsUpdate, type JobItem, type JobStatus } from "@/lib/jobs";

const columns: Array<{ status: JobStatus; label: string; hint: string }> = [
  { status: "saved", label: "Saved", hint: "Interesting roles" },
  { status: "preparing", label: "Preparing", hint: "CV and outreach" },
  { status: "applied", label: "Applied", hint: "Waiting for response" },
  { status: "interview", label: "Interview", hint: "Prep and follow-up" },
  { status: "offer", label: "Offer", hint: "Decision stage" },
  { status: "rejected", label: "Archived", hint: "Learn and move on" }
];

export function ApplicationTrackerBoard() {
  const [items, setItems] = useState<JobItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<JobDetailsUpdate>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getJobs();
      setItems(data.items);
      const first = data.items[0];
      if (first && !selectedId) {
        selectItem(first);
      }
    } catch {
      setError("Could not load application tracker. Start the backend, then refresh.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? items[0], [items, selectedId]);

  function selectItem(item: JobItem) {
    setSelectedId(item.id);
    setDraft({
      company_name: item.company_name || "",
      job_url: item.job_url || "",
      recruiter_email: item.recruiter_email || "",
      follow_up_at: item.follow_up_at || "",
      notes: item.notes || ""
    });
  }

  async function moveJob(item: JobItem, status: JobStatus) {
    setSaving(item.id);
    setError(null);
    try {
      const data = await updateJobStatus(item.id, status);
      setItems((current) => current.map((existing) => (existing.id === item.id ? data.item : existing)));
    } catch {
      setError("Could not move this application.");
    } finally {
      setSaving(null);
    }
  }

  async function saveDetails() {
    if (!selected) return;
    setSaving(selected.id);
    setError(null);
    try {
      const data = await updateJobDetails(selected.id, draft);
      setItems((current) => current.map((item) => (item.id === selected.id ? data.item : item)));
    } catch {
      setError("Could not save application details.");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return <div className="rounded-md border border-line bg-white p-5 text-sm text-ink/65 shadow-soft">Loading application tracker...</div>;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-md border border-line bg-white p-4 shadow-soft md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BriefcaseBusiness size={18} className="text-teal" />
            <h2 className="font-semibold">Application tracker</h2>
          </div>
          <p className="mt-1 text-sm text-ink/60">Track every internship from saved lead to offer, with follow-ups and recruiter notes.</p>
        </div>
        <button aria-label="Refresh application tracker" className="flex h-10 w-10 items-center justify-center rounded-md border border-line" onClick={() => void load()} title="Refresh application tracker" type="button">
          <RefreshCw size={17} />
        </button>
      </div>

      {error ? <div className="rounded-md border border-coral/50 bg-coral/10 p-4 text-sm text-coral">{error}</div> : null}

      {!items.length ? (
        <div className="rounded-md border border-line bg-white p-5 shadow-soft">
          <h2 className="font-semibold">No applications tracked yet</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">Open Growth, search for an internship, and click Track.</p>
        </div>
      ) : null}

      {items.length ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {columns.map((column) => {
              const columnItems = items.filter((item) => item.status === column.status);
              return (
                <div className="min-h-44 rounded-md border border-line bg-white p-3 shadow-soft" key={column.status}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{column.label}</p>
                      <p className="mt-1 text-xs text-ink/50">{column.hint}</p>
                    </div>
                    <span className="rounded-md bg-panel px-2 py-1 text-xs font-semibold">{columnItems.length}</span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {columnItems.map((item) => (
                      <button
                        className={`rounded-md border p-3 text-left transition ${selected?.id === item.id ? "border-teal bg-teal/10" : "border-line bg-panel hover:bg-white"}`}
                        key={item.id}
                        onClick={() => selectItem(item)}
                        type="button"
                      >
                        <p className="text-sm font-semibold leading-5">{item.job.title}</p>
                        <p className="mt-1 text-xs text-ink/55">{item.company_name || item.job.company_type}</p>
                        {item.follow_up_at ? (
                          <p className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${isFollowUpDue(item.follow_up_at) ? "text-coral" : "text-gold"}`}>
                            <CalendarClock size={12} />
                            {isFollowUpDue(item.follow_up_at) ? "Due: " : ""}
                            {item.follow_up_at}
                          </p>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {selected ? (
            <aside className="rounded-md border border-line bg-white p-4 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">Selected application</p>
              <h3 className="mt-2 font-semibold">{selected.job.title}</h3>
              <p className="mt-1 text-xs text-ink/55">{selected.job.location}</p>

              <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
                Stage
                <select
                  className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm normal-case tracking-normal outline-none focus:border-teal"
                  disabled={saving === selected.id}
                  onChange={(event) => void moveJob(selected, event.target.value as JobStatus)}
                  value={selected.status}
                >
                  {columns.map((column) => <option key={column.status} value={column.status}>{column.label}</option>)}
                </select>
              </label>

              <TrackerField label="Company" onChange={(value) => setDraft((current) => ({ ...current, company_name: value }))} value={draft.company_name || ""} />
              <TrackerField label="Job post URL" onChange={(value) => setDraft((current) => ({ ...current, job_url: value }))} value={draft.job_url || ""} />
              <TrackerField label="Recruiter email" onChange={(value) => setDraft((current) => ({ ...current, recruiter_email: value }))} value={draft.recruiter_email || ""} />
              <TrackerField label="Follow-up date" onChange={(value) => setDraft((current) => ({ ...current, follow_up_at: value }))} type="date" value={draft.follow_up_at || ""} />
              {selected.follow_up_at && isFollowUpDue(selected.follow_up_at) ? (
                <div className="mt-3 rounded-md border border-coral/40 bg-coral/10 p-3 text-sm text-coral">
                  Follow-up is due. MyAgent will surface this in Notifications.
                </div>
              ) : null}

              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
                Notes
                <textarea
                  className="mt-2 min-h-28 w-full resize-y rounded-md border border-line px-3 py-2 text-sm leading-6 normal-case tracking-normal outline-none focus:border-teal"
                  onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Why this role matters, recruiter name, interview notes..."
                  value={draft.notes || ""}
                />
              </label>

              <div className="mt-4 flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-45" disabled={saving === selected.id} onClick={() => void saveDetails()} type="button">
                  <Save size={15} />
                  Save
                </button>
                {selected.job_url ? (
                  <a className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold" href={selected.job_url} rel="noreferrer" target="_blank">
                    Open post
                    <ExternalLink size={14} />
                  </a>
                ) : null}
                {selected.recruiter_email ? (
                  <a className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold" href={`mailto:${selected.recruiter_email}`}>
                    Email
                    <Mail size={14} />
                  </a>
                ) : null}
              </div>
            </aside>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function isFollowUpDue(value: string) {
  const followUp = new Date(`${value}T00:00:00`);
  if (Number.isNaN(followUp.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return followUp.getTime() <= today.getTime();
}

function TrackerField({ label, onChange, type = "text", value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return (
    <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
      {label}
      <input
        className="mt-2 h-10 w-full rounded-md border border-line px-3 text-sm normal-case tracking-normal outline-none focus:border-teal"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}
