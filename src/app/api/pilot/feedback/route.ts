import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { loadSession } from "@/lib/auth/session";
import { db } from "@/db/index";
import { pilotFeedback, responses } from "@/db/schema";

const BodySchema = z.object({
  response_id: z.string().uuid(),
  overall_rating: z.number().int().min(1).max(5),
  clarity_rating: z.number().int().min(1).max(5),
  difficulty_rating: z.number().int().min(1).max(5),
  fairness_rating: z.number().int().min(1).max(5),
  timing_comments: z.string().max(2000).optional(),
  question_comments: z.string().max(2000).optional(),
  ux_issues: z.string().max(2000).optional(),
  additional_notes: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const session = await loadSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Verify the response belongs to the session user (or user is admin).
  const resp = await db.select().from(responses).where(eq(responses.id, parsed.data.response_id)).limit(1);
  if (resp.length === 0) {
    return NextResponse.json({ error: "Response not found" }, { status: 404 });
  }
  if (session.role !== "admin" && resp[0].userId !== session.user_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await db.insert(pilotFeedback).values({
      responseId: parsed.data.response_id,
      userId: resp[0].userId,
      overallRating: parsed.data.overall_rating,
      clarityRating: parsed.data.clarity_rating,
      difficultyRating: parsed.data.difficulty_rating,
      fairnessRating: parsed.data.fairness_rating,
      timingComments: parsed.data.timing_comments ?? null,
      questionComments: parsed.data.question_comments ?? null,
      uxIssues: parsed.data.ux_issues ?? null,
      additionalNotes: parsed.data.additional_notes ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("unique")) {
      return NextResponse.json({ error: "Feedback already submitted for this response" }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
