"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BellRing,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  HeartPulse,
  RefreshCw,
  ShieldCheck,
  TimerReset,
  Video
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getApprovals, type ApprovalItem } from "@/lib/approvals";
import { getCalendarAgenda, type CalendarAgenda, type TravelRisk } from "@/lib/calendar";
import { getCaptureTasks, type CaptureTask } from "@/lib/capture";
import { getHealthSummary, type HealthSummary } from "@/lib/health";
import { getJobs, type JobTask } from "@/lib/jobs";
import { getLearning, type LearningTask } from "@/lib/learning";
import { clearTaskState, getTaskState, setTaskStatus, taskStateId } from "@/lib/tasks";

type Focus = "all" | "approval" | "calendar" | "travel" | "career" | "learning" | "health" | "capture";
type Priority = "urgent" | "high" | "medium" | "low";
type DueBucket = "all" | "today" | "tomorrow" | "this_week" | "later";

type ActionItem = {
  id: string;
  kind: Focus;
  dueBucket: Exclude<DueBucket, "all">;
  title: string;
  body: string;
  priority: Priority;
  source: string;
  href: string;
  action: string;
  meta?: string;
};

const priorityRank: Record<Priority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
const dueBucketRank: Record<Exclude<DueBucket, "all">, number> = { today: 4, tomorrow: 3, this_week: 2, later: 1 };

