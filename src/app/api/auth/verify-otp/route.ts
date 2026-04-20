import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeEmail } from "@/lib/auth/config.ts";
import { isDomainAllowed, consumeOtp } from "@/lib/auth/otp.ts";
import {
  createSession,
  findOrCreateUser,
  setSessionCookie,
} from "@/lib/auth/session.ts";

const BodySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  name: z.string().min(1).max(200).optional(),
  role: z.string().min(1).max(200).optional(),
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

  const ok = await consumeOtp(email, parsed.data.code);
  if (!ok) {
    return NextResponse.json(
      { error: "The code is invalid, expired, or already used." },
      { status: 401 },
    );
  }

  const user = await findOrCreateUser(email, {
    name: parsed.data.name,
    role: parsed.data.role,
  });
  const { token, expiresAt } = await createSession(user, language);
  await setSessionCookie(token, expiresAt);

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      organization: user.organization,
      role: user.role,
    },
    expires_at: expiresAt.toISOString(),
  });
}
