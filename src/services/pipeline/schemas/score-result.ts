import { z } from "zod";

export const ScoreResultSchema = z.object({
  question_id: z.string(),
  rubric_score: z.number().int().min(0).max(5),
  rubric_max: z.literal(5),
  justification: z.string().min(1),
  criteria_met: z.array(z.string()),
  criteria_missed: z.array(z.string()),
  notable_strengths: z.string().optional().default(""),
  notable_gaps: z.string().optional().default(""),
});

export type ScoreResult = z.infer<typeof ScoreResultSchema>;
