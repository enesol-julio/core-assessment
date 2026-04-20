import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}
process.env.PIPELINE_PROVIDER = "fixture";

const { startAssessment } = await import("../../src/services/assessment/start.ts");
const { submitAssessment } = await import("../../src/services/assessment/submit.ts");
const { runPipeline } = await import("../../src/services/pipeline/pipeline.ts");
const { getDataProvider } = await import(
  "../../src/services/dashboard/providers/postgres-provider.ts"
);
const { computeRanking } = await import("../../src/services/dashboard/transforms/ranking.ts");
const {
  computeFitnessDistribution,
  computeClassificationDistribution,
  computeScoreHistogram,
  computeSectionDistributions,
} = await import("../../src/services/dashboard/transforms/distributions.ts");
const { computeSectionHeatmap } = await import("../../src/services/dashboard/transforms/heatmap.ts");
const { shapeIndividualDrillDown } = await import(
  "../../src/services/dashboard/transforms/individual.ts"
);
const { computePipelineHealth, computeGoldenTestStatus } = await import(
  "../../src/services/dashboard/transforms/operations.ts"
);
const { findOrCreateUser } = await import("../../src/lib/auth/session.ts");
const { db, getPool } = await import("../../src/db/index.ts");
const {
  calibrationSnapshots,
  goldenTestResponses,
  goldenTestRuns,
  pipelineRuns,
  profiles,
  responses,
  users,
} = await import("../../src/db/schema.ts");
const { inArray } = await import("drizzle-orm");

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("PASS:", msg);
}

const label = `dash-${Date.now()}`;
const created = [];

async function submit(email, seed) {
  const user = await findOrCreateUser(email, { name: `Dash ${seed}` });
  created.push(user);
  const structure = await startAssessment("en");
  const sectionResponses = structure.sections.map((section, sIdx) => ({
    section_id: section.section_id,
    started_at: new Date(Date.now() - (5 - sIdx) * 9 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - (5 - sIdx) * 9 * 60 * 1000 + 9 * 60 * 1000).toISOString(),
    question_responses: section.questions.map((q) => {
      const common = {
        question_id: q.question_id,
        variant_id: null,
        time_taken_seconds: 30 + (seed % 20),
        time_allowed_seconds: q.timer_config.time_allowed_seconds,
        auto_advanced: false,
        warning_triggered: false,
      };
      if (q.type === "single_select") return { ...common, type: "single_select", answer: q.options[0].option_id };
      if (q.type === "multi_select") return { ...common, type: "multi_select", answer: [q.options[0].option_id] };
      if (q.type === "drag_to_order") return { ...common, type: "drag_to_order", answer: q.items.map((i) => i.item_id) };
      return { ...common, type: "open_ended", answer: `Answer seed=${seed}` };
    }),
  }));
  const s = await submitAssessment(
    {
      started_at: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
      completed_at: new Date().toISOString(),
      environment: { browser: "smoke", os: "darwin", screen_resolution: "1920x1080" },
      language: "en",
      section_responses: sectionResponses,
    },
    { user_id: user.id, name: user.name, email: user.email, organization: user.organization, role: "Engineer" },
  );
  await runPipeline(s.response_id, "submission");
  return s.response_id;
}

try {
  // Clean slate
  await db.delete(pipelineRuns);
  await db.delete(profiles);
  await db.delete(responses);
  await db.delete(calibrationSnapshots);
  await db.delete(goldenTestRuns);
  await db.delete(goldenTestResponses);

  // Generate 5 profiles (small sample, no calibration)
  const responseIds = [];
  for (let i = 0; i < 5; i++) {
    responseIds.push(await submit(`${label}-${i}@enesol.ai`, i));
  }

  const provider = getDataProvider();
  const summaries = await provider.listProfiles();
  assert(summaries.length === 5, "listProfiles returns 5 summaries");
  assert(
    summaries.every((s) => s.sectionScores.length === 5),
    "each summary has 5 section scores",
  );

  const ranked = computeRanking(summaries);
  assert(ranked.length === 5, "ranking has 5 rows");
  assert(ranked[0].rank === 1, "first row rank = 1");
  // Verify ranking invariant: strong fit before good fit regardless of composite
  for (let i = 1; i < ranked.length; i++) {
    assert(
      ranked[i - 1].fitnessRatingTier <= ranked[i].fitnessRatingTier,
      `fitness tier monotonically non-decreasing at rank ${i + 1}`,
    );
  }

  const fitness = computeFitnessDistribution(summaries);
  assert(fitness.length === 5, "fitness has 5 buckets");
  const totalFitness = fitness.reduce((a, b) => a + b.count, 0);
  assert(totalFitness === 5, "fitness counts sum to 5");

  const classification = computeClassificationDistribution(summaries);
  assert(classification.length === 5, "classification has 5 buckets");

  const hist = computeScoreHistogram(summaries, 5);
  assert(hist.length === 20, "histogram has 20 buckets (100/5)");
  assert(hist.reduce((a, b) => a + b.count, 0) === 5, "histogram counts = 5");

  const sections = computeSectionDistributions(summaries);
  assert(sections.length === 5, "5 section distributions");

  const heat = computeSectionHeatmap(summaries);
  assert(heat.individuals.length === 5, "heatmap individuals = 5");
  assert(heat.sections.length === 5, "heatmap sections = 5");
  assert(heat.cells.length === 25, "heatmap cells = 5*5 = 25");

  const profile = await provider.getProfile(responseIds[0]);
  assert(profile !== null, "getProfile returns profile");
  const drill = shapeIndividualDrillDown(profile, null);
  assert(drill.sections.length === 5, "drill sections = 5");
  assert(typeof drill.cognitiveProfile.style === "string", "drill includes cognitive profile style");

  const runs = await provider.getPipelineRuns({ windowHours: 24 });
  assert(runs.length === 5, "5 pipeline runs in window");
  const health = computePipelineHealth(runs, 24);
  assert(health.totalRuns === 5, "pipeline health totalRuns = 5");
  assert(health.successCount === 5, "all 5 succeeded");
  assert(health.successRate === 1, "success rate = 1");
  assert(health.avgLatencyMs > 0, "avg latency > 0");

  const gt = await provider.getGoldenTestRuns({});
  const gtStatus = computeGoldenTestStatus(gt);
  assert(gtStatus.latestRun === null, "no golden test runs -> latest null");

  // Filter test
  const filtered = await provider.listProfiles({ organization: "enesol.ai" });
  assert(filtered.length === 5, "filter by organization matches all (all seeded at enesol.ai)");

  const bogus = await provider.listProfiles({ classification: "NonExistent" });
  assert(bogus.length === 0, "unknown classification -> empty");

  console.log("\nALL DASHBOARD SMOKE TESTS PASSED");
} finally {
  await db.delete(pipelineRuns);
  await db.delete(profiles);
  await db.delete(responses);
  await db.delete(calibrationSnapshots);
  const userIds = created.map((u) => u.id);
  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }
  await getPool().end();
}
