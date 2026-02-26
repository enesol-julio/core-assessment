# CORE Assessment Platform — Changelog

## [Unreleased]

### v0.1 — Assessment Content & Schema

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

