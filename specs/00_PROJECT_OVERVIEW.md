# CORE Assessment Platform — Project Overview

## Consolidated Reference Document

---

## 1. Project Purpose & Goals

### What Is CORE?

CORE (Critical Observation, Reasoning & Execution) is a timed, multi-format cognitive assessment platform designed to identify individuals who possess the foundational thinking skills required to work effectively in AI-assisted ("vibe-coding") environments. It measures the ability to **direct AI effectively** — decomposing problems, spotting ambiguity, reasoning through constraints, and validating outputs — rather than traditional technical coding ability or domain knowledge.

### The Problem

In vibe-coding paradigms, a team member's value shifts from "can they write code?" to "can they think clearly enough to guide AI toward the right outcome?" No existing assessment product evaluates all of the required dimensions together: problem decomposition, critical observation, logical reasoning under constraints, and output validation. CORE fills that gap.

### Who It's For

The assessment targets internal team members across three organizations (see §2), spanning all domains and roles. It is deliberately domain-agnostic — a project manager, data engineer, and business analyst are all measured on the same cognitive scale. CORE does **not** measure technical coding ability, domain-specific knowledge, personality traits, or communication style.

### Success Criteria

The assessment succeeds if it produces distributed scores (not clustered), demonstrates predictive validity for AI-assisted work performance over 3–6 months, shows no systematic bias by domain/role/organization, is perceived as fair and relevant by test-takers, produces actionable per-section development guidance, and achieves AI evaluation reliability of ≤0.5 point MAD across models on the 0–5 rubric scale.

---

## 2. Team & Organizations

| Organization | Domain | Role in CORE |
|---|---|---|
| **ENESOL.ai** | AI and data engineering | Assessment target population; engineering perspective on question design and platform architecture |
| **DataForgeTechnologies.com** | Data infrastructure and tooling | Assessment target population; data infrastructure perspective |
| **Datacracy.co** | Data strategy and analytics | Assessment target population; project leadership (`julio@datacracy.co` is the seeded initial Admin) |

All three organizations share the assessment — their email domains (`enesol.ai`, `dataforgetechnologies.com`, `datacracy.co`) form the initial authentication allowlist. The platform is built and maintained collaboratively across these entities.

