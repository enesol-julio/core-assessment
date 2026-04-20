import {
  scoreSingleSelect,
  scoreMultiSelect,
  scoreDragToOrder,
  scoreFromRubric,
  sectionRawScore,
  compositeScore,
  classify,
} from "../../src/lib/scoring/index.ts";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("PASS:", msg);
}

function approx(a, b, tol = 1e-6) {
  return Math.abs(a - b) <= tol;
}

// single_select
assert(scoreSingleSelect("a", "a", 1) === 1, "single_select correct -> full");
assert(scoreSingleSelect("a", "b", 1) === 0, "single_select wrong -> 0");
assert(scoreSingleSelect(null, "a", 1) === 0, "single_select blank -> 0");

// multi_select: 3 of 4 correct with 0 incorrect -> 75% of max
assert(
  approx(scoreMultiSelect(["a", "b", "c"], ["a", "b", "c", "d"], 1), 0.75),
  "multi_select 3/4 correct, 0 incorrect -> 0.75",
);
// 3 correct + 1 incorrect -> (0.75 - 0.25) * max = 0.5
assert(
  approx(scoreMultiSelect(["a", "b", "c", "x"], ["a", "b", "c", "d"], 1), 0.5),
  "multi_select 3/4 correct + 1 incorrect -> 0.5",
);
// all incorrect -> 0 (no negative)
assert(
  scoreMultiSelect(["x", "y", "z"], ["a", "b", "c"], 1) === 0,
  "multi_select all incorrect -> 0 (no negative)",
);
// all correct, none incorrect
assert(
  approx(scoreMultiSelect(["a", "b", "c", "d"], ["a", "b", "c", "d"], 10), 10),
  "multi_select all correct -> full",
);

// drag_to_order: all correct
assert(
  approx(scoreDragToOrder(["a", "b", "c", "d"], ["a", "b", "c", "d"], 4), 4),
  "drag_to_order all correct -> full",
);
// one item off by 1 -> partial
// [b, a, c, d] vs [a, b, c, d]: a@1 (off 1 -> 0.5), b@0 (off 1 -> 0.5), c@2 full, d@3 full
// = 0.5 + 0.5 + 1 + 1 = 3.0 (out of 4)
assert(
  approx(scoreDragToOrder(["b", "a", "c", "d"], ["a", "b", "c", "d"], 4), 3),
  "drag_to_order swap adjacent -> 2 partials",
);
// one item off by 2 -> 0 for that item
// [c, b, a, d] vs [a, b, c, d]: a@2 (off 2 -> 0), b full, c@0 (off 2 -> 0), d full
// = 0 + 1 + 0 + 1 = 2
assert(
  approx(scoreDragToOrder(["c", "b", "a", "d"], ["a", "b", "c", "d"], 4), 2),
  "drag_to_order off by 2 -> 0",
);

// rubric
assert(approx(scoreFromRubric(5, 5, 10), 10), "rubric 5/5 -> full");
assert(approx(scoreFromRubric(3, 5, 10), 6), "rubric 3/5 -> 60%");
assert(approx(scoreFromRubric(0, 5, 10), 0), "rubric 0 -> 0");

// section raw score
assert(
  approx(
    sectionRawScore([
      { score: 3, maxScore: 4 },
      { score: 2, maxScore: 2 },
    ]),
    (5 / 6) * 100,
  ),
  "sectionRawScore normalizes to 0-100",
);

// composite
const sections = [
  { weight: 0.15, rawScore: 80 }, // 12
  { weight: 0.2, rawScore: 70 }, // 14
  { weight: 0.25, rawScore: 60 }, // 15
  { weight: 0.25, rawScore: 85 }, // 21.25
  { weight: 0.15, rawScore: 75 }, // 11.25
];
// sum = 73.5
assert(approx(compositeScore(sections), 73.5), "composite = Σ(w * raw)");

const tiers = [
  { min: 85, max: 100, label: "Exceptional" },
  { min: 70, max: 84, label: "Proficient" },
  { min: 55, max: 69, label: "Developing" },
  { min: 40, max: 54, label: "Foundational" },
  { min: 0, max: 39, label: "Needs Significant Development" },
];
assert(classify(73.5, tiers) === "Proficient", "classify 73.5 -> Proficient");
assert(classify(90, tiers) === "Exceptional", "classify 90 -> Exceptional");
assert(classify(0, tiers) === "Needs Significant Development", "classify 0 -> lowest");
assert(classify(54.999, tiers) === "Foundational", "classify 54.999 -> Foundational");

console.log("\nALL SCORING TESTS PASSED");
