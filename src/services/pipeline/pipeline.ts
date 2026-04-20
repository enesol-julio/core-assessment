import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/index.ts";
import {
  calibrationSnapshots,
  pipelineRuns,
  profiles,
  responses,
  users,
} from "@/db/schema.ts";
import { loadAssessment } from "@/lib/content/index.ts";
import { AssessmentResponseSchema, type AssessmentResponse } from "@/lib/types/assessment-response.ts";
import { AuditedProvider, buildProvider } from "./providers/index.ts";
import { runStep1, DEFAULT_STEP1_CONFIG } from "./steps/step1-scoring.ts";
import { aggregate, type CalibrationContext } from "./steps/step2-aggregation.ts";
import { runStep3, DEFAULT_STEP3_CONFIG } from "./steps/step3-synthesis.ts";
import {
  ResponderProfileSchema,
  type ResponderProfile,
} from "./schemas/responder-profile.ts";
import type { ScoreResult } from "./schemas/score-result.ts";

export type PipelineTrigger = "submission" | "re-evaluation" | "batch_rescore";

export type PipelineResult = {
  response_id: string;
  profile: ResponderProfile;
  total_latency_ms: number;
  total_cost_usd: number;
};

async function loadScoredResponse(responseId: string): Promise<AssessmentResponse> {
  const rows = await db.select().from(responses).where(eq(responses.id, responseId)).limit(1);
  if (rows.length === 0) throw new Error(`pipeline: response ${responseId} not found`);
  return AssessmentResponseSchema.parse(rows[0].responseData);
}

async function loadCurrentCalibration(): Promise<CalibrationContext | null> {
  const rows = await db
    .select()
    .from(calibrationSnapshots)
    .where(eq(calibrationSnapshots.isCurrent, true))
    .limit(1);
  if (rows.length === 0) return null;
  const params = rows[0].params as {
    composite_distribution?: number[];
    section_distributions?: Record<string, number[]>;
  };
  if (!params.composite_distribution || !params.section_distributions) return null;
  return {
    id: rows[0].id,
    sample_size: rows[0].sampleSize,
    composite_distribution: params.composite_distribution,
    section_distributions: params.section_distributions,
  };
}

async function nextProfileVersion(responseId: string): Promise<number> {
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.responseId, responseId))
    .orderBy(desc(profiles.profileVersion))
    .limit(1);
  return rows.length === 0 ? 1 : rows[0].profileVersion + 1;
}

async function startPipelineRun(
  responseId: string,
): Promise<string> {
  const row = await db
    .insert(pipelineRuns)
    .values({
      responseId,
      status: "pending",
      startedAt: new Date(),
    })
    .returning();
  return row[0].id;
}

async function updateRunStatus(
  runId: string,
  patch: {
    status?: string;
    completedAt?: Date | null;
    totalLatencyMs?: number | null;
    totalCostUsd?: string | null;
    metadata?: unknown;
    errorMessage?: string | null;
  },
): Promise<void> {
  const values: Record<string, unknown> = {};
  if (patch.status !== undefined) values.status = patch.status;
  if (patch.completedAt !== undefined) values.completedAt = patch.completedAt;
  if (patch.totalLatencyMs !== undefined) values.totalLatencyMs = patch.totalLatencyMs;
  if (patch.totalCostUsd !== undefined) values.totalCostUsd = patch.totalCostUsd;
  if (patch.metadata !== undefined) values.metadata = patch.metadata;
  if (patch.errorMessage !== undefined) values.errorMessage = patch.errorMessage;
  await db.update(pipelineRuns).set(values).where(eq(pipelineRuns.id, runId));
}

