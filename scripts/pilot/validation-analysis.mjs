#!/usr/bin/env node
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}

const { getDataProvider } = await import(
  "../../src/services/dashboard/providers/postgres-provider.ts"
);
const {
  computeClassificationDistribution,
  computeFitnessDistribution,
  computeScoreHistogram,
  computeSectionDistributions,
} = await import("../../src/services/dashboard/transforms/distributions.ts");
const { db, getPool } = await import("../../src/db/index.ts");
const { pilotFeedback } = await import("../../src/db/schema.ts");

const CEILING_THRESHOLD = 0.6; // >60% in top tier flagged
const FLOOR_THRESHOLD = 0.6;
const MIN_SECTION_VARIANCE = 50; // std_dev^2 (raw 0-100 scale)
const LOW_SECTION_STDDEV = 7;

function format(pct) {
  return `${(pct * 100).toFixed(0)}%`;
}

try {
  const provider = getDataProvider();
  const summaries = await provider.listProfiles();
  console.log(`\nCORE pilot validation · n=${summaries.length}`);
  if (summaries.length === 0) {
    console.log("No profiles in the database yet.");
    process.exit(0);
  }

  const classification = computeClassificationDistribution(summaries);
  const fitness = computeFitnessDistribution(summaries);
  const histogram = computeScoreHistogram(summaries, 5);
  const sections = computeSectionDistributions(summaries);

  const findings = [];

  console.log("\nClassification distribution:");
  for (const b of classification) {
    console.log(`  ${b.label.padEnd(35)} ${String(b.count).padStart(3)}  ${format(b.percentage / 100)}`);
    if (b.label === "Exceptional" && b.percentage / 100 >= CEILING_THRESHOLD) {
      findings.push({ severity: "high", message: `Ceiling effect: ${format(b.percentage / 100)} Exceptional (threshold ${format(CEILING_THRESHOLD)})` });
    }
    if (b.label === "Needs Significant Development" && b.percentage / 100 >= FLOOR_THRESHOLD) {
      findings.push({ severity: "high", message: `Floor effect: ${format(b.percentage / 100)} Needs-Development (threshold ${format(FLOOR_THRESHOLD)})` });
    }
  }

  console.log("\nFitness rating distribution:");
  for (const b of fitness) {
    console.log(`  ${b.label.padEnd(35)} ${String(b.count).padStart(3)}  ${format(b.percentage / 100)}`);
  }

  console.log("\nComposite histogram (5-pt buckets):");
  for (const b of histogram) {
    if (b.count === 0) continue;
    console.log(`  ${b.label.padStart(6)}  ${"█".repeat(b.count)} ${b.count}`);
  }

  console.log("\nSection variance:");
  for (const s of sections) {
    const variance = s.stdDev * s.stdDev;
    const low = s.stdDev < LOW_SECTION_STDDEV || variance < MIN_SECTION_VARIANCE;
    const tag = low ? "⚠ low variance" : "ok";
    console.log(
      `  ${s.sectionName.padEnd(35)} mean ${s.mean.toFixed(1).padStart(5)} · std ${s.stdDev.toFixed(1).padStart(4)}  ${tag}`,
    );
    if (low) {
      findings.push({
        severity: "medium",
        message: `Section "${s.sectionName}" has low variance (std=${s.stdDev.toFixed(1)})`,
      });
    }
  }

  const feedbackRows = await db.select().from(pilotFeedback);
  if (feedbackRows.length > 0) {
    const avg = (key) => feedbackRows.reduce((a, r) => a + r[key], 0) / feedbackRows.length;
    console.log(`\nPilot feedback (n=${feedbackRows.length}):`);
    console.log(`  overall    ${avg("overallRating").toFixed(2)}`);
    console.log(`  clarity    ${avg("clarityRating").toFixed(2)}`);
    console.log(`  difficulty ${avg("difficultyRating").toFixed(2)} (1=too easy, 5=too hard)`);
    console.log(`  fairness   ${avg("fairnessRating").toFixed(2)}`);
    const withUx = feedbackRows.filter((r) => r.uxIssues && r.uxIssues.trim().length > 0);
    if (withUx.length > 0) {
      console.log(`\n  UX issues reported (${withUx.length}):`);
      for (const r of withUx) console.log(`    - ${r.uxIssues.slice(0, 200)}`);
    }
  } else {
    console.log("\nPilot feedback: none submitted yet.");
  }

  console.log("\nFindings:");
  if (findings.length === 0) {
    console.log("  ✓ No ceiling/floor effects or low-variance sections detected.");
  } else {
    for (const f of findings) {
      const badge = f.severity === "high" ? "✗" : "⚠";
      console.log(`  ${badge} ${f.severity.toUpperCase()}: ${f.message}`);
    }
  }

  const exitCode = findings.some((f) => f.severity === "high") ? 1 : 0;
  process.exit(exitCode);
} finally {
  await getPool().end();
}
