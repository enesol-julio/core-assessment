import type { ResponderProfile } from "@/services/pipeline/schemas/responder-profile.ts";
import type { CalibrationParams } from "@/services/pipeline/calibration/params.ts";

export type ProfileFilters = {
  organization?: string;
  after?: string; // ISO date
  before?: string; // ISO date
  classification?: string;
  fitness_rating?: string;
};

export type TimeRangeFilter = {
  windowHours?: number;
};

export type ProfileSummary = {
  responseId: string;
  profileId: string;
  profileVersion: number;
  userId: string;
  name: string;
  email: string;
  organization: string;
  role: string;
  completedAt: string;
  compositeScore: number;
  classification: string;
  fitnessRating: string;
  percentileRank: number | null;
  relativeFitnessTier: string | null;
  sectionScores: Array<{ sectionId: string; sectionName: string; rawScore: number }>;
};

export type CalibrationSnapshotSummary = {
  id: string;
  sampleSize: number;
  isCurrent: boolean;
  generatedAt: string;
  params: CalibrationParams;
};

export type PipelineRunSummary = {
  id: string;
  responseId: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  totalLatencyMs: number | null;
  totalCostUsd: number | null;
  errorMessage: string | null;
};

export type GoldenTestRunSummary = {
  id: string;
  ranAt: string;
  passed: boolean;
  mad: number;
  rangeComplianceRate: number;
  extremeMissCount: number;
};

export interface DataProvider {
  listProfiles(filters?: ProfileFilters): Promise<ProfileSummary[]>;
  getProfile(responseId: string): Promise<ResponderProfile | null>;
  getCurrentCalibration(): Promise<CalibrationSnapshotSummary | null>;
  getCalibrationHistory(): Promise<CalibrationSnapshotSummary[]>;
  getPipelineRuns(filters?: TimeRangeFilter): Promise<PipelineRunSummary[]>;
  getGoldenTestRuns(filters?: TimeRangeFilter): Promise<GoldenTestRunSummary[]>;
}
