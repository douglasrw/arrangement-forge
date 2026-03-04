# Feature Gap Scout Report -- 2026-03-04

## Methodology

Compared the full product vision document (`vision.md`, ~1360 lines, 14 sections) against the actual codebase (`src/`, 75+ TypeScript/TSX files), the architecture spec (`ARCHITECTURE.md`), the artifact tracker (`ARTIFACT_TRACKER.md`), existing specs (both active and historical), and the issue tracker (`ISSUES.md`). Read every key source file: all stores, hooks, audio engine, MIDI generator, pattern libraries, layout components, transport, mixer, left panel contexts, library page, and top bar.

The analysis focuses on three questions:
1. What does the vision promise that is not built?
2. Of those gaps, which are high-value AND clearly specable from existing code context?
3. What should NOT be built now (either explicitly deferred in CLAUDE.md or premature for the product stage)?

---

## Current Implementation Summary

What is actually built and functional:

- **Core editor layout** -- AppShell with TopBar, LeftPanel (context-aware), ArrangementView, MixerDrawer, TransportBar, StatusBar
- **Chord input** -- Two modes: ChordPalette (click-to-build) and raw text textarea. Parser converts text to ChordEntry[]. Upload tab is a "Coming soon" placeholder.
- **Rule-based MIDI generation** -- Client-side `generate()` creates sections/stems/blocks/chords from chord input. Genre-aware style assignment for 9 genres (Jazz, Blues, Rock, Funk, Latin, Country, Gospel, R&B, Pop).
- **Five instrument pattern libraries** -- drums (`drum-patterns.ts`, Salamander samples), bass (`bass-patterns.ts`), piano (`piano-patterns.ts`), guitar (`guitar-patterns.ts`), strings (`strings-patterns.ts`). All produce genre-aware MIDI data.
- **Audio engine** -- Tone.js with per-stem signal chain (Sampler -> Gain -> Panner -> Master). CDN SoundFont samples for pitched instruments. Sampled drum kit (OGG). Hot-swap for drums on slider changes.
- **Mixer** -- Vertical faders, mute/solo, master fader with level meter, drum sub-mix (kick/snare/hihat/cymbals/toms)
- **Transport** -- Play/pause/stop, bar|beat counter, BPM editing, time signature display, loop toggle, metronome toggle, elapsed time display
- **Reactive style sliders** -- Energy, Groove, Feel, Swing %, Dynamics. Debounced reactive regeneration on slider changes (drums only for hot-swap; full regeneration available).
- **Block sequencer** -- Visual block display in stem lanes with selection, section headers, bar ruler, chord lane, playhead. Arrow-key navigation between blocks.
- **Context-aware inspector** -- LeftPanel switches between song context (input + style controls + AI assistant), section context, and block context based on what is selected.
- **Project persistence** -- Supabase CRUD: create, load, save, delete projects. Full arrangement save/load (stems, sections, blocks, chords). Auto-save on 60-second interval.
- **Authentication** -- Supabase Auth with email/password + Google OAuth. Login page, protected routes.
- **Library page** -- Project grid with search, sort (by date/name/genre/key/tempo), create, delete with confirmation dialog.
- **Settings page** -- User preferences (chord display mode, default genre).
- **Keyboard shortcuts** -- Cmd+S save, Cmd+Z undo, Cmd+Shift+Z redo, arrow key block nav, V/S/M tool modes, Delete/Backspace, D duplicate.
- **Undo/redo** -- Partially implemented (split/merge/delete push undo entries; other mutations do not). Known broken -- undo-autosave spec exists in "Ready to Execute" status.

---

## Feature Gaps (Prioritized)

### Tier 1: High Value, Clearly Specable Now

#### 1. Undo/Redo + Auto-Save System (Fix Critical Data Safety)

