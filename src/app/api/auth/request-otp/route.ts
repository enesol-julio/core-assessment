import { NextResponse } from "next/server";
import { z } from "zod";
import { getEmailSender } from "@/lib/auth/email.ts";
import { isDomainAllowed, issueOtp } from "@/lib/auth/otp.ts";
import { normalizeEmail } from "@/lib/auth/config.ts";

const BodySchema = z.object({
  email: z.string().email(),
  language: z.enum(["en", "es"]).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const language = parsed.data.language ?? "en";

  if (!(await isDomainAllowed(email))) {
    return NextResponse.json(
      { error: "Email domain is not permitted to sign in to CORE." },
      { status: 403 },
    );
  }

  const { code, expiresAt } = await issueOtp(email);
  try {
    await getEmailSender().sendOtp({ to: email, code, expiresAt, language });
  } catch (err) {
    console.error("[request-otp] email send failed:", err);
    return NextResponse.json(
      { error: "Failed to deliver verification email. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, expires_at: expiresAt.toISOString() });
}
