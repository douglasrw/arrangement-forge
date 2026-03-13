# Artifact Tracker

Last updated: 2026-03-07

---

## Needs Review

| Artifact | Summary |
|----------|---------|
| [specs/component-decomposition.md](specs/component-decomposition.md) | Decompose 7 components exceeding 200-line limit (ArrangementView at 468 lines is largest). |
| [specs/converge-default-files.md](specs/converge-default-files.md) | Slim down 4 default-loaded files (CLAUDE.md, ARCHITECTURE.md, DESIGN_SYSTEM.md, globals.css) from 1,108 lines of stale/redundant content. |

---

## Ready to Execute

_None._

---

## Not Yet Tasked

_Reference specs and architecture docs that inform work but aren't execution queues._

| Artifact | Summary |
|----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Single source of truth: tech stack, data model (7 tables), project structure, API contracts, audio engine. |
| [vision.md](vision.md) | Product vision, market positioning, 12-month roadmap. Strategic reference. |
| [ISSUES.md](ISSUES.md) | Bug tracker: 7+ documented issues with repro steps and root causes. |

---

## Research

| Artifact | Summary |
|----------|---------|
| [specs/research/feature-gap-scout-2026-03-04.md](specs/research/feature-gap-scout-2026-03-04.md) | Feature gap analysis: vision.md vs current implementation. 7 Tier-1 gaps identified. |
| [specs/research/code-health-scout-2026-03-04.md](specs/research/code-health-scout-2026-03-04.md) | Code quality audit: 23% test coverage, compliance issues mapped. |
| [specs/research/ui-ux-scout-2026-03-04.md](specs/research/ui-ux-scout-2026-03-04.md) | UI/UX audit: 22 components assessed, interaction gaps and polish opportunities. |
| [specs/historical/ai-drum-tools-research.md](specs/historical/ai-drum-tools-research.md) | Survey of 50+ AI drum tools across 7 categories. Scoring methodology. Feeds Phase 1-4 drum roadmap. |
| [specs/historical/drum-samples-research.md](specs/historical/drum-samples-research.md) | Free drum sample sourcing: Splice, Freesound, BEDROOM. Licensing analysis. Feeds Phase 3. |
| [specs/historical/premixed-drum-samples-research.md](specs/historical/premixed-drum-samples-research.md) | Full-kit premixed samples analysis. Sourcing options, licensing, pros/cons. Feeds Phase 3. |
| [specs/historical/midi-drum-patterns-research.md](specs/historical/midi-drum-patterns-research.md) | MIDI pattern library survey: formats, genre conventions, open-source options. Feeds Phase 1. |
| [specs/historical/drum-investigation.md](specs/historical/drum-investigation.md) | Root cause: why drums sound robotic (4 samples, 3 patterns, no expression). Precursor to Phase 1. |
| [specs/historical/elevenlabs-drum-implementation.md](specs/historical/elevenlabs-drum-implementation.md) | Experimental: ElevenLabs voice synthesis for drum samples. Feasibility + cost. Feeds Phase 4. |
| [specs/historical/overnight-research-competitive-analysis.md](specs/historical/overnight-research-competitive-analysis.md) | 12+ competitor analysis (Band-in-a-Box, iRealPro, Moises.ai, etc.). Feature matrix. |
| [specs/historical/shadcn-audit.md](specs/historical/shadcn-audit.md) | Audit of 42 hand-rolled UI components; 34 replaceable with shadcn/ui, categorized by swap effort. |
| [specs/historical/fix-interaction-bugs.md](specs/historical/fix-interaction-bugs.md) | Playwright interaction audit: 27/39 tests passed, 7 real findings (3 bugs, 4 UX gaps). |

---

## Deferred

| Artifact | Reason | Revisit Trigger |
|----------|--------|-----------------|
| [specs/historical/drum-phase3-premium-samples.md](specs/historical/drum-phase3-premium-samples.md) | Post-MVP. Depends on Phase 1+2 completion. | Phase 2 ships. |
| [specs/historical/drum-phase4-ai-render.md](specs/historical/drum-phase4-ai-render.md) | Speculative. Production-quality AI render service. | Phase 3 ships + user demand signal. |

---

## Recently Completed

