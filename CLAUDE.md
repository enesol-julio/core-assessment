# CLAUDE.md — CORE Assessment Platform

> **Claude Code reads this file on every session.** Keep it concise and scannable.

---

## 1. Project Identity

CORE (Critical Observation, Reasoning & Execution) is a timed, multi-format cognitive assessment platform that identifies individuals who can direct AI effectively in vibe-coding environments. It's a **Next.js 14+ monolith** (TypeScript, Tailwind CSS, React) with three subsystems: assessment delivery UI, AI evaluation pipeline (Anthropic Claude), and embedded admin dashboard (Tremor + Recharts). All data is stored as JSON files on disk (no database in v1). Repository: `github.com/enesol-julio/core-assessment`. We are building **v1.0** through milestone blocks v0.1–v0.5.

---

## 2. Folder Structure (Canonical — Do Not Deviate)

```
core-assessment/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── (assessment)/                 # Test-taker pages
│   │   │   ├── page.tsx                  # Landing / login
│   │   │   ├── assess/                   # Assessment flow
│   │   │   └── complete/                 # Post-submission
│   │   ├── (admin)/                      # Admin-only pages
│   │   │   ├── dashboard/                # Manager/Admin dashboard
│   │   │   ├── ops/                      # Operational dashboard
│   │   │   └── settings/                 # Domain allowlist, roles
│   │   └── api/                          # Route handlers
│   │       ├── auth/                     # OTP request, verify, logout
│   │       ├── assess/                   # Session management
│   │       ├── evaluate/                 # Pipeline trigger, status
│   │       ├── profiles/                 # Profile retrieval
│   │       ├── calibration/              # Calibration endpoints
│   │       ├── dashboard/                # Dashboard data endpoints
│   │       ├── golden-test/              # Golden test endpoints
│   │       └── admin/                    # Domain/user management
│   ├── services/                         # Business logic (NO UI awareness)
│   │   ├── pipeline/                     # AI evaluation pipeline
│   │   │   ├── pipeline.ts              # Main orchestrator
│   │   │   ├── providers/               # LLM provider abstraction
│   │   │   ├── steps/                   # Step 1 (scoring), Step 2 (agg), Step 3 (synthesis)
│   │   │   ├── calibration/             # Calibration logic
│   │   │   ├── golden-test/             # Golden test suite
│   │   │   ├── audit/                   # LLM call logging
│   │   │   └── schemas/                 # Zod schemas for pipeline I/O
│   │   └── dashboard/                   # Dashboard business logic
│   │       ├── interfaces/              # DataProvider interface
│   │       ├── providers/               # JsonFileProvider (v1)
│   │       └── transforms/              # Ranking, distributions, heatmap, etc.
│   ├── lib/                             # Shared utilities
│   │   ├── auth/                        # Session utils, middleware, OTP
│   │   ├── scoring/                     # Deterministic scoring functions
│   │   ├── types/                       # Shared TypeScript types/interfaces
│   │   └── utils/                       # General helpers
│   ├── components/                      # React components
│   │   ├── assessment/                  # Question renderers, timers, progress
│   │   ├── dashboard/                   # Charts and tables (Tremor + Recharts)
│   │   ├── admin/                       # Settings, domain management
│   │   └── shared/                      # Layout, nav, auth gates
│   └── hooks/                           # Custom React hooks
│       ├── useTimer.ts
│       ├── useAssessmentSession.ts
│       └── useAuth.ts
├── content/                             # Static assessment content (version-controlled)
│   ├── assessment-meta.json
│   └── sections/                        # 5 section JSON files
├── data/                                # Runtime data (gitignored, created at runtime)
│   ├── responses/                       # Raw assessment responses (IMMUTABLE)
│   ├── profiles/                        # Responder Profiles (versioned)
│   ├── calibration/                     # current.json + history/
│   ├── pipeline/                        # Execution metadata
│   ├── golden-tests/                    # Golden responses + run results
│   ├── audit/                           # LLM call logs
│   └── users/                           # User records
├── prompts/                             # AI evaluation prompt templates
├── docs/                                # Documentation
│   └── briefs/                          # Implementation briefs from planning chat
├── scripts/                             # Deployment, setup, utility scripts
├── tests/                               # Test files (mirrors src/ structure)
├── CLAUDE.md                            # This file
├── CHANGELOG.md
└── package.json, tsconfig.json, etc.
```

