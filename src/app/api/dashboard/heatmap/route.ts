import { NextResponse } from "next/server";
import { isErrorResponse, requireAdmin } from "@/lib/auth/middleware";
import { getDataProvider } from "@/services/dashboard/providers/postgres-provider";
import { computeSectionHeatmap } from "@/services/dashboard/transforms/heatmap";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  const url = new URL(req.url);
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
  const filters = {
    organization: url.searchParams.get("organization") ?? undefined,
  };
  const summaries = await getDataProvider().listProfiles(filters);
  const heatmap = computeSectionHeatmap(summaries);
  heatmap.individuals = heatmap.individuals.slice(0, limit);
  const allowed = new Set(heatmap.individuals.map((i) => i.responseId));
  heatmap.cells = heatmap.cells.filter((c) => allowed.has(c.responseId));
  return NextResponse.json(heatmap);
}
