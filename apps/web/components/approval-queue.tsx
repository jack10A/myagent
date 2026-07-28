"use client";

import { AlertTriangle, BrainCircuit, Check, ChevronDown, ChevronUp, Clock3, Mail, Pencil, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getApprovals,
  updateApprovalDraft,
  updateApprovalStatus,
  type ApprovalItem,
  type ApprovalStatus
} from "@/lib/approvals";

const activeStatuses = new Set<ApprovalStatus>(["pending", "editing"]);

export function ApprovalQueue() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadApprovals() {
    setLoading(true);
    setError(null);
    try {
      const data = await getApprovals();
      setItems(data.approvals);
    } catch {
      setError("Approval API is not reachable. Start the backend, then refresh this page.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApprovals();
    window.addEventListener("myagent:approval-created", loadApprovals);
    return () => window.removeEventListener("myagent:approval-created", loadApprovals);
  }, []);

  async function changeStatus(id: string, status: ApprovalStatus) {
    setSavingId(id);
    setError(null);
    try {
      const updated = await updateApprovalStatus(id, status);
      setItems((current) => {
        if (status === "rejected") return current.filter((item) => item.id !== id);
        return current.map((item) => (item.id === id ? updated : item));
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update this approval.");
    } finally {
      setSavingId(null);
    }
  }

  const visibleItems = items.filter((item) => item.status !== "rejected");
  const activeCount = visibleItems.filter((item) => activeStatuses.has(item.status)).length;
  const approvalCount = visibleItems.filter((item) => item.guardian.approval_required).length;
  const guardedActions = visibleItems.reduce((total, item) => total + item.actions.length, 0);

  if (loading) {
    return <div className="rounded-md border border-line bg-white p-5 text-sm text-ink/65 shadow-soft">Loading real approval queue...</div>;
  }

  return (
    <div className="space-y-4 scroll-mt-20" id="approval-inbox">
      <div className="grid gap-4 md:grid-cols-3">
        <QueueMetric label="Pending" value={String(activeCount)} />
        <QueueMetric label="Need approval" value={String(approvalCount)} />
        <QueueMetric label="Guarded actions" value={String(guardedActions)} />
      </div>

      {error ? <div className="rounded-md border border-coral/50 bg-coral/10 p-4 text-sm text-coral">{error}</div> : null}

      <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-white p-4 shadow-soft">
        <div>
          <h2 className="font-semibold">Approval inbox</h2>
          <p className="mt-1 text-sm text-ink/60">Commands from the dashboard appear here when Guardian requires approval.</p>
        </div>
        <button
          aria-label="Refresh approvals"
          className="flex h-10 w-10 items-center justify-center rounded-md border border-line"
          onClick={() => void loadApprovals()}
          title="Refresh approvals"
          type="button"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      {!visibleItems.length ? (
        <div className="rounded-md border border-line bg-white p-5 shadow-soft">
          <h2 className="font-semibold">No approvals yet</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            Go to Dashboard and ask: "Reply to my important email" or "Add 30 min prep before my flight". MyAgent will create an approval here.
          </p>
        </div>
      ) : null}

      {visibleItems.map((item) => (
        <ApprovalCard
          item={item}
          key={item.id}
          onDraftUpdated={(updated) => setItems((current) => current.map((approval) => (approval.id === updated.id ? updated : approval)))}
          onStatus={changeStatus}
          saving={savingId === item.id}
          setError={setError}
        />
      ))}
    </div>
  );
}

function QueueMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ApprovalCard({
  item,
  onDraftUpdated,
  onStatus,
  saving,
  setError
}: {
  item: ApprovalItem;
  onDraftUpdated: (item: ApprovalItem) => void;
  onStatus: (id: string, status: ApprovalStatus) => Promise<void>;
  saving: boolean;
  setError: (message: string | null) => void;
}) {
  const Icon = iconFor(item.recommendation.primary_action_type, item.situation.type);
  const confidence = Math.round((item.recommendation.confidence ?? 0) * 100);
  const draftEmail = item.actions.find((action) => action.type === "draft_email");
  const draftCalendar = item.actions.find((action) => action.type === "draft_calendar_event");
  const [editing, setEditing] = useState(item.status === "editing");
  const [draft, setDraft] = useState(() => draftFields(draftEmail?.payload ?? {}));
  const [calendarDraft, setCalendarDraft] = useState(() => calendarDraftFields(draftCalendar?.payload ?? {}));
  const [savingDraft, setSavingDraft] = useState(false);
  const [showTrace, setShowTrace] = useState(false);

  async function saveDraft() {
    setSavingDraft(true);
    setError(null);
    try {
      const updated = await updateApprovalDraft(item.id, draft);
      onDraftUpdated(updated);
      setEditing(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save draft changes.");
    } finally {
      setSavingDraft(false);
    }
  }

  async function saveCalendarDraft() {
    setSavingDraft(true);
    setError(null);
    try {
      const updated = await updateApprovalDraft(item.id, {
        ...calendarDraft,
        reminders: calendarDraft.reminderLabel
          ? [{ method: "popup", minutes: Number(calendarDraft.reminderMinutes || 10), label: calendarDraft.reminderLabel }]
          : []
      });
      onDraftUpdated(updated);
      setEditing(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save calendar changes.");
    } finally {
      setSavingDraft(false);
    }
  }

  return (
    <article className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-panel">
              <Icon size={18} className={item.situation.severity === "urgent" ? "text-coral" : "text-teal"} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">{formatLabel(item.situation.type || item.intent || "approval")}</p>
              <h2 className="mt-1 text-lg font-semibold">{item.recommendation.title || "Approval needed"}</h2>
            </div>
          </div>

          {item.command ? <p className="mt-4 rounded-md bg-panel p-3 text-sm text-ink/70">"{item.command}"</p> : null}
          <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/65">{item.recommendation.rationale || item.guardian.reason}</p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-md bg-panel px-3 py-1">Guardian: {item.guardian.decision || "reviewed"}</span>
            <span className="rounded-md bg-panel px-3 py-1">Risk: {item.guardian.risk_level || "normal"}</span>
            <span className="rounded-md bg-panel px-3 py-1">{confidence}% confidence</span>
            <span className="rounded-md bg-panel px-3 py-1">{editing ? "editing draft" : item.status}</span>
          </div>

          <ImpactPreview item={item} />
          <ApprovalChecklist item={item} />

          {draftEmail ? (
            editing ? (
              <EmailDraftEditor
                draft={draft}
                onCancel={() => {
                  setDraft(draftFields(draftEmail.payload));
                  setEditing(false);
                }}
                onChange={setDraft}
                onSave={saveDraft}
                saving={savingDraft}
              />
            ) : (
              <EmailDraftPreview payload={{ ...draftEmail.payload, ...draft }} />
            )
          ) : null}

          {draftCalendar ? (
            editing ? (
              <CalendarDraftEditor
                draft={calendarDraft}
                onCancel={() => {
                  setCalendarDraft(calendarDraftFields(draftCalendar.payload));
                  setEditing(false);
                }}
                onChange={setCalendarDraft}
                onSave={saveCalendarDraft}
                saving={savingDraft}
              />
            ) : (
              <CalendarDraftPreview payload={draftCalendar.payload} />
            )
          ) : null}

          {item.actions.some((action) => action.type !== "draft_email") ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {item.actions
                .filter((action) => action.type !== "draft_email")
                .filter((action) => action.type !== "draft_calendar_event")
                .map((action, index) => (
                  <div className="rounded-md border border-line p-3 text-xs" key={`${item.id}-${action.type}-${index}`}>
                    <p className="font-semibold">{formatLabel(action.type)}</p>
                    <p className="mt-1 line-clamp-2 text-ink/55">{payloadPreview(action.payload)}</p>
                  </div>
                ))}
            </div>
          ) : null}

          {item.execution ? (
            <ExecutionResult execution={item.execution} />
          ) : null}

          <ApprovalTimeline item={item} />

          <div className="mt-4 overflow-hidden rounded-md border border-line">
            <button
              className="flex w-full items-center justify-between bg-panel px-4 py-3 text-sm font-semibold"
              onClick={() => setShowTrace((value) => !value)}
              type="button"
            >
              <span className="inline-flex items-center gap-2">
                <BrainCircuit size={16} className="text-gold" />
                Agent trace ({item.agent_messages.length})
              </span>
              {showTrace ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showTrace ? <AgentTrace messages={item.agent_messages} /> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button
            className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-45"
            disabled={saving || savingDraft || item.status === "approved"}
            onClick={() => void onStatus(item.id, "approved")}
            type="button"
          >
            <Check size={16} /> Approve
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold disabled:opacity-45"
            disabled={saving || savingDraft}
            onClick={() => {
              setEditing(true);
              void onStatus(item.id, "editing");
            }}
            type="button"
          >
            <Pencil size={16} /> Edit first
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold disabled:opacity-45"
            disabled={saving || savingDraft}
            onClick={() => void onStatus(item.id, "rejected")}
            type="button"
          >
            <X size={16} /> Reject
          </button>
        </div>
      </div>
    </article>
  );
}

function ImpactPreview({ item }: { item: ApprovalItem }) {
  const actionType = item.recommendation.primary_action_type || item.actions[0]?.type || "guarded action";
  const affected = affectedTarget(item);
  return (
    <section className="mt-4 grid gap-3 rounded-md border border-line bg-panel p-4 md:grid-cols-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">Action</p>
        <p className="mt-1 text-sm font-semibold">{formatLabel(actionType)}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">Affected</p>
        <p className="mt-1 text-sm font-semibold">{affected}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">Result if approved</p>
        <p className="mt-1 text-sm font-semibold">{approvalOutcome(item)}</p>
      </div>
    </section>
  );
}

function ApprovalChecklist({ item }: { item: ApprovalItem }) {
  const checks = [
    item.guardian.approval_required ? "External action requires your consent." : "Guardian marked this as low-risk.",
    item.actions.some((action) => action.type === "draft_email") ? "Gmail will create a draft, not send automatically." : null,
    item.actions.some((action) => action.type === "draft_calendar_event") ? "Google Calendar will be changed only after approval." : null,
    item.actions.some((action) => action.type === "draft_email" || action.type === "draft_calendar_event") ? "You can edit the draft before approving." : null,
    item.agent_messages.length ? "Agent reasoning trace is available before approval." : null,
  ].filter(Boolean) as string[];

  return (
    <section className="mt-4 rounded-md border border-line p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">Before approving</p>
      <div className="mt-3 grid gap-2">
        {checks.map((check) => (
          <div className="flex gap-3 rounded-md bg-panel p-3 text-sm text-ink/70" key={check}>
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-sage" />
            <span>{check}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ApprovalTimeline({ item }: { item: ApprovalItem }) {
  const steps = [
    { label: "Created", detail: formatDate(item.created_at), active: true },
    { label: "Guardian reviewed", detail: item.guardian.reason || "Risk and approval need checked.", active: true },
    { label: "Edited", detail: "Draft changes saved.", active: item.status === "editing" || item.updated_at !== item.created_at },
    { label: item.status === "approved" ? "Approved" : item.status === "rejected" ? "Rejected" : "Waiting", detail: formatDate(item.updated_at), active: item.status === "approved" || item.status === "rejected" },
    { label: "Result", detail: item.execution ? executionMessage(item.execution) : "No external change yet.", active: Boolean(item.execution) },
  ];

  return (
    <section className="mt-4 rounded-md border border-line p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">Approval timeline</p>
      <div className="mt-3 grid gap-2 md:grid-cols-5">
        {steps.map((step) => (
          <div className={`rounded-md p-3 text-xs ${step.active ? "bg-sage/10 text-ink" : "bg-panel text-ink/45"}`} key={step.label}>
            <p className="font-semibold">{step.label}</p>
            <p className="mt-1 leading-5">{step.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AgentTrace({ messages }: { messages: ApprovalItem["agent_messages"] }) {
  if (!messages.length) {
    return <p className="bg-white p-4 text-sm text-ink/60">No agent trace saved for this approval.</p>;
  }
  return (
    <div className="grid gap-px bg-line md:grid-cols-2 xl:grid-cols-3">
      {messages.map((message, index) => (
        <div className="bg-white p-4" key={`${message.agent}-${index}`}>
          <p className="text-xs font-semibold text-teal">{index + 1}. {formatAgent(message.agent)}</p>
          <p className="mt-2 text-xs leading-5 text-ink/60">{message.summary}</p>
          {message.depends_on.length ? <p className="mt-2 text-[11px] font-semibold text-ink/40">Depends on: {message.depends_on.map(formatAgent).join(", ")}</p> : null}
        </div>
      ))}
    </div>
  );
}

function EmailDraftPreview({ payload }: { payload: Record<string, unknown> }) {
  const draft = draftFields(payload);
  const snippet = String(payload.snippet || "");
  const selectedReason = String(payload.selected_reason || "");
  const alternatives = Array.isArray(payload.alternatives) ? payload.alternatives as Array<Record<string, unknown>> : [];

  return (
    <section className="mt-4 overflow-hidden rounded-md border border-teal/35 bg-white">
      <div className="border-b border-line bg-teal/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">Email draft preview</p>
      </div>
      <div className="grid gap-px bg-line text-sm">
        <PreviewRow label="To" value={draft.to} />
        <PreviewRow label="Subject" value={draft.subject} />
      </div>
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">What MyAgent will write</p>
        <pre className="mt-3 whitespace-pre-wrap rounded-md bg-panel p-4 font-sans text-sm leading-6 text-ink/75">{draft.body}</pre>
        {snippet ? (
          <div className="mt-3 rounded-md border border-line p-3">
            <p className="text-xs font-semibold text-ink/45">Original email preview</p>
            <p className="mt-2 text-sm leading-6 text-ink/65">{snippet}</p>
          </div>
        ) : null}
        {selectedReason ? (
          <div className="mt-3 rounded-md border border-teal/25 bg-teal/10 p-3">
            <p className="text-xs font-semibold text-teal">Why this email</p>
            <p className="mt-2 text-sm leading-6 text-ink/65">{selectedReason}</p>
          </div>
        ) : null}
        {alternatives.length ? (
          <div className="mt-3 rounded-md border border-line p-3">
            <p className="text-xs font-semibold text-ink/45">Other possible emails</p>
            <div className="mt-2 space-y-2">
              {alternatives.map((alternative, index) => (
                <div className="rounded-md bg-panel p-3 text-xs" key={`${alternative.subject ?? "email"}-${index}`}>
                  <p className="font-semibold">{String(alternative.subject || "No subject")}</p>
                  <p className="mt-1 text-ink/55">{String(alternative.from || "Unknown sender")}</p>
                  <p className="mt-1 text-ink/55">{String(alternative.reason || "Alternative match")}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CalendarDraftPreview({ payload }: { payload: Record<string, unknown> }) {
  const target = isRecord(payload.target_event) ? payload.target_event : null;
  const reminders = Array.isArray(payload.reminders) ? payload.reminders as Array<Record<string, unknown>> : [];
  const conflicts = Array.isArray(payload.conflicts) ? payload.conflicts as Array<Record<string, unknown>> : [];
  return (
    <section className="mt-4 overflow-hidden rounded-md border border-gold/45 bg-white">
      <div className="border-b border-line bg-gold/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Calendar event preview</p>
      </div>
      <div className="grid gap-px bg-line text-sm">
        <PreviewRow label="Title" value={String(payload.title || "MyAgent prep block")} />
        <PreviewRow label="Start" value={String(payload.start || "No start time")} />
        <PreviewRow label="End" value={String(payload.end || "No end time")} />
      </div>
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">What MyAgent will create</p>
        <pre className="mt-3 whitespace-pre-wrap rounded-md bg-panel p-4 font-sans text-sm leading-6 text-ink/75">
          {String(payload.description || "Calendar event prepared by MyAgent.")}
        </pre>
        {target ? (
          <div className="mt-3 rounded-md border border-line p-3">
            <p className="text-xs font-semibold text-ink/45">Target event</p>
            <p className="mt-2 text-sm font-semibold">{String(target.summary || "Upcoming event")}</p>
            <p className="mt-1 text-xs text-ink/55">{String(target.start_label || target.start || "No time")}</p>
            {target.location ? <p className="mt-1 text-xs text-ink/55">{String(target.location)}</p> : null}
          </div>
        ) : null}
        {reminders.length ? (
          <div className="mt-3 rounded-md border border-gold/35 bg-gold/10 p-3">
            <p className="text-xs font-semibold text-gold">Reminder</p>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              {reminders.map((reminder) => reminder.label ? String(reminder.label) : `${String(reminder.minutes)} minutes before`).join(", ")}
            </p>
          </div>
        ) : null}
        {conflicts.length ? <CalendarConflictWarning conflicts={conflicts} /> : null}
      </div>
    </section>
  );
}

function CalendarDraftEditor({
  draft,
  onCancel,
  onChange,
  onSave,
  saving
}: {
  draft: {
    title: string;
    start: string;
    end: string;
    description: string;
    reminderLabel: string;
    reminderMinutes: string;
  };
  onCancel: () => void;
  onChange: (draft: {
    title: string;
    start: string;
    end: string;
    description: string;
    reminderLabel: string;
    reminderMinutes: string;
  }) => void;
  onSave: () => Promise<void>;
  saving: boolean;
}) {
  return (
    <section className="mt-4 overflow-hidden rounded-md border border-gold/45 bg-white">
      <div className="border-b border-line bg-gold/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Edit calendar event</p>
      </div>
      <div className="space-y-3 p-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">Title</span>
          <input className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-teal" onChange={(event) => onChange({ ...draft, title: event.target.value })} value={draft.title} />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">Start</span>
            <input className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-teal" onChange={(event) => onChange({ ...draft, start: event.target.value })} value={draft.start} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">End</span>
            <input className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-teal" onChange={(event) => onChange({ ...draft, end: event.target.value })} value={draft.end} />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">Reminder label</span>
          <input className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-teal" onChange={(event) => onChange({ ...draft, reminderLabel: event.target.value })} placeholder="2026-07-27T23:00:00+02:00" value={draft.reminderLabel} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">Reminder minutes before event</span>
          <input className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-teal" onChange={(event) => onChange({ ...draft, reminderMinutes: event.target.value })} value={draft.reminderMinutes} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">Description</span>
          <textarea className="mt-2 min-h-40 w-full resize-y rounded-md border border-line px-3 py-2 text-sm leading-6 outline-none focus:border-teal" onChange={(event) => onChange({ ...draft, description: event.target.value })} value={draft.description} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-45" disabled={saving} onClick={() => void onSave()} type="button">
            Save changes
          </button>
          <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold" disabled={saving} onClick={onCancel} type="button">
            Cancel
          </button>
        </div>
      </div>
    </section>
  );
}

function CalendarConflictWarning({ conflicts }: { conflicts: Array<Record<string, unknown>> }) {
  return (
    <div className="mt-3 rounded-md border border-coral/45 bg-coral/10 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-coral">Possible conflict before approval</p>
      <div className="mt-2 space-y-2">
        {conflicts.map((conflict, index) => (
          <div className="rounded-md bg-white p-3 text-xs" key={`${conflict.title ?? "conflict"}-${index}`}>
            <p className="font-semibold">{String(conflict.title || "Calendar event")}</p>
            <p className="mt-1 text-ink/55">{String(conflict.start_label || conflict.start || "No time")}</p>
            {conflict.location ? <p className="mt-1 text-ink/55">{String(conflict.location)}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmailDraftEditor({
  draft,
  onCancel,
  onChange,
  onSave,
  saving
}: {
  draft: { to: string; subject: string; body: string };
  onCancel: () => void;
  onChange: (draft: { to: string; subject: string; body: string }) => void;
  onSave: () => Promise<void>;
  saving: boolean;
}) {
  return (
    <section className="mt-4 overflow-hidden rounded-md border border-gold/45 bg-white">
      <div className="border-b border-line bg-gold/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Edit email draft</p>
      </div>
      <div className="space-y-3 p-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">To</span>
          <input
            className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-teal"
            onChange={(event) => onChange({ ...draft, to: event.target.value })}
            value={draft.to}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">Subject</span>
          <input
            className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-teal"
            onChange={(event) => onChange({ ...draft, subject: event.target.value })}
            value={draft.subject}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">Body</span>
          <textarea
            className="mt-2 min-h-56 w-full resize-y rounded-md border border-line px-3 py-2 text-sm leading-6 outline-none focus:border-teal"
            onChange={(event) => onChange({ ...draft, body: event.target.value })}
            value={draft.body}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-45" disabled={saving} onClick={() => void onSave()} type="button">
            Save changes
          </button>
          <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold" disabled={saving} onClick={onCancel} type="button">
            Cancel
          </button>
        </div>
      </div>
    </section>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 bg-white px-4 py-3 sm:grid-cols-[90px_1fr]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className="break-words text-sm text-ink/75">{value}</p>
    </div>
  );
}

function iconFor(actionType?: string, situationType?: string) {
  if (actionType === "send_email" || situationType === "email_assistance") return Mail;
  if (actionType === "update_calendar" || situationType === "schedule_planning") return Clock3;
  if (situationType === "guardian_nearby_alert") return AlertTriangle;
  return ShieldCheck;
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatAgent(value: string) {
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatDate(value?: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function affectedTarget(item: ApprovalItem) {
  const email = item.actions.find((action) => action.type === "draft_email");
  if (email) {
    const fields = draftFields(email.payload);
    return fields.to || "Email recipient";
  }
  const calendar = item.actions.find((action) => action.type === "draft_calendar_event");
  if (calendar) {
    return String(calendar.payload.title || calendar.payload.summary || "Google Calendar");
  }
  return item.situation.title || item.intent || "MyAgent memory";
}

function approvalOutcome(item: ApprovalItem) {
  if (item.actions.some((action) => action.type === "draft_email")) return "Gmail draft will be created";
  if (item.actions.some((action) => action.type === "draft_calendar_event")) return "Calendar event will be created";
  if (item.actions.some((action) => action.type === "draft_calendar_update")) return "Calendar update will be prepared";
  return "MyAgent will apply the guarded action";
}

function payloadPreview(payload: Record<string, unknown>) {
  const values = Object.values(payload).filter(Boolean);
  return values.length ? values.join(" | ") : "Ready for review";
}

function executionMessage(execution: Record<string, unknown>) {
  if (execution.provider === "google_calendar") {
    return `Google Calendar event created: ${String(execution.summary || execution.event_id || "created")}`;
  }
  return `Gmail draft created. Draft ID: ${String(execution.draft_id || "created")}`;
}

function ExecutionResult({ execution }: { execution: Record<string, unknown> }) {
  const link = typeof execution.html_link === "string" ? execution.html_link : null;
  return (
    <div className="mt-4 rounded-md border border-sage/40 bg-sage/10 p-3 text-sm text-sage">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>{executionMessage(execution)}</p>
        {link ? (
          <a className="w-fit rounded-md bg-white px-3 py-2 text-xs font-semibold text-sage" href={link} rel="noreferrer" target="_blank">
            Open calendar event
          </a>
        ) : null}
      </div>
      {execution.calendar_refreshed ? <p className="mt-2 text-xs text-sage/80">Calendar memory refreshed after approval.</p> : null}
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function calendarDraftFields(payload: Record<string, unknown>) {
  const reminders = Array.isArray(payload.reminders) ? payload.reminders as Array<Record<string, unknown>> : [];
  const firstReminder = reminders[0] ?? {};
  return {
    title: String(payload.title || "Calendar event"),
    start: String(payload.start || ""),
    end: String(payload.end || ""),
    description: String(payload.description || ""),
    reminderLabel: String(firstReminder.label || ""),
    reminderMinutes: String(firstReminder.minutes || "")
  };
}

function draftFields(payload: Record<string, unknown>) {
  const request = String(payload.request || "");
  const snippet = String(payload.snippet || "");
  return {
    to: String(payload.to || "No recipient found"),
    subject: normalizeSubject(String(payload.subject || "Follow-up")),
    body: String(payload.body || fallbackDraftBody(request, snippet))
  };
}

function normalizeSubject(subject: string) {
  const cleaned = subject.trim() || "Follow-up";
  return cleaned.toLowerCase().startsWith("re:") ? cleaned : `Re: ${cleaned}`;
}

function fallbackDraftBody(request: string, snippet: string) {
  return [
    "Hi,",
    "",
    "Thanks for your message. I saw this and will follow up properly.",
    "",
    `MyAgent draft context: ${request}`.trim(),
    `Original email preview: ${snippet}`.trim(),
    "",
    "Best,"
  ].join("\n");
}
