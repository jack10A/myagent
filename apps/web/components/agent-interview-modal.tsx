"use client";

import { ArrowRight, Check, FileText, Github, Linkedin, ShieldCheck, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { saveProfile } from "@/lib/profile";

type Answer = {
  name: string;
  age: string;
  lifeStage: string;
  field: string;
  goal: string;
  careerAuth: string;
  city: string;
};

const steps = [
  {
    key: "name",
    eyebrow: "Identity",
    question: "What should I call you?",
    placeholder: "Jack",
    helper: "This becomes the name MyAgent uses across recommendations."
  },
  {
    key: "age",
    eyebrow: "Life Context",
    question: "How old are you?",
    placeholder: "18",
    helper: "Optional, but useful for student/career recommendations."
  },
  {
    key: "lifeStage",
    eyebrow: "Path",
    question: "Are you a student, working, building a startup, or looking for a job?",
    placeholder: "Student building AI projects",
    helper: "This helps the Growth Agent choose the right advice."
  },
  {
    key: "field",
    eyebrow: "Field",
    question: "What job, major, or field should I track for you?",
    placeholder: "AI engineering, cybersecurity, medicine, finance...",
    helper: "MyAgent will watch studies, job trends, and skills in this area."
  },
  {
    key: "goal",
    eyebrow: "Mission",
    question: "What do you want to improve or achieve next?",
    placeholder: "Get an internship, improve coding, win a hackathon...",
    helper: "Your answer becomes a priority in Memory."
  },
  {
    key: "careerAuth",
    eyebrow: "Career Proof",
    question: "For job recommendations, which career sources should I ask to connect?",
    placeholder: "LinkedIn, CV, GitHub",
    helper: "MyAgent can use these to understand your experience, projects, and job fit. You approve each connection."
  },
  {
    key: "city",
    eyebrow: "Guardian",
    question: "Which city should Guardian watch first?",
    placeholder: "New York",
    helper: "Live location stays opt-in. City helps with default alerts."
  }
] as const;

const emptyAnswers: Answer = {
  name: "",
  age: "",
  lifeStage: "",
  field: "",
  goal: "",
  careerAuth: "",
  city: ""
};

export function AgentInterviewModal() {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer>(emptyAnswers);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "offline">("idle");

  const step = steps[stepIndex];
  const currentValue = answers[step.key];
  const progress = useMemo(() => Math.round(((stepIndex + 1) / steps.length) * 100), [stepIndex]);

  useEffect(() => {
    const completed = window.localStorage.getItem("myagent.profile.completed");
    if (!completed) {
      const timer = window.setTimeout(() => setOpen(true), 450);
      return () => window.clearTimeout(timer);
    }
  }, []);

  if (!open) {
    return null;
  }

  function updateAnswer(value: string) {
    setAnswers((current) => ({
      ...current,
      [step.key]: value
    }));
  }

  function close() {
    window.localStorage.setItem("myagent.profile.dismissed", "true");
    setOpen(false);
  }

  async function next() {
    if (stepIndex < steps.length - 1) {
      setStepIndex((index) => index + 1);
      return;
    }

    window.localStorage.setItem("myagent.profile.completed", "true");
    window.localStorage.setItem("myagent.profile", JSON.stringify(answers));
    setSaveState("saving");
    try {
      await saveProfile(answers);
      setSaveState("saved");
    } catch {
      setSaveState("offline");
    }
    setOpen(false);
  }

  function back() {
    setStepIndex((index) => Math.max(index - 1, 0));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 py-6 backdrop-blur-sm">
      <section className="w-full max-w-2xl overflow-hidden rounded-md border border-white/40 bg-[#fbfaf7] shadow-[0_30px_90px_rgba(21,24,29,0.28)]">
        <div className="border-b border-line bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-ink text-white">
                <Sparkles size={20} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">MyAgent Interview</p>
                <h2 className="mt-1 text-xl font-semibold">Let me learn enough to become useful.</h2>
              </div>
            </div>
            <button
              aria-label="Close interview"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-ink/65 hover:text-ink"
              onClick={close}
              type="button"
            >
              <X size={17} />
            </button>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-panel">
            <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="grid gap-0 md:grid-cols-[0.86fr_1.14fr]">
          <aside className="border-b border-line bg-panel p-5 md:border-b-0 md:border-r">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-teal" />
              <p className="text-sm font-semibold">Guardian note</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/65">
              These answers stay local in this MVP popup. Later they will become editable Memory with privacy controls.
            </p>
            <div className="mt-6 space-y-2">
              {steps.map((item, index) => (
                <div key={item.key} className="flex items-center gap-2 text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-xs font-semibold">
                    {index < stepIndex ? <Check size={13} /> : index + 1}
                  </span>
                  <span className={index === stepIndex ? "font-semibold text-ink" : "text-ink/55"}>{item.eyebrow}</span>
                </div>
              ))}
            </div>
          </aside>

          <div className="p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral">{step.eyebrow}</p>
            <label className="mt-3 block text-2xl font-semibold leading-tight" htmlFor="agent-interview-answer">
              {step.question}
            </label>
            <p className="mt-3 text-sm leading-6 text-ink/65">{step.helper}</p>
            {saveState === "offline" ? (
              <p className="mt-3 rounded-md border border-gold/60 bg-panel p-3 text-xs text-ink/65">
                Saved in this browser. Start the backend to sync it to MyAgent memory.
              </p>
            ) : null}

            {step.key === "careerAuth" ? (
              <div className="mt-6 grid gap-3">
                {[
                  { value: "LinkedIn", icon: Linkedin, text: "LinkedIn profile for roles, experience, and career signals" },
                  { value: "CV", icon: FileText, text: "CV or resume for education, skills, and achievements" },
                  { value: "GitHub", icon: Github, text: "GitHub for projects, code, and proof-of-work" }
                ].map((item) => {
                  const selected = currentValue.includes(item.value);
                  return (
                    <button
                      className={`flex items-center gap-3 rounded-md border p-3 text-left transition ${
                        selected ? "border-teal bg-teal/10" : "border-line bg-white hover:border-teal/50"
                      }`}
                      key={item.value}
                      onClick={() => {
                        const values = currentValue ? currentValue.split(", ").filter(Boolean) : [];
                        const nextValues = selected
                          ? values.filter((value) => value !== item.value)
                          : [...values, item.value];
                        updateAnswer(nextValues.join(", "));
                      }}
                      type="button"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-panel">
                        <item.icon size={17} />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{item.value}</span>
                        <span className="mt-1 block text-xs leading-5 text-ink/60">{item.text}</span>
                      </span>
                    </button>
                  );
                })}
                <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold" onClick={() => updateAnswer("Connect later")} type="button">
                  Connect later
                </button>
              </div>
            ) : (
              <input
                autoFocus
                className="mt-6 h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-teal focus:ring-4 focus:ring-teal/10"
                id="agent-interview-answer"
                onChange={(event) => updateAnswer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                  void next();
                  }
                }}
                placeholder={step.placeholder}
                value={currentValue}
              />
            )}

            <div className="mt-6 flex flex-wrap justify-between gap-3">
              <button
                className="rounded-md border border-line px-4 py-2 text-sm font-semibold disabled:opacity-40"
                disabled={stepIndex === 0}
                onClick={back}
                type="button"
              >
                Back
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white"
                disabled={saveState === "saving"}
                onClick={() => void next()}
                type="button"
              >
                {saveState === "saving" ? "Saving..." : stepIndex === steps.length - 1 ? "Create profile" : "Next"}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
