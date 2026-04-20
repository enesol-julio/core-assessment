"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { interpolateString, lookupString, type StringsMap } from "@/lib/content/strings-client";

type ServedQuestion = {
  question_id: string;
  type: "single_select" | "multi_select" | "drag_to_order" | "open_ended";
  difficulty: string;
  points: number;
  prompt: string;
  context?: string | null;
  timer_config: {
    time_allowed_seconds: number;
    warning_seconds: number;
    show_timer: "visible" | "hidden_with_warning" | "per_question";
    auto_advance: boolean;
  };
  options?: { option_id: string; text: string }[];
  items?: { item_id: string; text: string }[];
  constraints?: { char_limit: number; word_limit: number; placeholder_text?: string };
  subtype?: string;
};

type ServedSection = {
  section_id: string;
  order: number;
  name: string;
  short_name: string;
  instructions: string;
  weight: number;
  timer_mode: string;
  question_count: number;
  questions: ServedQuestion[];
};

type StartResponse = {
  assessment_id: string;
  assessment_version: string;
  language: "en" | "es";
  sections: ServedSection[];
};

type Answer = {
  questionId: string;
  type: ServedQuestion["type"];
  timeTaken: number;
  timeAllowed: number;
  autoAdvanced: boolean;
  warningTriggered: boolean;
  singleAnswer?: string | null;
  multiAnswer?: string[];
  orderAnswer?: string[];
  openText?: string;
};

type Phase =
  | { kind: "loading" }
  | { kind: "briefing"; data: StartResponse }
  | { kind: "section_intro"; data: StartResponse; sectionIdx: number }
  | {
      kind: "question";
      data: StartResponse;
      sectionIdx: number;
      questionIdx: number;
      startedAt: number;
    }
  | { kind: "submitting"; data: StartResponse }
  | { kind: "error"; message: string };

function nowIso(): string {
  return new Date().toISOString();
}

