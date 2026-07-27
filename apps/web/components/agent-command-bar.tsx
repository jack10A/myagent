"use client";

import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  LoaderCircle,
  MapPin,
  Plane,
  Send,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { FormEvent, useState } from "react";
import { runAgentCommand, type DemoTrace } from "@/lib/orchestration";

const suggestions = [
  "Which important email needs my attention?",
  "How can I improve my career this week?",
  "Prepare me for tomorrow",
  "Add 30 min prep before my flight",
  "Check my trip",
  "Is there an emergency or bad weather near me?",
  "Help me summarize a meeting"
];

const destinations: Record<string, { href: string; label: string }> = {
  email_request: { href: "/connectors", label: "Open Gmail connector" },
  career_request: { href: "/growth", label: "Open Growth" },
  emergency_alert: { href: "/map", label: "Open Guardian Map" },
  capture_request: { href: "/capture", label: "Open Capture" },
  health_request: { href: "/health", label: "Open Health" },
  planning_request: { href: "/tasks", label: "Review plan" }
};

export function AgentCommandBar() {
  const [message, setMessage] = useState("");
  const [trace, setTrace] = useState<DemoTrace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTrace, setShowTrace] = useState(false);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const value = message.trim();
    if (value.length < 3 || loading) return;

    setLoading(true);
    setError(null);
    setTrace(null);
    try {
      setTrace(await runAgentCommand(value));
    } catch {
      setError("MyAgent could not reach the orchestration service. Make sure the backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  }

  const destination = trace?.intent ? destinations[trace.intent] : undefined;

  return (
    <section className="mt-6 overflow-hidden rounded-md border border-ink/15 bg-ink text-white shadow-soft">
      <div className="grid lg:grid-cols-[1fr_auto]">
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2 text-teal-100">
            <Sparkles size={18} />
            <p className="text-xs font-semibold uppercase tracking-[0.18em]">Ask MyAgent</p>
          </div>
          <h2 className="mt-3 text-xl font-semibold sm:text-2xl">What should we handle together?</h2>
          <form className="mt-5" onSubmit={submit}>
            <div className="flex min-h-14 items-end gap-2 rounded-md border border-white/15 bg-white/10 p-2 focus-within:border-white/40">
              <textarea
                aria-label="Ask MyAgent"
                className="max-h-36 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/45"
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submit();
                  }
                }}
                placeholder="Ask about email, career, safety, meetings, health, or your schedule..."
                rows={1}
                value={message}
              />
              <button
                aria-label="Send command"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-ink transition hover:bg-panel disabled:cursor-not-allowed disabled:opacity-40"
                disabled={message.trim().length < 3 || loading}
                title="Send command"
                type="submit"
              >
                {loading ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={18} />}
              </button>
            </div>
          </form>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {suggestions.map((suggestion) => (
              <button
                className="shrink-0 rounded-md border border-white/15 px-3 py-2 text-left text-xs text-white/70 transition hover:border-white/35 hover:text-white"
                key={suggestion}
                onClick={() => setMessage(suggestion)}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
        <div className="hidden w-56 border-l border-white/10 p-6 lg:block">
          <BrainCircuit className="text-gold" size={26} />
          <p className="mt-4 text-sm font-semibold">One request, one answer</p>
          <p className="mt-2 text-xs leading-5 text-white/55">Specialists share context, Memory checks relevance, and Guardian reviews every action.</p>
        </div>
      </div>

      {error ? <p className="border-t border-coral/40 bg-coral/15 px-5 py-4 text-sm text-white">{error}</p> : null}

      {trace ? (
        <div className="border-t border-white/10 bg-white text-ink">
          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <div className="flex items-center gap-2 text-teal">
                <CheckCircle2 size={18} />
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">Recommendation</p>
              </div>
              <h3 className="mt-3 text-lg font-semibold">{trace.recommendation.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink/65">{trace.recommendation.rationale}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {destination ? (
                  <Link className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" href={destination.href}>
                    {destination.label}
                    <ArrowRight size={15} />
                  </Link>
                ) : null}
                {trace.guardian.approval_required ? (
                  <Link className="rounded-md border border-line px-4 py-2 text-sm font-semibold" href="/tasks">
                    {trace.approval ? "Open saved approval" : "Review approval"}
                  </Link>
                ) : null}
              </div>
              <CommandActionPreview trace={trace} />
            </div>
            <div className="rounded-md bg-panel p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-coral" size={18} />
                  <p className="text-sm font-semibold">Guardian review</p>
                </div>
                <span className="text-xs font-semibold text-ink/55">{Math.round(trace.recommendation.confidence * 100)}% confidence</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink/65">{trace.guardian.reason}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-teal">
                {trace.approval
                  ? `Saved to approvals: ${trace.approval.status}`
                  : trace.guardian.approval_required
                    ? "Approval required"
                    : "Read-only action allowed"}
              </p>
            </div>
          </div>

          <button
            className="flex w-full items-center justify-between border-t border-line px-5 py-4 text-sm font-semibold sm:px-6"
            onClick={() => setShowTrace((value) => !value)}
            type="button"
          >
            <span>{trace.agent_messages.length} agents collaborated</span>
            {showTrace ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
          </button>
          {showTrace ? (
            <div className="grid gap-px border-t border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {trace.agent_messages.map((agent, index) => (
                <div className="bg-white p-4" key={`${agent.agent}-${index}`}>
                  <p className="text-xs font-semibold text-teal">{index + 1}. {formatAgent(agent.agent)}</p>
                  <p className="mt-2 text-xs leading-5 text-ink/60">{agent.summary}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function formatAgent(value: string) {
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function CommandActionPreview({ trace }: { trace: DemoTrace }) {
  const agendaAction = trace.actions.find((action) => action.type === "show_agenda");
  const travelAction = trace.actions.find((action) => action.type === "show_travel_guardian");
  const prepAction = trace.actions.find((action) => action.type === "create_prep_tasks");
  const travelTasksAction = trace.actions.find((action) => action.type === "create_travel_tasks");
  const conflictAction = trace.actions.find((action) => action.type === "review_conflicts");
  const prepTasks = Array.isArray(prepAction?.payload.tasks) ? prepAction.payload.tasks as Array<Record<string, unknown>> : [];
  const conflicts = Array.isArray(conflictAction?.payload.conflicts) ? conflictAction.payload.conflicts as Array<Record<string, unknown>> : [];
  const nextEvent = isRecord(agendaAction?.payload.next_event) ? agendaAction?.payload.next_event : null;
  const insight = typeof agendaAction?.payload.insight === "string" ? agendaAction.payload.insight : null;
  const travelPayload = isRecord(travelAction?.payload) ? travelAction.payload : null;
  const travelRisks = Array.isArray(travelPayload?.risks)
    ? travelPayload.risks as Array<Record<string, unknown>>
    : Array.isArray(travelTasksAction?.payload.risks)
      ? travelTasksAction.payload.risks as Array<Record<string, unknown>>
      : [];

  if (!agendaAction && !prepTasks.length && !conflicts.length && !travelRisks.length) return null;

  return (
    <div className="mt-5 rounded-md border border-line bg-white">
      <div className="border-b border-line bg-panel px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={17} className="text-teal" />
          <p className="text-sm font-semibold">Calendar briefing</p>
        </div>
      </div>
      <div className="space-y-3 p-4">
        {travelPayload ? (
          <div className="rounded-md border border-coral/30 bg-coral/10 p-3">
            <div className="flex items-center gap-2 text-coral">
              <Plane size={16} />
              <p className="text-sm font-semibold">Travel Guardian</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-ink/70">{stringValue(travelPayload.summary, "Travel check completed.")}</p>
            {travelRisks[0] ? (
              <div className="mt-3 rounded-md bg-white p-3">
                <p className="text-sm font-semibold">{stringValue(travelRisks[0].title, "Travel risk")}</p>
                <p className="mt-1 text-xs text-ink/55">{stringValue(travelRisks[0].when, "Upcoming")} | {stringValue(travelRisks[0].location, "Route")}</p>
                <p className="mt-2 text-xs leading-5 text-ink/65">{stringValue(travelRisks[0].reason, "Review travel details before leaving.")}</p>
              </div>
            ) : null}
          </div>
        ) : null}
        {insight ? <p className="text-sm leading-6 text-ink/70">{insight}</p> : null}
        {nextEvent ? (
          <div className="rounded-md bg-panel p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">Next event</p>
            <p className="mt-2 text-sm font-semibold">{stringValue(nextEvent.summary, "Untitled event")}</p>
            <p className="mt-1 text-xs text-ink/55">{stringValue(nextEvent.start_label, stringValue(nextEvent.start, "No time"))}</p>
            {nextEvent.location ? <p className="mt-1 text-xs text-ink/55">{stringValue(nextEvent.location, "")}</p> : null}
          </div>
        ) : null}
        {prepTasks.length ? (
          <div className="grid gap-2">
            {prepTasks.slice(0, 3).map((task, index) => {
              const steps = Array.isArray(task.steps) ? task.steps.map((step) => String(step)) : [];
              return (
                <div className="rounded-md border border-line p-3" key={`${task.id ?? task.title ?? "task"}-${index}`}>
                  <div className="flex items-center gap-2">
                    <ClipboardList size={15} className="text-gold" />
                    <p className="text-sm font-semibold">{stringValue(task.title, "Prep task")}</p>
                  </div>
                  <p className="mt-1 text-xs text-ink/55">{stringValue(task.when, "Upcoming")}</p>
                  {steps.length ? <p className="mt-2 text-xs leading-5 text-ink/65">{steps[0]}</p> : null}
                </div>
              );
            })}
          </div>
        ) : null}
        {conflicts.length ? (
          <div className="rounded-md border border-coral/40 bg-coral/10 p-3 text-sm text-coral">
            Possible conflicts found: {conflicts.length}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <Link className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" href="/tasks">
            Open calendar tasks
          </Link>
          <Link className="rounded-md border border-line px-4 py-2 text-sm font-semibold" href="/activity">
            View agent trace
          </Link>
          {travelPayload ? (
            <Link className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold" href="/map">
              <MapPin size={14} />
              Open Guardian Map
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}