**Hard rules:**
- `content/` = static, version-controlled. `data/` = runtime, gitignored. **Never confuse the two.**
- Never create new top-level directories. If a file doesn't fit, ask.
- Components go in `src/components/`, business logic in `src/services/`, shared utilities in `src/lib/`.
- API routes go under `src/app/api/` following the existing namespace grouping.

---

## 3. Tech Stack & Conventions

| Layer | Technology | Version/Notes |
|---|---|---|
| Framework | Next.js | 14+ (App Router) |
| Language | TypeScript | Strict mode. No `any` unless truly unavoidable. |
| Styling | Tailwind CSS | Utility-first. No custom CSS files unless necessary. |
| UI Library | React | Functional components + hooks only. |
| Dashboard | Tremor + Recharts | Tremor for primitives (cards, tables). Recharts for custom charts. |
| AI Primary | Anthropic Claude | Sonnet for scoring (temp 0.1), Opus for synthesis (temp 0.4) |
| AI Fallback | OpenAI | Fallback structure only, not active in v1 default config |
| Validation | Zod | For all pipeline I/O schemas and API request/response validation |
| Auth | JWT / secure cookie | Email OTP, domain allowlist |
| Email (OTP) | Microsoft Graph API | Client credentials flow via `@azure/msal-node`. Entra ID app with `Mail.Send` permission. See `docs/M365_GRAPH_SETUP.md`. |

**Naming conventions:**

| Thing | Convention | Example |
|---|---|---|
| Files (components) | PascalCase | `RankingTable.tsx`, `FitnessDistribution.tsx` |
| Files (utilities/services) | kebab-case or camelCase | `pipeline.ts`, `golden-test/`, `data-provider.ts` |
| Files (hooks) | camelCase with `use` prefix | `useTimer.ts`, `useAuth.ts` |
| React components | PascalCase | `<SectionHeatmap />` |
| TypeScript interfaces | PascalCase, prefixed with `I` only if ambiguous | `DataProvider`, `ProfileFilters` |
| API routes | kebab-case paths | `/api/golden-test/`, `/api/dashboard/` |
| JSON data files | kebab-case | `{response-id}.json`, `current.json` |
| Constants | UPPER_SNAKE_CASE | `MAX_OTP_AGE_MINUTES` |
| Env variables | UPPER_SNAKE_CASE | `ANTHROPIC_API_KEY` |

---

## 4. Architecture Invariants (Never Violate)

1. **Dashboard three-layer architecture:** Data Access (DataProvider) → Transforms (pure functions) → Presentation (React components). No business logic in presentation. No direct file reads in components or API routes.
2. **DataProvider abstraction:** All data consumers use the `DataProvider` interface (`src/services/dashboard/interfaces/`). v1 implementation is `JsonFileProvider`. This enables the v2.2 database migration with zero changes to transforms or presentation.
3. **JSON-file storage only (v1).** All data lives in `data/` as JSON files. No database. No Redis. No queues.
4. **Pipeline is three steps:** Step 1 = open-ended scoring (Sonnet, parallel), Step 2 = composite aggregation, Step 3 = Responder Profile synthesis (Opus). Never collapse or reorder these.
5. **LLM provider abstraction:** All LLM calls go through the provider interface (`src/services/pipeline/providers/`). Never call Anthropic/OpenAI SDKs directly from pipeline steps.
6. **Response immutability:** Raw response data (answers, timing, speed flags) is **never** modified after submission. AI evaluation results are appended, never overwriting raw fields.
7. **Auth middleware pattern:** `requireAdmin` middleware on all `/admin/*` routes and protected API endpoints. Client-side nav hiding is UX only, not security.
8. **Pipeline runs async:** Submission persists the response immediately, then triggers evaluation asynchronously. User sees confirmation, not a spinner.

