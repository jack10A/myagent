"use client";

import Link from "next/link";
import { MapPin, Plane, RefreshCw, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { getTravelGuardian, type TravelGuardian } from "@/lib/calendar";

export function TravelGuardianCard() {
  const [travel, setTravel] = useState<TravelGuardian | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getTravelGuardian();
      setTravel(data.travel_guardian);
    } catch {
      setError("Travel Guardian could not load calendar travel context.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return <article className="rounded-md border border-line bg-white p-5 text-sm text-ink/65 shadow-soft">Loading Travel Guardian...</article>;
  }

  const firstRisk = travel?.risks[0];

  return (
    <article className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-coral" size={19} />
          <h2 className="font-semibold">Travel Guardian</h2>
        </div>
        <button aria-label="Refresh Travel Guardian" className="flex h-9 w-9 items-center justify-center rounded-md border border-line" onClick={() => void load()} title="Refresh" type="button">
          <RefreshCw size={16} />
        </button>
      </div>

      {error ? <p className="mt-3 rounded-md border border-coral/40 bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}
      <p className="mt-3 text-sm leading-6 text-ink/65">{travel?.summary || "No travel checks available yet."}</p>

      {firstRisk ? (
        <div className="mt-4 rounded-md border border-coral/30 bg-coral/10 p-4">
          <div className="flex items-center gap-2 text-coral">
            <Plane size={16} />
            <p className="text-sm font-semibold">{firstRisk.title}</p>
          </div>
          <p className="mt-2 text-xs leading-5 text-ink/65">{firstRisk.reason}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-md bg-white px-2 py-1">{firstRisk.severity}</span>
            {firstRisk.when ? <span className="rounded-md bg-white px-2 py-1">{firstRisk.when}</span> : null}
            {firstRisk.location ? <span className="rounded-md bg-white px-2 py-1">{firstRisk.location}</span> : null}
          </div>
          {firstRisk.checks[0] ? <p className="mt-3 rounded-md bg-white p-3 text-xs leading-5 text-ink/65">{firstRisk.checks[0]}</p> : null}
        </div>
      ) : (
        <div className="mt-4 rounded-md bg-panel p-4">
          <p className="text-sm font-semibold">No travel events detected</p>
          <p className="mt-2 text-xs leading-5 text-ink/60">Travel Guardian activates when Calendar contains flights, buses, trains, stations, airports, or travel keywords.</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" href="/map">
          <MapPin size={15} />
          Open map
        </Link>
        <Link className="rounded-md border border-line px-4 py-2 text-sm font-semibold" href="/tasks">
          Travel tasks
        </Link>
      </div>
    </article>
  );
}
