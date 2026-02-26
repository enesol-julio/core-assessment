# Implementation Brief: Feature 0.1.2 — Section Definition Files (×5)

**Version Block:** v0.1 — Assessment Content & Schema
**Spec Source:** FS v2.2 §5.3–§5.6, 02_FUNCTIONAL_SPECS.md Feature 0.1.2, Question Bank Summary
**Prerequisites:** Feature 0.1.1 — Assessment Metadata File (✅ complete, tagged v0.1.0-feature-1)
**Date:** 2026-02-26

---

## Objective

Create the five section definition JSON files that define the structural skeleton for every question in the CORE assessment. Each file contains section-level metadata (identity, instructions, question count, selection constraints) and a `questions[]` array with schema-complete entries for every question in the pool. These files establish the structural contract that Feature 0.1.3 (Question Content Authoring) will populate with full assessment content — prompts, scenarios, options, rubrics, and explanations.

The scope boundary is critical: **this feature creates structurally valid, schema-complete section files. Feature 0.1.3 authors the actual cognitive assessment content.** Each question entry here must have all required fields for its type (so the file validates), but prompt text, option text, context scenarios, rubric criteria, explanations, and sample responses will be minimal placeholders. They will be replaced in 0.1.3.

---

## Spec Constraints

These are non-negotiable rules drawn directly from the specifications. Claude Code must not deviate.

### Section-Level Structure (FS v2.2 §5.3)

- Each file must contain: `section_id`, `name`, `instructions`, `question_count`, `selection_constraints`, and `questions[]`.
- `section_id` must match the corresponding entry in `assessment-meta.json` exactly.
- `question_count` = the number of questions *served* per session (not the pool size). The pool size is the length of `questions[]`.
- `instructions` is displayed to the user before the section begins. Must describe what the user will experience (question count served, timer behavior, navigation rules).
- `selection_constraints` defines the rules the application uses to pick which questions from the pool are served in a given session.

### Per-Question Schema — All Types (FS v2.2 §5.3, §5.4)

Every question object, regardless of type, must include:

| Field | Type | Notes |
|---|---|---|
| `question_id` | string | Format: `s{N}-q{NN}` (e.g., `s1-q01`, `s2-q10`) |
| `type` | string | One of: `single_select`, `multi_select`, `drag_to_order`, `open_ended` |
| `difficulty` | string | One of: `easy`, `medium`, `hard` |
| `points` | integer | Per question bank summary |
| `timer_config` | object | Contains `time_allowed_seconds`, `warning_seconds`, `show_timer`, `auto_advance` |
| `prompt` | string | The question text (placeholder OK for 0.1.2) |
| `context` | string or null | Optional scenario/background text |
| `speed_flags` | object | Contains `suspicious_fast_seconds` and `slow_threshold_seconds` |
| `variants` | array | Must be present as empty `[]` in v1.0 (FS v2.2 §5.6; FB §2.1 for population) |

### Timer Configuration (FS v2.2 §5.5)

```
{
  "time_allowed_seconds": <integer, 15–300>,
  "warning_seconds": <integer, 10 or 15>,
  "show_timer": <"visible" | "hidden_with_warning" | "hidden">,
  "auto_advance": true  // always true in v1.0
}
```

- `warning_seconds` must be strictly less than `time_allowed_seconds`.
- `show_timer` values per section:
  - S1: `"visible"` (speed round — pressure is intentional)
  - S2: `"hidden_with_warning"`
  - S3: `"hidden_with_warning"`
  - S4: mixed — `"visible"` for quick questions (30s), `"hidden_with_warning"` for deep questions (120s+)
  - S5: `"hidden_with_warning"`

### Type-Specific Fields (FS v2.2 §5.3, §5.4)

**`single_select`:**
- `options[]`: array of `{ option_id, text }`. Option IDs use lowercase letters: `"a"`, `"b"`, `"c"`, `"d"`.
- `correct_answer`: single option_id string.
- `explanation`: string explaining why the answer is correct.

**`multi_select`:**
- `options[]`: array of `{ option_id, text }`. Same ID convention.
- `correct_answers[]`: array of option_id strings.
- `explanation`: string.
- `scoring_config`: `{ "method": "partial_credit", "penalty_factor": 0.25 }`

