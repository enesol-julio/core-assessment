#!/usr/bin/env node
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}

const checks = [];
function check(label, ok, detail = "") {
  checks.push({ label, ok, detail });
}

const { db, getPool } = await import("../../src/db/index.ts");
const { allowedDomains, goldenTestResponses, pilotFeedback, users } = await import(
  "../../src/db/schema.ts"
);
const { eq } = await import("drizzle-orm");

try {
  // Env keys
  const requiredEnv = ["DATABASE_URL", "JWT_SECRET", "SEED_ADMIN_EMAIL", "SEED_DOMAINS"];
  for (const key of requiredEnv) {
    const val = process.env[key];
    check(`env:${key}`, !!val && !val.startsWith("REPLACE_WITH_"), val ? "set" : "missing");
  }

  // Production-safety check
  if (process.env.NODE_ENV === "production") {
    check("AUTH_BYPASS disabled in production", process.env.AUTH_BYPASS !== "true", "AUTH_BYPASS=true is not allowed in production");
  } else {
    check("NODE_ENV=development", true, process.env.NODE_ENV ?? "");
  }

  // API keys for real pipeline
  const anthropic = process.env.ANTHROPIC_API_KEY;
  const hasRealAnthropic = !!anthropic && !anthropic.startsWith("sk-ant-REPLACE");
  check(
    "Anthropic API key configured",
    hasRealAnthropic,
    hasRealAnthropic ? "present" : "using fixture provider",
  );

  const hasGraph = ["AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET"].every(
    (k) => process.env[k] && !process.env[k].startsWith("REPLACE_WITH_"),
  );
  check("Microsoft Graph (OTP email)", hasGraph, hasGraph ? "configured" : "dev console fallback");

  // Database
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "julio@datacracy.co").toLowerCase();
  const adminRows = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  check(
    `Admin user ${adminEmail}`,
    adminRows.length === 1 && adminRows[0].role === "admin",
    adminRows.length === 1 ? `id=${adminRows[0].id}` : "not seeded",
  );

  const domainRows = await db.select().from(allowedDomains);
  const expected = (process.env.SEED_DOMAINS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const actualSet = new Set(domainRows.map((d) => d.domain));
  const missing = expected.filter((d) => !actualSet.has(d));
  check(
    `Allowed domains (${expected.length})`,
    missing.length === 0 && domainRows.length >= 1,
    missing.length === 0 ? domainRows.map((d) => d.domain).join(", ") : `missing: ${missing.join(", ")}`,
  );

  // Content validation
  try {
    const { loadAssessment } = await import("../../src/lib/content/index.ts");
    const en = await loadAssessment("en");
    const es = await loadAssessment("es");
    check("Content loads (EN)", en.sections.length === 5, `${en.sections.length} sections`);
    check("Content loads (ES)", es.sections.length === 5, `${es.sections.length} sections`);
    const totalQuestions = en.sections.reduce((acc, s) => acc + s.file.questions.length, 0);
    check("Question bank = 70", totalQuestions === 70, `${totalQuestions} questions`);
  } catch (err) {
    check("Content loads", false, err instanceof Error ? err.message : String(err));
  }

  // Pipeline provider detection
  const { detectProvider } = await import("../../src/services/pipeline/providers/index.ts");
  const provider = detectProvider();
  check("Pipeline provider", true, provider);

  // Golden tests seeded
  const goldenRows = await db.select().from(goldenTestResponses);
  check("Golden test responses seeded", goldenRows.length > 0, `${goldenRows.length} responses`);

  // Pilot feedback table accessible
  await db.select().from(pilotFeedback).limit(1);
  check("pilot_feedback table reachable", true, "ok");

  // Summary
  console.log("\nCORE pilot readiness:\n");
  const widths = checks.map((c) => c.label.length);
  const pad = Math.max(...widths) + 2;
  let failCount = 0;
  for (const c of checks) {
    const mark = c.ok ? "✓" : "✗";
    if (!c.ok) failCount += 1;
    console.log(`  ${mark} ${c.label.padEnd(pad)} ${c.detail}`);
  }
  console.log(`\n${checks.length - failCount}/${checks.length} checks passed.`);
  process.exit(failCount === 0 ? 0 : 1);
} finally {
  await getPool().end();
}
