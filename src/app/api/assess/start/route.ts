import { NextResponse } from "next/server";
import { z } from "zod";
import { loadSession } from "@/lib/auth/session";
import { startAssessment } from "@/services/assessment/start";
import { LanguageSchema } from "@/lib/types/assessment-response";

const BodySchema = z.object({ language: LanguageSchema.optional() });

export async function POST(req: Request) {
  const session = await loadSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = BodySchema.safeParse(body);
  const language = parsed.success ? parsed.data.language ?? session.language : session.language;

  const structure = await startAssessment(language);
  return NextResponse.json(structure);
}
