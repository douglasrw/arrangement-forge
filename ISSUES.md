# Arrangement Forge — Issue Tracker

Running log of bugs, issues, and improvements discovered during testing.

---

## Fixed

### 1. Chord input textarea loses focus after one character
- **Status:** Fixed
- **Date:** 2026-03-02
- **Symptom:** Typing in the chord chart textarea on a new project, you could only type one character before getting kicked out of the text box.
- **Root cause:** `LeftPanel.tsx` defined `Breadcrumb` and `ContextPanel` as component functions *inside* the render body. Every store update (e.g., typing a character) created new function references, so React unmounted/remounted `SongContext` on each keystroke — destroying the textarea and its focus.
- **Fix:** Inlined the conditional JSX directly in `LeftPanel` instead of using nested component functions. Also added `useShallow` selector so `LeftPanel` only re-renders when `sections`/`blocks`/`stems` change (not on every project field update).
- **Also fixed:** `useProject.ts` was calling `useProjectStore()` at render time, subscribing `AppShell` to every store change. Switched to `useProjectStore.getState()` inside callbacks.

### 2. No audio on playback
- **Status:** Fixed
- **Date:** 2026-03-02
- **Symptom:** Pressing play after generating an arrangement produces no sound.
- **Root cause:** `AudioEngine.loadArrangement()` (which schedules all MIDI notes onto the Tone.js Transport) was never called. The engine was initialized and transport started, but with zero notes scheduled.
- **Fix:** `useAudio.ts` now auto-loads the arrangement via `useEffect` when `blocks`/`stems`/`sections` change and the engine is ready. Also loads in the `play()` handler to cover the first-play initialization race. Sets tempo from project before loading.
- **Verified:** Transport advances (Bar 1 → 0:01 / 0:08), play/pause toggles correctly, no console errors.

---

## Open / Observed

### 3. Block labels only show first chord of section
- **Status:** Open (cosmetic)
- **Symptom:** After generation, every block in a multi-chord section shows only the first chord (e.g., "Cmaj7") even though the section spans Cmaj7 → Am7 → Dm7 → G7.
- **Root cause:** Generator sets `block.chordDegree` to the first chord entry only. The MIDI data inside the block correctly uses all chords.
- **Notes:** The chord lane at the bottom does show all chords correctly. This is a visual label issue, not an audio issue.

### 4. Section structure is simplistic
- **Status:** Open (enhancement)
- **Symptom:** A 4-chord input gets one "Intro" section. Longer inputs get generic section names (Intro, Verse, Chorus, Bridge, Outro) based on bar count heuristics.
- **Notes:** Expected for MVP rule-based generator. Will improve when AI generation is wired up.

### 5. Chord parser treats spaces as bar separators
- **Status:** Open (design decision)
- **Symptom:** `| Dm7 G7 |` produces 2 bars (one per chord) rather than 1 bar with 2 chords. Pipes are purely visual delimiters in the current parser.
- **Notes:** Need to decide: should pipes define bars (each pipe segment = 1 bar, spaces within = multiple chords per bar)? Current behavior may surprise users coming from iReal Pro notation.

### 6. Generate button disabled until chord input has content
- **Status:** Verified working
- **Notes:** Confirmed the button enables as soon as you type chords. Was likely broken before due to Issue #1 (couldn't type).
