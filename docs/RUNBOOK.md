# CORE Assessment Platform — RUNBOOK

## Operator's Manual: Zero to Running Project

**Project:** CORE Assessment Platform
**Repository:** [github.com/enesol-julio/core-assessment](https://github.com/enesol-julio/core-assessment)
**Local path (macOS):** `/Users/jutuonair/GDrive/ProductDevelopment/core-assessment`
**Production domain:** `assessment.dataforgetechnologies.com`
**Server:** AWS EC2 (Ubuntu 24.04 LTS) behind ALB with ACM SSL
**Server app path:** `/home/ubuntu/core-assessment`
**Author:** Julio (julio@datacracy.co)
**Created:** February 2026

**This file lives at:** `docs/RUNBOOK.md` in the repo (version-controlled).

---

# PART 1: INITIAL SETUP

Everything you need to go from the cloned repository to a committed, pushed scaffold.

---

## 1.1 Prerequisites

Install the following before touching the project:

| Tool | Version | Install Command / Notes |
|---|---|---|
| **Node.js** | 20 LTS (≥20.11) | `brew install node@20` or use [nvm](https://github.com/nvm-sh/nvm): `nvm install 20` |
| **npm** | ≥10.x | Ships with Node.js 20. Verify: `npm --version` |
| **Git** | ≥2.40 | `brew install git`. Verify: `git --version` |
| **VS Code** | Latest | [code.visualstudio.com](https://code.visualstudio.com/) |
| **Claude Code CLI** | Latest | `npm install -g @anthropic-ai/claude-code`. Verify: `claude --version` |
| **Anthropic API Key** | Active key | [console.anthropic.com](https://console.anthropic.com/) — needed for pipeline (v0.3+) and Claude Code |
| **GitHub CLI** (optional) | ≥2.x | `brew install gh` — makes repo creation easier |

**VS Code Extensions (recommended):**

- **ESLint** — `dbaeumer.vscode-eslint`
- **Tailwind CSS IntelliSense** — `bradlc.vscode-tailwindcss`
- **Prettier** — `esbenp.prettier-vscode`
- **TypeScript Importer** — `pmneo.tsimporter`
- **GitLens** — `eamodio.gitlens`

**Verify everything works:**

```bash
node --version      # v20.x.x
npm --version       # 10.x.x
git --version       # 2.40+
claude --version    # Should print version
code --version      # Should print version
```

---

## 1.2 Repository Setup

The GitHub repo (`enesol-julio/core-assessment`) has already been created and cloned locally to `/Users/jutuonair/GDrive/ProductDevelopment/core-assessment`. The repo currently contains a `README.md` and `.gitignore` (Node template) from GitHub initialization.

### Step 1: Navigate into the cloned repo

```bash
cd /Users/jutuonair/GDrive/ProductDevelopment/core-assessment
```

Verify the remote is set:

```bash
git remote -v
# Should show:
# origin  https://github.com/enesol-julio/core-assessment.git (fetch)
# origin  https://github.com/enesol-julio/core-assessment.git (push)
```

### Step 2: Set your commit identity

```bash
git config user.email "julio@datacracy.co"
git config user.name "Julio"
```

### Step 3: Scaffold the Next.js project inside the existing repo

Because the repo already exists with files in it, we scaffold Next.js into the current directory using `.` as the target:

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack
```

When prompted:
- Would you like to use `src/` directory? → **Yes**
- Would you like to use App Router? → **Yes**
- Would you like to use Tailwind CSS? → **Yes**

**Note:** `create-next-app` may warn about the directory not being empty (because of `README.md` and `.gitignore`). This is fine — it will merge its output with the existing files. If it overwrites `.gitignore`, we'll replace it in Step 6.

### Step 4: Verify the scaffold works

```bash
npm run dev
# Visit http://localhost:3000 — should see default Next.js page
# Ctrl+C to stop
```

### Step 5: Create the canonical folder structure

Run the following to create every directory the project needs. This matches the structure in `CLAUDE.md` §2 exactly — do not deviate.

```bash
# Assessment pages
mkdir -p src/app/\(assessment\)/assess
mkdir -p src/app/\(assessment\)/complete

# Admin pages
mkdir -p src/app/\(admin\)/dashboard
mkdir -p src/app/\(admin\)/ops
mkdir -p src/app/\(admin\)/settings

# API routes
mkdir -p src/app/api/auth
mkdir -p src/app/api/assess
mkdir -p src/app/api/evaluate
mkdir -p src/app/api/profiles
mkdir -p src/app/api/calibration
mkdir -p src/app/api/dashboard
mkdir -p src/app/api/golden-test
mkdir -p src/app/api/admin

# Services
mkdir -p src/services/pipeline/providers
mkdir -p src/services/pipeline/steps
mkdir -p src/services/pipeline/calibration
mkdir -p src/services/pipeline/golden-test
mkdir -p src/services/pipeline/audit
mkdir -p src/services/pipeline/schemas
mkdir -p src/services/dashboard/interfaces
mkdir -p src/services/dashboard/providers
mkdir -p src/services/dashboard/transforms

# Lib
mkdir -p src/lib/auth
mkdir -p src/lib/scoring
mkdir -p src/lib/types
mkdir -p src/lib/utils

# Components
mkdir -p src/components/assessment
mkdir -p src/components/dashboard
mkdir -p src/components/admin
mkdir -p src/components/shared

# Hooks
mkdir -p src/hooks

# Content (version-controlled)
mkdir -p content/sections

# Runtime data (gitignored)
mkdir -p data/responses
mkdir -p data/profiles
mkdir -p data/calibration/history
mkdir -p data/pipeline/runs
mkdir -p data/golden-tests/runs
mkdir -p data/audit
mkdir -p data/users

# Prompts
mkdir -p prompts

# Docs
mkdir -p docs/briefs

# Tests
mkdir -p tests

# Scripts
mkdir -p scripts
```

### Step 6: Replace `.gitignore`

```bash
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Next.js
.next/
out/

# Production
build/

# Runtime data — NEVER commit
data/

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/settings.json
.idea/
*.swp
*.swo
.DS_Store

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts
EOF
```

**Critical:** The `data/` directory is gitignored. It contains runtime data (responses, profiles, calibration, audit logs). Assessment content lives in `content/` and IS committed.

### Step 7: Add placeholder files to empty directories

Git doesn't track empty directories. Add `.gitkeep` files so the structure persists:

```bash
find content data docs/briefs prompts tests scripts src/services src/lib src/components src/hooks \
  -type d -empty -exec touch {}/.gitkeep \;
```

Verify:

```bash
find . -name ".gitkeep" -not -path "./node_modules/*" | sort
```

---

## 1.3 CLAUDE.md Placement

`CLAUDE.md` lives at the **project root** — the same level as `package.json`.

```
core-assessment/
├── CLAUDE.md          ← HERE
├── package.json
├── src/
├── content/
└── ...
```

**How Claude Code discovers it:** Claude Code automatically reads `CLAUDE.md` from the project root at the start of every session. No configuration needed. As long as the file is at the root, Claude Code will load it.

**Action:** If `CLAUDE.md` is not already in the project root (it should have been placed there before the scaffold), copy it from the planning docs:

```bash
# Only if CLAUDE.md is not already at the root
cp /path/to/your/planning-docs/CLAUDE.md ./CLAUDE.md
```

Verify it's there:

```bash
ls -la CLAUDE.md
# Should show the file
```

**When to update CLAUDE.md:**
- After completing a version block (update §5 "Current Version Block")
- When a new convention is established that Claude Code needs to know
- When a pattern emerges during implementation that should be codified
- When the planning chat recommends a change (it will explicitly say so)

---

## 1.4 `docs/briefs/` Directory Setup

This is where implementation briefs from the planning chat (this Claude Project) get saved.

```
docs/
├── briefs/
│   ├── v0.1.1-assessment-metadata.md
│   ├── v0.1.2-section-definitions.md
│   ├── v0.1.3-question-authoring.md
│   └── ...
└── RUNBOOK.md          ← This file
```

**Naming convention:** `v{version}-{feature-slug}.md`

**Rules:**
- Briefs are reference artifacts — never modify them after saving
- They are committed to the repo (they're documentation, not runtime data)
- Claude Code reads them when you feed them as context

**Workflow:** After the planning chat produces a brief, download the MD file and save it here:

```bash
# Example
mv ~/Downloads/v0.1.1-assessment-metadata.md docs/briefs/
git add docs/briefs/v0.1.1-assessment-metadata.md
git commit -m "docs: add implementation brief for 0.1.1"
```

---

## 1.5 `.env.local` Setup

Create `.env.local` at the project root. This file is gitignored and never committed.

```bash
cat > .env.local << 'EOF'
# ─────────────────────────────────────────────
# CORE Assessment Platform — Environment Config
# ─────────────────────────────────────────────

# ── Application ──
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Authentication ──
# Secret used to sign JWT session tokens. Generate with: openssl rand -base64 32
JWT_SECRET=REPLACE_WITH_RANDOM_32_BYTE_BASE64_STRING

# OTP expiry in minutes (default: 10)
OTP_EXPIRY_MINUTES=10

# Session expiry in hours (default: 4)
SESSION_EXPIRY_HOURS=4

# ── Email Service (OTP delivery via Microsoft Graph API) ──
# Requires an Entra ID (Azure AD) app registration with Mail.Send application permission.
# Client credentials flow via @azure/msal-node.
# See docs/M365_GRAPH_SETUP.md for full setup instructions.
AZURE_TENANT_ID=REPLACE_WITH_YOUR_ENTRA_TENANT_ID
AZURE_CLIENT_ID=REPLACE_WITH_YOUR_ENTRA_APP_CLIENT_ID
AZURE_CLIENT_SECRET=REPLACE_WITH_YOUR_ENTRA_APP_CLIENT_SECRET
EMAIL_FROM=noreply@datacracy.co

# ── AI Pipeline ──
# Anthropic API key — required for v0.3+ (pipeline scoring and synthesis)
ANTHROPIC_API_KEY=sk-ant-REPLACE_WITH_YOUR_KEY

# OpenAI API key — fallback structure, not active in v1.0
# OPENAI_API_KEY=sk-REPLACE_WITH_YOUR_KEY

# Pipeline model configuration
PIPELINE_SCORING_MODEL=claude-sonnet-4-5-20250514
PIPELINE_SYNTHESIS_MODEL=claude-opus-4-5-20250514
PIPELINE_SCORING_TEMPERATURE=0.1
PIPELINE_SYNTHESIS_TEMPERATURE=0.4

# ── Storage ──
# Base directory for runtime data (relative to project root)
DATA_DIRECTORY=./data

# ── Dev Bypass (DEVELOPMENT ONLY — see §1.6) ──
AUTH_BYPASS=true
AUTH_BYPASS_EMAIL=julio@datacracy.co
AUTH_BYPASS_ROLE=admin

# ── Seed Data ──
# Comma-separated initial domain allowlist
SEED_DOMAINS=enesol.ai,dataforgetechnologies.com,datacracy.co
SEED_ADMIN_EMAIL=julio@datacracy.co
EOF
```

Verify it was created:

```bash
cat .env.local
```

**Notes:**
- `ANTHROPIC_API_KEY` is not needed until v0.3 (pipeline). Leave the placeholder during v0.1–v0.2.
- `AZURE_TENANT_ID` / `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` are not needed until v0.2 (auth). Leave placeholders until then. Setup requires an Entra ID app registration with `Mail.Send` application permission (client credentials flow via `@azure/msal-node`).
- `JWT_SECRET` — generate a real one when you need it: `openssl rand -base64 32`
- Never commit `.env.local`. It's in `.gitignore`.

---

## 1.6 Dev Bypass Configuration

During early development (pre-v0.2), authentication doesn't exist yet. The dev bypass lets you test the dashboard and pipeline without OTP login.

**How it works:**

Three env vars control it (already set in `.env.local` from §1.5):

```env
AUTH_BYPASS=true
AUTH_BYPASS_EMAIL=julio@datacracy.co
AUTH_BYPASS_ROLE=admin
```

**Rules (from CLAUDE.md §7):**

1. **Environment-gated:** The bypass is checked ONLY when `NODE_ENV === 'development'`.
2. **Auto-seeds a session:** When active, the app automatically creates an admin session for the bypass email.
3. **Hard fail-safe:** There MUST be a production guard at app startup that throws an error if `AUTH_BYPASS=true` and `NODE_ENV === 'production'`. This prevents accidental production deployment with bypass active.
4. **Removal deadline:** The bypass must be fully removed or permanently disabled before v0.5 (pilot).

**To verify it works (after v0.2 auth is built):**

1. Set `AUTH_BYPASS=true` in `.env.local`
2. Start the dev server: `npm run dev`
3. Navigate to an admin route (e.g., `/admin/dashboard`)
4. You should access it without any OTP flow
5. Set `AUTH_BYPASS=false`, restart, and verify you're redirected to login

**To disable:**

```bash
sed -i '' 's/AUTH_BYPASS=true/AUTH_BYPASS=false/' .env.local
```

---

## 1.7 Initial Commit and Push

The repo is already cloned and connected to GitHub. All we need to do is commit the scaffold and push.

### Step 1: Verify the remote

```bash
git remote -v
# Should show:
# origin  https://github.com/enesol-julio/core-assessment.git (fetch)
# origin  https://github.com/enesol-julio/core-assessment.git (push)
```

### Step 2: Stage and commit everything

```bash
git add .
git commit -m "chore: scaffold project with Next.js 14, TypeScript, Tailwind, canonical folder structure

- Next.js 14+ App Router with TypeScript and Tailwind CSS
- Canonical folder structure per CLAUDE.md §2
- CLAUDE.md at project root
- RUNBOOK.md in docs/
- .env.local template (gitignored)
- .gitkeep files for empty directories"
```

### Step 3: Push

```bash
git push origin main
```

### Step 4: Verify on GitHub

```bash
git log --oneline -3
# Should show your scaffold commit(s)

# Visit https://github.com/enesol-julio/core-assessment
# Should see your files with the correct folder structure
```

### Step 5: Create initial CHANGELOG.md

```bash
cat > CHANGELOG.md << 'EOF'
# CORE Assessment Platform — Changelog

## [Unreleased]

### v0.1 — Assessment Content & Schema
- Project scaffolded with Next.js 14+, TypeScript, Tailwind CSS
- Canonical folder structure created
- CLAUDE.md placed at project root

EOF

git add CHANGELOG.md
git commit -m "docs: add initial CHANGELOG"
git push
```

### Step 6: Create .env.example (committed reference)

This creates a sanitized copy of `.env.local` with only placeholders — safe to commit.

```bash
cat > .env.example << 'EOF'
# ─────────────────────────────────────────────
# CORE Assessment Platform — Environment Config
# ─────────────────────────────────────────────
# Copy this file to .env.local and fill in real values.
# .env.local is gitignored and never committed.

# ── Application ──
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Authentication ──
# Generate with: openssl rand -base64 32
JWT_SECRET=
OTP_EXPIRY_MINUTES=10
SESSION_EXPIRY_HOURS=4

# ── Email Service (OTP delivery via Microsoft Graph API) ──
# Requires Entra ID app registration with Mail.Send application permission.
# Client credentials flow via @azure/msal-node.
# See docs/M365_GRAPH_SETUP.md for setup instructions.
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
EMAIL_FROM=noreply@datacracy.co

# ── AI Pipeline ──
ANTHROPIC_API_KEY=
# OPENAI_API_KEY=
PIPELINE_SCORING_MODEL=claude-sonnet-4-5-20250514
PIPELINE_SYNTHESIS_MODEL=claude-opus-4-5-20250514
PIPELINE_SCORING_TEMPERATURE=0.1
PIPELINE_SYNTHESIS_TEMPERATURE=0.4

# ── Storage ──
DATA_DIRECTORY=./data

# ── Dev Bypass (DEVELOPMENT ONLY) ──
AUTH_BYPASS=true
AUTH_BYPASS_EMAIL=julio@datacracy.co
AUTH_BYPASS_ROLE=admin

# ── Seed Data ──
SEED_DOMAINS=enesol.ai,dataforgetechnologies.com,datacracy.co
SEED_ADMIN_EMAIL=julio@datacracy.co
EOF

git add .env.example
git commit -m "docs: add .env.example with placeholder values"
git push
```

**At this point:** You have a clean scaffold pushed to GitHub, with the correct folder structure, `CLAUDE.md` in place, environment variables configured, and you're ready to start the build workflow.

---

## 1.8 SSH Configuration (Local Mac → EC2)

Set up a named SSH shortcut so you can connect to the EC2 server without remembering the IP or PEM path.

### Step 1: Move PEM to SSH directory

```bash
mv ~/Downloads/YOUR_KEY_NAME.pem ~/.ssh/core-assessment.pem
chmod 400 ~/.ssh/core-assessment.pem
```

### Step 2: Create SSH config entry

Edit `~/.ssh/config` (create it if it doesn't exist):

```bash
nano ~/.ssh/config
```

Add:

```
Host core-assessment
    HostName YOUR_EC2_PUBLIC_IP
    User ubuntu
    IdentityFile ~/.ssh/core-assessment.pem
    StrictHostKeyChecking accept-new
```

Replace `YOUR_EC2_PUBLIC_IP` with the actual IP. **This file stays local — it is not committed to the repo.**

### Step 3: Verify connection

```bash
ssh core-assessment
# Should drop you into the EC2 Ubuntu shell
# exit to return
```

### Step 4: Quick commands you'll use

```bash
# SSH into server
ssh core-assessment

# Copy a file TO the server
scp local-file.txt core-assessment:/home/ubuntu/

# Copy a file FROM the server
scp core-assessment:/home/ubuntu/some-file.txt ./
```

---

# PART 2: BUILD WORKFLOW (REPEATING CYCLE)

This is the loop you'll follow for every feature, from v0.1.1 through v0.5.3.

---

## 2.1 Planning Chat — Start a Feature

Open the **Claude Chat Project** (this Project — the one with all the spec docs in Project Knowledge).

**What to say — template:**

> I'm ready to start Feature {version.feature} — {Feature Name}.
>
> Current project state: {describe what's built, what's running, any issues}.
>
> Please create the implementation brief.

**Example:**

> I'm ready to start Feature 0.1.1 — Assessment Metadata File.
>
> Current project state: Fresh scaffold. Next.js 14 running. Folder structure created per CLAUDE.md. No content files yet.
>
> Please create the implementation brief.

**What happens:**
- The planning chat confirms the version block and feature number
- It checks prerequisites against the progress tracker
- It produces a downloadable implementation brief (MD file)

**What NOT to do:**
- Don't ask the planning chat to write code — it doesn't do that
- Don't mix features from different version blocks in the same chat
- Don't skip ahead to a later feature without confirming prerequisites are met

---

## 2.2 Receive and Save the Implementation Brief

The planning chat produces an implementation brief as a downloadable `.md` file.

**Save it:**

```bash
mv ~/Downloads/{brief-filename}.md docs/briefs/
git add docs/briefs/{brief-filename}.md
git commit -m "docs: add implementation brief for {feature-id}"
git push
```

**Brief structure (what you'll get):**

- Objective
- Spec sources and cross-references
- Prerequisites
- File-by-file creation/modification list
- Acceptance criteria
- Scope boundaries (what NOT to build)
- Claude Code instructions (architecture rules, conventions to respect)

---

## 2.3 Feed the Brief to Claude Code

### Option A: Direct invocation with brief

Open your terminal in the project directory and run:

```bash
cd /Users/jutuonair/GDrive/ProductDevelopment/core-assessment
claude
```

Once Claude Code starts, paste or reference the brief:

```
Please implement Feature {version.feature} — {Feature Name}.

The implementation brief is at docs/briefs/{filename}.md. Read it and follow its instructions exactly.
```

Claude Code will:
1. Read `CLAUDE.md` automatically (project root conventions)
2. Read the implementation brief you pointed it to
3. Create/modify files as specified
4. Run tests if applicable
5. Report what it built

### Option B: Feed the brief content directly

If the brief is short or you want to be explicit:

```
Implement the following feature. Follow CLAUDE.md conventions.

[paste brief content]
```

### Tips for Claude Code sessions:

- **Be specific about what's done:** If some files already exist, tell Claude Code so it doesn't overwrite them.
- **One feature per session when possible.** Claude Code works best with focused scope.
- **Let it run tests.** If the brief specifies acceptance criteria with testable conditions, ask Claude Code to write and run tests.
- **If it gets stuck:** Don't fight it for more than 2 attempts. Escalate to the planning chat (see §2.5 and Part 4).

---

## 2.4 Validate a Completed Feature

After Claude Code finishes, verify the feature meets its acceptance criteria.

**General validation checklist:**

1. **Does it run?** `npm run dev` — no build errors, no console errors
2. **Do tests pass?** `npm test` (when tests exist)
3. **Does it match the brief?** Walk through each acceptance criterion listed in the brief
4. **Schema validation (v0.1)?** Run the schema validator: `npx ts-node scripts/validate-schemas.ts` (or whatever the validation tooling produces)
5. **Visual check (v0.2+)?** Open the browser and walk through the user flow
6. **Pipeline check (v0.3+)?** Submit a test response and verify a profile is generated
7. **Dashboard check (v0.4+)?** Load the dashboard and verify data renders correctly

**If validation fails:**

- Minor issues → Fix directly in Claude Code: "The timer display isn't showing the warning. Please fix per the acceptance criteria."
- Structural issues → Escalate to planning chat with specific error details

---

## 2.5 Feature Closeout — Tag, Sync, Update Progress

Once a feature passes validation:

### Step 1: Commit all changes

```bash
git add .
git commit -m "feat({feature-id}): {short description}"
# Example: git commit -m "feat(0.1.1): add assessment-meta.json"
```

### Step 2: Tag the feature

```bash
git tag v0.{X}.0-feature-{N}
# Example: git tag v0.1.0-feature-1
```

### Step 3: Push

```bash
git push
git push --tags
```

### Step 4: Update CHANGELOG.md

Add an entry under the current version block:

```markdown
## [v0.1.1] - 2026-MM-DD
### Added
- Assessment metadata file (content/assessment-meta.json)
- Schema validation for section weights, classification tiers
```

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for v{feature-id}"
git push
```

### Step 5: Report back to the planning chat

Return to the Claude Chat Project and confirm completion:

> Feature 0.1.1 — Assessment Metadata File is complete.
> All acceptance criteria pass. Tagged as v0.1.0-feature-1.
> Ready for the next feature.

The planning chat will:
- Update the progress tracker status to ✅ Complete
- Record the completion date
- Confirm what's next in the sequence

### Step 6: Update CLAUDE.md §5 (Current Version Block)

After each feature, update the "CURRENTLY BUILDING" block in `CLAUDE.md`:

```markdown
┌─────────────────────────────────────────────┐
│  CURRENTLY BUILDING: v0.1                   │
│  Feature: 0.1.2 — Section Definition Files  │
│  Status: In Progress                        │
└─────────────────────────────────────────────┘
```

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md current feature to 0.1.2"
git push
```

---

## 2.6 Milestone Block Closeout

When ALL features in a version block pass their acceptance criteria and the milestone gate is met:

### Step 1: Tag the milestone

```bash
git tag v0.{X}.0
# Example: git tag v0.1.0
```

### Step 2: Push the milestone tag

```bash
git push --tags
```

### Step 3: Report to planning chat

> v0.1 — Assessment Content & Schema is complete.
> Milestone gate passed: All 67 base questions authored, valid against JSON schema, section files pass validation, assessment-meta.json complete.
> Ready to begin v0.2.

### Step 4: Update CLAUDE.md §5 for the new version block

```markdown
┌─────────────────────────────────────────────┐
│  CURRENTLY BUILDING: v0.2                   │
│  Feature: 0.2.1 — Email OTP Authentication  │
│  Status: Not Started                        │
└─────────────────────────────────────────────┘
```

---

## 2.7 Transitioning to the Next Feature

The cycle repeats:

```
Planning Chat → Brief → Claude Code → Validate → Closeout → Planning Chat → ...
```

**Before starting the next feature, always verify:**

1. Previous feature is fully committed and pushed
2. `CLAUDE.md` §5 is updated with the new feature
3. Progress tracker in the planning chat reflects current state
4. Any issues or scope adjustments from the previous feature are noted

---

# PART 3: VERSION BLOCK SEQUENCE

A checklist-style walkthrough of every version block, with feature order, spec dependencies, and milestone gates.

---

## v0.1 — Assessment Content & Schema

**What this block builds:** All static assessment content — the questions, section definitions, metadata config, response schema, and validation tooling. No UI runs yet (except the validator).

**Spec docs to upload for this block's planning chat:** Already loaded as Project Knowledge — no additional uploads needed. The planning chat has all specs.

**Key references for this block:**
- `CORE_Assessment_Functional_Spec_v2_2.md` §2–§6 (sections, questions, scoring)
- `assessment-meta.json` (already generated — see note below)
- `question-bank-summary.md` (question reference table)
- `02_FUNCTIONAL_SPECS.md` Features 0.1.1–0.1.5

**⚠️ EXISTING CONTENT FILES:** The `assessment-meta.json` and question bank JSON files have already been generated during the planning phase. These files exist outside the repo and need to be placed into `content/` during the v0.1 build. The implementation briefs for Features 0.1.1–0.1.3 will specify exactly how to validate and integrate these existing files rather than creating them from scratch. If any content adjustments are needed to conform to the schema, the briefs will call those out.

### Feature Checklist

| # | Feature | Prerequisites | Key Output |
|---|---|---|---|
| 0.1.1 | Assessment Metadata File | None (root config) | `content/assessment-meta.json` |
| 0.1.2 | Section Definition Files (×5) | 0.1.1 (meta references section files) | `content/sections/section-{1-5}-*.json` |
| 0.1.3 | Question Content Authoring | 0.1.2 (section files exist) | 67 questions populated in section files |
| 0.1.4 | Assessment Response Schema | 0.1.1, 0.1.2 (needs section/question structure) | Response schema definition (Zod or JSON Schema) |
| 0.1.5 | Schema Validation Tooling | 0.1.1–0.1.4 (validates all content) | `scripts/validate-schemas.ts` |

### Milestone Gate

✅ All 67 base questions authored and valid against JSON schema
✅ Section files pass schema validation
✅ `assessment-meta.json` complete with correct weights (sum to 1.0), tiers (cover 0–100), question counts
✅ `variants[]` arrays present but empty (v2.0 content)
✅ Validation script runs clean with zero errors

**Tag:** `v0.1.0`

---

## v0.2 — Web Application + Authentication

**What this block builds:** The full interactive assessment delivery UI with email OTP authentication, domain allowlist, role enforcement, and deterministic scoring for objective questions.

**Key references for this block:**
- `CORE_Assessment_Functional_Spec_v2_2.md` §7.1–§7.3 (delivery), §7.6 (auth)
- `02_FUNCTIONAL_SPECS.md` Features 0.2.1–0.2.5
- `01_ARCHITECTURE.md` §2.1–§2.2 (web app, auth system), §9 (auth model)

**Additional setup needed before starting:**
- Microsoft Entra ID (Azure AD) app registration with `Mail.Send` application permission (client credentials flow)
- `@azure/msal-node` npm package installed
- `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` populated in `.env.local`
- `JWT_SECRET` generated: `openssl rand -base64 32`
- See `docs/M365_GRAPH_SETUP.md` for full Entra ID setup instructions

### Feature Checklist

| # | Feature | Prerequisites | Key Output |
|---|---|---|---|
| 0.2.1 | Email OTP Authentication | v0.1 complete, Entra ID app configured | `/api/auth/*` routes, session management, login page |
| 0.2.2 | Domain Allowlist Management | 0.2.1 (auth system) | Admin settings page, `/api/admin/domains` endpoints |
| 0.2.3 | Assessment Session Flow | v0.1 complete, 0.2.1 (user identity) | Full 5-section timed assessment UI, response capture |
| 0.2.4 | Deterministic Scoring Engine | 0.1.2 (scoring params), 0.1.1 (weights) | `src/lib/scoring/` — auto-scoring for objective types |
| 0.2.5 | Role-Based Route Protection | 0.2.1 (auth) | `requireAdmin` middleware on all protected routes |

### Milestone Gate

✅ User can log in via Email OTP (domain on allowlist)
✅ Unauthorized domains rejected at OTP request time
✅ Admin can add/remove domains from allowlist settings page
✅ Full 5-section assessment completable start to finish
✅ No back-navigation, no pause between sections, timers work correctly
✅ Responses captured with all metadata (timing, flags, environment)
✅ Objective questions auto-scored correctly
✅ Open-ended `score` fields remain null (pipeline fills these in v0.3)
✅ Admin routes return 401/403 for unauthorized access
✅ Dev bypass works in development, production guard throws if enabled in production

**Tag:** `v0.2.0`

**Post-milestone:** Disable dev bypass by setting `AUTH_BYPASS=false` (can re-enable for testing but start defaulting to real auth flow).

---

## v0.3 — AI Evaluation Pipeline

**What this block builds:** The 3-step AI evaluation pipeline that transforms raw assessment responses into scored, profiled results. This is the core intelligence of the platform.

**Key references for this block:**
- `CORE_AI_Evaluation_Technical_Spec_v1_3.md` (entire document — this is the primary spec)
- `02_FUNCTIONAL_SPECS.md` Features 0.3.1–0.3.8
- `01_ARCHITECTURE.md` §8 (pipeline architecture)

**Additional setup needed before starting:**
- `ANTHROPIC_API_KEY` must be a real, funded key in `.env.local`
- Budget awareness: each pipeline run costs ~$0.10–0.30

### Feature Checklist

| # | Feature | Prerequisites | Key Output |
|---|---|---|---|
| 0.3.1 | Pipeline Orchestrator (3-Step Chain) | v0.1 + v0.2 complete | `src/services/pipeline/pipeline.ts` — main coordinator |
| 0.3.2 | LLM Provider Abstraction | None (can be built early) | `src/services/pipeline/providers/` — LLMProvider interface |
| 0.3.3 | Open-Ended Scoring (Step 1) | 0.3.2 (provider), 0.1.2 (rubrics) | Scoring prompts, Step 1 logic, ScoreResult schema |
| 0.3.4 | Responder Profile Generation (Step 3) | 0.3.1, 0.3.3 (needs scored data) | Synthesis prompt, Step 3 logic, profile output |
| 0.3.5 | Calibration System | 0.3.4 (profiles must exist) | `src/services/pipeline/calibration/`, `data/calibration/` |
| 0.3.6 | Audit Trail | 0.3.2 (wraps LLM calls) | `src/services/pipeline/audit/`, `data/audit/` |
| 0.3.7 | Golden Test Framework | 0.3.3 (scoring prompt), 0.3.2 (multi-model) | Golden responses, pass/fail suite, drift detection |
| 0.3.8 | Re-Evaluation & Pipeline API | 0.3.1, 0.3.6 | `/api/evaluate/*` endpoints, batch re-score |

**Recommended build order note:** 0.3.2 (provider abstraction) can be built first since it's a standalone interface. Then 0.3.6 (audit) can be integrated early into the provider. Then 0.3.1 → 0.3.3 → 0.3.4 → 0.3.5 → 0.3.7 → 0.3.8.

### Milestone Gate

✅ Submitting an assessment response triggers the pipeline automatically
✅ All open-ended questions receive AI scores (0–5 range)
✅ Section and composite scores computed correctly with weights
✅ Complete Responder Profile generated and stored within 30 seconds
✅ Audit trail captures every LLM call with full metadata
✅ Re-evaluation creates new profile version without modifying original
✅ Golden test framework runs and passes all three thresholds (MAD ≤ 0.5, compliance ≥ 90%, zero extreme misses)
✅ Pipeline status endpoint reports step-by-step progress
✅ Error retry with exponential backoff works for transient LLM failures

**Tag:** `v0.3.0`

---

## v0.4 — Dashboard & Reporting

**What this block builds:** The admin-only analytics dashboards — manager view (ranking, distributions, drill-downs) and operational view (pipeline health, golden test status).

**Key references for this block:**
- `CORE_Dashboard_Module_Spec_v1_1.md` (entire document — primary spec)
- `02_FUNCTIONAL_SPECS.md` Features 0.4.1–0.4.5
- `01_ARCHITECTURE.md` §2.4 (dashboard module)

**Additional dependencies to install:**

```bash
npm install @tremor/react recharts
```

### Feature Checklist

| # | Feature | Prerequisites | Key Output |
|---|---|---|---|
| 0.4.1 | Data Access Layer (DataProvider) | v0.3 complete (profiles exist) | `src/services/dashboard/interfaces/`, `JsonFileProvider` |
| 0.4.2 | Transform Layer | 0.4.1 (data provider) | `src/services/dashboard/transforms/` — 5 transform modules |
| 0.4.3 | Manager/Admin Dashboard View | 0.4.1, 0.4.2, 0.2.5 (auth) | Dashboard page with all 6 components + drill-down |
| 0.4.4 | Operational Dashboard View | 0.4.1, 0.4.2, 0.3.6, 0.3.7 | Ops page with pipeline health + golden test status |
| 0.4.5 | Dashboard API Endpoints | 0.4.1, 0.4.2, 0.2.5 | 6 REST endpoints under `/api/dashboard/` |

### Milestone Gate

✅ Both dashboards render correctly with real profile data
✅ Ranking algorithm: fitness tier → composite score → name alphabetical
✅ Filters update all components simultaneously
✅ Individual drill-down shows full Responder Profile data
✅ Radar chart displays section scores with population reference line (when calibration exists)
✅ Operational dashboard shows pipeline health from audit trail
✅ Golden test status displays current pass/fail and MAD trend
✅ All dashboard routes return 401/403 for non-Admin users
✅ Dashboard loads in <2s for populations up to 500

**Tag:** `v0.4.0`

---

## v0.5 — Pilot

**What this block builds:** Nothing new in code. This is a validation phase — real users take the assessment, and results are analyzed.

**Key references:**
- `CORE_Versioning_Roadmap_v1_1.md` §3 (pilot details)
- `02_FUNCTIONAL_SPECS.md` Features 0.5.1–0.5.3
- `CORE_Assessment_Functional_Spec_v2_2.md` §7.5

**Pre-pilot checklist:**
- [ ] Dev bypass (`AUTH_BYPASS`) permanently disabled or removed
- [ ] Production guard verified (throws if bypass enabled in production)
- [ ] All three org domains in allowlist: `enesol.ai`, `dataforgetechnologies.com`, `datacracy.co`
- [ ] `julio@datacracy.co` confirmed as Admin
- [ ] Email OTP delivery tested from production/staging environment (via Microsoft Graph API)
- [ ] Pipeline tested end-to-end with real-looking responses
- [ ] Golden test suite passing all thresholds
- [ ] Dashboard rendering correctly with test data
- [ ] EC2 deployed and accessible at `https://assessment.dataforgetechnologies.com`
- [ ] SSL termination via ALB + ACM verified working
- [ ] `data/` backup procedure tested (see §5.8)

### Feature Checklist

| # | Feature | Prerequisites | Key Output |
|---|---|---|---|
| 0.5.1 | Pilot Setup & Recruitment | v0.1–v0.4 operational | 5–8 confirmed participants, scheduled sessions |
| 0.5.2 | Assessment Administration & Data Collection | 0.5.1 | Completed responses, profiles, structured feedback |
| 0.5.3 | Validation Analysis | 0.5.2 | Validation report, recommended adjustments |

### Milestone Gate

✅ 5–8 real users complete the assessment without technical failures
✅ All responses produce Responder Profiles within 30 seconds
✅ Score distribution shows meaningful spread (no ceiling/floor effects)
✅ Each section shows variance across participants
✅ Founders confirm profiles are "directionally correct" for known participants
✅ All identified issues documented with proposed fixes

**Tag:** `v0.5.0`

---

## v0.6–v0.9 → v1.0 — Pilot Fixes & Production

After v0.5, address any pilot-driven issues:

- Question content adjustments based on feedback
- Timing parameter tuning
- Scoring recalibration if distributions show problems
- Bug fixes discovered during pilot

Each fix gets its own tag in the v0.6–v0.9 range. When all pilot issues are resolved and content is locked:

**Tag:** `v1.0.0`

**v1.0 means:**
- Content locked (no more question changes)
- Pilot validated (founders have confidence in profiles)
- Auth enforced (no bypass, OTP required)
- Ready for all approved-domain users to take assessments

---

# PART 4: TROUBLESHOOTING

---

## 4.1 Common Claude Code Issues

### "Claude Code doesn't know about the project structure"

**Cause:** `CLAUDE.md` missing or not at the project root.
**Fix:** Verify `CLAUDE.md` exists at `core-assessment/CLAUDE.md`. Claude Code reads it automatically.

### "Claude Code creates files in the wrong location"

**Cause:** Claude Code didn't read or follow the canonical folder structure.
**Fix:** Start the session with: "Read CLAUDE.md before doing anything. Follow the folder structure in §2 exactly." If it persists, paste the relevant section of `CLAUDE.md` directly.

### "Claude Code adds dependencies I didn't ask for"

**Cause:** Claude Code may try to add libraries for convenience.
**Fix:** Check `package.json` diff after each session. If an unwanted dependency was added: `npm uninstall {package}` and remind Claude Code of the rule from `CLAUDE.md` §11: "Don't install unnecessary dependencies."

### "Claude Code tries to build v2+ features"

**Cause:** Scope creep — Claude Code inferred additional capabilities from the brief or from code patterns.
**Fix:** Stop it immediately. Point to `CLAUDE.md` §6 (Scope Boundaries) and the specific "NOT in scope" table. If the brief was ambiguous, escalate to the planning chat.

### "Claude Code session timed out mid-feature"

**Cause:** Long-running task exceeded session limits.
**Fix:** Start a new Claude Code session. Describe what was already built: "Feature 0.2.3 is partially complete. The timer component exists but auto-advance isn't implemented yet. Continue from there."

### "TypeScript errors after Claude Code finishes"

**Cause:** Incomplete type definitions or import mismatches.
**Fix:** Run `npx tsc --noEmit` to see all errors. Feed the error output to Claude Code: "Fix these TypeScript errors: [paste errors]"

### "Tests fail after a feature is built"

**Cause:** Tests for the new feature fail, or the new code broke existing tests.
**Fix:** Run `npm test` and feed the output to Claude Code. If the issue is architectural (wrong pattern, wrong layer), escalate to the planning chat.

---

## 4.2 When to Escalate to the Planning Chat vs. Handle Locally

### Handle locally (in Claude Code):

- Syntax errors, typos, missing imports
- Minor acceptance criteria gaps ("the button color is wrong")
- TypeScript type mismatches
- Test failures with obvious fixes
- Missing `.gitkeep` files or folder structure gaps

### Escalate to the planning chat:

- Claude Code makes the same mistake 2+ times
- Architectural confusion ("should this be in services/ or lib/?")
- Spec ambiguity ("the spec says X but also seems to say Y")
- Feature scope uncertainty ("does this feature include X?")
- Dependency chain questions ("can I start 0.3.4 before 0.3.3 is done?")
- Pipeline prompt tuning isn't producing good results
- Integration issues between subsystems (auth + pipeline, pipeline + dashboard)

**How to escalate:**

> Feature 0.2.3 — Assessment Session Flow is blocked.
>
> Claude Code built the timer component but auto-advance on timeout doesn't save the partial answer before advancing. I've tried fixing it twice and it keeps overwriting the response object.
>
> Here's the relevant code: [paste code]
> Here's the error: [paste error]
>
> How should this be structured?

The planning chat will diagnose the issue and either provide architectural guidance or update the brief.

---

## 4.3 Recovering from Bad Commits or Diverged State

### Undo the last commit (keep changes):

```bash
git reset --soft HEAD~1
```

### Undo the last commit (discard changes):

```bash
git reset --hard HEAD~1
```

### Revert a specific commit (safe — creates a new commit):

```bash
git revert {commit-hash}
```

### Force-reset to a known good tag:

```bash
git reset --hard v0.1.0-feature-2
git push --force-with-lease
```

⚠️ **Only force-push if you're the sole developer.** If others have pulled, coordinate first.

### Stash changes if you need to switch context:

```bash
git stash
# ... do other work ...
git stash pop
```

### Nuclear option — clone fresh and cherry-pick:

If the repo state is badly corrupted:

```bash
cd /Users/jutuonair/GDrive/ProductDevelopment
mv core-assessment core-assessment-backup
gh repo clone enesol-julio/core-assessment
cd core-assessment
# Cherry-pick good commits from the backup if needed
```

---

## 4.4 How to Update CLAUDE.md When the Project Evolves

`CLAUDE.md` is a living document. Update it when:

| Trigger | What to Update | Example |
|---|---|---|
| Feature completed | §5 — Current Version Block | Change "0.1.1" to "0.1.2" |
| Version block completed | §5 — Current Version Block | Change "v0.1" to "v0.2" |
| New convention established | §3 — Tech Stack & Conventions | Added Vitest as test runner |
| New pattern discovered | §4 — Architecture Invariants | All API routes must validate request body with Zod |
| Dependency added | §3 — Tech Stack table | Added `@azure/msal-node` for email delivery |
| Planning chat recommends | Wherever specified | Chat will say "Update CLAUDE.md §X to add..." |
| Scope creep attempted | §6 — Scope Boundaries | Add a new entry to the NOT in scope table |

**Process:**

1. Make the edit in `CLAUDE.md`
2. Commit: `git commit -m "docs: update CLAUDE.md — {what changed}"`
3. Push: `git push`
4. Mention the change in the next planning chat session so it stays in sync

**What NOT to change:**
- §2 (Folder Structure) — unless the planning chat explicitly approves a structural change
- §4 (Architecture Invariants) — these are inviolable design decisions; changes require planning chat approval
- §11 (What NOT to Do) — only add items, never remove them

---

## 4.5 Quick Reference: Common Commands

```bash
# ── Development ──
npm run dev                    # Start dev server (localhost:3000)
npm run build                  # Production build
npm run lint                   # Run ESLint
npm test                       # Run all tests
npx tsc --noEmit               # Type-check without emitting

# ── Claude Code ──
claude                         # Start Claude Code session in current dir

# ── Git ──
git add .
git commit -m "feat(0.X.Y): description"
git push
git tag v0.X.0-feature-N
git push --tags
git log --oneline --graph      # Visual commit history

# ── Schema Validation (after v0.1.5) ──
npx ts-node scripts/validate-schemas.ts

# ── Pipeline Testing (after v0.3) ──
# Submit a test response and check data/ for output
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"response_id": "test-response-1"}'

# Check pipeline status
curl http://localhost:3000/api/evaluate/test-response-1/status

# ── EC2 Deployment ──
ssh core-assessment                    # Connect to server
ssh core-assessment "cd /home/ubuntu/core-assessment && git pull && npm install && npm run build && pm2 restart core-assessment"  # One-line deploy
pm2 logs core-assessment               # View app logs (on server)
pm2 status                             # Check process status (on server)
sudo nginx -t                          # Test nginx config (on server)
sudo systemctl reload nginx            # Reload nginx after config change (on server)
```

---

## 4.6 Environment-Specific Notes

### macOS / Apple Silicon (Development)

- Node.js 20 LTS runs natively on Apple Silicon
- If you encounter `node-gyp` issues with native modules: `brew install python3` and ensure Xcode Command Line Tools are installed: `xcode-select --install`

### Ubuntu / EC2 (Staging & Production)

- The deployment target is an AWS EC2 instance running Ubuntu 24.04 LTS
- Domain: `assessment.dataforgetechnologies.com`
- SSL is terminated at the ALB (AWS Certificate Manager) — the EC2 instance itself handles HTTP only
- Nginx on the instance proxies port 80 → localhost:3000
- Process managed by pm2 (auto-restart on crash, startup on reboot)
- Full server setup instructions in **Part 5: EC2 Server Setup & Deployment**

### Persistent Filesystem

The v1.0 architecture stores all data as JSON files in the `data/` directory. The EC2 instance has persistent disk (EBS volume), so file writes persist across deployments and reboots. This is one of the key reasons a VPS was chosen over serverless platforms. Local development (`npm run dev`) also has no issues. **Do not deploy to Vercel or other serverless platforms** — file writes won't persist between invocations.

### API Key Security

- Never commit `.env.local` or `.env.production`
- Never paste API keys into Claude Code chat (it logs conversations)
- On the EC2 server, environment variables live in `/home/ubuntu/core-assessment/.env.production` — this file is gitignored and must be created manually on the server
- Use `chmod 600 .env.production` to restrict read access to the ubuntu user

---

# PART 5: EC2 SERVER SETUP & DEPLOYMENT

Everything needed to go from a fresh EC2 Ubuntu instance to a running production application.

**What's handled elsewhere:** SSL termination (AWS Certificate Manager), ALB configuration, and DNS routing are managed by the sysadmin and are not covered here. This section covers the EC2 instance itself.

---

## 5.1 EC2 Instance Requirements

| Resource | Minimum | Recommended |
|---|---|---|
| **Instance type** | t3.small (2 vCPU, 2 GB RAM) | t3.medium (2 vCPU, 4 GB RAM) |
| **OS** | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |
| **Storage** | 20 GB EBS (gp3) | 30 GB EBS (gp3) |
| **Security groups** | SSH (22) from your IP, HTTP (80) from ALB SG | Same |

**Why t3.small/medium:** Next.js build process is memory-hungry. 1 GB RAM will OOM during `npm run build`. 2 GB is the minimum; 4 GB is comfortable for build + runtime + pipeline (LLM calls are outbound HTTP, not CPU/memory intensive).

**Important:** Port 3000 and port 443 should NOT be open in the EC2 security group. The ALB handles HTTPS (443) and forwards to the instance on port 80. Nginx on the instance proxies port 80 → localhost:3000.

---

## 5.2 Initial Server Provisioning

SSH into the server and run these commands once.

```bash
ssh core-assessment
```

### Step 1: System updates

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version    # v20.x.x
npm --version     # 10.x.x
```

### Step 3: Install pm2 (process manager)

```bash
sudo npm install -g pm2
```

### Step 4: Install nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Step 5: Install Git

```bash
sudo apt install -y git
git --version     # Should be 2.40+
```

### Step 6: Configure Git and clone the repo

```bash
git config --global user.email "julio@datacracy.co"
git config --global user.name "Julio"

cd /home/ubuntu
git clone https://github.com/enesol-julio/core-assessment.git
cd core-assessment
```

**Note:** If the repo is private, you'll need a GitHub Personal Access Token (PAT) or deploy key. For PAT:

```bash
git clone https://YOUR_PAT@github.com/enesol-julio/core-assessment.git
```

Or configure a deploy key (read-only SSH key added to the repo's Settings → Deploy Keys).

---

## 5.3 Environment Variables (Production)

Create the production environment file on the server. **This file is never committed to Git.**

```bash
cd /home/ubuntu/core-assessment
cat > .env.production << 'EOF'
# ─────────────────────────────────────────────
# CORE Assessment Platform — Production Config
# ─────────────────────────────────────────────

# ── Application ──
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://assessment.dataforgetechnologies.com

# ── Authentication ──
JWT_SECRET=REPLACE_WITH_REAL_SECRET
OTP_EXPIRY_MINUTES=10
SESSION_EXPIRY_HOURS=4

# ── Email Service (OTP delivery via Microsoft Graph API) ──
# Entra ID app registration with Mail.Send application permission.
AZURE_TENANT_ID=REPLACE_WITH_YOUR_ENTRA_TENANT_ID
AZURE_CLIENT_ID=REPLACE_WITH_YOUR_ENTRA_APP_CLIENT_ID
AZURE_CLIENT_SECRET=REPLACE_WITH_YOUR_ENTRA_APP_CLIENT_SECRET
EMAIL_FROM=noreply@datacracy.co

# ── AI Pipeline ──
ANTHROPIC_API_KEY=sk-ant-REPLACE_WITH_YOUR_KEY
PIPELINE_SCORING_MODEL=claude-sonnet-4-5-20250514
PIPELINE_SYNTHESIS_MODEL=claude-opus-4-5-20250514
PIPELINE_SCORING_TEMPERATURE=0.1
PIPELINE_SYNTHESIS_TEMPERATURE=0.4

# ── Storage ──
DATA_DIRECTORY=./data

# ── Dev Bypass — MUST be false in production ──
AUTH_BYPASS=false

# ── Seed Data ──
SEED_DOMAINS=enesol.ai,dataforgetechnologies.com,datacracy.co
SEED_ADMIN_EMAIL=julio@datacracy.co
EOF
```

Lock down permissions:

```bash
chmod 600 .env.production
```

Generate a real JWT secret:

```bash
openssl rand -base64 32
# Paste the output into JWT_SECRET above
```

---

## 5.4 Nginx Configuration

The ALB terminates SSL and forwards traffic to the EC2 instance on port 80. Nginx on the instance proxies port 80 to the Next.js app on port 3000.

```bash
sudo nano /etc/nginx/sites-available/core-assessment
```

```nginx
server {
    listen 80;
    server_name assessment.dataforgetechnologies.com;

    # Proxy to Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout for pipeline requests (LLM calls can take 30+ seconds)
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 120s;
    }

    # Don't expose data directory
    location /data {
        deny all;
        return 404;
    }
}
```

Enable the site and test:

```bash
sudo ln -s /etc/nginx/sites-available/core-assessment /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default    # Remove default site
sudo nginx -t                                   # Test config — must say "ok"
sudo systemctl reload nginx
```

---

## 5.5 First Build & Launch

```bash
cd /home/ubuntu/core-assessment

# Install dependencies
npm install

# Build the Next.js production app
npm run build

# Start with pm2
pm2 start npm --name "core-assessment" -- start
pm2 save               # Save process list for auto-restart on reboot
pm2 startup systemd     # Generate startup script — run the command it outputs with sudo
```

**Verify it's running:**

```bash
pm2 status
# Should show "core-assessment" with status "online"

pm2 logs core-assessment
# Should show Next.js startup logs

curl http://localhost:3000
# Should return HTML
```

**Verify via browser:** Navigate to `https://assessment.dataforgetechnologies.com` — should show the app (once ALB + DNS are configured by sysadmin).

---

## 5.6 Deployment Workflow (Repeating)

After the initial setup, every deployment follows this pattern:

### From your Mac (push changes):

```bash
cd /Users/jutuonair/GDrive/ProductDevelopment/core-assessment
git add .
git commit -m "feat(0.X.Y): description"
git push
```

### On the server (pull and restart):

```bash
ssh core-assessment
cd /home/ubuntu/core-assessment
git pull
npm install          # Only needed if dependencies changed
npm run build
pm2 restart core-assessment
```

### One-liner deploy from Mac:

```bash
ssh core-assessment "cd /home/ubuntu/core-assessment && git pull && npm install && npm run build && pm2 restart core-assessment"
```

### Deploy script (optional)

```bash
cat > scripts/deploy.sh << 'SCRIPT'
#!/bin/bash
# Deploy CORE Assessment to EC2
# Usage: ./scripts/deploy.sh

set -e

echo "Deploying CORE Assessment..."

ssh core-assessment << 'EOF'
    cd /home/ubuntu/core-assessment
    echo "Pulling latest changes..."
    git pull
    echo "Installing dependencies..."
    npm install
    echo "Building..."
    npm run build
    echo "Restarting app..."
    pm2 restart core-assessment
    echo "Deploy complete!"
    pm2 status
EOF
SCRIPT

chmod +x scripts/deploy.sh
# Then: ./scripts/deploy.sh
```

---

## 5.7 Server Maintenance

### View logs

```bash
pm2 logs core-assessment              # Real-time logs
pm2 logs core-assessment --lines 100  # Last 100 lines
```

### Restart / stop / reload

```bash
pm2 restart core-assessment    # Hard restart
pm2 reload core-assessment     # Zero-downtime reload (graceful)
pm2 stop core-assessment       # Stop
pm2 start core-assessment      # Start again
```

### Monitor resource usage

```bash
pm2 monit                      # Real-time CPU/memory dashboard
htop                           # System-wide resource monitor
df -h                          # Disk usage (watch data/ growth)
```

### Backup runtime data

The `data/` directory contains all assessment responses, profiles, calibration, and audit logs. Back it up periodically:

```bash
# On the server — create a timestamped backup
cd /home/ubuntu/core-assessment
tar -czf ~/backups/data-$(date +%Y%m%d-%H%M%S).tar.gz data/

# From your Mac — pull a backup
mkdir -p ~/backups/core-assessment
scp core-assessment:~/backups/data-*.tar.gz ~/backups/core-assessment/
```

Create the backups directory on the server:

```bash
ssh core-assessment "mkdir -p ~/backups"
```

### Update system packages

```bash
ssh core-assessment "sudo apt update && sudo apt upgrade -y"
```

---

## 5.8 Troubleshooting (EC2-Specific)

### "502 Bad Gateway" in browser

**Cause:** Nginx can't reach the app on port 3000.
**Fix:** Check if the app is running: `pm2 status`. If not: `pm2 restart core-assessment`. Check logs: `pm2 logs core-assessment`.

### "Permission denied" on SSH

**Cause:** PEM file permissions too open.
**Fix:** `chmod 400 ~/.ssh/core-assessment.pem`

### Build fails with OOM (Out of Memory)

**Cause:** Not enough RAM for `npm run build`. Next.js build is memory-hungry.
**Fix:** If on t3.micro (1 GB), upgrade to t3.small (2 GB) or t3.medium (4 GB). As a temporary workaround, create a swap file:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### App starts but can't reach external APIs (Anthropic, Microsoft Graph)

**Cause:** Security group outbound rules might be restricting traffic, or env vars missing.
**Fix:** Check `.env.production` has correct API keys and Azure credentials. Verify outbound is open: `curl -I https://api.anthropic.com` and `curl -I https://graph.microsoft.com` from the server. AWS security groups allow all outbound by default, but verify.

### "ENOSPC: no space left on device"

**Cause:** Disk full — likely `data/` or `node_modules/` grew too large, or old `.next` build artifacts.
**Fix:** `df -h` to check. Clean old builds: `rm -rf .next`. Check data size: `du -sh data/`. If persistent, resize the EBS volume in AWS console.

### ALB health check failing

**Cause:** The ALB target group health check can't reach the app.
**Fix:** Ensure the health check path returns 200 (e.g., `/` or a dedicated `/api/health` endpoint). Verify nginx is running: `sudo systemctl status nginx`. Verify the app is running: `pm2 status`. Confirm the target group uses port 80 and the EC2 security group allows inbound 80 from the ALB security group.

---

*RUNBOOK Version: 1.3*
*Created: February 2026*
*Updated: February 2026*
*Changes in v1.3: Corrected email service from Resend to Microsoft Graph API / Entra ID per architecture spec. Added executable commands throughout Part 1.*
*Project: CORE Assessment Platform*
*Repository: [github.com/enesol-julio/core-assessment](https://github.com/enesol-julio/core-assessment)*
*Production: [assessment.dataforgetechnologies.com](https://assessment.dataforgetechnologies.com)*
