# CORE Assessment Platform

> **C**ritical **O**bservation, **R**easoning & **E**xecution — a timed, multi-format cognitive assessment that identifies individuals who can direct AI effectively in vibe-coding environments.

- **Specs:** [`specs/00_PROJECT_OVERVIEW.md`](specs/00_PROJECT_OVERVIEW.md), [`specs/01_ARCHITECTURE.md`](specs/01_ARCHITECTURE.md), [`specs/02_FUNCTIONAL_SPECS.md`](specs/02_FUNCTIONAL_SPECS.md), [`specs/03_UI_EXPERIENCE.md`](specs/03_UI_EXPERIENCE.md)
- **Agent instructions:** [`CLAUDE.md`](CLAUDE.md)
- **Release notes:** [`CHANGELOG.md`](CHANGELOG.md)
- **Repository:** [github.com/enesol-julio/core-assessment](https://github.com/enesol-julio/core-assessment)
- **Production:** `assessment.dataforgetechnologies.com` · `assessment.enesol.ai` · `evaluacion.datacracy.co`

---

## What this is

A Next.js 14+ monolith with three subsystems:

1. **Assessment delivery** — 5-section timed assessment (70-question pool, 34 served per session, ~48 min). No back-navigation, per-question timers, auto-advance on timeout. Bilingual EN + ES.
2. **AI evaluation pipeline** — 3-step chain (Sonnet scoring → deterministic aggregation → Opus synthesis) producing a full Responder Profile per submission. All LLM calls audited.
3. **Admin dashboard** — Recharts-backed UI for ranking, distributions, section heatmap, individual drill-down, and operational health (pipeline + golden tests).

Storage: PostgreSQL 16 via Drizzle ORM for structured data; `data/` for append-only operational artifacts (audit trail, backups).

Auth: Email OTP via Microsoft Graph with domain allowlist; JWT session cookie; two roles (Admin, Test-Taker).

## Current state

All v0.1 through v0.5 infrastructure milestones are complete. The remaining gate is real-pilot execution — human recruitment plus production credentials (Anthropic API, Microsoft Graph). See [`CLAUDE.md`](CLAUDE.md) §5 for the feature tracker and [`CHANGELOG.md`](CHANGELOG.md) for per-feature notes.

---

## Prerequisites

- **Node.js 20+** (Node 25 tested in dev)
- **PostgreSQL 16** running locally on `localhost:5432`
- **macOS / Linux**

---

## Quick start

```bash
# 1. Install deps
npm install

# 2. Provision the database
psql postgres <<'SQL'
CREATE ROLE core WITH LOGIN PASSWORD 'core';
CREATE DATABASE core_assessment OWNER core;
GRANT ALL PRIVILEGES ON DATABASE core_assessment TO core;
SQL

# 3. Copy env template, set JWT_SECRET, optionally add real credentials later
cp .env.example .env.local
openssl rand -base64 32     # paste as JWT_SECRET in .env.local

# 4. Apply migrations + seed admin user and allowed domains
npm run db:migrate
npm run db:seed

# 5. Start the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With `AUTH_BYPASS=true` in `.env.local` (default in the template), you're auto-signed-in as `julio@datacracy.co` with admin role — no OTP round trip in dev.

The pipeline uses a deterministic FixtureProvider whenever `ANTHROPIC_API_KEY` is unset, so the full submit → evaluate → dashboard flow works without API credits.

---

## Environment variables

See [`.env.example`](.env.example) for the full template. The key ones:

| Variable | Required for | Notes |
|---|---|---|
| `DATABASE_URL` | Everything | `postgres://core:core@localhost:5432/core_assessment` by default |
| `JWT_SECRET` | Session cookies | 32-byte base64 — never commit |
| `AUTH_BYPASS` | Dev only | `true` auto-seeds admin session. **Throws at production server runtime.** |
| `AZURE_TENANT_ID` / `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` | Real OTP email | Dev falls back to logging the code to stdout + `data/audit/otp/` |
| `EMAIL_FROM` | Real OTP email | Sender mailbox used by Microsoft Graph |
| `ANTHROPIC_API_KEY` | Real pipeline | Dev auto-falls-back to the fixture provider |
| `PIPELINE_PROVIDER` | Override | Force `fixture` or `anthropic` explicitly |
| `PIPELINE_SCORING_MODEL` / `PIPELINE_SYNTHESIS_MODEL` | Real pipeline | Defaults: Sonnet 4.5 for scoring, Opus 4.5 for synthesis |
| `SEED_DOMAINS`, `SEED_ADMIN_EMAIL` | `npm run db:seed` | Initial allowlist and admin identity |

---

## Scripts

### Run / build

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server; `instrumentation.ts` auto-applies migrations at startup |
| `npm run build` | Production build (30 routes) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

### Database (Drizzle)

| Script | What it does |
|---|---|
| `npm run db:generate` | Generate a new migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Idempotent seed of admin user + allowed domains |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:drop` | Remove most-recent migration entry (for manual revert) |

### Content + smoke tests

| Script | What it does |
|---|---|
| `npm run validate:content` | Zod-validate `content/assessment-meta.json` + 5 section files with cross-reference checks |
| `npm run smoke:auth` | OTP issue / consume / expire / reuse; find-or-create user; JWT round-trip |
| `npm run smoke:domains` | Domain allowlist CRUD + last-domain safety guard |
| `npm run smoke:scoring` | Deterministic scoring (single / multi / drag / composite / classify) |
| `npm run smoke:auth-gate` | JWT role + tampering checks |
| `npm run smoke:content` | EN/ES overlay merge, UI string fallback, selection constraints |
| `npm run smoke:assess` | Full start → submit flow; checks no answer-revealing fields leak to the client |
| `npm run smoke:pipeline` | 3-step pipeline end-to-end against the fixture provider; profile versioning + audit |
| `npm run smoke:v03` | Calibration activates at n=10, golden test suite, batch rescore |
| `npm run smoke:dashboard` | DataProvider + transforms + ranking + heatmap + operations metrics |

### Pilot

| Script | What it does |
|---|---|
| `npm run pilot:readiness` | 15-item checklist; exits 1 when creds / seeds are missing |
| `npm run pilot:seed-golden` | Seed 20 golden test responses (idempotent) |
| `npm run pilot:simulate -- --n=8` | Simulate 5–8 participants end-to-end under the fixture provider |
| `npm run pilot:validate` | Distributions + variance + feedback analysis; exits 1 on ceiling/floor effects above 60% |

---

## Architecture at a glance

```
src/
├── app/
│   ├── (assessment)/        # Test-taker pages (/assess, /complete)
│   ├── (admin)/             # Admin pages (/dashboard, /ops, /settings) — server-gated
│   └── api/                 # 25 route handlers
├── db/                      # Drizzle schema + migration runner + seed
├── services/
│   ├── pipeline/            # Orchestrator + Anthropic/Fixture providers + audit + calibration + golden tests
│   ├── assessment/          # Start + submit (auto-score objective types, persist raw response)
│   └── dashboard/           # DataProvider interface + PostgresProvider + pure-function transforms
├── lib/
│   ├── auth/                # OTP, JWT, Graph email sender, middleware, domains
│   ├── content/             # Meta + section loaders with EN/ES overlay merge + question selection
│   ├── scoring/             # Deterministic scoring functions
│   └── types/               # Shared Zod schemas
├── components/              # React components (assessment + dashboard + admin)
└── instrumentation.ts       # Next.js hook that auto-runs migrations in dev
```

See [`specs/01_ARCHITECTURE.md`](specs/01_ARCHITECTURE.md) for the full system design.

---

## Running the pipeline

With `ANTHROPIC_API_KEY` unset or left at the `.env.example` placeholder, the pipeline uses a deterministic **FixtureProvider** that returns synthetic scores and profiles — useful for dev + CI without consuming API credits.

With a real key, it automatically switches to **AnthropicProvider** (Sonnet for Step 1 at temp 0.1, Opus for Step 3 at temp 0.4). Every LLM call writes an audit record to `data/audit/{YYYY-MM-DD}/{call-id}.json` with a SHA-256 prompt hash for exact reproduction.

Force one or the other:

```bash
PIPELINE_PROVIDER=fixture  npm run smoke:pipeline
PIPELINE_PROVIDER=anthropic npm run smoke:pipeline
```

---

## Deployment

v1.0 deployment target is a single EC2 instance (Ubuntu 24.04 LTS) running PostgreSQL 16 on the same instance, with Caddy (or equivalent) terminating SSL for all three production domains and proxying to `localhost:3000`. See [`specs/01_ARCHITECTURE.md`](specs/01_ARCHITECTURE.md) §10 for deployment details.

Deploy flow: `git pull && npm install && npx drizzle-kit migrate && npm run build && pm2 restart core-assessment`.

---

## Setup guides

- [`docs/AZURE_APP_REGISTRATION_SETUP.md`](docs/AZURE_APP_REGISTRATION_SETUP.md) — Register the Entra ID app for Graph-based OTP email
- [`docs/M365_GRAPH_SETUP.md`](docs/M365_GRAPH_SETUP.md) — Create the sender mailbox and wire env vars
- [`docs/TRANSLATION_REVIEWER_NOTES.md`](docs/TRANSLATION_REVIEWER_NOTES.md) — Bilingual question-authoring judgment calls for reviewers

---

## License

Private. All rights reserved.
