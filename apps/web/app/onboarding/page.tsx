import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";

const questions = [
  "What should MyAgent call you?",
  "What do you do day to day?",
  "What are your top goals right now?",
  "Which tasks do you repeat every week?",
  "What alerts are important enough to interrupt you?",
  "Which city should Guardian monitor first?"
];

export default function OnboardingPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Create My Agent"
        title="Build the first context profile."
        description="The onboarding interview becomes structured memory that agents and Guardian use when reasoning."
      />
      <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-md border border-line bg-white p-5 shadow-soft">
          <h2 className="font-semibold">Interview Progress</h2>
          <div className="mt-5 space-y-3">
            {questions.map((question, index) => (
              <div key={question} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-panel text-sm font-semibold">
                  {index + 1}
                </span>
                <p className="pt-1 text-sm text-ink/70">{question}</p>
              </div>
            ))}
          </div>
        </div>
        <form className="rounded-md border border-line bg-white p-5 shadow-soft">
          <label className="text-sm font-semibold" htmlFor="answer">
            Current question
          </label>
          <p className="mt-2 text-2xl font-semibold">What are your top goals right now?</p>
          <textarea
            id="answer"
            className="mt-5 min-h-40 w-full rounded-md border border-line bg-panel p-4 outline-none focus:border-teal"
            placeholder="Launch MVP, win hackathon, find early customers..."
          />
          <div className="mt-5 flex gap-3">
            <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white">Save answer</button>
            <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold" type="button">
              Skip
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  );
}

