import { NextResponse } from "next/server";
import { isErrorResponse, requireAdmin } from "@/lib/auth/middleware";
import { pipelineStatus } from "@/services/pipeline/pipeline";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ response_id: string }> },
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  const { response_id } = await params;
  const status = await pipelineStatus(response_id);
  return NextResponse.json(status);
}
