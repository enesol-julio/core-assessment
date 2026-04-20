# CORE Assessment Platform — Consolidated Functional Specification

## Document: 02_FUNCTIONAL_SPECS.md

**Version:** 1.0
**Created:** February 2026
**Organizations:** ENESOL.ai | DataForgeTechnologies.com | Datacracy.co
**Repository:** [github.com/enesol-julio/core-assessment](https://github.com/enesol-julio/core-assessment)
**Local path:** `/Users/jutuonair/GDrive/ProductDevelopment/core-assessment`

---

## Purpose

This document is the consolidated, feature-by-feature functional specification for every capability that ships in v1.0 of the CORE Assessment Platform. It is organized by version block (v0.1 through v0.5) and synthesized from the companion specifications listed below. Each feature is defined with enough detail that a developer could build it from this document alone, referencing the companion specs only for deep schema examples or extended context.

**Companion Specifications (Spec Sources):**

| Abbreviation | Document | Version |
|---|---|---|
| **FS** | CORE Assessment Functional Specification | v2.4 |
| **TS** | CORE AI Evaluation Pipeline — Technical Specification | v1.5 |
| **DS** | CORE Dashboard Module Specification | v1.2 |
| **VR** | CORE Versioning Roadmap | v1.2 |
| **AM** | assessment-meta.json | 1.0.0 |
| **QB** | Question Bank Summary | v1.1 |
| **FB** | CORE Future Backlog Specification | v2.2 |
| **UI** | CORE UI Experience Specification | v1.0 |
| **DP** | CORE Assessment Design Philosophy | v1.0 |

---

## v0.1 — Assessment Content & Schema

**Milestone Gate:** All 70 base questions authored, reviewed, and valid against JSON schema. Section files pass schema validation. `assessment-meta.json` complete.

---

### Feature 0.1.1 — Assessment Metadata File (`assessment-meta.json`)

**Objective:** Provide the single machine-readable configuration file that the application loads first to build UI structure, section ordering, scoring weights, and global behavioral rules.

**Spec Source:** FS §5.2, AM (full file)

**Inputs:** None (authored manually, checked into source control).

**Outputs:** A valid JSON file at `content/assessment-meta.json` containing all fields below.

**Key Requirements:**

- `assessment_id`: `"core-v1.0"`, `version`: `"1.0.0"`
- `global_settings` must include:
  - `allow_pause_between_sections`: `false`
  - `allow_back_navigation`: `false`
  - `open_ended_char_limit`: `5000`, `open_ended_word_limit`: `1000`
  - `multi_select_penalty_factor`: `0.25`
  - `drag_order_partial_credit_tolerance`: `1`
  - `total_questions_in_bank`: `70`, `total_questions_per_session`: `34`
  - `estimated_session_duration_minutes`: `48`
- `sections` array (5 entries, presentation order controlled by `order` field) each containing: `section_id`, `name`, `short_name`, `file` (relative path), `order` (1–5), `weight` (summing to 1.0), `description`, `questions_in_pool`, `questions_served`, `question_types[]`, `timer_mode`, `estimated_duration_seconds`
- `scoring` block: `composite_method`: `"weighted_average"`, `scale_min`: 0, `scale_max`: 100, five classification tiers with min/max/label/color/description
- `evaluation` block: scoring rules per question type (binary, partial_credit, positional, rubric)
- `speed_metrics` block: captured but not included in score
- `anti_gaming` block: rotation, no back-nav, hidden timers, speed flags, plausible distractors
- `administration` block: web delivery, single sitting, no external resources, fixed section order

**Section Weight Table:**

| Section | Weight |
|---|---|
| Section 1 — Rapid Pattern Recognition | 0.15 |
| Section 2 — Problem Decomposition | 0.25 |
| Section 3 — Critical Observation | 0.25 |
| Section 4 — Logical Reasoning Under Constraints | 0.20 |
| Section 5 — Output Validation | 0.15 |

**Scoring Classification Tiers:**

| Range | Label | Color |
|---|---|---|
| 85–100 | Exceptional | `#16A34A` |
| 70–84 | Proficient | `#2563EB` |
| 55–69 | Developing | `#D97706` |
| 40–54 | Foundational | `#EA580C` |
| 0–39 | Needs Significant Development | `#DC2626` |

**Acceptance Criteria:**

1. File parses as valid JSON with no schema errors.
2. Section weights sum to exactly 1.0.
3. Every `file` reference points to an existing section JSON file.
4. Classification tiers cover the full 0–100 range with no gaps or overlaps.
5. All `questions_in_pool` and `questions_served` values match the corresponding section files.

**Dependencies:** None — this is the root configuration.

**Scope Boundaries:** Does not contain question content. Does not define the response schema (that is Feature 0.1.4). The `evaluation.ai_evaluator_config` fields (`evaluators_required: 2`, dual model) describe the *target* configuration; v1.0 ships with a single evaluator per question (dual evaluator is v2.1).

---

### Feature 0.1.2 — Section Definition Files (×5)

**Objective:** Define the complete question pool for each of the five assessment sections, including all question content, options, correct answers, timer configurations, scoring rules, rubrics, and the variant schema structure.

**Spec Source:** FS §5.3–§5.6, QB (all sections)

**Inputs:** None (authored content, checked into source control).

**Outputs:** Five JSON files at `content/sections/section-{n}-{name}.json`.

**Key Requirements:**

Each section file contains a `section_id`, `name`, `instructions` (displayed to user before the section starts), `question_count` (number served per session), and a `questions[]` array.

**Per-question schema (all types):**

- `question_id` (e.g., `"s1-q01"`), `type`, `difficulty` (easy/medium/hard), `points`
- `timer_config`: `time_allowed_seconds`, `warning_seconds`, `show_timer` (visible | hidden_with_warning | per_question), `auto_advance` (boolean)
- `prompt` (question text), `context` (optional scenario/background text)
- `variants[]` — array of equivalent alternatives (empty in v1.0, schema must be present)

**Type-specific fields:**

| Type | Additional Fields | Scoring Method |
|---|---|---|
| `single_select` | `options[]` (option_id, text), `correct_answer`, `explanation` | Binary: full points or 0 |
| `multi_select` | `options[]` (option_id, text), `correct_answers[]`, `explanation` | Partial credit: `(correct/total_correct) − (incorrect × 0.25)`, min 0 |
| `drag_to_order` | `items[]` (item_id, text), `correct_order[]`, `explanation` | Positional: full points per correct position, 50% credit if off by 1 |
| `open_ended` | `scoring_config` (rubric_type, max_score, criteria[]), `sample_strong_response` | AI rubric: 0–5 scale, question-specific criteria |

**Question Pool & Serving:**

| Section | Pool | Served | Selection Constraints |
|---|---|---|---|
| S1: Rapid Pattern Recognition | 20 | 10 | Random without replacement |
| S2: Problem Decomposition | 10 | 5 | Min 2 drag_to_order, min 2 open_ended |
| S3: Critical Observation | 12 | 6 | Min 3 multi_select, min 2 open_ended |
| S4: Logical Reasoning | 15 | 8 | Min 3 quick, min 3 deep, min 2 open_ended |
| S5: Output Validation | 13 | 5 | Min 2 multi_select, min 2 open_ended, must include ≥2 AI-output source |

**Variant Rules (schema only in v1.0):**

- Variants inherit all fields from the base question except what they explicitly override (`prompt`, `options`/`items`, `correct_answer`/`correct_answers`/`correct_order`, `explanation`)
- `timer_config`, `difficulty`, `points`, and `scoring_config` cannot be overridden per variant
- Application must log which variant was served in the response data

**Acceptance Criteria:**

1. Each section file parses as valid JSON.
2. Total questions per section match `questions_in_pool` in `assessment-meta.json`.
3. Every question has all required fields for its type.
4. `correct_answer`/`correct_answers`/`correct_order` values reference valid option/item IDs.
5. Timer values are positive integers; `warning_seconds` < `time_allowed_seconds`.
6. Open-ended questions have `scoring_config` with at least 3 rubric criteria.
7. `variants[]` is present (as empty array) on every question.
8. Selection constraints are satisfiable given pool composition.

**Dependencies:** Feature 0.1.1 (assessment-meta.json must reference these files).

**Scope Boundaries:** v1.0 ships with base questions only — `variants[]` is empty. Variant population is v2.0 (FB §2.1).

---

### Feature 0.1.3 — Question Content Authoring

**Objective:** Author all 67 base questions across 5 sections, ensuring coverage of the target cognitive skills, appropriate difficulty distribution, and valid anti-gaming design.

**Spec Source:** FS §2–§4, QB (complete inventory)

**Inputs:** Assessment design principles (FS §2–§4), cognitive skill definitions, difficulty guidelines.

**Outputs:** Complete question content within the 5 section JSON files.

**Key Requirements:**

**Difficulty Distribution (70 total):** Easy: 6 (9%), Medium: 35 (50%), Hard: 29 (41%).

**Question Type Distribution:** single_select: 32, multi_select: 16, drag_to_order: 6, open_ended: 16.

**Anti-gaming design constraints (per FS §4):**

- Plausible distractors — no obviously wrong answers.
- No pattern in correct answer positions (A/B/C/D should be roughly uniformly distributed).
- Hidden timers prevent clock-gaming on most questions.
- Speed flags detect suspicious fast responses (question-specific `suspicious_fast_seconds` threshold).
- Open-ended questions prevent copy-paste gaming via rubric criteria that reward specificity and structure.

**Acceptance Criteria:**

1. 70 questions exist across 5 section files with correct IDs (s1-q01 through s5-q13).
2. Difficulty counts match the distribution table.
3. Type counts match the distribution table.
4. Every multi_select question has at least one more option than correct answers.
5. Every open-ended question has a `sample_strong_response` for AI evaluation reference.
6. No two questions in the same section test the identical skill with the identical structure.

**Dependencies:** Features 0.1.1, 0.1.2 (schema must be defined before content is authored).

**Scope Boundaries:** Content review for equivalence, bias, and fairness is part of the pilot (v0.5), not this milestone.

---

### Feature 0.1.4 — Assessment Response Schema

**Objective:** Define the JSON schema for capturing a test-taker's complete answers, timing data, speed flags, session metadata, and slots for AI evaluation results.

**Spec Source:** FS §5.7, TS §2.4

**Inputs:** Completed assessment session.

**Outputs:** One JSON file per session at `data/responses/{response-id}.json`.

**Key Requirements:**

The response object must contain:

- `response_id` (UUID), `assessment_id`, `assessment_version`
- `user` block: `user_id`, `name`, `email`, `organization`, `role` — populated from authenticated session (not self-reported, except `name` and `role` at first login)
- `session` block: `started_at`, `completed_at`, `duration_seconds`, `environment` (browser, OS, screen_resolution)
- `section_responses[]` — one per section, each containing:
  - `section_id`, `started_at`, `completed_at`
  - `question_responses[]` — one per question served, each containing:
    - `question_id`, `variant_id` (which variant was served, or null for base), `type`
    - `answer` (selected option_id, selected option_ids[], ordered item_ids[], or free-text string)
    - `time_taken_seconds`, `time_allowed_seconds`, `auto_advanced` (boolean), `warning_triggered` (boolean)
    - `word_count`, `char_count` (for open_ended)
    - `speed_flags[]` (e.g., `"suspicious_fast"`, `"slow"`)
    - `score` (auto-computed for objective types, null until AI evaluates for open_ended)
    - `max_score`
    - `ai_evaluation` slot (null at submission, populated by pipeline)
- `results` block (populated post-scoring): `section_scores[]`, `composite_score`, `classification`, `speed_profile`

**Data Immutability Rule:** Raw response data (answers, timing, speed flags, session metadata) is **immutable** after submission. Never overwritten, never deleted, never modified. AI evaluation results are appended to the existing structure; they never replace or modify the raw data fields.

**Acceptance Criteria:**

1. Schema validates against a JSON Schema definition.
2. All fields listed above are present in the schema with correct types.
3. `ai_evaluation` slots accept the score result structure from the pipeline.
4. Response files are uniquely identified by UUID.
5. Test submission produces a valid response file with all metadata populated.

**Dependencies:** Features 0.1.1, 0.1.2 (question IDs and types must exist).

**Scope Boundaries:** This schema defines the *structure*. Population of AI evaluation fields is v0.3. Auto-scoring of objective questions happens at submission time (v0.2).

---

### Feature 0.1.5 — Schema Validation Tooling

**Objective:** Provide automated validation that all content files (assessment-meta.json, 5 section files) conform to their defined schemas.

**Spec Source:** VR §2 (v0.1 milestone gate)

**Inputs:** All 7 content/schema JSON files.

**Outputs:** Pass/fail validation report.

**Key Requirements:**

- Validate `assessment-meta.json` against its schema.
- Validate each section file against the section schema.
- Cross-validate references: section `file` paths exist, `questions_in_pool` matches actual count, `question_types` matches actual types present.
- Validate scoring parameters: weights sum to 1.0, classification ranges cover 0–100, timer values are positive.

**Acceptance Criteria:**

1. Running the validator on valid files produces a clean pass.
2. Introducing a deliberate error (e.g., missing field, wrong type) produces a clear error message.
3. Cross-reference mismatches are detected (e.g., meta says 20 questions but section has 19).

**Dependencies:** Features 0.1.1, 0.1.2.

**Scope Boundaries:** This is a developer/CI tool, not a user-facing feature.

---

### Feature 0.1.6 — Database Data Model & Migrations

**Objective:** Define the persistent data model for all structured, queryable application data. Establish the migration framework so that schema changes are version-controlled and reproducible across environments.

**Spec Source:** FS §5 (Data Architecture), DS §3 (DataProvider), DS §8.4 (Schema)

**Inputs:** Entity definitions from Functional Spec (users, responses, profiles, calibration, golden tests), authentication requirements (sessions, OTP tokens), pipeline requirements (pipeline runs), admin requirements (allowed domains).

**Outputs:** Database schema definitions, initial migration file (committed to repo), migration runner configuration (auto-run in dev, explicit in production), seed data script.

**Key Requirements:**

**Entities and their fields:**

**`users`** — Authenticated platform users.
- `id` (uuid, primary key), `email` (text, unique, not null), `name` (text, not null), `organization` (text, not null — derived from email domain), `role` (text, not null, default `test_taker` — one of `admin` or `test_taker`), `created_at` (timestamp)

**`sessions`** — Active authenticated sessions.
- `id` (uuid, primary key), `user_id` (uuid, references users, not null), `expires_at` (timestamp, not null), `created_at` (timestamp)

**`otp_tokens`** — Email OTP verification tokens.
- `id` (uuid, primary key), `email` (text, not null), `code` (text, not null), `expires_at` (timestamp, not null), `used` (boolean, default false), `created_at` (timestamp)

**`responses`** — Submitted assessment responses. Immutable after creation.
- `id` (uuid, primary key), `user_id` (uuid, references users, not null), `assessment_version` (text, not null), `started_at` (timestamp, not null), `completed_at` (timestamp, not null), `response_data` (JSONB, not null — contains the full response payload: per-question answers, timing data, speed flags, session metadata, device info), `created_at` (timestamp)

**`profiles`** — Responder Profiles generated by the AI evaluation pipeline. Versioned — re-evaluation creates a new row, not an update.
- `id` (uuid, primary key), `response_id` (uuid, references responses, not null), `profile_version` (integer, not null, default 1), `user_id` (uuid, references users, not null), `composite_score` (numeric 5,2, not null), `classification` (text, not null), `fitness_rating` (text, not null), `organization` (text, not null), `completed_at` (timestamp, not null), `percentile_rank` (integer, nullable), `relative_fitness_tier` (text, nullable), `profile_data` (JSONB, not null — contains the full Responder Profile as defined in the schema above), `created_at` (timestamp)

**`calibration_snapshots`** — Population-level statistics for norm-referencing. Append-only with a "current" pointer.
- `id` (uuid, primary key), `sample_size` (integer, not null), `is_current` (boolean, default false), `params` (JSONB, not null — contains full calibration parameters: per-section distributions, composite distribution, speed benchmarks, fitness distribution), `generated_at` (timestamp)

**`pipeline_runs`** — Execution metadata for each pipeline invocation.
- `id` (uuid, primary key), `response_id` (uuid, references responses, not null), `status` (text, not null — one of `pending`, `scoring`, `aggregating`, `synthesizing`, `complete`, `error`), `started_at` (timestamp), `completed_at` (timestamp, nullable), `total_latency_ms` (integer, nullable), `total_cost_usd` (numeric 8,4, nullable), `metadata` (JSONB, nullable — step-level timing, model info), `error_message` (text, nullable)

**`golden_test_responses`** — Fixed set of pre-scored responses for AI scoring validation.
- `id` (uuid, primary key), `question_id` (text, not null), `quality_level` (text, not null), `response_text` (text, not null), `consensus_score` (numeric 3,1, not null), `acceptable_min` (numeric 3,1, not null), `acceptable_max` (numeric 3,1, not null), `response_data` (JSONB, not null — full golden response data including model scores, agreement level, notes)

**`golden_test_runs`** — Results of each golden test execution.
- `id` (uuid, primary key), `ran_at` (timestamp), `passed` (boolean, not null), `mad` (numeric 4,3, not null), `range_compliance_rate` (numeric 4,3, not null), `extreme_miss_count` (integer, not null), `results` (JSONB, not null — per-response deviation details)

**`allowed_domains`** — Email domains permitted to authenticate.
- `id` (uuid, primary key), `domain` (text, unique, not null), `added_by` (text, not null), `added_at` (timestamp)

**Indexing guidance:**
- `profiles`: index on `organization`, `fitness_rating`, `classification`, `completed_at`, `composite_score` (descending) — these are the dashboard's primary filter and sort columns
- `responses`: index on `user_id`, `completed_at`
- `pipeline_runs`: index on `response_id`, `status`
- `calibration_snapshots`: index on `is_current`

**Schema design principles:**
- JSONB columns store the complete objects that the pipeline produces. Indexed scalar columns duplicate key fields for filtering and sorting. This avoids parsing JSONB for common queries while preserving full-fidelity objects for detailed reads.
- Normalization is deferred. The JSONB-heavy approach matches the pipeline's natural output format. If query patterns emerge that require normalized tables (e.g., per-question score lookups across the population), normalize at that point.
- All UUIDs are auto-generated. All timestamps default to now where appropriate.

**Migration framework:**
- Migration files are auto-generated and committed to the repo
- In development: pending migrations auto-run on app startup (before the server begins accepting requests)
- In production: migrations run as an explicit step in the deploy script, before the build
- Rollback: migration tool must support reverting the most recent migration

**Seed data:**
- Initial admin user: `julio@datacracy.co` with role `admin`
- Initial allowed domains: `enesol.ai`, `dataforgetechnologies.com`, `datacracy.co`
- Seed script is idempotent — running it twice does not create duplicates

**What does NOT go in the database:**
- Audit trail (LLM call logs with full prompt/response bodies) → `data/audit/` on filesystem
- Pipeline traces → `data/traces/` on filesystem
- Assessment content (questions, metadata) → `content/` on filesystem (version-controlled)

**Acceptance Criteria:**

1. Initial migration creates all tables with correct columns, types, and constraints.
2. Foreign key relationships are enforced (user_id references, response_id references).
3. Seed script creates the initial admin user and allowed domains.
4. Migration auto-runs in development mode without manual intervention.
5. A second migration can be generated, applied, and rolled back cleanly.
6. The DataProvider interface can be implemented against these tables without schema changes.

**Dependencies:** Feature 0.1.4 (response schema must be defined — the `response_data` JSONB structure comes from there).

**Scope Boundaries:** This defines the data model. The DataProvider implementation (`PostgresProvider`) is Feature 0.4.1. The pipeline writes to these tables in v0.3 features. Auth reads/writes users, sessions, and OTP tokens in v0.2 features.

---

## v0.2 — Web Application / Assessment Delivery

**Milestone Gate:** A person can log in via Email OTP (if their domain is on the allowlist), take the full 5-section assessment from start to finish, and submit. Unauthorized domains are rejected. Admin can manage the domain allowlist. Responses are captured with all required metadata including authenticated user identity.

---

### Feature 0.2.1 — Email OTP Authentication

**Objective:** Implement passwordless authentication using one-time passwords sent via email, restricted to approved domains.

**Spec Source:** FS §7.6, VR §2 (v0.2)

**Inputs:** User email address.

**Outputs:** Authenticated session (JWT or secure cookie) with `user_id`, `email`, `role`, `organization`.

**Key Requirements:**

- Method: Email One-Time Password — no passwords stored.
- Domain-based allowlist: only email addresses from approved domains can log in. Checked at OTP request time.
- Initial seed domains: `enesol.ai`, `dataforgetechnologies.com`, `datacracy.co`
- Initial admin: `julio@datacracy.co`
- OTP valid for 10 minutes, single-use.
- Session expires after 4 hours (configurable) or after assessment completion.
- Roles: **Admin** (full access to dashboards, re-evaluations, ranking, golden tests, settings) and **Test-Taker** (can take the assessment; no access to results, dashboards, or admin functions).
- First login captures `name` and `role` (self-reported); subsequent logins use stored values.
- User records stored at `data/users/{user-id}.json`.

**Acceptance Criteria:**

1. User with approved domain receives OTP email and can log in.
2. User with unapproved domain is rejected with clear message.
3. Expired OTP (>10 min) is rejected.
4. Reused OTP is rejected.
5. Session token correctly encodes user_id, email, role, and organization.
6. Expired session redirects to login.

**Dependencies:** Microsoft Graph API via `@azure/msal-node` (client credentials flow with `Mail.Send` application permission) for OTP email delivery, JWT library.

**Scope Boundaries:** No password-based login. No social login. No MFA beyond the OTP itself.

---

### Feature 0.2.2 — Domain Allowlist Management

**Objective:** Allow Admin users to manage the list of approved email domains through a settings UI.

**Spec Source:** FS §7.6, VR §2 (v0.2)

**Inputs:** Admin actions: add domain, remove domain, view current list.

**Outputs:** Updated allowlist; API endpoints for CRUD operations.

**Key Requirements:**

- API endpoints:
  - `GET /api/admin/domains` — list approved domains (Admin-only)
  - `POST /api/admin/domains` — add a domain (Admin-only)
  - `DELETE /api/admin/domains/{domain}` — remove a domain (Admin-only)
- Settings page accessible from admin navigation.
- Cannot remove the last domain (safety guard).
- Domain format validation (e.g., reject `@` prefix, whitespace).

**Acceptance Criteria:**

1. Admin can add a new domain and users from that domain can immediately log in.
2. Admin can remove a domain and users from that domain are rejected on next OTP request.
3. Non-admin users cannot access the settings page or API endpoints (403).
4. Invalid domain formats are rejected with error message.

**Dependencies:** Feature 0.2.1 (authentication system).

**Scope Boundaries:** No bulk import. No wildcard domains.

---

### Feature 0.2.3 — Assessment Session Flow

**Objective:** Deliver the 5-section timed assessment with enforced navigation rules, capturing complete response data with metadata.

**Spec Source:** FS §7.1–§7.3, FS §5.3–§5.7

**Inputs:** Authenticated user session, loaded assessment content (meta + sections).

**Outputs:** Complete `assessment-response.json` file persisted to `data/responses/`.

**Key Requirements:**

**Session flow:**
1. User logs in → lands on assessment landing page with instructions.
2. User starts assessment → Section 1 loads.
3. For each section: display instructions → present questions one at a time → enforce timer → auto-advance on timeout → save response per question.
4. After Section 5 → show "Assessment submitted" confirmation screen (no scores, no results — test-takers have zero visibility in v1.0).

**Navigation rules:**
- No pause between sections — sections flow continuously.
- No back-navigation — once a question is submitted or auto-advanced, it cannot be revisited.
- Sections are presented in fixed order (1 → 5).
- Assessment must be completed in a single sitting.

**Question rendering:**
- Load `assessment-meta.json` first, then load each section file in order.
- For each section, select `questions_served` questions from `questions_in_pool` using random-without-replacement, respecting selection constraints (Feature 0.1.2).
- If a question has populated variants, randomly select base or one variant. Log which variant was served. (v1.0: always base, since variants are empty.)

**Timer behavior:**
- Per-question timer (not section-level or assessment-level).
- Three timer modes: `visible` (countdown shown), `hidden_with_warning` (hidden countdown, warning at threshold), `per_question` (mixed based on question config).
- Warning at `warning_seconds` before expiry — visual/audio cue.
- Auto-advance on timer expiry — whatever is selected/typed is saved.
- User sees "this question is timed" notice at the start of each question.

**Response capture per question:**
- Answer value, time_taken_seconds, auto_advanced flag, warning_triggered flag
- word_count and char_count for open_ended
- speed_flags (suspicious_fast if under threshold, slow if near time limit)
- Device/environment info (browser, OS, screen resolution)

**Auto-scoring at submission:** Objective questions (single_select, multi_select, drag_to_order) are scored immediately using deterministic formulas. Open-ended `score` fields remain null (populated by pipeline in v0.3).

**Acceptance Criteria:**

1. User completes all 5 sections without ability to go back.
2. Timer displays correctly per mode (visible countdown, hidden with warning popup).
3. Auto-advance fires when timer expires; partial answer is saved.
4. Response file contains all required metadata fields (timing, flags, environment).
5. Question selection respects pool size and constraints.
6. Objective questions have correct auto-computed scores.
7. Post-submission screen shows confirmation with no score/result data.
8. Response file is immutable after submission.

**Dependencies:** Features 0.1.1–0.1.4 (all content and schemas), Feature 0.2.1 (authentication for user identity).

**Scope Boundaries:** No pause/resume functionality. No accessibility accommodations for extended time (v2+ consideration). No proctoring.

---

### Feature 0.2.4 — Deterministic Scoring Engine

**Objective:** Implement the auto-scoring functions for objective question types, applied immediately at submission time.

**Spec Source:** FS §3, AM `scoring_by_type`

**Inputs:** Question definition (type, correct answer, scoring config) + user's answer.

**Outputs:** Numeric score per question.

**Key Requirements:**

**single_select:** Binary — full points if `answer === correct_answer`, else 0.

**multi_select:** Partial credit formula:
```
score = ((correct_selections / total_correct) - (incorrect_selections × penalty_factor)) × max_score
```
Where `penalty_factor` = 0.25. Minimum score = 0 (no negative scores).

**drag_to_order:** Positional scoring:
- Full points for each item in the correct position.
- 50% credit (× `partial_credit_multiplier` = 0.5) for items off by exactly 1 position (within `partial_credit_tolerance` = 1).
- 0 points for items off by more than 1.

**Composite score:** Weighted average of section raw scores using section weights from `assessment-meta.json`. `composite = Σ(section_raw_score × section_weight)`.

**Classification:** Map composite score to classification tier using the thresholds in `assessment-meta.json`.

**Acceptance Criteria:**

1. single_select: correct answer → full points; incorrect → 0.
2. multi_select: selecting 3 of 4 correct with 0 incorrect → 75% of max; selecting 3 correct + 1 incorrect → (0.75 − 0.25) × max.
3. drag_to_order: all correct → full points; one item off by 1 → partial credit; item off by 2+ → 0 for that item.
4. Composite score correctly applies weights.
5. Classification correctly maps to tier.

**Dependencies:** Feature 0.1.2 (scoring parameters in section files), Feature 0.1.1 (weights in meta).

**Scope Boundaries:** Open-ended scoring is NOT handled here — that is the AI pipeline (v0.3).

---

### Feature 0.2.5 — Role-Based Route Protection

**Objective:** Enforce that Admin-only pages and API endpoints are inaccessible to Test-Taker users and unauthenticated visitors.

**Spec Source:** FS §7.6, DS §9.3

**Inputs:** Authenticated session with role.

**Outputs:** Allow (200) or deny (401 unauthenticated, 403 unauthorized).

**Key Requirements:**

- Middleware pattern:
  ```typescript
  function requireAdmin(req, res, next) {
    const session = validateSession(req);
    if (!session) return res.status(401).json({ error: "Authentication required" });
    if (session.role !== "admin") return res.status(403).json({ error: "Admin access required" });
    next();
  }
  ```
- Applied to: all `/admin/*` routes, all `/api/dashboard/*` endpoints, all `/api/evaluate/*` endpoints, all `/api/golden-test/*` endpoints, all `/api/admin/*` endpoints.
- Navigation visibility: Admin users see "Dashboard" and "Operations" links; Test-Taker users see only assessment-related items.
- Server-side enforcement is the security boundary; client-side hiding is UX convenience only.

**Acceptance Criteria:**

1. Unauthenticated request to `/admin/dashboard` → 401.
2. Test-Taker request to `/admin/dashboard` → 403.
3. Admin request to `/admin/dashboard` → 200.
4. Test-Taker does not see dashboard links in navigation.

**Dependencies:** Feature 0.2.1 (authentication).

**Scope Boundaries:** v1.0 ships with two roles only (Admin, Test-Taker). Manager and Operator roles are v2.1+ (FB §3.3).

---

## v0.3 — AI Evaluation Pipeline

**Milestone Gate:** Submit a response → receive a complete Responder Profile back. Audit trail captures every LLM call. Re-evaluation endpoint works. Golden test framework runs with AI-generated consensus scores.

---

### Feature 0.3.1 — Pipeline Orchestrator (3-Step Chain)

**Objective:** Implement the asynchronous 3-step evaluation pipeline that transforms a raw assessment response into a scored, profiled result.

**Spec Source:** TS §2, TS §11

**Inputs:** `response_id` pointing to a completed assessment response in `data/responses/`.

**Outputs:** Scored response (AI evaluations populated), Responder Profile in `data/profiles/`, updated calibration parameters.

**Key Requirements:**

**Step 1 — Open-Ended Scoring:**
- Model: Sonnet (temperature 0.1, near-deterministic)
- Extract all open-ended questions from the response
- For each, assemble prompt: system prompt + rubric + question context + user's response
- Execute in parallel (1 LLM call per question)
- Each call returns: `rubric_score` (0–5), `justification`, `criteria_met[]`, `criteria_missed[]`
- Validate all results against ScoreResult schema
- Latency: 3–8 seconds (parallel execution)

**Step 2 — Score Aggregation (deterministic, no LLM):**
- Merge AI-scored open-ended results with auto-scored objective results
- Compute per-section raw scores
- Apply section weights → weighted scores
- Sum weighted scores → composite score
- Map composite to classification
- Compute speed profile metrics (average_time_ratio, consistency, speed_accuracy_correlation, anomalies)
- If calibration_params exist (n ≥ 10): compute percentile ranks and relative_fitness_tier
- Latency: <100ms

**Step 3 — Profile Synthesis:**
- Model: Opus (temperature 0.4, creative analysis)
- Single LLM call with complete scored data + calibration context
- Output: complete Responder Profile JSON
- Latency: 5–15 seconds

**Total pipeline latency:** 10–25 seconds. **Cost per assessment:** ~$0.10–0.30.

**Execution model:** Asynchronous. Assessment submission persists the response immediately, then triggers the pipeline. The user sees a confirmation screen, not a loading spinner.

**Orchestrator structure (~200–300 lines of core logic):**
```
orchestrator/
├── pipeline.ts              # Main coordinator
├── providers/               # LLM provider abstraction
├── steps/
│   ├── step1_scoring.ts     # Open-ended scoring + prompt assembly
│   ├── step2_aggregation.ts # Deterministic score computation
│   └── step3_synthesis.ts   # Profile synthesis + prompt assembly
├── calibration/
├── audit/
├── golden_test/
├── schemas/
├── prompts/
└── config/
```

**No LangChain/LangGraph** — the pipeline is linear, not conditional. Native SDKs + provider interface is simpler and more maintainable.

**Acceptance Criteria:**

1. Submitting an assessment response triggers the pipeline automatically.
2. All open-ended questions receive scores within the 0–5 range.
3. Section scores and composite are correctly computed using weights.
4. Responder Profile is generated and stored within 30 seconds of submission.
5. Pipeline status endpoint reports progress through each step.
6. Pipeline handles errors gracefully (retry with backoff, error categorization).

**Dependencies:** Features 0.1.1–0.1.4 (content and schema), Feature 0.2.3 (response capture).

**Scope Boundaries:** Single evaluator per question in v1.0. Dual evaluator is v2.1 (FB §4.1).

---

### Feature 0.3.2 — Model Abstraction Layer (LLMProvider)

**Objective:** Abstract all LLM interactions behind a provider interface so models can be swapped without modifying pipeline logic.

**Spec Source:** TS §3

**Inputs:** `LLMRequest` (model, system_prompt, messages, temperature, max_tokens, response_format).

**Outputs:** `LLMResponse` (content, model_served, usage stats, latency).

**Key Requirements:**

```typescript
interface LLMProvider {
  id: string;        // "anthropic" | "openai"
  name: string;
  complete(request: LLMRequest): Promise<LLMResponse>;
}
```

- v1.0 configuration: Anthropic is sole active provider. Sonnet for Step 1, Opus for Step 3.
- OpenAI provider exists as fallback structure but is not active in default configuration.
- Every LLM call goes through this interface — no direct SDK calls in pipeline logic.
- Provider selection is configuration-driven (`provider_config.json`).

**Acceptance Criteria:**

1. All pipeline LLM calls route through the provider interface.
2. Switching the active provider requires only configuration change, not code change.
3. Provider correctly reports `model_served` (handles cases where API silently routes to different version).

**Dependencies:** Anthropic SDK, OpenAI SDK (for fallback structure).

**Scope Boundaries:** v1.0 uses single provider. Multi-provider scoring is v2.1.

---

### Feature 0.3.3 — Open-Ended Scoring Rubric & Prompt Template

**Objective:** Define the scoring rubric and prompt template used by Step 1 to evaluate open-ended responses.

**Spec Source:** FS §6, TS §4 (Step 1 detail)

**Inputs:** Question definition (prompt, context, rubric criteria), user's response text.

**Outputs:** Score result per question.

**Key Requirements:**

**General Rubric (0–5 scale):**

| Score | Label | Criteria |
|---|---|---|
| 5 | Exceptional | Comprehensive, well-structured, identifies non-obvious issues/steps. Shows systems thinking. |
| 4 | Strong | Covers key points with good structure. May miss one subtle element but demonstrates clear reasoning. |
| 3 | Adequate | Identifies obvious issues/steps but lacks depth or misses important considerations. |
| 2 | Weak | Superficial or partially correct. Shows some reasoning but significant gaps. |
| 1 | Poor | Misunderstands the task, provides irrelevant response, or demonstrates no structured thinking. |
| 0 | No Response / Off-Topic | Blank or completely unrelated to the question. |

**Prompt template structure:**
- System prompt establishing the evaluator's role and constraints
- The general rubric above
- Question-specific criteria from the section file's `scoring_config.criteria[]`
- The question prompt and context
- The user's response
- Required output format: JSON with `rubric_score`, `justification`, `criteria_met[]`, `criteria_missed[]`

**Score result schema:**
```json
{
  "question_id": "s2-q06",
  "rubric_score": 3,
  "rubric_max": 5,
  "justification": "Identified major phases but missed risk/rollback...",
  "criteria_met": ["correct sequencing", "appropriate granularity"],
  "criteria_missed": ["risk/rollback"],
  "notable_strengths": "Clear dependency awareness",
  "notable_gaps": "No mention of validation or rollback strategy"
}
```

**Acceptance Criteria:**

1. Prompt template correctly assembles all components.
2. AI-returned scores are integers in the 0–5 range.
3. Every score includes a justification and criteria analysis.
4. Output validates against ScoreResult schema.
5. Blank/off-topic responses receive score 0.

**Dependencies:** Feature 0.1.2 (rubric criteria in section files), Feature 0.3.2 (LLM provider).

**Scope Boundaries:** Rubric is general with per-question criteria. No question-type-specific rubrics beyond what's in `scoring_config`.

---

### Feature 0.3.4 — Responder Profile Generation (Step 3)

**Objective:** Synthesize all scored data into the Responder Profile — the primary output of the platform.

**Spec Source:** TS §6, FS §12

**Inputs:** Aggregated scores object from Step 2 (all section scores, composite, classification, speed profile, calibration context, open-ended justifications).

**Outputs:** Complete Responder Profile stored in the `profiles` PostgreSQL table (`profile_data JSONB` + indexed scalar columns for composite_score, classification, fitness_rating, organization). Profile versioning uses `profile_version` column.

**Key Requirements:**

**Responder Profile Schema:**

```json
{
  "profile_id": "uuid",
  "profile_version": 1,
  "response_id": "uuid",
  "generated_at": "ISO-8601",
  "pipeline_metadata": {
    "step1_model": "claude-sonnet-4-5-...",
    "step3_model": "claude-opus-...",
    "total_latency_ms": 18500,
    "total_cost_usd": 0.22,
    "calibration_ref": "cal-uuid or null"
  },
  "user": { "user_id", "name", "email", "organization", "role" },
  "scores": {
    "composite_score": 75.25,
    "classification": "Proficient",
    "percentile_rank": 68,
    "relative_fitness_tier": "Above Average",
    "section_scores": [
      { "section_id", "section_name", "weight", "raw_score", "weighted_score", "percentile" }
    ]
  },
  "open_ended_evaluations": [ /* per-question score results from Step 1 */ ],

  "section_analysis": [
    {
      "section_id": "...",
      "section_name": "...",
      "raw_score": 80,
      "percentile": 72,
      "narrative": "3-5 sentences analyzing performance",
      "strengths": ["specific strength"],
      "concerns": ["specific concern"]
    }
  ],

  "cognitive_profile": {
    "style": "2-4 word characterization (e.g., 'Methodical Analyst')",
    "description": "3-5 sentences connecting patterns across sections",
    "strengths": ["cross-section strength"],
    "development_areas": ["cross-section development area"],
    "speed_characterization": "1-2 sentences interpreting speed profile",
    "pattern_insights": ["notable pattern connecting multiple data points"]
  },

  "vibe_coding_fitness": {
    "rating": "Strong Fit | Good Fit | Conditional Fit | Developing Fit | Not Yet Ready",
    "confidence": "high | medium | low",
    "justification": "4-6 sentences with specific evidence",
    "key_strengths_for_ai_work": ["strength relevant to directing AI"],
    "key_risks_for_ai_work": ["risk relevant to AI-assisted work"],
    "recommended_role_contexts": ["type of AI-assisted work they'd excel at"]
  },

  "development_recommendations": [
    {
      "area": "section or skill name",
      "priority": "high | medium | low",
      "observation": "what the data shows",
      "recommendation": "specific, actionable suggestion"
    }
  ],

  "speed_profile_interpretation": {
    "overall_characterization": "1-2 sentences",
    "speed_accuracy_insight": "1-2 sentences connecting speed to accuracy",
    "anomaly_interpretation": "interpretation of flagged anomalies, or 'No anomalies detected'"
  },

  "red_flags": [
    {
      "type": "suspicious_fast | inconsistent_pattern | section_disparity | other",
      "description": "what was observed",
      "severity": "low | medium | high",
      "implication": "what it might mean"
    }
  ]
}
```

**Vibe-Coding Fitness Rating Scale:**

| Rating | Criteria |
|---|---|
| **Strong Fit** | Consistent strength across all sections. Strong decomposition and observation. Fast and accurate. Would naturally refuse the obvious fix, escalate at the right tier, maintain context discipline, and know which decisions can't be delegated. Can own the full orchestration cycle independently. |
| **Good Fit** | Solid across most sections. May have one area slightly below proficient. Can decompose and validate effectively but may need support in one area — typically observation or sequencing. |
| **Conditional Fit** | Strengths in some areas but notable gaps. Likely strong at one end of the orchestrator cycle but weak at the other. Needs targeted development. |
| **Developing Fit** | Fundamental skills present but multiple gaps. Would benefit from paired work with a stronger orchestrator. Requires structured coaching. |
| **Not Yet Ready** | Critical gaps in core reasoning skills. Risks accepting AI outputs uncritically. Requires foundational skill-building before AI-assisted work delegation. |

**Relative Fitness Tiers (percentile-based, requires calibration data):**

| Percentile | Tier |
|---|---|
| ≥ 75th | Top Quartile |
| 50th–74th | Above Average |
| 25th–49th | Below Average |
| < 25th | Bottom Quartile |

**Profile versioning:** Each synthesis run creates a new profile version. Previous versions retained in the database (new row with incremented `profile_version`, old rows preserved).

**Synthesis Behavioral Requirements:**

The synthesis step produces the Responder Profile by analyzing scored data through an LLM. The prompt template (stored in `prompts/`) must produce output that meets these behavioral standards:

- **Orchestrator skill mapping.** The profile must connect observed performance to the cognitive patterns the assessment measures: root-cause diagnosis, dependency-aware sequencing, context gap detection, escalation judgment, output-vs-intent validation, scope discipline, and forward-thinking design. Section scores are the raw data; the synthesis interprets what they mean for AI-assisted work readiness.
- **Evidence-grounded claims.** Every assertion in the profile must trace to specific data — a section score, a speed pattern, an open-ended response quality signal. No generic characterizations ("shows promise") without evidence.
- **Actionable `recommended_role_contexts`.** This field must suggest specific types of AI-assisted work based on demonstrated strengths — not generic job descriptions. Examples: "spec-driven feature delegation," "AI output review and quality assurance," "process design and automation." A person strong in decomposition but weak in validation should get different recommendations than the reverse.
- **Honest `development_recommendations`.** Weaknesses are named directly with specific, actionable suggestions a manager could act on. Recommendations are prioritized by impact on AI-assisted work readiness.
- **Fitness rating fidelity.** The `justification` field must explain the rating with reference to the behavioral descriptions in the rating scale above — not just restate the tier name or composite score.
- **Red flag interpretation.** When speed anomalies or pattern inconsistencies exist, the `red_flags` array must include them with severity and implication for AI-assisted work readiness, not just flag them as data points.

**Acceptance Criteria:**

1. Profile contains all schema fields with correct types.
2. Section analysis covers all 5 sections with narratives.
3. Cognitive profile characterization is specific, not generic.
4. Fitness rating is one of the five defined tiers.
5. Development recommendations are prioritized and actionable.
6. Red flags are populated when speed anomalies exist.
7. Profile version increments on re-evaluation.

**Dependencies:** Feature 0.3.1 (pipeline orchestrator), Feature 0.3.3 (scoring results).

**Scope Boundaries:** No test-taker visibility of profiles in v1.0. Profiles are Admin-only via dashboard (v0.4).

---

### Feature 0.3.5 — Calibration Parameter Generation

**Objective:** Compute and maintain population-level statistics that contextualize individual scores with percentile ranks and relative fitness tiers.

**Spec Source:** TS §7

**Inputs:** All scored profiles in `data/profiles/`.

**Outputs:** Row in the `calibration_snapshots` PostgreSQL table (`params JSONB` + `is_current` flag + `sample_size`, `generated_at` scalars). History is all rows; current is the row with `is_current = true`.

**Key Requirements:**

- Calibration activates at n ≥ 10 assessed individuals.
- Updated incrementally after each new assessment is scored.
- Schema includes:
  - `sample_size`, `generated_at`, `assessment_version`
  - `composite`: mean, median, std_dev, min, max, p10, p25, p50, p75, p90
  - `sections`: per-section mean, median, std_dev, min, max, p25, p75
  - `open_ended_benchmarks`: per-question mean_score and std_dev
  - `speed_benchmarks`: overall and per-section average time ratios
  - `classification_distribution`: count per classification tier
  - `fitness_rating_distribution`: count per fitness tier

- Each update creates a new snapshot; `current.json` is the latest pointer.
- Batch re-scoring: re-run Step 3 only for all profiles when calibration data changes significantly (triggered every 25 new assessments or on-demand via `POST /api/calibration/rescore`).

**Acceptance Criteria:**

1. Calibration params are null for populations < 10.
2. At n = 10, calibration params are generated with correct statistics.
3. Percentile ranks appear in Responder Profiles once calibration exists.
4. Historical snapshots are preserved (append-only).
5. Batch re-scoring correctly re-runs Step 3 for all profiles.

**Dependencies:** Feature 0.3.4 (profiles must exist to calibrate against).

**Scope Boundaries:** Population-based refinement of golden test scores is v2.0 (FB §5.1).

---

### Feature 0.3.6 — Audit Trail

**Objective:** Capture structured logs of every LLM call for debugging, cost tracking, drift detection, and compliance.

**Spec Source:** TS §13

**Inputs:** Every LLM call made by the pipeline.

**Outputs:** Audit records at `data/audit/{date}/{call-id}.json`.

**Key Requirements:**

Each audit record contains:
- `audit_id`, `timestamp`, `response_id`, `question_id` (if applicable)
- `step` (scoring | synthesis), `trigger` (submission | re-evaluation | golden_test | batch_rescore)
- `provider`, `model_requested`, `model_served`, `temperature`
- `prompt_template_version`, `prompt_hash` (SHA-256 of fully assembled prompt)
- `input_tokens`, `output_tokens`, `total_tokens`
- `latency_ms`, `cost_usd`
- `raw_response` (complete unprocessed LLM output)
- `parsed_result` (structured extraction)
- `validation_warnings[]` (soft issues like score clamping)
- `retry_info` (retry_count, original_error if retried)

**Storage:** Structured JSON, one record per LLM call. Retention: indefinite for scoring records, minimum 12 months for synthesis. Indexed by response_id, question_id, timestamp, model_served. Read-only for administrators; pipeline writes only.

**Acceptance Criteria:**

1. Every LLM call produces exactly one audit record.
2. Audit records contain all fields listed above.
3. `prompt_hash` enables exact reproduction of any call.
4. Records are queryable by response_id, question_id, and timestamp.
5. No updates or deletes are possible on audit records.

**Dependencies:** Feature 0.3.2 (LLM provider wraps calls with audit logging).

**Scope Boundaries:** No real-time alerting on audit data (v2+ consideration). Audit data is read through the operational dashboard (v0.4).

---

### Feature 0.3.7 — Golden Test Framework

**Objective:** Validate AI scoring reliability using a fixed set of 20 pre-scored open-ended responses with AI-established consensus scores.

**Spec Source:** TS §14

**Inputs:** 20 golden responses with consensus scores, current pipeline configuration.

**Outputs:** Pass/fail report with per-response deviation analysis.

**Key Requirements:**

**Design:** 20 golden responses curated across sections and quality levels. Ground truth established through AI cross-validation — 3+ independent models score each response, consensus derived from agreement.

**Golden response schema:**
- `golden_id`, `question_id`, `response_text`, `quality_level` (exceptional through off-topic)
- `consensus_score` (0–5), `acceptable_range` ([min, max])
- `model_scores[]` (from cross-validation), `agreement_level` (unanimous | majority | split)
- `notes`, `population_validation` (added post-launch)

**Pass/fail criteria (all three must pass):**

| Metric | Computation | Pass Threshold |
|---|---|---|
| Mean Absolute Deviation (MAD) | Avg of \|AI_score − consensus_score\| across 20 responses | ≤ 0.5 |
| Range Compliance Rate | % of AI scores within acceptable_range | ≥ 90% (18/20) |
| Extreme Miss Count | Scores deviating ≥ 2 points from consensus | 0 |

**Run cadence:** Weekly (scheduled), on prompt change, on model change, on-demand (manual).

**Drift detection:** Current MAD compared to trailing average of last 10 runs. If current exceeds trailing by > 0.15, drift alert triggered.

**API endpoints (Admin-only):**
- `POST /api/golden-test/run` — trigger a run
- `GET /api/golden-test/runs` — list historical runs
- `GET /api/golden-test/runs/{run_id}` — detailed results
- `GET /api/golden-test/status` — current pass/fail and drift metrics

**Acceptance Criteria:**

1. Golden test suite runs successfully against production configuration.
2. All three pass thresholds are met on initial deployment.
3. Run results include per-response deviation analysis.
4. Historical runs are stored and comparable.
5. Drift detection correctly flags when MAD trend increases.

**Dependencies:** Feature 0.3.3 (scoring prompt must be finalized), Feature 0.3.2 (provider for multi-model cross-validation).

**Scope Boundaries:** v1.0 ships with AI-bootstrapped golden set. Deeper content curation with real population data is v2.0 (FB §5.1).

---

### Feature 0.3.8 — Re-Evaluation & Pipeline API Endpoints

**Objective:** Expose API endpoints for triggering evaluation, checking status, and re-running evaluations on existing responses.

**Spec Source:** TS §9

**Inputs:** Response ID, evaluation parameters.

**Outputs:** Pipeline status, evaluation results.

**Key Requirements:**

| Endpoint | Method | Purpose | Auth |
|---|---|---|---|
| `POST /api/evaluate` | POST | Trigger pipeline for a response | Internal (auto-triggered on submit) |
| `GET /api/evaluate/{response_id}/status` | GET | Pipeline progress (per-step status) | Admin |
| `POST /api/evaluate/{response_id}/re-evaluate` | POST | Full re-run of all 3 steps | Admin |
| `POST /api/calibration/rescore` | POST | Batch re-score (Step 3 only) for all profiles | Admin |

**Re-evaluate:** Creates a new evaluation version. Previous evaluations preserved. Original raw response data is never modified.

**Batch re-score:** Re-runs Step 3 (synthesis) only, using current calibration params and current prompt template. Supports `scope: "all"` or specific response IDs. Configurable concurrency.

**Error handling:** Exponential backoff for LLM failures. Retry up to 3 times. Error categorization (transient vs. permanent). Pipeline status reflects errors.

**Acceptance Criteria:**

1. Submitting an assessment auto-triggers evaluation.
2. Status endpoint correctly reports step-by-step progress.
3. Re-evaluation creates a new profile version without modifying the original.
4. Batch re-score processes all profiles with configurable concurrency.
5. Transient LLM errors are retried; permanent errors are logged and surfaced.

**Dependencies:** Feature 0.3.1 (pipeline), Feature 0.3.6 (audit trail for logging).

**Scope Boundaries:** No queue management UI. No priority queue beyond normal/high.

---

## v0.4 — Dashboard & Reporting

**Milestone Gate:** Both dashboards render correctly with real data. Ranking algorithm produces correct ordering. Operational dashboard shows pipeline health from audit trail data. Unauthenticated and Test-Taker users are blocked from all dashboard routes.

---

### Feature 0.4.1 — Data Access Layer (DataProvider Interface)

**Objective:** Abstract all dashboard data access behind an interface that decouples consumers from storage implementation.

**Spec Source:** DS §3

**Inputs:** Filter parameters (organization, date range, classification, fitness rating).

**Outputs:** Raw data (profiles, calibration params, pipeline runs, golden test runs).

**Key Requirements:**

```typescript
interface DataProvider {
  listProfiles(filters?: ProfileFilters): Promise<ProfileSummary[]>;
  getProfile(responseId: string): Promise<ResponderProfile>;
  getCurrentCalibration(): Promise<CalibrationParams | null>;
  getCalibrationHistory(): Promise<CalibrationSnapshot[]>;
  getPipelineRuns(filters?: TimeRangeFilter): Promise<PipelineRun[]>;
  getGoldenTestRuns(filters?: TimeRangeFilter): Promise<GoldenTestRun[]>;
}
```

**`ProfileSummary` type** (lightweight, for list operations):
- `responseId`, `name`, `email`, `organization`, `role`, `completedAt`
- `compositeScore`, `classification`, `fitnessRating`, `percentileRank`
- `sectionScores[]` (sectionId, sectionName, rawScore)

**v1.0 implementation: `PostgresProvider`** — queries PostgreSQL via Drizzle ORM. Simple filters (organization, date range, classification) push down into SQL WHERE clauses for efficiency. Complex aggregation and shaping remain in the transform layer.

**Cloud migration:** Swap `DATABASE_URL` to a managed service (Neon, RDS, Supabase). Same Drizzle schema, same provider code, same interface. Zero changes to transforms or presentation.

**Acceptance Criteria:**

1. `PostgresProvider` correctly queries all database tables.
2. `listProfiles` returns all profiles as summaries.
3. `getProfile` returns full Responder Profile for a given response ID.
4. Interface is clean enough that swapping to a cloud-managed database requires only a connection string change.
5. Simple filters (org, date, classification) execute as SQL WHERE clauses, not in-memory filtering.

**Dependencies:** Feature 0.3.4 (profiles must exist), Feature 0.3.5 (calibration data).

**Scope Boundaries:** No caching beyond what PostgreSQL provides natively. Cloud database migration is v2.2 (connection string swap).

---

### Feature 0.4.2 — Transform Layer

**Objective:** Implement pure functions that filter, aggregate, sort, and shape raw data into chart-ready structures for the presentation layer.

**Spec Source:** DS §4

**Inputs:** Raw data from DataProvider.

**Outputs:** Chart-ready data structures consumed by React components.

**Key Requirements:**

**Transform Modules:**

**`ranking.ts` — computeRanking():**
Algorithm: Fitness tier first, composite score second, name alphabetical tiebreaker.
1. Receive `ProfileSummary[]`
2. Apply active filters (organization, date range)
3. Assign numeric tier: Strong Fit=1, Good Fit=2, Conditional Fit=3, Developing Fit=4, Not Yet Ready=5
4. Sort by: (a) fitness tier ascending, (b) composite score descending, (c) name alphabetical
5. Assign rank position (1, 2, 3, ...)
6. Return `RankedProfile[]`

Output type:
```typescript
interface RankedProfile {
  rank: number;
  responseId: string;
  name: string;
  organization: string;
  role: string;
  completedAt: string;
  fitnessRating: string;
  fitnessRatingTier: number;     // 1–5
  compositeScore: number;
  classification: string;
  percentileRank: number | null;
  sectionScores: { sectionId: string; sectionName: string; rawScore: number; }[];
}
```

**`distributions.ts`:**
- `computeFitnessDistribution()` → rating, count, percentage, color per tier
- `computeClassificationDistribution()` → classification, count, percentage, color per tier
- `computeScoreHistogram(bucketSize=5)` → bucket labels and counts (0–4, 5–9, ..., 95–100)
- `computeSectionDistributions()` → per-section mean, median, min, max, stdDev

**`heatmap.ts` — computeSectionHeatmap():**
Matrix of individuals × 5 sections. Each cell: responseId, sectionId, rawScore, band, color.

Band mapping (same thresholds as composite classification applied to section raw scores):

| Raw Score | Band | Color |
|---|---|---|
| 85–100 | Exceptional | `#16A34A` |
| 70–84 | Proficient | `#2563EB` |
| 55–69 | Developing | `#D97706` |
| 40–54 | Foundational | `#EA580C` |
| 0–39 | Needs Development | `#DC2626` |

Rows ordered by ranking (strongest at top).

**`individual.ts` — shapeIndividualDrillDown():**
Shapes a full Responder Profile into: summary card data, section radar chart data, cognitive profile, fitness justification, development recommendations, speed profile, red flags.

**`operations.ts`:**
- `computePipelineHealth(windowHours=168)` → totalRuns, successCount, errorCount, successRate, avgLatency, p95Latency, avgCost, recentErrors[]
- `computeGoldenTestStatus()` → latestRun (pass/fail, MAD, compliance, misses), madTrend[] (last 10), driftAlert, consecutiveFailures

**Design constraints:** All transforms are pure functions — no side effects, no storage awareness. O(n) or O(n log n) complexity. No external dependencies.

**Acceptance Criteria:**

1. Ranking produces correct order: Strong Fit individuals before Good Fit, regardless of composite score.
2. Distributions compute correct counts and percentages.
3. Heatmap cells map to correct color bands.
4. Individual drill-down shapes all profile sections.
5. Pipeline health computes correct success rate and latency stats.
6. All transforms are pure functions with no side effects.

**Dependencies:** Feature 0.4.1 (data provider).

**Scope Boundaries:** Transforms consume data; they do not fetch or persist it.

---

### Feature 0.4.3 — Manager/Admin Dashboard View

**Objective:** Render the primary dashboard showing team performance, ranking, distributions, and drill-down capability. Admin-only access.

**Spec Source:** DS §5.1, §5.2, §6

**Inputs:** Transform-layer outputs.

**Outputs:** Rendered dashboard in the browser.

**Key Requirements:**

**Layout components:**

1. **Filters Bar** — Organization, Date Range, Classification. All filters apply globally (updating every component simultaneously).
2. **Summary Cards** (4): Total Assessed, Average Composite, Proficient+ Rate (%), Good Fit+ Rate (%).
3. **Fitness Distribution** — Donut/pie chart (Recharts PieChart). Segments colored by fitness tier.
4. **Score Distribution** — Histogram (Recharts BarChart). X: score buckets (5-point intervals). Y: count. Background color bands matching classification zones.
5. **Section Heatmap** — Custom color-coded grid. Rows: individuals (ordered by rank). Columns: 5 sections. Click row → drill-down.
6. **Ranking Table** — Sortable, filterable. Columns: Rank, Name, Org, Fitness Rating, Composite, Classification. Click row → drill-down. Paginated (25 per page, max 100).

**Individual Drill-Down** (accessed from ranking table or heatmap click):
- Identity card: Name, Org, Role, Composite, Classification, Fitness Rating, Percentile
- Radar chart: 5-axis spider chart (one axis per section, 0–100 scale), with population mean reference line if calibration available
- Cognitive Profile: style label, description narrative, strengths, development areas
- Fitness Justification: full narrative, key strengths for AI work, key risks
- Development Recommendations: priority-sorted list with area, observation, recommendation
- Speed Profile: characterization, speed-accuracy insight, anomaly interpretation
- Red Flags: type, description, severity, implication (if any)

**Technology:** Tremor (dashboard primitives: cards, tables) + Recharts (custom charts: histograms, radar, heatmap).

**Acceptance Criteria:**

1. Dashboard loads and renders all components with real profile data.
2. Filters update all components simultaneously.
3. Ranking table sorts correctly (fitness tier → composite → name).
4. Clicking a ranking row opens the individual drill-down with full profile data.
5. Radar chart displays section scores with population reference line.
6. Dashboard is inaccessible to Test-Taker users (403 on route and API).

**Dependencies:** Features 0.4.1, 0.4.2 (data and transforms), Feature 0.2.5 (auth enforcement).

**Scope Boundaries:** No export (PDF/CSV is v2.2). No test-taker-visible dashboard. No email reports. No UI/UX visual design spec — component behavior is specified; colors, typography, and layout polish are not.

---

### Feature 0.4.4 — Operational Dashboard View

**Objective:** Provide Admin users with pipeline health monitoring and golden test suite status. Answers: "Is the evaluation pipeline healthy, and can we trust the scores?"

**Spec Source:** DS §5.3, §6.6, §6.7

**Inputs:** Pipeline run data, golden test run data from DataProvider.

**Outputs:** Rendered operational dashboard.

**Key Requirements:**

**Pipeline Status component:**
- Four summary stat cards: Total Runs, Success Rate, Avg Latency, Avg Cost
- Success rate coloring: ≥ 95% green, 90–94% amber, < 90% red
- Latency coloring: ≤ 15s green, 15–25s amber, > 25s red
- Error table: most recent 10 errors, sorted by timestamp descending

**Golden Test Status component:**
- Status indicator: green checkmark (pass) or red X (fail)
- MAD trend chart: line chart of last 10 runs, horizontal threshold line at 0.5
- Drift alert: amber warning badge if drift detected
- Consecutive failures: red alert if > 1 consecutive failure

**Acceptance Criteria:**

1. Pipeline health cards display correct stats from audit data.
2. Color coding matches the defined thresholds.
3. Golden test status reflects latest run pass/fail.
4. MAD trend line renders with threshold reference.
5. Dashboard is inaccessible to non-Admin users.

**Dependencies:** Features 0.3.6 (audit trail), 0.3.7 (golden test), 0.4.1, 0.4.2.

**Scope Boundaries:** No alerting infrastructure (no email/Slack notifications for failures). Dashboard is passive/pull-based.

---

### Feature 0.4.5 — Dashboard API Endpoints

**Objective:** Serve transformed data from the backend to the dashboard frontend via REST endpoints.

**Spec Source:** DS §7, TS §9.1.1

**Inputs:** Query parameters (filters, pagination, window).

**Outputs:** JSON response bodies.

**Key Requirements:**

All endpoints require Admin role. Unauthenticated → 401. Test-Taker → 403.

| Endpoint | Query Params | Response |
|---|---|---|
| `GET /api/dashboard/ranking` | organization, after, before, classification, page, pageSize | Paginated `RankedProfile[]` with total count |
| `GET /api/dashboard/distributions` | organization, after, before, classification | fitness[], classification[], compositeHistogram[], sectionDistributions[] |
| `GET /api/dashboard/heatmap` | organization, limit (default 50) | individuals[], sections[], cells[] |
| `GET /api/dashboard/individual/{response_id}` | — | Full shaped drill-down object |
| `GET /api/dashboard/ops/pipeline-health` | windowHours (default 168) | PipelineHealth object |
| `GET /api/dashboard/ops/golden-test-status` | — | GoldenTestStatus object |

**Acceptance Criteria:**

1. All endpoints return correctly shaped JSON matching the response schemas in DS §7.
2. Filters correctly narrow results.
3. Pagination works correctly with page/pageSize params.
4. Auth middleware rejects unauthorized requests.
5. Endpoints perform acceptably (<2s load time for populations up to 500).

**Dependencies:** Features 0.4.1, 0.4.2 (data + transforms), Feature 0.2.5 (auth middleware).

**Scope Boundaries:** Thin wrappers in v1.0 (JSON file reads). When database is introduced (v2.2), endpoints remain stable — only the underlying provider changes.

---

## v0.5 — Pilot Program

**Milestone Gate:** Score distribution discriminates meaningfully (no ceiling/floor effects). Founders confirm Responder Profiles are directionally correct for known participants. All pilot-driven issues documented.

**Prerequisites:** v0.1 through v0.4 all operational.

---

### Feature 0.5.1 — Pilot Setup & Recruitment

**Objective:** Recruit 5–8 volunteers across the three organizations and prepare the controlled administration environment.

**Spec Source:** FS §7.5, VR §3

**Inputs:** List of potential volunteers from ENESOL, DataForge, Datacracy.

**Outputs:** Confirmed participant list, scheduled sessions, environment checklist.

**Key Requirements:**

- 5–8 volunteers, 2–3 per organization, diverse roles (not all engineers, not all managers).
- Domain allowlist already configured (Feature 0.2.2) for all three org domains.
- Each participant logs in via Email OTP on the live platform.
- Controlled environment: quiet setting, stable internet, no external resources.
- Pilot coordinator communicates expectations (timing, single sitting, no AI tools).

**Acceptance Criteria:**

1. 5–8 participants confirmed across 3 organizations.
2. All participants can log in via Email OTP.
3. Administration instructions documented and shared.

**Dependencies:** Features 0.2.1–0.2.3 (auth and assessment delivery functional).

**Scope Boundaries:** This is not a statistical study. No formal sample size calculations. Pilot is a validation check, not a research experiment.

---

### Feature 0.5.2 — Assessment Administration & Data Collection

**Objective:** Administer the live assessment to pilot participants and collect both assessment data and structured feedback.

**Spec Source:** FS §7.5, VR §3

**Inputs:** Pilot participants taking the assessment.

**Outputs:** Complete assessment responses, Responder Profiles, participant feedback.

**Key Requirements:**

- Each participant takes the full 5-section assessment on the live platform.
- Pipeline scores responses and generates Responder Profiles.
- Structured feedback collected on: timing (too fast/slow per section), question clarity, perceived fairness, difficulty, UX issues.
- Audit trail analyzed: are prompts scoring consistently? Any anomalous question results?

**Acceptance Criteria:**

1. All participants complete the assessment without technical failures.
2. All responses produce Responder Profiles within 30 seconds.
3. Structured feedback collected from all participants.
4. Audit trail reviewed for scoring consistency.

**Dependencies:** All of v0.1–v0.4 operational.

**Scope Boundaries:** No formal psychometric analysis. No inter-rater reliability calculations (there are no human raters).

---

### Feature 0.5.3 — Validation Analysis

**Objective:** Analyze pilot results to confirm the assessment discriminates meaningfully and profiles are directionally accurate.

**Spec Source:** FS §7.5 Steps 3–4, VR §3

**Inputs:** Pilot assessment data, Responder Profiles, participant feedback.

**Outputs:** Validation report with findings and recommended adjustments.

**Key Requirements:**

**Score distribution analysis:**
- Check for ceiling effects (most scores clustered at top) and floor effects (most at bottom).
- Questions should differentiate across skill levels — no questions that everyone gets right or everyone gets wrong.
- Section scores should show meaningful variance.

**Founder profile review (informal sanity check):**
- Founders read generated Responder Profiles for participants they know personally.
- Check: "Does this profile make sense for someone I know?"
- This is NOT formal scoring, NOT statistical agreement calculation, NOT rubric-level re-scoring.
- It's a gut check: is the AI directionally correct about this person's strengths and weaknesses?

**Content adjustments:**
- Ambiguous questions revised based on feedback.
- Timing adjusted if participants consistently run out of time or finish too quickly.
- Scoring recalibrated if distributions show problems.

**Acceptance Criteria:**

1. Score distribution shows meaningful spread (not clustered at ceiling or floor).
2. Each section shows variance — no section with all scores in the same classification tier.
3. Founders confirm profiles are "directionally correct" for known participants.
4. All identified issues documented with proposed fixes.
5. Fixes applied during v0.6–v0.9 reserved window before v1.0 lock.

**Dependencies:** Feature 0.5.2 (data must be collected).

**Scope Boundaries:** Pilot validation is qualitative. Formal psychometric validation (item response theory, factor analysis) is not in scope for v1.0.

---

## Cross-Cutting Specifications

These apply across multiple version blocks.

---

### Data Immutability Rules

| Data Type | Mutability | Rule |
|---|---|---|
| Raw responses | Immutable | Never overwritten, deleted, or modified after submission |
| Objective scores | Immutable | Deterministically computed; re-computation always produces identical results |
| Open-ended AI scores | Append-only | New evaluations stored as new versions; previous preserved |
| Responder Profiles | Versioned | Each synthesis creates a new version; previous retained |
| Calibration params | Append-only | Each update creates new snapshot; `current.json` is latest pointer |
| Assessment content | Read-only at runtime | Checked into source control; never modified by the application |
| Audit trail | Append-only | Write once, never update, never delete |

---

### File System Layout (Runtime Data)

```
data/
├── responses/{response-id}.json        # Immutable assessment responses
├── profiles/
│   ├── {response-id}.json              # Latest Responder Profile
│   └── {response-id}.v{n}.json         # Previous versions (audit)
├── calibration/
│   ├── current.json                    # Latest calibration params
│   └── history/{calibration-id}.json   # Historical snapshots
├── pipeline/runs/{run-id}.json         # Pipeline execution metadata
├── golden-tests/
│   ├── golden-responses.json           # 20 AI-calibrated golden responses
│   └── runs/{run-id}.json              # Golden test run results
├── audit/{date}/{call-id}.json         # Individual LLM call logs
└── users/{user-id}.json                # User records
```

---

### API Endpoint Summary (All v1.0)

| Group | Endpoint | Method | Auth |
|---|---|---|---|
| **Auth** | `/api/auth/otp/request` | POST | Public |
| | `/api/auth/otp/verify` | POST | Public |
| | `/api/auth/logout` | POST | Authenticated |
| **Assessment** | `/api/assess/start` | POST | Test-Taker+ |
| | `/api/assess/submit` | POST | Test-Taker+ |
| **Pipeline** | `/api/evaluate` | POST | Internal |
| | `/api/evaluate/{id}/status` | GET | Admin |
| | `/api/evaluate/{id}/re-evaluate` | POST | Admin |
| **Calibration** | `/api/calibration/rescore` | POST | Admin |
| **Dashboard** | `/api/dashboard/ranking` | GET | Admin |
| | `/api/dashboard/distributions` | GET | Admin |
| | `/api/dashboard/heatmap` | GET | Admin |
| | `/api/dashboard/individual/{id}` | GET | Admin |
| | `/api/dashboard/ops/pipeline-health` | GET | Admin |
| | `/api/dashboard/ops/golden-test-status` | GET | Admin |
| **Golden Test** | `/api/golden-test/run` | POST | Admin |
| | `/api/golden-test/runs` | GET | Admin |
| | `/api/golden-test/runs/{id}` | GET | Admin |
| | `/api/golden-test/status` | GET | Admin |
| **Admin** | `/api/admin/domains` | GET/POST | Admin |
| | `/api/admin/domains/{domain}` | DELETE | Admin |
| | `/api/admin/users` | GET | Admin |
| | `/api/admin/users/{id}/role` | PATCH | Admin |

---

### Success Criteria (from FS §9)

1. **Discrimination** — Score distributions differentiate across skill levels (no ceiling/floor effects).
2. **Reliability** — AI-scored open-ended responses are consistent: ≤ 0.5 MAD across models in golden test cross-validation on the 0–5 scale.
3. **Speed Integrity** — Timing data reveals genuine thinking speed, not gaming behavior.
4. **Anti-Gaming** — Variant rotation, hidden timers, and plausible distractors prevent strategy-based scoring.
5. **Actionability** — Per-section breakdown and Responder Profile guide coaching, not just pass/fail.
6. **AI Evaluation Reliability** — Validated through golden test suite (TS §14), not human-vs-AI comparison.

---

*Document: 02_FUNCTIONAL_SPECS.md*
*Version: 1.3*
*Created: February 2026*
*Updated: April 2026*
*Source: Synthesized from CORE Assessment Functional Spec v2.4, AI Evaluation Technical Spec v1.5, Dashboard Module Spec v1.2, Versioning Roadmap v1.2, Future Backlog Spec v2.2, UI Experience Spec v1.0, Design Philosophy v1.0, assessment-meta.json, Question Bank Summary*
*Repository: [github.com/enesol-julio/core-assessment](https://github.com/enesol-julio/core-assessment)*
*Local path: `/Users/jutuonair/GDrive/ProductDevelopment/core-assessment`*
