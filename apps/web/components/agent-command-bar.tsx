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
  ExternalLink,
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
              <CommandResultSummary trace={trace} />
              <div className="mt-5 flex flex-wrap gap-2">
                <CommandResultActions trace={trace} fallback={destination} />
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
              <div className="mt-4 rounded-md bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">Saved automatically</p>
                <p className="mt-2 text-sm leading-6 text-ink/65">
                  This command result was saved into Agent Activity with the full collaboration trace.
                </p>
                <Link className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-teal" href="/activity">
                  Open Activity
                  <ArrowRight size={14} />
                </Link>
              </div>
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

function CommandResultSummary({ trace }: { trace: DemoTrace }) {
  const created = describeCreatedThings(trace);
  const agents = trace.agent_messages.map((message) => formatAgent(message.agent));
  const next = nextStepForTrace(trace);
  return (
    <div>
      <div className="flex items-center gap-2 text-teal">
        <CheckCircle2 size={18} />
        <p className="text-xs font-semibold uppercase tracking-[0.18em]">Command result</p>
      </div>
      <h3 className="mt-3 text-lg font-semibold">{trace.recommendation.title}</h3>
      <div className="mt-4 grid gap-3">
        <ResultRow label="Understood" value={trace.command || trace.situation.description} />
        <ResultRow label="Agents used" value={agents.slice(0, 5).join(" -> ")} />
        <ResultRow label="Created" value={created} />
        <ResultRow label="Next step" value={next} />
      </div>
      <p className="mt-4 text-sm leading-6 text-ink/65">{trace.recommendation.rationale}</p>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-panel p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className="mt-1 text-sm leading-6 text-ink/75">{value}</p>
    </div>
  );
}

function CommandResultActions({ fallback, trace }: { fallback?: { href: string; label: string }; trace: DemoTrace }) {
  const links = actionLinksForTrace(trace, fallback);
  return (
    <>
      {links.map((link, index) => (
        <Link
          className={index === 0 ? "inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" : "inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold"}
          href={link.href}
          key={`${link.href}-${link.label}`}
        >
          {link.label}
          {link.external ? <ExternalLink size={14} /> : <ArrowRight size={15} />}
        </Link>
      ))}
    </>
  );
}

function actionLinksForTrace(trace: DemoTrace, fallback?: { href: string; label: string }) {
  const links: Array<{ href: string; label: string; external?: boolean }> = [];
  const actionTypes = new Set(trace.actions.map((action) => action.type));

  if (trace.approval || trace.guardian.approval_required || actionTypes.has("request_approval")) {
    links.push({ href: "/tasks#approval-inbox", label: trace.approval ? "Open saved approval" : "Review approval" });
  }
  if (actionTypes.has("draft_email")) links.push({ href: "/tasks#approval-inbox", label: "Review email draft" });
  if (actionTypes.has("draft_calendar_event")) links.push({ href: "/tasks#approval-inbox", label: "Review calendar draft" });
  if (actionTypes.has("create_prep_tasks") || actionTypes.has("create_travel_tasks") || actionTypes.has("review_conflicts")) links.push({ href: "/tasks", label: "Open related tasks" });
  if (actionTypes.has("open_capture") || trace.intent === "capture_request") links.push({ href: "/capture", label: "Open Capture" });
  if (actionTypes.has("open_health_check_in") || trace.intent === "health_request") links.push({ href: "/health", label: "Open Health" });
  if (actionTypes.has("suggest_job_search") || actionTypes.has("update_growth_plan") || trace.intent === "career_request") links.push({ href: "/growth", label: "Open Growth" });
  if (actionTypes.has("open_guardian_map") || trace.intent === "emergency_alert") links.push({ href: "/map", label: "Open Guardian Map" });
  links.push({ href: "/activity", label: "View trace" });

  if (fallback && !links.some((link) => link.href === fallback.href)) links.unshift({ href: fallback.href, label: fallback.label });
  return dedupeLinks(links).slice(0, 4);
}

function dedupeLinks(links: Array<{ href: string; label: string; external?: boolean }>) {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.href}-${link.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function describeCreatedThings(trace: DemoTrace) {
  const actionTypes = new Set(trace.actions.map((action) => action.type));
  const parts: string[] = [];
  if (trace.approval || actionTypes.has("request_approval")) parts.push("approval-ready action");
  if (actionTypes.has("draft_email")) parts.push("email draft");
  if (actionTypes.has("draft_calendar_event")) parts.push("calendar event draft");
  if (actionTypes.has("create_prep_tasks")) parts.push("meeting prep tasks");
  if (actionTypes.has("create_travel_tasks")) parts.push("travel checks");
  if (actionTypes.has("review_conflicts")) parts.push("conflict review");
  if (actionTypes.has("show_travel_guardian")) parts.push("Travel Guardian briefing");
  if (actionTypes.has("open_capture")) parts.push("capture workspace handoff");
  if (actionTypes.has("open_health_check_in")) parts.push("health check-in handoff");
  if (actionTypes.has("suggest_job_search")) parts.push("career next step");
  if (actionTypes.has("show_insight") || actionTypes.has("save_to_memory")) parts.push("memory insight");
  return parts.length ? parts.join(", ") : "one recommendation and full activity trace";
}

function nextStepForTrace(trace: DemoTrace) {
  if (trace.approval) return "Open the Approval Inbox and approve, edit, or reject it.";
  if (trace.guardian.approval_required) return "Review the guarded action before anything external changes.";
  if (trace.intent === "capture_request") return "Open Capture and paste notes, a transcript, or a YouTube link.";
  if (trace.intent === "health_request") return "Open Health and add today’s check-in or sync data.";
  if (trace.intent === "career_request") return "Open Growth to track a course, job, or profile improvement.";
  if (trace.intent === "emergency_alert") return "Open Guardian Map and run a live location check.";
  return "Open the linked page or Activity trace to continue.";
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
