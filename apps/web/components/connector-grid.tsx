"use client";

import { CalendarDays, FileText, Github, Linkedin, Mail, MapPin, ShieldAlert, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { API_URL } from "@/lib/api";
import { getProfile, saveProfile, type MyAgentProfile } from "@/lib/profile";

const baseConnectors = [
  { name: "Gmail", key: "gmail", detail: "Read important email signals and prepare approval-ready drafts.", icon: Mail },
  { name: "Google Calendar", key: "calendar", detail: "Meeting conflicts, schedule context, and follow-up planning.", icon: CalendarDays },
  { name: "Google Drive", key: "drive", detail: "Docs and files for project context after OAuth is added.", icon: UploadCloud },
  { name: "GitHub", key: "github", detail: "Projects, languages, repositories, and proof-of-work.", icon: Github },
  { name: "LinkedIn", key: "linkedin", detail: "Career identity, profile basics, and Growth context through LinkedIn Sign In.", icon: Linkedin },
  { name: "CV / Resume", key: "cv", detail: "Skills, education, achievements, and role fit from your uploaded CV.", icon: FileText },
  { name: "Weather Alerts", key: "weather", detail: "Free NWS weather alerts for US live location checks.", icon: ShieldAlert },
  { name: "Emergency / Location", key: "location", detail: "Opt-in browser location for nearby Guardian checks.", icon: MapPin }
];

export function ConnectorGrid() {
  const [profile, setProfile] = useState<MyAgentProfile | null>(null);
  const [syncStatus, setSyncStatus] = useState("");
  const [linkedinForm, setLinkedinForm] = useState({
    profile_url: "",
    headline: "",
    current_role: "",
    target_role: "",
    skills: "",
    about: ""
  });
  const [savingLinkedIn, setSavingLinkedIn] = useState(false);

  useEffect(() => {
    getProfile().then(setProfile).catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    const linkedin = profile?.linkedin;
    if (!linkedin) return;
    const draft = suggestedLinkedInDetails(profile);
    setLinkedinForm({
      profile_url: linkedin.profile_url || draft.profile_url,
      headline: linkedin.headline || draft.headline,
      current_role: linkedin.current_role || draft.current_role,
      target_role: linkedin.target_role || draft.target_role,
      skills: (linkedin.skills ?? []).join(", ") || draft.skills,
      about: linkedin.about || draft.about
    });
  }, [profile]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawLinkedIn = params.get("linkedin_profile");
    if (!rawLinkedIn) return;

    try {
      const linkedin = JSON.parse(rawLinkedIn) as NonNullable<MyAgentProfile["linkedin"]>;
      getProfile()
        .catch(() => null)
        .then((currentProfile) => saveProfile({ linkedin: { ...(currentProfile?.linkedin ?? {}), ...linkedin } }))
        .then(({ profile: savedProfile }) => {
          setProfile(savedProfile);
          setSyncStatus("LinkedIn synced into this MyAgent profile.");
          window.history.replaceState(null, "", window.location.pathname);
        })
        .catch(() => setSyncStatus("LinkedIn connected, but MyAgent could not sync it into this profile."));
    } catch {
      setSyncStatus("LinkedIn returned profile data, but MyAgent could not read it.");
    }
  }, []);

  async function saveLinkedInDetails() {
    const current = profile?.linkedin ?? {};
    setSavingLinkedIn(true);
    setSyncStatus("");
    try {
      const result = await saveProfile({
        linkedin: {
          ...current,
          profile_url: linkedinForm.profile_url.trim(),
          headline: linkedinForm.headline.trim(),
          current_role: linkedinForm.current_role.trim(),
          target_role: linkedinForm.target_role.trim(),
          skills: linkedinForm.skills.split(",").map((skill) => skill.trim()).filter(Boolean),
          about: linkedinForm.about.trim()
        }
      });
      setProfile(result.profile);
      setSyncStatus("LinkedIn profile details saved into Growth and Memory.");
    } catch {
      setSyncStatus("Could not save LinkedIn details. Make sure the backend is running.");
    } finally {
      setSavingLinkedIn(false);
    }
  }

  const statusByKey = useMemo(
    () => ({
      gmail: profile?.gmail ? `Connected read-only: ${profile.gmail.email}` : "OAuth ready",
      calendar: profile?.calendar ? `${profile.calendar.upcoming_count ?? profile.calendar.events?.length ?? 0} upcoming event(s)` : "OAuth ready",
      drive: "Planned next",
      github: profile?.github ? `Connected: @${profile.github.login}` : "OAuth ready",
      linkedin: profile?.linkedin ? `Connected: ${profile.linkedin.name ?? "LinkedIn"}` : "OAuth ready",
      cv: profile?.cv ? `${profile.cv.detected_skills?.length ?? 0} skills detected` : "Upload on Growth",
      weather: "Ready",
      location: profile?.city ? `City memory: ${profile.city}` : "Live map ready"
    }),
    [profile]
  );

  return (
    <div className="space-y-4">
      {syncStatus ? <div className="rounded-md border border-teal/35 bg-teal/10 p-3 text-sm font-semibold text-teal">{syncStatus}</div> : null}
      {profile?.gmail ? <GmailInboxPreview gmail={profile.gmail} /> : null}
      {profile?.calendar ? <CalendarPreview calendar={profile.calendar} /> : null}
      {profile?.github ? <GitHubPreview github={profile.github} /> : null}
      {profile?.linkedin ? <LinkedInPreview linkedin={profile.linkedin} /> : null}
      {profile?.linkedin ? (
        <LinkedInDetailsForm
          form={linkedinForm}
          onChange={(field, value) => setLinkedinForm((current) => ({ ...current, [field]: value }))}
          onSave={() => void saveLinkedInDetails()}
          saving={savingLinkedIn}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {baseConnectors.map((connector) => (
          <article key={connector.key} className="rounded-md border border-line bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-panel">
                  <connector.icon size={18} className="text-teal" />
                </span>
                <div>
                  <h2 className="font-semibold">{connector.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-ink/65">{connector.detail}</p>
                </div>
              </div>
              <span className="shrink-0 rounded-md bg-panel px-3 py-1 text-xs font-semibold">{statusByKey[connector.key as keyof typeof statusByKey]}</span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {connector.key === "gmail" && (
                <>
                  <a className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" href={`${API_URL}/connectors/gmail/start`}>
                    {profile?.gmail ? "Refresh Gmail scan" : "Connect Gmail"}
                  </a>
                  {profile?.gmail ? (
                    <a className="rounded-md border border-line px-4 py-2 text-sm font-semibold" href="/dashboard">
                      Ask Email Agent
                    </a>
                  ) : null}
                </>
              )}
              {connector.key === "github" && (
                <a className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" href={`${API_URL}/connectors/github/start`}>
                  Connect GitHub
                </a>
              )}
              {connector.key === "linkedin" && (
                <a className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" href={`${API_URL}/connectors/linkedin/start`}>
                  {profile?.linkedin ? "Refresh LinkedIn" : "Connect LinkedIn"}
                </a>
              )}
              {connector.key === "calendar" && (
                <a className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" href={`${API_URL}/connectors/calendar/start`}>
                  {profile?.calendar ? "Refresh Calendar" : "Connect Calendar"}
                </a>
              )}
              {connector.key === "cv" && (
                <a className="rounded-md border border-line px-4 py-2 text-sm font-semibold" href="/growth">
                  Upload CV
                </a>
              )}
              {connector.key === "location" && (
                <a className="rounded-md border border-line px-4 py-2 text-sm font-semibold" href="/map">
                  Open Map
                </a>
              )}
              {!["gmail", "github", "linkedin", "calendar", "cv", "location"].includes(connector.key) && (
                <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink/50" disabled>
                  Coming soon
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function LinkedInDetailsForm({
  form,
  onChange,
  onSave,
  saving
}: {
  form: {
    profile_url: string;
    headline: string;
    current_role: string;
    target_role: string;
    skills: string;
    about: string;
  };
  onChange: (field: keyof typeof form, value: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const completeness = [
    form.profile_url,
    form.headline,
    form.current_role,
    form.target_role,
    form.skills,
    form.about
  ].filter((value) => value.trim()).length;

  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">LinkedIn profile details</p>
          <h2 className="mt-1 text-lg font-semibold">Make Growth and Job Search smarter</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            LinkedIn OAuth confirms identity. These details add the career content LinkedIn does not expose through standard OAuth.
          </p>
        </div>
        <span className="rounded-md bg-panel px-3 py-2 text-xs font-semibold">{completeness}/6 complete</span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="LinkedIn URL" value={form.profile_url} onChange={(value) => onChange("profile_url", value)} placeholder="https://www.linkedin.com/in/jack-ashraf/" />
        <Field label="Headline" value={form.headline} onChange={(value) => onChange("headline", value)} placeholder="AI student building full-stack agent apps" />
        <Field label="Current role" value={form.current_role} onChange={(value) => onChange("current_role", value)} placeholder="Student / AI builder" />
        <Field label="Target role" value={form.target_role} onChange={(value) => onChange("target_role", value)} placeholder="AI Software Engineer Intern" />
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-semibold">Top skills</span>
        <input
          className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-teal"
          onChange={(event) => onChange("skills", event.target.value)}
          placeholder="Python, FastAPI, React, LangGraph, GitHub"
          value={form.skills}
        />
      </label>

      <label className="mt-4 block">
        <span className="text-sm font-semibold">About summary</span>
        <textarea
          className="mt-2 min-h-28 w-full resize-y rounded-md border border-line px-3 py-2 text-sm leading-6 outline-none focus:border-teal"
          onChange={(event) => onChange("about", event.target.value)}
          placeholder="Short LinkedIn-style about section. Mention what you build, what you are learning, and what role you want."
          value={form.about}
        />
      </label>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <ProfileSuggestion title="Headline" body={form.headline ? "Good. Keep it outcome-focused and role-specific." : "Add target role + proof, for example: AI student building full-stack agent apps."} />
        <ProfileSuggestion title="Skills" body={form.skills ? "Good. Put your strongest technical skills first." : "Add 5-8 skills from CV and GitHub so Job Search can rank roles."} />
        <ProfileSuggestion title="About" body={form.about ? "Good. Add one shipped project and one career goal if missing." : "Add a 3-5 sentence summary with projects, stack, and internship target."} />
      </div>

      <button className="mt-5 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} onClick={onSave} type="button">
        {saving ? "Saving..." : "Save LinkedIn details"}
      </button>
    </section>
  );
}

function Field({ label, onChange, placeholder, value }: { label: string; onChange: (value: string) => void; placeholder: string; value: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-teal" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
    </label>
  );
}

function ProfileSuggestion({ body, title }: { body: string; title: string }) {
  return (
    <article className="rounded-md bg-panel p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-xs leading-5 text-ink/60">{body}</p>
    </article>
  );
}

function LinkedInPreview({ linkedin }: { linkedin: NonNullable<MyAgentProfile["linkedin"]> }) {
  return (
    <section className="rounded-md border border-teal/40 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-teal/10 text-teal">
              {linkedin.picture ? <img alt="" className="h-full w-full object-cover" src={linkedin.picture} /> : <Linkedin size={18} />}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">LinkedIn connected</p>
              <h2 className="mt-1 text-lg font-semibold">{linkedin.name || "LinkedIn identity"}</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-ink/65">
            {linkedin.headline || "MyAgent can use this basic LinkedIn identity in Growth. LinkedIn OIDC returns profile basics only, so CV, GitHub, and manual profile details still make recommendations stronger."}
          </p>
          {linkedin.profile_url ? (
            <a className="mt-3 inline-flex rounded-md border border-line px-3 py-2 text-xs font-semibold" href={linkedin.profile_url} rel="noreferrer" target="_blank">
              Open LinkedIn profile
            </a>
          ) : null}
          {linkedin.email ? <p className="mt-2 text-sm text-ink/55">{linkedin.email}</p> : null}
        </div>
        <a className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" href={`${API_URL}/connectors/linkedin/start`}>
          Refresh LinkedIn
        </a>
      </div>
    </section>
  );
}

function GitHubPreview({ github }: { github: NonNullable<MyAgentProfile["github"]> }) {
  const languages = Object.entries(github.top_languages ?? {}).sort((first, second) => Number(second[1]) - Number(first[1]));

  return (
    <section className="rounded-md border border-gold/40 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-gold/10 text-gold">
              <Github size={18} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">GitHub connected</p>
              <h2 className="mt-1 text-lg font-semibold">@{github.login}</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-ink/65">
            MyAgent scanned {github.repos_scanned ?? github.public_repos ?? 0} repositories and is using your strongest languages as career proof-of-work.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {github.url ? (
            <a className="rounded-md border border-line px-4 py-2 text-sm font-semibold" href={github.url} rel="noreferrer" target="_blank">
              Open GitHub
            </a>
          ) : null}
          <a className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" href={`${API_URL}/connectors/github/start`}>
            Refresh GitHub
          </a>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {languages.length ? (
          languages.map(([language, count]) => (
            <div className="rounded-md border border-line bg-panel p-4" key={language}>
              <p className="text-sm font-semibold">{language}</p>
              <p className="mt-1 text-xs text-ink/55">{count} repo signal(s)</p>
            </div>
          ))
        ) : (
          <div className="rounded-md border border-line bg-panel p-4">
            <p className="text-sm font-semibold">No languages detected</p>
            <p className="mt-1 text-xs text-ink/55">Refresh after adding public repositories.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function CalendarPreview({ calendar }: { calendar: NonNullable<MyAgentProfile["calendar"]> }) {
  const events = calendar.events ?? [];

  return (
    <section className="rounded-md border border-gold/40 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-gold/10 text-gold">
              <CalendarDays size={18} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Calendar connected</p>
              <h2 className="mt-1 text-lg font-semibold">{calendar.upcoming_count ?? events.length} upcoming event(s)</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-ink/65">
            MyAgent can use upcoming meetings for planning, travel risk, email replies, and schedule-aware recommendations.
          </p>
        </div>
        <a className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" href={`${API_URL}/connectors/calendar/start`}>
          Refresh Calendar
        </a>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {events.length ? (
          events.slice(0, 6).map((event, index) => (
            <article className="rounded-md border border-line bg-panel p-4" key={`${event.id ?? event.summary ?? "event"}-${index}`}>
              <h3 className="text-sm font-semibold">{event.summary || "Untitled event"}</h3>
              <p className="mt-1 text-xs text-ink/55">{event.start || "No start time"}</p>
              {event.location ? <p className="mt-2 text-xs text-ink/55">{event.location}</p> : null}
              {event.html_link ? (
                <a className="mt-3 inline-flex rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold" href={event.html_link} rel="noreferrer" target="_blank">
                  Open event
                </a>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-md border border-line bg-panel p-4">
            <h3 className="text-sm font-semibold">No upcoming events found</h3>
            <p className="mt-2 text-sm leading-6 text-ink/65">Calendar is connected, but the next 14 days look empty.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function GmailInboxPreview({ gmail }: { gmail: NonNullable<MyAgentProfile["gmail"]> }) {
  const important = (gmail.important_messages ?? []).filter((message) => !isAuthOrVerificationEmail(message));

  return (
    <section className="rounded-md border border-teal/40 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal/10 text-teal">
              <Mail size={18} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">Gmail connected</p>
              <h2 className="mt-1 text-lg font-semibold">{gmail.email}</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-ink/65">
            MyAgent scanned {gmail.recent_scanned ?? 0} recent emails and found {important.length} important-looking signal(s). Approved email actions can become Gmail drafts.
          </p>
        </div>
        <a className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" href={`${API_URL}/connectors/gmail/start`}>
          Refresh scan
        </a>
      </div>

      <div className="mt-5 grid gap-3">
        {important.length ? (
          important.map((message, index) => (
            <article className="rounded-md border border-line bg-panel p-4" key={`${message.id ?? message.subject ?? "email"}-${index}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">{message.subject || "No subject"}</h3>
                  <p className="mt-1 text-xs text-ink/55">{message.from || "Unknown sender"}</p>
                </div>
                <span className="rounded-md bg-white px-3 py-1 text-xs font-semibold">Score {message.importance_score ?? 1}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink/65">{message.snippet || "No preview available."}</p>
            </article>
          ))
        ) : (
          <div className="rounded-md border border-line bg-panel p-4">
            <h3 className="text-sm font-semibold">No important messages in the latest scan</h3>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              Gmail is connected. MyAgent did not find urgent keywords in the latest scanned emails.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function suggestedLinkedInDetails(profile: MyAgentProfile) {
  const name = profile.linkedin?.given_name || profile.name || "Jack";
  const skills = ["Python", "FastAPI", "React", "TypeScript", "Next.js", "AI Agents", "LangGraph", "PostgreSQL", "GitHub", "Docker"];
  return {
    profile_url: "https://www.linkedin.com/in/jack-ashraf/",
    headline: "AI student building full-stack agent apps",
    current_role: "Student / AI builder",
    target_role: "AI Software Engineer Intern",
    skills: skills.join(", "),
    about: `${name} is an AI and software engineering student building practical full-stack AI applications. I work with Python, FastAPI, React, and agentic AI systems, and I enjoy turning real user problems into usable products. My current focus is MyAgent, a proactive AI assistant platform that connects Gmail, Calendar, GitHub, LinkedIn, CV, health, memory, and approvals into one personalized agent experience. I am looking for AI Software Engineering or Full-Stack Internship opportunities where I can build reliable, useful AI-powered tools.`
  };
}

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
