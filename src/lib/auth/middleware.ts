import { NextResponse } from "next/server";
import { loadSession, type SessionPayload } from "./session.ts";

export async function requireAuth(): Promise<SessionPayload | NextResponse> {
  const session = await loadSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  return session;
}

export async function requireAdmin(): Promise<SessionPayload | NextResponse> {
  const session = await loadSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  return session;
}

export function isErrorResponse(value: SessionPayload | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
