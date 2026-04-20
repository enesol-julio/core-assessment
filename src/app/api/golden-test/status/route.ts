import { NextResponse } from "next/server";
import { isErrorResponse, requireAdmin } from "@/lib/auth/middleware";
import { goldenStatus } from "@/services/pipeline/golden-test/runner";

export async function GET() {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  const status = await goldenStatus();
  return NextResponse.json({
    latest: status.latest
      ? {
          id: status.latest.id,
          ran_at: status.latest.ranAt.toISOString(),
          passed: status.latest.passed,
          mad: Number(status.latest.mad),
          range_compliance_rate: Number(status.latest.rangeComplianceRate),
          extreme_miss_count: status.latest.extremeMissCount,
        }
      : null,
    mad_trend: status.mad_trend,
    drift_alert: status.drift_alert,
    consecutive_failures: status.consecutive_failures,
  });
}
