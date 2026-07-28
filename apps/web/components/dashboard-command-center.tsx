"use client";

import Link from "next/link";
import {
  Bell,
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  Github,
  HeartPulse,
  Mail,
  MapPin,
  Mic,
  PlugZap,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AgentCommandBar } from "@/components/agent-command-bar";
import { CalendarAgendaCard } from "@/components/calendar-agenda-card";
import { DashboardProfile } from "@/components/dashboard-profile";
import { TodayBriefing } from "@/components/today-briefing";
import { TravelGuardianCard } from "@/components/travel-guardian-card";
import { getProfile, type MyAgentProfile } from "@/lib/profile";

const quickActions = [
  { href: "/growth", label: "Analyze CV", detail: "Turn your resume into a skill plan", icon: FileText },
  { href: "/capture", label: "Capture Meeting", detail: "Summarize meetings and videos", icon: Mic },
  { href: "/health", label: "Health Check-in", detail: "Track sleep, mood, symptoms", icon: HeartPulse },
  { href: "/connectors", label: "Connect GitHub", detail: "Add repo signals to career memory", icon: Github },
];

function profileCompleteness(profile: MyAgentProfile | null) {
  if (!profile) return 0;
  const identityName = profile.name || profile.linkedin?.name;
  const lifeStage = profile.lifeStage || profile.linkedin?.current_role;
  const field = profile.field || profile.linkedin?.headline || profile.cv?.role_guess;
  const goal = profile.goal || profile.linkedin?.target_role;
  const city = profile.city || profile.calendar?.events?.find((event) => event.location)?.location;
  const fields = [identityName, profile.age, lifeStage, field, goal, city, profile.github, profile.linkedin, profile.gmail, profile.calendar, profile.cv, profile.health?.latest_fitness];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

function sourceCount(profile: MyAgentProfile | null) {
  if (!profile) return 0;
  return [profile.gmail, profile.calendar, profile.github, profile.linkedin, profile.cv, profile.health?.latest_fitness].filter(Boolean).length;
}

function importantEmailCount(profile: MyAgentProfile | null) {
  const messages = profile?.gmail?.important_messages ?? [];
  return messages.filter((message) => !isAuthOrVerificationEmail(message)).length;
}

function readinessItems(profile: MyAgentProfile | null, completeness: number) {
  const profileReady = completeness >= 65 || Boolean(profile?.linkedin?.name && profile?.github && profile?.cv);
  return [
    {
      label: "Profile",
      status: profileReady ? "Strong memory" : "Needs context",
      ready: profileReady,
      href: "/onboarding",
      icon: UserRoundCheck
    },
    {
      label: "Gmail",
      status: profile?.gmail ? `${importantEmailCount(profile)} important` : "Connect",
      ready: Boolean(profile?.gmail),
      href: "/connectors",
      icon: Mail
    },
    {
      label: "GitHub",
      status: profile?.github ? `${profile.github.repos_scanned ?? profile.github.public_repos ?? 0} repos` : "Connect",
      ready: Boolean(profile?.github),
      href: "/connectors",
      icon: Github
    },
    {
      label: "Calendar",
      status: profile?.calendar ? `${profile.calendar.upcoming_count ?? profile.calendar.events?.length ?? 0} events` : "Connect",
      ready: Boolean(profile?.calendar),
      href: "/connectors",
      icon: CalendarDays
    },
    {
      label: "Guardian",
      status: profile?.city ? profile.city : "Live map",
      ready: Boolean(profile?.city || profile?.calendar?.events?.some((event) => event.location)),
      href: "/map",
      icon: MapPin
    }
  ];
}

function buildNextActions(profile: MyAgentProfile | null, completeness: number) {
  return [
    {
      title: profile?.gmail ? "Review important Gmail signals" : "Connect Gmail read-only",
      body: profile?.gmail
        ? `${importantEmailCount(profile)} message(s) look worth attention. MyAgent can draft replies only after approval.`
        : "Let the Email Agent find important messages and prepare draft replies for approval.",
      href: profile?.gmail ? "/connectors" : "/connectors",
      action: profile?.gmail ? "Open Gmail signals" : "Connect Gmail",
      tone: "teal",
      icon: Mail
    },
    {
      title: completeness >= 70 ? "Sharpen this week plan" : "Finish profile memory",
      body: completeness >= 70
        ? profile?.goal || profile?.linkedin?.target_role
          ? `Current goal: ${profile.goal || profile.linkedin?.target_role}`
          : "Profile is ready enough for MyAgent to recommend a weekly plan."
        : "A few answers make every agent more personal: field, goal, city, and career sources.",
      href: completeness >= 70 ? "/growth" : "/onboarding",
      action: completeness >= 70 ? "Open Growth" : "Continue setup",
      tone: "gold",
      icon: Sparkles
    },
    {
      title: "Check nearby safety",
      body: "Guardian can use your browser location to look for weather and emergency-style alerts near you.",
      href: "/map",
      action: "Open map",
      tone: "coral",
      icon: CircleAlert
    }
  ] as const;
}

export function DashboardCommandCenter() {
  const [profile, setProfile] = useState<MyAgentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile().then(setProfile).catch(() => setProfile(null)).finally(() => setLoading(false));
  }, []);

  const completeness = profileCompleteness(profile);
  const readiness = readinessItems(profile, completeness);
  const readyCount = readiness.filter((item) => item.ready).length;
  const nextActions = buildNextActions(profile, completeness);
  const greetingName = profile?.name || profile?.linkedin?.given_name || profile?.linkedin?.name || "Jack";

  return (
    <>
      <section className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft">
        <div className="grid gap-0 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-md bg-sage/12 px-3 py-1 text-xs font-semibold text-sage">
                <span className="h-2 w-2 rounded-full bg-sage" />
                {loading ? "Starting agents" : "System ready"}
              </span>
              <span className="rounded-md bg-panel px-3 py-1 text-xs font-semibold text-ink/65">{readyCount}/{readiness.length} signals ready</span>
            </div>

            <h1 className="mt-5 max-w-3xl text-2xl font-semibold tracking-normal text-ink sm:text-4xl">
              Good to see you, {greetingName}. MyAgent is watching what matters today.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/65">
              One command center for email, career, health, meetings, and nearby safety. Actions stay drafts until you approve them.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <MetricPill label="Memory" value={`${completeness}%`} />
              <MetricPill label="Career sources" value={String(sourceCount(profile))} />
              <MetricPill label="Specialists" value="7 agents" />
            </div>
          </div>

          <div className="border-t border-line bg-panel p-5 sm:p-7 xl:border-l xl:border-t-0">
            <div className="flex items-center gap-2">
              <Brain className="text-gold" size={20} />
              <h2 className="font-semibold">Agent brain</h2>
            </div>
            <div className="mt-5 space-y-3">
              {["Listen", "Reason", "Prepare", "Ask approval"].map((step, index) => (
                <div className="flex items-center gap-3" key={step}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-xs font-semibold shadow-soft">{index + 1}</span>
                  <div>
                    <p className="text-sm font-semibold">{step}</p>
                    <p className="text-xs text-ink/55">{brainCopy[index]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <AgentCommandBar />

      <TodayBriefing />

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Next best actions</h2>
            <p className="mt-1 text-sm text-ink/55">The dashboard now starts with decisions, not pages.</p>
          </div>
          <Link className="hidden rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold sm:inline-flex" href="/tasks">
            Review approvals
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {nextActions.map((item) => (
            <NextActionCard key={item.title} {...item} />
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {readiness.map((item) => (
          <Link className="group rounded-md border border-line bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-teal/60" href={item.href} key={item.label}>
            <div className="flex items-start justify-between gap-3">
              <span className={`flex h-9 w-9 items-center justify-center rounded-md ${item.ready ? "bg-sage/12 text-sage" : "bg-panel text-ink/55"}`}>
                <item.icon size={18} />
              </span>
              <ChevronRight size={16} className="text-ink/30 transition group-hover:translate-x-1 group-hover:text-teal" />
            </div>
            <h2 className="mt-3 text-sm font-semibold">{item.label}</h2>
            <p className="mt-1 text-xs leading-5 text-ink/60">{item.status}</p>
          </Link>
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <DashboardProfile />

          <article className="rounded-md border border-teal/50 bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <Sparkles className="text-teal" />
                  <h2 className="text-lg font-semibold">Your current focus</h2>
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">
                  {profile?.goal || profile?.linkedin?.target_role
                    ? `MyAgent is organizing recommendations around your goal: ${profile.goal || profile.linkedin?.target_role}`
                    : "Add one clear target role or goal so every agent can organize recommendations around it."}
                </p>
              </div>
              <span className="rounded-md bg-panel px-3 py-1 text-xs font-semibold">
                {completeness >= 70 ? "Context ready" : "Needs more context"}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" href="/growth">
                Open growth plan
              </Link>
              <Link className="rounded-md border border-line px-4 py-2 text-sm font-semibold" href="/tasks">
                Review approvals
              </Link>
            </div>
          </article>

          <article className="rounded-md border border-coral/60 bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Bell className="text-coral" />
                <h2 className="text-lg font-semibold">Guardian priority</h2>
              </div>
              <span className="rounded-md bg-coral/10 px-3 py-1 text-xs font-semibold text-coral">
                Monitoring
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/65">
              Guardian reviews safety, privacy, and approval risk before MyAgent shows you a recommendation or prepares an action.
            </p>
            <Link className="mt-5 inline-flex rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" href="/map">
              Open Guardian Map
            </Link>
          </article>
        </div>

        <aside className="space-y-4">
          <CalendarAgendaCard />
          <TravelGuardianCard />

          <article className="rounded-md border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="text-teal" size={19} />
              <h2 className="font-semibold">Career signal</h2>
            </div>
            <div className="mt-4 grid gap-3">
              <p className="rounded-md bg-panel p-3 text-sm text-ink/70">
                {profile?.field || profile?.linkedin?.headline || profile?.cv?.role_guess
                  ? `Field: ${profile.field || profile.linkedin?.headline || profile.cv?.role_guess}`
                  : "Add your field in the interview to personalize job and study recommendations."}
              </p>
              <p className="rounded-md bg-panel p-3 text-sm text-ink/70">
                {profile?.gmail
                  ? `Gmail connected read-only: ${profile.gmail.recent_scanned ?? 0} recent emails scanned, ${importantEmailCount(profile)} important signal(s).`
                  : "Gmail is ready to connect from the Connectors page."}
              </p>
              <p className="rounded-md bg-panel p-3 text-sm text-ink/70">
                {profile?.cv ? `CV analyzed: ${profile.cv.detected_skills?.length ?? 0} skills detected.` : "Upload your CV on Growth to unlock sharper advice."}
              </p>
            </div>
          </article>

          <article className="rounded-md border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <Clock3 className="text-coral" size={19} />
              <h2 className="font-semibold">Today timeline</h2>
            </div>
            <div className="mt-4 space-y-3">
              {[
                ["Now", profile?.gmail ? "Email Agent scanned Gmail signals." : "Email Agent is waiting for Gmail."],
                ["Next", profile?.calendar ? "Calendar Agent is watching upcoming meetings." : "Calendar Agent is waiting for Google Calendar."],
                ["Always", "Guardian reviews risk before actions reach you."]
              ].map(([time, detail]) => (
                <div className="grid grid-cols-[54px_1fr] gap-3 rounded-md bg-panel p-3" key={time}>
                  <p className="text-xs font-semibold text-teal">{time}</p>
                  <p className="text-xs leading-5 text-ink/65">{detail}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-md border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-sage" size={19} />
              <h2 className="font-semibold">System readiness</h2>
            </div>
            <div className="mt-4 space-y-3">
              {[
                ["Profile", completeness > 40 ? "Ready" : "Needs details"],
                ["Gmail", profile?.gmail ? "Read-only connected" : "Not connected"],
                ["GitHub", profile?.github ? "Connected" : "Not connected"],
                ["CV", profile?.cv ? "Analyzed" : "Waiting"],
                ["Guardian", profile?.city ? `City: ${profile.city}` : "Live map ready"]
              ].map(([name, status]) => (
                <div key={name} className="flex items-center justify-between rounded-md bg-panel p-3">
                  <p className="text-sm font-semibold">{name}</p>
                  <p className="text-xs text-ink/60">{status}</p>
                </div>
              ))}
            </div>
          </article>

          <Link className="group block rounded-md border border-line bg-white p-5 shadow-soft transition hover:border-teal/60" href="/activity">
            <div className="flex items-center gap-2">
              <Brain className="text-gold" size={19} />
              <h2 className="font-semibold">Agent collaboration lab</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/65">Inspect complete dependency traces for career, email, and Guardian scenarios.</p>
            <p className="mt-4 text-sm font-semibold text-teal">Open activity trace</p>
          </Link>
        </aside>
      </section>
    </>
  );
}

const brainCopy = [
  "Reads connected signals",
  "Agents compare context",
  "Drafts the best move",
  "You stay in control"
];

function isAuthOrVerificationEmail(message: { subject?: string | null; from?: string | null; snippet?: string | null }) {
  const text = `${message.subject ?? ""} ${message.from ?? ""} ${message.snippet ?? ""}`.toLowerCase();
  return [
    "verification code",
    "verify it's you",
    "verify it&#39;s you",
    "security code",
    "one-time code",
    "2-step verification",
    "two-factor",
    "sign-in attempt",
    "login code"
  ].some((term) => text.includes(term));
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-panel p-3">
      <p className="text-xs font-medium text-ink/55">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function NextActionCard({
  title,
  body,
  href,
  action,
  tone,
  icon: Icon
}: {
  title: string;
  body: string;
  href: string;
  action: string;
  tone: "teal" | "gold" | "coral";
  icon: typeof Mail;
}) {
  const toneClass = {
    teal: "bg-teal/10 text-teal border-teal/30",
    gold: "bg-gold/10 text-gold border-gold/30",
    coral: "bg-coral/10 text-coral border-coral/30"
  }[tone];

  return (
    <Link className="group block rounded-md border border-line bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-ink/25" href={href}>
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-md border ${toneClass}`}>
          <Icon size={19} />
        </span>
        <ChevronRight size={17} className="text-ink/30 transition group-hover:translate-x-1 group-hover:text-ink" />
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-ink/65">{body}</p>
      <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ink">
        <PlugZap size={15} />
        {action}
      </p>
    </Link>
  );
}