---

## 5. Current Version Block

```
┌─────────────────────────────────────────────┐
│  CURRENTLY BUILDING: v0.1                   │
│  Feature: 0.1.1 — Assessment Metadata File  │
│  Status: In Progress                        │
└─────────────────────────────────────────────┘
```

**v0.1 scope (Assessment Content & Schema):**
- 0.1.1 — `assessment-meta.json` (root config)
- 0.1.2 — 5 section definition files (`content/sections/`)
- 0.1.3 — Question content authoring (67 base questions)
- 0.1.4 — Assessment response schema definition
- 0.1.5 — Schema validation tooling (dev/CI tool)

**Milestone gate:** All 67 base questions authored, valid against JSON schema. Section files pass validation. `assessment-meta.json` complete.

> **Update this block manually as features complete and new ones begin.**

---

## 6. Scope Boundaries

**In scope (v0.1–v0.5 → v1.0):** Assessment content, web app + auth, AI pipeline, dashboard, pilot.

**NOT in scope — do not build:**

| Feature | Deferred To | Why Not Now |
|---|---|---|
| Scenario rotation / variant population | v2.0 | `variants[]` array exists but stays empty |
| Dual-evaluator scoring (Claude + GPT cross-validation) | v2.1 | Provider interface accommodates this later |
| Database migration (PostgreSQL) | v2.2 | DataProvider abstraction handles the swap |
| Longitudinal tracking (multiple assessments per user) | v2.2 | Schema has fields, no query logic yet |
| Export / reporting (PDF, CSV) | v2.2 | View-only in v1 |
| Individual test-taker feedback view | v2.3+ | Admin-only results in v1 |
| AI collaboration section (Section 6) | v2.3+ | Not designed |
| Adaptive difficulty | v2.3+ | Not designed |
| Additional roles (Manager, Operator) | v2.1+ | v1 has Admin + Test-Taker only |
| Proctoring integration | v2.3+ | Not designed |
| BI tool migration | v2.3+ | Embedded dashboard only in v1 |

---

## 7. Dev Bypass Mode

During development (pre-v0.2), auth may not exist yet. A dev bypass allows testing pipeline and dashboard without OTP.

```
# .env.local
AUTH_BYPASS=true          # ONLY in development
AUTH_BYPASS_EMAIL=julio@datacracy.co
AUTH_BYPASS_ROLE=admin
```

**Rules:**
- Environment-gated: `AUTH_BYPASS` is checked **only** when `NODE_ENV === 'development'`.
- Auto-seeds a default admin session for `julio@datacracy.co`.
- **Hard fail-safe:** Add a production guard at app startup that throws if `AUTH_BYPASS=true` and `NODE_ENV === 'production'`. This must never be removable without code changes.
- **Must be fully removed or permanently disabled before v0.5 (pilot).**

---

## 8. Testing Conventions

| Aspect | Convention |
|---|---|
| Location | `tests/` directory, mirroring `src/` structure |
| Runner | Vitest (or Jest — decide at project init, then stay consistent) |
| Naming | `{feature}.test.ts` or `{feature}.spec.ts` |
| Run | `npm test` (all), `npm test -- --filter {pattern}` (specific) |
| Minimum per feature | At least: happy path, one error case, edge case if spec mentions one |
| Pipeline tests | Mock LLM providers. Never make real API calls in tests. |
| Dashboard transforms | Pure function tests — input data → expected output. No mocking needed. |
| Schema validation | Test that valid data passes and invalid data fails with correct errors. |
| Content validation | The v0.1 schema validator (`scripts/`) serves as the content test suite. |

---

## 9. Documentation Conventions