- **What it is:** Fix the broken undo system (only 3/13 actions covered, snapshot format mismatch) and add beforeunload guard + debounced auto-save. A complete spec already exists at `specs/undo-autosave.md` (historical).
- **Why high value:** This is the most critical user-facing bug. Users lose work silently. Undo appears to work but actually does nothing due to the array vs object snapshot format mismatch. No beforeunload handler means closing a tab loses all work since the last 60-second auto-save tick. Any user testing the app will hit this within minutes.
- **Estimated complexity:** M (medium). The spec is fully written with 7 acceptance criteria and detailed implementation steps.
- **Dependencies/blockers:** None. The spec references existing files and is self-contained.
- **Key files:** `src/store/project-store.ts` (add undo to all mutations, unify snapshot format), `src/store/undo-store.ts` (no changes needed), `src/hooks/useKeyboardShortcuts.ts` (fix undo consumer), `src/hooks/useGenerate.ts` (fix generation undo), `src/components/layout/AppShell.tsx` (add beforeunload, fix auto-save debounce)
- **Status:** Spec exists, marked "Ready to Execute" in ARTIFACT_TRACKER.md

#### 2. Per-Section Block Generation for Non-Drum Instruments

- **What it is:** Currently, non-drum instruments generate a single block spanning ALL bars of the entire arrangement (`start_bar: 1, end_bar: totalBars`). Drums already generate one block per section with full context. Non-drum instruments should follow the same pattern: one block per section, each with section-specific style and context awareness.
- **Why high value:** This is a structural gap that makes the arrangement view misleading and limits editing granularity. With one giant block per pitched instrument, section-level style overrides have no effect on playback, block-level editing is meaningless (you can split but the MIDI data is the same), and the visual grid shows one long block while drums show section-aware blocks. This gap makes section-level control -- the core paradigm of the product -- partially broken for 4 of 5 instruments.
- **Estimated complexity:** S (small). The drum pattern already demonstrates the correct architecture (see `midi-generator.ts` lines 321-363 vs 364-383). The non-drum branch just needs the same for-loop-over-sections pattern with section-specific chord slicing.
- **Dependencies/blockers:** None. Pure generator logic change.
- **Key files:** `src/lib/midi-generator.ts` (change the non-drum branch in `generate()` from single-block to per-section), `src/hooks/useGenerate.ts` (regenerateMidi already handles per-block regeneration correctly)

#### 3. Reactive MIDI Regeneration for Pitched Instruments

- **What it is:** The reactive slider-to-playback pipeline (`useGenerate.ts` lines 293-315) only triggers `regenerateDrumsOnly()` when style sliders change. Pitched instruments (bass, piano, guitar, strings) are not reactively regenerated -- their MIDI data stays static until a full regeneration. This means adjusting Energy, Groove, Feel, Swing %, or Dynamics has no effect on pitched instrument playback.
- **Why high value:** The reactive drum slider behavior is one of the most satisfying features of the app -- you move a slider and immediately hear the drums change. The same expectation naturally extends to all instruments. Without it, the sliders feel broken for 4 of 5 instruments. The `regenerateMidi()` function already exists and regenerates all instruments, but it is never called reactively. Only `regenerateDrumsOnly()` is called on slider changes.
- **Estimated complexity:** S (small). The `regenerateMidi()` function already works correctly. The change is wiring the `useEffect` debounce (lines 296-315) to call `regenerateMidi()` instead of (or in addition to) `regenerateDrumsOnly()`. The hot-swap path needs extension to handle pitched instruments, or the full `setArrangement()` path can be used with a brief playback glitch.
- **Dependencies/blockers:** Gap #2 (per-section blocks) should be done first so pitched instruments have section-aware blocks to regenerate. Without it, regenerating the single giant block still works but produces less musically interesting results.
- **Key files:** `src/hooks/useGenerate.ts` (wire `regenerateMidi` or extend `regenerateDrumsOnly` to all instruments), `src/audio/engine.ts` (`hotSwapInstrument` already works generically for any InstrumentType)

