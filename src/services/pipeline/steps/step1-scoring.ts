import type { AssessmentResponse } from "@/lib/types/assessment-response.ts";
import type { Question, SectionFile } from "@/lib/types/section.ts";
import type { LLMProvider, LLMRequest } from "../providers/interface.ts";
import { ScoreResultSchema, type ScoreResult } from "../schemas/score-result.ts";
import {
  SCORING_PROMPT_VERSION,
  SCORING_SYSTEM_PROMPT,
  buildScoringUserMessage,
} from "@/../prompts/scoring-prompt.ts";

export type Step1Config = {
  model: string;
  temperature: number;
  max_tokens: number;
};

export const DEFAULT_STEP1_CONFIG: Step1Config = {
  model: process.env.PIPELINE_SCORING_MODEL ?? "claude-sonnet-4-5-20250514",
  temperature: Number(process.env.PIPELINE_SCORING_TEMPERATURE ?? 0.1),
  max_tokens: 1500,
};

function tryParseScoreResult(raw: string, fallbackQid: string): ScoreResult | null {
  // Some models wrap JSON in fences; strip before parsing
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    const res = ScoreResultSchema.safeParse(parsed);
    if (res.success) return res.data;
    const clamped = {
      ...parsed,
      question_id: parsed.question_id ?? fallbackQid,
      rubric_max: 5,
      rubric_score:
        typeof parsed.rubric_score === "number"
          ? Math.max(0, Math.min(5, Math.round(parsed.rubric_score)))
          : 0,
      criteria_met: Array.isArray(parsed.criteria_met) ? parsed.criteria_met : [],
      criteria_missed: Array.isArray(parsed.criteria_missed) ? parsed.criteria_missed : [],
    };
    return ScoreResultSchema.safeParse(clamped).data ?? null;
  } catch {
    return null;
  }
}

function questionOpenEnded(q: Question): boolean {
  return q.type === "open_ended";
}

export async function runStep1(
  provider: LLMProvider,
  response: AssessmentResponse,
  sections: readonly SectionFile[],
  trigger: NonNullable<LLMRequest["metadata"]>["trigger"] = "submission",
  config: Step1Config = DEFAULT_STEP1_CONFIG,
): Promise<ScoreResult[]> {
  const qIndex = new Map<string, Question>();
  for (const s of sections) {
    for (const q of s.questions) qIndex.set(q.question_id, q);
  }

  const openResponses: Array<{ question: Question; text: string }> = [];
  for (const section of response.section_responses) {
    for (const qr of section.question_responses) {
      if (qr.type !== "open_ended") continue;
      const question = qIndex.get(qr.question_id);
      if (!question || !questionOpenEnded(question)) continue;
      openResponses.push({ question, text: qr.answer });
    }
  }

  const calls = openResponses.map(async ({ question, text }) => {
    if (question.type !== "open_ended") throw new Error("non-open question in step1");
    const user = buildScoringUserMessage({
      question_id: question.question_id,
      prompt: question.prompt,
      context: question.context ?? null,
      criteria: question.rubric.criteria,
      response_text: text,
      response_language: response.session.language,
      sample_strong_response: question.sample_strong_response,
    });

    const request: LLMRequest = {
      model: config.model,
      system_prompt: SCORING_SYSTEM_PROMPT,
      messages: [{ role: "user", content: user }],
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      response_format: "json",
      metadata: {
        step: "scoring",
        response_id: response.response_id,
        question_id: question.question_id,
        trigger,
        prompt_template_version: SCORING_PROMPT_VERSION,
      },
    };

    const llmResponse = await provider.complete(request);
    const parsed = tryParseScoreResult(llmResponse.content, question.question_id);
    if (!parsed) {
      throw new Error(`step1: failed to parse score result for ${question.question_id}`);
    }
    return parsed;
  });

  return Promise.all(calls);
}
