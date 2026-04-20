import { NextResponse } from "next/server";
import { loadSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { db } from "@/db/index";
import { users } from "@/db/schema";
import { AssessmentSubmitSchema } from "@/lib/types/assessment-submit";
import { submitAssessment, SubmitValidationError } from "@/services/assessment/submit";

export async function POST(req: Request) {
  const session = await loadSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = AssessmentSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid submission", issues: parsed.error.issues.slice(0, 20) },
      { status: 400 },
    );
  }

  const userRows = await db.select().from(users).where(eq(users.id, session.user_id)).limit(1);
  if (userRows.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }
  const u = userRows[0];

  try {
    const result = await submitAssessment(parsed.data, {
      user_id: u.id,
      name: u.name,
      email: u.email,
      organization: u.organization,
      role: u.role,
    });
    return NextResponse.json({ ok: true, response_id: result.response_id }, { status: 201 });
  } catch (err) {
    if (err instanceof SubmitValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[assess/submit]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
