import { z } from "zod";

export const QuestionIdSchema = z.string().regex(/^s[1-5]-q\d{2}$/);

export const DifficultySchema = z.enum(["easy", "medium", "hard"]);

export const ShowTimerSchema = z.enum([
  "visible",
  "hidden_with_warning",
  "per_question",
]);

export const TimerConfigSchema = z
  .object({
    time_allowed_seconds: z.number().int().positive(),
    warning_seconds: z.number().int().nonnegative(),
    show_timer: ShowTimerSchema,
    auto_advance: z.boolean(),
  })
  .refine((t) => t.warning_seconds < t.time_allowed_seconds, {
    message: "warning_seconds must be < time_allowed_seconds",
    path: ["warning_seconds"],
  });

export const SpeedFlagsSchema = z.looseObject({
  suspicious_fast_seconds: z.number().int().positive().optional(),
  slow_threshold_seconds: z.number().int().positive().optional(),
});

export const OptionSchema = z.object({
  option_id: z.string().min(1),
  text: z.string().min(1),
});

export const ItemSchema = z.object({
  item_id: z.string().min(1),
  text: z.string().min(1),
});

export const RubricLevelSchema = z.object({
  score: z.number().int().min(0).max(5),
  label: z.string().min(1),
  description: z.string().min(1),
});

export const RubricSchema = z.object({
  scale_min: z.literal(0),
  scale_max: z.literal(5),
  scoring_method: z.string().min(1),
  criteria: z.array(z.string().min(1)).min(3),
  levels: z.array(RubricLevelSchema).min(1),
});

export const OpenEndedConstraintsSchema = z.object({
  char_limit: z.number().int().positive(),
  word_limit: z.number().int().positive(),
  placeholder_text: z.string().optional(),
});

const BaseQuestion = z.object({
  question_id: QuestionIdSchema,
  difficulty: DifficultySchema,
  points: z.number().positive(),
  timer_config: TimerConfigSchema,
  prompt: z.string().min(1),
  context: z.string().nullish(),
  speed_flags: SpeedFlagsSchema,
  variants: z.array(z.unknown()),
});

export const SingleSelectQuestionSchema = BaseQuestion.extend({
  type: z.literal("single_select"),
  subtype: z.string().optional(),
  options: z.array(OptionSchema).min(2),
  correct_answer: z.string().min(1),
  explanation: z.string().optional(),
}).superRefine((q, ctx) => {
  const ids = q.options.map((o) => o.option_id);
  if (!ids.includes(q.correct_answer)) {
    ctx.addIssue({
      code: "custom",
      path: ["correct_answer"],
      message: `correct_answer "${q.correct_answer}" not in option_ids [${ids.join(", ")}]`,
    });
  }
});

export const MultiSelectQuestionSchema = BaseQuestion.extend({
  type: z.literal("multi_select"),
  options: z.array(OptionSchema).min(3),
  correct_answers: z.array(z.string()).min(1),
  explanation: z.string().optional(),
  scoring_config: z.looseObject({}).optional(),
  output_source: z.enum(["human", "ai"]).optional(),
}).superRefine((q, ctx) => {
  const ids = q.options.map((o) => o.option_id);
  for (const a of q.correct_answers) {
    if (!ids.includes(a)) {
      ctx.addIssue({
        code: "custom",
        path: ["correct_answers"],
        message: `correct_answer "${a}" not in option_ids [${ids.join(", ")}]`,
      });
    }
  }
  if (q.options.length <= q.correct_answers.length) {
    ctx.addIssue({
      code: "custom",
      path: ["options"],
      message: `options (${q.options.length}) must exceed correct_answers (${q.correct_answers.length}) by at least 1`,
    });
  }
});

export const DragToOrderQuestionSchema = BaseQuestion.extend({
  type: z.literal("drag_to_order"),
  items: z.array(ItemSchema).min(2),
  correct_order: z.array(z.string()).min(2),
  explanation: z.string().optional(),
  scoring_config: z.looseObject({}).optional(),
}).superRefine((q, ctx) => {
  const ids = q.items.map((i) => i.item_id);
  if (q.correct_order.length !== q.items.length) {
    ctx.addIssue({
      code: "custom",
      path: ["correct_order"],
      message: `correct_order length (${q.correct_order.length}) must equal items length (${q.items.length})`,
    });
  }
  for (const c of q.correct_order) {
    if (!ids.includes(c)) {
      ctx.addIssue({
        code: "custom",
        path: ["correct_order"],
        message: `correct_order entry "${c}" not in item_ids [${ids.join(", ")}]`,
      });
    }
  }
  const unique = new Set(q.correct_order);
  if (unique.size !== q.correct_order.length) {
    ctx.addIssue({
      code: "custom",
      path: ["correct_order"],
      message: `correct_order has duplicates`,
    });
  }
});

export const OpenEndedQuestionSchema = BaseQuestion.extend({
  type: z.literal("open_ended"),
  subtype: z.string().optional(),
  output_source: z.enum(["human", "ai"]).optional(),
  constraints: OpenEndedConstraintsSchema,
  rubric: RubricSchema,
  sample_strong_response: z.string().min(20),
});

export const QuestionSchema = z.discriminatedUnion("type", [
  SingleSelectQuestionSchema,
  MultiSelectQuestionSchema,
  DragToOrderQuestionSchema,
  OpenEndedQuestionSchema,
]);

export const SelectionRuleSchema = z.object({
  field: z.string().min(1),
  value: z.string().min(1),
  min: z.number().int().nonnegative(),
});

export const SelectionConstraintsSchema = z.object({
  method: z.enum(["random_without_replacement", "constrained_random"]),
  count: z.number().int().positive(),
  rules: z.array(SelectionRuleSchema).optional(),
});

export const SectionFileSchema = z.object({
  section_id: z.string().min(1),
  name: z.string().min(1),
  instructions: z.string().min(1),
  question_count: z.number().int().positive(),
  selection_constraints: SelectionConstraintsSchema,
  questions: z.array(QuestionSchema).min(1),
});

export type Question = z.infer<typeof QuestionSchema>;
export type SectionFile = z.infer<typeof SectionFileSchema>;
