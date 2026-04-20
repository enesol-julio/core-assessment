import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}
delete process.env.AUTH_BYPASS;

const { createSession, verifyJwt, findOrCreateUser, revokeSession } = await import(
  "../../src/lib/auth/session.ts"
);
const { getPool, db } = await import("../../src/db/index.ts");
const { users, sessions } = await import("../../src/db/schema.ts");
const { eq } = await import("drizzle-orm");

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("PASS:", msg);
}

const adminEmail = "julio@datacracy.co";
const adminRows = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
const testTakerEmail = `gate-tt-${Date.now()}@enesol.ai`;
const tt = await findOrCreateUser(testTakerEmail);

try {
  // admin gets admin role
  assert(adminRows[0].role === "admin", "julio@datacracy.co is admin after seed");

  // anonymous: no cookie -> verifyJwt on undefined returns null
  assert((await verifyJwt("")) === null, "verifyJwt on empty string -> null");
  assert((await verifyJwt("not.a.jwt")) === null, "verifyJwt on garbage -> null");

  // create a valid test-taker session
  const ttSess = await createSession(tt, "en");
  const ttPayload = await verifyJwt(ttSess.token);
  assert(ttPayload !== null, "test-taker JWT verifies");
  assert(ttPayload.role === "test_taker", "test-taker role = test_taker in JWT");

  // admin session
  const adminSess = await createSession(adminRows[0], "en");
  const adminPayload = await verifyJwt(adminSess.token);
  assert(adminPayload !== null, "admin JWT verifies");
  assert(adminPayload.role === "admin", "admin role = admin in JWT");

  // tamper the token: flip a char in payload segment
  const parts = ttSess.token.split(".");
  const bad = `${parts[0]}.${parts[1].replace(/./, (c) => (c === "a" ? "b" : "a"))}.${parts[2]}`;
  assert((await verifyJwt(bad)) === null, "tampered JWT rejected");

  // cleanup
  await revokeSession(ttPayload.session_id);
  await revokeSession(adminPayload.session_id);
  await db.delete(sessions).where(eq(sessions.userId, tt.id));
  await db.delete(users).where(eq(users.email, testTakerEmail));

  console.log("\nALL AUTH-GATE SMOKE TESTS PASSED");
} finally {
  await getPool().end();
}
