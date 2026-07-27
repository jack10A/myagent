import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fbfaf7]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-between px-5 py-6 sm:px-8">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-white">
              <ShieldCheck size={20} />
            </span>
            <span className="text-lg font-semibold">MyAgent</span>
          </Link>
          <Link href="/dashboard" className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">
            Open app
          </Link>
        </nav>

        <div className="grid gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-teal">Guardian-first AI</p>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] text-ink sm:text-6xl lg:text-7xl">
              MyAgent
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/70">
              A proactive AI chief-of-staff that understands your work, watches nearby risks, remembers what matters,
              and turns scattered signals into approved actions.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white"
              >
                Create My Agent
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-5 py-3 text-sm font-semibold"
              >
                View Dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-md border border-line bg-white p-5 shadow-soft">
            <div className="rounded-md bg-panel p-4">
              <p className="text-sm font-semibold text-coral">Guardian Alert</p>
              <h2 className="mt-3 text-2xl font-semibold">Accident near your route</h2>
              <p className="mt-3 text-sm leading-6 text-ink/65">
                Your 4:00 PM meeting may be affected. MyAgent can draft a delay note, suggest an alternate route, and
                update the calendar after approval.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {["Risk checked", "Approval required", "One recommendation"].map((item) => (
                  <div key={item} className="rounded-md bg-white p-3 text-sm font-medium">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 pb-2 sm:grid-cols-3">
          {["Memory", "Connectors", "Guardian"].map((item) => (
            <div key={item} className="border-t border-line pt-3 text-sm text-ink/65">
              {item} is built into the first MVP.
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

