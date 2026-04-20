import { desc } from "drizzle-orm";
import { db } from "@/db/index.ts";
import { goldenTestResponses, goldenTestRuns, type GoldenTestRun } from "@/db/schema.ts";
import { AuditedProvider, buildProvider } from "../providers/index.ts";
import { ScoreResultSchema } from "../schemas/score-result.ts";
import {
  SCORING_PROMPT_VERSION,
  SCORING_SYSTEM_PROMPT,
  buildScoringUserMessage,
} from "@/../prompts/scoring-prompt.ts";
import { DEFAULT_STEP1_CONFIG } from "../steps/step1-scoring.ts";
import type { LLMRequest } from "../providers/interface.ts";

export type GoldenResponseRecord = {
  id: string;
  question_id: string;
  quality_level: string;
  response_text: string;
  consensus_score: number;
  acceptable_min: number;
  acceptable_max: number;
  question_prompt: string;
  question_context: string | null;
  criteria: string[];
  sample_strong_response: string | null;
};

export type GoldenDeviation = {
  id: string;
  question_id: string;
  quality_level: string;
  consensus: number;
  actual: number;
  deviation: number;
  in_range: boolean;
  extreme_miss: boolean;
};

export type GoldenResults = {
  mad: number;
  range_compliance_rate: number;
  extreme_miss_count: number;
  passed: boolean;
  details: GoldenDeviation[];
};

const MAD_THRESHOLD = 0.5;
const RANGE_COMPLIANCE_THRESHOLD = 0.9;
const EXTREME_MISS_THRESHOLD = 2;

export async function runGoldenTests(): Promise<GoldenResults> {
  const rows = await db.select().from(goldenTestResponses);
  if (rows.length === 0) {
    return { mad: 0, range_compliance_rate: 1, extreme_miss_count: 0, passed: true, details: [] };
  }

  const provider = new AuditedProvider(buildProvider());
  const details: GoldenDeviation[] = [];

  const calls = rows.map(async (row) => {
    const meta = row.responseData as {
      question_prompt?: string;
      question_context?: string | null;
      criteria?: string[];
      sample_strong_response?: string | null;
    };
    const req: LLMRequest = {
      model: DEFAULT_STEP1_CONFIG.model,
      system_prompt: SCORING_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildScoringUserMessage({
            question_id: row.questionId,
            prompt: meta.question_prompt ?? "(question prompt unavailable)",
            context: meta.question_context ?? null,
            criteria: meta.criteria ?? [],
            response_text: row.responseText,
            response_language: "en",
            sample_strong_response: meta.sample_strong_response ?? null,
          }),
        },
      ],
      temperature: DEFAULT_STEP1_CONFIG.temperature,
      max_tokens: DEFAULT_STEP1_CONFIG.max_tokens,
      response_format: "json",
      metadata: {
        step: "golden_test",
        question_id: row.questionId,
        trigger: "golden_test",
        prompt_template_version: SCORING_PROMPT_VERSION,
      },
    };
    const res = await provider.complete(req);
    const cleaned = res.content
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const parsedJson = (() => {
      try {
        return JSON.parse(cleaned);
      } catch {
        return null;
      }
    })();
    const scored = ScoreResultSchema.safeParse(parsedJson);
    const actual = scored.success
      ? scored.data.rubric_score
      : Math.max(0, Math.min(5, Math.round(parsedJson?.rubric_score ?? 0)));
    const consensus = Number(row.consensusScore);
    const acceptMin = Number(row.acceptableMin);
    const acceptMax = Number(row.acceptableMax);
    const deviation = Math.abs(actual - consensus);
    details.push({
      id: row.id,
      question_id: row.questionId,
      quality_level: row.qualityLevel,
      consensus,
      actual,
      deviation,
      in_range: actual >= acceptMin && actual <= acceptMax,
      extreme_miss: deviation >= EXTREME_MISS_THRESHOLD,
    });
  });

  await Promise.all(calls);

  const n = details.length;
  const mad = n === 0 ? 0 : details.reduce((acc, d) => acc + d.deviation, 0) / n;
  const rangeRate = n === 0 ? 1 : details.filter((d) => d.in_range).length / n;
  const extremeMiss = details.filter((d) => d.extreme_miss).length;
  const passed = mad <= MAD_THRESHOLD && rangeRate >= RANGE_COMPLIANCE_THRESHOLD && extremeMiss === 0;

  await db.insert(goldenTestRuns).values({
    passed,
    mad: mad.toFixed(3),
    rangeComplianceRate: rangeRate.toFixed(3),
    extremeMissCount: extremeMiss,
    results: details,
  });

  return { mad, range_compliance_rate: rangeRate, extreme_miss_count: extremeMiss, passed, details };
}

export async function listGoldenRuns(limit = 10): Promise<GoldenTestRun[]> {
  return db.select().from(goldenTestRuns).orderBy(desc(goldenTestRuns.ranAt)).limit(limit);
}

export async function goldenStatus(): Promise<{
  latest: GoldenTestRun | null;
  mad_trend: number[];
  drift_alert: boolean;
  consecutive_failures: number;
}> {
  const recent = await db
    .select()
    .from(goldenTestRuns)
    .orderBy(desc(goldenTestRuns.ranAt))
    .limit(10);
  if (recent.length === 0) {
    return { latest: null, mad_trend: [], drift_alert: false, consecutive_failures: 0 };
  }
  const trend = recent.map((r) => Number(r.mad));
  const latest = recent[0];
  const trailing = trend.slice(1);
  const trailingAvg =
    trailing.length === 0 ? Number(latest.mad) : trailing.reduce((a, b) => a + b, 0) / trailing.length;
  const driftAlert = Number(latest.mad) > trailingAvg + 0.15;
  let consecutive = 0;
  for (const r of recent) {
    if (!r.passed) consecutive += 1;
    else break;
  }
  return { latest, mad_trend: trend, drift_alert: driftAlert, consecutive_failures: consecutive };
}
