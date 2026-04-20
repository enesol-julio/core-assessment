import { NextResponse } from "next/server";
import { clearSessionCookie, loadSession, revokeSession } from "@/lib/auth/session.ts";

export async function POST() {
  const session = await loadSession();
  if (session && session.session_id !== "dev-bypass") {
    await revokeSession(session.session_id);
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