export default function AssessmentRunner({
  strings,
  fallbackStrings,
  language,
}: {
  strings: StringsMap;
  fallbackStrings: StringsMap;
  language: "en" | "es";
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [sectionTimes, setSectionTimes] = useState<Record<string, { start: string; end?: string }>>({});
  const startedAtRef = useRef<string>(nowIso());

  const t = useCallback(
    (key: string, tokens: Record<string, string | number> = {}): string => {
      const base = lookupString(strings, key, fallbackStrings);
      return Object.keys(tokens).length ? interpolateString(base, tokens) : base;
    },
    [strings, fallbackStrings],
  );

  useEffect(() => {
    fetch("/api/assess/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`start failed: ${r.status}`);
        return r.json();
      })
      .then((data: StartResponse) => setPhase({ kind: "briefing", data }))
      .catch((err) => setPhase({ kind: "error", message: err.message }));
  }, [language]);

  const submit = useCallback(
    async (data: StartResponse) => {
      setPhase({ kind: "submitting", data });
      const completedAt = nowIso();
      const payload = {
        started_at: startedAtRef.current,
        completed_at: completedAt,
        environment: {
          browser: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
          os: typeof navigator !== "undefined" ? navigator.platform : "unknown",
          screen_resolution:
            typeof window !== "undefined" ? `${window.screen.width}x${window.screen.height}` : "unknown",
        },
        language,
        section_responses: data.sections.map((section) => {
          const windowTimes = sectionTimes[section.section_id] ?? {
            start: startedAtRef.current,
            end: completedAt,
          };
          return {
            section_id: section.section_id,
            started_at: windowTimes.start,
            completed_at: windowTimes.end ?? completedAt,
            question_responses: section.questions.map((q) => {
              const a = answers[q.question_id];
              const common = {
                question_id: q.question_id,
                variant_id: null,
                time_taken_seconds: a?.timeTaken ?? q.timer_config.time_allowed_seconds,
                time_allowed_seconds: q.timer_config.time_allowed_seconds,
                auto_advanced: a?.autoAdvanced ?? true,
                warning_triggered: a?.warningTriggered ?? false,
              };
              if (q.type === "single_select") {
                return { ...common, type: "single_select", answer: a?.singleAnswer ?? null };
              }
              if (q.type === "multi_select") {
                return { ...common, type: "multi_select", answer: a?.multiAnswer ?? [] };
              }
              if (q.type === "drag_to_order") {
                return {
                  ...common,
                  type: "drag_to_order",
                  answer: a?.orderAnswer ?? (q.items ?? []).map((i) => i.item_id),
                };
              }
              return { ...common, type: "open_ended", answer: a?.openText ?? "" };
            }),
          };
        }),
      };

      const res = await fetch("/api/assess/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setPhase({ kind: "error", message: err.error ?? "submit failed" });
        return;
      }
      router.push("/complete");
    },
    [answers, sectionTimes, language, router],
  );

  if (phase.kind === "loading") {
    return <p className="p-6 text-zinc-600">Loading…</p>;
  }
  if (phase.kind === "error") {
    return <p className="p-6 text-red-700">Error: {phase.message}</p>;
  }
  if (phase.kind === "submitting") {
    return <p className="p-6 text-zinc-600">Submitting…</p>;
  }
  if (phase.kind === "briefing") {
    return (
      <Briefing
        t={t}
        data={phase.data}
        onBegin={() => {
          setSectionTimes({ [phase.data.sections[0].section_id]: { start: nowIso() } });
          setPhase({ kind: "section_intro", data: phase.data, sectionIdx: 0 });
        }}
      />
    );
  }
  if (phase.kind === "section_intro") {
    const section = phase.data.sections[phase.sectionIdx];
    return (
      <SectionIntro
        t={t}
        section={section}
        onBegin={() =>
          setPhase({
            kind: "question",
            data: phase.data,
            sectionIdx: phase.sectionIdx,
            questionIdx: 0,
            startedAt: Date.now(),
          })
        }
      />
    );
  }
  // question
  const section = phase.data.sections[phase.sectionIdx];
  const question = section.questions[phase.questionIdx];
  return (
    <QuestionRunner
      key={`${section.section_id}-${question.question_id}`}
      t={t}
      question={question}
      sectionName={section.name}
      positionLabel={`${phase.questionIdx + 1}/${section.questions.length}`}
      onAnswer={(answer) => {
        setAnswers((prev) => ({ ...prev, [question.question_id]: answer }));
        const nextQuestionIdx = phase.questionIdx + 1;
        if (nextQuestionIdx < section.questions.length) {
          setPhase({
            kind: "question",
            data: phase.data,
            sectionIdx: phase.sectionIdx,
            questionIdx: nextQuestionIdx,
            startedAt: Date.now(),
          });
          return;
        }
        setSectionTimes((prev) => ({
          ...prev,
          [section.section_id]: { ...(prev[section.section_id] ?? { start: nowIso() }), end: nowIso() },
        }));
        const nextSectionIdx = phase.sectionIdx + 1;
        if (nextSectionIdx < phase.data.sections.length) {
          const next = phase.data.sections[nextSectionIdx];
          setSectionTimes((prev) => ({ ...prev, [next.section_id]: { start: nowIso() } }));
          setPhase({ kind: "section_intro", data: phase.data, sectionIdx: nextSectionIdx });
          return;
        }
        submit(phase.data);
      }}
    />
  );
}

