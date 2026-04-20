import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

// Load .env.local manually so this can run outside of Next.js
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}
// Disable AUTH_BYPASS so we exercise the real OTP path.
delete process.env.AUTH_BYPASS;

const { generateOtpCode, isDomainAllowed, issueOtp, consumeOtp } = await import(
  "../../src/lib/auth/otp.ts"
);
const { findOrCreateUser, createSession, verifyJwt, revokeSession } = await import(
  "../../src/lib/auth/session.ts"
);
const { db } = await import("../../src/db/index.ts");
const { users, sessions, otpTokens } = await import("../../src/db/schema.ts");
const { eq } = await import("drizzle-orm");
const { getPool } = await import("../../src/db/index.ts");

const testEmail = `smoke-${randomUUID().slice(0, 8)}@enesol.ai`;
const badDomainEmail = `nobody@gmail.com`;

async function cleanup() {
  await db.delete(sessions).where(eq(sessions.userId, (await db.select().from(users).where(eq(users.email, testEmail)).limit(1))[0]?.id ?? "00000000-0000-0000-0000-000000000000")).catch(() => {});
  await db.delete(otpTokens).where(eq(otpTokens.email, testEmail));
  await db.delete(users).where(eq(users.email, testEmail));
}

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("PASS:", msg);
}

try {
  assert(/^\d{6}$/.test(generateOtpCode()), "OTP code is 6 digits");

  assert(await isDomainAllowed(testEmail), "enesol.ai is allowlisted");
  assert(!(await isDomainAllowed(badDomainEmail)), "gmail.com is rejected");

  const { code, expiresAt } = await issueOtp(testEmail);
  assert(/^\d{6}$/.test(code), "issueOtp returns 6-digit code");
  assert(expiresAt.getTime() > Date.now(), "OTP expiresAt is in future");

  assert(!(await consumeOtp(testEmail, "000000")), "wrong code rejected");
  assert(await consumeOtp(testEmail, code), "correct code accepted");
  assert(!(await consumeOtp(testEmail, code)), "reused code rejected (single-use)");

  // Expired OTP
  const old = await issueOtp(testEmail);
  await db
    .update(otpTokens)
    .set({ expiresAt: new Date(Date.now() - 60_000) })
    .where(eq(otpTokens.code, old.code));
  assert(!(await consumeOtp(testEmail, old.code)), "expired code rejected");

  const user = await findOrCreateUser(testEmail, { name: "Smoke User" });
  assert(user.email === testEmail, "findOrCreateUser created user");
  const user2 = await findOrCreateUser(testEmail);
  assert(user2.id === user.id, "findOrCreateUser idempotent");
  assert(user.role === "test_taker", "new user defaults to test_taker");

  const { token, expiresAt: sessExp } = await createSession(user, "en");
  const decoded = await verifyJwt(token);
  assert(decoded !== null, "JWT verifies");
  assert(decoded.email === testEmail, "JWT encodes email");
  assert(decoded.role === "test_taker", "JWT encodes role");
  assert(decoded.organization === "enesol.ai", "JWT encodes organization");
  assert(sessExp.getTime() > Date.now() + 3 * 3600 * 1000, "session expires in ~4 hours");

  await revokeSession(decoded.session_id);
  const sessRows = await db.select().from(sessions).where(eq(sessions.id, decoded.session_id));
  assert(sessRows.length === 0, "revokeSession deletes row");

  console.log("\nALL OTP SMOKE TESTS PASSED");
} finally {
  await cleanup();
  await getPool().end();
}