| Artifact | Completed | Summary |
|----------|-----------|---------|
| [specs/historical/EXECUTION_QUEUE_undo_autosave.md](specs/historical/EXECUTION_QUEUE_undo_autosave.md) | 2026-03-04 | Fixed broken undo system (unified snapshot format, all destructive actions covered, debounced auto-save, beforeunload guard). 5 tasks, 253 tests pass. |
| [specs/historical/EXECUTION_QUEUE_critical_fixes.md](specs/historical/EXECUTION_QUEUE_critical_fixes.md) | 2026-03-04 | Fixed sign-out button, wired delete/duplicate buttons, connected mixer keyboard shortcut, wired status bar, fixed accessibility, removed dead code. 6 tasks, 253 tests pass. |
| [specs/historical/EXECUTION_QUEUE_pitched_regen.md](specs/historical/EXECUTION_QUEUE_pitched_regen.md) | 2026-03-04 | Per-section blocks for all instruments + reactive slider regeneration for all instruments (not just drums). 4 tasks, 253 tests pass. |
| [specs/historical/EXECUTION_QUEUE_theme_token_migration.md](specs/historical/EXECUTION_QUEUE_theme_token_migration.md) | 2026-03-04 | Migrated ~195 hardcoded hex colors to forge theme tokens across 16 component files. 5 tasks, 253 tests pass. |
| [specs/historical/reactive-drum-style.md](specs/historical/reactive-drum-style.md) | 2026-03-04 | Implemented commit 9f1b6e79, archived. |
| [specs/historical/drum-phase1-pattern-library.md](specs/historical/drum-phase1-pattern-library.md) | 2026-03-04 | Fully implemented via Salamander drum samples + groove complexity work. Archived 2026-03-04. |
| [specs/historical/groove-complexity-feel-rename.md](specs/historical/groove-complexity-feel-rename.md) | 2026-03-04 | Groove complexity algorithm, feel/humanization rename, reactive slider-to-playback pipeline. 5 tasks complete. |
| [specs/historical/salamander-drum-samples.md](specs/historical/salamander-drum-samples.md) | 2026-03-03 | Salamander acoustic drum sample integration replacing synth DrumKit. 3 tasks complete. |
| [specs/historical/ui-overhaul-v1.md](specs/historical/ui-overhaul-v1.md) | 2026-03-03 | Layout overhaul: flex lanes, context switching, forge theme. 7 tasks + 7 follow-up fixes complete. |
| [docs/plans/historical/EXECUTION_QUEUE_state-wiring.md](docs/plans/historical/EXECUTION_QUEUE_state-wiring.md) | 2026-03-04 | State wiring execution queue: 8 tasks wiring contexts/sections/blocks to Zustand stores. |
| [specs/historical/EXECUTION_QUEUE_pitched_instruments.md](specs/historical/EXECUTION_QUEUE_pitched_instruments.md) | 2026-03-04 | Pitched instruments execution queue. 5 tasks, 43 tests, all genres produce distinct patterns. |
| [specs/historical/TASKS-mvp-build.md](specs/historical/TASKS-mvp-build.md) | 2026-03-04 | Original MVP build spec. 26 agent tasks in dependency layers 0-8. Fully complete. |
| [specs/historical/fix-editor-polish.md](specs/historical/fix-editor-polish.md) | 2026-03-04 | Fix clipped slider labels, weak Generate button, unclear A/I tab indicators. |
| [specs/historical/fix-scroll-after-section-delete.md](specs/historical/fix-scroll-after-section-delete.md) | 2026-03-04 | Fix viewport scrolling past content into empty space after section delete. |
| [specs/historical/fix-login-page-styling.md](specs/historical/fix-login-page-styling.md) | 2026-03-04 | Fix broken login page styling after DaisyUI removal. |
| [specs/historical/fix-settings-page-styling.md](specs/historical/fix-settings-page-styling.md) | 2026-03-04 | Fix broken settings page styling — labels, cards, spacing, form layout. |
| [specs/historical/SHAKEDOWN.md](specs/historical/SHAKEDOWN.md) | 2026-03-04 | UI mockup shakedown issues log — stem lane interaction, bar-level block sequencer decisions. |
| [specs/historical/fix-daisyui-remnants-app-library.md](specs/historical/fix-daisyui-remnants-app-library.md) | 2026-03-04 | Remove leftover DaisyUI class references in App.tsx, LibraryPage.tsx, ChordLane.tsx. |
| [specs/historical/fix-transport-bar-styling.md](specs/historical/fix-transport-bar-styling.md) | 2026-03-04 | Fix transport bar, mixer drawer, status bar visual definition — borders and backgrounds invisible. |
| [specs/historical/fix-create-project-feel-column.md](specs/historical/fix-create-project-feel-column.md) | 2026-03-04 | Fix project creation broken by missing `feel` column in Supabase causing silent HTTP 400. |
| [specs/historical/fix-no-scroll-fixed-viewport.md](specs/historical/fix-no-scroll-fixed-viewport.md) | 2026-03-04 | Fix left panel scrolling — implemented fixed-viewport accordion layout. |
| [specs/historical/fix-hardcoded-hex-colors.md](specs/historical/fix-hardcoded-hex-colors.md) | 2026-03-04 | Replace 63 hardcoded hex colors across 15 files with forge theme tokens. |

---

## Stale / Superseded

| Artifact | Reason |
|----------|--------|
| ~~specs/agentic-infrastructure-synthesis.md~~ | Deleted. Cross-project synthesis doc (AF + ViverSound + personal infra). No longer on disk. |
| [specs/historical/drum-phase2-llm-patterns.md](specs/historical/drum-phase2-llm-patterns.md) | Discarded by operator -- LLM drum generation deferred indefinitely. |
| [specs/historical/midi-expression.md](specs/historical/midi-expression.md) | Archived 2026-03-04. Stale -- drum expression already implemented, groove/feel semantics changed. Needs replacement spec scoped to non-drum instruments. |
| [specs/historical/mixer-wiring.md](specs/historical/mixer-wiring.md) | Archived 2026-03-04. Stale -- signal chain includes Panner, DrumSubMix not accounted for. Needs replacement spec. |
| [specs/historical/youtube-transcript-pipeline.md](specs/historical/youtube-transcript-pipeline.md) | Archived 2026-03-04. Superseded -- transcript workflow implemented manually outside spec. |
| [specs/historical/instrument-style-controls.md](specs/historical/instrument-style-controls.md) | Draft spec for per-instrument style controls. Never advanced past draft. |
