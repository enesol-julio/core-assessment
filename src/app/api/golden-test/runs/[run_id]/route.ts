import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isErrorResponse, requireAdmin } from "@/lib/auth/middleware";
import { db } from "@/db/index";
import { goldenTestRuns } from "@/db/schema";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ run_id: string }> },
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  const { run_id } = await params;
  const rows = await db.select().from(goldenTestRuns).where(eq(goldenTestRuns.id, run_id)).limit(1);
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const r = rows[0];
  return NextResponse.json({
    id: r.id,
    ran_at: r.ranAt.toISOString(),
    passed: r.passed,
    mad: Number(r.mad),
    range_compliance_rate: Number(r.rangeComplianceRate),
    extreme_miss_count: r.extremeMissCount,
    details: r.results,
  });
}
