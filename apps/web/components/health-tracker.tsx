"use client";

import { Activity, AlertTriangle, Bed, Droplets, HeartPulse, Pill, Save, SmilePlus, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getHealthSummary, saveHealthCheckIn, type HealthCheckIn, type HealthSummary } from "@/lib/health";

const symptomOptions = [
  "headache",
  "stress",
  "tired",
  "stomach pain",
  "cough",
  "fever",
  "chest pain",
  "shortness of breath",
  "severe headache",
  "suicidal thoughts"
];

const initialForm: HealthCheckIn = {
  mood: 3,
  energy: 3,
  sleep_hours: 7,
  water_glasses: 5,
  exercise_minutes: 20,
  symptoms: [],
  notes: "",
  medication_taken: null
};

export function HealthTracker() {
  const [form, setForm] = useState<HealthCheckIn>(initialForm);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [status, setStatus] = useState("Ready for today's check-in.");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getHealthSummary()
      .then(setSummary)
      .catch(() => setStatus("Health API is not reachable. Start the backend to save check-ins."));
  }, []);

  const weeklyAverage = useMemo(() => {
    const recent = summary?.check_ins?.slice(0, 7) ?? [];
    if (!recent.length) return null;
    return {
      sleep: average(recent.map((item) => item.sleep_hours)),
      mood: average(recent.map((item) => item.mood)),
      energy: average(recent.map((item) => item.energy))
    };
  }, [summary]);

  function toggleSymptom(symptom: string) {
    setForm((current) => ({
      ...current,
      symptoms: current.symptoms.includes(symptom)
        ? current.symptoms.filter((item) => item !== symptom)
        : [...current.symptoms, symptom]
    }));
  }

  async function submit() {
    setSaving(true);
    try {
      const data = await saveHealthCheckIn(form);
      setSummary(data);
      setStatus("Health check-in saved to MyAgent memory.");
    } catch {
      setStatus("Could not save health check-in. Make sure the backend is running.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-md border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <HeartPulse className="text-coral" />
          <h2 className="text-lg font-semibold">Daily health check-in</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-ink/65">
          Track patterns for your wellbeing. MyAgent will not diagnose you or replace medical care.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Metric icon={SmilePlus} label="Mood" value={form.mood} min={1} max={5} onChange={(value) => setForm({ ...form, mood: value })} />
          <Metric icon={Zap} label="Energy" value={form.energy} min={1} max={5} onChange={(value) => setForm({ ...form, energy: value })} />
          <Metric icon={Bed} label="Sleep hours" value={form.sleep_hours} min={0} max={12} step={0.5} onChange={(value) => setForm({ ...form, sleep_hours: value })} />
          <Metric icon={Droplets} label="Water glasses" value={form.water_glasses} min={0} max={12} onChange={(value) => setForm({ ...form, water_glasses: value })} />
          <Metric icon={Activity} label="Exercise minutes" value={form.exercise_minutes} min={0} max={180} step={5} onChange={(value) => setForm({ ...form, exercise_minutes: value })} />
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold">Symptoms or signals</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {symptomOptions.map((symptom) => (
              <button
                className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                  form.symptoms.includes(symptom) ? "border-coral bg-coral/10 text-coral" : "border-line bg-white text-ink/70"
                }`}
                key={symptom}
                onClick={() => toggleSymptom(symptom)}
              >
                {symptom}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-md border border-line p-3">
          <label className="flex items-center gap-3 text-sm">
            <Pill size={17} className="text-teal" />
            <input
              type="checkbox"
              checked={form.medication_taken === true}
              onChange={(event) => setForm({ ...form, medication_taken: event.target.checked })}
            />
            I took my planned medication or supplement today
          </label>
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-semibold">Notes</span>
          <textarea
            className="mt-2 min-h-28 w-full resize-y rounded-md border border-line px-3 py-2 text-sm leading-6 outline-none focus:border-teal"
            placeholder="Anything MyAgent should remember? Example: exam stress, long walk, bad sleep, headache after lunch..."
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
        </label>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink/60">{status}</p>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={saving}
            onClick={submit}
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save check-in"}
          </button>
        </div>
      </section>

      <section className="space-y-4">
        {summary?.urgent_warning && (
          <article className="rounded-md border border-coral/70 bg-white p-5 shadow-soft">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-coral" />
              <div>
                <h2 className="text-lg font-semibold">Urgent health warning</h2>
                <p className="mt-2 text-sm leading-6 text-ink/70">{summary.urgent_warning}</p>
              </div>
            </div>
          </article>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <TrendCard label="Avg sleep" value={weeklyAverage ? `${weeklyAverage.sleep.toFixed(1)}h` : "--"} />
          <TrendCard label="Avg mood" value={weeklyAverage ? `${weeklyAverage.mood.toFixed(1)}/5` : "--"} />
          <TrendCard label="Avg energy" value={weeklyAverage ? `${weeklyAverage.energy.toFixed(1)}/5` : "--"} />
        </div>

        <article className="rounded-md border border-line bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold">Health Agent insights</h2>
          <div className="mt-4 space-y-3">
            {(summary?.insights ?? []).map((insight) => (
              <div className="rounded-md bg-panel p-3" key={insight.title}>
                <p className="text-sm font-semibold">{insight.title}</p>
                <p className="mt-1 text-sm leading-6 text-ink/65">{insight.body}</p>
              </div>
            ))}
            {!summary?.insights?.length && (
              <p className="rounded-md bg-panel p-3 text-sm text-ink/65">Save your first check-in to generate health insights.</p>
            )}
          </div>
        </article>

        <article className="rounded-md border border-line bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold">Recent check-ins</h2>
          <div className="mt-4 space-y-3">
            {(summary?.check_ins ?? []).slice(0, 5).map((item) => (
              <div className="rounded-md bg-panel p-3" key={item.created_at}>
                <p className="text-sm font-semibold">
                  Mood {item.mood}/5, Energy {item.energy}/5, Sleep {item.sleep_hours}h
                </p>
                <p className="mt-1 text-xs text-ink/60">
                  {item.symptoms?.length ? `Symptoms: ${item.symptoms.join(", ")}` : "No symptoms logged"}
                </p>
              </div>
            ))}
            {!summary?.check_ins?.length && <p className="rounded-md bg-panel p-3 text-sm text-ink/65">No check-ins yet.</p>}
          </div>
          <p className="mt-4 text-xs leading-5 text-ink/50">{summary?.disclaimer}</p>
        </article>
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  min,
  max,
  step = 1,
  onChange
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-md border border-line p-3">
      <span className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Icon size={17} className="text-teal" />
          {label}
        </span>
        <span className="text-sm font-semibold">{value}</span>
      </span>
      <input className="mt-3 w-full accent-teal" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function TrendCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + Number(value || 0), 0) / values.length;
}
