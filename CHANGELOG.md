# CORE Assessment Platform — Changelog

## [Unreleased]

### Spec Updates — April 2026 (Pre-Build)

#### Architecture: PostgreSQL from Day One
- **PostgreSQL 16 replaces JSON file storage** for all structured data (users, responses, profiles, calibration, golden tests, sessions, OTP tokens)
- **Drizzle ORM** added as the database layer — type-safe schema, queries, and migration generation
- **New `src/db/` directory** — schema definitions, connection client, migration runner, seed data
- **Migration files committed to repo** in `drizzle/` — auto-run in dev mode, explicit in production deploy
- **`data/` directory repurposed** — now holds only operational artifacts: audit trail (LLM call logs), pipeline traces, backups, temp files. No longer stores application data.
- **DataProvider implementation** — v1.0 ships with `PostgresProvider` (was planned as `JsonFileProvider` with database swap in v2.2)
- **Deploy workflow updated** — now includes `npx drizzle-kit migrate` before build
- **New Feature 0.1.6** — Database Schema & Migrations added to v0.1 milestone scope
- **Scripts reorganized** — `scripts/db/` (setup, seed, backup, restore), `scripts/deploy/` (EC2), `scripts/validate/` (content)
- **Future Backlog updated** — "Database Migration" moved from v2.2 to "Already in v1.0"; v2.2 becomes "Cloud Database Migration" (connection string swap)

#### Assessment Content & Design
- **3 new AI-output questions** added to Section 5 (s5-q11, s5-q12, s5-q13): ticketing migration requirements, hiring data causal analysis, onboarding plan scope creep
- **Section 5 pool increased** 10→13 questions; AI-output minimum constraint increased ≥1→≥2 per served set
- **All 15 `sample_strong_response` entries authored** across S2, S3, S4, S5 — these serve as golden test calibration baselines
- **Rubric criteria sharpened** on 9 open-ended questions (S2 q06–q09, S3 q10–q11, S5 q06–q07–q10) with orchestrator-level thinking patterns
- **Section presentation order changed** — S1 (Recognition) → S4 (Reasoning) → S3 (Observation) → S2 (Decomposition) → S5 (Validation). Grounded in question-order-effects research. Section file names unchanged; `order` field in `assessment-meta.json` controls presentation.
- **Vibe-Coding Fitness Rating descriptors enriched** with behavioral predictions from orchestrator workflow patterns
- **AI synthesis prompt strengthened** (TS v1.5 §6.2) with orchestrator skill vocabulary
- **Total question count: 67→70**

#### New Specification Documents
- **CORE Assessment Design Philosophy v1.0** — 7 cognitive patterns, section mapping matrix, "Exceptional" behavioral definitions
- **CORE UI Experience Specification v1.1** — Screen-by-screen test-taker experience, timer behavior, accessibility, responsive design, edge cases
- **CORE Sample Response Authoring Guide v1.0** — Worked examples, authoring checklist, golden test connection

#### Multilingual (English + Spanish)
- **Translation overlay architecture** — English is canonical single source of truth; Spanish stored as overlay files in `content/translations/es/` with only translated fields, merged at runtime
- **UI string externalization** — all user-facing text in `content/ui-strings/{lang}.json`, never hardcoded in components
- **Domain-based language defaults** — `evaluacion.datacracy.co` → Spanish, others → English. User can override at login.
- **Language selector on login screen** — choose language before authentication, locked for duration of assessment
- **AI scoring handles Spanish responses** — same English rubric, cross-language evaluation by Claude
- **New Feature 0.2.6** added to v0.2 scope: Multilingual Support
- **`assessment-meta.json` updated** with `supported_languages`, `default_language`, `domain_language_defaults`

#### Spec Version Bumps
- Functional Spec: v2.2 → v2.4
- AI Evaluation Technical Spec: v1.3 → v1.5
- Dashboard Module Spec: v1.1 → v1.2
- Future Backlog Spec: v2.1 → v2.2
- Versioning Roadmap: v1.1 → v1.2
- CLAUDE.md: v1.0 → v1.2
- specs/00_PROJECT_OVERVIEW.md: v1.0 → v1.2
- specs/01_ARCHITECTURE.md: v1.2 → v1.4
- specs/02_FUNCTIONAL_SPECS.md: v1.1 → v1.3
- specs/03_UI_EXPERIENCE.md: new (v1.1)

---

## [v0.1.2] - 2026-02-26
### Added
- 5 section definition files in `content/sections/`
  - `section-1-rapid-recognition.json` — 20 single_select questions (speed round, 30s visible timer)
  - `section-2-problem-decomposition.json` — 6 drag_to_order + 4 open_ended (hidden timers)
  - `section-3-critical-observation.json` — 8 multi_select + 4 open_ended (hidden timers)
  - `section-4-logical-reasoning.json` — 12 single_select + 3 open_ended (mixed timers, quick/deep subtypes)
  - `section-5-output-validation.json` — 6 multi_select + 4 open_ended (hidden timers, human/ai output_source)
- 67 total questions with schema-complete structure and placeholder content
- Selection constraints per section (random, constrained_random with type/subtype rules)
- Standard 6-level rubric template on all 15 open_ended questions
- All 8 acceptance criteria validated and passing

### Removed
- `content/sections/.gitkeep` — replaced by actual section files

## [v0.1.1] - 2026-02-25
### Added
- Assessment metadata file (`content/assessment-meta.json`)
- Root configuration: assessment identity, version, global settings
- 5-section definition with weights summing to 1.0 (0.15, 0.25, 0.25, 0.20, 0.15)
- Classification tiers: Exceptional, Proficient, Developing, Foundational, Needs Significant Development
- Scoring configuration: weighted_average composite, 0–100 scale
- Evaluation config with scoring-by-type rules (binary, partial_credit, positional, rubric)
- Speed metrics, anti-gaming, and administration settings
- All 8 acceptance criteria validated and passing

### Scaffold (prior)
- Project scaffolded with Next.js 14+, TypeScript, Tailwind CSS
- Canonical folder structure created
- CLAUDE.md placed at project root
