import { randomUUID } from "node:crypto";
import { loadAssessment } from "@/lib/content/index.ts";
import type { AssessmentSubmit, SubmitQuestionResponse } from "@/lib/types/assessment-submit.ts";
import type {
  AssessmentResponse,
  QuestionResponse,
  SectionResponse,
} from "@/lib/types/assessment-response.ts";
import type { Question, SectionFile } from "@/lib/types/section.ts";
import type { AssessmentMeta } from "@/lib/types/assessment-meta.ts";
import {
  scoreSingleSelect,
  scoreMultiSelect,
  scoreDragToOrder,
  sectionRawScore,
  compositeScore,
  classify,
} from "@/lib/scoring/index.ts";
import { AssessmentResponseSchema } from "@/lib/types/assessment-response.ts";
import { db } from "@/db/index.ts";
import { responses } from "@/db/schema.ts";

export class SubmitValidationError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = "SubmitValidationError";
  }
}

function questionIndex(sections: SectionFile[]): Map<string, Question> {
  const idx = new Map<string, Question>();
  for (const s of sections) {
    for (const q of s.questions) {
      idx.set(q.question_id, q);
    }
  }
  return idx;
}

function computeSpeedFlags(q: Question, timeTaken: number): ("suspicious_fast" | "slow")[] {
  const flags: ("suspicious_fast" | "slow")[] = [];
  const sf = q.speed_flags;
  const fast =
    typeof sf === "object" && sf !== null && "suspicious_fast_seconds" in sf
      ? (sf as { suspicious_fast_seconds?: number }).suspicious_fast_seconds
      : undefined;
  const slow =
    typeof sf === "object" && sf !== null && "slow_threshold_seconds" in sf
      ? (sf as { slow_threshold_seconds?: number }).slow_threshold_seconds
      : undefined;
  if (fast !== undefined && timeTaken < fast) flags.push("suspicious_fast");
  if (slow !== undefined && timeTaken >= slow) flags.push("slow");
  return flags;
}

function scoreObjective(q: Question, answer: SubmitQuestionResponse["answer"]): number | null {
  if (q.type === "single_select") {
    return scoreSingleSelect(
      typeof answer === "string" ? answer : null,
      q.correct_answer,
      q.points,
    );
  }
  if (q.type === "multi_select") {
    return scoreMultiSelect(Array.isArray(answer) ? answer : [], q.correct_answers, q.points);
  }
  if (q.type === "drag_to_order") {
    return scoreDragToOrder(Array.isArray(answer) ? answer : [], q.correct_order, q.points);
  }
  return null;
}