#### 4. Mixer State Persistence + Stem Store Wiring

- **What it is:** The mixer's volume/mute/solo state is entirely local to the `MixerDrawer` component (`useState`). It is not persisted to the project store, not saved to Supabase, and not restored on reload. Opening a project always resets the mixer to default values. Additionally, mixer changes do not call `markDirty()`, so they don't trigger auto-save. The stale `mixer-wiring.md` spec was archived because the signal chain has changed since it was written (now includes Panner, DrumSubMix).
- **Why high value:** Musicians will spend time dialing in their mix balance and expect it to persist. Losing mixer settings on every reload is a significant quality-of-life issue, especially for practice sessions where the whole point is isolating certain instruments at specific levels.
- **Estimated complexity:** M (medium). The Stem type already has `volume`, `pan`, `isMuted`, `isSolo` fields. The store already has `updateStem()`. The gap is wiring `MixerDrawer`'s `updateChannel` callback to call `useProjectStore.getState().updateStem()` (which calls `markDirty()`), and initializing the mixer from stem state on load.
- **Dependencies/blockers:** None. The data model already supports this.
- **Key files:** `src/components/mixer/MixerDrawer.tsx` (wire to store instead of local state), `src/store/project-store.ts` (`updateStem` already exists), `src/hooks/useProject.ts` (save/load already handles stems)

#### 5. Section Management (Add/Remove/Rename/Reorder)

