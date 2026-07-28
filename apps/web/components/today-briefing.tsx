"use client";

import Link from "next/link";
import { BellRing, CalendarDays, ChevronRight, HeartPulse, Mail, ShieldCheck, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getNotificationFeed, type MyAgentNotification, type NotificationFeed } from "@/lib/notifications";

const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };

export function TodayBriefing() {
  const [feed, setFeed] = useState<NotificationFeed | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getNotificationFeed()
      .then((data) => {
        setFeed(data);
        setError(null);
      })
      .catch(() => setError("Today Briefing needs the backend running."));
  }, []);

  const topItems = useMemo(() => {
    return [...(feed?.items ?? [])]
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
      .slice(0, 3);
  }, [feed]);

  return (
    <section className="mt-6 rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BellRing size={19} className="text-coral" />
            <h2 className="text-lg font-semibold">Today Briefing</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
            The most important things MyAgent thinks deserve your attention now, ranked from approvals, jobs, calendar, Gmail, health, and Guardian.
          </p>
        </div>
        <Link className="inline-flex w-fit items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold" href="/notifications">
          Full inbox
          <ChevronRight size={15} />
        </Link>
      </div>

      {error ? <div className="mt-4 rounded-md border border-coral/40 bg-coral/10 p-3 text-sm text-coral">{error}</div> : null}

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <BriefingStat label="Urgent" value={feed?.summary.urgent ?? 0} tone="coral" />
        <BriefingStat label="High" value={feed?.summary.high ?? 0} tone="gold" />
        <BriefingStat label="Medium" value={feed?.summary.medium ?? 0} tone="teal" />
        <BriefingStat label="Unread" value={feed?.unread ?? 0} tone="ink" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {topItems.length ? (
          topItems.map((item) => <BriefingCard item={item} key={item.id} />)
        ) : (
          <div className="rounded-md border border-dashed border-line p-5 text-sm text-ink/60 lg:col-span-3">
            No briefing items yet. Connect Gmail, Calendar, GitHub, or track jobs to make MyAgent more proactive.
          </div>
        )}
      </div>
    </section>
  );
}

function BriefingStat({ label, tone, value }: { label: string; tone: "coral" | "gold" | "teal" | "ink"; value: number }) {
  const toneClass = {
    coral: "text-coral bg-coral/10",
    gold: "text-gold bg-gold/10",
    teal: "text-teal bg-teal/10",
    ink: "text-ink bg-panel"
  }[tone];

  return (
    <div className="rounded-md bg-panel p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className={`mt-2 flex h-9 w-12 items-center justify-center rounded-md text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function BriefingCard({ item }: { item: MyAgentNotification }) {
  const Icon = iconFor(item.kind);
  return (
    <article className="rounded-md border border-line bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white">
          <Icon size={18} className="text-teal" />
        </span>
        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${priorityClass(item.priority)}`}>{item.priority}</span>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{item.source}</p>
      <h3 className="mt-2 font-semibold leading-5">{item.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink/65">{item.body}</p>
      {item.action_href ? (
        <Link className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ink" href={item.action_href}>
          {item.action_label || "Open"}
          <ChevronRight size={14} />
        </Link>
      ) : null}
    </article>
  );
}

function priorityClass(priority: MyAgentNotification["priority"]) {
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
