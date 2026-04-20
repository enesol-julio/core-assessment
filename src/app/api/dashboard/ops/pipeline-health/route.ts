import { NextResponse } from "next/server";
import { isErrorResponse, requireAdmin } from "@/lib/auth/middleware";
import { getDataProvider } from "@/services/dashboard/providers/postgres-provider";
import { computePipelineHealth } from "@/services/dashboard/transforms/operations";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  const url = new URL(req.url);
  const windowHours = Math.max(1, Number(url.searchParams.get("windowHours") ?? 168));
  const runs = await getDataProvider().getPipelineRuns({ windowHours });
  return NextResponse.json(computePipelineHealth(runs, windowHours));
}