**Repository:** [github.com/enesol-julio/core-assessment](https://github.com/enesol-julio/core-assessment)
**Local path (macOS):** `/Users/jutuonair/GDrive/ProductDevelopment/core-assessment`

---

## 3. Scope Summary

### What's in v1.0

| Component | Detail |
|---|---|
| Assessment content | 5 sections, 67 base questions in pool, 34 served per session, ~48 min estimated duration |
| Question formats | single_select (32), multi_select (14), drag_to_order (6), open_ended (15) |
| Web application | Interactive delivery with per-question timers, auto-advance, session management, no back-navigation |
| Authentication | Email OTP (no passwords), domain-based allowlist, Admin and Test-Taker roles |
| AI Evaluation Pipeline | 3-step chain: open-ended scoring (Sonnet) → composite aggregation → Responder Profile synthesis (Opus) |
| Dashboards | Manager/Admin dashboard (ranking, analytics, drill-downs) + Operational dashboard (pipeline health, golden tests), embedded in web app |
| Storage | JSON files for all data (profiles, calibration, audit trail), with abstraction layer for future DB migration |
| Calibration | Population-derived statistics, percentile computation, batch re-scoring |
| Golden tests | AI-calibrated framework (multi-model consensus, no human reviewers) |
| Audit trail | Structured logging of every LLM call with full prompt/response/cost data |

### What's Explicitly Out (v2+)

Scenario rotation/variants, dual-evaluator scoring, database migration, longitudinal tracking, export/reporting, AI collaboration section (Section 6), adaptive difficulty, role-specific variants, individual test-taker feedback view, test-taker improvement plans, proctoring integration, BI tool migration, prompt version management system, team benchmarking across organizations, additional roles (Manager, Operator).

---

## 4. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Framework** | Next.js 14+ | React-based full-stack framework |
| **Language** | TypeScript | End-to-end: web app, pipeline, dashboard, transforms |
| **UI Library** | React | Component-based presentation |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Dashboard Charts** | Tremor + Recharts | Tremor for dashboard primitives (cards, tables); Recharts for custom charts |
| **AI — Primary** | Anthropic Claude (Sonnet for scoring, Opus for synthesis) | Scoring: temperature 0.1 (near-deterministic). Synthesis: temperature 0.4 (moderate creativity) |
| **AI — Fallback** | OpenAI GPT-4o | Configured via provider abstraction layer; not active in v1.0 default |
| **LLM Integration** | Custom lightweight orchestrator | No LangChain/LangGraph — pipeline is linear, native SDKs + provider interface |
| **Authentication** | Email OTP | Stateless JWT or secure session cookie; no persistent passwords |
| **Data Storage (v1)** | JSON files on disk | Profiles, calibration params, pipeline runs, golden test results |
| **Data Storage (v2+)** | PostgreSQL (planned) | JSONB columns with indexed fields; migration via DataProvider interface swap |
| **Assessment Schema** | JSON (7 files) | 1 metadata + 5 section definitions + 1 response schema |
| **Access Control** | Route-level middleware | Admin-only for dashboards and pipeline endpoints; shared auth system |

---

## 5. Version Roadmap

| Version | Name | Scope Summary | Milestone Gate |
|---|---|---|---|
| **v0.1** | Content | 67 questions authored across 5 sections; JSON schemas validated; assessment-meta.json complete | All questions pass schema validation |
| **v0.2** | Web App + Auth | Assessment delivery UI, Email OTP auth, domain allowlist, Admin/Test-Taker roles, session management | User can log in via OTP, complete 5-section assessment, submit with full metadata |
| **v0.3** | Pipeline | 3-step AI evaluation chain, Responder Profile generation, audit trail, golden test framework, re-evaluation endpoints | Submit response → receive complete Responder Profile; audit trail captures all LLM calls |
| **v0.4** | Dashboard | Three-layer architecture (data access → transforms → presentation), Manager/Admin + Operational views, ranking algorithm | Both dashboards render correctly; ranking orders correctly; unauthorized users blocked |
| **v0.5** | Pilot | 5–8 volunteers across 3 orgs; validate timing, scoring, fairness; founder sanity-checks on known participants | Score distribution discriminates meaningfully; founders confirm profiles are directionally correct |
| **v0.6–v0.9** | Pilot Fixes | Reserved for timing adjustments, question rewrites, scoring recalibration, UX fixes from pilot | All pilot-driven issues resolved |
| **v1.0** | Production | Content locked, pilot validated, auth enforced — open to all approved-domain users | Everything from v0.1–v0.4 operational + pilot issues resolved |
| **v2.0** | Integrity | Golden test content curation (beyond AI baselines), scenario rotation/variant population | Cheat-resistant, refined scoring validation |
| **v2.1** | Scoring+ | Dual evaluator (Claude + GPT-4o), team benchmarking across orgs, prompt version management | Stronger evaluation quality, cross-team analytics |
| **v2.2** | Growth | Longitudinal tracking, export/reporting, database migration | Scales over time, data portability |
| **v2.3+** | Evolution | AI collaboration section, adaptive difficulty, role-specific variants, test-taker feedback, proctoring, BI migration | Platform transformation |
| **v3.0+** | Improvement | AI-generated test-taker improvement plans | Requires feedback view + population data |

---

## 6. Dependency Chain

```
v0.1 Content
  └─► v0.2 Web App + Auth (Email OTP, domain allowlist, Admin/Test-Taker roles)
        └─► v0.3 Pipeline
              └─► v0.4 Dashboard (role-enforced access)
                    └─► v0.5 Pilot
                          └─► v0.6–v0.9 Pilot Fixes (as needed)
                                └─► v1.0 Production (auth included)
                                │
                                ├─► v2.0 Integrity
                                │     ├─► Golden Test Content Curation (AI-bootstrapped)
                                │     │     └─► v2.1 Prompt Versioning
                                │     │           └─► v2.1 Dual Evaluator
                                │     └─► Scenario Rotation
                                │           ├─► v2.2 Longitudinal Tracking
                                │           ├─► v2.3+ Adaptive Difficulty
                                │           └─► v2.3+ Role-Specific Variants
                                │
                                ├─► v2.1 Team Benchmarking
                                │
                                ├─► v2.2 Database Migration
                                │     └─► v2.3+ Advanced BI Migration
                                │
                                ├─► v2.2 Export & Reporting
                                │
                                ├─► v2.3+ AI Collaboration Section
                                │
                                ├─► v2.3+ Individual Test-Taker Feedback View
                                │     └─► v2.3+ Test-Taker Improvement Plans
                                │
                                └─► v2.3+ Proctoring
```

---

## 7. Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Storage (v1)** | JSON files on disk | Matches pipeline's natural output format. Zero database dependency. Population < 500 makes this performant. |
| **Storage abstraction** | `DataProvider` interface | Decouples all consumers (dashboard, pipeline) from storage. Swap JSON → PostgreSQL without touching presentation or transform layers. |
| **Dashboard deployment** | Embedded in web app | Zero additional infrastructure. Shares the app's Email OTP auth — no second login needed. |
| **Dashboard architecture** | Three-layer (data access → transforms → presentation) | Each layer independently replaceable. Future-proofs against storage migration, library swap, or external BI tool migration. |
| **Pipeline architecture** | Structured 3-step chain (score → aggregate → synthesize) | More reliable and auditable than single-call. Each step is isolated, debuggable, and independently retriggerable. |
| **LLM framework** | Custom lightweight orchestrator (no LangChain) | Pipeline is linear, not conditional. Native SDKs + provider interface is simpler and more maintainable for this use case. |
| **Model routing** | Sonnet for scoring, Opus for synthesis | Scoring needs consistency and speed (temp 0.1). Synthesis needs depth, insight, and pattern recognition (temp 0.4). |
| **Model swappability** | Provider abstraction layer | Anthropic primary, OpenAI fallback. Swap or add providers by implementing `LLMProvider` interface — no pipeline code changes. |
| **Human evaluators** | Fully replaced by AI | No human in scoring loop, calibration loop, or golden test validation. AI cross-validation (multi-model consensus) is the sole calibration mechanism. Foundational constraint, not cost-saving. |
| **Golden test calibration** | AI cross-validation | Multiple models score independently; consensus from agreement. No human-authored ground truth. Calibration improves with population data. |
| **Authentication** | Email OTP with domain allowlist | v1.0 requirement (not post-launch). Cognitive evaluation data demands identity binding from day one. No passwords stored. |
| **Ranking visibility** | Admin-only | Prevents demoralization. Assessment exists to identify development areas, not create leaderboards. Enforced at route/middleware level. |
| **Data immutability** | Raw responses are never modified | Original answers and timing data are permanent. Re-evaluation creates new versions; old scores preserved. Pipeline can always re-run from scratch on original data. |
| **Timer model** | Per-question (not per-section) | Gives precise pacing control and produces granular speed metadata per question. Response time is as informative as the answer for speed-check questions. |
| **Anti-gaming** | Hidden timers, no back-nav, randomized selection from pool, no obvious-correct answers | Design-level protections built into the assessment structure rather than relying on proctoring software. |

---

## 8. Constraints & Boundaries

The following are deliberate v1.0 constraints — things the platform intentionally does NOT do:

- **No test-taker results visibility.** After submission, test-takers see a confirmation screen only. No scores, no profile, no feedback. (v2.3+ adds feedback view; v3.0+ adds improvement plans.)
- **No scenario variants.** v1.0 ships with base questions only. The schema supports variants, but none are populated. (v2.0 adds rotation.)
- **No database.** All data lives in JSON files. This is sufficient for populations under ~500 and avoids premature infrastructure complexity.
- **No dual-evaluator scoring.** Single AI evaluator per question in v1.0. (v2.1 adds multi-provider scoring.)
- **No export or reporting.** Dashboard is view-only. No CSV/PDF export. (v2.2 adds export.)
- **No longitudinal tracking.** Each assessment is a point-in-time snapshot. No re-assessment comparison. (v2.2 adds tracking.)
- **No proctoring.** Assessment integrity relies on design-level anti-gaming, not webcam/browser lockdown. (v2.3+ adds proctoring integration.)
- **Two roles only.** Admin (full access) and Test-Taker (take assessment, nothing else). No Manager or Operator roles until v2.1+.
- **No alerting infrastructure.** Operational dashboard is passive — no email/Slack notifications for pipeline failures or golden test drift.
- **No UI/UX visual design spec.** Component behavior is specified; colors, typography, and layout polish are not.

---

## 9. Companion Documents

| Document | Version | Purpose |
|---|---|---|
| **CORE Assessment Functional Specification** | v2.2 | Complete assessment design: sections, question types, scoring methodology, timer behavior, anti-gaming mechanisms, data architecture (JSON schemas), authentication & access control, AI evaluation layer overview, success criteria. The "what" and "why" of the assessment. |
| **CORE AI Evaluation Pipeline — Technical Specification** | v1.3 | Pipeline architecture: 3-step chain design, model abstraction layer, prompt templates, scoring/synthesis schemas, calibration parameter generation, batch re-scoring, single-assessment re-evaluation, audit trail, golden test framework, cost/latency budgets, error handling. The "how" of AI evaluation. |
| **CORE Dashboard Module Specification** | v1.1 | Dashboard architecture: three-layer design (data access → transforms → presentation), DataProvider interface, JsonFileProvider, ranking algorithm, transform functions, component specifications, Manager/Admin and Operational dashboard views, API endpoint contracts, role-based access enforcement, data migration path. |
| **CORE Future Backlog Specification** | v2.1 | All planned v2+ enhancements organized by domain, with target versions, priorities, effort estimates, dependencies, and design readiness. The single source of truth for what's not in v1.0. |
| **CORE Versioning Roadmap** | v1.1 | Platform-wide versioning scheme (v0.1 → v1.0 → v2+), milestone gates, dependency chain, pilot validation plan, key design principles. The sequencing of everything. |
| **assessment-meta.json** | 1.0.0 | Machine-readable assessment configuration: global settings, section ordering, weights, pool/served counts, timer modes, scoring parameters. Loaded first by the application to build UI structure. |
| **Question Bank Summary** | — | Quick-reference table of all 67 questions: IDs, types, difficulty, points, timing, topics. Full content lives in the section JSON files. |

---

*Document Version: 1.0*
*Created: February 2026*
*Organizations: ENESOL.ai | DataForgeTechnologies.com | Datacracy.co*
*Source: Synthesized from all companion specifications listed in §9*
