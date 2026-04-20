import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}

const { startAssessment } = await import("../../src/services/assessment/start.ts");
const { submitAssessment } = await import("../../src/services/assessment/submit.ts");
const { findOrCreateUser } = await import("../../src/lib/auth/session.ts");
const { db, getPool } = await import("../../src/db/index.ts");
const { responses, users } = await import("../../src/db/schema.ts");
const { eq } = await import("drizzle-orm");

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("PASS:", msg);
}

const email = `submit-${Date.now()}@enesol.ai`;
const user = await findOrCreateUser(email, { name: "Submit Test" });

try {
  const structure = await startAssessment("en");
  assert(structure.sections.length === 5, "start returns 5 sections");
  const totalServed = structure.sections.reduce((acc, s) => acc + s.question_count, 0);
  assert(totalServed === 34, `total served = 34 (got ${totalServed})`);
  const orderIds = structure.sections.map((s) => s.section_id);
  assert(
    orderIds[0] === "section-1-rapid-recognition" &&
      orderIds[1] === "section-4-logical-reasoning",
    "sections returned in presentation order",
  );
  // No sensitive fields on served questions
  for (const section of structure.sections) {
    for (const q of section.questions) {
      assert(q.correct_answer === undefined, `${q.question_id} has no correct_answer`);
      assert(q.correct_answers === undefined, `${q.question_id} has no correct_answers`);
      assert(q.correct_order === undefined, `${q.question_id} has no correct_order`);
      assert(q.explanation === undefined, `${q.question_id} has no explanation`);
      assert(q.rubric === undefined, `${q.question_id} has no rubric`);
      assert(q.sample_strong_response === undefined, `${q.question_id} has no sample_strong_response`);
    }
  }
  console.log("PASS: served questions contain no answer-revealing fields");

  // Build a submit payload answering every question "incorrectly" (but schema-valid)
  const now = Date.now();
  const started = new Date(now - 48 * 60 * 1000).toISOString();
  const completed = new Date(now).toISOString();

  // We'll build answers directly off structure; but for validity we need to craft
  // reasonable responses per type. We use the first option for single/multi, etc.
  const sectionResponses = structure.sections.map((section, sIdx) => {
    const sectionStart = new Date(now - (5 - sIdx) * 9 * 60 * 1000).toISOString();
    const sectionEnd = new Date(now - (5 - sIdx) * 9 * 60 * 1000 + 9 * 60 * 1000).toISOString();
    const qrs = section.questions.map((q) => {
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
        answer: "Sample open-ended response with a few words to exercise the schema.",
      };
    });
    return {
      section_id: section.section_id,
      started_at: sectionStart,
      completed_at: sectionEnd,
      question_responses: qrs,
    };
  });

  const payload = {
    started_at: started,
    completed_at: completed,
    environment: {
      browser: "NodeSmokeTest/1.0",
      os: "Darwin",
      screen_resolution: "1920x1080",
    },
    language: "en",
    section_responses: sectionResponses,
  };

  const result = await submitAssessment(payload, {
    user_id: user.id,
    name: user.name,
    email: user.email,
    organization: user.organization,
    role: "Engineer",
  });

  assert(typeof result.response_id === "string", "submit returns response_id");
  assert(typeof result.composite_score === "number", "submit returns composite_score");
  assert(typeof result.classification === "string", "submit returns classification");

  const row = await db.select().from(responses).where(eq(responses.id, result.response_id)).limit(1);
  assert(row.length === 1, "response persisted to DB");
  const data = row[0].responseData;
  assert(data.user.email === email, "response_data user.email matches");
  assert(Array.isArray(data.section_responses) && data.section_responses.length === 5, "5 section_responses persisted");
  assert(data.results.classification === result.classification, "persisted classification matches");

  const openEnded = data.section_responses
    .flatMap((s) => s.question_responses)
    .filter((qr) => qr.type === "open_ended");
  assert(openEnded.length > 0, "open-ended responses exist");
  assert(openEnded.every((qr) => qr.score === null), "open-ended scores start null (pipeline populates)");
  assert(openEnded.every((qr) => qr.word_count > 0), "open-ended word_count computed");

  const objective = data.section_responses
    .flatMap((s) => s.question_responses)
    .filter((qr) => qr.type !== "open_ended");
  assert(objective.every((qr) => qr.score !== null), "all objective questions auto-scored");

  // Immutability: re-submit same payload should not overwrite (we use random UUID on each submit)
  await db.delete(responses).where(eq(responses.id, result.response_id));
  console.log("\nALL ASSESSMENT SUBMIT TESTS PASSED");
} finally {
  await db.delete(users).where(eq(users.email, email));
  await getPool().end();
}