export function TaskCommandCenter() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [agenda, setAgenda] = useState<CalendarAgenda | null>(null);
  const [jobs, setJobs] = useState<JobTask[]>([]);
  const [learning, setLearning] = useState<LearningTask[]>([]);
  const [captures, setCaptures] = useState<CaptureTask[]>([]);
  const [health, setHealth] = useState<HealthSummary | null>(null);
  const [focus, setFocus] = useState<Focus>("all");
  const [dueFilter, setDueFilter] = useState<DueBucket>("all");
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading your action plan...");

  async function load() {
    setLoading(true);
    const [approvalResult, calendarResult, jobResult, learningResult, captureResult, healthResult, taskStateResult] = await Promise.allSettled([
      getApprovals(),
      getCalendarAgenda(),
      getJobs(),
      getLearning(),
      getCaptureTasks(),
      getHealthSummary(),
      getTaskState()
    ]);

    if (approvalResult.status === "fulfilled") setApprovals(approvalResult.value.approvals);
    if (calendarResult.status === "fulfilled") setAgenda(calendarResult.value.agenda);
    if (jobResult.status === "fulfilled") setJobs(jobResult.value.tasks);
    if (learningResult.status === "fulfilled") setLearning(learningResult.value.tasks);
    if (captureResult.status === "fulfilled") setCaptures(captureResult.value.tasks);
    if (healthResult.status === "fulfilled") setHealth(healthResult.value);
    if (taskStateResult.status === "fulfilled") setHiddenIds(new Set(taskStateResult.value.hidden_ids));

    const failed = [approvalResult, calendarResult, jobResult, learningResult, captureResult, healthResult, taskStateResult].filter((result) => result.status === "rejected").length;
    setStatus(failed ? `${7 - failed}/7 task sources loaded. Some agents need the backend or connector data.` : "All task sources loaded.");
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const items = useMemo(() => {
    return buildActions({ approvals, agenda, jobs, learning, captures, health }).filter((item) => !hiddenIds.has(item.id));
  }, [approvals, agenda, jobs, learning, captures, health, hiddenIds]);

  const sourceFiltered = focus === "all" ? items : items.filter((item) => item.kind === focus);
  const filtered = dueFilter === "all" ? sourceFiltered : sourceFiltered.filter((item) => item.dueBucket === dueFilter);
  const top = filtered[0] ?? items[0];
  const urgentCount = items.filter((item) => item.priority === "urgent" || item.priority === "high").length;
  const pendingApprovals = approvals.filter((item) => item.status === "pending" || item.status === "editing").length;
  const activeWork = items.length;
  const rawItemCount = buildActions({ approvals, agenda, jobs, learning, captures, health }).length;
  const hiddenCount = rawItemCount - items.length;
  const bucketCounts = bucketSummary(items);

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft">
        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <BellRing size={19} className="text-coral" />
                  <h2 className="text-lg font-semibold">Task Command Center</h2>
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
                  A single action plan from Guardian, Calendar, Travel, Growth, Learning, Capture, Health, and Approval agents.
                </p>
                <p className="mt-2 text-xs font-semibold text-ink/45">{loading ? "Loading..." : status}</p>
              </div>
              <button
                aria-label="Refresh task command center"
                className="flex h-10 w-10 items-center justify-center rounded-md border border-line"
                onClick={() => void load()}
                title="Refresh task command center"
                type="button"
              >
                <RefreshCw size={17} />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Metric label="High priority" value={String(urgentCount)} tone={urgentCount ? "coral" : "sage"} />
              <Metric label="Approvals" value={String(pendingApprovals)} tone={pendingApprovals ? "gold" : "sage"} />
              <Metric label="Active work" value={String(activeWork)} tone="teal" />
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              <BucketMetric label="Today" value={bucketCounts.today} active={dueFilter === "today"} onClick={() => setDueFilter(dueFilter === "today" ? "all" : "today")} />
              <BucketMetric label="Tomorrow" value={bucketCounts.tomorrow} active={dueFilter === "tomorrow"} onClick={() => setDueFilter(dueFilter === "tomorrow" ? "all" : "tomorrow")} />
              <BucketMetric label="This week" value={bucketCounts.this_week} active={dueFilter === "this_week"} onClick={() => setDueFilter(dueFilter === "this_week" ? "all" : "this_week")} />
              <BucketMetric label="Later" value={bucketCounts.later} active={dueFilter === "later"} onClick={() => setDueFilter(dueFilter === "later" ? "all" : "later")} />
            </div>

            {hiddenCount ? (
              <div className="mt-3 flex flex-col gap-3 rounded-md border border-line bg-panel p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span>{hiddenCount} item(s) completed or snoozed. Detailed task sections still show the source records.</span>
                <button className="inline-flex w-fit items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold" onClick={() => void restoreTasks()} type="button">
                  <TimerReset size={15} />
                  Restore
                </button>
              </div>
            ) : null}

            <div className="mt-5 rounded-md border border-teal/35 bg-teal/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">Do this first</p>
              <h3 className="mt-2 text-xl font-semibold">{top?.title ?? "No active tasks yet"}</h3>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                {top?.body ?? "Track a job, connect Calendar, save a learning item, or create a Capture summary to fill this workspace."}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {top ? <span className={`rounded-md px-2 py-1 text-xs font-semibold ${priorityClass(top.priority)}`}>{top.priority}</span> : null}
                {top ? <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-ink/55">{dueBucketLabel(top.dueBucket)}</span> : null}
                {top ? <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-ink/55">{top.source}</span> : null}
                <Link className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white" href={top?.href ?? "/growth"}>
                  {top?.action ?? "Open Growth"}
                  <ChevronRight size={14} />
                </Link>
                {top ? (
                  <>
                    <button className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold" onClick={() => hideItem(top.id)} type="button">
                      {savingId === top.id ? "Saving..." : "Mark done"}
                    </button>
                    <button className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold" onClick={() => snoozeItem(top.id)} type="button">
                      Snooze
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <aside className="border-t border-line bg-panel p-5 sm:p-6 xl:border-l xl:border-t-0">
            <div className="rounded-md bg-white p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-sage" />
                <h3 className="font-semibold">Guardian rule</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                Tasks can save local progress immediately. Email drafts, calendar events, and outreach still wait for approval.
              </p>
            </div>

            <div className="mt-4 rounded-md bg-white p-4">
              <p className="text-sm font-semibold">Agent load</p>
              <div className="mt-3 grid gap-2">
                <AgentLoad label="Calendar" value={(agenda?.prep_tasks.length ?? 0) + (agenda?.travel_guardian.risks.length ?? 0)} />
                <AgentLoad label="Jobs" value={jobs.length} />
                <AgentLoad label="Learning" value={learning.length} />
                <AgentLoad label="Capture" value={captures.length} />
                <AgentLoad label="Health" value={health?.insights.length ?? 0} />
              </div>
            </div>

            <div className="mt-4 rounded-md bg-white p-4">
              <p className="text-sm font-semibold">Quick starts</p>
              <div className="mt-3 grid gap-2">
                {!jobs.length ? <QuickStart href="/growth" label="Track an internship" /> : null}
                {!learning.length ? <QuickStart href="/growth" label="Track a course" /> : null}
                {!captures.length ? <QuickStart href="/capture" label="Analyze a meeting/video" /> : null}
                {!health?.latest && !health?.latest_fitness ? <QuickStart href="/health" label="Log health check-in" /> : null}
                {jobs.length && learning.length && captures.length && (health?.latest || health?.latest_fitness) ? (
                  <p className="rounded-md bg-panel p-3 text-sm text-ink/60">All major task sources have data.</p>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "approval", "calendar", "travel", "career", "learning", "health", "capture"] as Focus[]).map((item) => (
          <button
            className={`rounded-md border px-3 py-2 text-sm font-semibold ${focus === item ? "border-ink bg-ink text-white" : "border-line bg-white text-ink/70"}`}
            key={item}
            onClick={() => setFocus(item)}
            type="button"
          >
            {formatLabel(item)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "today", "tomorrow", "this_week", "later"] as DueBucket[]).map((item) => (
          <button
            className={`rounded-md border px-3 py-2 text-sm font-semibold ${dueFilter === item ? "border-teal bg-teal text-white" : "border-line bg-white text-ink/70"}`}
            key={item}
            onClick={() => setDueFilter(item)}
            type="button"
          >
            {item === "all" ? "all time" : dueBucketLabel(item)}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {(["today", "tomorrow", "this_week", "later"] as const).map((bucket) => {
          const bucketItems = filtered.filter((item) => item.dueBucket === bucket).slice(0, 6);
          if (!bucketItems.length) return null;
          return (
            <section className="space-y-3" key={bucket}>
              <div className="flex items-center justify-between rounded-md border border-line bg-white px-4 py-3 shadow-soft">
                <h3 className="font-semibold">{dueBucketLabel(bucket)}</h3>
                <span className="rounded-md bg-panel px-2 py-1 text-xs font-semibold text-ink/55">{bucketItems.length} active</span>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                {bucketItems.map((item) => <ActionCard item={item} key={item.id} onDone={hideItem} onSnooze={snoozeItem} saving={savingId === item.id} />)}
              </div>
            </section>
          );
        })}
        {!filtered.length ? (
          <div className="rounded-md border border-dashed border-line bg-white p-5 text-sm text-ink/60 shadow-soft lg:col-span-3">
            No tasks for this filter yet. MyAgent will add them as you track jobs, learning resources, approvals, captures, health, and calendar prep.
          </div>
        ) : null}
      </div>
    </section>
  );

  async function hideItem(id: string) {
    setHiddenIds((current) => new Set([...current, id]));
    setSavingId(id);
    try {
      await setTaskStatus(id, "done");
      window.dispatchEvent(new Event("myagent:task-state-change"));
    } catch {
      setStatus("Task was hidden locally, but the backend did not save it yet.");
    } finally {
      setSavingId(null);
    }
  }

  async function snoozeItem(id: string) {
    setHiddenIds((current) => new Set([...current, id]));
    setSavingId(id);
    try {
      await setTaskStatus(id, "snoozed");
      window.dispatchEvent(new Event("myagent:task-state-change"));
    } catch {
      setStatus("Task was snoozed locally, but the backend did not save it yet.");
    } finally {
      setSavingId(null);
    }
  }

  async function restoreTasks() {
    setHiddenIds(new Set());
    try {
      await clearTaskState();
      window.dispatchEvent(new Event("myagent:task-state-change"));
      setStatus("Task progress restored.");
    } catch {
      setStatus("Tasks restored locally, but the backend reset did not finish.");
    }
  }
}

function buildActions({
  approvals,
  agenda,
  captures,
  health,
  jobs,
  learning
}: {
  approvals: ApprovalItem[];
  agenda: CalendarAgenda | null;
  captures: CaptureTask[];
  health: HealthSummary | null;
  jobs: JobTask[];
  learning: LearningTask[];
}) {
  const actions: ActionItem[] = [];

  approvals
    .filter((item) => item.status === "pending" || item.status === "editing")
    .forEach((item) => {
      actions.push({
        id: taskStateId("approval", item.id),
        kind: "approval",
        dueBucket: "today",
        title: item.recommendation.title || "Approval waiting",
        body: item.guardian.reason || item.recommendation.rationale || "Guardian is waiting for your decision.",
        priority: "high",
        source: "Guardian",
        href: "#approval-inbox",
        action: "Review approval",
        meta: item.status
      });
    });

  (agenda?.conflicts ?? []).forEach((conflict, index) => {
    actions.push({
      id: `calendar-conflict-${index}-${conflict.title}`,
      kind: "calendar",
      dueBucket: dueBucketFromText(conflict.when) ?? "today",
      title: conflict.title || "Calendar conflict",
      body: (conflict.events ?? []).join(" and ") || "Calendar Agent found a possible overlap.",
      priority: "high",
      source: "Calendar Agent",
      href: "#calendar-tasks",
      action: "Resolve conflict",
      meta: conflict.severity
    });
  });

  (agenda?.travel_guardian.risks ?? []).forEach((risk: TravelRisk) => {
    actions.push({
      id: taskStateId("travel", risk.id),
      kind: "travel",
      dueBucket: dueBucketFromIso(risk.event?.start) ?? dueBucketFromText(risk.when) ?? "this_week",
      title: risk.title,
      body: risk.reason,
      priority: risk.severity === "urgent" ? "urgent" : risk.severity === "warning" ? "high" : "medium",
      source: "Travel Guardian",
      href: "#calendar-tasks",
      action: "Open travel prep",
      meta: risk.when
    });
  });

  (agenda?.prep_tasks ?? []).slice(0, 3).forEach((task) => {
    actions.push({
      id: taskStateId("calendar-task", task.id),
      kind: "calendar",
      dueBucket: dueBucketFromIso(task.event?.start) ?? dueBucketFromText(task.when) ?? "this_week",
      title: task.title,
      body: task.steps[0] || "Prepare for this event.",
      priority: task.priority === "high" ? "high" : "medium",
      source: "Meeting Agent",
      href: "#calendar-tasks",
      action: "Open prep"
    });
  });

  jobs.slice(0, 4).forEach((job) => {
    actions.push({
      id: taskStateId("job", job.id),
      kind: "career",
      dueBucket: "this_week",
      title: `Move forward: ${job.title}`,
      body: job.next_step || "Continue application prep.",
      priority: job.status === "interview" || job.status === "offer" ? "high" : "medium",
      source: "Job Agent",
      href: "#job-tasks",
      action: "Open job task",
      meta: `${job.match_score}% match`
    });
  });

  learning.slice(0, 3).forEach((task) => {
    actions.push({
      id: taskStateId("learning", task.id),
      kind: "learning",
      dueBucket: "this_week",
      title: task.title,
      body: task.next_step.task,
      priority: task.priority >= 90 ? "medium" : "low",
      source: "Learning Agent",
      href: "#learning-tasks",
      action: "Open learning"
    });
  });

  captures.slice(0, 3).forEach((task) => {
    actions.push({
      id: taskStateId("capture", task.id),
      kind: "capture",
      dueBucket: "today",
      title: task.title,
      body: `Follow up from ${task.source_title || task.capture_type}.`,
      priority: "medium",
      source: "Capture Agent",
      href: "#capture-tasks",
      action: "Open capture"
    });
  });

  if (health?.urgent_warning) {
    actions.push({
      id: "health-urgent",
      kind: "health",
      dueBucket: "today",
      title: "Health warning",
      body: health.urgent_warning,
      priority: "urgent",
      source: "Health Agent",
      href: "/health",
      action: "Open health"
    });
  }

  (health?.insights ?? []).slice(0, 3).forEach((insight, index) => {
    actions.push({
      id: `health-${index}-${insight.title}`,
      kind: "health",
      dueBucket: insight.severity === "warning" ? "today" : "this_week",
      title: insight.title,
      body: insight.body,
      priority: insight.severity === "warning" ? "medium" : "low",
      source: "Health Agent",
      href: "/health",
      action: "Open health"
    });
  });

  return actions.sort((a, b) => dueBucketRank[b.dueBucket] - dueBucketRank[a.dueBucket] || priorityRank[b.priority] - priorityRank[a.priority]);
}

function ActionCard({
  item,
  onDone,
  onSnooze,
  saving
}: {
  item: ActionItem;
  onDone: (id: string) => void;
  onSnooze: (id: string) => void;
  saving: boolean;
}) {
  const Icon = iconFor(item.kind);
  return (
    <article className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-panel">
          <Icon size={18} className={item.priority === "urgent" || item.priority === "high" ? "text-coral" : "text-teal"} />
        </span>
        <div className="flex flex-wrap justify-end gap-2">
          <span className="rounded-md bg-panel px-2 py-1 text-xs font-semibold text-ink/55">{dueBucketLabel(item.dueBucket)}</span>
          <span className={`rounded-md px-2 py-1 text-xs font-semibold ${priorityClass(item.priority)}`}>{item.priority}</span>
        </div>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{item.source}</p>
      <h3 className="mt-2 font-semibold leading-5">{item.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink/65">{item.body}</p>
      {item.meta ? <p className="mt-3 rounded-md bg-panel px-3 py-2 text-xs font-semibold text-ink/55">{item.meta}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white" href={item.href}>
          {item.action}
          <ChevronRight size={14} />
        </Link>
        <button className="rounded-md border border-line px-3 py-2 text-sm font-semibold" disabled={saving} onClick={() => onDone(item.id)} type="button">
          {saving ? "Saving..." : "Done"}
        </button>
        <button className="rounded-md border border-line px-3 py-2 text-sm font-semibold" disabled={saving} onClick={() => onSnooze(item.id)} type="button">
          Snooze
        </button>
      </div>
    </article>
  );
}

function Metric({ label, tone, value }: { label: string; tone: "coral" | "gold" | "teal" | "sage"; value: string }) {
  const toneClass = {
    coral: "bg-coral/10 text-coral",
    gold: "bg-gold/10 text-gold",
    teal: "bg-teal/10 text-teal",
    sage: "bg-sage/12 text-sage"
  }[tone];
  return (
    <div className="rounded-md bg-panel p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className={`mt-2 inline-flex rounded-md px-3 py-1 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function BucketMetric({ active, label, onClick, value }: { active: boolean; label: string; onClick: () => void; value: number }) {
  return (
    <button
      className={`rounded-md border p-3 text-left transition ${active ? "border-teal bg-teal text-white" : "border-line bg-panel text-ink hover:bg-white"}`}
      onClick={onClick}
      type="button"
    >
      <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${active ? "text-white/75" : "text-ink/45"}`}>{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </button>
  );
}

function AgentLoad({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-panel p-3">
      <p className="text-sm font-semibold">{label}</p>
      <p className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-ink/60">{value}</p>
    </div>
  );
}

function QuickStart({ href, label }: { href: string; label: string }) {
  return (
    <Link className="flex items-center justify-between rounded-md bg-panel p-3 text-sm font-semibold transition hover:bg-white" href={href}>
      {label}
      <ChevronRight size={14} className="text-ink/40" />
    </Link>
  );
}

function priorityClass(priority: Priority) {
  if (priority === "urgent") return "bg-coral/10 text-coral";
  if (priority === "high") return "bg-gold/10 text-gold";
  if (priority === "medium") return "bg-teal/10 text-teal";
  return "bg-panel text-ink/55";
}

function iconFor(kind: Focus) {
  if (kind === "approval") return ShieldCheck;
  if (kind === "calendar") return CalendarDays;
  if (kind === "travel") return AlertTriangle;
  if (kind === "career") return BriefcaseBusiness;
  if (kind === "learning") return BookOpen;
  if (kind === "health") return HeartPulse;
  if (kind === "capture") return Video;
  return CheckCircle2;
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function dueBucketLabel(value: DueBucket) {
  if (value === "today") return "Today";
  if (value === "tomorrow") return "Tomorrow";
  if (value === "this_week") return "This week";
  if (value === "later") return "Later";
  return "All";
}

function bucketSummary(items: ActionItem[]) {
  return items.reduce<Record<Exclude<DueBucket, "all">, number>>(
    (summary, item) => {
      summary[item.dueBucket] += 1;
      return summary;
    },
    { today: 0, tomorrow: 0, this_week: 0, later: 0 }
  );
}

function dueBucketFromIso(value?: string | null): Exclude<DueBucket, "all"> | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return dueBucketFromDate(date);
}

function dueBucketFromText(value?: string | null): Exclude<DueBucket, "all"> | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.includes("today")) return "today";
  if (lower.includes("tomorrow")) return "tomorrow";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return dueBucketFromDate(date);
  return null;
}

function dueBucketFromDate(date: Date): Exclude<DueBucket, "all"> {
  const startToday = startOfDay(new Date());
  const startTarget = startOfDay(date);
  const days = Math.round((startTarget.getTime() - startToday.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 7) return "this_week";
  return "later";
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
