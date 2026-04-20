#!/usr/bin/env node
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}
// Default to fixture provider unless caller set something real
if (!process.env.PIPELINE_PROVIDER) process.env.PIPELINE_PROVIDER = "fixture";

const { startAssessment } = await import("../../src/services/assessment/start.ts");
const { submitAssessment } = await import("../../src/services/assessment/submit.ts");
const { runPipeline } = await import("../../src/services/pipeline/pipeline.ts");
const { findOrCreateUser } = await import("../../src/lib/auth/session.ts");
const { db, getPool } = await import("../../src/db/index.ts");
const { pilotFeedback } = await import("../../src/db/schema.ts");

const args = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const m = process.argv[i].match(/^--([^=]+)=?(.*)$/);
  if (m) args.set(m[1], m[2] || "true");
}
const N = Number(args.get("n") ?? 8);
const PREFIX = args.get("prefix") ?? `pilot-${Date.now()}`;
const ORGS = ["enesol.ai", "dataforgetechnologies.com", "datacracy.co"];
const LANG_CHOICES = ["en", "es"];

function choose(arr, rngIdx) {
  return arr[rngIdx % arr.length];
}

function secondsTaken(base, variance) {
  return Math.max(1, Math.round(base + (Math.random() - 0.5) * variance));
}

try {
  console.log(`Simulating ${N} pilot participants with provider="${process.env.PIPELINE_PROVIDER}"…`);
  const results = [];
  for (let i = 0; i < N; i++) {
    const org = choose(ORGS, i);
    const lang = choose(LANG_CHOICES, i);
    const email = `${PREFIX}-${i}@${org}`;
    const user = await findOrCreateUser(email, { name: `Pilot P${i + 1}` });

    const structure = await startAssessment(lang);
    const sectionResponses = structure.sections.map((section, sIdx) => ({
      section_id: section.section_id,
      started_at: new Date(Date.now() - (5 - sIdx) * 10 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - (5 - sIdx) * 10 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
      question_responses: section.questions.map((q) => {
        const common = {
          question_id: q.question_id,
          variant_id: null,
          time_taken_seconds: secondsTaken(q.timer_config.time_allowed_seconds * 0.6, 20),
          time_allowed_seconds: q.timer_config.time_allowed_seconds,
          auto_advanced: false,
          warning_triggered: false,
        };
        if (q.type === "single_select") {
          return { ...common, type: "single_select", answer: q.options[Math.floor(Math.random() * q.options.length)].option_id };
        }
        if (q.type === "multi_select") {
          const pick = q.options.filter(() => Math.random() < 0.4).map((o) => o.option_id);
          return { ...common, type: "multi_select", answer: pick.length ? pick : [q.options[0].option_id] };
        }
        if (q.type === "drag_to_order") {
          const shuffled = [...q.items]
            .map((it) => ({ it, w: Math.random() }))
            .sort((a, b) => a.w - b.w)
            .map((x) => x.it.item_id);
          return { ...common, type: "drag_to_order", answer: shuffled };
        }
        return {
          ...common,
          type: "open_ended",
          answer: `Participant ${i + 1} working in ${lang}. I would approach this by breaking down the problem into steps. First, I'd clarify the requirements. Then I'd identify the key constraints and dependencies. I'd sequence the work so that prerequisites come first. I'd include a validation step before marking anything as done.`,
        };
      }),
    }));

    const submit = await submitAssessment(
      {
        started_at: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
        completed_at: new Date().toISOString(),
        environment: {
          browser: "pilot-sim/1.0",
          os: "Darwin",
          screen_resolution: "1920x1080",
        },
        language: lang,
        section_responses: sectionResponses,
      },
      { user_id: user.id, name: user.name, email: user.email, organization: user.organization, role: choose(["PM", "Engineer", "Ops", "Analyst"], i) },
    );
    const piped = await runPipeline(submit.response_id, "submission");

    // Simulated feedback
    await db.insert(pilotFeedback).values({
      responseId: submit.response_id,
      userId: user.id,
      overallRating: 3 + (i % 3),
      clarityRating: 3 + ((i + 1) % 3),
      difficultyRating: 2 + (i % 3),
      fairnessRating: 4,
      timingComments: i % 2 === 0 ? "Section 2 felt rushed." : null,
      questionComments: null,
      uxIssues: i % 3 === 0 ? "Timer flicker on hidden-timer questions." : null,
      additionalNotes: null,
    });

    results.push({
      email,
      org,
      lang,
      responseId: submit.response_id,
      composite: piped.profile.scores.composite_score,
      classification: piped.profile.scores.classification,
      fitness: piped.profile.vibe_coding_fitness.rating,
    });
    console.log(
      `  ${String(i + 1).padStart(2)}. ${email.padEnd(45)} ${lang} · ${piped.profile.scores.composite_score.toFixed(1).padStart(5)} · ${piped.profile.scores.classification.padEnd(20)} · ${piped.profile.vibe_coding_fitness.rating}`,
    );
  }

  console.log(`\nSimulated ${results.length} pilot participants across ${ORGS.length} orgs / ${LANG_CHOICES.length} languages.`);
  console.log("Next: run `npm run pilot:validate` to analyze distributions.");
} finally {
  await getPool().end();
}
