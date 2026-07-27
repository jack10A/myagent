"use client";

import { RefreshCw, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { getCaptureTasks, type CaptureTask } from "@/lib/capture";

export function CaptureTaskList() {
  const [tasks, setTasks] = useState<CaptureTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getCaptureTasks();
      setTasks(data.tasks);
    } catch {
      setError("Could not load Capture tasks. Start the backend, then refresh.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return <div className="rounded-md border border-line bg-white p-5 text-sm text-ink/65 shadow-soft">Loading Capture tasks...</div>;
  }

  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">Capture Agent</p>
          <h2 className="font-semibold">Capture follow-up tasks</h2>
        </div>
        <button aria-label="Refresh Capture tasks" className="flex h-10 w-10 items-center justify-center rounded-md border border-line" onClick={() => void load()} title="Refresh Capture tasks" type="button">
          <RefreshCw size={16} />
        </button>
      </div>

      {error ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {!tasks.length ? (
        <article className="mt-4 rounded-md border border-dashed border-line p-4">
          <p className="font-semibold">No Capture tasks yet</p>
          <p className="mt-2 text-sm leading-6 text-ink/65">Analyze a meeting, notes, or YouTube transcript from Capture to create follow-up tasks.</p>
        </article>
      ) : null}

      <div className="mt-4 space-y-3">
        {tasks.map((task) => (
          <article className="rounded-md bg-panel p-4" key={task.id}>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white">
                <Video size={16} className="text-teal" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold leading-snug">{task.title}</p>
                <p className="mt-1 text-sm text-ink/55">{task.source_title} | {task.capture_type}</p>
                {task.source_url ? (
                  <a className="mt-2 inline-flex rounded-md border border-teal/30 px-2 py-1 text-xs font-semibold text-teal hover:bg-teal hover:text-white" href={task.source_url} target="_blank">
                    Open source
                  </a>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