function Briefing({
  t,
  data,
  onBegin,
}: {
  t: (k: string, tok?: Record<string, string | number>) => string;
  data: StartResponse;
  onBegin: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-2 text-2xl font-semibold">{t("briefing.welcome_title")}</h1>
      <p className="mb-6 text-zinc-700">{t("briefing.welcome_message")}</p>
      <h2 className="mb-2 text-lg font-semibold">{t("briefing.what_to_expect_title")}</h2>
      <ul className="mb-6 list-disc space-y-1 pl-6 text-zinc-700">
        <li>{t("briefing.what_to_expect_sections")}</li>
        <li>{t("briefing.what_to_expect_formats")}</li>
        <li>{t("briefing.what_to_expect_duration")}</li>
      </ul>
      <h2 className="mb-2 text-lg font-semibold">{t("briefing.rules_title")}</h2>
      <ul className="mb-6 list-disc space-y-1 pl-6 text-zinc-700">
        <li>{t("briefing.rule_no_back")}</li>
        <li>{t("briefing.rule_timers")}</li>
        <li>{t("briefing.rule_auto_advance")}</li>
        <li>{t("briefing.rule_single_sitting")}</li>
        <li>{t("briefing.rule_no_resources")}</li>
      </ul>
      <button onClick={onBegin} className="rounded bg-zinc-900 px-4 py-2 text-white">
        {t("briefing.begin_button")}
      </button>
      <p className="mt-6 text-xs text-zinc-400">{data.sections.length} sections</p>
    </div>
  );
}

function SectionIntro({
  t,
  section,
  onBegin,
}: {
  t: (k: string, tok?: Record<string, string | number>) => string;
  section: ServedSection;
  onBegin: () => void;
}) {
  const minutes = Math.ceil(
    section.questions.reduce((acc, q) => acc + q.timer_config.time_allowed_seconds, 0) / 60,
  );
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">{section.name}</h1>
      <p className="mb-4 text-zinc-700">{section.instructions}</p>
      <p className="mb-6 text-zinc-700">
        {t("section_intro.questions_count", { count: section.question_count, minutes })}
      </p>
      <button onClick={onBegin} className="rounded bg-zinc-900 px-4 py-2 text-white">
        {t("section_intro.begin_section")}
      </button>
    </div>
  );
}

