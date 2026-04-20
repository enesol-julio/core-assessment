import { NextResponse } from "next/server";
import { isErrorResponse, requireAdmin } from "@/lib/auth/middleware";
import { getDataProvider } from "@/services/dashboard/providers/postgres-provider";
import { computeRanking } from "@/services/dashboard/transforms/ranking";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const url = new URL(req.url);
  const organization = url.searchParams.get("organization") ?? undefined;
  const after = url.searchParams.get("after") ?? undefined;
  const before = url.searchParams.get("before") ?? undefined;
  const classification = url.searchParams.get("classification") ?? undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 25)));

  const summaries = await getDataProvider().listProfiles({
    organization,
    after,
    before,
    classification,
  });
  const ranked = computeRanking(summaries);
  const total = ranked.length;
  const start = (page - 1) * pageSize;
  return NextResponse.json({
    total,
    page,
    pageSize,
    results: ranked.slice(start, start + pageSize),
  });
}
