import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Github,
  Mail,
  MapPin,
  Mic,
  ShieldCheck,
  Sparkles
} from "lucide-react";

const agentFlow = [
  { label: "Gmail", detail: "Important internship email", icon: Mail },
  { label: "Calendar", detail: "Tomorrow meeting conflict", icon: CalendarDays },
  { label: "Memory", detail: "Goal: AI internship", icon: Brain },
  { label: "Guardian", detail: "Approval before action", icon: ShieldCheck }
];

const outcomes = [
  {
    title: "Career growth",
    body: "Connect LinkedIn, CV, GitHub, and Gmail signals. MyAgent recommends internships, courses, projects, and follow-ups.",
    icon: BriefcaseBusiness
  },
  {
    title: "Meetings and videos",
    body: "Record notes or paste a YouTube transcript. Capture Agent extracts summaries, action items, people, and decisions.",
    icon: Mic
  },
  {
    title: "Safety and travel",
    body: "Guardian checks location, weather, calendar, and travel context, then recommends one clear action.",
    icon: MapPin
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fbfaf7] text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8">
        <nav className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-white">
              <ShieldCheck size={20} />
            </span>
            <span>
              <span className="block text-lg font-semibold">MyAgent</span>
              <span className="hidden text-xs text-ink/55 sm:block">Proactive AI with approval</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link className="hidden rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold sm:inline-flex" href="/connectors">
              Connectors
            </Link>
            <Link href="/dashboard" className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white">
              Open app
            </Link>
          </div>
        </nav>

        <div className="grid flex-1 gap-10 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-teal/30 bg-teal/10 px-3 py-2 text-xs font-semibold text-teal">
              <Sparkles size={14} />
              Multi-agent SaaS for real life
            </div>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-normal text-ink sm:text-6xl lg:text-7xl">
              MyAgent
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/70">
              Build a personal AI agent that remembers your context, connects to your apps, watches important signals, and prepares actions only after you approve.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/onboarding" className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white">
                Create My Agent
                <ArrowRight size={16} />
              </Link>
              <Link href="/growth" className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-5 py-3 text-sm font-semibold">
                Explore Growth
              </Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Proof label="Connectors" value="Gmail, Calendar, GitHub, LinkedIn" />
              <Proof label="Control" value="Approval-first actions" />
              <Proof label="Memory" value="Profile, jobs, tasks, health" />
            </div>
          </div>

          <div className="relative">
            <div className="rounded-md border border-ink/10 bg-white p-4 shadow-soft">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink text-white">
                    <Brain size={17} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Today Briefing</p>
                    <p className="text-xs text-ink/55">3 things matter now</p>
                  </div>
                </div>
                <span className="rounded-md bg-sage/12 px-3 py-1 text-xs font-semibold text-sage">Live</span>
              </div>

              <div className="mt-4 grid gap-3">
                <PreviewAlert
                  icon={<BriefcaseBusiness size={17} />}
                  label="Application Follow-Up Agent"
                  title="Follow up on AI Software Intern"
                  body="Your follow-up date is due. MyAgent can draft a polite recruiter email with Guardian approval."
                  tone="gold"
                />
                <PreviewAlert
                  icon={<Mail size={17} />}
                  label="Email Agent"
                  title="Important Gmail signal"
                  body="A career email was detected. MyAgent can prepare a short professional reply."
                  tone="teal"
                />
                <PreviewAlert
                  icon={<MapPin size={17} />}
                  label="Guardian"
                  title="Travel and nearby risk"
                  body="Calendar, route, and weather context are checked before suggesting action."
                  tone="coral"
                />
              </div>

              <div className="mt-4 rounded-md border border-line bg-panel p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">Agent collaboration</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  {agentFlow.map((item, index) => (
                    <div className="rounded-md bg-white p-3" key={item.label}>
                      <div className="flex items-center justify-between">
                        <item.icon size={16} className="text-teal" />
                        <span className="text-xs font-semibold text-ink/35">{index + 1}</span>
                      </div>
                      <p className="mt-3 text-xs font-semibold">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-ink/55">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="grid gap-4 pb-6 lg:grid-cols-3">
          {outcomes.map((item) => (
            <article className="rounded-md border border-line bg-white p-5 shadow-soft" key={item.title}>
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-panel text-teal">
                <item.icon size={19} />
              </span>
              <h2 className="mt-4 font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-ink/65">{item.body}</p>
            </article>
          ))}
        </section>
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <div className="flex items-center gap-2">
              <BellRing className="text-coral" size={19} />
              <h2 className="text-xl font-semibold">Not a chatbot. A workflow agent.</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/65">
              MyAgent does not wait for endless prompts. It watches connected sources, reasons across agents, and shows one useful recommendation.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {["Search jobs", "Draft replies", "Summarize meetings", "Track health", "Check alerts", "Prepare calendar"].map((item) => (
              <div className="flex items-center gap-2 rounded-md bg-panel p-3 text-sm font-semibold" key={item}>
                <CheckCircle2 size={15} className="text-sage" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Proof({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-line pt-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className="mt-1 text-sm leading-5 text-ink/70">{value}</p>
    </div>
  );
}

function PreviewAlert({ body, icon, label, title, tone }: { body: string; icon: React.ReactNode; label: string; title: string; tone: "coral" | "gold" | "teal" }) {
  const toneClass = {
    coral: "text-coral bg-coral/10",
    gold: "text-gold bg-gold/10",
    teal: "text-teal bg-teal/10"
  }[tone];

  return (
    <article className="rounded-md border border-line bg-panel p-4">
      <div className="flex gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${toneClass}`}>{icon}</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{label}</p>
          <h2 className="mt-1 font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">{body}</p>
        </div>
      </div>
    </article>
  );
}
