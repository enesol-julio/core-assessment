import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db/index.ts";
import { sessions, users, type User } from "@/db/schema.ts";
import {
  authBypassEmail,
  authBypassEnabled,
  authBypassRole,
  domainOfEmail,
  jwtSecretKey,
  normalizeEmail,
  SESSION_COOKIE_NAME,
  SESSION_EXPIRY_HOURS,
} from "./config.ts";

export type SessionRole = "admin" | "test_taker";

export type SessionPayload = {
  session_id: string;
  user_id: string;
  email: string;
  role: SessionRole;
  organization: string;
  language: "en" | "es";
};

async function signSession(payload: SessionPayload, expiresAt: Date): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.user_id)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(jwtSecretKey());
}

export async function verifyJwt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecretKey());
    if (!payload.session_id || !payload.user_id || !payload.email || !payload.role) {
      return null;
    }
    return {
      session_id: String(payload.session_id),
      user_id: String(payload.user_id),
      email: String(payload.email),
      role: payload.role === "admin" ? "admin" : "test_taker",
      organization: String(payload.organization ?? ""),
      language: payload.language === "es" ? "es" : "en",
    };
  } catch {
    return null;
  }
}

export async function findOrCreateUser(
  email: string,
  opts: { name?: string; role?: string } = {},
): Promise<User> {
  const normalized = normalizeEmail(email);
  const existing = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  if (existing.length > 0) return existing[0];
  const organization = domainOfEmail(normalized);
  const inserted = await db
    .insert(users)
    .values({
      email: normalized,
      name: opts.name?.trim() || normalized.split("@")[0],
      organization,
      role: "test_taker",
    })
    .returning();
  return inserted[0];
}

export async function createSession(
  user: User,
  language: "en" | "es",
): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 3600 * 1000);
  const sessionId = randomUUID();
  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    expiresAt,
  });
  const payload: SessionPayload = {
    session_id: sessionId,
    user_id: user.id,
    email: user.email,
    role: user.role === "admin" ? "admin" : "test_taker",
    organization: user.organization,
    language,
  };
  const token = await signSession(payload, expiresAt);
  return { token, expiresAt };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function loadSession(): Promise<SessionPayload | null> {
  if (authBypassEnabled()) {
    const email = authBypassEmail();
    const user = await findOrCreateUser(email);
    if (authBypassRole() === "admin" && user.role !== "admin") {
      const updated = await db
        .update(users)
        .set({ role: "admin" })
        .where(eq(users.id, user.id))
        .returning();
      return {
        session_id: "dev-bypass",
        user_id: updated[0].id,
        email: updated[0].email,
        role: "admin",
        organization: updated[0].organization,
        language: "en",
      };
    }
    return {
      session_id: "dev-bypass",
      user_id: user.id,
      email: user.email,
      role: user.role === "admin" ? "admin" : "test_taker",
      organization: user.organization,
      language: "en",
    };
  }

  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!cookie) return null;
  const payload = await verifyJwt(cookie.value);
  if (!payload || payload.session_id === "dev-bypass") return null;

  const now = new Date();
  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, payload.session_id), gt(sessions.expiresAt, now)))
    .limit(1);
  if (rows.length === 0) return null;
  return payload;
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
