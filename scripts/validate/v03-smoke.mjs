import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}
process.env.PIPELINE_PROVIDER = "fixture";

const { startAssessment } = await import("../../src/services/assessment/start.ts");
const { submitAssessment } = await import("../../src/services/assessment/submit.ts");
const { runPipeline } = await import("../../src/services/pipeline/pipeline.ts");
const { runBatchRescore } = await import("../../src/services/pipeline/calibration/batch-rescore.ts");
const {
  countProfiles,
  mostRecentCalibration,
  calibrationHistory,
  MIN_CALIBRATION_SAMPLE,
} = await import("../../src/services/pipeline/calibration/params.ts");
const {
  runGoldenTests,
  goldenStatus,
  listGoldenRuns,
} = await import("../../src/services/pipeline/golden-test/runner.ts");
const { seedGoldenTestResponses, clearGoldenTestResponses, goldenSeedCount } = await import(
  "../../src/services/pipeline/golden-test/seed.ts"
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
const { eq, inArray } = await import("drizzle-orm");

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("PASS:", msg);
}

const runLabel = `v03-${Date.now()}`;
const emails = Array.from({ length: MIN_CALIBRATION_SAMPLE + 2 }, (_, i) => `${runLabel}-${i}@enesol.ai`);
const createdUsers = [];

async function submitOne(email, seed) {
  const user = await findOrCreateUser(email, { name: `Smoke ${seed}` });
  createdUsers.push(user);
  const structure = await startAssessment("en");
  const started = new Date(Date.now() - 48 * 60 * 1000).toISOString();
  const completed = new Date().toISOString();
  const sectionResponses = structure.sections.map((section, sIdx) => ({
    section_id: section.section_id,
    started_at: new Date(Date.now() - (5 - sIdx) * 9 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - (5 - sIdx) * 9 * 60 * 1000 + 9 * 60 * 1000).toISOString(),
    question_responses: section.questions.map((q) => {
      const common = {
        question_id: q.question_id,
        variant_id: null,
        time_taken_seconds: 30 + seed,
        time_allowed_seconds: q.timer_config.time_allowed_seconds,
        auto_advanced: false,
        warning_triggered: false,
      };
      if (q.type === "single_select") return { ...common, type: "single_select", answer: q.options[0].option_id };
      if (q.type === "multi_select") return { ...common, type: "multi_select", answer: [q.options[0].option_id] };
      if (q.type === "drag_to_order")
        return { ...common, type: "drag_to_order", answer: q.items.map((i) => i.item_id) };
      return { ...common, type: "open_ended", answer: `Sample response seed=${seed}.` };
    }),
  }));
  const submit = await submitAssessment(
    {
      started_at: started,
      completed_at: completed,
      environment: { browser: "smoke", os: "darwin", screen_resolution: "1920x1080" },
      language: "en",
      section_responses: sectionResponses,
    },
    { user_id: user.id, name: user.name, email: user.email, organization: user.organization, role: "Engineer" },
  );
  await runPipeline(submit.response_id, "submission");
  return submit.response_id;
}

try {
  // Clean any prior state so counts are deterministic
  await db.delete(pipelineRuns);
  await db.delete(profiles);
  await db.delete(responses);
  await db.delete(calibrationSnapshots);
  await db.delete(goldenTestRuns);
  await db.delete(goldenTestResponses);

  // 1. Fewer than MIN_CALIBRATION_SAMPLE profiles -> no calibration
  const responseIds = [];
  for (let i = 0; i < MIN_CALIBRATION_SAMPLE - 1; i++) {
    responseIds.push(await submitOne(emails[i], i));
  }
  let calibration = await mostRecentCalibration();
  assert(calibration == null, `no calibration below n=${MIN_CALIBRATION_SAMPLE}`);

  // 2. Add the 10th profile — calibration should kick in
  responseIds.push(await submitOne(emails[MIN_CALIBRATION_SAMPLE - 1], 99));
  const total = await countProfiles();
  assert(total >= MIN_CALIBRATION_SAMPLE, `profiles >= ${MIN_CALIBRATION_SAMPLE} (got ${total})`);
  calibration = await mostRecentCalibration();
  assert(calibration !== null, "calibration snapshot created at n=10");
  assert(calibration.isCurrent === true, "snapshot is_current=true");
  assert(calibration.sampleSize >= MIN_CALIBRATION_SAMPLE, "snapshot sample_size correct");
  const params = calibration.params;
  assert(params.composite?.mean !== undefined, "composite stats present");
  assert(params.section_distributions && Object.keys(params.section_distributions).length === 5, "5 section distributions");

  // 3. Add another profile -> new snapshot supersedes
  responseIds.push(await submitOne(emails[MIN_CALIBRATION_SAMPLE], 200));
  const history = await calibrationHistory();
  assert(history.length >= 2, `calibration history has >=2 entries (${history.length})`);
  const currents = history.filter((h) => h.isCurrent);
  assert(currents.length === 1, "exactly one is_current snapshot");

  // 4. Profiles now include percentile_rank (because calibration exists at run time)
  //    Note: the first 10 were scored before calibration existed, so they have null.
  //    The 11th (and subsequent) should have it. Let's also re-evaluate an earlier one to verify.
  const reRun = await runPipeline(responseIds[0], "re-evaluation");
  assert(reRun.profile.scores.percentile_rank !== null, "re-evaluated profile has percentile_rank");
  assert(reRun.profile.scores.relative_fitness_tier !== null, "re-evaluated profile has relative_fitness_tier");

  // 5. Batch rescore
  const batch = await runBatchRescore({ scope: { response_ids: responseIds.slice(0, 3) }, concurrency: 2 });
  assert(batch.total === 3, "batch covered 3 responses");
  assert(batch.succeeded === 3, "batch all succeeded");
  assert(batch.failed.length === 0, "no batch failures");

  // 6. Golden tests
  await clearGoldenTestResponses();
  const seeded = await seedGoldenTestResponses(10);
  assert(seeded === 10, `seeded 10 golden responses (got ${seeded})`);
  const seedTotal = await goldenSeedCount();
  assert(seedTotal === 10, "goldenSeedCount = 10");

  const gtResult = await runGoldenTests();
  assert(gtResult.details.length === 10, `10 golden deviations (got ${gtResult.details.length})`);
  assert(typeof gtResult.mad === "number", "MAD is numeric");
  assert(gtResult.range_compliance_rate >= 0 && gtResult.range_compliance_rate <= 1, "range compliance rate in [0,1]");

  const gtRuns = await listGoldenRuns(5);
  assert(gtRuns.length >= 1, "golden test runs persisted");

  const gtStatus = await goldenStatus();
  assert(gtStatus.latest !== null, "goldenStatus reports latest");
  assert(Array.isArray(gtStatus.mad_trend), "mad_trend is array");

  console.log("\nALL v0.3 SMOKE TESTS PASSED");
} finally {
  // Cleanup
  await db.delete(pipelineRuns);
  await db.delete(profiles);
  await db.delete(responses);
  await db.delete(calibrationSnapshots);
  await db.delete(goldenTestRuns);
  await db.delete(goldenTestResponses);
  const userIds = createdUsers.map((u) => u.id);
  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }
  await getPool().end();
}
