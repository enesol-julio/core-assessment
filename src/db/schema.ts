import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    organization: text("organization").notNull(),
    role: text("role").notNull().default("test_taker"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("sessions_user_id_idx").on(t.userId),
    index("sessions_expires_at_idx").on(t.expiresAt),
  ],
);

export const otpTokens = pgTable(
  "otp_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    code: text("code").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    used: boolean("used").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("otp_tokens_email_idx").on(t.email),
    index("otp_tokens_expires_at_idx").on(t.expiresAt),
  ],
);

export const responses = pgTable(
  "responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    assessmentVersion: text("assessment_version").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
    responseData: jsonb("response_data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("responses_user_id_idx").on(t.userId),
    index("responses_completed_at_idx").on(t.completedAt),
  ],
);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    responseId: uuid("response_id")
      .notNull()
      .references(() => responses.id, { onDelete: "cascade" }),
    profileVersion: integer("profile_version").notNull().default(1),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    compositeScore: numeric("composite_score", { precision: 5, scale: 2 }).notNull(),
    classification: text("classification").notNull(),
    fitnessRating: text("fitness_rating").notNull(),
    organization: text("organization").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
    percentileRank: integer("percentile_rank"),
    relativeFitnessTier: text("relative_fitness_tier"),
    profileData: jsonb("profile_data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("profiles_response_version_unique").on(t.responseId, t.profileVersion),
    index("profiles_organization_idx").on(t.organization),
    index("profiles_fitness_rating_idx").on(t.fitnessRating),
    index("profiles_classification_idx").on(t.classification),
    index("profiles_completed_at_idx").on(t.completedAt),
    index("profiles_composite_score_desc_idx").on(sql`${t.compositeScore} DESC`),
  ],
);

export const calibrationSnapshots = pgTable(
  "calibration_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sampleSize: integer("sample_size").notNull(),
    isCurrent: boolean("is_current").notNull().default(false),
    params: jsonb("params").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("calibration_snapshots_is_current_idx").on(t.isCurrent)],
);

export const pipelineRuns = pgTable(
  "pipeline_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    responseId: uuid("response_id")
      .notNull()
      .references(() => responses.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    totalLatencyMs: integer("total_latency_ms"),
    totalCostUsd: numeric("total_cost_usd", { precision: 8, scale: 4 }),
    metadata: jsonb("metadata"),
    errorMessage: text("error_message"),
  },
  (t) => [
    index("pipeline_runs_response_id_idx").on(t.responseId),
    index("pipeline_runs_status_idx").on(t.status),
  ],
);

export const goldenTestResponses = pgTable(
  "golden_test_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: text("question_id").notNull(),
    qualityLevel: text("quality_level").notNull(),
    responseText: text("response_text").notNull(),
    consensusScore: numeric("consensus_score", { precision: 3, scale: 1 }).notNull(),
    acceptableMin: numeric("acceptable_min", { precision: 3, scale: 1 }).notNull(),
    acceptableMax: numeric("acceptable_max", { precision: 3, scale: 1 }).notNull(),
    responseData: jsonb("response_data").notNull(),
  },
  (t) => [index("golden_test_responses_question_id_idx").on(t.questionId)],
);

export const goldenTestRuns = pgTable("golden_test_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
  passed: boolean("passed").notNull(),
  mad: numeric("mad", { precision: 4, scale: 3 }).notNull(),
  rangeComplianceRate: numeric("range_compliance_rate", { precision: 4, scale: 3 }).notNull(),
  extremeMissCount: integer("extreme_miss_count").notNull(),
  results: jsonb("results").notNull(),
});

export const allowedDomains = pgTable(
  "allowed_domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    domain: text("domain").notNull(),
    addedBy: text("added_by").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("allowed_domains_domain_unique").on(t.domain)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Response = typeof responses.$inferSelect;
export type NewResponse = typeof responses.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type CalibrationSnapshot = typeof calibrationSnapshots.$inferSelect;
export type PipelineRun = typeof pipelineRuns.$inferSelect;
export type GoldenTestResponse = typeof goldenTestResponses.$inferSelect;
export type GoldenTestRun = typeof goldenTestRuns.$inferSelect;
export type AllowedDomain = typeof allowedDomains.$inferSelect;
