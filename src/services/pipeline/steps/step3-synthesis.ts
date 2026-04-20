import type { LLMProvider, LLMRequest } from "../providers/interface.ts";
import type { AggregatedScores } from "./step2-aggregation.ts";
import type { ScoreResult } from "../schemas/score-result.ts";
import {
  ResponderProfileContentSchema,
  type ResponderProfileContent,
} from "../schemas/responder-profile.ts";
import {
  SYNTHESIS_PROMPT_VERSION,
  SYNTHESIS_SYSTEM_PROMPT,
  buildSynthesisUserMessage,
} from "@/../prompts/synthesis-prompt.ts";

export type Step3Config = {
  model: string;
  temperature: number;
  max_tokens: number;
};

export const DEFAULT_STEP3_CONFIG: Step3Config = {
  model: process.env.PIPELINE_SYNTHESIS_MODEL ?? "claude-opus-4-5-20250514",
  temperature: Number(process.env.PIPELINE_SYNTHESIS_TEMPERATURE ?? 0.4),
  max_tokens: 4000,
};

function fallbackSectionAnalysis(agg: AggregatedScores) {
  return agg.section_scores.map((s) => ({
    section_id: s.section_id,
    section_name: s.section_name,
    raw_score: s.raw_score,
    percentile: s.percentile,
    narrative: `Raw score ${s.raw_score.toFixed(1)} in ${s.section_name}.`,
    strengths: [],
    concerns: [],
  }));
}

function fallbackProfile(agg: AggregatedScores): ResponderProfileContent {
  const rating =
    agg.composite_score >= 80
      ? "Strong Fit"
      : agg.composite_score >= 68
        ? "Good Fit"
        : agg.composite_score >= 55
          ? "Conditional Fit"
          : agg.composite_score >= 45
            ? "Developing Fit"
            : "Not Yet Ready";
  return {
    section_analysis: fallbackSectionAnalysis(agg),
    cognitive_profile: {
      style: "Unprofiled",
      description: "Profile synthesis unavailable; defaulted from aggregated scores.",
      strengths: [],
      development_areas: [],
      speed_characterization: "",
      pattern_insights: [],
    },
    vibe_coding_fitness: {
      rating,
      confidence: "low",
      justification: "Fallback rating derived from composite; synthesis output was unavailable.",
      key_strengths_for_ai_work: [],
      key_risks_for_ai_work: [],
      recommended_role_contexts: [],
    },
    development_recommendations: [],
    speed_profile_interpretation: {
      overall_characterization: "Unavailable",
      speed_accuracy_insight: "Unavailable",
      anomaly_interpretation: "Unavailable",
    },
    red_flags: [],
  };
}

function tryParseContent(raw: string): ResponderProfileContent | null {
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    const obj = JSON.parse(cleaned);
    // If fixture returned { classification, composite, fitness, profile }, unwrap
    const candidate = obj.profile && obj.profile.cognitive_profile ? obj.profile : obj;
    const result = ResponderProfileContentSchema.safeParse(candidate);
    if (result.success) return result.data;
    // Try partial with defaults
    const partial = {
      section_analysis: Array.isArray(candidate.section_analysis)
        ? candidate.section_analysis
        : [],
      cognitive_profile: candidate.cognitive_profile ?? {},
      vibe_coding_fitness: candidate.vibe_coding_fitness ?? {},
      development_recommendations: candidate.development_recommendations ?? [],
      speed_profile_interpretation: candidate.speed_profile_interpretation ?? {
        overall_characterization: "",
        speed_accuracy_insight: "",
        anomaly_interpretation: "",
      },
      red_flags: candidate.red_flags ?? [],
    };
    return ResponderProfileContentSchema.safeParse(partial).data ?? null;
  } catch {
    return null;
  }
}

export async function runStep3(
  provider: LLMProvider,
  response_id: string,
  agg: AggregatedScores,
  scoreResults: readonly ScoreResult[],
  trigger: NonNullable<LLMRequest["metadata"]>["trigger"] = "submission",
  config: Step3Config = DEFAULT_STEP3_CONFIG,
): Promise<{ content: ResponderProfileContent; latency_ms: number; cost_usd: number; model_served: string }> {
  const payload = {
    composite_score: agg.composite_score,
    classification: agg.classification,
    percentile_rank: agg.percentile_rank,
    relative_fitness_tier: agg.relative_fitness_tier,
    section_scores: agg.section_scores,
    speed_profile: agg.speed_profile,
    open_ended_evaluations: scoreResults,
    calibration_ref: agg.calibration_ref,
  };

  const request: LLMRequest = {
    model: config.model,
    system_prompt: SYNTHESIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildSynthesisUserMessage(payload) }],
    temperature: config.temperature,
    max_tokens: config.max_tokens,
    response_format: "json",
    metadata: {
      step: "synthesis",
      response_id,
      trigger,
      prompt_template_version: SYNTHESIS_PROMPT_VERSION,
    },
  };

  const llmResponse = await provider.complete(request);
  let parsed = tryParseContent(llmResponse.content);
  if (!parsed) parsed = fallbackProfile(agg);

  // Ensure section_analysis covers all 5 sections; pad from aggregated data if model missed any.
  if (parsed.section_analysis.length < agg.section_scores.length) {
    const existing = new Set(parsed.section_analysis.map((s) => s.section_id));
    const added = agg.section_scores
      .filter((s) => !existing.has(s.section_id))
      .map((s) => ({
        section_id: s.section_id,
        section_name: s.section_name,
        raw_score: s.raw_score,
        percentile: s.percentile,
        narrative: `Raw score ${s.raw_score.toFixed(1)} in ${s.section_name}.`,
        strengths: [],
        concerns: [],
      }));
    parsed = { ...parsed, section_analysis: [...parsed.section_analysis, ...added] };
  }

  return {
    content: parsed,
    latency_ms: llmResponse.latency_ms,
    cost_usd: llmResponse.cost_usd,
    model_served: llmResponse.model_served,
  };
}
