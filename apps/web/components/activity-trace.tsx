"use client";

import Link from "next/link";
import { Activity, AlertTriangle, BookOpen, Brain, BriefcaseBusiness, CheckCircle2, Clock3, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { getActivity, type ActivityItem } from "@/lib/activity";

export function ActivityTrace() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getActivity();
      setItems(data.items);
      setSelectedId((current) => current ?? data.items[0]?.id ?? null);
    } catch {
      setError("Could not load real activity. Start the backend, then refresh.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const selected = items.find((item) => item.id === selectedId) ?? items[0];

  if (loading) {
    return <div className="rounded-md border border-line bg-white p-5 text-sm text-ink/65 shadow-soft">Loading agent activity...</div>;
  }

  return (
    <div className="space-y-6">
      {error ? <div className="rounded-md border border-coral/50 bg-coral/10 p-4 text-sm text-coral">{error}</div> : null}

      <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-white p-4 shadow-soft">
        <div>
          <h2 className="font-semibold">Real activity timeline</h2>
          <p className="mt-1 text-sm text-ink/60">Commands, agent collaboration, Guardian decisions, and approval state.</p>
        </div>
        <button
          aria-label="Refresh activity"
          className="flex h-10 w-10 items-center justify-center rounded-md border border-line"
          onClick={() => void load()}
          title="Refresh activity"
          type="button"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      {!items.length ? (
        <section className="rounded-md border border-line bg-white p-5 shadow-soft">
          <h2 className="font-semibold">No real activity yet</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            Go to Dashboard and ask MyAgent something like "Reply to my important email" or "Is there an emergency near me?".
          </p>
          <Link className="mt-4 inline-flex rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" href="/dashboard">
            Open Dashboard
          </Link>
        </section>
      ) : null}

      {items.length ? (
        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-3">
            {items.map((item) => (
              <button
                className={`block w-full rounded-md border bg-white p-4 text-left shadow-soft transition ${
                  selected?.id === item.id ? "border-teal" : "border-line hover:border-teal/50"
                }`}
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                type="button"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-panel">
                    <IconFor item={item} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.recommendation.title || item.situation.title || "Agent activity"}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink/55">{item.command || item.situation.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                      <span className="rounded-md bg-panel px-2 py-1">{formatLabel(item.intent || item.situation.type || "command")}</span>
                      <span className="rounded-md bg-panel px-2 py-1">{item.agent_messages.length} agents</span>
                      {item.approval ? <span className="rounded-md bg-gold/15 px-2 py-1 text-gold">{item.approval.status}</span> : null}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selected ? <ActivityDetail item={selected} /> : null}
        </section>
      ) : null}
    </div>
  );
}

function ActivityDetail({ item }: { item: ActivityItem }) {
  const confidence = Math.round((item.recommendation.confidence ?? 0) * 100);

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">{formatLabel(item.intent || item.situation.type || "activity")}</p>
            <h2 className="mt-2 text-xl font-semibold">{item.recommendation.title || item.situation.title}</h2>
            {item.command ? <p className="mt-3 rounded-md bg-panel p-3 text-sm text-ink/70">"{item.command}"</p> : null}
            <p className="mt-3 text-sm leading-6 text-ink/65">{item.recommendation.rationale || item.situation.description}</p>
          </div>
          {item.approval?.id ? (
            <Link className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" href="/tasks">
              Open approval
            </Link>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-md bg-panel px-3 py-1">{confidence}% confidence</span>
          <span className="rounded-md bg-panel px-3 py-1">Guardian: {item.guardian.decision || "reviewed"}</span>
          <span className="rounded-md bg-panel px-3 py-1">Risk: {item.guardian.risk_level || "low"}</span>
          {item.approval ? <span className="rounded-md bg-gold/15 px-3 py-1 text-gold">Approval: {item.approval.status}</span> : null}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoCard icon={Activity} title="Situation" body={item.situation.description || item.situation.title || "New context detected."} />
        <InfoCard icon={Brain} title="Recommendation" body={item.recommendation.rationale || "MyAgent prepared a recommendation."} />
        <InfoCard icon={ShieldCheck} title="Guardian" body={item.guardian.reason || "Guardian reviewed this action."} />
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-soft">
        <h2 className="font-semibold">Agent collaboration</h2>
        <div className="mt-4 grid gap-3">
          {item.agent_messages.map((message, index) => (
            <article className="rounded-md border border-line p-4" key={`${message.agent}-${index}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold">{index + 1}. {formatAgentName(message.agent)}</p>
                <p className="text-xs font-semibold text-ink/45">
                  {message.depends_on.length ? `Depends on ${message.depends_on.map(formatAgentName).join(", ")}` : "Starts first"}
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink/65">{message.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-soft">
        <h2 className="font-semibold">Proposed actions</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {item.actions.map((action, index) => (
            <div className="rounded-md bg-panel p-3 text-sm text-ink/70" key={`${action.type}-${index}`}>
              <span className="font-semibold">{formatLabel(action.type)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function InfoCard({ icon: Icon, title, body }: { icon: typeof Activity; title: string; body: string }) {
  return (
    <article className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-teal" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink/65">{body}</p>
    </article>
  );
}

function IconFor({ item }: { item: ActivityItem }) {
  if (item.intent === "email_request") return <Mail size={17} className="text-teal" />;
  if (item.intent === "emergency_alert") return <AlertTriangle size={17} className="text-coral" />;
  if (item.intent === "planning_request") return <Clock3 size={17} className="text-gold" />;
  if (item.intent === "learning_plan") return <BookOpen size={17} className="text-teal" />;
  if (item.intent === "job_application") return <BriefcaseBusiness size={17} className="text-teal" />;
  if (item.approval?.status === "approved") return <CheckCircle2 size={17} className="text-sage" />;
  return <Brain size={17} className="text-gold" />;
}

function formatAgentName(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}
