# Artifact Tracker

Last updated: 2026-03-04

---

## Needs Review

| Artifact | Created | Summary |
|----------|---------|---------|
| [specs/agentic-infrastructure-synthesis.md](specs/agentic-infrastructure-synthesis.md) | 2026-03-03 | Cross-project synthesis: maps voice notes + 2 YouTube video transcripts to 7 actionable themes (EC jobs queue, agent-first API, model router, proactive AI, visual pre-flight, skills=sorted context, evals). Includes priority stack. Scope: cross-project (AF + ViverSound + personal infra). |

---

## Ready to Execute

| Artifact | Status | Summary |
|----------|--------|---------|
| [specs/undo-autosave.md](specs/undo-autosave.md) | Ready | Fix broken undo (3/13 actions covered), add autosave + beforeunload. Unified snapshot schema. |

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
| [specs/ai-drum-tools-research.md](specs/ai-drum-tools-research.md) | Survey of 50+ AI drum tools across 7 categories. Scoring methodology. Feeds Phase 1-4 drum roadmap. |
| [specs/drum-samples-research.md](specs/drum-samples-research.md) | Free drum sample sourcing: Splice, Freesound, BEDROOM. Licensing analysis. Feeds Phase 3. |
| [specs/premixed-drum-samples-research.md](specs/premixed-drum-samples-research.md) | Full-kit premixed samples analysis. Sourcing options, licensing, pros/cons. Feeds Phase 3. |
| [specs/midi-drum-patterns-research.md](specs/midi-drum-patterns-research.md) | MIDI pattern library survey: formats, genre conventions, open-source options. Feeds Phase 1. |
| [specs/drum-investigation.md](specs/drum-investigation.md) | Root cause: why drums sound robotic (4 samples, 3 patterns, no expression). Precursor to Phase 1. |
| [specs/elevenlabs-drum-implementation.md](specs/elevenlabs-drum-implementation.md) | Experimental: ElevenLabs voice synthesis for drum samples. Feasibility + cost. Feeds Phase 4. |
| [specs/overnight-research-competitive-analysis.md](specs/overnight-research-competitive-analysis.md) | 12+ competitor analysis (Band-in-a-Box, iRealPro, Moises.ai, etc.). Feature matrix. |

---

## Deferred

| Artifact | Reason | Revisit Trigger |
|----------|--------|-----------------|
| [specs/drum-phase3-premium-samples.md](specs/drum-phase3-premium-samples.md) | Post-MVP. Depends on Phase 1+2 completion. | Phase 2 ships. |
| [specs/drum-phase4-ai-render.md](specs/drum-phase4-ai-render.md) | Speculative. Production-quality AI render service. | Phase 3 ships + user demand signal. |

---

## Recently Completed

| Artifact | Completed | Summary |
|----------|-----------|---------|
| [specs/reactive-drum-style.md](specs/historical/reactive-drum-style.md) | 2026-03-04 | Implemented commit 9f1b6e79, archived. |
| [specs/drum-phase1-pattern-library.md](specs/historical/drum-phase1-pattern-library.md) | 2026-03-04 | Fully implemented via Salamander drum samples + groove complexity work. Archived 2026-03-04. |
| [specs/historical/groove-complexity-feel-rename.md](specs/historical/groove-complexity-feel-rename.md) | 2026-03-04 | Groove complexity algorithm, feel/humanization rename, reactive slider-to-playback pipeline. 5 tasks complete. |
| [specs/historical/salamander-drum-samples.md](specs/historical/salamander-drum-samples.md) | 2026-03-03 | Salamander acoustic drum sample integration replacing synth DrumKit. 3 tasks complete. |
| [specs/historical/ui-overhaul-v1.md](specs/historical/ui-overhaul-v1.md) | 2026-03-03 | Layout overhaul: flex lanes, context switching, forge theme. 7 tasks + 7 follow-up fixes complete. |
| [docs/plans/historical/EXECUTION_QUEUE_state-wiring.md](docs/plans/historical/EXECUTION_QUEUE_state-wiring.md) | 2026-03-04 | State wiring execution queue: 8 tasks wiring contexts/sections/blocks to Zustand stores. |
| [specs/historical/EXECUTION_QUEUE_pitched_instruments.md](specs/historical/EXECUTION_QUEUE_pitched_instruments.md) | 2026-03-04 | Pitched instruments execution queue. 5 tasks, 43 tests, all genres produce distinct patterns. |
| [specs/historical/TASKS-mvp-build.md](specs/historical/TASKS-mvp-build.md) | 2026-03-04 | Original MVP build spec. 26 agent tasks in dependency layers 0-8. Fully complete. |

---

## Stale / Superseded

| Artifact | Reason |
|----------|--------|
| [specs/drum-phase2-llm-patterns.md](specs/historical/drum-phase2-llm-patterns.md) | Discarded by operator — LLM drum generation deferred indefinitely. |
| [specs/midi-expression.md](specs/historical/midi-expression.md) | Archived 2026-03-04. Stale — drum expression already implemented, groove/feel semantics changed. Needs replacement spec scoped to non-drum instruments. |
| [specs/mixer-wiring.md](specs/historical/mixer-wiring.md) | Archived 2026-03-04. Stale — signal chain includes Panner, DrumSubMix not accounted for. Needs replacement spec. |
| [specs/youtube-transcript-pipeline.md](specs/historical/youtube-transcript-pipeline.md) | Archived 2026-03-04. Superseded — transcript workflow implemented manually outside spec. |