- **What it is:** The vision describes sections as a core editing primitive -- users should be able to add sections (Verse, Chorus, Bridge, etc.), remove sections, rename them, and reorder them. The store has `addSection`, `removeSection`, `updateSection`, and `reorderSections` methods, but there is NO UI to invoke any of them. Sections are only created by the generator. The section header in ArrangementView is clickable for selection but offers no editing affordances (no context menu, no drag handle, no add button).
- **Why high value:** Section management is central to the arrangement workflow. Musicians think in terms of song structure (Intro -> Verse -> Chorus -> Bridge -> Outro). Without section editing, users are locked into whatever structure the generator created. This blocks the core creative loop: generate, then customize the arrangement.
- **Estimated complexity:** M (medium). The store methods exist. Need: (a) "Add Section" button (probably in SectionContext or at the end of the section headers), (b) section context menu (rename, delete, reorder), (c) section drag-to-reorder in the arrangement header row. The SectionContext component exists but only shows name and bar count -- needs editing controls.
- **Dependencies/blockers:** Gap #2 (per-section blocks for pitched instruments) should be done first so section operations affect blocks correctly.
- **Key files:** `src/components/arrangement/ArrangementView.tsx` (section header row needs editing affordances), `src/components/left-panel/SectionContext.tsx` (needs rename, delete, add section controls), `src/store/project-store.ts` (store methods exist, need undo integration per Gap #1)

#### 6. Export (MIDI Download)

- **What it is:** The Export button in the TopBar is disabled with "Coming soon". The vision describes MP3/WAV/MIDI export. For MVP, MIDI export is the most feasible because all the MIDI data already exists in the blocks (`block.midiData`). No audio rendering is needed -- just serialize the in-memory MIDI note data to a standard MIDI file format and trigger a browser download.
- **Why high value:** Export is the second most common user request after generation quality (per competitive analysis). Musicians need to get their backing tracks out of the browser. MIDI export specifically enables DAW integration (Logic, Ableton, Reaper), which is the #1 workflow for professional musicians. The blocks already contain complete MidiNoteData arrays with note, time, duration, and velocity -- all that's needed is the serialization layer.
- **Estimated complexity:** M (medium). Requires a MIDI file writer (either `jsmidgen`, `midi-writer-js`, or a custom ~200-line implementation since the format is simple for multi-track output). Each stem becomes a MIDI track. Block MIDI data maps directly to MIDI events.
- **Dependencies/blockers:** Need to add a dependency (`midi-writer-js` or equivalent) -- this requires escalation per CLAUDE.md rules since it is not listed in ARCHITECTURE.md. Alternatively, a zero-dependency MIDI file writer can be implemented in ~200 lines.
- **Key files:** New file `src/lib/midi-export.ts`, `src/components/layout/TopBar.tsx` (wire Export button)

#### 7. Loop Region Selection (Section Loop / Custom Range)

- **What it is:** The transport has a loop toggle button, but it only loops the entire arrangement (the Tone.js Transport `loopEnd` is set to the total duration in `engine.ts` line 222). There is no way to set a custom loop region or loop a single section. For practice, looping a specific section (e.g., just the chorus) is essential.
- **Why high value:** Looping a specific section is the single most important practice feature. Musicians need to woodshed a difficult passage by looping it at a slower tempo and gradually speeding up. Every competitor (iReal Pro, SmartMusic, BacktrackIt) has section-level looping. Without it, the user must manually skip back to the section start each time playback reaches the end.
- **Estimated complexity:** M (medium). Requires: (a) setting loop start/end from section boundaries (when a section is selected + loop is active, set Transport.loopStart/loopEnd to that section's bar range), (b) optional: click-drag on the bar ruler to set a custom loop region, (c) visual indicator of loop region in the arrangement view.
- **Dependencies/blockers:** None. The Tone.js Transport already supports `loopStart`/`loopEnd`. The selection store already tracks selected sections.
- **Key files:** `src/audio/engine.ts` (add `setLoopRegion(startBar, endBar)` method), `src/hooks/useAudio.ts` (expose loop region), `src/components/transport/TransportBar.tsx` (wire loop toggle to section-aware behavior), `src/components/arrangement/ArrangementView.tsx` (visual loop region indicator)


### Tier 2: Medium Value or Needs More Discovery

#### 8. Description Parser Integration

- **What it is:** `src/lib/description-parser.ts` exists and is tested, but the generation hints field (`project.generationHints`) is displayed in the UI as a textarea but never processed by the generator. The parser can extract key, tempo, genre, and style from natural language descriptions like "jazzy waltz, 120 BPM, brushes on snare" -- but the extracted values are not applied to the generation request.
- **Why medium value:** Natural language input is a vision differentiator, but the parser is a simple keyword matcher, not AI-powered. Its utility is limited. The separate input fields (key selector, BPM editor, genre dropdown) already provide the same functionality with higher reliability. Wiring the parser would be easy (S) but the user impact is unclear.
- **Key files:** `src/lib/description-parser.ts`, `src/hooks/useGenerate.ts`

#### 9. AI Assistant Integration (Beyond Stub)

- **What it is:** The AiAssistantSection in the left panel is purely cosmetic -- it has hardcoded sample messages and the user can type messages, but they are only appended to local state. No AI backend is connected. Messages are not persisted to Supabase (`ai_chat_messages` table exists but is never written to from the assistant).
- **Why medium value:** This is a core vision differentiator ("AI-powered"), but wiring it properly requires an LLM API integration (OpenAI, Anthropic, etc.) which is explicitly deferred in the architecture spec ("Stubbed for MVP -- rule-based MIDI generator with same API contract as future AI service"). However, basic integration -- persisting messages to Supabase and adding a simple system prompt that maps user intent to generator parameters -- could add value without a full AI backend.
- **Estimated complexity:** L (large) for full AI integration; M (medium) for basic persistence + parameter-mapping stub.
- **Key files:** `src/components/left-panel/AiAssistantSection.tsx`, `src/hooks/useProject.ts`, `src/store/project-store.ts` (`addChatMessage` exists)

#### 10. Chord Editing Post-Generation

- **What it is:** After generation, there is no way to edit individual chords in the chord lane. The chord lane in ArrangementView is display-only (renders `formatChord()` text but has no click handler). The store has `updateChord()` but there is no UI to invoke it. Users must go back to the text input and fully regenerate to change chords.
- **Why medium value:** Changing a chord after generation without full regeneration is important for iterative editing. However, changing a chord in the lane also needs to trigger MIDI regeneration for the affected bar's blocks, which connects to Gaps #2 and #3.
- **Estimated complexity:** M (medium). Need a click-to-edit or dropdown-on-click interaction on chord lane cells, wired to `updateChord()` + selective MIDI regeneration.
- **Key files:** `src/components/arrangement/ArrangementView.tsx` (chord lane), `src/store/project-store.ts` (`updateChord`), `src/lib/chords.ts` (chord formatting utilities)

#### 11. Block Style Editing

- **What it is:** BlockContext shows the block's current style and instrument info, but there is no way to change a block's style (e.g., change bass from "walking" to "slap" for a specific section). The store has `updateBlock()` which could set `block.style`, but there is no style picker UI in BlockContext.
- **Why medium value:** Per-block style customization is in the vision (the "Style values by instrument" list in ARCHITECTURE.md shows multiple style options per instrument). Without it, all blocks in a stem have the same genre-derived style.
- **Estimated complexity:** S-M. Need a style dropdown in BlockContext populated from the instrument's available styles, wired to `updateBlock({ style: newStyle })` + MIDI regeneration for that block.
- **Key files:** `src/components/left-panel/BlockContext.tsx`, `src/lib/genre-config.ts` (GENRE_SUBSTYLES), `src/lib/midi-generator.ts` (style -> MIDI mapping)

#### 12. Tempo Change Triggers MIDI Regeneration

- **What it is:** Changing BPM in the TopBar or TransportBar calls `updateProject({ tempo: newValue })` but does NOT trigger MIDI regeneration or audio engine tempo update. The arrangement continues playing at the old tempo until the user hits play again (which calls `engine.setTempo()` in `useAudio.play()`). The reactive `useEffect` in `useGenerate.ts` only watches style sliders, not tempo.
- **Why medium value:** BPM is the most commonly adjusted parameter during practice. The current behavior (change BPM, nothing happens until re-play) is confusing.
- **Estimated complexity:** S (small). Add `project?.tempo` to the `useEffect` dependency array in `useGenerate.ts` (or a separate effect that calls `engine.setTempo()`).
- **Key files:** `src/hooks/useGenerate.ts`, `src/hooks/useAudio.ts`, `src/audio/engine.ts`

#### 13. Project Duplication

- **What it is:** No way to duplicate a project. Users who want to try a variation (different genre, different key) must create a new project and re-enter all chords. No "Duplicate" or "Save As" option in the library or editor.
- **Why medium value:** Common workflow: create a version, then experiment with variations without losing the original.
- **Estimated complexity:** S (small). Add a `duplicateProject` function to `useProject.ts` that loads the current project, generates a new ID, saves with a modified name ("Copy of X"), and navigates to the new project.
- **Key files:** `src/hooks/useProject.ts`, `src/pages/LibraryPage.tsx` (add duplicate button on project cards)


### Tier 3: Deferred / Not MVP

These features appear in the vision but should NOT be built now:

| Feature | Vision Reference | Reason to Defer |
|---------|-----------------|-----------------|
| Audio file upload + style detection | Section 6, Tier 1, Item 4 | Requires AI/ML pipeline (stem separation, key detection). Explicitly stubbed for MVP. UI shows "Coming soon". |
| Image/OCR input | Section 6, Tier 1, Item 3 | Requires OCR + music notation parsing. Explicitly deferred in CLAUDE.md. |
| Audio export (MP3/WAV) | Section 6, Tier 1, Item 10 | Requires server-side audio rendering (Tone.js is browser-only). Explicitly deferred in CLAUDE.md. MIDI export (Gap #6) is feasible. |
| Sharing / public profiles | Section 7, Phase 1 | Requires social infrastructure. Explicitly deferred in CLAUDE.md ("share button disabled Coming soon"). |
| Practice tracking / streaks | Section 7, Phase 1, Item 3 | Explicitly removed from UI entirely per CLAUDE.md. |
| Arrangement marketplace | Section 7, Phase 2 | Post-PMF feature requiring user base. |
| Responsive design | Section 6, Tier 4, Item 12 | Desktop-first MVP. Explicitly deferred in CLAUDE.md. |
| API/OAuth for integrations | Section 6, Tier 5, Item 14 | Explicitly deferred in CLAUDE.md. |
| Extended stems (8+) | Section 8, Phase 3, Item 1 | 5 stems hardcoded for MVP per ARCHITECTURE.md. |
| Real-time harmonic matching | Section 9, Item 3 | Moonshot. Requires <50ms latency audio analysis. |
| Performance recording | Section 7, Phase 2, Item 5 | Post-MVP. Requires audio recording + analysis pipeline. |
| Difficulty scaling | Section 8, Phase 3, Item 4 | Needs AI sophistication beyond rule-based generator. |
| AI music theory coach | Section 9, Item 6 | Needs LLM integration. Explicitly deferred ("AI generation stubbed"). |
| Drum Phase 3 (premium samples) | ARTIFACT_TRACKER | Explicitly deferred. Revisit when Phase 1+2 complete. |
| Drum Phase 4 (AI render) | ARTIFACT_TRACKER | Explicitly deferred. Speculative. |
| iReal Pro format import | Appendix B, Item 5 | Parser is not built. Medium complexity, lower priority than core editing gaps. Revisit when chord parser is enhanced. |
| Nashville Number System parsing | Appendix B, Item 3 | Parser is not built. The current chord parser handles standard notation only. Vision positions this as a moat feature, but the professional musician persona is not the first target. |

---

## Recommended Next 3 Specs

### 1. Undo/Autosave (spec already exists -- execute immediately)

The spec at `specs/undo-autosave.md` (currently in `specs/historical/`) is fully written with 7 acceptance criteria, a unified snapshot format, and clear implementation steps. This should be the next execution queue. It fixes the most critical user-facing bug (silent data loss on undo, no beforeunload protection). Scope: 5 files modified, estimated 2-3 hours for an agent. This is marked "Ready to Execute" in the artifact tracker and should be prioritized above all new feature work.

### 2. Per-Section Block Generation + Reactive Pitched Instrument Regeneration (Gaps #2 + #3, combined)

These two gaps are tightly coupled and should be specced as a single execution queue. Gap #2 changes `generate()` in `midi-generator.ts` to produce one block per section for all instruments (not just drums), following the existing drum pattern. Gap #3 wires the reactive slider debounce in `useGenerate.ts` to regenerate all instruments (not just drums) on style slider changes, extending the hot-swap path to pitched instruments. Together, they make the entire arrangement reactively responsive to style changes across all instruments. Scope: 2 primary files (`midi-generator.ts`, `useGenerate.ts`), with minor changes to `engine.ts` for multi-instrument hot-swap. Estimated 1-2 hours. The approach is well-proven by the existing drum implementation -- this is extending the same pattern to the other 4 instruments.

### 3. Mixer State Persistence + Section Loop + MIDI Export (Quality-of-Life Bundle)

This bundles three independent but collectively high-impact quality-of-life gaps (#4, #7, #6) into a single execution queue with 3-4 tasks. Task 1: Wire MixerDrawer to project store instead of local state, so volume/mute/solo persists across reloads. Task 2: Add section-aware loop regions (when a section is selected and loop is active, Tone.js Transport loops that section's bar range). Task 3: Implement MIDI export (serialize block MIDI data to a .mid file, enable the Export button). Task 4: Wire tempo changes to trigger audio engine tempo update during playback. These are all S-M complexity, independent of each other, and address the most common pain points after core editing is solid. Estimated 3-4 hours total.
