"use client";

import { AlertTriangle, CalendarDays, CheckCircle2, Download, Github, HeartPulse, Linkedin, Mail, MapPin, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { deleteProfileMemory, disableConnector, exportProfileMemory, getProfile, type MyAgentProfile } from "@/lib/profile";

const permissionCards = [
  {
    key: "gmail",
    label: "Gmail",
    icon: Mail,
    reads: ["Profile email", "Recent messages", "Important email signals"],
    writes: ["Gmail drafts after approval"],
    approval: "Required before creating drafts"
  },
  {
    key: "calendar",
    label: "Google Calendar",
    icon: CalendarDays,
    reads: ["Upcoming events", "Locations", "Conflicts"],
    writes: ["Calendar events after approval"],
    approval: "Required before creating events"
  },
  {
    key: "github",
    label: "GitHub",
    icon: Github,
    reads: ["Public profile", "Repositories", "Languages"],
    writes: ["No GitHub write actions in MVP"],
    approval: "Read-only"
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    reads: ["Basic identity", "Manual profile details"],
    writes: ["No LinkedIn posting or messaging"],
    approval: "Read-only identity"
  },
  {
    key: "health",
    label: "Health Shortcut",
    icon: HeartPulse,
    reads: ["Only metrics your Shortcut sends", "Daily check-ins", "Health notes"],
    writes: ["MyAgent memory and insights only"],
    approval: "Shortcut is explicit opt-in"
  },
  {
    key: "location",
    label: "Location",
    icon: MapPin,
    reads: ["City memory", "Browser live location only when requested"],
    writes: ["No background location storage"],
    approval: "Browser asks permission each live check"
  }
];

export function PrivacyCenter() {
  const [profile, setProfile] = useState<MyAgentProfile | null>(null);
  const [status, setStatus] = useState("Loading privacy controls...");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then((data) => {
        setProfile(data);
        setStatus("Privacy controls loaded.");
      })
      .catch(() => setStatus("Could not load privacy controls. Start the backend and refresh."));
  }, []);

  const memoryCounts = useMemo(() => {
    const health = profile?.health ?? {};
    return [
      { label: "Captures", value: profile?.captures?.length ?? 0 },
      { label: "Health syncs", value: Array.isArray(health.fitness_syncs) ? health.fitness_syncs.length : 0 },
      { label: "Check-ins", value: Array.isArray(health.check_ins) ? health.check_ins.length : 0 },
      { label: "Learning", value: Array.isArray((profile as Record<string, unknown> | null)?.learning) ? ((profile as Record<string, unknown>).learning as unknown[]).length : 0 },
      { label: "Jobs", value: Array.isArray((profile as Record<string, unknown> | null)?.jobs) ? ((profile as Record<string, unknown>).jobs as unknown[]).length : 0 }
    ];
  }, [profile]);

  async function exportMemory() {
    setBusy("export");
    try {
      const data = await exportProfileMemory();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `myagent-memory-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus("Memory export downloaded with sensitive tokens redacted.");
    } catch {
      setStatus("Could not export memory.");
    } finally {
      setBusy(null);
    }
  }

  async function clearMemory() {
    if (confirmText !== "DELETE") {
      setStatus("Type DELETE before clearing memory.");
      return;
    }
    setBusy("delete");
    try {
      const result = await deleteProfileMemory();
      setProfile(result.profile);
      setConfirmText("");
      setStatus("MyAgent demo memory was cleared.");
    } catch {
      setStatus("Could not clear memory.");
    } finally {
      setBusy(null);
    }
  }

  async function turnOffConnector(connector: string) {
    setBusy(connector);
    try {
      const result = await disableConnector(connector);
      setProfile(result.profile);
      setStatus(`${connector} disabled in MyAgent memory.`);
    } catch {
      setStatus(`Could not disable ${connector}.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-teal" />
              <h2 className="text-lg font-semibold">Privacy command center</h2>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
              MyAgent can read connected context, but external writes stay approval-first. This page shows what is connected and lets you export, disable, or clear memory.
            </p>
            <p className="mt-3 text-xs font-semibold text-ink/50">{status}</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-md bg-sage/12 px-3 py-2 text-xs font-semibold text-sage">
            <CheckCircle2 size={14} />
            Guardian enabled
          </span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {memoryCounts.map((item) => (
          <article className="rounded-md border border-line bg-white p-4 shadow-soft" key={item.label}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {permissionCards.map((item) => {
          const connected = connectorConnected(profile, item.key);
          return (
            <article className="rounded-md border border-line bg-white p-5 shadow-soft" key={item.key}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${connected ? "bg-teal/10 text-teal" : "bg-panel text-ink/45"}`}>
                    <item.icon size={18} />
                  </span>
                  <div>
                    <h3 className="font-semibold">{item.label}</h3>
                    <p className="mt-1 text-xs font-semibold text-ink/45">{connected ? connectedLabel(profile, item.key) : "Not connected"}</p>
                  </div>
                </div>
                {item.key !== "location" ? (
                  <button
                    className="inline-flex w-fit items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold disabled:opacity-45"
                    disabled={!connected || busy === item.key}
                    onClick={() => void turnOffConnector(item.key)}
                    type="button"
                  >
                    <XCircle size={15} />
                    Disable
                  </button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <PermissionList label="Can read" values={item.reads} />
                <PermissionList label="Can write" values={item.writes} />
              </div>
              <div className="mt-4 rounded-md bg-panel p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">Approval rule</p>
                <p className="mt-2 text-sm leading-6 text-ink/65">{item.approval}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-md border border-line bg-white p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <Download className="text-teal" />
            <h2 className="font-semibold">Export memory</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-ink/65">
            Download a JSON snapshot of MyAgent memory. OAuth tokens and private auth values are redacted.
          </p>
          <button className="mt-4 inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-45" disabled={busy === "export"} onClick={() => void exportMemory()} type="button">
            <Download size={15} />
            Export memory
          </button>
        </article>

        <article className="rounded-md border border-coral/50 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-coral" />
            <h2 className="font-semibold">Delete demo memory</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-ink/65">
            Clears profile, connectors, health syncs, jobs, learning, captures, and local demo memory. This does not revoke access inside Google, GitHub, or LinkedIn.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              className="h-10 rounded-md border border-line px-3 text-sm outline-none focus:border-coral sm:w-52"
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder="Type DELETE"
              value={confirmText}
            />
            <button className="inline-flex items-center gap-2 rounded-md bg-coral px-4 py-2 text-sm font-semibold text-white disabled:opacity-45" disabled={confirmText !== "DELETE" || busy === "delete"} onClick={() => void clearMemory()} type="button">
              <Trash2 size={15} />
              Clear memory
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}

function PermissionList({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-md bg-panel p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <div className="mt-2 space-y-2">
        {values.map((value) => (
          <p className="text-sm leading-5 text-ink/65" key={value}>{value}</p>
        ))}
      </div>
    </div>
  );
}

function connectorConnected(profile: MyAgentProfile | null, key: string) {
  if (!profile) return false;
  if (key === "location") return Boolean(profile.city);
  if (key === "health") return Boolean(profile.health?.latest || profile.health?.latest_fitness || profile.health?.fitness_syncs?.length);
  return Boolean((profile as unknown as Record<string, unknown>)[key]);
}

function connectedLabel(profile: MyAgentProfile | null, key: string) {
  if (!profile) return "Connected";
  if (key === "gmail") return profile.gmail?.email || "Connected";
  if (key === "calendar") return `${profile.calendar?.upcoming_count ?? profile.calendar?.events?.length ?? 0} event(s)`;
  if (key === "github") return profile.github?.login ? `@${profile.github.login}` : "Connected";
  if (key === "linkedin") return profile.linkedin?.name || "Connected";
  if (key === "health") return profile.health?.latest_fitness ? "iOS Shortcut synced" : "Check-ins saved";
  if (key === "location") return profile.city || "City memory";
  return "Connected";
}
