import { z } from "zod";

export const LanguageSchema = z.enum(["en", "es"]);
export type Language = z.infer<typeof LanguageSchema>;

export const QuestionTypeSchema = z.enum([
  "single_select",
  "multi_select",
  "drag_to_order",
  "open_ended",
]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const SpeedFlagSchema = z.enum(["suspicious_fast", "slow"]);
export type SpeedFlag = z.infer<typeof SpeedFlagSchema>;

export const ClassificationSchema = z.enum([
  "Exceptional",
  "Proficient",
  "Developing",
  "Foundational",
  "Needs Significant Development",
]);
export type Classification = z.infer<typeof ClassificationSchema>;

export const FitnessRatingSchema = z.enum([
  "Strong Fit",
  "Good Fit",
  "Conditional Fit",
  "Developing Fit",
  "Not Yet Ready",
]);
export type FitnessRating = z.infer<typeof FitnessRatingSchema>;

export const RelativeFitnessTierSchema = z.enum([
  "Top Quartile",
  "Above Average",
  "Below Average",
  "Bottom Quartile",
]);
export type RelativeFitnessTier = z.infer<typeof RelativeFitnessTierSchema>;

const IsoDateTime = z.string().datetime({ offset: true });

export const EnvironmentSchema = z.object({
  browser: z.string(),
  os: z.string(),
  screen_resolution: z.string(),
});

export const UserIdentitySchema = z.object({
  user_id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  organization: z.string().min(1),
  role: z.string().min(1),
});

export const SessionMetadataSchema = z.object({
  started_at: IsoDateTime,
  completed_at: IsoDateTime,
  duration_seconds: z.number().int().nonnegative(),
  environment: EnvironmentSchema,
  language: LanguageSchema,
});

export const AiEvaluationResultSchema = z.object({
  question_id: z.string(),
  rubric_score: z.number().int().min(0).max(5),
  rubric_max: z.literal(5),
  justification: z.string(),
  criteria_met: z.array(z.string()),
  criteria_missed: z.array(z.string()),
  notable_strengths: z.string().optional(),
  notable_gaps: z.string().optional(),
  evaluator_model: z.string().optional(),
  evaluated_at: IsoDateTime.optional(),
});
export type AiEvaluationResult = z.infer<typeof AiEvaluationResultSchema>;

const QuestionResponseBase = z.object({
  question_id: z.string().regex(/^s[1-5]-q\d{2}$/),
  variant_id: z.string().nullable(),
  time_taken_seconds: z.number().nonnegative(),
  time_allowed_seconds: z.number().int().positive(),
  auto_advanced: z.boolean(),
  warning_triggered: z.boolean(),
  speed_flags: z.array(SpeedFlagSchema),
  score: z.number().nullable(),
  max_score: z.number().nonnegative(),
  ai_evaluation: AiEvaluationResultSchema.nullable(),
});

export const SingleSelectResponseSchema = QuestionResponseBase.extend({
  type: z.literal("single_select"),
  answer: z.string().nullable(),
});

export const MultiSelectResponseSchema = QuestionResponseBase.extend({
  type: z.literal("multi_select"),
  answer: z.array(z.string()),
});

export const DragToOrderResponseSchema = QuestionResponseBase.extend({
  type: z.literal("drag_to_order"),
  answer: z.array(z.string()),
});

export const OpenEndedResponseSchema = QuestionResponseBase.extend({
  type: z.literal("open_ended"),
  answer: z.string(),
  word_count: z.number().int().nonnegative(),
  char_count: z.number().int().nonnegative(),
});

export const QuestionResponseSchema = z.discriminatedUnion("type", [
  SingleSelectResponseSchema,
  MultiSelectResponseSchema,
  DragToOrderResponseSchema,
  OpenEndedResponseSchema,
]);
export type QuestionResponse = z.infer<typeof QuestionResponseSchema>;

export const SectionResponseSchema = z.object({
  section_id: z.string().min(1),
  started_at: IsoDateTime,
  completed_at: IsoDateTime,
  question_responses: z.array(QuestionResponseSchema).min(1),
});
export type SectionResponse = z.infer<typeof SectionResponseSchema>;

export const SectionScoreSchema = z.object({
  section_id: z.string(),
  section_name: z.string(),
  weight: z.number().min(0).max(1),
  raw_score: z.number().min(0).max(100),
  weighted_score: z.number().min(0).max(100),
  percentile: z.number().int().min(0).max(100).nullable(),
});

export const SpeedProfileSchema = z.object({
  average_time_ratio: z.number().nonnegative(),
  speed_consistency: z.number(),
  speed_accuracy_correlation: z.number().nullable(),
  anomalies: z.array(
    z.object({
      section_id: z.string(),
      question_id: z.string(),
      type: SpeedFlagSchema,
    }),
  ),
});

export const ResultsBlockSchema = z.object({
  section_scores: z.array(SectionScoreSchema).length(5),
  composite_score: z.number().min(0).max(100),
  classification: ClassificationSchema,
  speed_profile: SpeedProfileSchema,
  percentile_rank: z.number().int().min(0).max(100).nullable(),
  relative_fitness_tier: RelativeFitnessTierSchema.nullable(),
});
export type ResultsBlock = z.infer<typeof ResultsBlockSchema>;

export const AssessmentResponseSchema = z
  .object({
    response_id: z.string().uuid(),
    assessment_id: z.string().min(1),
    assessment_version: z.string().min(1),
    user: UserIdentitySchema,
    session: SessionMetadataSchema,
    section_responses: z.array(SectionResponseSchema).length(5),
    results: ResultsBlockSchema.nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.session.completed_at < data.session.started_at) {
      ctx.addIssue({
        code: "custom",
        path: ["session", "completed_at"],
        message: "completed_at must be >= started_at",
      });
    }
  });
export type AssessmentResponse = z.infer<typeof AssessmentResponseSchema>;

export function validateAssessmentResponse(data: unknown): AssessmentResponse {
  return AssessmentResponseSchema.parse(data);
}
