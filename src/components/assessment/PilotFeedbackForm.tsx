"use client";
import { useState } from "react";

function Stars({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 text-sm text-zinc-700">{label}</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-9 w-9 rounded border text-sm ${
              n <= value ? "bg-zinc-900 text-white" : "bg-white text-zinc-600"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PilotFeedbackForm({ responseId }: { responseId: string | null }) {
  const [overall, setOverall] = useState(0);
  const [clarity, setClarity] = useState(0);
  const [difficulty, setDifficulty] = useState(0);
  const [fairness, setFairness] = useState(0);
  const [timing, setTiming] = useState("");
  const [questions, setQuestions] = useState("");
  const [ux, setUx] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!responseId) {
    return (
      <p className="text-sm text-zinc-500">
        Pilot feedback requires a submitted response. Complete the assessment first.
      </p>
    );
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    if ([overall, clarity, difficulty, fairness].some((v) => v < 1)) {
      setError("Please rate all four dimensions (1–5).");
      return;
    }
    setStatus("submitting");
    const r = await fetch("/api/pilot/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        response_id: responseId,
        overall_rating: overall,
        clarity_rating: clarity,
        difficulty_rating: difficulty,
        fairness_rating: fairness,
        timing_comments: timing,
        question_comments: questions,
        ux_issues: ux,
        additional_notes: notes,
      }),
    });
    if (r.ok) {
      setStatus("done");
      return;
    }
    const body = await r.json().catch(() => ({}));
    setError(body.error ?? "Unable to submit feedback.");
    setStatus("error");
  }

  if (status === "done") {
    return <p className="rounded bg-green-50 p-3 text-sm text-green-800">Thank you — feedback recorded.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Stars value={overall} onChange={setOverall} label="Overall experience (1 = poor, 5 = excellent)" />
      <Stars value={clarity} onChange={setClarity} label="Clarity of questions" />
      <Stars value={difficulty} onChange={setDifficulty} label="Difficulty (1 = too easy, 5 = too hard)" />
      <Stars value={fairness} onChange={setFairness} label="Perceived fairness" />
      <div>
        <label className="block text-sm text-zinc-700">Timing comments</label>
        <textarea value={timing} onChange={(e) => setTiming(e.target.value)} rows={2} className="w-full rounded border p-2" />
      </div>
      <div>
        <label className="block text-sm text-zinc-700">Question clarity / ambiguity</label>
        <textarea value={questions} onChange={(e) => setQuestions(e.target.value)} rows={2} className="w-full rounded border p-2" />
      </div>
      <div>
        <label className="block text-sm text-zinc-700">UX issues encountered</label>
        <textarea value={ux} onChange={(e) => setUx(e.target.value)} rows={2} className="w-full rounded border p-2" />
      </div>
      <div>
        <label className="block text-sm text-zinc-700">Anything else?</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded border p-2" />
      </div>
      {error ? <p className="rounded bg-red-50 p-2 text-sm text-red-800">{error}</p> : null}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {status === "submitting" ? "Submitting…" : "Submit feedback"}
      </button>
    </form>
  );
}
