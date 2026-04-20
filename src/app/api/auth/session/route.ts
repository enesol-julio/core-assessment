import { NextResponse } from "next/server";
import { loadSession } from "@/lib/auth/session.ts";

export async function GET() {
  const session = await loadSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.user_id,
      email: session.email,
      role: session.role,
      organization: session.organization,
    },
    language: session.language,
  });
}
