import { createHash } from "node:crypto";
import type { LLMProvider, LLMRequest, LLMResponse } from "./interface.ts";

function hash(input: string): number {
  const digest = createHash("sha256").update(input).digest();
  return digest.readUInt32BE(0);
}

function pseudoFloat(seed: string, salt: string): number {
  return (hash(`${seed}:${salt}`) % 10_000) / 10_000;
}

function scoreForQuestion(seed: string): number {
  const r = pseudoFloat(seed, "rubric");
  // Distribute: 20% 5, 30% 4, 25% 3, 15% 2, 5% 1, 5% 0
  if (r < 0.2) return 5;
  if (r < 0.5) return 4;
  if (r < 0.75) return 3;
  if (r < 0.9) return 2;
  if (r < 0.95) return 1;
  return 0;
}

function pickN<T>(items: readonly T[], n: number, seed: string): T[] {
  const shuffled = [...items]
    .map((item, idx) => ({ item, w: pseudoFloat(seed, `${idx}`) }))
    .sort((a, b) => a.w - b.w)
    .map((w) => w.item);
  return shuffled.slice(0, n);
}

const STRENGTHS = [
  "Identifies dependency ordering",
  "Articulates assumptions explicitly",
  "Distinguishes symptoms from root causes",
  "Acknowledges unknowns before committing",
  "Sequences discovery before design",
  "Considers validation and rollback paths",
];

const GAPS = [
  "Misses risk/rollback considerations",
  "Conflates symptoms with causes",
  "Does not address cross-channel complexity",
  "Skips validation before go-live",
  "Leaves assumptions unstated",
];

function generateScoringOutput(req: LLMRequest): string {
  const qid = req.metadata?.question_id ?? "unknown";
  const seed = `${req.metadata?.response_id ?? "x"}:${qid}`;
  const rubricScore = scoreForQuestion(seed);
  const met = pickN(STRENGTHS, Math.max(1, rubricScore), seed + "met");
  const missed = pickN(GAPS, Math.max(1, 5 - rubricScore), seed + "missed");
  const obj = {
    question_id: qid,
    rubric_score: rubricScore,
    rubric_max: 5,
    justification: `Fixture-generated justification for rubric score ${rubricScore}.`,
    criteria_met: met,
    criteria_missed: missed,
    notable_strengths: met[0] ?? "",
    notable_gaps: missed[0] ?? "",
  };
  return JSON.stringify(obj);
}

function generateSynthesisOutput(req: LLMRequest): string {
  const seed = req.metadata?.response_id ?? "default";
  const compositeRoll = pseudoFloat(seed, "composite");
  const composite = 40 + compositeRoll * 55;
  const classification =
    composite >= 85
      ? "Exceptional"
      : composite >= 70
        ? "Proficient"
        : composite >= 55
          ? "Developing"
          : composite >= 40
            ? "Foundational"
            : "Needs Significant Development";
  const fitness =
    composite >= 80
      ? "Strong Fit"
      : composite >= 68
        ? "Good Fit"
        : composite >= 55
          ? "Conditional Fit"
          : composite >= 45
            ? "Developing Fit"
            : "Not Yet Ready";
  const style = composite >= 75 ? "Methodical Analyst" : composite >= 60 ? "Balanced Thinker" : "Developing Orchestrator";

  const profile = {
    cognitive_profile: {
      style,
      description: `Fixture-generated cognitive profile for composite ${composite.toFixed(1)}. Shows a consistent orchestration pattern with strengths in ${pickN(STRENGTHS, 2, seed).join(" and ")}.`,
      strengths: pickN(STRENGTHS, 3, seed + "cs"),
      development_areas: pickN(GAPS, 2, seed + "cd"),
      speed_characterization:
        "Average pace with balanced accuracy. No extreme fast or slow patterns observed.",
      pattern_insights: [
        "Consistent performance across reasoning and observation sections.",
        "Stronger on decomposition than on output validation.",
      ],
    },
    vibe_coding_fitness: {
      rating: fitness,
      confidence: composite >= 75 ? "high" : composite >= 60 ? "medium" : "low",
      justification: `Fixture justification for ${fitness}. Evidence: consistent strengths across decomposition and reasoning, with ${fitness === "Strong Fit" ? "clear root-cause focus" : "developing root-cause focus"}.`,
      key_strengths_for_ai_work: pickN(
        [
          "Specification-driven delegation",
          "Output validation against intent",
          "Scope discipline under pressure",
        ],
        2,
        seed + "ks",
      ),
      key_risks_for_ai_work: pickN(
        [
          "May under-validate AI outputs",
          "Could miss dependency risks in large-scope AI tasks",
        ],
        1,
        seed + "kr",
      ),
      recommended_role_contexts: pickN(
        [
          "Spec-driven feature delegation",
          "AI output review and QA",
          "Process automation design",
        ],
        2,
        seed + "rc",
      ),
    },
    development_recommendations: [
      {
        area: "Output validation",
        priority: composite < 70 ? "high" : "medium",
        observation: "Partial credit patterns in S5 suggest surface-level checking.",
        recommendation:
          "Practice reviewing AI-generated outputs against original acceptance criteria before accepting.",
      },
    ],
    speed_profile_interpretation: {
      overall_characterization: "Balanced pace across all sections.",
      speed_accuracy_insight: "No significant correlation between speed and accuracy detected.",
      anomaly_interpretation: "No anomalies detected.",
    },
    section_narratives: {} as Record<string, { narrative: string; strengths: string[]; concerns: string[] }>,
    red_flags: [] as Array<{ type: string; description: string; severity: string; implication: string }>,
  };

  return JSON.stringify({
    classification,
    composite,
    fitness,
    profile,
  });
}

export class FixtureProvider implements LLMProvider {
  readonly id = "fixture" as const;
  readonly name = "Fixture";

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const started = Date.now();
    const content =
      request.metadata?.step === "synthesis"
        ? generateSynthesisOutput(request)
        : generateScoringOutput(request);

    // Simulate tiny latency to keep async behaviour realistic
    await new Promise((r) => setTimeout(r, 1));

    const input_tokens = Math.ceil((request.system_prompt.length + request.messages.map((m) => m.content).join("").length) / 4);
    const output_tokens = Math.ceil(content.length / 4);

    return {
      content,
      model_requested: request.model,
      model_served: `fixture/${request.model}`,
      provider: "fixture",
      usage: {
        input_tokens,
        output_tokens,
        total_tokens: input_tokens + output_tokens,
      },
      latency_ms: Date.now() - started,
      cost_usd: 0,
    };
  }
}
