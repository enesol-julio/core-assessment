import { NextResponse } from "next/server";
import { z } from "zod";
import { isErrorResponse, requireAdmin } from "@/lib/auth/middleware";
import { runBatchRescore } from "@/services/pipeline/calibration/batch-rescore";

const BodySchema = z.object({
  scope: z.union([z.literal("all"), z.object({ response_ids: z.array(z.string().uuid()) })]).optional(),
  concurrency: z.number().int().positive().max(10).optional(),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const result = await runBatchRescore(parsed.data);
  return NextResponse.json(result);
}
