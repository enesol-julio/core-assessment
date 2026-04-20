import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/index.ts";
import { calibrationSnapshots, profiles } from "@/db/schema.ts";
import type { ResponderProfile } from "../schemas/responder-profile.ts";
import { ResponderProfileSchema } from "../schemas/responder-profile.ts";

export const MIN_CALIBRATION_SAMPLE = 10;
export const BATCH_RESCORE_INTERVAL = 25;

export type CalibrationParams = {
  sample_size: number;
  generated_at: string;
  assessment_version: string;
  composite: {
    mean: number;
    median: number;
    std_dev: number;
    min: number;
    max: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  composite_distribution: number[];
  sections: Record<
    string,
    { mean: number; median: number; std_dev: number; min: number; max: number; p25: number; p75: number }
  >;
  section_distributions: Record<string, number[]>;
  speed_benchmarks: {
    overall_mean_time_ratio: number;
    per_section: Record<string, number>;
  };
  classification_distribution: Record<string, number>;
  fitness_rating_distribution: Record<string, number>;
};

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[idx];
}

function stats(values: number[]) {
  if (values.length === 0) {
    return { mean: 0, median: 0, std_dev: 0, min: 0, max: 0, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / sorted.length;
  return {
    mean,
    median: median(sorted),
    std_dev: Math.sqrt(variance),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p10: percentile(sorted, 10),
    p25: percentile(sorted, 25),
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
  };
}

function sectionStats(values: number[]) {
  if (values.length === 0) {
    return { mean: 0, median: 0, std_dev: 0, min: 0, max: 0, p25: 0, p75: 0 };
  }
  const full = stats(values);
  return {
    mean: full.mean,
    median: full.median,
    std_dev: full.std_dev,
    min: full.min,
    max: full.max,
    p25: full.p25,
    p75: full.p75,
  };
}

export async function computeCalibrationParams(): Promise<CalibrationParams | null> {
  const latestPerResponse = await db
    .select()
    .from(profiles)
    .where(
      sql`${profiles.profileVersion} = (
        SELECT MAX(p2.profile_version) FROM profiles p2 WHERE p2.response_id = ${profiles.responseId}
      )`,
    );
  if (latestPerResponse.length < MIN_CALIBRATION_SAMPLE) return null;

  const compositeList: number[] = [];
  const sectionLists: Record<string, number[]> = {};
  const classificationCounts: Record<string, number> = {};
  const fitnessCounts: Record<string, number> = {};
  const speedRatiosOverall: number[] = [];
  const speedRatiosPerSection: Record<string, number[]> = {};
  let assessmentVersion = "unknown";

  for (const row of latestPerResponse) {
    const profile: ResponderProfile = ResponderProfileSchema.parse(row.profileData);
    compositeList.push(profile.scores.composite_score);
    classificationCounts[profile.scores.classification] =
      (classificationCounts[profile.scores.classification] ?? 0) + 1;
    fitnessCounts[profile.vibe_coding_fitness.rating] =
      (fitnessCounts[profile.vibe_coding_fitness.rating] ?? 0) + 1;
    for (const s of profile.scores.section_scores) {
      (sectionLists[s.section_id] ??= []).push(s.raw_score);
    }
  }

  const compositeStats = stats(compositeList);
  const sectionsOut: CalibrationParams["sections"] = {};
  const sectionDistributionsOut: CalibrationParams["section_distributions"] = {};
  for (const [sid, vals] of Object.entries(sectionLists)) {
    sectionsOut[sid] = sectionStats(vals);
    sectionDistributionsOut[sid] = vals;
  }

  return {
    sample_size: latestPerResponse.length,
    generated_at: new Date().toISOString(),
    assessment_version: assessmentVersion,
    composite: compositeStats,
    composite_distribution: compositeList,
    sections: sectionsOut,
    section_distributions: sectionDistributionsOut,
    speed_benchmarks: {
      overall_mean_time_ratio:
        speedRatiosOverall.length === 0
          ? 0
          : speedRatiosOverall.reduce((a, b) => a + b, 0) / speedRatiosOverall.length,
      per_section: Object.fromEntries(
        Object.entries(speedRatiosPerSection).map(([k, v]) => [
          k,
          v.reduce((a, b) => a + b, 0) / Math.max(1, v.length),
        ]),
      ),
    },
    classification_distribution: classificationCounts,
    fitness_rating_distribution: fitnessCounts,
  };
}

export async function updateCalibrationSnapshot(): Promise<CalibrationParams | null> {
  const params = await computeCalibrationParams();
  if (!params) return null;

  await db.transaction(async (tx) => {
    await tx
      .update(calibrationSnapshots)
      .set({ isCurrent: false })
      .where(eq(calibrationSnapshots.isCurrent, true));
    await tx.insert(calibrationSnapshots).values({
      sampleSize: params.sample_size,
      isCurrent: true,
      params,
      generatedAt: new Date(params.generated_at),
    });
  });

  return params;
}

export async function countProfiles(): Promise<number> {
  const [{ value }] = await db.select({ value: count() }).from(profiles);
  return Number(value ?? 0);
}

export async function mostRecentCalibration() {
  const rows = await db
    .select()
    .from(calibrationSnapshots)
    .where(eq(calibrationSnapshots.isCurrent, true))
    .limit(1);
  if (rows.length === 0) return null;
  return rows[0];
}

export async function calibrationHistory() {
  return db
    .select()
    .from(calibrationSnapshots)
    .orderBy(desc(calibrationSnapshots.generatedAt));
}
