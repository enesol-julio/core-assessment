import { z } from "zod";
import { LanguageSchema } from "./assessment-response.ts";

const IsoDateTime = z.string().datetime({ offset: true });

const BaseAnswer = z.object({
  question_id: z.string().regex(/^s[1-5]-q\d{2}$/),
  variant_id: z.string().nullable().optional().default(null),
  time_taken_seconds: z.number().nonnegative(),
  time_allowed_seconds: z.number().int().positive(),
  auto_advanced: z.boolean(),
  warning_triggered: z.boolean(),
});

export const SubmitQuestionResponseSchema = z.discriminatedUnion("type", [
  BaseAnswer.extend({
    type: z.literal("single_select"),
    answer: z.string().nullable(),
  }),
  BaseAnswer.extend({
    type: z.literal("multi_select"),
    answer: z.array(z.string()),
  }),
  BaseAnswer.extend({
    type: z.literal("drag_to_order"),
    answer: z.array(z.string()),
  }),
  BaseAnswer.extend({
    type: z.literal("open_ended"),
    answer: z.string(),
  }),
]);

export const SubmitSectionResponseSchema = z.object({
  section_id: z.string().min(1),
  started_at: IsoDateTime,
  completed_at: IsoDateTime,
  question_responses: z.array(SubmitQuestionResponseSchema).min(1),
});

export const SubmitEnvironmentSchema = z.object({
  browser: z.string().optional().default("unknown"),
  os: z.string().optional().default("unknown"),
  screen_resolution: z.string().optional().default("unknown"),
});

export const AssessmentSubmitSchema = z.object({
  started_at: IsoDateTime,
  completed_at: IsoDateTime,
  environment: SubmitEnvironmentSchema,
  language: LanguageSchema,
  section_responses: z.array(SubmitSectionResponseSchema).length(5),
});

export type AssessmentSubmit = z.infer<typeof AssessmentSubmitSchema>;
export type SubmitQuestionResponse = z.infer<typeof SubmitQuestionResponseSchema>;
export type SubmitSectionResponse = z.infer<typeof SubmitSectionResponseSchema>;
