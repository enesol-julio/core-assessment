import { NextResponse } from "next/server";
import { isErrorResponse, requireAdmin } from "@/lib/auth/middleware";
import { getDataProvider } from "@/services/dashboard/providers/postgres-provider";
import { computeGoldenTestStatus } from "@/services/dashboard/transforms/operations";

export async function GET() {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  const runs = await getDataProvider().getGoldenTestRuns({});
  return NextResponse.json(computeGoldenTestStatus(runs));
}