export async function runPipeline(
  responseId: string,
  trigger: PipelineTrigger = "submission",
): Promise<PipelineResult> {
  const runId = await startPipelineRun(responseId);
  const t0 = Date.now();
  const provider = new AuditedProvider(buildProvider());

  try {
    await updateRunStatus(runId, { status: "scoring" });
    const response = await loadScoredResponse(responseId);
    const assessment = await loadAssessment(response.session.language);

    const scoreResults: ScoreResult[] = await runStep1(
      provider,
      response,
      assessment.sections.map((s) => s.file),
      trigger === "batch_rescore" ? "batch_rescore" : trigger,
    );

    await updateRunStatus(runId, { status: "aggregating" });
    const calibration = await loadCurrentCalibration();
    const agg = aggregate(
      response,
      scoreResults,
      assessment.meta,
      assessment.sections.map((s) => s.file),
      calibration,
    );

    await updateRunStatus(runId, { status: "synthesizing" });
    const synth = await runStep3(
      provider,
      responseId,
      agg,
      scoreResults,
      trigger === "batch_rescore" ? "batch_rescore" : trigger,
    );

    const totalLatency = Date.now() - t0;
    const userRow = await db.select().from(users).where(eq(users.id, response.user.user_id)).limit(1);
    if (userRow.length === 0) throw new Error(`pipeline: user ${response.user.user_id} not found`);

    const profileVersion = await nextProfileVersion(responseId);
    const profile: ResponderProfile = {
      profile_id: randomUUID(),
      profile_version: profileVersion,
      response_id: responseId,
      generated_at: new Date().toISOString(),
      pipeline_metadata: {
        step1_model: DEFAULT_STEP1_CONFIG.model,
        step3_model: synth.model_served,
        total_latency_ms: totalLatency,
        total_cost_usd: synth.cost_usd, // step1 cost captured in audit trail; synth cost dominant
        calibration_ref: agg.calibration_ref,
        provider: provider.id,
      },
      user: {
        user_id: response.user.user_id,
        name: response.user.name,
        email: response.user.email,
        organization: response.user.organization,
        role: response.user.role,
      },
      scores: {
        composite_score: agg.composite_score,
        classification: agg.classification,
        percentile_rank: agg.percentile_rank,
        relative_fitness_tier: agg.relative_fitness_tier,
        section_scores: agg.section_scores,
      },
      open_ended_evaluations: scoreResults,
      section_analysis: synth.content.section_analysis,
      cognitive_profile: synth.content.cognitive_profile,
      vibe_coding_fitness: synth.content.vibe_coding_fitness,
      development_recommendations: synth.content.development_recommendations,
      speed_profile_interpretation: synth.content.speed_profile_interpretation,
      red_flags: synth.content.red_flags,
    };

    const validated = ResponderProfileSchema.parse(profile);

    await db.insert(profiles).values({
      id: validated.profile_id,
      responseId,
      profileVersion,
      userId: response.user.user_id,
      compositeScore: validated.scores.composite_score.toFixed(2),
      classification: validated.scores.classification,
      fitnessRating: validated.vibe_coding_fitness.rating,
      organization: validated.user.organization,
      completedAt: new Date(response.session.completed_at),
      percentileRank: validated.scores.percentile_rank,
      relativeFitnessTier: validated.scores.relative_fitness_tier,
      profileData: validated,
    });

    await updateRunStatus(runId, {
      status: "complete",
      completedAt: new Date(),
      totalLatencyMs: totalLatency,
      totalCostUsd: synth.cost_usd.toFixed(4),
      metadata: {
        provider: provider.id,
        step1_model: DEFAULT_STEP1_CONFIG.model,
        step3_model: DEFAULT_STEP3_CONFIG.model,
        step3_model_served: synth.model_served,
        open_ended_count: scoreResults.length,
      },
    });

    return {
      response_id: responseId,
      profile: validated,
      total_latency_ms: totalLatency,
      total_cost_usd: synth.cost_usd,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateRunStatus(runId, {
      status: "error",
      completedAt: new Date(),
      errorMessage: message,
    });
    throw err;
  }
}

export async function pipelineStatus(responseId: string): Promise<{
  latest_run: {
    id: string;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    total_latency_ms: number | null;
    error_message: string | null;
  } | null;
  profile_count: number;
}> {
  const runs = await db
    .select()
    .from(pipelineRuns)
    .where(eq(pipelineRuns.responseId, responseId))
    .orderBy(desc(pipelineRuns.startedAt))
    .limit(1);
  const profileRows = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.responseId, responseId));
  return {
    latest_run:
      runs.length === 0
        ? null
        : {
            id: runs[0].id,
            status: runs[0].status,
            started_at: runs[0].startedAt?.toISOString() ?? null,
            completed_at: runs[0].completedAt?.toISOString() ?? null,
            total_latency_ms: runs[0].totalLatencyMs,
            error_message: runs[0].errorMessage,
          },
    profile_count: profileRows.length,
  };
}

export async function latestProfile(responseId: string): Promise<ResponderProfile | null> {
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.responseId, responseId))
    .orderBy(desc(profiles.profileVersion))
    .limit(1);
  if (rows.length === 0) return null;
  return ResponderProfileSchema.parse(rows[0].profileData);
}
