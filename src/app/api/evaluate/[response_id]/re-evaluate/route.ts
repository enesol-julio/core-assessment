import { NextResponse } from "next/server";
import { isErrorResponse, requireAdmin } from "@/lib/auth/middleware";
import { runPipeline } from "@/services/pipeline/pipeline";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ response_id: string }> },
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  const { response_id } = await params;
  try {
    const result = await runPipeline(response_id, "re-evaluation");
    return NextResponse.json({
      ok: true,
      response_id: result.response_id,
      profile_id: result.profile.profile_id,
      profile_version: result.profile.profile_version,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "re-evaluation failed" },
      { status: 500 },
    );
  }
}
