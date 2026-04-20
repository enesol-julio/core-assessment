import { NextResponse } from "next/server";
import { z } from "zod";
import { isErrorResponse, requireAdmin } from "@/lib/auth/middleware";
import { runPipeline } from "@/services/pipeline/pipeline";

const BodySchema = z.object({ response_id: z.string().uuid() });

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    const result = await runPipeline(parsed.data.response_id, "submission");
    return NextResponse.json(
      {
        ok: true,
        response_id: result.response_id,
        profile_id: result.profile.profile_id,
        profile_version: result.profile.profile_version,
        total_latency_ms: result.total_latency_ms,
      },
      { status: 202 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Pipeline error" },
      { status: 500 },
    );
  }
}
