"use client";

import { AlertTriangle, BellRing, CalendarDays, CheckCircle2, HeartPulse, LocateFixed, Mail, Mic, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getNotificationFeed, type MyAgentNotification, type NotificationFeed } from "@/lib/notifications";
import { getProfile, type MyAgentProfile } from "@/lib/profile";

type GuardianAlert = {
  id: string;
  title: string;
  description: string | null;
  severity: "urgent" | "warning" | "safe";
  instruction: string | null;
  source: string;
};

type AlertResponse = {
  city: string;
  provider: string;
  status: string;
  alerts: GuardianAlert[];
};

const PRIORITY_STYLES = {
  urgent: "border-coral/70 bg-coral/10 text-coral",
  high: "border-gold/70 bg-gold/10 text-gold",
  medium: "border-teal/50 bg-teal/10 text-teal",
  low: "border-line bg-panel text-ink/55"
};

export function NotificationCenter() {
  const [profile, setProfile] = useState<MyAgentProfile | null>(null);
  const [feed, setFeed] = useState<NotificationFeed | null>(null);
  const [liveAlerts, setLiveAlerts] = useState<GuardianAlert[]>([]);
  const [status, setStatus] = useState("Loading proactive notifications...");
  const [locating, setLocating] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    getProfile().then(setProfile).catch(() => setProfile(null));
    getNotificationFeed()
      .then((data) => {
        setFeed(data);
        setStatus(data.count ? `${data.count} notification(s) need attention.` : "No urgent notifications right now.");
      })
      .catch(() => {
        setFeed({ items: [], count: 0, unread: 0, summary: { urgent: 0, high: 0, medium: 0, low: 0 } });
        setStatus("Notifications API is not reachable. Start the backend and refresh.");
      });
  }, []);

  const combined = useMemo(() => [...liveAlerts.map(alertToNotification), ...(feed?.items ?? [])], [feed, liveAlerts]);
  const filtered = filter === "all" ? combined : combined.filter((item) => item.priority === filter || item.kind === filter);
  const filters = ["all", "urgent", "high", "approval", "email", "calendar", "job", "health", "learning", "capture"];

  function useLiveLocation() {
    if (!navigator.geolocation) {
      setStatus("This browser does not support live location.");
      return;
    }

    setLocating(true);
    setStatus("Waiting for browser location permission...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const params = new URLSearchParams({
            lat: String(position.coords.latitude),
            lon: String(position.coords.longitude),
            city: "Live location"
          });
          const data = await apiFetch<AlertResponse>(`/alerts/nearby?${params.toString()}`);
          setLiveAlerts(data.alerts);
          setStatus(data.alerts.length ? `Live ${data.provider.toUpperCase()} alerts added to inbox.` : "No live NWS alerts found for this location.");
        } catch {
          setStatus("Alerts API is not reachable. Existing notifications are still shown.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setStatus("Location permission was denied or unavailable.");
        setLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 120000, timeout: 12000 }
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <BellRing className="text-coral" />
              <h2 className="text-lg font-semibold">Proactive inbox</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              {profile?.city ? `City memory: ${profile.city}. ` : ""}{status}
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={locating}
            onClick={useLiveLocation}
            type="button"
          >
            <LocateFixed size={16} />
            {locating ? "Checking..." : "Check live location"}
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Stat label="Urgent" value={(feed?.summary.urgent ?? 0) + liveAlerts.filter((alert) => alert.severity === "urgent").length} />
        <Stat label="High" value={feed?.summary.high ?? 0} />
        <Stat label="Medium" value={feed?.summary.medium ?? 0} />
        <Stat label="Total" value={combined.length} />
      </section>

      <section className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            className={`rounded-md border px-3 py-2 text-xs font-semibold capitalize transition ${filter === item ? "border-teal bg-teal text-white" : "border-line bg-white text-ink/60 hover:border-teal/40"}`}
            key={item}
            onClick={() => setFilter(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </section>

      <div className="space-y-3">
        {!filtered.length ? (
          <article className="rounded-md border border-dashed border-line bg-white p-6 text-center">
            <p className="font-semibold">No matching notifications</p>
            <p className="mt-1 text-sm text-ink/55">Change the filter or connect more sources from Connectors.</p>
          </article>
        ) : null}
        {filtered.map((item) => (
          <NotificationCard item={item} key={item.id} />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-md border border-line bg-white p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </article>
  );
}

function NotificationCard({ item }: { item: MyAgentNotification }) {
  const Icon = iconFor(item.kind);
  return (
    <article className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="flex gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-panel">
          <Icon size={19} className="text-teal" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold uppercase ${PRIORITY_STYLES[item.priority]}`}>
              {item.priority}
            </span>
            <span className="rounded-md bg-panel px-2 py-1 text-[11px] font-semibold text-ink/55">{item.source}</span>
            <span className="rounded-md bg-panel px-2 py-1 text-[11px] font-semibold text-ink/55">{formatDate(item.created_at)}</span>
          </div>
          <h2 className="mt-2 text-lg font-semibold leading-tight">{item.title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">{item.body}</p>
          {item.action_href ? (
            <Link className="mt-4 inline-flex rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white" href={item.action_href}>
              {item.action_label || "Open"}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function iconFor(kind: string) {
  if (kind === "approval" || kind === "guardian") return ShieldCheck;
  if (kind === "email") return Mail;
  if (kind === "calendar") return CalendarDays;
  if (kind === "health") return HeartPulse;
  if (kind === "capture") return Mic;
  if (kind === "learning" || kind === "job") return TrendingUp;
  if (kind === "live_alert") return AlertTriangle;
  return CheckCircle2;
}

function alertToNotification(alert: GuardianAlert): MyAgentNotification {
  return {
    id: `live-${alert.id}`,
    kind: "live_alert",
    title: alert.title,
    body: [alert.description, alert.instruction].filter(Boolean).join(" "),
    priority: alert.severity === "urgent" ? "urgent" : alert.severity === "warning" ? "high" : "low",
    source: alert.source,
    action_label: "Open map",
    action_href: "/map",
    created_at: new Date().toISOString(),
    read: false,
    metadata: {}
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Now";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
