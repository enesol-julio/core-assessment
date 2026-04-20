# CLAUDE.md — CORE Assessment Platform

> **Claude Code reads this file on every session.** Keep it concise and scannable.

---

## 1. Project Identity

CORE (Critical Observation, Reasoning & Execution) is a timed, multi-format cognitive assessment platform that identifies individuals who can direct AI effectively in vibe-coding environments. It's a **Next.js 14+ monolith** (TypeScript, Tailwind CSS, React) with three subsystems: assessment delivery UI, AI evaluation pipeline (Anthropic Claude), and embedded admin dashboard (Tremor + Recharts). Structured data is stored in **PostgreSQL 16** (Drizzle ORM); audit trail and operational artifacts live on the filesystem. Repository: `github.com/enesol-julio/core-assessment`. Production: `assessment.dataforgetechnologies.com` (EC2 Ubuntu, multi-domain with automatic SSL). We are building **v1.0** through milestone blocks v0.1–v0.5.

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
│   ├── db/                              # Database layer
│   │   ├── schema.ts                    # Drizzle schema definitions (all tables)
│   │   ├── index.ts                     # Database connection + client export
│   │   ├── migrate.ts                   # Migration runner (auto-run in dev)
│   │   └── seed.ts                      # Seed data (admin user, domains)
│   ├── services/                         # Business logic (NO UI awareness)
│   │   ├── pipeline/                     # AI evaluation pipeline
│   │   │   ├── pipeline.ts              # Main orchestrator
│   │   │   ├── providers/               # LLM provider abstraction
│   │   │   ├── steps/                   # Step 1 (scoring), Step 2 (agg), Step 3 (synthesis)
│   │   │   ├── calibration/             # Calibration logic
│   │   │   ├── golden-test/             # Golden test suite
│   │   │   ├── audit/                   # LLM call logging (writes to data/audit/)
│   │   │   └── schemas/                 # Zod schemas for pipeline I/O
│   │   └── dashboard/                   # Dashboard business logic
│   │       ├── interfaces/              # DataProvider interface
│   │       ├── providers/               # PostgresProvider (v1)
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
│   ├── sections/                        # 5 section JSON files (English canonical)
│   ├── translations/                    # Language overlays (translated fields only)
│   │   └── es/                          # Spanish overlays (one file per section + meta)
│   └── ui-strings/                      # UI chrome translations
│       ├── en.json                      # English UI text
│       └── es.json                      # Spanish UI text
├── drizzle/                             # Auto-generated migration files (committed)
│   ├── 0000_initial_schema.sql
│   └── meta/
├── data/                                # Runtime operational artifacts (gitignored)
│   ├── audit/                           # LLM call logs (append-only)
│   ├── traces/                          # Pipeline execution traces
│   ├── backups/                         # pg_dump output files
│   └── temp/                            # Ephemeral scratch files
├── prompts/                             # AI evaluation prompt templates
├── docs/                                # Documentation
│   └── briefs/                          # Implementation briefs from planning chat
├── scripts/                             # Automation scripts
│   ├── db/                              # Database setup, seed, backup, restore
│   ├── deploy/                          # EC2 deployment and first-time setup
│   └── validate/                        # Content schema validation
├── tests/                               # Test files (mirrors src/ structure)
├── CLAUDE.md                            # This file
├── CHANGELOG.md
├── drizzle.config.ts                    # Drizzle Kit configuration
└── package.json, tsconfig.json, etc.
```

**Hard rules:**
- `content/` = static, version-controlled. `data/` = runtime operational artifacts, gitignored.
- Structured queryable data → **PostgreSQL**. Append-only operational artifacts → `data/`.
- English content in `content/sections/` is the **single source of truth**. Spanish in `content/translations/es/` is an overlay — translated fields only, merged at runtime. If a translation is missing, fall back to English.
- All user-facing text in the assessment UI comes from `content/ui-strings/{lang}.json`, never hardcoded in components.
- Never create new top-level directories. If a file doesn't fit, ask.
- Components in `src/components/`, business logic in `src/services/`, utilities in `src/lib/`, database in `src/db/`.
- API routes under `src/app/api/`. Migration files in `drizzle/`. Scripts in `scripts/{purpose}/`.

---

## 3. Tech Stack & Conventions

| Layer | Technology | Version/Notes |
|---|---|---|
| Framework | Next.js | 14+ (App Router) |
| Language | TypeScript | Strict mode. No `any` unless truly unavoidable. |
| Styling | Tailwind CSS | Utility-first. No custom CSS files unless necessary. |
| UI Library | React | Functional components + hooks only. |
| Dashboard | Tremor + Recharts | Tremor for primitives. Recharts for custom charts. |
| **Database** | **PostgreSQL 16** | Primary data store. Same-instance on EC2 in v1.0. |
| **ORM** | **Drizzle ORM** | Schema, type-safe queries, migration generation. |
| **DB Driver** | **`pg`** | Standard PostgreSQL driver for Node.js. |
| AI Primary | Anthropic Claude | Sonnet for scoring (temp 0.1), Opus for synthesis (temp 0.4). |
| AI Fallback | OpenAI GPT-4o | Provider structure exists; not active in v1.0. |
| LLM Integration | Custom orchestrator | No LangChain/LangGraph. Native SDKs + provider interface. |
| Auth | Email OTP | Microsoft Graph API for email delivery. JWT sessions in PostgreSQL. |
| Validation | Zod | API inputs, pipeline I/O, content schemas. |

**Naming conventions:**

| Thing | Convention | Example |
|---|---|---|
| Files (components) | PascalCase | `RankingTable.tsx` |
| Files (utilities) | kebab-case or camelCase | `pipeline.ts`, `data-provider.ts` |
| Files (hooks) | camelCase with `use` prefix | `useTimer.ts` |
| React components | PascalCase | `<SectionHeatmap />` |
| TypeScript interfaces | PascalCase | `DataProvider`, `ProfileFilters` |
| Database tables | snake_case | `pipeline_runs`, `golden_test_runs` |
| Drizzle schema exports | camelCase | `users`, `responses`, `profiles` |
| API routes | kebab-case paths | `/api/golden-test/` |
| Constants | UPPER_SNAKE_CASE | `MAX_OTP_AGE_MINUTES` |
| Env variables | UPPER_SNAKE_CASE | `DATABASE_URL` |

---

## 4. Architecture Invariants (Never Violate)

1. **Dashboard three-layer architecture.** Data Access (DataProvider) → Transforms (pure functions) → Presentation (React). No business logic in presentation.
2. **DataProvider abstraction.** All data consumers use the `DataProvider` interface. v1.0 = `PostgresProvider`. Cloud migration = change `DATABASE_URL`.
3. **PostgreSQL for structured data. Filesystem for operational artifacts.** Users, responses, profiles, calibration, golden tests, sessions → PostgreSQL. Audit logs, traces, backups → `data/`.
4. **Pipeline is three steps.** Step 1 = scoring (Sonnet, parallel), Step 2 = aggregation, Step 3 = synthesis (Opus). Never collapse or reorder.
5. **LLM provider abstraction.** All LLM calls through provider interface. Never call SDKs directly.
6. **Response immutability.** Raw responses never modified after submission.
7. **Auth middleware pattern.** `requireAdmin` on all protected routes. Client-side hiding is UX only.
8. **Pipeline runs async.** Submission persists immediately, evaluation runs asynchronously.
9. **Section presentation order.** Read `order` field from `assessment-meta.json`. File names are identifiers, not sequence.
10. **Migrations committed to repo.** Drizzle Kit generates SQL in `drizzle/`. Auto-run in dev. Explicit in production deploy.
11. **Drizzle ORM for all database operations.** No raw SQL outside migration files.

---

## 5. Current Version Block

```
┌─────────────────────────────────────────────┐
│  CURRENTLY BUILDING: v0.2                   │
│  Feature: 0.2.3 — Assessment Session Flow   │
│  Status: In Progress (API + UI)             │
└─────────────────────────────────────────────┘
```

**v0.1 scope (Assessment Content & Schema) — ✅ COMPLETE:**
- 0.1.1 — `assessment-meta.json` (root config) ✅
- 0.1.2 — 5 section definition files (`content/sections/`) ✅
- 0.1.3 — Question content authoring (70 base questions) ✅
- 0.1.4 — Assessment response schema definition ✅
- 0.1.5 — Schema validation tooling (dev/CI tool) ✅
- 0.1.6 — Database schema & migrations (Drizzle ORM) ✅

**v0.2 scope (Web Application / Assessment Delivery):**
- 0.2.1 — Email OTP Authentication (Microsoft Graph)
- 0.2.2 — Domain Allowlist Management
- 0.2.3 — Assessment Session Flow (5-section timed delivery)
- 0.2.4 — Deterministic Scoring Engine (objective types)
- 0.2.5 — Role-Based Route Protection (`requireAdmin`)
- 0.2.6 — Multilingual Support (English + Spanish overlay)

---

## 6. Scope Boundaries

**In scope (v0.1–v0.5 → v1.0):** Assessment content, web app + auth, AI pipeline, dashboard, PostgreSQL database, pilot.

**NOT in scope — do not build:**

| Feature | Deferred To | Why Not Now |
|---|---|---|
| Scenario rotation / variant population | v2.0 | `variants[]` exists but stays empty |
| Dual-evaluator scoring | v2.1 | Provider interface accommodates later |
| Cloud database migration (Neon/RDS/Supabase) | v2.2 | Connection string swap — zero code changes |
| Longitudinal tracking | v2.2 | Schema has fields, no query logic yet |
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
- Environment-gated: checked **only** when `NODE_ENV === 'development'`.
- Auto-seeds a default admin session for `julio@datacracy.co`.
- **Hard fail-safe:** Production guard throws if `AUTH_BYPASS=true` and `NODE_ENV === 'production'`.
- **Must be removed or permanently disabled before v0.5 (pilot).**

---

## 8. Testing Conventions

| Aspect | Convention |
|---|---|
| Location | `tests/` directory, mirroring `src/` |
| Runner | Vitest (or Jest — decide at init, stay consistent) |
| Naming | `{feature}.test.ts` or `{feature}.spec.ts` |
| Run | `npm test` (all), `npm test -- --filter {pattern}` (specific) |
| Minimum per feature | Happy path, one error case, edge case if spec mentions one |
| Pipeline tests | Mock LLM providers. Never make real API calls. |
| Database tests | Use `core_assessment_test` database. Reset between suites. |
| Dashboard transforms | Pure function tests — input → expected output. No mocking. |
| Content validation | `scripts/validate/` serves as the content test suite. |

---

## 9. Documentation Conventions

| File | Purpose | When to Update |
|---|---|---|
| `docs/briefs/` | Implementation briefs | Never modify — reference artifacts |
| `CHANGELOG.md` | Version-level changes | After each feature completion |
| `CLAUDE.md` | This file | After version block completion or new pattern |
| `README.md` | Setup, run, deploy | After project init and major infra changes |

---

## 10. Git Conventions

| Aspect | Format |
|---|---|
| Commit messages | `feat(0.1.1): add assessment-meta.json` / `fix(0.2.3): timer issue` |
| Commit prefixes | `feat`, `fix`, `test`, `docs`, `refactor`, `chore` |
| Feature scope | Feature ID in parens: `(0.1.1)`, `(0.3.4)` |
| Tags | `v0.X.Y-feature-N` per feature, `v0.X.0` per milestone |
| Branching | Single `main` branch for v0.x. Feature branches optional. |

---

## 11. What NOT to Do

> **Read this before every task.**

- ❌ **Don't add auth/RBAC complexity.** v1 = Admin + Test-Taker. That's it.
- ❌ **Don't store structured data on filesystem.** Queryable data → PostgreSQL.
- ❌ **Don't write raw SQL outside migration files.** Use Drizzle ORM.
- ❌ **Don't install unnecessary dependencies.** Check existing stack first.
- ❌ **Don't restructure folders.** §2 is canonical.
- ❌ **Don't build v2+ features.** Check §6 first.
- ❌ **Don't modify raw responses.** Immutable after submission.
- ❌ **Don't call LLM SDKs directly.** Use provider abstraction.
- ❌ **Don't put business logic in components.** Components render. Transforms compute.
- ❌ **Don't bypass DataProvider.** No direct queries in routes or components.
- ❌ **Don't populate `variants[]`.** Empty in v1.
- ❌ **Don't hardcode section order.** Read `order` from `assessment-meta.json`.
- ❌ **Don't hardcode user-facing text in components.** All strings come from `content/ui-strings/{lang}.json`. No English literals in React components.

---

## 12. Deployment Target

| Property | Value |
|---|---|
| **Domains** | `assessment.dataforgetechnologies.com`, `assessment.enesol.ai`, `evaluacion.datacracy.co` |
| **Server** | AWS EC2, Ubuntu 24.04 LTS |
| **Database** | PostgreSQL 16 on same EC2 instance (v1.0) |
| **App path (server)** | `/home/ubuntu/core-assessment` |
| **App path (local)** | `/Users/jutuonair/GDrive/ProductDevelopment/core-assessment` |
| **Process manager** | pm2 |
| **Reverse proxy + SSL** | Automatic SSL certificate management with multi-domain support. Caddy recommended. |
| **Env file (server)** | `.env.production` (gitignored) |

**Key env vars:** `DATABASE_URL`, `ANTHROPIC_API_KEY`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `JWT_SECRET`, `EMAIL_FROM`, `SEED_DOMAINS`, `SEED_ADMIN_EMAIL`.

**What this means for code:**

- The app handles HTTP only (localhost:3000). The reverse proxy handles HTTPS termination, automatic certificate provisioning/renewal, and multi-domain routing. No external load balancer or manual certificate management required.
- All three domains serve the same application. No domain-specific routing in the app.
- Deploy workflow: `git pull → npm install → npx drizzle-kit migrate → npm run build → pm2 restart`. Scripts: `scripts/db/setup-ec2.sh` (first-time), `scripts/deploy/ec2-deploy.sh` (repeating).

---

## 13. Companion Docs

| Spec | Version | Covers |
|---|---|---|
| Functional Spec | v2.4 | Assessment design, sections, scoring, auth, schemas |
| AI Evaluation Technical Spec | v1.5 | Pipeline architecture, prompts, golden tests, calibration |
| Dashboard Module Spec | v1.2 | Three-layer dashboard, PostgresProvider, transforms, access control |
| UI Experience Spec | v1.0 | Screen-by-screen test-taker UX |
| Design Philosophy | v1.0 | 7 cognitive patterns, section mapping |
| Versioning Roadmap | v1.2 | Version scheme, milestone gates, dependency chain |
| Future Backlog Spec | v2.2 | Everything deferred to v2+ |
| RUNBOOK | 1.2 | Local setup, build workflow, EC2 deployment |

**Key entities:**

| Entity | Description |
|---|---|
| `julio@datacracy.co` | Seeded initial Admin |
| Seed domains | `enesol.ai`, `dataforgetechnologies.com`, `datacracy.co` |
| Assessment | 5 sections, 70 questions in pool, 34 served per session, ~48 min |
| Question types | `single_select` (32), `multi_select` (16), `drag_to_order` (6), `open_ended` (16) |
| Section order | S1→S4→S3→S2→S5 |
| Database | PostgreSQL 16, Drizzle ORM, JSONB + indexed scalars |
| Languages | English (default), Spanish. Domain defaults: `evaluacion.datacracy.co` → es, others → en. User can switch at login. |

---

*CLAUDE.md Version: 1.2 · Updated: April 2026*
