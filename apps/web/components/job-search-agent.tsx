"use client";

import { BriefcaseBusiness, CheckCircle2, ExternalLink, Loader2, Plus, Search, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { jobKey, searchJobs, trackJob, type JobItem, type JobRecommendation, type JobSearchResponse } from "@/lib/jobs";

export function JobSearchAgent() {
  const [query, setQuery] = useState("AI internship");
  const [location, setLocation] = useState("Berlin or remote");
  const [result, setResult] = useState<JobSearchResponse | null>(null);
  const [tracked, setTracked] = useState<Record<string, JobItem>>({});
  const [loading, setLoading] = useState(false);
  const [trackingKey, setTrackingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void runSearch("AI internship", "Berlin or remote", true);
  }, []);

  async function runSearch(nextQuery = query, nextLocation = location, quiet = false) {
    if (!nextQuery.trim()) {
      setError("Write the role you want first.");
      return;
    }
    setLoading(true);
    if (!quiet) {
      setError(null);
    }
    try {
      const data = await searchJobs(nextQuery, nextLocation);
      setResult(data);
      setError(null);
    } catch {
      setError("Job Search Agent needs the backend running.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSearch();
  }

  async function track(job: JobRecommendation) {
    const key = jobKey(job);
    setTrackingKey(key);
    try {
      const response = await trackJob(job);
      setTracked((current) => ({ ...current, [response.item.job_key]: response.item }));
      setError(null);
    } catch {
      setError("Could not track this job yet.");
    } finally {
      setTrackingKey(null);
    }
  }

  return (
    <section className="mt-6 rounded-md border border-teal/40 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BriefcaseBusiness size={18} className="text-teal" />
            <h2 className="text-lg font-semibold">Job Search Agent</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
            Searches internship directions using your LinkedIn details, GitHub proof-of-work, CV skills, Gmail career signals, and current Growth memory.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-md bg-teal/10 px-3 py-2 text-xs font-semibold text-teal">
          <Sparkles size={14} />
          Personalized search
        </span>
      </div>

      <form className="mt-5 grid gap-3 lg:grid-cols-[1fr_0.7fr_auto]" onSubmit={onSubmit}>
        <label className="grid gap-2 text-sm font-semibold">
          Role
          <input
            className="h-11 rounded-md border border-line bg-white px-3 text-sm font-normal outline-none focus:border-teal"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="AI internship, backend intern, ML intern..."
            value={query}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Location
          <input
            className="h-11 rounded-md border border-line bg-white px-3 text-sm font-normal outline-none focus:border-teal"
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Berlin, Cairo, remote..."
            value={location}
          />
        </label>
        <button
          className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50"
          disabled={loading}
          type="submit"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Search
        </button>
      </form>

      {error ? <div className="mt-4 rounded-md border border-coral/40 bg-coral/10 p-3 text-sm text-coral">{error}</div> : null}

      {result ? (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <Signal label="Target" value={result.profile.target_role} />
            <Signal label="Strongest proof" value={result.profile.strongest_language} />
            <Signal label="LinkedIn" value={result.profile.linkedin_ready ? "Ready" : "Needs details"} />
            <Signal label="Skills used" value={`${result.profile.skills.length} signal(s)`} />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {result.results.map((job) => {
              const key = jobKey(job);
              return (
                <article className="rounded-md border border-line bg-panel p-4" key={job.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">{job.company_type}</p>
                      <h3 className="mt-2 font-semibold">{job.title}</h3>
                      <p className="mt-1 text-xs text-ink/55">{job.location} | {job.source}</p>
                    </div>
                    <span className="w-fit rounded-md bg-gold/10 px-3 py-2 text-xs font-semibold text-gold">{job.match_score}% match</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink/65">{job.why}</p>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <SkillList label="Matched" values={job.matched_skills} />
                    <SkillList label="Improve" values={job.missing_skills} />
                  </div>

                  <div className="mt-4 rounded-md bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">Next action</p>
                    <p className="mt-2 text-sm leading-6 text-ink/70">{job.next_action}</p>
                  </div>

                  {tracked[key] ? (
                    <div className="mt-3 flex items-center gap-2 rounded-md border border-teal/30 bg-teal/10 p-3 text-sm font-semibold text-teal">
                      <CheckCircle2 size={15} />
                      Saved to job tasks
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      disabled={Boolean(tracked[key]) || trackingKey === key}
                      onClick={() => void track(job)}
                      type="button"
                    >
                      <Plus size={14} />
                      {tracked[key] ? "Tracked" : trackingKey === key ? "Tracking..." : "Track"}
                    </button>
                    {Object.entries(job.search_links).map(([source, url]) => (
                      <a
                        className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold"
                        href={url}
                        key={source}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {source}
                        <ExternalLink size={14} />
                      </a>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-panel p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function SkillList({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(values.length ? values : ["Needs clearer evidence"]).map((value) => (
          <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold" key={value}>{value}</span>
        ))}
      </div>
    </div>
  );
}
