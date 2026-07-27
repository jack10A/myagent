"use client";

import {
  Activity,
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  Github,
  GraduationCap,
  HeartPulse,
  Mail,
  Search,
  ShieldCheck,
  Target,
  UserRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getMemoryTimeline, type MemoryTimeline, type MemoryTimelineItem } from "@/lib/memory";

const ICONS = {
  "Agent Activity": Activity,
  Calendar: CalendarDays,
  Capture: FileText,
  CV: FileText,
  Email: Mail,
  GitHub: Github,
  Goal: Target,
  Growth: GraduationCap,
  Health: HeartPulse,
  Identity: UserRound,
  Jobs: BriefcaseBusiness,
  Learning: GraduationCap
} as const;

function iconFor(category: string) {
  return ICONS[category as keyof typeof ICONS] ?? Brain;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Saved memory";
  }
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function sourceLabel(source: string) {
  return source.replaceAll("_", " ");
}

export function MemoryVault() {
  const [timeline, setTimeline] = useState<MemoryTimeline | null>(null);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setLoading(true);
      getMemoryTimeline(query)
        .then(setTimeline)
        .catch(() => setTimeline({ query, total: 0, stats: { categories: [], sources: [], high_importance: 0 }, items: [] }))
        .finally(() => setLoading(false));
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const categories = useMemo(() => ["All", ...(timeline?.stats.categories ?? [])], [timeline]);
  const filtered = useMemo(() => {
    const items = timeline?.items ?? [];
    if (selectedCategory === "All") {
      return items;
    }
    return items.filter((item) => item.category === selectedCategory);
  }, [selectedCategory, timeline]);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-3">
        <MemoryStat label="Memories" value={timeline?.total ?? 0} />
        <MemoryStat label="Sources" value={timeline?.stats.sources.length ?? 0} />
        <MemoryStat label="High priority" value={timeline?.stats.high_importance ?? 0} />
      </section>

      <section className="rounded-md border border-line bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="flex flex-1 items-center gap-3 rounded-md border border-line bg-panel px-4 py-3">
            <Search size={18} className="text-ink/45" />
            <input
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
              placeholder="Search memory: email, workshop, GitHub, CV, learning, health..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                  selectedCategory === category ? "border-teal bg-teal text-white" : "border-line bg-white text-ink/65 hover:border-teal/45"
                }`}
                type="button"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="space-y-3">
        {loading ? <MemoryEmpty title="Reading memory..." body="MyAgent is checking connected sources and recent agent activity." /> : null}
        {!loading && filtered.length === 0 ? (
          <MemoryEmpty title="No matching memory yet" body="Try searching a connected source like Gmail, Calendar, GitHub, CV, or learning." />
        ) : null}
        {filtered.map((item) => (
          <MemoryCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function MemoryStat({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-md border border-line bg-white p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </article>
  );
}

function MemoryCard({ item }: { item: MemoryTimelineItem }) {
  const Icon = iconFor(item.category);
  const link = getMemoryLink(item);

  return (
    <article className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="flex gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-panel">
          <Icon size={19} className="text-teal" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">{item.category}</p>
            <span className="rounded-md bg-panel px-2 py-1 text-[11px] font-semibold capitalize text-ink/55">{sourceLabel(item.source)}</span>
            <span className="rounded-md bg-panel px-2 py-1 text-[11px] font-semibold text-ink/55">{formatDate(item.created_at)}</span>
          </div>
          <h2 className="mt-2 text-lg font-semibold leading-tight">{item.title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">{item.body}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs font-semibold text-ink/60">
              <ShieldCheck size={13} />
              importance {item.importance}/5
            </span>
            {item.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-md bg-panel px-2 py-1 text-xs font-medium text-ink/55">
                {tag}
              </span>
            ))}
            {link ? (
              <a className="rounded-md border border-teal/30 px-2 py-1 text-xs font-semibold text-teal hover:bg-teal hover:text-white" href={link} target="_blank">
                Open source
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function MemoryEmpty({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-md border border-dashed border-line bg-white p-6 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-ink/55">{body}</p>
    </article>
  );
}

function getMemoryLink(item: MemoryTimelineItem) {
  const metadata = item.metadata ?? {};
  const link = metadata.html_link ?? metadata.url;
  return typeof link === "string" && link.startsWith("http") ? link : null;
}
