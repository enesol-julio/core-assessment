import Link from "next/link";
import { getDataProvider } from "@/services/dashboard/providers/postgres-provider";
import {
  computeGoldenTestStatus,
  computePipelineHealth,
} from "@/services/dashboard/transforms/operations";
import SummaryCards from "@/components/dashboard/SummaryCards";

export const dynamic = "force-dynamic";

function successRateTone(rate: number): "good" | "warn" | "bad" {
  if (rate >= 0.95) return "good";
  if (rate >= 0.9) return "warn";
  return "bad";
}

function latencyTone(ms: number): "good" | "warn" | "bad" {
  if (ms <= 15_000) return "good";
  if (ms <= 25_000) return "warn";
  return "bad";
}

export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<{ windowHours?: string }>;
}) {
  const params = await searchParams;
  const windowHours = Math.max(1, Number(params.windowHours ?? 168));
  const provider = getDataProvider();
  const [pipelineRunsList, goldenRunsList] = await Promise.all([
    provider.getPipelineRuns({ windowHours }),
    provider.getGoldenTestRuns({}),
  ]);
  const health = computePipelineHealth(pipelineRunsList, windowHours);
  const golden = computeGoldenTestStatus(goldenRunsList);

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">CORE · Operations</h1>
            <p className="text-sm text-zinc-500">
              Window: last {windowHours}h · pipeline runs: {health.totalRuns}
            </p>
          </div>
          <nav className="flex gap-3 text-sm">
            <Link href="/dashboard" className="text-zinc-700 underline-offset-4 hover:underline">
              Manager view
            </Link>
          </nav>
        </header>

        <SummaryCards
          cards={[
            { label: "Pipeline runs", value: String(health.totalRuns), tone: "neutral" },
            {
              label: "Success rate",
              value:
                health.totalRuns === 0 ? "—" : `${(health.successRate * 100).toFixed(1)}%`,
              tone: health.totalRuns === 0 ? "neutral" : successRateTone(health.successRate),
              sublabel: `${health.successCount}/${health.totalRuns}`,
            },
            {
              label: "Avg latency",
              value:
                health.totalRuns === 0 ? "—" : `${(health.avgLatencyMs / 1000).toFixed(1)}s`,
              tone: health.totalRuns === 0 ? "neutral" : latencyTone(health.avgLatencyMs),
              sublabel:
                health.totalRuns === 0
                  ? ""
                  : `p95 ${(health.p95LatencyMs / 1000).toFixed(1)}s`,
            },
            {
              label: "Avg cost",
              value: health.totalRuns === 0 ? "—" : `$${health.avgCostUsd.toFixed(3)}`,
              tone: "neutral",
            },
          ]}
        />

        <section className="rounded border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">Golden test status</h2>
          {golden.latestRun ? (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`rounded px-3 py-1 text-sm font-medium ${
                    golden.latestRun.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {golden.latestRun.passed ? "PASS" : "FAIL"}
                </span>
                <span className="font-mono text-sm text-zinc-700">
                  MAD {golden.latestRun.mad.toFixed(3)}
                </span>
                <span className="font-mono text-sm text-zinc-700">
                  range {(golden.latestRun.rangeComplianceRate * 100).toFixed(0)}%
                </span>
                <span className="font-mono text-sm text-zinc-700">
                  extreme {golden.latestRun.extremeMissCount}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {golden.driftAlert ? (
                  <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">
                    drift alert
                  </span>
                ) : null}
                {golden.consecutiveFailures > 1 ? (
                  <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-800">
                    {golden.consecutiveFailures} consecutive failures
                  </span>
                ) : null}
                <span className="text-xs text-zinc-500">
                  last run {new Date(golden.latestRun.ranAt).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No golden test runs yet.</p>
          )}
          {golden.madTrend.length > 0 ? (
            <div className="mt-4">
              <div className="mb-1 text-xs uppercase text-zinc-500">MAD trend (last {golden.madTrend.length} runs)</div>
              <div className="flex items-end gap-1" style={{ height: 60 }}>
                {golden.madTrend.slice().reverse().map((m, i) => {
                  const pct = Math.min(100, (m / 1) * 100);
                  return (
                    <div
                      key={i}
                      className="w-4 rounded bg-zinc-900 opacity-80"
                      style={{ height: `${Math.max(2, pct)}%` }}
                      title={`MAD ${m.toFixed(3)}`}
                    />
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-zinc-500">threshold: 0.5</p>
            </div>
          ) : null}
        </section>

        <section className="rounded border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">Recent errors</h2>
          {health.recentErrors.length === 0 ? (
            <p className="text-sm text-zinc-500">No errors in the window.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {health.recentErrors.map((e) => (
                <li key={e.runId} className="rounded border border-red-100 bg-red-50 p-3">
                  <div className="font-mono text-xs text-red-700">
                    {e.startedAt} · response {e.responseId.slice(0, 8)}
                  </div>
                  <div className="mt-1 text-red-900">{e.errorMessage ?? "(unknown)"}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
