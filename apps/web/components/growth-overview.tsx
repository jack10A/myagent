"use client";

import {
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  Code2,
  ExternalLink,
  FileText,
  Github,
  GraduationCap,
  Linkedin,
  Mail,
  Plus,
  TrendingUp,
  Youtube
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { getJobs, jobKey, trackJob, type JobItem, type JobRecommendation } from "@/lib/jobs";
import {
  getLearning,
  learningResourceKey,
  trackLearningResource,
  type LearningItem,
  type LearningResource
} from "@/lib/learning";
import { growth as fallbackGrowth } from "@/lib/mock-data";
import { getProfileGrowthPlan } from "@/lib/profile";

type GrowthPlan = {
  profile: {
    track: string;
    role: string;
    industry: string;
    skills: string[];
    skill_gaps: string[];
    readiness_score?: number;
    source_status?: Record<string, string>;
    github?: {
      login?: string | null;
      url?: string | null;
      repos_scanned?: number;
      top_languages?: Record<string, number>;
    };
    linkedin?: {
      name?: string | null;
      email?: string | null;
      picture?: string | null;
      connected?: boolean;
    };
    gmail?: {
      email?: string | null;
      important_count?: number;
      career_signals?: Array<{ subject?: string | null; from?: string | null; reason?: string }>;
    };
    cv?: {
      filename?: string | null;
      role_guess?: string | null;
      ats_score?: number;
      detected_sections?: string[];
      role_matches?: Array<{ title: string; score: number; matched: string[]; missing: string[] }>;
      missing_keywords?: string[];
      next_best_project?: string | null;
      summary?: string | null;
    } | null;
  };
  latest_studies: Array<{
    title: string;
    why_it_matters: string;
    summary?: string;
    published?: string;
    authors?: string[];
    url?: string;
    source_name?: string;
    source_type?: string;
    query?: string;
    relevance_score?: number;
    tags?: string[];
    takeaway?: string;
    project_idea?: string;
    career_move?: string;
  }>;
  job_recommendations: JobRecommendation[];
  improvement_plan: Array<{ area: string; recommendation: string }>;
  weekly_plan?: Array<{ day: string; task: string }>;
  source_insights?: Array<{ source: string; status: string; insight: string }>;
  learning_resources?: {
    courses: LearningResource[];
    youtube: LearningResource[];
    projects: LearningResource[];
  };
};

export function GrowthOverview() {
  const [plan, setPlan] = useState<GrowthPlan | null>(null);
  const [trackedStudies, setTrackedStudies] = useState<Record<string, boolean>>({});
  const [learningItems, setLearningItems] = useState<LearningItem[]>([]);
  const [learningError, setLearningError] = useState<string | null>(null);
  const [trackingKey, setTrackingKey] = useState<string | null>(null);
  const [jobItems, setJobItems] = useState<JobItem[]>([]);
  const [jobError, setJobError] = useState<string | null>(null);
  const [trackingJobKey, setTrackingJobKey] = useState<string | null>(null);

  useEffect(() => {
    function loadPlan() {
      getProfileGrowthPlan()
        .then((data) => setPlan(data.plan as GrowthPlan))
        .catch(() => setPlan(null));
      getLearning()
        .then((data) => {
          setLearningItems(data.items);
          setLearningError(null);
        })
        .catch(() => setLearningError("Learning tracking needs the backend running on port 8000."));
      getJobs()
        .then((data) => {
          setJobItems(data.items);
          setJobError(null);
        })
        .catch(() => setJobError("Job tracking needs the backend running on port 8000."));
    }

    loadPlan();
    window.addEventListener("myagent:cv-analyzed", loadPlan);
    return () => window.removeEventListener("myagent:cv-analyzed", loadPlan);
  }, []);

  const profile = plan?.profile;
  const learningResources = plan?.learning_resources;
  const learningByKey: Record<string, LearningItem> = Object.fromEntries(learningItems.map((item) => [item.resource_key, item]));
  const jobsByKey: Record<string, JobItem> = Object.fromEntries(jobItems.map((item) => [item.job_key, item]));
  const studyFallback: GrowthPlan["latest_studies"] = fallbackGrowth.studies.map((study) => ({
    title: study.title,
    why_it_matters: study.detail,
    source_name: "MyAgent fallback",
    source_type: "fallback"
  }));

  async function trackResource(resource: LearningResource) {
    const key = learningResourceKey(resource);
    setTrackingKey(key);
    try {
      const result = await trackLearningResource(resource);
      setLearningItems((current) => {
        const withoutCurrent = current.filter((item) => item.id !== result.item.id && item.resource_key !== result.item.resource_key);
        return [result.item, ...withoutCurrent];
      });
      setLearningError(null);
    } catch {
      setLearningError("Could not track this resource. Make sure the backend is running.");
    } finally {
      setTrackingKey(null);
    }
  }

  async function trackJobTarget(job: JobRecommendation) {
    const key = jobKey(job);
    setTrackingJobKey(key);
    try {
      const result = await trackJob(job);
      setJobItems((current) => {
        const withoutCurrent = current.filter((item) => item.id !== result.item.id && item.job_key !== result.item.job_key);
        return [result.item, ...withoutCurrent];
      });
      setJobError(null);
    } catch {
      setJobError("Could not track this job. Make sure the backend is running.");
    } finally {
      setTrackingJobKey(null);
    }
  }

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-md border border-line bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <GraduationCap size={18} className="text-teal" />
            <h2 className="font-semibold">Track</h2>
          </div>
          <p className="mt-3 text-sm text-ink/65">{profile?.track || fallbackGrowth.profile.track}</p>
        </article>
        <article className="rounded-md border border-line bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-gold" />
            <h2 className="font-semibold">Field</h2>
          </div>
          <p className="mt-3 text-sm text-ink/65">{profile?.industry || fallbackGrowth.profile.field}</p>
        </article>
        <article className="rounded-md border border-line bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-coral" />
            <h2 className="font-semibold">Target</h2>
          </div>
          <p className="mt-3 text-sm text-ink/65">{profile?.role || fallbackGrowth.profile.target}</p>
        </article>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-md border border-teal/40 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-teal" />
            <h2 className="font-semibold">Career readiness</h2>
          </div>
          <p className="mt-4 text-4xl font-semibold">{profile?.readiness_score ?? 0}%</p>
          <p className="mt-3 text-sm leading-6 text-ink/65">
            Calculated from profile context, GitHub proof-of-work, Gmail career signals, and CV availability.
          </p>
        </article>

        <article className="rounded-md border border-line bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-coral" />
            <h2 className="font-semibold">Live source insights</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {(plan?.source_insights ?? []).map((source) => (
              <div className="rounded-md bg-panel p-3" key={source.source}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{source.source}</p>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold">{source.status}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink/65">{source.insight}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      {profile?.github?.login ? (
        <section className="mt-6 rounded-md border border-gold/40 bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Github size={18} className="text-gold" />
                <h2 className="font-semibold">GitHub proof-of-work</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink/65">
                @{profile.github.login} gives MyAgent {profile.github.repos_scanned ?? 0} repository signal(s) for career matching.
              </p>
            </div>
            {profile.github.url ? (
              <a className="rounded-md border border-line px-4 py-2 text-sm font-semibold" href={profile.github.url} rel="noreferrer" target="_blank">
                Open GitHub
              </a>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(profile.github.top_languages ?? {}).map(([language, count]) => (
              <span className="rounded-md bg-panel px-3 py-2 text-xs font-semibold" key={language}>
                {language}: {count}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {profile?.linkedin?.connected ? (
        <section className="mt-6 rounded-md border border-teal/40 bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Linkedin size={18} className="text-teal" />
                <h2 className="font-semibold">LinkedIn career identity</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink/65">
                {profile.linkedin.name || "LinkedIn identity"} is connected as a professional identity signal for Growth recommendations.
              </p>
              {profile.linkedin.email ? <p className="mt-1 text-xs text-ink/55">{profile.linkedin.email}</p> : null}
            </div>
            {profile.linkedin.picture ? (
              <img alt="" className="h-14 w-14 rounded-md object-cover" src={profile.linkedin.picture} />
            ) : null}
          </div>
        </section>
      ) : null}

      {profile?.gmail?.email ? (
        <section className="mt-6 rounded-md border border-teal/35 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-teal" />
            <h2 className="font-semibold">Gmail career signals</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-ink/65">
            {profile.gmail.important_count ?? 0} important Gmail message(s) are available. Career-related signals are prioritized for follow-ups and prep.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {(profile.gmail.career_signals ?? []).length ? (
              (profile.gmail.career_signals ?? []).map((signal) => (
                <article className="rounded-md bg-panel p-4" key={`${signal.subject}-${signal.from}`}>
                  <h3 className="text-sm font-semibold">{signal.subject || "Career signal"}</h3>
                  <p className="mt-1 text-xs text-ink/55">{signal.from || "Unknown sender"}</p>
                  <p className="mt-3 text-xs leading-5 text-ink/60">{signal.reason}</p>
                </article>
              ))
            ) : (
              <div className="rounded-md bg-panel p-4 text-sm text-ink/65">No career-specific Gmail signal found in the latest scan.</div>
            )}
          </div>
        </section>
      ) : null}

      {profile?.cv ? (
        <section className="mt-6 rounded-md border border-coral/35 bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-coral" />
                <h2 className="font-semibold">CV intelligence</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink/65">{profile.cv.summary || "CV has been analyzed and added to Growth memory."}</p>
            </div>
            <div className="rounded-md bg-coral/10 px-4 py-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-coral">CV score</p>
              <p className="mt-1 text-2xl font-semibold">{profile.cv.ats_score ?? 0}%</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
            <div>
              <h3 className="text-sm font-semibold">Role matches</h3>
              <div className="mt-3 grid gap-3">
                {(profile.cv.role_matches ?? []).map((match) => (
                  <article className="rounded-md bg-panel p-4" key={match.title}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{match.title}</p>
                      <span className="rounded-md bg-white px-3 py-1 text-xs font-semibold">{match.score}% match</span>
                    </div>
                    <p className="mt-2 text-xs text-ink/55">Matched: {match.matched.length ? match.matched.join(", ") : "Needs clearer evidence"}</p>
                    <p className="mt-1 text-xs text-ink/55">Missing: {match.missing.length ? match.missing.join(", ") : "No major missing keywords"}</p>
                  </article>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold">Missing keywords</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {(profile.cv.missing_keywords ?? []).map((keyword) => (
                  <span className="rounded-md bg-panel px-3 py-2 text-xs font-semibold" key={keyword}>{keyword}</span>
                ))}
              </div>
              {profile.cv.next_best_project ? (
                <div className="mt-4 rounded-md bg-panel p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">Next project</p>
                  <p className="mt-2 text-sm leading-6 text-ink/70">{profile.cv.next_best_project}</p>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {learningResources ? (
        <section className="mt-6 rounded-md border border-line bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap size={18} className="text-teal" />
                <h2 className="text-lg font-semibold">Learning Radar</h2>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
                Suggested from your target role, GitHub languages, CV gaps, and MyAgent's agent-building roadmap.
              </p>
            </div>
            <span className="w-fit rounded-md bg-teal/10 px-3 py-2 text-xs font-semibold text-teal">
              Personalized path
            </span>
          </div>

          {learningError ? <div className="mt-4 rounded-md border border-coral/40 bg-coral/10 p-3 text-sm text-coral">{learningError}</div> : null}

          <div className="mt-5 grid gap-5 xl:grid-cols-3">
            <LearningColumn
              icon={<BookOpen size={17} className="text-gold" />}
              learningByKey={learningByKey}
              onTrack={trackResource}
              resources={learningResources.courses}
              trackingKey={trackingKey}
              title="Courses"
            />
            <LearningColumn
              icon={<Youtube size={17} className="text-coral" />}
              learningByKey={learningByKey}
              onTrack={trackResource}
              resources={learningResources.youtube}
              trackingKey={trackingKey}
              title="YouTube"
            />
            <LearningColumn
              icon={<Code2 size={17} className="text-teal" />}
              learningByKey={learningByKey}
              onTrack={trackResource}
              resources={learningResources.projects}
              trackingKey={trackingKey}
              title="Practice"
            />
          </div>
        </section>
      ) : null}

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Latest Study Watchlist</h2>
          {(plan?.latest_studies || studyFallback).map((study) => (
            <article key={study.title} className="rounded-md border border-line bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-md bg-panel px-2 py-1">{study.source_name || "MyAgent"}</span>
                    {study.published ? <span className="rounded-md bg-panel px-2 py-1">{study.published}</span> : null}
                    {study.source_type === "live_arxiv" ? <span className="rounded-md bg-teal/10 px-2 py-1 text-teal">Live</span> : null}
                    {study.relevance_score ? <span className="rounded-md bg-gold/10 px-2 py-1 text-gold">{study.relevance_score}% relevant</span> : null}
                  </div>
                  <h3 className="mt-3 font-semibold">{study.title}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${
                      trackedStudies[study.title] ? "border-teal bg-teal/10 text-teal" : "border-line"
                    }`}
                    onClick={() => setTrackedStudies((current) => ({ ...current, [study.title]: !current[study.title] }))}
                    type="button"
                  >
                    <Plus size={15} />
                    {trackedStudies[study.title] ? "Tracking" : "Track"}
                  </button>
                  {study.url ? (
                    <a className="rounded-md border border-line px-3 py-2 text-sm font-semibold" href={study.url} rel="noreferrer" target="_blank">
                      Open paper
                    </a>
                  ) : null}
                </div>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink/65">{study.why_it_matters}</p>
              {study.tags?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {study.tags.map((tag) => (
                    <span className="rounded-md bg-panel px-2 py-1 text-xs font-semibold" key={tag}>{tag}</span>
                  ))}
                </div>
              ) : null}
              {study.summary ? <p className="mt-3 line-clamp-4 text-sm leading-6 text-ink/55">{study.summary}</p> : null}
              <div className="mt-4 grid gap-3">
                {study.takeaway ? <StudyInsight label="Takeaway" value={study.takeaway} /> : null}
                {study.project_idea ? <StudyInsight label="Project idea" value={study.project_idea} /> : null}
                {study.career_move ? <StudyInsight label="Career move" value={study.career_move} /> : null}
              </div>
              {study.authors?.length ? <p className="mt-3 text-xs font-semibold text-ink/45">Authors: {study.authors.join(", ")}</p> : null}
              {study.query ? <p className="mt-2 text-xs text-ink/45">Query: {study.query}</p> : null}
            </article>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <BriefcaseBusiness size={18} className="text-teal" />
              <h2 className="text-lg font-semibold">Job Radar</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-ink/65">Matched from your CV, GitHub, Gmail career signals, and student/professional track.</p>
          </div>
          {jobError ? <div className="rounded-md border border-coral/40 bg-coral/10 p-3 text-sm text-coral">{jobError}</div> : null}
          {(plan?.job_recommendations || []).map((job) => (
            <JobCard
              isTracking={trackingJobKey === jobKey(job)}
              item={jobsByKey[jobKey(job)]}
              job={job}
              key={job.id}
              onTrack={trackJobTarget}
            />
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-md border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Improve Next</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(plan?.improvement_plan.map((item) => item.recommendation) || fallbackGrowth.improvements).map((item) => (
            <div key={item} className="rounded-md bg-panel p-4 text-sm text-ink/70">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-md border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold">This Week</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(plan?.weekly_plan ?? []).map((item) => (
            <div key={`${item.day}-${item.task}`} className="rounded-md bg-panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">{item.day}</p>
              <p className="mt-2 text-sm leading-6 text-ink/70">{item.task}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function StudyInsight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-panel p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">{label}</p>
      <p className="mt-2 text-sm leading-6 text-ink/70">{value}</p>
    </div>
  );
}

function JobCard({
  isTracking,
  item,
  job,
  onTrack
}: {
  isTracking: boolean;
  item?: JobItem;
  job: JobRecommendation;
  onTrack: (job: JobRecommendation) => Promise<void>;
}) {
  return (
    <article className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">{job.company_type}</p>
          <h3 className="mt-2 font-semibold">{job.title}</h3>
          <p className="mt-1 text-xs text-ink/55">{job.location} | {job.source}</p>
        </div>
        <span className="w-fit rounded-md bg-gold/10 px-3 py-2 text-xs font-semibold text-gold">{job.match_score}% match</span>
      </div>

      <p className="mt-3 text-sm leading-6 text-ink/65">{job.why}</p>

      <div className="mt-4 grid gap-3">
        <JobList label="Matched" values={job.matched_skills} />
        <JobList label="Missing" values={job.missing_skills} />
      </div>

      <div className="mt-4 rounded-md bg-panel p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">Apply prep</p>
        <ul className="mt-2 space-y-2 text-sm leading-6 text-ink/70">
          {job.apply_prep.slice(0, 3).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>

      {item ? (
        <div className="mt-3 rounded-md border border-teal/30 bg-teal/10 p-3 text-sm font-semibold text-teal">
          Saved to job tasks: {item.status.replaceAll("_", " ")}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={Boolean(item) || isTracking}
          onClick={() => void onTrack(job)}
          type="button"
        >
          <Plus size={14} />
          {item ? "Tracked" : isTracking ? "Tracking..." : "Track job"}
        </button>
        {Object.entries(job.search_links ?? {}).map(([source, url]) => (
          <a className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold" href={url} key={source} rel="noreferrer" target="_blank">
            {source}
            <ExternalLink size={14} />
          </a>
        ))}
      </div>
    </article>
  );
}

function JobList({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(values.length ? values : ["Needs clearer evidence"]).map((value) => (
          <span className="rounded-md bg-panel px-2 py-1 text-xs font-semibold" key={value}>{value}</span>
        ))}
      </div>
    </div>
  );
}

function LearningColumn({
  icon,
  learningByKey,
  onTrack,
  resources,
  title,
  trackingKey
}: {
  icon: ReactNode;
  learningByKey: Record<string, LearningItem>;
  onTrack: (resource: LearningResource) => Promise<void>;
  resources: LearningResource[];
  title: string;
  trackingKey: string | null;
}) {
  return (
    <div className="rounded-md bg-panel p-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="mt-4 grid gap-3">
        {resources.map((resource) => {
          const key = learningResourceKey(resource);
          const tracked = learningByKey[key];
          const isTracking = trackingKey === key;

          return (
            <article className="rounded-md border border-line bg-white p-4" key={`${resource.type}-${resource.title}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold leading-5">{resource.title}</h4>
                  <p className="mt-1 text-xs text-ink/55">
                    {resource.provider} | {resource.level}
                    {resource.duration ? ` | ${resource.duration}` : ""}
                  </p>
                </div>
                <span className="rounded-md bg-gold/10 px-2 py-1 text-xs font-semibold text-gold">
                  {resource.priority}%
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink/65">{resource.why}</p>
              {tracked ? (
                <div className="mt-3 rounded-md border border-teal/30 bg-teal/10 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-teal">
                    <CheckCircle2 size={15} />
                    {formatLearningStatus(tracked.status)}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-ink/60">
                    Next: {tracked.weekly_plan[0]?.task || "Continue your learning plan."}
                  </p>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  disabled={Boolean(tracked) || isTracking}
                  onClick={() => void onTrack(resource)}
                  type="button"
                >
                  <Plus size={14} />
                  {tracked ? "Tracked" : isTracking ? "Tracking..." : "Track"}
                </button>
                {resource.url ? (
                  <a
                    className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold"
                    href={resource.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open
                    <ExternalLink size={14} />
                  </a>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function formatLearningStatus(status: string) {
  return status.replaceAll("_", " ");
}