function QuestionRunner({
  t,
  question,
  sectionName,
  positionLabel,
  onAnswer,
}: {
  t: (k: string, tok?: Record<string, string | number>) => string;
  question: ServedQuestion;
  sectionName: string;
  positionLabel: string;
  onAnswer: (a: Answer) => void;
}) {
  const [singleAnswer, setSingleAnswer] = useState<string | null>(null);
  const [multiAnswer, setMultiAnswer] = useState<string[]>([]);
  const [orderAnswer, setOrderAnswer] = useState<string[]>(
    question.items?.map((i) => i.item_id) ?? [],
  );
  const [openText, setOpenText] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(question.timer_config.time_allowed_seconds);
  const [warningTriggered, setWarningTriggered] = useState(false);
  const startRef = useRef<number>(Date.now());
  const submittedRef = useRef(false);

  const showTimer = question.timer_config.show_timer === "visible";

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 0) return 0;
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (secondsLeft <= question.timer_config.warning_seconds && !warningTriggered) {
      setWarningTriggered(true);
    }
    if (secondsLeft === 0 && !submittedRef.current) {
      submittedRef.current = true;
      onAnswer(buildAnswer({ auto: true }));
    }
  }, [secondsLeft, question.timer_config.warning_seconds, warningTriggered]);

  function buildAnswer({ auto }: { auto: boolean }): Answer {
    const timeTaken = (Date.now() - startRef.current) / 1000;
    return {
      questionId: question.question_id,
      type: question.type,
      timeTaken,
      timeAllowed: question.timer_config.time_allowed_seconds,
      autoAdvanced: auto,
      warningTriggered,
      singleAnswer,
      multiAnswer,
      orderAnswer,
      openText,
    };
  }

  function submitNow() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onAnswer(buildAnswer({ auto: false }));
  }

  const disableSubmit = useMemo(() => {
    if (question.type === "single_select") return singleAnswer == null;
    if (question.type === "multi_select") return multiAnswer.length === 0;
    if (question.type === "drag_to_order") return orderAnswer.length !== (question.items?.length ?? 0);
    if (question.type === "open_ended") return openText.trim().length === 0;
    return false;
  }, [question.type, singleAnswer, multiAnswer, orderAnswer, openText, question.items]);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <header className="mb-4 flex items-center justify-between text-sm text-zinc-500">
        <span>
          {sectionName} · {positionLabel}
        </span>
        {showTimer ? <span className="font-mono">{secondsLeft}s</span> : null}
      </header>

      {warningTriggered && !showTimer ? (
        <p className="mb-3 rounded bg-amber-50 p-2 text-sm text-amber-800">
          {t("timer.time_warning")}
        </p>
      ) : null}

      {question.context ? (
        <p className="mb-4 rounded bg-zinc-100 p-3 text-sm text-zinc-700">{question.context}</p>
      ) : null}
      <h2 className="mb-6 text-lg font-medium text-zinc-900">{question.prompt}</h2>

      {question.type === "single_select" ? (
        <div className="space-y-2">
          {question.options?.map((o) => (
            <label
              key={o.option_id}
              className={`flex cursor-pointer items-start gap-3 rounded border p-3 ${
                singleAnswer === o.option_id ? "border-zinc-900 bg-zinc-50" : "border-zinc-200"
              }`}
            >
              <input
                type="radio"
                name={question.question_id}
                className="mt-1"
                checked={singleAnswer === o.option_id}
                onChange={() => setSingleAnswer(o.option_id)}
              />
              <span>{o.text}</span>
            </label>
          ))}
        </div>
      ) : null}

      {question.type === "multi_select" ? (
        <div className="space-y-2">
          {question.options?.map((o) => {
            const checked = multiAnswer.includes(o.option_id);
            return (
              <label
                key={o.option_id}
                className={`flex cursor-pointer items-start gap-3 rounded border p-3 ${
                  checked ? "border-zinc-900 bg-zinc-50" : "border-zinc-200"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={checked}
                  onChange={(e) =>
                    setMultiAnswer((prev) =>
                      e.target.checked
                        ? Array.from(new Set([...prev, o.option_id]))
                        : prev.filter((id) => id !== o.option_id),
                    )
                  }
                />
                <span>{o.text}</span>
              </label>
            );
          })}
        </div>
      ) : null}

      {question.type === "drag_to_order" ? (
        <OrderPicker items={question.items ?? []} value={orderAnswer} onChange={setOrderAnswer} />
      ) : null}

      {question.type === "open_ended" ? (
        <textarea
          value={openText}
          onChange={(e) => setOpenText(e.target.value)}
          placeholder={question.constraints?.placeholder_text ?? ""}
          maxLength={question.constraints?.char_limit}
          rows={10}
          className="w-full rounded border p-3 font-sans"
        />
      ) : null}

      <div className="mt-6">
        <button
          onClick={submitNow}
          disabled={disableSubmit}
          className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-40"
        >
          {t("question.next_button")}
        </button>
      </div>
    </div>
  );
}

function OrderPicker({
  items,
  value,
  onChange,
}: {
  items: { item_id: string; text: string }[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  function move(index: number, delta: number) {
    const newIndex = index + delta;
    if (newIndex < 0 || newIndex >= value.length) return;
    const copy = [...value];
    [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
    onChange(copy);
  }
  const byId = new Map(items.map((i) => [i.item_id, i.text]));
  return (
    <ol className="space-y-2">
      {value.map((id, idx) => (
        <li key={id} className="flex items-center justify-between rounded border p-3">
          <span>
            <span className="mr-3 font-mono text-xs text-zinc-500">{idx + 1}.</span>
            {byId.get(id) ?? id}
          </span>
          <span className="flex gap-1">
            <button
              type="button"
              onClick={() => move(idx, -1)}
              className="rounded border px-2 py-1 text-xs"
              disabled={idx === 0}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(idx, 1)}
              className="rounded border px-2 py-1 text-xs"
              disabled={idx === value.length - 1}
            >
              ↓
            </button>
          </span>
        </li>
      ))}
    </ol>
  );
}