**`drag_to_order`:**
- `items[]`: array of `{ item_id, text }`. Item IDs use lowercase letters.
- `correct_order[]`: array of item_ids in correct sequence.
- `explanation`: string.
- `scoring_config`: `{ "method": "positional", "points_per_correct_position": <calculated>, "partial_credit_tolerance": 1, "partial_credit_multiplier": 0.5 }`
  - `points_per_correct_position` = question points ÷ number of items (round to 2 decimal places).

**`open_ended`:**
- `constraints`: `{ "char_limit": 5000, "word_limit": 1000, "placeholder_text": "..." }`
- `rubric`: `{ "scale_min": 0, "scale_max": 5, "scoring_method": "ai_evaluation", "criteria": [...], "levels": [...] }`
  - `criteria`: array of at least 3 strings describing what the evaluator looks for.
  - `levels`: array of 6 objects (scores 5 through 0) with `score`, `label`, and `description`.
- `sample_strong_response`: string (placeholder OK for 0.1.2, will be authored in 0.1.3).

### Speed Flags (FS v2.2 §4)

Every question should have a `speed_flags` object:
```
{
  "suspicious_fast_seconds": <integer>,
  "slow_threshold_seconds": <integer>
}
```
- `suspicious_fast_seconds`: if answered faster than this, flag as possible random click. Guideline: ~10% of `time_allowed_seconds` for objective questions, higher floor for open-ended.
- `slow_threshold_seconds`: threshold near the timer limit indicating the user may have run out of time. Guideline: `time_allowed_seconds - 5` for short timers, `time_allowed_seconds - 10` for longer ones.

---

## Files to Create

| File Path | Purpose |
|---|---|
| `content/sections/section-1-rapid-recognition.json` | S1: 20 single_select questions, 30s visible timer, speed round |
| `content/sections/section-2-problem-decomposition.json` | S2: 6 drag_to_order + 4 open_ended, hidden timers |
| `content/sections/section-3-critical-observation.json` | S3: 8 multi_select + 4 open_ended, hidden timers |
| `content/sections/section-4-logical-reasoning.json` | S4: 12 single_select + 3 open_ended, mixed timers |
| `content/sections/section-5-output-validation.json` | S5: 6 multi_select + 4 open_ended, hidden timers |

## Files to Modify

| File Path | Change |
|---|---|
| `content/sections/.gitkeep` | Delete — no longer needed once section files exist |

---

## Architecture Notes

### File Placement and Naming

