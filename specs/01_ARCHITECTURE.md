# CORE Assessment Platform — System Architecture

## Document 01 · Single Source of Truth for System Structure

---

## 1. System Architecture Overview

The CORE Assessment Platform is a Next.js monolith with three major subsystems: an assessment delivery web application, an AI evaluation pipeline, and an embedded admin dashboard. All three share a single codebase, a single authentication system, and a single storage layer.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BROWSER (React/Next.js)                         │
│                                                                         │
│  ┌──────────────┐  ┌──────────────────┐  ┌─────────────────────────┐   │
│  │  Assessment   │  │  Admin Dashboard │  │  Admin Settings         │   │
│  │  Delivery UI  │  │  (Manager + Ops) │  │  (Domains, Roles, etc.) │   │
│  └──────┬───────┘  └────────┬─────────┘  └───────────┬─────────────┘   │
└─────────┼──────────────────┼────────────────────────┼──────────────────┘
          │                  │                        │
          ▼                  ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS API LAYER (Route Handlers)                   │
│                                                                         │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐    │
│  │  /api/assess/*   │  │  /api/evaluate/*  │  │  /api/dashboard/*  │    │
│  │  /api/auth/*     │  │  /api/profiles/*  │  │  /api/golden-test/*│    │
│  │                  │  │  /api/calibration/*│  │  /api/admin/*      │    │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬───────────┘    │
└───────────┼─────────────────────┼──────────────────────┼───────────────┘
            │                     │                      │
            ▼                     ▼                      ▼
┌─────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  AUTH MIDDLEWARE     │ │  AI EVALUATION       │ │  DASHBOARD MODULE    │
│  ─────────────      │ │  PIPELINE            │ │  ──────────────      │
│  Email OTP          │ │  ────────            │ │  DataProvider        │
│  Domain allowlist   │ │  Step 1: Scoring     │ │  → Transforms        │
│  Session (JWT)      │ │  Step 2: Aggregation │ │  → Presentation      │
│  Role enforcement   │ │  Step 3: Synthesis   │ │  (Tremor + Recharts) │
│  (Admin/Test-Taker) │ │  (Anthropic/OpenAI)  │ │                      │
└─────────┬───────────┘ └──────────┬───────────┘ └──────────┬───────────┘
          │                        │                        │
          ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     STORAGE LAYER                                        │
│                                                                         │
│  PostgreSQL 16 (Drizzle ORM):                                          │
│    users, sessions, responses, profiles, calibration_snapshots,        │
│    pipeline_runs, golden_test_responses, golden_test_runs, otp_tokens  │
│                                                                         │
│  Filesystem:                                                            │
│    content/assessment-meta.json  content/sections/*.json  prompts/*.ts │
│    data/audit/  data/traces/  data/backups/                            │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key architectural properties:**

- **Monolith by design.** Zero additional infrastructure in v1.0. The pipeline, dashboard, and web app are all routes/services inside one Next.js application.
- **Auth from day one.** Email OTP authentication with domain-based allowlist. Two roles: Admin (full access) and Test-Taker (assessment only). No anonymous access.
- **PostgreSQL with DataProvider abstraction.** Structured data (users, responses, profiles, calibration, golden tests, sessions) lives in PostgreSQL 16 via Drizzle ORM. Audit trail and operational artifacts live on the filesystem (`data/`). All consumers access data through the `DataProvider` interface — cloud database migration requires only a connection string change.
- **AI pipeline runs async.** Assessment submission persists the response immediately, then triggers the evaluation pipeline asynchronously. The user sees a confirmation screen, not a loading spinner.

---

## 2. Component Inventory

### 2.1 Web Application (Assessment Delivery)

| Property | Detail |
|---|---|
| **Responsibility** | Renders the 5-section timed assessment, enforces navigation rules (no back-nav, no pause between sections), captures responses with full metadata (timing, word counts, speed flags, device info) |
| **Location** | `src/app/(assessment)/` for pages; `src/components/assessment/` for UI components; `src/hooks/` for timer and session hooks |
| **Key dependencies** | React, Next.js App Router, Tailwind CSS |
| **Key behaviors** | Per-question timers (visible/hidden/warning modes), auto-advance on timeout, variant selection at question load time, anti-gaming detection (suspicious fast clicks, copy-paste) |

### 2.2 Authentication System

| Property | Detail |
|---|---|
| **Responsibility** | Email OTP login, domain allowlist enforcement, session management (JWT or secure cookie), role-based route protection |
| **Location** | `src/app/api/auth/` for API routes; `src/lib/auth/` for session utils and middleware; `src/app/(admin)/settings/` for domain management UI |
| **Key dependencies** | Microsoft Graph API via `@azure/msal-node` (for OTP email delivery — client credentials flow), JWT library |
| **Key behaviors** | OTP valid 10 min, single-use. Session expires after 4 hrs (configurable). Domain checked at OTP request time. Initial admin: `julio@datacracy.co`. Initial seed domains: `enesol.ai`, `dataforgetechnologies.com`, `datacracy.co` |

### 2.3 AI Evaluation Pipeline

| Property | Detail |
|---|---|
| **Responsibility** | Scores open-ended responses (Step 1), computes section/composite scores (Step 2), synthesizes Responder Profiles (Step 3). Also handles calibration updates, batch re-scoring, and golden test execution |
| **Location** | `src/services/pipeline/` for orchestrator and step logic; `src/services/pipeline/providers/` for LLM abstractions; `src/services/pipeline/calibration/` for calibration logic; `src/services/pipeline/golden-test/` for golden test suite; `prompts/` for prompt templates |
| **Key dependencies** | Anthropic SDK (primary), OpenAI SDK (fallback structure), Zod or equivalent for schema validation |
| **Key behaviors** | Sonnet for scoring (temp 0.1), Opus for synthesis (temp 0.4). Step 1 runs in parallel across all open-ended questions. Pipeline is ~10–25 seconds total. Cost ~$0.10–0.30 per assessment |

### 2.4 Dashboard Module

| Property | Detail |
|---|---|
| **Responsibility** | Admin-only analytics: ranking table, fitness distributions, section heatmaps, score histograms, individual drill-downs, pipeline health monitoring, golden test status |
| **Location** | `src/services/dashboard/` for data providers and transforms; `src/components/dashboard/` for visualization components; `src/app/(admin)/dashboard/` for pages |
| **Key dependencies** | Tremor (dashboard primitives: cards, tables), Recharts (custom charts: histograms, radar, heatmap) |
| **Key behaviors** | Three-layer architecture (data access → transforms → presentation). All transforms are pure functions. No business logic in presentation components |

### 2.5 Assessment Content

| Property | Detail |
|---|---|
| **Responsibility** | Defines the 70-question pool across 5 sections, scoring parameters, timer configs, rubrics, variants structure |
| **Location** | `content/assessment-meta.json` (metadata, section ordering, weights); `content/sections/*.json` (5 section definition files) |
| **Key dependencies** | None (static JSON, read-only at runtime) |
| **Section ordering** | Section files retain original numbering (`section-1-*` through `section-5-*`). The `order` field in `assessment-meta.json` controls presentation order: S1→S4→S3→S2→S5. See `specs/03_UI_EXPERIENCE.md` for rationale. |
| **Distinction** | Assessment content (`content/`) is static JSON on filesystem, version-controlled and bundled with the app. Runtime data (responses, profiles, calibration) lives in PostgreSQL. These are separate concerns. |
| **Key behaviors** | Application loads `assessment-meta.json` first, then loads each section file in order. Variant selection happens at question-render time |

### 2.6 Audit Trail

| Property | Detail |
|---|---|
| **Responsibility** | Structured logging of every LLM call: prompt, model, response, latency, cost, token counts |
| **Location** | `src/services/pipeline/audit/` for logging logic; `data/audit/` for stored logs |
| **Key dependencies** | Pipeline service (wraps every LLM call) |

---

## 3. Folder Structure

The following is the canonical folder structure. Changes from the initially proposed structure are flagged.

```
core-assessment/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── (assessment)/                 # Assessment-taking pages (Test-Taker accessible)
│   │   │   ├── page.tsx                  # Landing / login
│   │   │   ├── assess/                   # Assessment flow pages
│   │   │   └── complete/                 # Post-submission confirmation
│   │   ├── (admin)/                      # Admin-only pages
│   │   │   ├── dashboard/                # Manager/Admin dashboard + drill-down
│   │   │   ├── ops/                      # Operational dashboard
│   │   │   └── settings/                 # Domain allowlist, user roles
│   │   └── api/                          # API route handlers
│   │       ├── auth/                     # OTP request, verify, logout
│   │       ├── assess/                   # Assessment session management
│   │       ├── evaluate/                 # Pipeline trigger, status, re-evaluate
│   │       ├── profiles/                 # Profile retrieval, versioning
│   │       ├── calibration/              # Calibration params, batch re-score
│   │       ├── dashboard/                # Dashboard data endpoints
│   │       ├── golden-test/              # Golden test suite endpoints
│   │       └── admin/                    # Domain/user management
│   │
│   ├── services/                         # Business logic (no UI awareness)
│   │   ├── pipeline/                     # AI evaluation pipeline
│   │   │   ├── pipeline.ts               # Main orchestrator (~200-300 lines)
│   │   │   ├── providers/                # LLM provider abstraction
│   │   │   │   ├── interface.ts          # LLMProvider interface
│   │   │   │   ├── anthropic.ts          # Anthropic SDK wrapper
│   │   │   │   └── openai.ts             # OpenAI SDK wrapper (fallback)
│   │   │   ├── steps/
│   │   │   │   ├── step1-scoring.ts      # Open-ended scoring + prompt assembly
│   │   │   │   ├── step2-aggregation.ts  # Deterministic score computation
│   │   │   │   └── step3-synthesis.ts    # Profile synthesis + prompt assembly
│   │   │   ├── calibration/
│   │   │   │   ├── params.ts             # Calibration parameter computation
│   │   │   │   └── batch-rescore.ts      # Batch re-scoring pipeline
│   │   │   ├── golden-test/
│   │   │   │   ├── runner.ts             # Golden test suite execution
│   │   │   │   ├── cross-validator.ts    # AI cross-validation for consensus
│   │   │   │   └── analyzer.ts           # Pass/fail, drift analysis
│   │   │   ├── audit/
│   │   │   │   └── audit-logger.ts       # Structured LLM call logging
│   │   │   └── schemas/                  # Zod schemas for pipeline I/O validation
│   │   │       ├── score-result.ts
│   │   │       ├── aggregated-scores.ts
│   │   │       └── responder-profile.ts
│   │   │
│   │   └── dashboard/                    # Dashboard business logic
│   │       ├── interfaces/
│   │       │   └── data-provider.ts      # Abstract DataProvider interface
│   │       ├── providers/
│   │       │   └── json-file-provider.ts # v1: reads from disk
│   │       └── transforms/
│   │           ├── ranking.ts            # Fitness tier → composite ordering
│   │           ├── distributions.ts      # Score histograms, classification counts
│   │           ├── heatmap.ts            # Section × individual matrix
│   │           ├── individual.ts         # Individual drill-down shaping
│   │           └── operations.ts         # Pipeline health, golden test metrics
│   │
│   ├── lib/                              # Shared utilities
│   │   ├── auth/                         # Session utils, middleware, OTP logic
│   │   ├── scoring/                      # Deterministic scoring functions
│   │   ├── types/                        # Shared TypeScript types/interfaces
│   │   └── utils/                        # General helpers
│   │
│   ├── components/                       # React components
│   │   ├── assessment/                   # Question renderers, timers, progress
│   │   ├── dashboard/                    # Chart and table components
│   │   │   ├── RankingTable.tsx
│   │   │   ├── FitnessDistribution.tsx
│   │   │   ├── ClassificationBar.tsx
│   │   │   ├── ScoreHistogram.tsx
│   │   │   ├── SectionHeatmap.tsx
│   │   │   ├── RadarChart.tsx
│   │   │   ├── PipelineStatus.tsx
│   │   │   └── GoldenTestStatus.tsx
│   │   ├── admin/                        # Settings, domain management
│   │   └── shared/                       # Layout, navigation, auth gates
│   │
│   └── hooks/                            # Custom React hooks
│       ├── useTimer.ts                   # Per-question countdown logic
│       ├── useAssessmentSession.ts       # Session state management
│       └── useAuth.ts                    # Auth state and role checking
│
├── content/                              # ⚠️ RENAMED from 'data/' for assessment content
│   ├── assessment-meta.json              # Assessment metadata, section ordering, weights
│   └── sections/                         # Section definition files (5 files)
│       ├── section-1-rapid-recognition.json
│       ├── section-2-problem-decomposition.json
│       ├── section-3-critical-observation.json
│       ├── section-4-logical-reasoning.json
│       └── section-5-output-validation.json
│
├── data/                                 # Runtime data (JSON file storage)
│   ├── responses/                        # Raw assessment responses (immutable)
│   ├── profiles/                         # Responder Profiles (versioned)
│   ├── calibration/
│   │   ├── current.json                  # Latest calibration params
│   │   └── history/                      # Historical snapshots
│   ├── pipeline/
│   │   └── runs/                         # Pipeline execution metadata
│   ├── golden-tests/
│   │   ├── golden-responses.json         # The 20 AI-calibrated golden responses
│   │   └── runs/                         # Golden test run results
│   ├── audit/                            # LLM call logs
│   └── users/                            # User records (email, role, auth metadata)
│
├── prompts/                              # AI evaluation prompt templates
│   ├── scoring-prompt.ts                 # Step 1 prompt template
│   └── synthesis-prompt.ts               # Step 3 prompt template
│
├── docs/                                 # Documentation
├── scripts/                              # Deployment, setup, utility scripts
└── tests/                                # Test files
```

**Changes from the initially proposed structure and rationale:**

1. **`content/` added (split from `data/`)** — Assessment content (question definitions, metadata) is static, read-only, and version-controlled. Runtime data (responses, profiles, audit logs) is dynamic and potentially gitignored. Separating these prevents confusion about what's checked into source control vs. generated at runtime.
2. **`src/services/` expanded with nested modules** — The specs define two large service domains (pipeline and dashboard) with significant internal structure. Flat `services/` wouldn't scale; the nested structure mirrors the spec's own module organization.
3. **`src/lib/auth/` added** — Auth is shared infrastructure (middleware, session utils) used by both assessment and admin routes. It belongs in `lib/` rather than in a specific feature area.
4. **`src/lib/scoring/` added** — Deterministic scoring functions (objective question auto-scoring, composite computation) are shared between the assessment UI (immediate feedback on objective questions) and the pipeline (Step 2 aggregation).

---

## 4. Data Flows

### 4.1 Assessment Delivery Flow

```
User (Browser)                    API Layer                  Storage
─────────────                     ─────────                  ───────

1. Navigate to /assess
   ──── GET /assess ────────────►
                                  Load assessment-meta.json
                                  Load section files
                                  ◄──── Return assessment structure

2. Begin section, render questions
   (variant selected randomly per question)

3. Answer each question
   (timer runs, auto-advance on timeout,
    word count tracked for open-ended)

4. Complete all 5 sections
   ──── POST /api/assess/submit ─►
                                  Validate completeness
                                  Bind authenticated user identity
                                  Auto-score objective questions
                                  Compute speed flags
                                  Assemble response object (§5.7)
                                  ──── Write response JSON ──────► data/responses/{id}.json
                                  Trigger pipeline (async)
                                  ◄──── Return confirmation

5. User sees "Assessment submitted" screen
   (no scores, no results — Test-Takers have
    zero visibility in v1.0)
```

**Key rules:** No pause between sections. No back-navigation. Response data is immutable once written. The `user` object in the response is populated from the authenticated session, not self-reported (except `name` and `role`, which are self-reported at first login).

### 4.2 Evaluation Pipeline Flow

```
Trigger                      Pipeline Orchestrator              External APIs
───────                      ─────────────────────              ─────────────

POST /api/evaluate
(or auto-trigger on submit)
   │
   ▼
Load assessment response     ◄── data/responses/{id}.json
Load section definitions     ◄── content/sections/*.json
Load calibration params      ◄── data/calibration/current.json (may be null)
   │
   ▼
┌─ STEP 1: OPEN-ENDED SCORING ──────────────────────────────────────────────┐
│  Extract all open-ended questions from response                            │
│  For each (in parallel):                                                   │
│    Assemble prompt: system prompt + rubric + question context + response    │
│    ──── LLM Call (Sonnet, temp 0.1) ─────────────────────► Anthropic API  │
│    ◄──── Score result: rubric_score, justification, criteria_met/missed    │
│    Log to audit trail                                                      │
│  Validate all results against ScoreResult schema                           │
│  Latency: 3–8 seconds (parallel)                                          │
└────────────────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─ STEP 2: SCORE AGGREGATION (deterministic — no LLM) ──────────────────────┐
│  Merge objective question scores (already auto-scored) with AI scores      │
│  Compute per-section raw scores                                            │
│  Apply section weights → weighted scores                                   │
│  Sum weighted scores → composite score                                     │
│  Map composite to classification (Exceptional/Proficient/Developing/etc.)  │
│  Compute speed profile (avg time ratio, consistency, anomalies)            │
│  If calibration available: compute percentile ranks, relative fitness tier │
│  Latency: <100ms                                                           │
└────────────────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─ STEP 3: PROFILE SYNTHESIS ───────────────────────────────────────────────┐
│  Assemble prompt: system prompt + full aggregated scores + calibration     │
│  ──── LLM Call (Opus, temp 0.4) ─────────────────────────► Anthropic API  │
│  ◄──── Responder Profile JSON:                                             │
│         section_analysis[], cognitive_profile, vibe_coding_fitness,         │
│         development_recommendations[], speed_profile_interpretation,        │
│         red_flags[]                                                         │
│  Validate against ResponderProfile schema                                   │
│  Latency: 5–15 seconds                                                     │
└────────────────────────────────────────────────────────────────────────────┘
   │
   ▼
Assemble final profile (merge LLM output + deterministic scores + metadata)
Write profile ────────────────────────────────────► data/profiles/{id}.json
Update calibration params ────────────────────────► data/calibration/current.json
Set status = "evaluated"
```

**Total pipeline latency:** 10–25 seconds. **Cost:** ~$0.10–0.30 per assessment.

### 4.3 Dashboard Flow

```
Admin (Browser)              API Layer                    Dashboard Module
───────────────              ─────────                    ────────────────

GET /admin/dashboard
   │
   ▼
Auth middleware (requireAdmin)
   │ ✓ Admin role confirmed
   ▼
GET /api/dashboard/ranking
GET /api/dashboard/distributions    ───►  DATA ACCESS LAYER
GET /api/dashboard/heatmap                (JsonFileProvider)
                                          │
                                          │ Read data/profiles/*.json
                                          │ Read data/calibration/current.json
                                          │
                                          ▼
                                    TRANSFORM LAYER
                                    (pure functions)
                                          │
                                          │ ranking.ts → sorted ranked list
                                          │ distributions.ts → histograms, counts
                                          │ heatmap.ts → section × individual matrix
                                          │
                                          ▼
                                    PRESENTATION LAYER
                                    (React components)
                                          │
                                          │ RankingTable, FitnessDistribution,
                                          │ SectionHeatmap, ScoreHistogram,
                                          │ RadarChart, PipelineStatus,
                                          │ GoldenTestStatus
                                          │
                                          ▼
                                    Rendered dashboard in browser
```

---

## 5. Storage Architecture

### 5.1 Storage Model (v1.0)

All data is stored as JSON files on disk. The population target is <500 assessed individuals, which makes file-based storage performant without caching.

```
data/
├── responses/
│   ├── {response-id-1}.json           # Complete assessment response (immutable)
│   ├── {response-id-2}.json
│   └── ...
├── profiles/
│   ├── {response-id-1}.json           # Latest Responder Profile (versioned)
│   ├── {response-id-1}.v1.json        # Previous profile version (audit)
│   └── ...
├── calibration/
│   ├── current.json                   # Latest calibration parameters
│   └── history/
│       ├── {calibration-id-1}.json    # Historical calibration snapshots
│       └── ...
├── pipeline/
│   └── runs/
│       ├── {run-id-1}.json            # Pipeline execution metadata
│       └── ...
├── golden-tests/
│   ├── golden-responses.json          # The 20 AI-calibrated golden responses
│   └── runs/
│       ├── {run-id-1}.json            # Golden test run results
│       └── ...
├── audit/
│   └── {date}/
│       ├── {call-id-1}.json           # Individual LLM call log entries
│       └── ...
└── users/
    ├── {user-id-1}.json               # User record (email, role, auth metadata)
    └── ...
```

### 5.2 Data Mutability Rules

| Data Type | Mutability | Rule |
|---|---|---|
| **Raw responses** | Immutable | Never overwritten, never deleted, never modified after submission |
| **Objective scores** | Immutable | Deterministically computed; re-computation always produces identical results |
| **Open-ended AI scores** | Append-only | New evaluations stored as new versions; previous preserved |
| **Responder Profiles** | Versioned | Each synthesis/re-scoring creates a new version; previous versions retained |
| **Calibration params** | Append-only | Each update creates a new snapshot; `current.json` is the latest pointer |
| **Assessment content** | Read-only at runtime | Checked into source control; never modified by the application |

### 5.3 Key Schemas

**Assessment Response** (`data/responses/{id}.json`) — Contains: `response_id`, `assessment_id`, `user` (identity from auth session), `session` (timestamps, duration, environment), `section_responses[]` (per-question: answer, timing, speed flags, auto-scored results, AI evaluation slots), `results` (section scores, composite, classification, speed profile). Full schema in Functional Spec §5.7.

**Responder Profile** (`data/profiles/{id}.json`) — Contains: `profile_id`, `profile_version`, `response_id`, `pipeline_metadata` (models used, latency, cost, calibration ref), `user`, `scores` (composite, classification, percentile, section breakdown), `open_ended_evaluations[]`, plus the synthesis output: `section_analysis[]`, `cognitive_profile`, `vibe_coding_fitness`, `development_recommendations[]`, `speed_profile_interpretation`, `red_flags[]`. Full schema in Technical Spec §6.3.

**Calibration Parameters** (`data/calibration/current.json`) — Contains: `calibration_id`, `sample_size`, `generated_at`, per-section and composite distributions (mean, median, std_dev, percentiles), open-ended scoring benchmarks, speed benchmarks, fitness rating distribution. Full schema in Technical Spec §7.1.

### 5.4 Data Provider Abstraction

All data consumers (dashboard, API routes) access storage through the `DataProvider` interface, never through direct file reads. This is the critical future-proofing mechanism for the v2.2 database migration.

```typescript
interface DataProvider {
  // Profiles
  listProfiles(filters?: ProfileFilters): Promise<ProfileSummary[]>;
  getProfile(responseId: string): Promise<ResponderProfile>;

  // Calibration
  getCurrentCalibration(): Promise<CalibrationParams | null>;
  getCalibrationHistory(): Promise<CalibrationSnapshot[]>;

  // Operational
  getPipelineRuns(filters?: TimeRangeFilter): Promise<PipelineRun[]>;
  getGoldenTestRuns(filters?: TimeRangeFilter): Promise<GoldenTestRun[]>;
}
```

**v1.0 implementation:** `PostgresProvider` — queries PostgreSQL via Drizzle ORM. `listProfiles` queries the `profiles` table with JSONB field extraction for summaries. Simple filters (organization, date range, classification) push down into SQL WHERE clauses. Complex aggregation remains in the transform layer.

**Cloud migration (v2.2):** Swap `DATABASE_URL` from local PostgreSQL to a managed service (Neon, AWS RDS, Supabase). Same interface, same schema, same Drizzle ORM code. Zero changes to transforms or presentation.

---

## 6. API Route Map

All endpoints live under `src/app/api/`. Authentication is enforced via middleware. Unless otherwise noted, all endpoints require the **Admin** role.

### 6.1 Authentication

| Method | Path | Purpose | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/request-otp` | Send OTP to email (validates domain allowlist) | No |
| `POST` | `/api/auth/verify-otp` | Verify OTP, issue session token | No |
| `POST` | `/api/auth/logout` | Invalidate session | Authenticated |
| `GET` | `/api/auth/session` | Return current session info (user, role) | Authenticated |

### 6.2 Assessment

| Method | Path | Purpose | Auth Required |
|---|---|---|---|
| `GET` | `/api/assess/config` | Load assessment structure (meta + sections) | Authenticated (any role) |
| `POST` | `/api/assess/submit` | Submit completed assessment response | Authenticated (any role) |

### 6.3 Evaluation Pipeline

| Method | Path | Purpose | Auth Required |
|---|---|---|---|
| `POST` | `/api/evaluate` | Submit assessment for evaluation (also triggered internally on submit) | Admin (or internal service call) |
| `GET` | `/api/evaluate/{response_id}/status` | Check pipeline status (pending → scoring → aggregating → synthesizing → complete → error) | Admin |
| `POST` | `/api/evaluate/{response_id}/re-evaluate` | Re-run full pipeline (Steps 1–3) for single assessment | Admin |

### 6.4 Profiles

| Method | Path | Purpose | Auth Required |
|---|---|---|---|
| `GET` | `/api/profiles/{response_id}` | Retrieve latest Responder Profile | Admin |
| `GET` | `/api/profiles/{response_id}/versions` | List all profile versions | Admin |
| `GET` | `/api/profiles/{response_id}/versions/{version}` | Retrieve specific profile version | Admin |

### 6.5 Calibration

| Method | Path | Purpose | Auth Required |
|---|---|---|---|
| `GET` | `/api/calibration/current` | Retrieve current calibration parameters | Admin |
| `GET` | `/api/calibration/history` | List all calibration snapshots | Admin |
| `POST` | `/api/calibration/rescore` | Trigger batch re-scoring (Step 3 only for all profiles) | Admin |
| `GET` | `/api/calibration/rescore/{job_id}/status` | Check batch re-scoring progress | Admin |

### 6.6 Dashboard Data

| Method | Path | Purpose | Auth Required |
|---|---|---|---|
| `GET` | `/api/dashboard/ranking` | Ranked list (fitness tier → composite). Params: organization, date_range, classification, page, pageSize | Admin |
| `GET` | `/api/dashboard/distributions` | Composite histogram, per-section histograms, classification counts, fitness counts | Admin |
| `GET` | `/api/dashboard/heatmap` | Section × individual score matrix. Params: organization | Admin |
| `GET` | `/api/dashboard/individual/{response_id}` | Individual drill-down: scores, profile summary, speed, recommendations | Admin |
| `GET` | `/api/dashboard/ops/pipeline-health` | Pipeline operational metrics: latencies, success/error rates | Admin |
| `GET` | `/api/dashboard/ops/golden-test-status` | Latest golden test results, drift trend, pass/fail | Admin |

### 6.7 Golden Test Suite

| Method | Path | Purpose | Auth Required |
|---|---|---|---|
| `POST` | `/api/golden-test/run` | Trigger a golden test suite run | Admin |
| `GET` | `/api/golden-test/runs` | List all historical runs | Admin |
| `GET` | `/api/golden-test/runs/{run_id}` | Detailed results for specific run | Admin |
| `GET` | `/api/golden-test/status` | Current pass/fail and drift metrics | Admin |

### 6.8 Admin Management

| Method | Path | Purpose | Auth Required |
|---|---|---|---|
| `GET` | `/api/admin/domains` | List approved email domains | Admin |
| `POST` | `/api/admin/domains` | Add a domain to allowlist | Admin |
| `DELETE` | `/api/admin/domains/{domain}` | Remove a domain from allowlist | Admin |
| `GET` | `/api/admin/users` | List all users with roles | Admin |
| `PATCH` | `/api/admin/users/{user_id}/role` | Promote/demote user role | Admin |

---

## 7. Three-Layer Dashboard Architecture

The dashboard is explicitly designed as three replaceable layers. Each layer has a single responsibility and zero awareness of the others' internals.

```
LAYER 1: DATA ACCESS                LAYER 2: TRANSFORMS              LAYER 3: PRESENTATION
─────────────────────                ───────────────────              ─────────────────────

DataProvider interface               Pure functions                   React components
  │                                    │                               │
  ├─ listProfiles()                    ├─ ranking.ts                   ├─ RankingTable
  ├─ getProfile()                      │  computeRanking()             ├─ FitnessDistribution
  ├─ getCurrentCalibration()           │  (fitness tier → composite)   ├─ ClassificationBar
  ├─ getCalibrationHistory()           │                               ├─ ScoreHistogram
  ├─ getPipelineRuns()                 ├─ distributions.ts             ├─ SectionHeatmap
  └─ getGoldenTestRuns()               │  computeScoreHistogram()      ├─ RadarChart
                                       │  computeFitnessDistrib()      ├─ PipelineStatus
  Implementations:                     │  computeClassifCounts()       └─ GoldenTestStatus
  ├─ JsonFileProvider (v1)             │
  └─ DatabaseProvider (v2.2)           ├─ heatmap.ts                   Views:
                                       │  computeSectionHeatmap()       ├─ ManagerDashboard
  Returns raw data.                    │                               ├─ IndividualDrillDown
  No filtering, no sorting.            ├─ individual.ts                └─ OperationalDashboard
                                       │  shapeIndividualDrillDown()
                                       │                              Receives chart-ready data.
                                       └─ operations.ts               No business logic.
                                          computePipelineHealth()      No data fetching.
                                          computeGoldenTestStatus()    No storage awareness.

                                       No side effects.
                                       No storage awareness.
                                       Contains ranking algorithm
                                       and all business logic.
```

**Replacement scenarios supported by this design:**

| Change | What Gets Replaced | What Stays Untouched |
|---|---|---|
| JSON → Database (v2.2) | `JsonFileProvider` → `DatabaseProvider` | Transforms, presentation |
| Recharts → another chart library | Presentation components | Data provider, transforms |
| Move to external BI tool (e.g., Metabase) | Presentation layer entirely | Data provider (exposes same API), transforms |
| New ranking algorithm | `ranking.ts` | Data provider, presentation |
| Add new dashboard view | New view composing existing components | Data provider, existing transforms |

---

## 8. AI Evaluation Pipeline Architecture

### 8.1 The 3-Step Pipeline

```
INPUT                          PROCESSING                        OUTPUT
─────                          ──────────                        ──────

Assessment Response    ──►     STEP 1: Per-Question Scoring       Score results per question
(from data/responses/)         • Model: Sonnet (temp 0.1)        • rubric_score (0–5)
                               • Parallel across all              • justification
                                 open-ended questions              • criteria_met[]
                               • 1 LLM call per question          • criteria_missed[]
                               • 3–8 sec total
                                        │
                                        ▼
Score results          ──►     STEP 2: Aggregation                Aggregated scores object
+ Auto-scored objectives       • NO LLM (deterministic)          • section_results[]
+ Section definitions          • Merge AI + objective scores      • composite_score
+ Calibration params           • Compute weights, composite       • classification
                               • Speed profile analysis           • speed_profile
                               • Percentile computation           • calibration_context
                               • <100ms
                                        │
                                        ▼
Aggregated scores      ──►     STEP 3: Profile Synthesis          Responder Profile
                               • Model: Opus (temp 0.4)          • section_analysis[]
                               • Single LLM call with full data  • cognitive_profile
                               • Creative analysis + insight      • vibe_coding_fitness
                               • 5–15 sec                        • development_recommendations[]
                                                                  • speed_profile_interpretation
                                                                  • red_flags[]
```

### 8.2 Model Abstraction Layer

The pipeline never calls LLM SDKs directly. All inference goes through the `LLMProvider` interface:

```typescript
interface LLMProvider {
  id: string;        // "anthropic" | "openai"
  name: string;
  complete(request: LLMRequest): Promise<LLMResponse>;
}
```

**v1.0 configuration:** Anthropic is the sole active provider. Sonnet for Step 1 (scoring), Opus for Step 3 (synthesis). OpenAI provider exists as fallback structure but is not active in default configuration.

**v2.1 configuration (Dual Evaluator):** Both Anthropic and OpenAI score independently. Cross-provider agreement is measured. Divergent scores trigger re-evaluation or flagging.

### 8.3 Calibration & Batch Re-Scoring

Calibration activates at n ≥ 10 assessed individuals. `calibration_params` are updated incrementally after each new assessment. Batch re-scoring (re-running Step 3 only) is triggered every 25 new assessments or on-demand. Batch re-scoring does NOT change raw scores, objective scores, or classifications — it updates percentile ranks, relative fitness tiers, and population-contextualized narrative.

### 8.4 Golden Test Suite

20 AI-calibrated golden responses with consensus scores established via multi-model cross-validation (3+ models score independently, agreement determines consensus). The suite validates that the production scoring configuration stays within acceptable deviation (≤0.5 MAD on the 0–5 scale). Runs on-demand or on schedule. Drift detection triggers alerts.

---

## 9. Authentication Model

### 9.1 What v1.0 Implements

| Property | Value |
|---|---|
| Method | Email OTP (no passwords stored) |
| Access gate | Domain-based allowlist (admin-configurable) |
| Initial seed domains | `enesol.ai`, `dataforgetechnologies.com`, `datacracy.co` |
| Initial admin | `julio@datacracy.co` |
| Roles | Admin (full access) and Test-Taker (assessment only) |
| Session | Stateless JWT or secure session cookie; expires after 4 hours |
| OTP validity | 10 minutes, single-use |
| Role promotion | Admin can promote any user to Admin via settings page |
| Route enforcement | Middleware-based: `requireAdmin` on all `/admin/*` routes and `/api/dashboard/*`, `/api/evaluate/*`, `/api/profiles/*`, `/api/calibration/*`, `/api/golden-test/*`, `/api/admin/*` endpoints |

### 9.2 What v1.0 Does NOT Have

No persistent passwords. No OAuth/social login. No MFA beyond the OTP itself. No granular RBAC beyond Admin/Test-Taker (Manager and Operator roles are v2.1+). No test-taker access to their own results. No public API access.

### 9.3 Development Bypass

During development (pre-v0.2 milestone), the auth system may not yet exist. A dev bypass configuration allows the pipeline and dashboard to be tested without a live OTP system. This bypass is environment-gated (development only, never production) and auto-seeds a default admin session. **The bypass must be removed or permanently disabled before v0.5 (pilot).**

---

## 10. Deployment Architecture

### 10.1 v1.0 Target

The v1.0 deployment target is a single EC2 instance (Ubuntu 24.04 LTS) serving multiple domains, suitable for a population of <500 users with low concurrent usage.

```
┌─────────────────────────────────────────────────────────────────┐
│  DNS (all three point to the EC2 instance):                      │
│    assessment.dataforgetechnologies.com                           │
│    assessment.enesol.ai                                          │
│    evaluacion.datacracy.co                                       │
│                          │                                       │
│                          ▼                                       │
│  ┌──────────────────────────────────────────────────┐           │
│  │  EC2 Instance (Ubuntu 24.04, t3.small/medium)     │           │
│  │                                                    │           │
│  │  Reverse Proxy (:443) — automatic SSL per domain  │           │
│  │    → proxy to localhost:3000                       │           │
│  │                                                    │           │
│  │  ┌──────────────────────────────────────────────┐ │           │
│  │  │  Next.js Application (pm2)                    │ │           │
│  │  │  (Web App + API Routes + Pipeline + Dashboard)│ │           │
│  │  └──────────────────────────┬───────────────────┘ │           │
│  │                              │                     │           │
│  │  ┌──────────────────────────┴───────────────────┐ │           │
│  │  │  PostgreSQL 16                                │ │           │
│  │  │  (users, responses, profiles, calibration,    │ │           │
│  │  │   sessions, golden tests, pipeline runs)      │ │           │
│  │  └──────────────────────────────────────────────┘ │           │
│  │                                                    │           │
│  │  Filesystem: data/                                 │           │
│  │  (audit trail, pipeline traces, backups)           │           │
│  │                                                    │           │
│  │  Outbound:                                         │           │
│  │  ├── Anthropic API (LLM inference)                 │           │
│  │  ├── Microsoft Graph API (OTP email delivery)      │           │
│  │  └── (OpenAI API — fallback, not active by default)│           │
│  └──────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

**Deployment considerations:**

- **PostgreSQL on same instance (v1.0).** Database runs on the same EC2 instance. Connection string in `.env.production`. Backups via `scripts/db/backup.sh` (pg_dump to `data/backups/`). Cloud migration swaps the connection string.
- **Filesystem for operational artifacts only.** The `data/` directory stores audit trail, pipeline traces, and backups — not primary application data.
- **Automatic SSL with multi-domain support.** The reverse proxy sits on the EC2 instance, terminates HTTPS for all configured domains, and forwards traffic to the Next.js app on localhost:3000. SSL certificates are automatically provisioned and renewed. No external load balancer or manual certificate management required. Caddy is recommended for this role.
- **No background job infrastructure.** The pipeline runs as an async function within the API route handler. No Redis, no queue, no worker process. This is acceptable for v1.0 throughput but means pipeline failures must be retried via the re-evaluate endpoint.
- **Process management via pm2.** The Next.js production server runs under pm2 for auto-restart on crash and startup on reboot.
- **Environment variables** stored in `.env.production` on the server (gitignored): database connection string, Anthropic API key, Microsoft Graph API credentials (tenant ID, client ID, client secret), JWT secret, domain allowlist seed, and feature flags.

### 10.2 Deployment Flow

The build process: `git pull` → `npm install` → `npx drizzle-kit migrate` → `npm run build` → `pm2 restart core-assessment`. Assessment content (`content/`) is bundled with the application. Database migrations run before the build to ensure schema is current. The `data/` directory (audit trail, traces, backups) persists across deployments. Full deployment procedures are documented in `docs/RUNBOOK.md` Part 5.

---

## 11. Future-Proofing Notes

The architecture explicitly accommodates the following v2+ changes without requiring rewrites of adjacent components:

| Future Change | Version | Accommodation in v1.0 |
|---|---|---|
| **Cloud database migration** | v2.2 | PostgreSQL is already the v1.0 storage. Cloud migration (Neon, RDS, Supabase) requires only changing `DATABASE_URL`. DataProvider interface, Drizzle schema, and all application code remain unchanged |
| **Dual evaluator (Claude + GPT-4o)** | v2.1 | `LLMProvider` interface abstracts all LLM calls. Adding a second provider and cross-validation logic extends the pipeline without modifying scoring or synthesis step code |
| **Additional roles (Manager, Operator)** | v2.1+ | Middleware pattern (`requireAdmin`) expands to `requireRole(["admin", "manager"])`. Dashboard three-layer architecture stays untouched; only route-level middleware changes |
| **External BI tool migration** | v2.3+ | Dashboard data endpoints (`/api/dashboard/*`) serve as stable API contracts. An external tool (e.g., Metabase) can consume these directly, replacing only the presentation layer |
| **Prompt version management** | v2.1 | Prompt templates already live in a dedicated `prompts/` directory. Versioning adds metadata and selection logic without restructuring |
| **Longitudinal tracking** | v2.2 | Response and profile schemas already include `user_id`, `assessment_version`, and timestamps. Tracking multiple assessments per user requires query logic, not schema changes |
| **Scenario rotation / variants** | v2.0 | Question JSON schema already includes the `variants[]` array. Populating variants requires content work, not architecture changes |
| **Individual test-taker feedback** | v2.3+ | Responder Profile already contains all needed data (section analysis, recommendations, cognitive profile). The change is a new route accessible to Test-Takers, not new data generation |
| **Batch re-scoring at scale** | v2.2+ | Pipeline already separates Step 3 (synthesis) from Steps 1–2. Batch re-scoring runs Step 3 only. Database migration improves query performance but the pipeline logic is unchanged |

---

*Document: 01_ARCHITECTURE.md*
*Version: 1.4*
*Created: February 2026*
*Updated: April 2026*
*Source: CORE Assessment Functional Spec v2.4, AI Evaluation Technical Spec v1.5, Dashboard Module Spec v1.2, Versioning Roadmap v1.2, UI Experience Spec v1.0, Design Philosophy v1.0, Project Overview*
*Changes from v1.2: PostgreSQL replaces JSON storage, questions 67→70, section order documented, storage layer rewritten, deployment updated*
*Repository: [github.com/enesol-julio/core-assessment](https://github.com/enesol-julio/core-assessment)*
*Production: [assessment.dataforgetechnologies.com](https://assessment.dataforgetechnologies.com)*
*Local path: `/Users/jutuonair/GDrive/ProductDevelopment/core-assessment`*
