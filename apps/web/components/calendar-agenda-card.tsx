"use client";

import Link from "next/link";
import { CalendarDays, Clock3, RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { getCalendarAgenda, type CalendarAgenda } from "@/lib/calendar";

export function CalendarAgendaCard() {
  const [agenda, setAgenda] = useState<CalendarAgenda | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getCalendarAgenda();
      setAgenda(data.agenda);
    } catch {
      setError("Calendar Agent could not load agenda context.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return <article className="rounded-md border border-line bg-white p-5 text-sm text-ink/65 shadow-soft">Loading Calendar Agent...</article>;
  }

  return (
    <article className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="text-teal" size={19} />
          <h2 className="font-semibold">Calendar Agent</h2>
        </div>
        <button aria-label="Refresh calendar agenda" className="flex h-9 w-9 items-center justify-center rounded-md border border-line" onClick={() => void load()} title="Refresh" type="button">
          <RefreshCw size={16} />
        </button>
      </div>

      {error ? <p className="mt-3 rounded-md border border-coral/40 bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}

      {!agenda?.connected ? (
        <div className="mt-4">
          <p className="text-sm leading-6 text-ink/65">Connect Google Calendar so MyAgent can prepare agenda notes and detect busy days.</p>
          <Link className="mt-4 inline-flex rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" href="/connectors">
            Connect Calendar
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm leading-6 text-ink/65">{agenda.insight}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric label="Today" value={String(agenda.today.length)} />
            <Metric label="Tomorrow" value={String(agenda.tomorrow.length)} />
            <Metric label="Conflicts" value={String(agenda.conflicts.length)} />
          </div>

          {agenda.next_event ? (
            <div className="mt-4 rounded-md bg-panel p-4">
              <div className="flex items-center gap-2">
                <Clock3 size={16} className="text-teal" />
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">Next event</p>
              </div>
              <h3 className="mt-2 text-sm font-semibold">{agenda.next_event.summary}</h3>
              <p className="mt-1 text-xs text-ink/55">{agenda.next_event.start_label || agenda.next_event.start}</p>
            </div>
          ) : null}

          {agenda.conflicts.length ? (
            <div className="mt-4 rounded-md border border-coral/30 bg-coral/10 p-4">
              <div className="flex items-center gap-2 text-coral">
                <TriangleAlert size={16} />
                <p className="text-sm font-semibold">Possible overlap</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-ink/65">{agenda.conflicts[0].events.join(" and ")}</p>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" href="/tasks">
              Prep tasks
            </Link>
            <Link className="rounded-md border border-line px-4 py-2 text-sm font-semibold" href="/activity">
              Agent trace
            </Link>
          </div>
        </>
      )}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-panel p-3">
      <p className="text-xs font-semibold text-ink/45">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
