# Implementation Brief: 0.1.1 — Assessment Metadata File

**Version Block:** v0.1
**Spec Source:** FS v2.2 §5.2, AM (full file), 02_FUNCTIONAL_SPECS.md Feature 0.1.1
**Prerequisites:** None — this is the root configuration file.
**Date:** 2026-02-25

---

## Objective

Place and validate the single machine-readable configuration file (`assessment-meta.json`) that the application loads first to build UI structure, section ordering, scoring weights, and global behavioral rules. This file already exists from the planning phase — the task is to integrate it into the repo at the correct path, validate its structural integrity, and confirm all values match the specification.

## Context: File Already Exists

The `assessment-meta.json` was authored during spec development. It lives in the planning docs and needs to be placed at `content/assessment-meta.json` in the repository. **Do not author this file from scratch.** The file content is provided below in the Reference: File Content section.

If any adjustments are needed to conform to the schema or spec requirements, make them and document what changed.

## Spec Constraints

- `assessment_id` must be `"core-v1.0"`, `version` must be `"1.0.0"` (FS §5.2)
- `global_settings.allow_pause_between_sections` must be `false` (FS §7.1)
- `global_settings.allow_back_navigation` must be `false` (FS §7.1)
- `global_settings.open_ended_char_limit` must be `5000` (FS §5.5)
- `global_settings.open_ended_word_limit` must be `1000` (FS §5.5)
- `global_settings.multi_select_penalty_factor` must be `0.25` (FS §3.2)
- `global_settings.drag_order_partial_credit_tolerance` must be `1` (FS §3.3)
- `global_settings.total_questions_in_bank` must be `67` (QB overview)
- `global_settings.total_questions_per_session` must be `34` (QB overview)
- `global_settings.estimated_session_duration_minutes` must be `48` (FS §2)
- `sections` array must have exactly 5 entries in fixed order 1–5 (FS §2)
- Section weights must sum to exactly `1.0`: 0.15, 0.25, 0.25, 0.20, 0.15 (FS §3.1)
- `scoring.classifications` must cover range 0–100 with no gaps and no overlaps (FS §3.5)
- Classification tier boundaries: 0–39, 40–54, 55–69, 70–84, 85–100 (FS §3.5)
- `evaluation.ai_evaluator_config` describes the *target* dual-evaluator config; v1.0 ships with a single evaluator per question. The dual evaluator (`evaluators_required: 2`) is v2.1 scope. The field stays as-is to document intent — do NOT remove it. (02_FUNCTIONAL_SPECS.md, scope note)
- Section `file` paths are relative to `content/` (e.g., `"sections/section-1-rapid-recognition.json"`)
- Questions pool and served counts per section (QB summary):
  - S1: pool 20, served 10
  - S2: pool 10, served 5
  - S3: pool 12, served 6
  - S4: pool 15, served 8
  - S5: pool 10, served 5

## Files to Create

| File Path | Purpose |
|---|---|
| `content/assessment-meta.json` | The root assessment configuration file. Place the existing content here. |

## Files to Modify

| File Path | Change |
|---|---|
| None | No existing files need modification for this feature. |

## Architecture Notes

`assessment-meta.json` is a static, version-controlled content file — not runtime data. It lives in `content/` (committed to git), never in `data/` (which is gitignored runtime storage).

The application will load this file at startup to determine: how many sections exist and in what order, what weights to apply for composite scoring, what classification tiers map scores to labels, what global behavioral rules govern the assessment (no back-nav, no pause, character limits, etc.), and what scoring methods apply per question type.

No TypeScript types or Zod schemas need to be created in this feature. The type definitions and schema validation tooling come in Feature 0.1.4 (response schema) and Feature 0.1.5 (validation tooling). For now, the file just needs to exist, be valid JSON, and pass the structural checks described in the acceptance criteria.

The `sections[].file` fields reference section JSON files that do not yet exist — they will be created in Feature 0.1.2. Acceptance criterion #3 ("every `file` reference points to an existing section JSON file") cannot be fully satisfied until Feature 0.1.2 is complete. For this feature, verify the paths are well-formed and consistent with the naming convention: `sections/section-{n}-{slug}.json`.

Similarly, acceptance criterion #5 ("questions_in_pool and questions_served match section files") requires the section files to exist. For this feature, verify the values match the Question Bank Summary reference table above.

## Acceptance Criteria

