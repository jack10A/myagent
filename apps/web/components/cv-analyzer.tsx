"use client";

import { FileText, Loader2, ShieldCheck, Upload } from "lucide-react";
import { useState } from "react";
import { API_URL } from "@/lib/api";

type CvAnalysis = {
  filename: string;
  role_guess: string;
  detected_skills: string[];
  detected_sections: string[];
  strengths: string[];
  improvements: string[];
  role_matches?: Array<{ title: string; score: number; matched: string[]; missing: string[] }>;
  missing_keywords?: string[];
  ats_score?: number;
  next_best_project?: string;
  summary: string;
  privacy: string;
};

export function CvAnalyzer() {
  const [analysis, setAnalysis] = useState<CvAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function uploadCv(file: File | null) {
    if (!file) {
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const response = await fetch(`${API_URL}/growth/cv/analyze`, {
        method: "POST",
        body: form
      });

      if (!response.ok) {
        throw new Error(`CV analysis failed with status ${response.status}`);
      }

      const result = (await response.json()) as CvAnalysis;
      setAnalysis(result);
      window.dispatchEvent(new Event("myagent:cv-analyzed"));
    } catch {
      setError("Could not analyze the CV. Make sure the backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-6 rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-panel">
            <FileText size={18} />
          </span>
          <div>
            <h2 className="text-lg font-semibold">CV Analyzer</h2>
            <p className="mt-1 text-sm text-ink/65">Upload your resume so MyAgent can improve job recommendations.</p>
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white">
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
          {loading ? "Analyzing..." : "Upload CV"}
          <input
            accept=".pdf,.txt"
            className="hidden"
            disabled={loading}
            onChange={(event) => uploadCv(event.target.files?.[0] ?? null)}
            type="file"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-md bg-panel p-3 text-xs text-ink/65">
        <ShieldCheck size={15} className="text-teal" />
        The MVP analyzes the file in memory and does not store it.
      </div>

      {error ? <p className="mt-4 rounded-md border border-coral/60 p-3 text-sm text-coral">{error}</p> : null}

      {analysis ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-md bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Detected Profile</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">{analysis.role_guess}</h3>
              <span className="rounded-md bg-white px-3 py-1 text-xs font-semibold">CV score {analysis.ats_score ?? 0}%</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/65">{analysis.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {analysis.detected_skills.map((skill) => (
                <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold" key={skill}>
                  {skill}
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {analysis.detected_sections.map((section) => (
                <span className="rounded-md border border-line bg-white px-2 py-1 text-xs font-semibold" key={section}>
                  {section}
                </span>
              ))}
            </div>
          </article>

          <article className="rounded-md bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral">Improve Next</p>
            <div className="mt-3 space-y-2">
              {analysis.improvements.map((item) => (
                <p className="rounded-md bg-white p-3 text-sm text-ink/70" key={item}>
                  {item}
                </p>
              ))}
            </div>
          </article>

          <article className="rounded-md bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Role Matches</p>
            <div className="mt-3 space-y-2">
              {(analysis.role_matches ?? []).map((match) => (
                <div className="rounded-md bg-white p-3" key={match.title}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{match.title}</p>
                    <p className="text-xs font-semibold">{match.score}%</p>
                  </div>
                  <p className="mt-2 text-xs text-ink/55">Missing: {match.missing.join(", ") || "No major missing keywords"}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-md bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Next Best Project</p>
            <p className="mt-3 text-sm leading-6 text-ink/70">{analysis.next_best_project}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(analysis.missing_keywords ?? []).map((keyword) => (
                <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold" key={keyword}>{keyword}</span>
              ))}
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}
