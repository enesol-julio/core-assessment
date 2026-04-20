import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}

const {
  validateDomain,
  normalizeDomain,
  addDomain,
  listDomains,
  removeDomain,
} = await import("../../src/lib/auth/domains.ts");
const { db, getPool } = await import("../../src/db/index.ts");
const { allowedDomains } = await import("../../src/db/schema.ts");
const { eq } = await import("drizzle-orm");

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("PASS:", msg);
}

try {
  assert(validateDomain("enesol.ai").ok, "enesol.ai valid");
  assert(validateDomain("   EnEsol.AI  ").ok, "whitespace + case normalized");
  assert(normalizeDomain("@enesol.ai") === "enesol.ai", "leading @ stripped");
  assert(!validateDomain("@enesol.ai").ok === false, "validateDomain accepts @-prefixed via normalization");
  assert(!validateDomain("not a domain").ok, "whitespace rejected");
  assert(!validateDomain("no-tld").ok, "no-tld rejected");
  assert(!validateDomain("bad@domain.com").ok, "@ embedded rejected");

  const existing = await listDomains();
  const test = `pilot-${Date.now()}.example.com`;
  await addDomain(test, "smoke@test.local");
  const after = await listDomains();
  assert(after.length === existing.length + 1, "addDomain inserted row");

  const dup = await addDomain(test, "smoke@test.local");
  const after2 = await listDomains();
  assert(after2.length === after.length, "addDomain is idempotent (no dup)");
  assert(dup.domain === test, "addDomain returns row on duplicate");

  const removeResult = await removeDomain(test);
  assert(removeResult.removed, "removeDomain succeeds");

  const afterDel = await listDomains();
  assert(afterDel.length === existing.length, "removeDomain deleted row");

  // safety guard: cannot remove last domain
  const all = await listDomains();
  // simulate: delete all but one, then try to remove the last one
  for (const d of all.slice(1)) {
    await db.delete(allowedDomains).where(eq(allowedDomains.domain, d.domain));
  }
  const lastOne = (await listDomains())[0];
  const guard = await removeDomain(lastOne.domain);
  assert(!guard.removed && guard.reason?.includes("last"), "cannot remove last domain");

  // restore seed domains
  for (const d of all.slice(1)) {
    await db
      .insert(allowedDomains)
      .values({ domain: d.domain, addedBy: d.addedBy })
      .onConflictDoNothing({ target: allowedDomains.domain });
  }

  console.log("\nALL DOMAIN SMOKE TESTS PASSED");
} finally {
  await getPool().end();
}
