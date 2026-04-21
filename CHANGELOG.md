# CORE Assessment Platform — Changelog

## [Unreleased]

### Documentation — April 2026
- README.md rewritten as the project README with quick-start, env var table, script catalog, architecture summary
- docs/AZURE_APP_REGISTRATION_SETUP.md, docs/M365_GRAPH_SETUP.md: env var names corrected to match shipping code (`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `EMAIL_FROM`) — earlier drafts used a `GRAPH_*` prefix that never existed in the code
- docs/M365_GRAPH_SETUP.md: reflects that `src/lib/auth/email.ts` is already implemented with GraphSender + DevConsoleSender fallback
- CLAUDE.md §13: restructured into in-repo docs (authoritative), source specs (distilled), and operator guides; removed stale RUNBOOK reference; UI Experience Spec bumped v1.0 → v1.1 to match its file version

### v0.5 — Pilot Harness (infrastructure layer)
- New `pilot_feedback` table (0001_pilot_feedback migration): overall/clarity/difficulty/fairness ratings 1–5, four free-text fields, unique on `response_id`
- `POST /api/pilot/feedback` — authenticated test-takers or admins submit feedback tied to their own response; 409 on duplicate
- `PilotFeedbackForm` client component rendered on the `/complete` page so participants can submit feedback immediately after the assessment
- `npm run pilot:readiness` — structured checklist: env vars, production-safety guard, admin seeded, allowed domains, content loads EN+ES (70 questions), pipeline provider detected, golden tests seeded, pilot_feedback reachable. Exits 1 on any failure so CI can gate the pilot start
- `npm run pilot:seed-golden` — bootstraps the 20 golden test responses (idempotent)
- `npm run pilot:simulate -- --n=8` — simulates 5-8 participants end-to-end (submit → evaluate → feedback) under the fixture provider so the dashboard can be exercised without real humans
- `npm run pilot:validate` — post-hoc analysis: classification / fitness distributions, 5-point histogram, section variance (flags std < 7), optional pilot-feedback aggregation, exits 1 on high-severity findings (ceiling/floor effects above 60%)
- Non-automatable pieces deferred to the operator: real participant recruitment, controlled-environment administration, founder subjective review of profiles for known participants. Those are documented as v0.5.1 and v0.5.3 human work in the Functional Spec

### v0.4.1–0.4.5 — Dashboard & Reporting (data, transforms, APIs, UI)
- `DataProvider` interface at `src/services/dashboard/interfaces/data-provider.ts`; `PostgresProvider` at `src/services/dashboard/providers/postgres-provider.ts` pushes organization/classification/fitness/date filters into SQL WHERE clauses; returns latest-version-per-response summaries
- Transforms in `src/services/dashboard/transforms/` — pure functions only:
  - `ranking.ts` — fitness tier (Strong Fit=1 … Not Yet Ready=5) → composite desc → name alphabetical
  - `distributions.ts` — fitness + classification distributions (with color), 5-point histogram bucketing, per-section stats (mean/median/stddev)
  - `heatmap.ts` — individuals×sections matrix with colour bands matching classification tiers
  - `individual.ts` — shapes a profile into the drill-down view including population-mean reference
  - `operations.ts` — pipeline health with colour-coded tones and last-10-MAD drift detection
- Admin-gated API routes: `GET /api/dashboard/ranking` (paginated), `GET /api/dashboard/distributions`, `GET /api/dashboard/heatmap`, `GET /api/dashboard/individual/{id}`, `GET /api/dashboard/ops/pipeline-health`, `GET /api/dashboard/ops/golden-test-status`
- Dashboard UI at `/dashboard` (server-rendered: summary cards, composite histogram, fitness + classification distribution bars, ranking table, section heatmap) and `/dashboard/{response_id}` (client-side radar chart via Recharts, cognitive profile, fitness, recommendations, speed, red flags)
- Operational UI at `/ops` — 4 summary cards with threshold-based colour tones (success rate, latency, cost), golden test status with MAD trend sparkline and drift / consecutive-failures badges, recent-error list
- Settings UI at `/settings` with `DomainsSettings` client component (idempotent add, delete with last-domain guard via API)
- Installed `recharts@^3.8.1`
- Smoke `npm run smoke:dashboard` confirms: listProfiles returns 5 summaries, ranking invariants (fitness tier monotonically non-decreasing), 20-bucket histogram sums to n, heatmap 5×5=25 cells, filter pushdown rejects unknown classification, pipeline health success rate 1.0 over the 5-run window
- `next build`: 30 routes registered (25 API + 5 pages)

### v0.3.5, 0.3.7, 0.3.8 — Calibration, Golden Tests, Pipeline API
- Calibration (`src/services/pipeline/calibration/params.ts`): `MIN_CALIBRATION_SAMPLE=10`; computes composite stats (mean, median, std_dev, quartiles) + per-section stats + per-section raw score distributions (used by step 2 percentiles). `updateCalibrationSnapshot()` is transactional and maintains exactly one `is_current = true` snapshot
- Calibration auto-updates after every successful pipeline run once `countProfiles() >= 10` — `batch_rescore` triggers are excluded to avoid snapshot storms
- Batch re-scoring (`src/services/pipeline/calibration/batch-rescore.ts`) supports `scope="all"` or explicit response_ids with configurable concurrency; reports per-response failures
- Golden tests (`src/services/pipeline/golden-test/runner.ts`, `seed.ts`): seeds 10 bootstrap responses from authored `sample_strong_response` fields with synthetic degradation across quality tiers 5→1; runs parallel scoring under the audited provider; computes MAD, range compliance rate, extreme-miss count; passes iff `MAD ≤ 0.5`, `range ≥ 90%`, `extreme_miss = 0`; `goldenStatus()` derives drift alert from trailing-10-run MAD average
- Pipeline API endpoints (all admin-only):
  - `POST /api/evaluate` — trigger pipeline for a response_id
  - `GET /api/evaluate/{response_id}/status` — status + profile count
  - `POST /api/evaluate/{response_id}/re-evaluate` — full 3-step re-run
  - `POST /api/calibration/rescore` — batch re-score
  - `POST /api/golden-test/run` (`?seed=true` seeds first), `GET /api/golden-test/runs`, `GET /api/golden-test/runs/{id}`, `GET /api/golden-test/status`
- Smoke `npm run smoke:v03` validates: calibration stays null below n=10, snapshot created at exactly n=10, subsequent snapshots supersede with exactly one is_current row, re-evaluated profile picks up percentile_rank + relative_fitness_tier, batch-rescore succeeds, golden test runs materialize with all three metrics computed
- `next build` succeeds with 20 routes registered

### v0.3.1–0.3.4, 0.3.6 — Pipeline Core (orchestrator + providers + audit + steps + synthesis)
- Added `src/services/pipeline/providers/` — `LLMProvider` interface, `AnthropicProvider` (native SDK, auto-cost by model), `FixtureProvider` (deterministic synthetic scores + profiles for dev/test without API keys), `AuditedProvider` wrapper that logs every call to `data/audit/{date}/{audit_id}.json` with retry (3 attempts, exponential backoff) and SHA-256 prompt hash for exact-reproduction reference
- `detectProvider()` picks `fixture` when `ANTHROPIC_API_KEY` is unset/placeholder or `PIPELINE_PROVIDER=fixture`; otherwise `anthropic`
- Step 1 (`steps/step1-scoring.ts`): parallel LLM scoring for every open-ended response; model Sonnet (temp 0.1); output validated against `ScoreResultSchema` with clamp fallback
- Step 2 (`steps/step2-aggregation.ts`): deterministic aggregation — converts rubric scores to objective-equivalent points, computes section raw scores (0–100), composite weighted average, classification, speed profile (ratios + stddev), populates percentile rank if calibration present
- Step 3 (`steps/step3-synthesis.ts`): single Opus call (temp 0.4) returning full Responder Profile content; robust parse that unwraps fixture's envelope; pads missing section_analysis entries with fallback narratives
- Orchestrator (`pipeline.ts`): writes `pipeline_runs` row, advances status pending → scoring → aggregating → synthesizing → complete; on failure captures `error_message`; profiles persisted to DB with versioning (unique on response_id + profile_version)
- Prompts live in `prompts/scoring-prompt.ts` and `prompts/synthesis-prompt.ts`, versioned (`v1.0.0`)
- Schemas: `schemas/score-result.ts`, `schemas/responder-profile.ts`
- Installed `@anthropic-ai/sdk@^0.90.0`
- Smoke `npm run smoke:pipeline` runs full submit → evaluate → re-evaluate flow against the fixture provider: 54 audit records written, profile_version increments correctly on re-eval (1 → 2), both versions retained, raw response immutable, pipeline_runs row transitions to `complete`

### v0.2.3 — Assessment Session Flow
- Added `src/services/assessment/` — `start.ts` (loads content, selects served questions, strips answer-revealing fields before returning to client), `submit.ts` (validates submission, computes speed flags, auto-scores objective questions, writes to `responses` table, open-ended scores remain null for the pipeline)
- Client submission schema in `src/lib/types/assessment-submit.ts`
- API routes: `POST /api/assess/start` (auth required), `POST /api/assess/submit` (auth required), `GET /api/content/ui-strings?lang=en|es`
- UI components: `LoginClient` (OTP request/verify flow with language toggle), `AssessmentRunner` (briefing → section intros → per-question flow with visible/hidden timer, auto-advance at 0s, order-picker, text area with char limit)
- Pages: `src/app/page.tsx` (language defaults by host, redirects authenticated users to `/assess` or `/dashboard`), `src/app/(assessment)/assess/page.tsx`, `src/app/(assessment)/complete/page.tsx`
- Build guard: `authBypassEnabled()` no longer throws during `next build` static prerender (NEXT_PHASE detection); still throws at production server runtime
- Smoke `npm run smoke:assess` verifies no answer-revealing fields leak to the client, 34 served questions, objective auto-scoring, open-ended null scores, full response persisted as `responseData` JSONB
- Production build (`next build`) passes: 13 routes, all dynamic routes detected correctly

### v0.2.6 — Content Loader with i18n Overlay
- Added `src/lib/content/index.ts` — `loadAssessmentMeta`, `loadSection`, `loadAssessment` merge Spanish overlays from `content/translations/es/` onto the English base with silent fallback for missing translations
- UI string loading (`loadUiStrings`, `uiString`, `interpolate`) with fallback to English and `{token}` replacement
- Added `src/lib/content/selection.ts` — rejection-sampling + constructive fallback to satisfy overlapping selection constraints (e.g. S5: type=multi_select ≥ 2, type=open_ended ≥ 2, output_source=ai ≥ 2, count=5)
- Assessment sections returned in the presentation order dictated by `assessment-meta.json` (S1→S4→S3→S2→S5)
- Smoke `npm run smoke:content` covers EN/ES overlay merge, question prompt/option translation, section ordering, selection constraints across S1/S2/S5, UI string fallback, interpolation

### v0.2.5 — Role-Based Route Protection
- Added `src/app/(admin)/layout.tsx` — server-side gate that redirects unauthenticated visitors to `/?from=admin` and non-admins to `/?forbidden=1`
- `requireAdmin`/`requireAuth` in `src/lib/auth/middleware.ts` return 401/403 JSON for API routes
- All admin API routes built so far (`/api/admin/domains`, `/api/admin/domains/{domain}`) wired through `requireAdmin`; future pipeline, dashboard, and golden-test routes will do the same
- Smoke script `npm run smoke:auth-gate` verifies JWT signing/verification, role encoding (`admin` vs `test_taker`), and tampered-token rejection

### v0.2.4 — Deterministic Scoring Engine
- Added `src/lib/scoring/index.ts` — pure functions for `scoreSingleSelect`, `scoreMultiSelect`, `scoreDragToOrder`, `scoreFromRubric`, `sectionRawScore`, `compositeScore`, `classify`
- Multi-select: `max(0, (correct/total_correct) − incorrect × 0.25) × maxScore` per spec
- Drag-to-order: full credit at correct position, 50% for off-by-1 within tolerance, 0 otherwise
- Classify uses `Math.floor(composite)` to handle fractional composites cleanly against integer tier boundaries (e.g. 54.999 → Foundational)
- Smoke script `npm run smoke:scoring` covers spec examples (3-of-4 with/without incorrect, adjacent-swap partial credit, classify at boundaries)

### v0.2.2 — Domain Allowlist Management
- Added `src/lib/auth/domains.ts` — validate, normalize, list, add (idempotent), remove (with safety guard against removing last domain)
- API routes (all admin-only): `GET /api/admin/domains`, `POST /api/admin/domains`, `DELETE /api/admin/domains/{domain}`
- Domain format validation: rejects whitespace, `@`, wildcards, invalid TLDs; strips leading `@` and normalizes case
- Smoke script `npm run smoke:domains` covers validation, idempotency, and the last-domain guard (passing)

### v0.2.1 — Email OTP Authentication
- Added `src/lib/auth/` — `config.ts`, `otp.ts`, `session.ts`, `email.ts`, `middleware.ts`
- OTP flow: 6-digit codes, 10-min expiry, single-use, domain allowlist check, JWT session via `jose`, secure cookie, 4-hr default expiry
- Email sender: `GraphSender` (production, via `@azure/msal-node` client credentials) with automatic fallback to `DevConsoleSender` (logs OTP to stdout + `data/audit/otp/`) when Azure creds are unset
- API routes: `POST /api/auth/request-otp`, `POST /api/auth/verify-otp`, `POST /api/auth/logout`, `GET /api/auth/session`
- `AUTH_BYPASS=true` in development auto-seeds the admin session, throws at startup if leaked to production
- Smoke script `npm run smoke:auth` exercises OTP issue/consume/expire/reuse, user find-or-create, JWT round-trip, session revoke (all passing against live Postgres)
- Installed `jose`, `@azure/msal-node`, `tsx` (dev)

### v0.1.0 — Milestone Gate Closed
- All six v0.1 features complete and acceptance-validated
- 70 questions authored, schemas defined, content validator passing
- PostgreSQL 16 schema live: 10 tables materialized, seed confirmed, second-migration generate/apply/rollback verified end-to-end

### v0.1.6 — Database Schema & Migrations (Drizzle ORM)
- Added `src/db/schema.ts` with 10 Drizzle-typed tables: `users`, `sessions`, `otp_tokens`, `responses`, `profiles`, `calibration_snapshots`, `pipeline_runs`, `golden_test_responses`, `golden_test_runs`, `allowed_domains`
- Indexes per DS §8.4: `profiles` indexed on `organization`, `fitness_rating`, `classification`, `completed_at`, `composite_score DESC`, plus composite unique on `(response_id, profile_version)`; `responses` on `user_id`, `completed_at`; `pipeline_runs` on `response_id`, `status`; `calibration_snapshots` on `is_current`
- Foreign keys: `sessions.user_id` (cascade), `responses.user_id` (restrict), `profiles.{response_id,user_id}` (cascade/restrict), `pipeline_runs.response_id` (cascade)
- Added `drizzle.config.ts` (PostgreSQL dialect, output to `drizzle/`)
- Generated initial migration `drizzle/0000_initial_schema.sql` via `drizzle-kit generate`
- Added `src/db/index.ts` (pool + drizzle client, singleton), `src/db/migrate.ts` (migration runner), `src/db/seed.ts` (idempotent admin + domain seed)
- Added `src/instrumentation.ts` — Next.js instrumentation hook that auto-runs migrations in development (gated on `NODE_ENV` and `DATABASE_URL`)
- npm scripts: `db:generate`, `db:migrate`, `db:seed`, `db:drop`, `db:studio`
- Added `DATABASE_URL` to `.env.example`
- Installed `drizzle-orm@^0.45.2`, `pg@^8.20.0`, `drizzle-kit@^0.31.10`, `@types/pg`

### v0.1.5 — Schema Validation Tooling
- Added `scripts/validate/content.ts` — validates `assessment-meta.json` and all 5 section files against Zod schemas
- Added `src/lib/types/assessment-meta.ts` and `src/lib/types/section.ts` with canonical schemas (reused at runtime by content loaders)
- Cross-validation: section `file` references exist, pool counts match meta, type sets match, per-section `question_id` prefix matches, classification tiers cover 0–100 with no gaps/overlaps, weights sum to 1.0
- `npm run validate:content` script entry, exit code 1 on validation errors
- Enabled `allowImportingTsExtensions` in `tsconfig.json` so Node 25 can run TypeScript directly without a build step

### v0.1.3 — Question Content Authoring (Confirmed Complete)
- Audit: 70 base questions across 5 sections (s1-q01 … s5-q13)
- Type distribution: single_select=32, multi_select=16, drag_to_order=6, open_ended=16
- Difficulty distribution: easy=6, medium=35, hard=29
- All open-ended questions have `sample_strong_response` and ≥3 rubric criteria
- All multi_select questions have more options than correct answers

### v0.1.4 — Assessment Response Schema
- Added `src/lib/types/assessment-response.ts` with Zod schemas
- Discriminated union on `type` for `single_select`/`multi_select`/`drag_to_order`/`open_ended` question responses
- Response-level invariants: 5 sections exactly, UUID `response_id`, session `completed_at >= started_at`
- `ai_evaluation` slot typed to accept pipeline Step 1 score results (null at submission)
- Includes `session.language` (`en`/`es`) for multilingual session context
- Installed `zod@^4.3.6`

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
