import { randomInt } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db/index.ts";
import { allowedDomains, otpTokens } from "@/db/schema.ts";
import { domainOfEmail, normalizeEmail, OTP_EXPIRY_MINUTES } from "./config.ts";

export type OtpIssueResult = { code: string; expiresAt: Date };

export function generateOtpCode(): string {
  const n = randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

export async function isDomainAllowed(email: string): Promise<boolean> {
  const domain = domainOfEmail(normalizeEmail(email));
  const rows = await db
    .select({ id: allowedDomains.id })
    .from(allowedDomains)
    .where(eq(allowedDomains.domain, domain))
    .limit(1);
  return rows.length > 0;
}

export async function issueOtp(email: string): Promise<OtpIssueResult> {
  const normalized = normalizeEmail(email);
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60_000);
  await db.insert(otpTokens).values({
    email: normalized,
    code,
    expiresAt,
    used: false,
  });
  return { code, expiresAt };
}

export async function consumeOtp(email: string, code: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const now = new Date();
  const candidates = await db
    .select()
    .from(otpTokens)
    .where(
      and(
        eq(otpTokens.email, normalized),
        eq(otpTokens.code, code),
        eq(otpTokens.used, false),
        gt(otpTokens.expiresAt, now),
      ),
    )
    .limit(1);
  if (candidates.length === 0) return false;
  await db
    .update(otpTokens)
    .set({ used: true })
    .where(eq(otpTokens.id, candidates[0].id));
  return true;
}
