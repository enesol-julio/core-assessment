const contentMod = await import("../../src/lib/content/index.ts");
const selectionMod = await import("../../src/lib/content/selection.ts");
const {
  loadAssessment,
  loadAssessmentMeta,
  loadSection,
  loadUiStrings,
  uiString,
  interpolate,
} = contentMod;
const { selectQuestions } = selectionMod;

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("PASS:", msg);
}

const metaEn = await loadAssessmentMeta("en");
const metaEs = await loadAssessmentMeta("es");
assert(metaEn.name === "CORE Assessment", "EN meta name intact");
assert(metaEs.name === "Evaluación CORE", "ES meta name translated");
assert(metaEn.sections.length === 5, "5 sections in meta");

const s1En = metaEn.sections.find((s) => s.section_id === "section-1-rapid-recognition");
const s1Es = metaEs.sections.find((s) => s.section_id === "section-1-rapid-recognition");
assert(s1En.name === "Rapid Pattern Recognition", "S1 EN name");
assert(s1Es.name === "Reconocimiento Rápido de Patrones", "S1 ES name");
assert(s1En.order === 1, "S1 order preserved");

const secEn = await loadSection(s1En, "en");
const secEs = await loadSection(s1Es, "es");
assert(secEn.questions.length === 20, "S1 pool size 20");
assert(secEs.questions.length === 20, "S1 ES overlay preserves pool size");
assert(secEn.questions[0].prompt !== secEs.questions[0].prompt, "S1 Q1 prompt translated");
assert(secEs.questions[0].options?.[0].text === "36", "S1 Q1 option text merged");

const assEn = await loadAssessment("en");
const orderIds = assEn.sections.map((s) => s.meta.section_id);
assert(
  orderIds[0] === "section-1-rapid-recognition" &&
    orderIds[1] === "section-4-logical-reasoning" &&
    orderIds[2] === "section-3-critical-observation" &&
    orderIds[3] === "section-2-problem-decomposition" &&
    orderIds[4] === "section-5-output-validation",
  "sections ordered S1→S4→S3→S2→S5 per meta",
);

function rngFactory(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 0x100000000;
    return s / 0x100000000;
  };
}

const s1Served = selectQuestions(secEn, rngFactory(1));
assert(s1Served.length === 10, "S1 served = 10 (random_without_replacement)");
const s1Ids = new Set(s1Served.map((q) => q.question_id));
assert(s1Ids.size === 10, "S1 served unique (no replacement)");

const metaS2 = metaEn.sections.find((s) => s.section_id === "section-2-problem-decomposition");
const secS2 = await loadSection(metaS2, "en");
const s2Served = selectQuestions(secS2, rngFactory(42));
assert(s2Served.length === 5, "S2 served = 5");
const s2Drag = s2Served.filter((q) => q.type === "drag_to_order").length;
const s2Open = s2Served.filter((q) => q.type === "open_ended").length;
assert(s2Drag >= 2, `S2 drag_to_order >= 2 (got ${s2Drag})`);
assert(s2Open >= 2, `S2 open_ended >= 2 (got ${s2Open})`);

const metaS5 = metaEn.sections.find((s) => s.section_id === "section-5-output-validation");
const secS5 = await loadSection(metaS5, "en");
const s5Served = selectQuestions(secS5, rngFactory(99));
const s5Ai = s5Served.filter((q) => q.output_source === "ai").length;
assert(s5Ai >= 2, `S5 output_source=ai >= 2 (got ${s5Ai})`);
assert(s5Served.filter((q) => q.type === "multi_select").length >= 2, "S5 multi_select >= 2");
assert(s5Served.filter((q) => q.type === "open_ended").length >= 2, "S5 open_ended >= 2");

const stringsEs = await loadUiStrings("es");
const stringsEn = await loadUiStrings("en");
assert(
  uiString(stringsEs, "briefing.welcome_title", stringsEn) === "Bienvenido/a a la Evaluación CORE",
  "ES string resolved",
);
assert(
  uiString(stringsEs, "nonexistent.key", stringsEn) === "nonexistent.key",
  "missing key returns key name",
);

const template = "This section has {count} questions.";
assert(
  interpolate(template, { count: 10 }) === "This section has 10 questions.",
  "interpolate replaces tokens",
);
assert(
  interpolate("hello {missing}", {}) === "hello {missing}",
  "interpolate leaves missing tokens",
);

console.log("\nALL CONTENT LOADER TESTS PASSED");