All five files go in `content/sections/`. The filenames must match the `file` field in `assessment-meta.json` exactly (without the `sections/` prefix, since that's the relative path from `content/`). The filenames are:

- `section-1-rapid-recognition.json`
- `section-2-problem-decomposition.json`
- `section-3-critical-observation.json`
- `section-4-logical-reasoning.json`
- `section-5-output-validation.json`

These are static content files, version-controlled. They live in `content/`, NOT in `data/`.

### Section-by-Section Specification

#### Section 1: Rapid Pattern Recognition

| Property | Value |
|---|---|
| `section_id` | `"section-1-rapid-recognition"` |
| `name` | `"Rapid Pattern Recognition"` |
| `question_count` | `10` (served per session) |
| Pool size | 20 questions |
| Question type | All `single_select` |
| Timer | 30s, `"visible"`, warning at 10s |
| Points per question | 10 |
| Selection constraint | Random without replacement (no type constraints) |

**Questions (from QB Summary):**

| ID | Difficulty | Topic (for placeholder prompt) |
|---|---|---|
| s1-q01 | easy | Number sequence (increasing differences) |
| s1-q02 | easy | Odd-one-out (plans vs. result) |
| s1-q03 | easy | Syllogism (Blooms/Tinks/Warps) |
| s1-q04 | easy | Analogy (Outline:Essay :: Skeleton:?) |
| s1-q05 | medium | Letter sequence (months) |
| s1-q06 | medium | Date logic (day-before-yesterday + 3) |
| s1-q07 | medium | Anagram (CHEATER → TEACHER) |
| s1-q08 | medium | Number mapping (squaring) |
| s1-q09 | medium | Combinatorics (handshakes in group of 5) |
| s1-q10 | medium | Odd-one-out (verification vs. creation) |
| s1-q11 | medium | Work-rate (6 people × 4 days) |
| s1-q12 | medium | Relationship analogy (Cause:Effect) |
| s1-q13 | medium | Alternating pattern (R/B sequence) |
| s1-q14 | medium | Ordering/ranking (height comparison) |
| s1-q15 | hard | Fibonacci sequence |
| s1-q16 | hard | Clock angle (3:15) |
| s1-q17 | hard | Letter-value arithmetic (ACE) |
| s1-q18 | hard | Constraint satisfaction (5 houses) |
| s1-q19 | hard | Affirming-the-consequent fallacy |
| s1-q20 | hard | Prime number detection |

Each question: 4 options (a/b/c/d), one correct_answer, placeholder prompt referencing the topic, placeholder explanation.

#### Section 2: Problem Decomposition

| Property | Value |
|---|---|
| `section_id` | `"section-2-problem-decomposition"` |
| `name` | `"Problem Decomposition"` |
| `question_count` | `5` |
| Pool size | 10 questions |
| Question types | 6 `drag_to_order`, 4 `open_ended` |
| Timer | 120s (medium dto) / 150s (hard dto) / 180s (open_ended), all `"hidden_with_warning"`, warning at 15s |
| Points | 20 (drag_to_order), 25 (open_ended) |
| Selection constraint | Min 2 drag_to_order, min 2 open_ended |

**Questions (from QB Summary):**

| ID | Type | Difficulty | Pts | Timer | Topic |
|---|---|---|---|---|---|
| s2-q01 | drag_to_order | medium | 20 | 120s | Office relocation (200 employees, 7 steps) |
| s2-q02 | drag_to_order | medium | 20 | 120s | Restaurant new menu item (new supplier, 7 steps) |
| s2-q03 | drag_to_order | hard | 20 | 150s | Hospital paper-to-digital intake (privacy, 8 steps) |
| s2-q04 | drag_to_order | medium | 20 | 120s | Corporate conference planning (500 people, 7 steps) |
| s2-q05 | drag_to_order | hard | 20 | 150s | Bank merger account unification (8 steps) |
| s2-q06 | open_ended | medium | 25 | 180s | Retail loyalty program launch (150 stores + online) |
| s2-q07 | open_ended | medium | 25 | 180s | Time-off request system replacement (300 employees, 4 offices) |
| s2-q08 | open_ended | hard | 25 | 180s | Warehouse inventory unification (3 warehouses, different systems) |
| s2-q09 | open_ended | hard | 25 | 180s | School district enrollment centralization (20 schools, 5-month deadline) |
| s2-q10 | drag_to_order | medium | 20 | 120s | Dual-supplier transition (manufacturing, 7 steps) |

Drag-to-order: 7 items (medium) or 8 items (hard), with item_ids a–g or a–h.
Open-ended: rubric with minimum 3 criteria, 6 scoring levels (0–5), placeholder sample_strong_response.

#### Section 3: Critical Observation

| Property | Value |
|---|---|
| `section_id` | `"section-3-critical-observation"` |
| `name` | `"Critical Observation"` |
| `question_count` | `6` |
| Pool size | 12 questions |
| Question types | 8 `multi_select`, 4 `open_ended` |
| Timer | 90s (medium ms) / 120s (hard ms) / 150s (open_ended), all `"hidden_with_warning"`, warning at 15s |
| Points | 15 (multi_select), 25 (open_ended) |
| Selection constraint | Min 3 multi_select, min 2 open_ended |

**Questions (from QB Summary):**

| ID | Type | Difficulty | Pts | Timer | Scenario | Correct/Total |
|---|---|---|---|---|---|---|
| s3-q01 | multi_select | medium | 15 | 90s | Order confirmation + approval conflict | 4/6 |
| s3-q02 | multi_select | medium | 15 | 90s | Employee scheduling system | 4/6 |
| s3-q03 | multi_select | medium | 15 | 90s | Customer satisfaction survey | 4/6 |
| s3-q04 | multi_select | hard | 15 | 120s | Automated invoice processing | 6/7 |
| s3-q05 | multi_select | hard | 15 | 120s | Meeting room reservation system | 6/7 |
| s3-q06 | multi_select | medium | 15 | 90s | Product return policy | 4/6 |
| s3-q07 | multi_select | hard | 15 | 120s | Automated hiring pipeline | 6/7 |
| s3-q08 | open_ended | medium | 25 | 150s | Real-time sales dashboard brief | 6 criteria |
| s3-q09 | open_ended | medium | 25 | 150s | Inventory low-stock alert system | 7 criteria |
| s3-q10 | open_ended | hard | 25 | 150s | Performance review cycle change | 8 criteria |
| s3-q11 | open_ended | hard | 25 | 150s | Document approval policy | 8 criteria |
| s3-q12 | multi_select | hard | 15 | 120s | Support channel consolidation | 6/7 |

Multi-select: medium questions have 6 options (4 correct), hard questions have 7 options (6 correct).
Open-ended: rubric criteria count as indicated, 6 scoring levels (0–5).

#### Section 4: Logical Reasoning Under Constraints

| Property | Value |
|---|---|
| `section_id` | `"section-4-logical-reasoning"` |
| `name` | `"Logical Reasoning Under Constraints"` |
| `question_count` | `8` |
| Pool size | 15 questions |
| Question types | 12 `single_select`, 3 `open_ended` |
| Timer | Mixed: 30s visible (quick) / 120–180s hidden_with_warning (deep) |
| Points | 10 (quick single_select), 15 (deep single_select), 20 (open_ended) |
| Selection constraint | Min 3 quick, min 3 deep, min 2 open_ended |

**Questions (from QB Summary):**

| ID | Type | Subtype | Difficulty | Pts | Timer | Show Timer | Topic |
|---|---|---|---|---|---|---|---|
| s4-q01 | single_select | quick | easy | 10 | 30s | visible | Policy threshold (expenses) |
| s4-q02 | single_select | quick | easy | 10 | 30s | visible | Contrapositive reasoning (project review) |
| s4-q03 | single_select | quick | medium | 10 | 30s | visible | Correlation ≠ causation (hiring + revenue) |
| s4-q04 | single_select | quick | medium | 10 | 30s | visible | Necessary vs. sufficient (NDA access) — "not enough info" answer |
| s4-q05 | single_select | quick | medium | 10 | 30s | visible | Constraint filtering (proposal selection) |
| s4-q06 | single_select | deep | medium | 15 | 120s | hidden_with_warning | Multi-rule eligibility (training program) |
| s4-q07 | single_select | deep | hard | 15 | 150s | hidden_with_warning | Constraint satisfaction (project assignment) |
| s4-q08 | single_select | deep | medium | 15 | 120s | hidden_with_warning | Contradiction detection (shipping rules) |
| s4-q09 | single_select | deep | hard | 15 | 150s | hidden_with_warning | Committee selection (6 candidates, 4 constraints) |
| s4-q10 | single_select | quick | hard | 10 | 30s | visible | Logical fallacy (risk assessment argument) |
| s4-q11 | single_select | deep | hard | 15 | 150s | hidden_with_warning | Priority queue ordering (warehouse shipping) |
| s4-q12 | open_ended | deep | medium | 20 | 150s | hidden_with_warning | Evaluate causation argument (support page redesign) |
| s4-q13 | open_ended | deep | hard | 20 | 180s | hidden_with_warning | Critique flawed A/B test conclusion |
| s4-q14 | open_ended | deep | medium | 20 | 150s | hidden_with_warning | Policy ambiguity analysis (overtime pre-approval) |
| s4-q15 | single_select | deep | hard | 15 | 150s | hidden_with_warning | Task dependency chain (earliest position) |

Note: S4 has mixed timer modes. Quick questions (30s) use `"visible"` with 10s warning. Deep questions (120s+) use `"hidden_with_warning"` with 15s warning.

Each single_select: 4 options (a/b/c/d). Note s4-q04 must have a "Not enough information to decide" option.

Important: The `selection_constraints` object for S4 must encode the "quick" vs "deep" subtype distinction. Add a `subtype` field (value `"quick"` or `"deep"`) to each S4 question so the application can enforce the min 3 quick / min 3 deep constraint. This is a S4-specific field not present in other sections.

#### Section 5: Output Validation

| Property | Value |
|---|---|
| `section_id` | `"section-5-output-validation"` |
| `name` | `"Output Validation"` |
| `question_count` | `5` |
| Pool size | 10 questions |
| Question types | 6 `multi_select`, 4 `open_ended` |
| Timer | 90s (medium ms) / 120s (hard ms) / 150s (open_ended), all `"hidden_with_warning"`, warning at 15s |
| Points | 15 (multi_select), 25 (open_ended) |
| Selection constraint | Min 2 multi_select, min 2 open_ended, must include ≥1 question with `output_source: "ai"` |

**Questions (from QB Summary):**

| ID | Type | Difficulty | Pts | Timer | Output Source | Scenario | Correct/Total |
|---|---|---|---|---|---|---|---|
| s5-q01 | multi_select | medium | 15 | 90s | human | Support ticket leaderboard (ranking vs. helping) | 4/6 |
| s5-q02 | multi_select | medium | 15 | 90s | human | Churn summary (recommendation overreach) | 4/6 |
| s5-q03 | multi_select | hard | 15 | 120s | ai | Email migration plan (missing safeguards) | 6/7 |
| s5-q04 | multi_select | medium | 15 | 90s | human | Vendor comparison (missing criteria) | 5/6 |
| s5-q05 | multi_select | hard | 15 | 120s | ai | Warehouse budget (capex/opex confusion) | 6/7 |
| s5-q06 | open_ended | medium | 25 | 150s | human | Training completion report (completions ≠ compliance) | 6 criteria |
| s5-q07 | open_ended | hard | 25 | 150s | ai | Survey analysis (4-person sample size flaw) | 6 criteria |
| s5-q08 | open_ended | medium | 25 | 150s | human | Revenue ≠ profitability table | 5 criteria |
| s5-q09 | multi_select | hard | 15 | 120s | ai | WFH policy draft (missing exceptions/roles) | 6/7 |
| s5-q10 | open_ended | hard | 25 | 150s | ai | Onboarding timeline (30-day survey ≠ 8-week plan) | 6 criteria |

Each question needs an `output_source` field (value `"human"` or `"ai"`) so the application can enforce the AI-output constraint. This is an S5-specific field.

s5-q04 note: has 5 correct out of 6 options (different from other medium multi_selects which are 4/6).

---

## Selection Constraints Schema

Each section file includes a `selection_constraints` object at the section level. This tells the application how to select questions from the pool. The structure varies by section:

**S1:**
```
"selection_constraints": {
  "method": "random_without_replacement",
  "count": 10
}
```

**S2:**
```
"selection_constraints": {
  "method": "constrained_random",
  "count": 5,
  "rules": [
    { "field": "type", "value": "drag_to_order", "min": 2 },
    { "field": "type", "value": "open_ended", "min": 2 }
  ]
}
```

**S3:**
```
"selection_constraints": {
  "method": "constrained_random",
  "count": 6,
  "rules": [
    { "field": "type", "value": "multi_select", "min": 3 },
    { "field": "type", "value": "open_ended", "min": 2 }
  ]
}
```

**S4:**
```
"selection_constraints": {
  "method": "constrained_random",
  "count": 8,
  "rules": [
    { "field": "subtype", "value": "quick", "min": 3 },
    { "field": "subtype", "value": "deep", "min": 3 },
    { "field": "type", "value": "open_ended", "min": 2 }
  ]
}
```

**S5:**
```
"selection_constraints": {
  "method": "constrained_random",
  "count": 5,
  "rules": [
    { "field": "type", "value": "multi_select", "min": 2 },
    { "field": "type", "value": "open_ended", "min": 2 },
    { "field": "output_source", "value": "ai", "min": 1 }
  ]
}
```

---

## Open-Ended Rubric Levels (Standard Template)

All open-ended questions use this same 6-level rubric structure (FS v2.2 §6). The `criteria` array is question-specific, but the `levels` array is standard:

```
"levels": [
  { "score": 5, "label": "Exceptional", "description": "Comprehensive, well-structured, identifies non-obvious issues/steps. Shows systems thinking." },
  { "score": 4, "label": "Strong", "description": "Covers key points with good structure. May miss one subtle element but demonstrates clear reasoning." },
  { "score": 3, "label": "Adequate", "description": "Identifies obvious issues/steps but lacks depth or misses important considerations." },
  { "score": 2, "label": "Weak", "description": "Superficial or partially correct. Shows some reasoning but significant gaps." },
  { "score": 1, "label": "Poor", "description": "Misunderstands the task, provides irrelevant response, or demonstrates no structured thinking." },
  { "score": 0, "label": "No Response", "description": "Blank or completely off-topic." }
]
```

---

## Acceptance Criteria

1. Each of the 5 section files parses as valid JSON with no syntax errors.
2. Total questions per section match `questions_in_pool` in `assessment-meta.json`:
   - S1: 20, S2: 10, S3: 12, S4: 15, S5: 10
3. Every question has all required fields for its type (no missing keys).
4. `correct_answer` / `correct_answers` / `correct_order` values reference valid option/item IDs that exist in that question's `options[]` or `items[]`.
5. Timer values are positive integers; `warning_seconds` < `time_allowed_seconds` for every question.
6. Open-ended questions have `rubric` with at least 3 criteria entries and 6 scoring levels.
7. `variants` is present as an empty array `[]` on every question.
8. Selection constraints are satisfiable given pool composition (i.e., the pool contains enough questions of each required type/subtype to meet the minimums while filling the count).

---

## What NOT to Build

- **Do NOT author real assessment content.** Prompts, options, scenarios, explanations, rubric criteria, and sample_strong_responses should be brief placeholders that describe the *topic* (e.g., `"prompt": "Number sequence question: Find the next number in 2, 6, 12, 20, 30, ?"`). Feature 0.1.3 handles full content authoring.
- **Do NOT populate `variants[]`.** Must be empty `[]`. Variant authoring is v2.0 (Future Backlog §2.1).
- **Do NOT create a validation script.** That is Feature 0.1.5.
- **Do NOT create or modify the response schema.** That is Feature 0.1.4.
- **Do NOT build any UI components.** That is v0.2.
- **Do NOT create TypeScript types or Zod schemas** for these files yet. That comes with Features 0.1.4–0.1.5.

---

## Notes for Claude Code

1. **Read `CLAUDE.md` first** — it has project conventions and the current state block.

2. **Cross-reference `assessment-meta.json`** — the section file at `content/assessment-meta.json` is already in place. Open it and verify that your `section_id` values, filenames, and question counts align exactly. Any mismatch between section files and assessment-meta.json is a bug.

3. **Placeholder content strategy** — for this feature, question content should be minimal but structurally complete. A good placeholder `prompt` looks like: `"[PLACEHOLDER] Number sequence: Find the next number in the pattern 2, 6, 12, 20, 30, ?"`. Option text can be `"[A] 36"`, `"[B] 40"`, etc. Explanations can be `"[PLACEHOLDER] To be authored in Feature 0.1.3."`. The key is that every field required by the schema EXISTS and has the correct TYPE — strings are strings, arrays are arrays, integers are integers.

4. **Difficulty and type assignments are FIXED** — the Question Bank Summary (which is in the project specs) dictates exactly which question ID gets which type, difficulty, point value, and timer duration. Do not deviate from the QB Summary tables reproduced in this brief.

5. **Speed flags heuristic** — use these defaults unless there's reason to deviate:
   - 30s questions: `suspicious_fast_seconds: 3`, `slow_threshold_seconds: 25`
   - 90s questions: `suspicious_fast_seconds: 5`, `slow_threshold_seconds: 80`
   - 120s questions: `suspicious_fast_seconds: 8`, `slow_threshold_seconds: 110`
   - 150s questions: `suspicious_fast_seconds: 10`, `slow_threshold_seconds: 140`
   - 180s questions: `suspicious_fast_seconds: 12`, `slow_threshold_seconds: 170`

6. **JSON formatting** — use 2-space indentation. No trailing commas. UTF-8 encoding. These are static content files that developers will read and edit — readability matters.

7. **Delete `.gitkeep`** — once real files exist in `content/sections/`, the `.gitkeep` placeholder should be removed.

8. **Commit convention** — per CLAUDE.md, use: `content: add section definition files (×5) — Feature 0.1.2`

9. **Verification after creation** — run `cat content/sections/section-{1..5}-*.json | python3 -m json.tool > /dev/null` to confirm all 5 files are valid JSON. Then spot-check that the question counts match: `grep -c '"question_id"' content/sections/*.json` should output 20, 10, 12, 15, 10.