| File | Purpose | When to Update |
|---|---|---|
| `docs/briefs/` | Implementation briefs from the planning chat | Never modify — these are reference artifacts |
| `CHANGELOG.md` | Version-level changes | After each feature completion |
| `CLAUDE.md` | This file | After each version block completion or new pattern established |
| `README.md` | Setup, run, deploy instructions | After project init and major infra changes |

**CHANGELOG format:**

```markdown
## [v0.1.1] - YYYY-MM-DD
### Added
- Assessment metadata file (content/assessment-meta.json)
- Schema validation for section weights, classification tiers
```

---

## 10. Git Conventions

| Aspect | Format |
|---|---|
| Commit messages | `feat(0.1.1): add assessment-meta.json` / `fix(0.2.3): timer not auto-advancing` / `test(0.1.5): schema validation edge cases` / `docs: update CHANGELOG for v0.1` |
| Commit prefixes | `feat`, `fix`, `test`, `docs`, `refactor`, `chore` |
| Feature scope | Feature ID in parens: `(0.1.1)`, `(0.3.4)` |
| Tags | `v0.X.Y-feature-N` per feature, `v0.X.0` per milestone block |
| Branching | Single `main` branch for v0.x development. Feature branches optional — developer preference. |
| Tag example | `v0.1.0` when all v0.1 features pass milestone gate |

---

## 11. What NOT to Do

> **Read this before every task.**

- ❌ **Don't add auth/RBAC complexity.** v1 has two roles: Admin and Test-Taker. No Manager, no Operator, no granular permissions. That's v2.1+.
- ❌ **Don't use a database.** All storage is JSON files in `data/`. DataProvider abstraction exists precisely so we can swap later.
- ❌ **Don't install unnecessary dependencies.** Check if what you need is already in the stack (Next.js, React, Tailwind, Tremor, Recharts, Zod, Anthropic SDK). Justify any new `npm install`.
- ❌ **Don't restructure the folder layout.** The structure in §2 is canonical. If something doesn't fit, flag it — don't invent a new directory.
- ❌ **Don't build v2+ features.** Check §6 before starting anything. If it's on that table, stop and confirm with the user.
- ❌ **Don't modify raw response data.** Responses in `data/responses/` are immutable after submission. AI results are appended, never overwritten.
- ❌ **Don't call LLM SDKs directly from pipeline steps.** Always go through the provider abstraction in `src/services/pipeline/providers/`.
- ❌ **Don't put business logic in React components.** Components render. Transforms compute. Providers fetch. Keep the layers clean.
- ❌ **Don't skip the DataProvider.** No direct `fs.readFile` for data access in API routes or components. Always use the provider.
- ❌ **Don't populate `variants[]`.** The array exists in the schema but stays empty in v1. Variant content is v2.0.

---

## 12. Companion Docs

Implementation briefs live in `docs/briefs/`. These are scoped instructions produced by the planning chat (Claude Chat Project) for each feature. They contain:

- Objective, spec sources, prerequisites
- File-by-file creation/modification list
- Acceptance criteria
- Scope boundaries

**Spec documents (for deep reference):**

| Spec | Version | Covers |
|---|---|---|
| Functional Spec | v2.2 | Assessment design, sections, scoring, auth, schemas |
| AI Evaluation Technical Spec | v1.3 | Pipeline architecture, prompts, golden tests, calibration |
| Dashboard Module Spec | v1.1 | Three-layer dashboard, transforms, components, access control |
| Versioning Roadmap | v1.1 | Version scheme, milestone gates, dependency chain |
| Future Backlog Spec | v2.1 | Everything deferred to v2+ (use to detect scope creep) |

**Key entities:**

| Entity | Description |
|---|---|
| `julio@datacracy.co` | Seeded initial Admin |
| Seed domains | `enesol.ai`, `dataforgetechnologies.com`, `datacracy.co` |
| Assessment | 5 sections, 67 questions in pool, 34 served per session, ~48 min |
| Question types | `single_select` (32), `multi_select` (14), `drag_to_order` (6), `open_ended` (15) |
