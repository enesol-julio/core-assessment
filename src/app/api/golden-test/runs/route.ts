import { NextResponse } from "next/server";
import { isErrorResponse, requireAdmin } from "@/lib/auth/middleware";
import { listGoldenRuns } from "@/services/pipeline/golden-test/runner";

export async function GET() {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  const runs = await listGoldenRuns(25);
  return NextResponse.json({
    runs: runs.map((r) => ({
      id: r.id,
      ran_at: r.ranAt.toISOString(),
      passed: r.passed,
      mad: Number(r.mad),
      range_compliance_rate: Number(r.rangeComplianceRate),
      extreme_miss_count: r.extremeMissCount,
    })),
  });
}
