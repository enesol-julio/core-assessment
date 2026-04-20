import { z } from "zod";
import { LanguageSchema } from "./assessment-response.ts";

export const TimerModeSchema = z.enum([
  "visible",
  "hidden_with_warning",
  "per_question",
  "mixed",
]);

export const QuestionTypeInMetaSchema = z.enum([
  "single_select",
  "multi_select",
  "drag_to_order",
  "open_ended",
]);

export const GlobalSettingsSchema = z.object({
  allow_pause_between_sections: z.boolean(),
  allow_back_navigation: z.boolean(),
  open_ended_char_limit: z.number().int().positive(),
  open_ended_word_limit: z.number().int().positive(),
  multi_select_penalty_factor: z.number().min(0).max(1),
  drag_order_partial_credit_tolerance: z.number().int().nonnegative(),
  total_questions_in_bank: z.number().int().positive(),
  total_questions_per_session: z.number().int().positive(),
  estimated_session_duration_minutes: z.number().int().positive(),
  supported_languages: z.array(LanguageSchema).min(1),
  default_language: LanguageSchema,
  domain_language_defaults: z.record(z.string(), LanguageSchema),
});

export const MetaSectionSchema = z.object({
  section_id: z.string().min(1),
  name: z.string().min(1),
  short_name: z.string().min(1),
  file: z.string().regex(/^sections\/.+\.json$/),
  order: z.number().int().min(1).max(5),
  weight: z.number().min(0).max(1),
  description: z.string().min(1),
  questions_in_pool: z.number().int().positive(),
  questions_served: z.number().int().positive(),
  question_types: z.array(QuestionTypeInMetaSchema).min(1),
  timer_mode: TimerModeSchema,
  estimated_duration_seconds: z.number().int().positive(),
});

export const ClassificationTierSchema = z.object({
  min: z.number().int().min(0).max(100),
  max: z.number().int().min(0).max(100),
  label: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  description: z.string().min(1),
});

export const ScoringSchema = z.object({
  composite_method: z.literal("weighted_average"),
  scale_min: z.literal(0),
  scale_max: z.literal(100),
  classifications: z.array(ClassificationTierSchema).min(1),
});

export const AssessmentMetaSchema = z
  .object({
    assessment_id: z.string().min(1),
    name: z.string().min(1),
    full_name: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    description: z.string().min(1),
    organizations: z.array(z.string().min(1)).min(1),
    created_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    updated_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    global_settings: GlobalSettingsSchema,
    sections: z.array(MetaSectionSchema).length(5),
    scoring: ScoringSchema,
    evaluation: z.looseObject({}),
    speed_metrics: z.looseObject({}),
    anti_gaming: z.looseObject({}),
    administration: z.looseObject({}),
  })
  .superRefine((data, ctx) => {
    const weightSum = data.sections.reduce((acc, s) => acc + s.weight, 0);
    if (Math.abs(weightSum - 1.0) > 1e-6) {
      ctx.addIssue({
        code: "custom",
        path: ["sections"],
        message: `Section weights must sum to 1.0 (got ${weightSum.toFixed(4)})`,
      });
    }

    const orders = data.sections.map((s) => s.order).sort((a, b) => a - b);
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i + 1) {
        ctx.addIssue({
          code: "custom",
          path: ["sections"],
          message: `Section orders must be a permutation of 1..5 (got ${orders.join(",")})`,
        });
        break;
      }
    }

    const ids = new Set<string>();
    for (const s of data.sections) {
      if (ids.has(s.section_id)) {
        ctx.addIssue({
          code: "custom",
          path: ["sections"],
          message: `Duplicate section_id: ${s.section_id}`,
        });
      }
      ids.add(s.section_id);
    }

    const tiers = [...data.scoring.classifications].sort((a, b) => a.min - b.min);
    if (tiers[0].min !== 0) {
      ctx.addIssue({
        code: "custom",
        path: ["scoring", "classifications"],
        message: `Classification tiers must start at 0 (starts at ${tiers[0].min})`,
      });
    }
    if (tiers[tiers.length - 1].max !== 100) {
      ctx.addIssue({
        code: "custom",
        path: ["scoring", "classifications"],
        message: `Classification tiers must end at 100 (ends at ${tiers[tiers.length - 1].max})`,
      });
    }
    for (let i = 0; i < tiers.length; i++) {
      if (tiers[i].min > tiers[i].max) {
        ctx.addIssue({
          code: "custom",
          path: ["scoring", "classifications", i, "min"],
          message: `Tier min (${tiers[i].min}) > max (${tiers[i].max})`,
        });
      }
      if (i > 0 && tiers[i].min !== tiers[i - 1].max + 1) {
        ctx.addIssue({
          code: "custom",
          path: ["scoring", "classifications"],
          message: `Classification tiers have gap or overlap between [${tiers[i - 1].min}-${tiers[i - 1].max}] and [${tiers[i].min}-${tiers[i].max}]`,
        });
      }
    }

    const poolTotal = data.sections.reduce((acc, s) => acc + s.questions_in_pool, 0);
    if (poolTotal !== data.global_settings.total_questions_in_bank) {
      ctx.addIssue({
        code: "custom",
        path: ["global_settings", "total_questions_in_bank"],
        message: `Sum of questions_in_pool (${poolTotal}) must equal total_questions_in_bank (${data.global_settings.total_questions_in_bank})`,
      });
    }
    const servedTotal = data.sections.reduce((acc, s) => acc + s.questions_served, 0);
    if (servedTotal !== data.global_settings.total_questions_per_session) {
      ctx.addIssue({
        code: "custom",
        path: ["global_settings", "total_questions_per_session"],
        message: `Sum of questions_served (${servedTotal}) must equal total_questions_per_session (${data.global_settings.total_questions_per_session})`,
      });
    }
  });

export type AssessmentMeta = z.infer<typeof AssessmentMetaSchema>;
export type MetaSection = z.infer<typeof MetaSectionSchema>;