1. `content/assessment-meta.json` exists and parses as valid JSON with no syntax errors.
2. Section weights sum to exactly `1.0` (0.15 + 0.25 + 0.25 + 0.20 + 0.15 = 1.0).
3. Every `sections[].file` value is a well-formed relative path matching the pattern `sections/section-{n}-{slug}.json`. (Full file-existence check deferred to Feature 0.1.2.)
4. Classification tiers cover the full 0–100 range with no gaps and no overlaps: `[0,39], [40,54], [55,69], [70,84], [85,100]`.
5. `questions_in_pool` and `questions_served` values for each section match the Question Bank Summary: S1 (20/10), S2 (10/5), S3 (12/6), S4 (15/8), S5 (10/5).
6. All `global_settings` values match the spec constraints listed above.
7. All 5 sections are present, in order 1–5, with correct `section_id`, `name`, `weight`, and `timer_mode` values.
8. `scoring.composite_method` is `"weighted_average"`, `scale_min` is `0`, `scale_max` is `100`.

## What NOT to Build

- Do NOT create TypeScript type definitions for this file — that's Feature 0.1.4 / 0.1.5.
- Do NOT create a Zod schema or JSON Schema definition — that's Feature 0.1.5.
- Do NOT create the section JSON files referenced in `sections[].file` — that's Feature 0.1.2.
- Do NOT build any loader, parser, or runtime code that reads this file — that's v0.2 (Feature 0.2.3).
- Do NOT create or populate any `data/` directory files — `data/` is runtime, not content.
- Do NOT add question content to this file — question content lives in section files (Feature 0.1.2/0.1.3).
- Do NOT remove or modify the `evaluation.ai_evaluator_config` dual-evaluator fields. They document the v2.1 target. Leave them as-is.

## Notes for Claude Code

**Integration workflow:** The file content is provided below. Place it at `content/assessment-meta.json`. Then write and run a quick validation script (can be a temporary Node.js script or inline check) that verifies all 8 acceptance criteria. Report which criteria pass and which (if any) fail.

**If adjustments are needed:** If the existing file fails any criterion, fix the issue, document what you changed and why, and re-validate. Do not change spec-mandated values — only fix structural issues (malformed JSON, wrong data types, etc.).

**Directory structure:** Ensure `content/` and `content/sections/` directories exist (they should from the scaffold, but verify). If `content/sections/` doesn't exist, create it with a `.gitkeep` file so git tracks the empty directory for Feature 0.1.2.

---

## Reference: File Content

Place the following content at `content/assessment-meta.json`:

