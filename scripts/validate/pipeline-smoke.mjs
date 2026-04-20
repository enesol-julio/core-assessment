import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}
// Force fixture provider for reproducibility.
process.env.PIPELINE_PROVIDER = "fixture";

const { startAssessment } = await import("../../src/services/assessment/start.ts");
const { submitAssessment } = await import("../../src/services/assessment/submit.ts");
const { runPipeline, latestProfile, pipelineStatus } = await import(
  "../../src/services/pipeline/pipeline.ts"
);
const { findOrCreateUser } = await import("../../src/lib/auth/session.ts");
const { db, getPool } = await import("../../src/db/index.ts");
const { pipelineRuns, profiles, responses, users } = await import("../../src/db/schema.ts");
const { eq } = await import("drizzle-orm");

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("PASS:", msg);
}

const email = `pipeline-${Date.now()}@enesol.ai`;
const user = await findOrCreateUser(email, { name: "Pipeline Test" });

try {
  // 1. Start + submit an assessment
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
        time_taken_seconds: 30,
        time_allowed_seconds: q.timer_config.time_allowed_seconds,
        auto_advanced: false,
        warning_triggered: false,
      };
      if (q.type === "single_select") {
        return { ...common, type: "single_select", answer: q.options[0].option_id };
      }
      if (q.type === "multi_select") {
        return { ...common, type: "multi_select", answer: [q.options[0].option_id] };
      }
      if (q.type === "drag_to_order") {
        return { ...common, type: "drag_to_order", answer: q.items.map((i) => i.item_id) };
      }
      return {
        ...common,
        type: "open_ended",
        answer: "A thoughtful open-ended answer covering the main points with some structure.",
      };
    }),
  }));

  const submit = await submitAssessment(
    {
      started_at: started,
      completed_at: completed,
      environment: { browser: "smoke/1.0", os: "Darwin", screen_resolution: "1920x1080" },
      language: "en",
      section_responses: sectionResponses,
    },
    {
      user_id: user.id,
      name: user.name,
      email: user.email,
      organization: user.organization,
      role: "Engineer",
    },
  );
  assert(typeof submit.response_id === "string", "submit returns response_id");

  // 2. Run the pipeline with the fixture provider
  const result = await runPipeline(submit.response_id, "submission");
  assert(result.response_id === submit.response_id, "pipeline returns same response_id");
  assert(typeof result.profile.profile_id === "string", "profile_id returned");
  assert(result.profile.profile_version === 1, "first run -> profile_version 1");
  assert(result.profile.scores.section_scores.length === 5, "5 section scores");
  assert(
    ["Exceptional", "Proficient", "Developing", "Foundational", "Needs Significant Development"].includes(
      result.profile.scores.classification,
    ),
    "classification valid",
  );
  assert(
    [
      "Strong Fit",
      "Good Fit",
      "Conditional Fit",
      "Developing Fit",
      "Not Yet Ready",
    ].includes(result.profile.vibe_coding_fitness.rating),
    "fitness rating valid",
  );
  const openEndedCount = result.profile.open_ended_evaluations.length;
  assert(openEndedCount >= 8 && openEndedCount <= 16, `open-ended evaluations within [8,16]: got ${openEndedCount}`);

  // 3. Inspect DB state
  const profileRows = await db.select().from(profiles).where(eq(profiles.responseId, submit.response_id));
  assert(profileRows.length === 1, "profile row inserted");
  assert(profileRows[0].organization === "enesol.ai", "profile indexed with organization");
  assert(profileRows[0].profileVersion === 1, "profile_version = 1 in DB");

  const runRows = await db
    .select()
    .from(pipelineRuns)
    .where(eq(pipelineRuns.responseId, submit.response_id));
  assert(runRows.length === 1, "pipeline_run row exists");
  assert(runRows[0].status === "complete", "pipeline_run status=complete");
  assert(runRows[0].totalLatencyMs > 0, "total_latency_ms populated");

  // 4. Status endpoint logic
  const status = await pipelineStatus(submit.response_id);
  assert(status.latest_run?.status === "complete", "pipelineStatus reports complete");
  assert(status.profile_count === 1, "pipelineStatus counts 1 profile");

  const p = await latestProfile(submit.response_id);
  assert(p?.profile_version === 1, "latestProfile returns v1");

  // 5. Re-evaluation creates v2
  const result2 = await runPipeline(submit.response_id, "re-evaluation");
  assert(result2.profile.profile_version === 2, "re-evaluation -> profile_version 2");
  const allProfiles = await db.select().from(profiles).where(eq(profiles.responseId, submit.response_id));
  assert(allProfiles.length === 2, "both profile versions retained (append-only)");

  // 6. Raw response was not mutated
  const responseRow = await db.select().from(responses).where(eq(responses.id, submit.response_id)).limit(1);
  assert(responseRow[0].responseData.response_id === submit.response_id, "raw response preserved");
  const openEndedRaw = responseRow[0].responseData.section_responses
    .flatMap((s) => s.question_responses)
    .filter((qr) => qr.type === "open_ended");
  // Raw responses: ai_evaluation remains null (pipeline updates the profile, not the raw response)
  assert(
    openEndedRaw.every((qr) => qr.score === null || qr.score === 0),
    "raw response open_ended scores unchanged",
  );

  console.log("\nALL PIPELINE SMOKE TESTS PASSED");
} finally {
  // Cleanup: profiles -> responses -> user (FK chain)
  await db.delete(profiles).where(eq(profiles.userId, user.id)).catch(() => undefined);
  await db.delete(responses).where(eq(responses.userId, user.id)).catch(() => undefined);
  await db.delete(users).where(eq(users.id, user.id)).catch(() => undefined);
  await getPool().end();
}
