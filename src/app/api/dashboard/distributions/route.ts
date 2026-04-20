import { NextResponse } from "next/server";
import { isErrorResponse, requireAdmin } from "@/lib/auth/middleware";
import { getDataProvider } from "@/services/dashboard/providers/postgres-provider";
import {
  computeClassificationDistribution,
  computeFitnessDistribution,
  computeScoreHistogram,
  computeSectionDistributions,
} from "@/services/dashboard/transforms/distributions";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  const url = new URL(req.url);
  const filters = {
    organization: url.searchParams.get("organization") ?? undefined,
    after: url.searchParams.get("after") ?? undefined,
    before: url.searchParams.get("before") ?? undefined,
    classification: url.searchParams.get("classification") ?? undefined,
  };
  const summaries = await getDataProvider().listProfiles(filters);
  return NextResponse.json({
    fitness: computeFitnessDistribution(summaries),
    classification: computeClassificationDistribution(summaries),
    compositeHistogram: computeScoreHistogram(summaries, 5),
    sectionDistributions: computeSectionDistributions(summaries),
    sample_size: summaries.length,
  });
}
