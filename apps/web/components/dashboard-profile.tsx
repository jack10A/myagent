"use client";

import Link from "next/link";
import { Brain, Github, MapPin, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { getProfile, type MyAgentProfile } from "@/lib/profile";

export function DashboardProfile() {
  const [profile, setProfile] = useState<MyAgentProfile | null>(null);
  const [source, setSource] = useState("browser");

  useEffect(() => {
    getProfile()
      .then((remoteProfile) => {
        setProfile(remoteProfile);
        setSource("backend");
      })
      .catch(() => {
        const raw = window.localStorage.getItem("myagent.profile");
        if (raw) {
          setProfile(JSON.parse(raw) as MyAgentProfile);
        }
      });
  }, []);

  function resetInterview() {
    window.localStorage.removeItem("myagent.profile.completed");
    window.localStorage.removeItem("myagent.profile.dismissed");
    window.location.reload();
  }

  return (
    <article className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-white">
          <UserRound size={18} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Context Profile</p>
          <h2 className="text-lg font-semibold">{profile?.name ? `${profile.name}'s MyAgent` : "MyAgent needs your profile"}</h2>
          <p className="mt-1 text-xs text-ink/50">Source: {source}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md bg-panel p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink/55">
            <Brain size={14} />
            Path
          </div>
          <p className="mt-2 text-sm font-semibold">{profile?.lifeStage || "Not answered yet"}</p>
          <p className="mt-1 text-xs text-ink/60">{profile?.field || "Field not set"}</p>
        </div>
        <div className="rounded-md bg-panel p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink/55">
            <MapPin size={14} />
            Guardian City
          </div>
          <p className="mt-2 text-sm font-semibold">{profile?.city || "Use live location"}</p>
          <p className="mt-1 text-xs text-ink/60">{profile?.goal || "Goal not set"}</p>
        </div>
      </div>

      {profile?.github ? (
        <div className="mt-3 rounded-md bg-panel p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink/55">
            <Github size={14} />
            GitHub Signal
          </div>
          <p className="mt-2 text-sm font-semibold">{profile.github.login || "Connected"}</p>
          <p className="mt-1 text-xs text-ink/60">
            {profile.github.repos_scanned || 0} repos scanned for career evidence
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" href="/growth">
          Improve career
        </Link>
        <Link className="rounded-md border border-line px-4 py-2 text-sm font-semibold" href="/map">
          Check nearby alerts
        </Link>
        <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold" onClick={resetInterview} type="button">
          Reopen interview
        </button>
      </div>
    </article>
  );
}
