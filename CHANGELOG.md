# CORE Assessment Platform — Changelog

## [Unreleased]

### v0.1 — Assessment Content & Schema

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