```json
{
  "assessment_id": "core-v1.0",
  "name": "CORE Assessment",
  "full_name": "Critical Observation, Reasoning & Execution",
  "version": "1.0.0",
  "description": "Evaluates foundational thinking skills for AI-assisted work environments. Measures pattern recognition, problem decomposition, critical observation, logical reasoning, and output validation.",
  "organizations": ["ENESOL.ai", "DataForgeTechnologies.com", "Datacracy.co"],
  "created_date": "2026-02-25",
  "updated_date": "2026-02-25",

  "global_settings": {
    "allow_pause_between_sections": false,
    "allow_back_navigation": false,
    "open_ended_char_limit": 5000,
    "open_ended_word_limit": 1000,
    "multi_select_penalty_factor": 0.25,
    "drag_order_partial_credit_tolerance": 1,
    "total_questions_in_bank": 67,
    "total_questions_per_session": 34,
    "estimated_session_duration_minutes": 48
  },

  "sections": [
    {
      "section_id": "section-1-rapid-recognition",
      "name": "Rapid Pattern Recognition",
      "short_name": "Speed Round",
      "file": "sections/section-1-rapid-recognition.json",
      "order": 1,
      "weight": 0.15,
      "description": "Instinctive logical reasoning and pattern detection under time pressure.",
      "questions_in_pool": 20,
      "questions_served": 10,
      "question_types": ["single_select"],
      "timer_mode": "visible",
      "estimated_duration_seconds": 300
    },
    {
      "section_id": "section-2-problem-decomposition",
      "name": "Problem Decomposition",
      "short_name": "Decomposition",
      "file": "sections/section-2-problem-decomposition.json",
      "order": 2,
      "weight": 0.25,
      "description": "Breaking complex problems into logical, sequenced steps with correct dependencies.",
      "questions_in_pool": 10,
      "questions_served": 5,
      "question_types": ["drag_to_order", "open_ended"],
      "timer_mode": "hidden_with_warning",
      "estimated_duration_seconds": 750
    },
    {
      "section_id": "section-3-critical-observation",
      "name": "Critical Observation",
      "short_name": "The BA Lens",
      "file": "sections/section-3-critical-observation.json",
      "order": 3,
      "weight": 0.25,
      "description": "Spotting ambiguity, missing requirements, unstated assumptions, and contradictions.",
      "questions_in_pool": 12,
      "questions_served": 6,
      "question_types": ["multi_select", "open_ended"],
      "timer_mode": "hidden_with_warning",
      "estimated_duration_seconds": 720
    },
    {
      "section_id": "section-4-logical-reasoning",
      "name": "Logical Reasoning Under Constraints",
      "short_name": "Logic",
      "file": "sections/section-4-logical-reasoning.json",
      "order": 4,
      "weight": 0.20,
      "description": "Deductive and conditional reasoning, constraint handling, multi-step logic chains.",
      "questions_in_pool": 15,
      "questions_served": 8,
      "question_types": ["single_select", "open_ended"],
      "timer_mode": "mixed",
      "estimated_duration_seconds": 860
    },
    {
      "section_id": "section-5-output-validation",
      "name": "Output Validation",
      "short_name": "The QA Lens",
      "file": "sections/section-5-output-validation.json",
      "order": 5,
      "weight": 0.15,
      "description": "Evaluating whether outputs satisfy original intent — not just whether they look right.",
      "questions_in_pool": 10,
      "questions_served": 5,
      "question_types": ["multi_select", "open_ended"],
      "timer_mode": "hidden_with_warning",
      "estimated_duration_seconds": 630
    }
  ],

  "scoring": {
    "composite_method": "weighted_average",
    "scale_min": 0,
    "scale_max": 100,
    "classifications": [
      { "min": 85, "max": 100, "label": "Exceptional",                   "color": "#16A34A", "description": "Strong instincts across all dimensions. Likely to excel in AI-directed work with minimal guidance." },
      { "min": 70, "max": 84,  "label": "Proficient",                    "color": "#2563EB", "description": "Solid reasoning and observation skills. May need development in 1–2 areas but fundamentally capable." },
      { "min": 55, "max": 69,  "label": "Developing",                    "color": "#D97706", "description": "Shows potential in some areas but has gaps that would require structured coaching." },
      { "min": 40, "max": 54,  "label": "Foundational",                  "color": "#EA580C", "description": "Basic logical reasoning present but critical gaps in decomposition, observation, or validation." },
      { "min": 0,  "max": 39,  "label": "Needs Significant Development", "color": "#DC2626", "description": "Fundamental reasoning skills need building before AI-assisted work is viable." }
    ]
  },

  "evaluation": {
    "open_ended_method": "ai_evaluator",
    "ai_evaluator_config": {
      "evaluators_required": 2,
      "scoring_method": "average",
      "models": ["claude", "openai"],
      "fallback": "single_evaluator_with_flag"
    },
    "scoring_by_type": {
      "single_select": {
        "method": "binary",
        "description": "Full points if correct, 0 if incorrect."
      },
      "multi_select": {
        "method": "partial_credit",
        "formula": "(correct_selections / total_correct) - (incorrect_selections × penalty_factor)",
        "penalty_factor": 0.25,
        "minimum_score": 0
      },
      "drag_to_order": {
        "method": "positional",
        "partial_credit_tolerance": 1,
        "partial_credit_multiplier": 0.5
      },
      "open_ended": {
        "method": "rubric",
        "scale_min": 0,
        "scale_max": 5,
        "evaluators_required": 2,
        "scoring_method": "average"
      }
    }
  },

  "speed_metrics": {
    "captured": true,
    "included_in_score": false,
    "metrics": [
      "average_time_ratio_per_section",
      "speed_consistency",
      "speed_accuracy_correlation",
      "flagged_anomalies"
    ],
    "anomaly_flags": {
      "suspicious_fast_description": "Response submitted in under the question's suspicious_fast_seconds threshold — may indicate random selection",
      "slow_threshold_description": "Response consumed nearly all available time — may indicate overthinking or struggling"
    }
  },

  "anti_gaming": {
    "question_rotation": true,
    "rotation_method": "random_without_replacement",
    "per_section_selection_constraints": true,
    "no_back_navigation": true,
    "hidden_timers": true,
    "speed_flags": true,
    "plausible_distractors": true,
    "no_obvious_correct_answers": true
  },

  "administration": {
    "delivery_format": "web_application",
    "single_sitting_required": true,
    "external_resources_prohibited": true,
    "ai_tools_prohibited": true,
    "proctoring": "optional",
    "section_order": "fixed"
  }
}
```
