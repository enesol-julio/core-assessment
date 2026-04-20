import { z } from "zod";
import { ClassificationSchema, FitnessRatingSchema, RelativeFitnessTierSchema } from "@/lib/types/assessment-response.ts";

export const SectionAnalysisSchema = z.object({
  section_id: z.string(),
  section_name: z.string(),
  raw_score: z.number(),
  percentile: z.number().nullable().optional(),
  narrative: z.string().min(1),
  strengths: z.array(z.string()).default([]),
  concerns: z.array(z.string()).default([]),
});

export const CognitiveProfileSchema = z.object({
  style: z.string().min(1),
  description: z.string().min(1),
  strengths: z.array(z.string()).default([]),
  development_areas: z.array(z.string()).default([]),
  speed_characterization: z.string().default(""),
  pattern_insights: z.array(z.string()).default([]),
});

export const VibeCodingFitnessSchema = z.object({
  rating: FitnessRatingSchema,
  confidence: z.enum(["high", "medium", "low"]),
  justification: z.string().min(1),
  key_strengths_for_ai_work: z.array(z.string()).default([]),
  key_risks_for_ai_work: z.array(z.string()).default([]),
  recommended_role_contexts: z.array(z.string()).default([]),
});

export const DevelopmentRecommendationSchema = z.object({
  area: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  observation: z.string(),
  recommendation: z.string(),
});

export const SpeedProfileInterpretationSchema = z.object({
  overall_characterization: z.string(),
  speed_accuracy_insight: z.string(),
  anomaly_interpretation: z.string(),
});

export const RedFlagSchema = z.object({
  type: z.enum(["suspicious_fast", "inconsistent_pattern", "section_disparity", "other"]),
  description: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  implication: z.string(),
});

export const ResponderProfileContentSchema = z.object({
  section_analysis: z.array(SectionAnalysisSchema),
  cognitive_profile: CognitiveProfileSchema,
  vibe_coding_fitness: VibeCodingFitnessSchema,
  development_recommendations: z.array(DevelopmentRecommendationSchema).default([]),
  speed_profile_interpretation: SpeedProfileInterpretationSchema,
  red_flags: z.array(RedFlagSchema).default([]),
});

export type ResponderProfileContent = z.infer<typeof ResponderProfileContentSchema>;

export const ResponderProfileSchema = z
  .object({
    profile_id: z.string().uuid(),
    profile_version: z.number().int().positive(),
    response_id: z.string().uuid(),
    generated_at: z.string().datetime({ offset: true }),
    pipeline_metadata: z.object({
      step1_model: z.string(),
      step3_model: z.string(),
      total_latency_ms: z.number().nonnegative(),
      total_cost_usd: z.number().nonnegative(),
      calibration_ref: z.string().nullable(),
      provider: z.string(),
    }),
    user: z.object({
      user_id: z.string(),
      name: z.string(),
      email: z.string().email(),
      organization: z.string(),
      role: z.string(),
    }),
    scores: z.object({
      composite_score: z.number(),
      classification: ClassificationSchema,
      percentile_rank: z.number().nullable(),
      relative_fitness_tier: RelativeFitnessTierSchema.nullable(),
      section_scores: z.array(
        z.object({
          section_id: z.string(),
          section_name: z.string(),
          weight: z.number(),
          raw_score: z.number(),
          weighted_score: z.number(),
          percentile: z.number().nullable().optional(),
        }),
      ),
    }),
    open_ended_evaluations: z.array(z.unknown()),
    section_analysis: z.array(SectionAnalysisSchema),
    cognitive_profile: CognitiveProfileSchema,
    vibe_coding_fitness: VibeCodingFitnessSchema,
    development_recommendations: z.array(DevelopmentRecommendationSchema),
    speed_profile_interpretation: SpeedProfileInterpretationSchema,
    red_flags: z.array(RedFlagSchema),
  });

export type ResponderProfile = z.infer<typeof ResponderProfileSchema>;
