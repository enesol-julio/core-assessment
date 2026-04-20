import { NextResponse } from "next/server";
import { isErrorResponse, requireAdmin } from "@/lib/auth/middleware";
import { runGoldenTests } from "@/services/pipeline/golden-test/runner";
import { seedGoldenTestResponses } from "@/services/pipeline/golden-test/seed";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  const url = new URL(req.url);
  if (url.searchParams.get("seed") === "true") {
    await seedGoldenTestResponses();
  }
  const result = await runGoldenTests();
  return NextResponse.json(result);
}
