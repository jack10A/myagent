"use client";

import { AlertTriangle, CheckCircle2, ClipboardList, Link as LinkIcon, Mic, Pause, Play, Save, Send, Sparkles } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { analyzeCapture, type CaptureRequest, type CaptureResult } from "@/lib/capture";
import { trackLearningResource } from "@/lib/learning";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

type CaptureMode = CaptureRequest["capture_type"];

const sampleTranscript =
  "00:15 Jack explains that MyAgent should help students and early-career builders. 02:40 The team agrees to add a Capture Agent for meetings and YouTube videos. 04:10 Action item: connect summaries to Memory and Tasks. 06:05 Decision: Gmail replies must stay as drafts until the user approves them.";

const sampleYoutubeTranscript =
  "00:20 The instructor explains that AI agents use tools, memory, and planning loops. 02:15 The video compares chatbots with proactive agents that monitor signals and prepare actions. 04:45 Important point: every external action should require approval. 07:30 The recommended project is a personal agent that connects email, calendar, GitHub, and learning goals. 09:10 Action item: build a demo showing one command creating a safe recommendation.";

export function CaptureWorkbench() {
  const [captureType, setCaptureType] = useState<CaptureMode>("meeting");
  const [title, setTitle] = useState("MyAgent planning meeting");
  const [sourceUrl, setSourceUrl] = useState("");
  const [question, setQuestion] = useState("What are the important parts and next actions?");
  const [transcript, setTranscript] = useState("");
  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("Ready to capture.");
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [learningStatus, setLearningStatus] = useState("");
  const [savingLearning, setSavingLearning] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const canSubmit = useMemo(() => {
    if (loading) return false;
    if (captureType === "youtube") return Boolean(sourceUrl.trim()) || transcript.trim().length > 20;
    return transcript.trim().length > 20;
  }, [captureType, loading, sourceUrl, transcript]);

  function selectCaptureType(type: CaptureMode) {
    setCaptureType(type);
    if (type === "youtube" && title === "MyAgent planning meeting") {
      setTitle("YouTube capture");
    }
    if (type === "lecture") setTitle("Lecture capture");
    if (type === "interview") setTitle("Interview prep capture");
    if (type === "research") setTitle("Research notes capture");
    if (type === "meeting" && title === "YouTube capture") {
      setTitle("MyAgent planning meeting");
    }
  }

  function startSpeechCapture() {
    const speechWindow = window as SpeechWindow;
    const SpeechRecognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus("Your browser does not support live speech transcription. Paste meeting notes or transcript below.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let finalText = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const item = event.results[index];
        if (item.isFinal) {
          finalText += `${item[0].transcript} `;
        }
      }
      if (finalText.trim()) {
        setTranscript((current) => `${current.trim()} ${finalText.trim()}`.trim());
      }
    };
    recognition.onend = () => setRecording(false);
    recognition.onerror = () => {
      setStatus("Speech capture stopped. You can keep typing or paste a transcript.");
      setRecording(false);
    };
    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
    setStatus("Recording transcript from your microphone...");
  }

  function stopSpeechCapture() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setRecording(false);
    setStatus("Recording stopped. Review the transcript before analyzing.");
  }

  async function submit() {
    setLoading(true);
    setResult(null);
    try {
      const data = await analyzeCapture({
        capture_type: captureType,
        title: captureType === "youtube" && title === "MyAgent planning meeting" ? undefined : title,
        source_url: sourceUrl || undefined,
        question,
        transcript,
        consent_confirmed: captureType !== "meeting" || consent
      });
      setResult(data);
      setLearningStatus("");
      setStatus(data.saved_to_memory ? "Summary created and saved into demo memory." : "Guardian requires consent before saving this meeting.");
    } catch {
      setStatus("Capture API is not reachable. Start the backend and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function saveToLearningPlan() {
    if (!result) return;
    setSavingLearning(true);
    setLearningStatus("");
    try {
      await trackLearningResource({
        title: result.title || "Captured YouTube learning",
        provider: result.source_kind === "youtube" ? "YouTube Capture" : "Capture Agent",
        level: "Practical",
        duration: "7-day plan",
        url: result.source_url ?? undefined,
        why: buildLearningWhy(result),
        priority: result.source_kind === "youtube" ? 88 : 76,
        type: result.source_kind === "youtube" ? "youtube" : "project"
      });
      setLearningStatus("Saved to Growth learning plan. Check Growth or Tasks.");
    } catch {
      setLearningStatus("Could not save to Learning Plan. Make sure the backend is running.");
    } finally {
      setSavingLearning(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-md border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <Sparkles className="text-teal" />
          <h2 className="text-lg font-semibold">Capture input</h2>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-md bg-panel p-1 sm:grid-cols-3">
          {(["meeting", "youtube", "lecture", "interview", "research", "notes"] as const).map((type) => (
            <button
              className={`rounded-md px-3 py-2 text-sm font-semibold transition ${captureType === type ? "bg-white shadow-soft" : "text-ink/60 hover:text-ink"}`}
              key={type}
              onClick={() => selectCaptureType(type)}
            >
              {type}
            </button>
          ))}
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-semibold">Title</span>
          <input className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-teal" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        {captureType === "youtube" && (
          <label className="mt-4 block">
            <span className="text-sm font-semibold">YouTube link</span>
            <div className="mt-2 flex items-center gap-2 rounded-md border border-line px-3 py-2">
              <LinkIcon size={16} className="text-ink/40" />
              <input className="w-full text-sm outline-none" placeholder="https://youtube.com/watch?v=..." value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} />
            </div>
          </label>
        )}

        <label className="mt-4 block">
          <span className="text-sm font-semibold">Question</span>
          <input className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-teal" value={question} onChange={(event) => setQuestion(event.target.value)} />
        </label>

        {captureType === "meeting" && (
          <div className="mt-4 rounded-md border border-gold/50 bg-gold/10 p-3">
            <label className="flex items-start gap-3 text-sm">
              <input className="mt-1" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              <span>I confirm the meeting can be recorded or summarized and sensitive content should stay private.</span>
            </label>
          </div>
        )}

        <CaptureModeHint type={captureType} />

        <div className="mt-4 flex flex-wrap gap-2">
          {captureType === "meeting" && (
            <button
              className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold"
              onClick={recording ? stopSpeechCapture : startSpeechCapture}
            >
              {recording ? <Pause size={16} /> : <Mic size={16} />}
              {recording ? "Stop" : "Record transcript"}
            </button>
          )}
          <button className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold" onClick={() => setTranscript(sampleTranscript)}>
            <Play size={16} />
            Use sample
          </button>
          {captureType === "youtube" && (
            <button className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold" onClick={() => setTranscript(sampleYoutubeTranscript)}>
              <Play size={16} />
              YouTube sample
            </button>
          )}
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-semibold">Transcript or notes</span>
          <textarea
            className="mt-2 min-h-56 w-full resize-y rounded-md border border-line px-3 py-2 text-sm leading-6 outline-none focus:border-teal"
            placeholder={captureType === "youtube" ? "Paste the YouTube transcript here. Timestamps like 02:15 help MyAgent point to the exact part." : "Paste meeting transcript, lecture notes, or start recording..."}
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
          />
        </label>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink/60">{status}</p>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canSubmit}
            onClick={submit}
          >
            <Send size={16} />
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </section>

      <section className="space-y-4">
        {!result && (
          <article className="rounded-md border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <ClipboardList className="text-teal" />
              <h2 className="text-lg font-semibold">Capture output</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/65">
              MyAgent will create a summary, important points, decisions, action items, relevant timestamps, questions, and a draft follow-up.
            </p>
          </article>
        )}

        {result && (
          <>
            <article className="rounded-md border border-line bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-teal" />
                  <h2 className="text-lg font-semibold">{result.title}</h2>
                </div>
                <span className="rounded-md bg-panel px-3 py-1 text-xs font-semibold">{result.guardian.decision}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink/65">{result.summary}</p>
              <div className="mt-4 rounded-md border border-teal/35 bg-teal/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">30-second summary</p>
                <p className="mt-2 text-sm leading-6 text-ink/70">{result.short_summary}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-md bg-panel px-3 py-2 text-xs font-semibold text-ink/65">
                  <Save size={14} />
                  {result.saved_to_memory ? "Saved to Memory" : "Not saved"}
                </span>
                <span className="rounded-md bg-panel px-3 py-2 text-xs font-semibold capitalize text-ink/65">{result.source_kind}</span>
                {result.source_url ? (
                  <a className="rounded-md border border-teal/30 px-3 py-2 text-xs font-semibold text-teal hover:bg-teal hover:text-white" href={result.source_url} target="_blank">
                    Open source
                  </a>
                ) : null}
                <button
                  className="rounded-md bg-ink px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={savingLearning || !result.saved_to_memory}
                  onClick={() => void saveToLearningPlan()}
                  type="button"
                >
                  {savingLearning ? "Saving..." : "Save to Learning Plan"}
                </button>
                {result.saved_to_memory ? (
                  <a className="rounded-md border border-line px-3 py-2 text-xs font-semibold" href="/tasks">
                    Open created tasks
                  </a>
                ) : null}
              </div>
              {learningStatus ? <p className="mt-3 rounded-md bg-panel p-3 text-sm font-semibold text-teal">{learningStatus}</p> : null}
            </article>

            {result.answer && (
              <article className="rounded-md border border-teal/50 bg-white p-5 shadow-soft">
                <p className="text-sm font-semibold text-teal">Answer</p>
                <p className="mt-2 text-sm leading-6 text-ink/70">{result.answer}</p>
              </article>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <ResultList title="Important points" items={result.important_points} />
              <ResultList title="Action items" items={result.action_items} />
              <ResultList title="Next tasks" items={result.next_tasks} />
              <ResultList title="Decisions" items={result.decisions.length ? result.decisions : ["No clear decisions detected."]} />
              <ResultList title="People mentioned" items={result.people.length ? result.people : ["No people detected."]} />
              <ResultList title="Questions to ask" items={result.questions_to_ask} />
            </div>

            <article className="rounded-md border border-line bg-white p-5 shadow-soft">
              <p className="text-sm font-semibold">Follow-up draft</p>
              <pre className="mt-3 whitespace-pre-wrap rounded-md bg-panel p-4 font-sans text-sm leading-6 text-ink/70">{result.draft_follow_up}</pre>
            </article>

            <article className="rounded-md border border-line bg-white p-5 shadow-soft">
              <p className="text-sm font-semibold">Relevant parts</p>
              <div className="mt-3 space-y-3">
                {result.relevant_parts.length ? result.relevant_parts.map((part, index) => (
                  <div className="rounded-md bg-panel p-3" key={`${part.timestamp}-${index}-${part.text.slice(0, 20)}`}>
                    <p className="text-xs font-semibold text-teal">{part.timestamp || "No timestamp"} - relevance {part.relevance}</p>
                    <p className="mt-1 text-sm leading-6 text-ink/65">{part.text}</p>
                  </div>
                )) : <p className="text-sm text-ink/55">No relevant transcript parts yet.</p>}
              </div>
            </article>

            <article className="rounded-md border border-line bg-white p-5 shadow-soft">
              <div className="flex items-center gap-2">
                <AlertTriangle size={17} className="text-gold" />
                <p className="text-sm font-semibold">Guardian</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink/65">{result.guardian.reason}</p>
            </article>
          </>
        )}
      </section>
    </div>
  );
}

function CaptureModeHint({ type }: { type: CaptureMode }) {
  const copy: Record<CaptureMode, string> = {
    meeting: "Confirm consent, then record or paste notes. MyAgent will extract decisions, owners, and follow-ups.",
    youtube: "Paste a link. MyAgent will try public captions automatically; paste a transcript if captions are unavailable.",
    lecture: "Paste class notes or transcript. MyAgent will produce review questions and learning tasks.",
    interview: "Paste prep notes or a mock interview. MyAgent will extract weak answers and practice questions.",
    research: "Paste paper notes or abstracts. MyAgent will extract claims, experiments, and follow-up ideas.",
    notes: "Paste any notes. MyAgent will turn them into memory, tasks, and a follow-up draft."
  };
  return <p className="mt-3 rounded-md bg-panel p-3 text-xs leading-5 text-ink/60">{copy[type]}</p>;
}

function buildLearningWhy(result: CaptureResult) {
  const bestPoint = result.important_points[0] || result.summary;
  const bestTask = result.next_tasks[0] || "Review and turn this into a small MyAgent improvement.";
  return `${bestPoint} Next practical step: ${bestTask}`;
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-md border border-line bg-white p-5 shadow-soft">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <p className="rounded-md bg-panel p-3 text-sm leading-6 text-ink/65" key={item}>
            {item}
          </p>
        ))}
      </div>
    </article>
  );
}