function countWords(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

type UserIdentity = {
  user_id: string;
  name: string;
  email: string;
  organization: string;
  role: string;
};

export async function submitAssessment(
  payload: AssessmentSubmit,
  user: UserIdentity,
): Promise<{ response_id: string; composite_score: number; classification: string }> {
  const assessment = await loadAssessment(payload.language);
  const meta: AssessmentMeta = assessment.meta;
  const sectionFiles = assessment.sections.map((s) => s.file);
  const qIndex = questionIndex(sectionFiles);

  const expectedSectionIds = new Set(meta.sections.map((s) => s.section_id));
  const submittedSectionIds = new Set(payload.section_responses.map((s) => s.section_id));
  if (expectedSectionIds.size !== submittedSectionIds.size) {
    throw new SubmitValidationError(
      `expected ${expectedSectionIds.size} sections, got ${submittedSectionIds.size}`,
    );
  }
  for (const sid of expectedSectionIds) {
    if (!submittedSectionIds.has(sid)) {
      throw new SubmitValidationError(`missing section ${sid}`);
    }
  }

  const scoredSections: SectionResponse[] = [];
  const sectionRawMap: Record<string, number> = {};

  for (const sub of payload.section_responses) {
    const questionResponses: QuestionResponse[] = [];
    const perQuestionScores: { score: number; maxScore: number }[] = [];

    for (const qr of sub.question_responses) {
      const q = qIndex.get(qr.question_id);
      if (!q) {
        throw new SubmitValidationError(`unknown question_id ${qr.question_id}`);
      }
      if (q.type !== qr.type) {
        throw new SubmitValidationError(
          `type mismatch for ${qr.question_id}: expected ${q.type}, got ${qr.type}`,
        );
      }

      const speedFlags = computeSpeedFlags(q, qr.time_taken_seconds);
      const objectiveScore = scoreObjective(q, qr.answer);
      const finalScore = q.type === "open_ended" ? null : objectiveScore;

      const common = {
        question_id: qr.question_id,
        variant_id: qr.variant_id ?? null,
        time_taken_seconds: qr.time_taken_seconds,
        time_allowed_seconds: qr.time_allowed_seconds,
        auto_advanced: qr.auto_advanced,
        warning_triggered: qr.warning_triggered,
        speed_flags: speedFlags,
        score: finalScore,
        max_score: q.points,
        ai_evaluation: null,
      };

      let entry: QuestionResponse;
      if (qr.type === "single_select") {
        entry = { ...common, type: "single_select", answer: qr.answer };
      } else if (qr.type === "multi_select") {
        entry = { ...common, type: "multi_select", answer: qr.answer };
      } else if (qr.type === "drag_to_order") {
        entry = { ...common, type: "drag_to_order", answer: qr.answer };
      } else {
        const text = qr.answer;
        entry = {
          ...common,
          type: "open_ended",
          answer: text,
          word_count: countWords(text),
          char_count: text.length,
        };
      }

      questionResponses.push(entry);

      // For section raw aggregation, treat unscored open-ended as 0 for now.
      // Pipeline (v0.3) will populate ai_evaluation and Step 2 will recompute.
      perQuestionScores.push({
        score: finalScore ?? 0,
        maxScore: q.points,
      });
    }

    scoredSections.push({
      section_id: sub.section_id,
      started_at: sub.started_at,
      completed_at: sub.completed_at,
      question_responses: questionResponses,
    });

    sectionRawMap[sub.section_id] = sectionRawScore(perQuestionScores);
  }

  scoredSections.sort((a, b) => {
    const oa = meta.sections.find((m) => m.section_id === a.section_id)?.order ?? 99;
    const ob = meta.sections.find((m) => m.section_id === b.section_id)?.order ?? 99;
    return oa - ob;
  });

  const sectionsForComposite = meta.sections.map((m) => ({
    weight: m.weight,
    rawScore: sectionRawMap[m.section_id] ?? 0,
  }));
  const composite = compositeScore(sectionsForComposite);
  const classifications = meta.scoring.classifications;

  const fullResponse: AssessmentResponse = {
    response_id: randomUUID(),
    assessment_id: meta.assessment_id,
    assessment_version: meta.version,
    user: {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      organization: user.organization,
      role: user.role,
    },
    session: {
      started_at: payload.started_at,
      completed_at: payload.completed_at,
      duration_seconds: Math.max(
        0,
        Math.floor(
          (new Date(payload.completed_at).getTime() - new Date(payload.started_at).getTime()) /
            1000,
        ),
      ),
      environment: {
        browser: payload.environment.browser,
        os: payload.environment.os,
        screen_resolution: payload.environment.screen_resolution,
      },
      language: payload.language,
    },
    section_responses: scoredSections as AssessmentResponse["section_responses"],
    results: {
      section_scores: meta.sections
        .sort((a, b) => a.order - b.order)
        .map((m) => ({
          section_id: m.section_id,
          section_name: m.name,
          weight: m.weight,
          raw_score: sectionRawMap[m.section_id] ?? 0,
          weighted_score: (sectionRawMap[m.section_id] ?? 0) * m.weight,
          percentile: null,
        })),
      composite_score: composite,
      classification: classify(composite, classifications) as NonNullable<AssessmentResponse["results"]>["classification"],
      speed_profile: {
        average_time_ratio: 0,
        speed_consistency: 0,
        speed_accuracy_correlation: null,
        anomalies: scoredSections.flatMap((sr) =>
          sr.question_responses.flatMap((qr) =>
            qr.speed_flags.map((f) => ({
              section_id: sr.section_id,
              question_id: qr.question_id,
              type: f,
            })),
          ),
        ),
      },
      percentile_rank: null,
      relative_fitness_tier: null,
    },
  };

  const validated = AssessmentResponseSchema.parse(fullResponse);

  await db.insert(responses).values({
    id: validated.response_id,
    userId: user.user_id,
    assessmentVersion: validated.assessment_version,
    startedAt: new Date(validated.session.started_at),
    completedAt: new Date(validated.session.completed_at),
    responseData: validated,
  });

  if (!validated.results) {
    throw new Error("internal: results missing after scoring");
  }
  return {
    response_id: validated.response_id,
    composite_score: validated.results.composite_score,
    classification: validated.results.classification,
  };
}
