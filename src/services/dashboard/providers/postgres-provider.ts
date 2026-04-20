import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db/index.ts";
import {
  calibrationSnapshots,
  goldenTestRuns,
  pipelineRuns,
  profiles,
  responses,
} from "@/db/schema.ts";
import type {
  CalibrationSnapshotSummary,
  DataProvider,
  GoldenTestRunSummary,
  PipelineRunSummary,
  ProfileFilters,
  ProfileSummary,
  TimeRangeFilter,
} from "../interfaces/data-provider.ts";
import {
  ResponderProfileSchema,
  type ResponderProfile,
} from "@/services/pipeline/schemas/responder-profile.ts";
import type { CalibrationParams } from "@/services/pipeline/calibration/params.ts";
import type { AssessmentResponse } from "@/lib/types/assessment-response.ts";
import { AssessmentResponseSchema } from "@/lib/types/assessment-response.ts";

function latestProfileSubquery() {
  return sql`${profiles.profileVersion} = (
    SELECT MAX(p2.profile_version) FROM profiles p2 WHERE p2.response_id = ${profiles.responseId}
  )`;
}

export class PostgresProvider implements DataProvider {
  readonly id = "postgres" as const;

  async listProfiles(filters: ProfileFilters = {}): Promise<ProfileSummary[]> {
    const conditions = [latestProfileSubquery()];
    if (filters.organization) conditions.push(eq(profiles.organization, filters.organization));
    if (filters.classification) conditions.push(eq(profiles.classification, filters.classification));
    if (filters.fitness_rating) conditions.push(eq(profiles.fitnessRating, filters.fitness_rating));
    if (filters.after) conditions.push(gte(profiles.completedAt, new Date(filters.after)));
    if (filters.before) conditions.push(lte(profiles.completedAt, new Date(filters.before)));

    const rows = await db
      .select({
        profileId: profiles.id,
        responseId: profiles.responseId,
        profileVersion: profiles.profileVersion,
        userId: profiles.userId,
        organization: profiles.organization,
        classification: profiles.classification,
        fitnessRating: profiles.fitnessRating,
        composite: profiles.compositeScore,
        completedAt: profiles.completedAt,
        percentileRank: profiles.percentileRank,
        relativeFitnessTier: profiles.relativeFitnessTier,
        profileData: profiles.profileData,
        responseData: responses.responseData,
      })
      .from(profiles)
      .leftJoin(responses, eq(responses.id, profiles.responseId))
      .where(and(...conditions))
      .orderBy(desc(profiles.compositeScore));

    return rows.map((row) => {
      const resp = row.responseData
        ? AssessmentResponseSchema.safeParse(row.responseData).data
        : null;
      const profile = ResponderProfileSchema.safeParse(row.profileData).data ?? null;
      const user = resp?.user;
      const sectionScores: ProfileSummary["sectionScores"] =
        profile?.scores.section_scores.map((s) => ({
          sectionId: s.section_id,
          sectionName: s.section_name,
          rawScore: s.raw_score,
        })) ?? [];

      return {
        responseId: row.responseId,
        profileId: row.profileId,
        profileVersion: row.profileVersion,
        userId: row.userId,
        name: user?.name ?? "Unknown",
        email: user?.email ?? "unknown@unknown",
        organization: row.organization,
        role: user?.role ?? "",
        completedAt: row.completedAt.toISOString(),
        compositeScore: Number(row.composite),
        classification: row.classification,
        fitnessRating: row.fitnessRating,
        percentileRank: row.percentileRank ?? null,
        relativeFitnessTier: row.relativeFitnessTier ?? null,
        sectionScores,
      };
    });
  }

  async getProfile(responseId: string): Promise<ResponderProfile | null> {
    const rows = await db
      .select()
      .from(profiles)
      .where(eq(profiles.responseId, responseId))
      .orderBy(desc(profiles.profileVersion))
      .limit(1);
    if (rows.length === 0) return null;
    return ResponderProfileSchema.parse(rows[0].profileData);
  }

  async getResponse(responseId: string): Promise<AssessmentResponse | null> {
    const rows = await db.select().from(responses).where(eq(responses.id, responseId)).limit(1);
    if (rows.length === 0) return null;
    return AssessmentResponseSchema.parse(rows[0].responseData);
  }

  async getCurrentCalibration(): Promise<CalibrationSnapshotSummary | null> {
    const rows = await db
      .select()
      .from(calibrationSnapshots)
      .where(eq(calibrationSnapshots.isCurrent, true))
      .limit(1);
    if (rows.length === 0) return null;
    return {
      id: rows[0].id,
      sampleSize: rows[0].sampleSize,
      isCurrent: true,
      generatedAt: rows[0].generatedAt.toISOString(),
      params: rows[0].params as CalibrationParams,
    };
  }

  async getCalibrationHistory(): Promise<CalibrationSnapshotSummary[]> {
    const rows = await db
      .select()
      .from(calibrationSnapshots)
      .orderBy(desc(calibrationSnapshots.generatedAt));
    return rows.map((r) => ({
      id: r.id,
      sampleSize: r.sampleSize,
      isCurrent: r.isCurrent,
      generatedAt: r.generatedAt.toISOString(),
      params: r.params as CalibrationParams,
    }));
  }

  async getPipelineRuns(filters: TimeRangeFilter = {}): Promise<PipelineRunSummary[]> {
    const after = filters.windowHours
      ? new Date(Date.now() - filters.windowHours * 3600 * 1000)
      : null;
    const conditions = [];
    if (after) conditions.push(gte(pipelineRuns.startedAt, after));
    const rows = await db
      .select()
      .from(pipelineRuns)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(pipelineRuns.startedAt));
    return rows.map((r) => ({
      id: r.id,
      responseId: r.responseId,
      status: r.status,
      startedAt: r.startedAt?.toISOString() ?? null,
      completedAt: r.completedAt?.toISOString() ?? null,
      totalLatencyMs: r.totalLatencyMs,
      totalCostUsd: r.totalCostUsd ? Number(r.totalCostUsd) : null,
      errorMessage: r.errorMessage,
    }));
  }

  async getGoldenTestRuns(filters: TimeRangeFilter = {}): Promise<GoldenTestRunSummary[]> {
    const after = filters.windowHours
      ? new Date(Date.now() - filters.windowHours * 3600 * 1000)
      : null;
    const conditions = [];
    if (after) conditions.push(gte(goldenTestRuns.ranAt, after));
    const rows = await db
      .select()
      .from(goldenTestRuns)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(goldenTestRuns.ranAt));
    return rows.map((r) => ({
      id: r.id,
      ranAt: r.ranAt.toISOString(),
      passed: r.passed,
      mad: Number(r.mad),
      rangeComplianceRate: Number(r.rangeComplianceRate),
      extremeMissCount: r.extremeMissCount,
    }));
  }
}

let singleton: PostgresProvider | null = null;
export function getDataProvider(): PostgresProvider {
  if (!singleton) singleton = new PostgresProvider();
  return singleton;
}
