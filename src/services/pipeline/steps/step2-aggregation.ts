import type { AssessmentResponse, SectionResponse } from "@/lib/types/assessment-response.ts";
import type { AssessmentMeta } from "@/lib/types/assessment-meta.ts";
import type { Question, SectionFile } from "@/lib/types/section.ts";
import type { ScoreResult } from "../schemas/score-result.ts";
import {
  classify,
  compositeScore,
  sectionRawScore,
  scoreFromRubric,
} from "@/lib/scoring/index.ts";

export type AggregatedSectionScore = {
  section_id: string;
  section_name: string;
  weight: number;
  raw_score: number;
  weighted_score: number;
  percentile: number | null;
};

export type AggregatedSpeedProfile = {
  average_time_ratio: number;
  speed_consistency: number;
  speed_accuracy_correlation: number | null;
  anomalies: Array<{ section_id: string; question_id: string; type: "suspicious_fast" | "slow" }>;
};

export type AggregatedScores = {
  section_scores: AggregatedSectionScore[];
  composite_score: number;
  classification:
    | "Exceptional"
    | "Proficient"
    | "Developing"
    | "Foundational"
    | "Needs Significant Development";
  speed_profile: AggregatedSpeedProfile;
  percentile_rank: number | null;
  relative_fitness_tier: "Top Quartile" | "Above Average" | "Below Average" | "Bottom Quartile" | null;
  calibration_ref: string | null;
  scored_response: AssessmentResponse;
};

export type CalibrationContext = {
  id: string;
  sample_size: number;
  composite_distribution: number[]; // raw composite scores
  section_distributions: Record<string, number[]>; // per-section raw scores
};

function percentileOf(value: number, samples: readonly number[]): number | null {
  if (samples.length < 10) return null;
  const below = samples.filter((s) => s <= value).length;
  return Math.round((below / samples.length) * 100);
}

function tierFromPercentile(p: number | null): AggregatedScores["relative_fitness_tier"] {
  if (p == null) return null;
  if (p >= 75) return "Top Quartile";
  if (p >= 50) return "Above Average";
  if (p >= 25) return "Below Average";
  return "Bottom Quartile";
}

function questionIndex(sections: readonly SectionFile[]): Map<string, Question> {
  const map = new Map<string, Question>();
  for (const s of sections) {
    for (const q of s.questions) map.set(q.question_id, q);
  }
  return map;
}

export function aggregate(
  response: AssessmentResponse,
  scoreResults: readonly ScoreResult[],
  meta: AssessmentMeta,
  sections: readonly SectionFile[],
  calibration: CalibrationContext | null = null,
): AggregatedScores {
  const scoreByQid = new Map(scoreResults.map((r) => [r.question_id, r]));
  const qIdx = questionIndex(sections);

  const sectionPerQuestionScores: Record<string, { score: number; maxScore: number }[]> = {};
  const updatedSectionResponses: SectionResponse[] = [];

  for (const sr of response.section_responses) {
    const list: { score: number; maxScore: number }[] = [];
    const updatedQRs: SectionResponse["question_responses"] = sr.question_responses.map((qr) => {
      const q = qIdx.get(qr.question_id);
      if (!q) return qr;

      if (qr.type === "open_ended") {
        const result = scoreByQid.get(qr.question_id);
        if (!result) {
          list.push({ score: 0, maxScore: q.points });
          return qr;
        }
        const objectiveEquivalent = scoreFromRubric(result.rubric_score, result.rubric_max, q.points);
        list.push({ score: objectiveEquivalent, maxScore: q.points });
        return {
          ...qr,
          score: objectiveEquivalent,
          ai_evaluation: {
            question_id: result.question_id,
            rubric_score: result.rubric_score,
            rubric_max: 5,
            justification: result.justification,
            criteria_met: result.criteria_met,
            criteria_missed: result.criteria_missed,
            notable_strengths: result.notable_strengths || undefined,
            notable_gaps: result.notable_gaps || undefined,
            evaluated_at: new Date().toISOString(),
          },
        };
      }

      list.push({ score: qr.score ?? 0, maxScore: q.points });
      return qr;
    });
    sectionPerQuestionScores[sr.section_id] = list;
    updatedSectionResponses.push({ ...sr, question_responses: updatedQRs });
  }

  const metaSections = [...meta.sections].sort((a, b) => a.order - b.order);
  const sectionScores: AggregatedSectionScore[] = metaSections.map((m) => {
    const list = sectionPerQuestionScores[m.section_id] ?? [];
    const raw = sectionRawScore(list);
    const dist = calibration?.section_distributions[m.section_id];
    return {
      section_id: m.section_id,
      section_name: m.name,
      weight: m.weight,
      raw_score: raw,
      weighted_score: raw * m.weight,
      percentile: dist ? percentileOf(raw, dist) : null,
    };
  });

  const composite = compositeScore(
    sectionScores.map((s) => ({ weight: s.weight, rawScore: s.raw_score })),
  );
  const classification = classify(composite, meta.scoring.classifications) as AggregatedScores["classification"];
  const percentileRank = calibration ? percentileOf(composite, calibration.composite_distribution) : null;

  const allAnomalies = updatedSectionResponses.flatMap((sr) =>
    sr.question_responses.flatMap((qr) =>
      qr.speed_flags.map((t) => ({
        section_id: sr.section_id,
        question_id: qr.question_id,
        type: t,
      })),
    ),
  );

  const timeRatios = updatedSectionResponses.flatMap((sr) =>
    sr.question_responses.map((qr) =>
      qr.time_allowed_seconds > 0 ? qr.time_taken_seconds / qr.time_allowed_seconds : 0,
    ),
  );
  const avgRatio = timeRatios.length ? timeRatios.reduce((a, b) => a + b, 0) / timeRatios.length : 0;
  const stdDev =
    timeRatios.length > 1
      ? Math.sqrt(
          timeRatios.reduce((acc, r) => acc + (r - avgRatio) ** 2, 0) / timeRatios.length,
        )
      : 0;
  const consistency = stdDev;

  const scoredResponse: AssessmentResponse = {
    ...response,
    section_responses: updatedSectionResponses,
    results: {
      section_scores: sectionScores,
      composite_score: composite,
      classification,
      speed_profile: {
        average_time_ratio: avgRatio,
        speed_consistency: consistency,
        speed_accuracy_correlation: null,
        anomalies: allAnomalies,
      },
      percentile_rank: percentileRank,
      relative_fitness_tier: tierFromPercentile(percentileRank),
    },
  };

  return {
    section_scores: sectionScores,
    composite_score: composite,
    classification,
    speed_profile: scoredResponse.results!.speed_profile,
    percentile_rank: percentileRank,
    relative_fitness_tier: tierFromPercentile(percentileRank),
    calibration_ref: calibration?.id ?? null,
    scored_response: scoredResponse,
  };
}
