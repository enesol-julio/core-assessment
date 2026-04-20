import type { GoldenTestRunSummary, PipelineRunSummary } from "../interfaces/data-provider.ts";

export type PipelineHealth = {
  windowHours: number;
  totalRuns: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  avgCostUsd: number;
  recentErrors: Array<{
    runId: string;
    responseId: string;
    startedAt: string | null;
    errorMessage: string | null;
  }>;
};

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export function computePipelineHealth(
  runs: readonly PipelineRunSummary[],
  windowHours = 168,
): PipelineHealth {
  const successCount = runs.filter((r) => r.status === "complete").length;
  const errorCount = runs.filter((r) => r.status === "error").length;
  const totalRuns = runs.length;
  const latencies = runs
    .map((r) => r.totalLatencyMs)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  const costs = runs.map((r) => r.totalCostUsd ?? 0);
  const errorRows = runs
    .filter((r) => r.status === "error")
    .slice(0, 10)
    .map((r) => ({
      runId: r.id,
      responseId: r.responseId,
      startedAt: r.startedAt,
      errorMessage: r.errorMessage,
    }));
  return {
    windowHours,
    totalRuns,
    successCount,
    errorCount,
    successRate: totalRuns === 0 ? 0 : successCount / totalRuns,
    avgLatencyMs:
      latencies.length === 0 ? 0 : latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p95LatencyMs: percentile(latencies, 95),
    avgCostUsd: costs.length === 0 ? 0 : costs.reduce((a, b) => a + b, 0) / costs.length,
    recentErrors: errorRows,
  };
}

export type GoldenTestStatus = {
  latestRun: GoldenTestRunSummary | null;
  madTrend: number[];
  driftAlert: boolean;
  consecutiveFailures: number;
};

export function computeGoldenTestStatus(runs: readonly GoldenTestRunSummary[]): GoldenTestStatus {
  if (runs.length === 0) {
    return { latestRun: null, madTrend: [], driftAlert: false, consecutiveFailures: 0 };
  }
  const sorted = [...runs].sort(
    (a, b) => new Date(b.ranAt).getTime() - new Date(a.ranAt).getTime(),
  );
  const trend = sorted.slice(0, 10).map((r) => r.mad);
  const latest = sorted[0];
  const trailing = trend.slice(1);
  const trailingAvg =
    trailing.length === 0 ? latest.mad : trailing.reduce((a, b) => a + b, 0) / trailing.length;
  const driftAlert = latest.mad > trailingAvg + 0.15;
  let consecutive = 0;
  for (const r of sorted) {
    if (!r.passed) consecutive += 1;
    else break;
  }
  return { latestRun: latest, madTrend: trend, driftAlert, consecutiveFailures: consecutive };
}
