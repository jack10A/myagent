"use client";

import Link from "next/link";
import { BellRing, CalendarDays, CheckCircle2, ChevronRight, HeartPulse, Mail, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { getMorningBriefing, type MorningBriefing, type MorningBriefingCard } from "@/lib/briefing";

export function TodayBriefing() {
  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMorningBriefing()
      .then((data) => {
        setBriefing(data);
        setError(null);
      })
      .catch(() => setError("Morning Briefing needs the backend running."));
  }, []);

  const primary = briefing?.primary;

  return (
    <section className="mt-6 overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft">
      <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BellRing size={19} className="text-coral" />
                <h2 className="text-lg font-semibold">Morning Briefing</h2>
              </div>
              <p className="mt-2 text-sm font-semibold text-ink">{briefing?.greeting ?? "Good day, Jack"}</p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
                {briefing?.summary ?? "MyAgent is collecting calendar, Gmail, health, jobs, learning, approvals, and Guardian context."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="inline-flex w-fit items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold" href="/notifications">
                Full inbox
                <ChevronRight size={15} />
              </Link>
              <Link className="inline-flex w-fit items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white" href="/activity">
                Trace
                <ChevronRight size={15} />
              </Link>
            </div>
          </div>

          {error ? <div className="mt-4 rounded-md border border-coral/40 bg-coral/10 p-3 text-sm text-coral">{error}</div> : null}

          <div className="mt-5 rounded-md border border-teal/35 bg-teal/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">Primary recommendation</p>
            <h3 className="mt-2 text-xl font-semibold">{primary?.title ?? "Connect one more real signal"}</h3>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              {primary?.body ?? "MyAgent will use it to build a more useful daily briefing."}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${priorityClass(primary?.priority ?? "low")}`}>
                {primary?.priority ?? "low"}
              </span>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-ink/55">{primary?.source ?? "Planning Agent"}</span>
              <Link className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white" href={primary?.action_href ?? "/connectors"}>
                {primary?.action_label ?? "Open connectors"}
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SignalPill label="Approvals" value={String(briefing?.signals.approvals ?? 0)} active={(briefing?.signals.approvals ?? 0) > 0} />
            <SignalPill label="Notifications" value={String(briefing?.signals.notifications ?? 0)} active={(briefing?.signals.notifications ?? 0) > 0} />
            <SignalPill label="Guardian" value={briefing?.guardian.status ?? "calm"} active={briefing?.guardian.status !== "calm"} />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {(briefing?.cards ?? []).slice(1, 5).map((item) => <BriefingCard item={item} key={item.id} />)}
          </div>
        </div>

        <aside className="border-t border-line bg-panel p-5 sm:p-6 xl:border-l xl:border-t-0">
          <div className="rounded-md bg-white p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-sage" />
              <h3 className="font-semibold">Guardian</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-ink/65">{briefing?.guardian.message ?? "No urgent Guardian block right now."}</p>
            <p className="mt-3 rounded-md bg-panel p-3 text-xs leading-5 text-ink/60">
              {briefing?.guardian.approval_rule ?? "External actions still require approval."}
            </p>
          </div>

          <div className="mt-4 rounded-md bg-white p-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-gold" />
              <h3 className="font-semibold">Signals checked</h3>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {briefing ? (
                Object.entries({
                  Gmail: briefing.signals.gmail,
                  Calendar: briefing.signals.calendar,
                  GitHub: briefing.signals.github,
                  LinkedIn: briefing.signals.linkedin,
                  Health: briefing.signals.health
                }).map(([label, active]) => <SourceBadge active={Boolean(active)} key={label} label={label} />)
              ) : (
                ["Gmail", "Calendar", "GitHub", "LinkedIn", "Health"].map((label) => <SourceBadge active={false} key={label} label={label} />)
              )}
            </div>
          </div>

          <div className="mt-4 rounded-md bg-white p-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-teal" />
              <h3 className="font-semibold">Today timeline</h3>
            </div>
            <div className="mt-4 space-y-2">
              {(briefing?.timeline ?? []).length ? (
                briefing?.timeline.map((item) => (
                  <div className="grid grid-cols-[58px_1fr] gap-3 rounded-md bg-panel p-3" key={`${item.time}-${item.title}`}>
                    <p className="text-xs font-semibold text-teal">{item.time}</p>
                    <div>
                      <p className="text-xs font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-ink/55">{item.detail}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-md bg-panel p-3 text-sm text-ink/60">No timeline yet. Connect Calendar or Health to unlock it.</p>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-md bg-white p-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-coral" />
              <h3 className="font-semibold">Agent collaboration</h3>
            </div>
            <div className="mt-4 space-y-2">
              {(briefing?.agents ?? []).map((agent) => (
                <div className="rounded-md border border-line bg-panel p-3" key={agent.agent}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{agent.agent}</p>
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${agent.status === "ready" || agent.status === "active" ? "bg-sage/12 text-sage" : "bg-white text-ink/45"}`}>
                      {agent.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-ink/60">{agent.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function BriefingCard({ item }: { item: MorningBriefingCard }) {
  const Icon = iconFor(item.kind);
  return (
    <article className="rounded-md border border-line bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white">
          <Icon size={17} className="text-teal" />
        </span>
        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${priorityClass(item.priority)}`}>{item.priority}</span>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{item.source}</p>
      <h3 className="mt-2 text-sm font-semibold leading-5">{item.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink/65">{item.body}</p>
      <Link className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-ink" href={item.action_href}>
        {item.action_label}
        <ChevronRight size={14} />
      </Link>
    </article>
  );
}

function SignalPill({ active, label, value }: { active: boolean; label: string; value: string }) {
  return (
    <div className="rounded-md bg-panel p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className={`mt-2 inline-flex rounded-md px-2 py-1 text-sm font-semibold ${active ? "bg-gold/10 text-gold" : "bg-white text-ink/65"}`}>{value}</p>
    </div>
  );
}

function SourceBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-panel p-2 text-xs font-semibold">
      {active ? <CheckCircle2 size={14} className="text-sage" /> : <span className="h-3.5 w-3.5 rounded-full border border-ink/20" />}
      {label}
    </div>
  );
}

function priorityClass(priority: MorningBriefingCard["priority"]) {
  if (priority === "urgent") return "bg-coral/10 text-coral";
  if (priority === "high") return "bg-gold/10 text-gold";
  if (priority === "medium") return "bg-teal/10 text-teal";
  return "bg-white text-ink/55";
}

function iconFor(kind: string) {
  if (kind === "approval" || kind === "guardian") return ShieldCheck;
  if (kind === "email") return Mail;
  if (kind === "calendar") return CalendarDays;
  if (kind === "health") return HeartPulse;
  return TrendingUp;
}
