#!/usr/bin/env node
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}

const { seedGoldenTestResponses, goldenSeedCount } = await import(
  "../../src/services/pipeline/golden-test/seed.ts"
);
const { getPool } = await import("../../src/db/index.ts");

try {
  const existing = await goldenSeedCount();
  if (existing > 0) {
    console.log(`Golden test responses already seeded (${existing}).`);
    process.exit(0);
  }
  const inserted = await seedGoldenTestResponses(20);
  console.log(`Seeded ${inserted} golden test responses.`);
} finally {
  await getPool().end();
}
