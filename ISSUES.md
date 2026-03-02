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

### 7. Blocks don't fill the full width of the arrangement area
- **Status:** Fixed
- **Date:** 2026-03-02
- **Symptom:** Stem lane blocks used fixed pixel widths (`barSpan * 48px`) while the rest of the layout used flex, leaving gaps or misalignment.
- **Fix:** Changed `StemLane.tsx` to wrap each block in a flex container with `style={{ flex: barSpan }}`. Changed `Block.tsx` to use `w-full h-full` instead of a fixed pixel width. Blocks now scale proportionally and fill the entire arrangement width.

### 8. No playhead during playback
- **Status:** Fixed
- **Date:** 2026-03-02
- **Symptom:** No visual indicator of playback position in the arrangement view.
- **Fix:** Added a `Playhead` component to `ArrangementView.tsx` — a bright green vertical line that tracks the current bar/beat position during playback. Uses `useAudio()` transport state and calculates position as a percentage of total bars.
- **Also fixed:** Each `useAudio()` hook instance had independent `isReady` state, so the Playhead's poll never started (its `isReady` stayed false while TransportBar's became true). Added a public `isInitialized` getter to `AudioEngine` (shared singleton state) and changed the poll guard to use `engine.isInitialized` instead of local `isReady`.
- **Verified:** Playhead visible and moving correctly during playback at Bar 3 / 0:05.

### 9. Sustained notes keep ringing after stop/pause
- **Status:** Fixed
- **Date:** 2026-03-02
- **Symptom:** Pressing stop during playback silences most instruments, but strings (sustained_pad) keep ringing through their long release envelope.
- **Root cause:** `AudioEngine.stop()` and `pause()` only stopped the Tone.js Transport — they didn't release currently sounding notes. The strings PolySynth has a 0.9 sustain and 1.5s release, so notes triggered by `triggerAttackRelease` kept sounding.
- **Fix (v1):** Added `releaseAllNotes()` private method. But release tails (1.5s) still audible.
- **Fix (v2):** `stop()` now also calls `Tone.getTransport().cancel()` and zeros master gain immediately. `pause()` zeros master gain too. `play()` restores master gain before starting. Tracks `_masterVolume` for proper restore. Instant silence on stop/pause.

### 10. Metronome click produces no sound
- **Status:** Fixed
- **Date:** 2026-03-02
- **Symptom:** Enabling "Click" and pressing play produces no metronome sound.
- **Root cause:** `Metronome.scheduleClick()` was never called — `loadArrangement()` didn't schedule metronome events. Also, `scheduleClick` had an early return when `!this.enabled`, so metronome couldn't be toggled mid-playback.
- **Fix:** `loadArrangement()` now calls `metronome.scheduleClick()` at the end. Metronome always schedules events but checks `this.enabled` at trigger time, allowing mid-playback toggle.

### 11. Drums block invisible (wrong color)
- **Status:** Fixed
- **Date:** 2026-03-02
- **Symptom:** Drums block appeared nearly invisible on dark theme.
- **Root cause:** Used `bg-neutral/30 border-neutral/50` — neutral is the background color on dark themes.
- **Fix:** Changed to `bg-warning/20 border-warning/40` (amber/yellow).

### 12. Chord labels redundant in blocks
- **Status:** Fixed
- **Date:** 2026-03-02
- **Symptom:** Blocks showed chord names (e.g., "Cmaj7") that duplicated the chord lane at the bottom.
- **Fix:** Removed chord label rendering from `Block.tsx`. Blocks now only show the style name.

### 13. Transport scrubber bar ugly and redundant
- **Status:** Fixed
- **Date:** 2026-03-02
- **Symptom:** Big fluorescent green scrubber bar in transport, redundant with the playhead.
- **Fix:** Removed `Scrubber` component from `TransportBar.tsx`. Playhead provides visual position tracking.

### 14. Transport buttons inconsistent sizing
- **Status:** Fixed
- **Date:** 2026-03-02
- **Symptom:** Play button was much bigger than skip/stop buttons.
- **Fix:** All transport buttons now use uniform `btn-sm w-9 h-9` sizing. Play gets subtle border accent.

### 15. Mixer mini volume bars redundant
- **Status:** Fixed
- **Date:** 2026-03-02
- **Symptom:** Collapsed mixer row showed small green bars next to each stem name — redundant visual clutter.
- **Fix:** Removed `MiniBar` component from `MixerDrawer.tsx`. Collapsed row just shows stem abbreviations.

### 16. Mixer faders render as weird circular knobs
- **Status:** Fixed
- **Date:** 2026-03-02
- **Symptom:** Vertical faders in expanded mixer looked like circular knobs instead of sliders.
- **Root cause:** Used `writing-mode: vertical-lr` + `direction: rtl` + `transform: rotate(180deg)` — browsers rendered DaisyUI range inputs as circles.
- **Fix:** Switched to `transform: rotate(-90deg)` on a standard horizontal range inside an overflow-hidden container.

### 17. Genre/style changes not reflected in arrangement
- **Status:** Fixed
- **Date:** 2026-03-02
- **Symptom:** Changing genre dropdown from Jazz to Funk didn't change the arrangement.
- **Root cause:** "Regenerate Song" button in `SongContext.tsx` had no `onClick` handler — it was a dead button.
- **Fix:** Wired button to `runGeneration(true)` via `useGenerate` hook. Styles now change on regenerate (e.g., Jazz → Funk: walking → slap, jazz_comp → muted_funk).

---

## Open / Observed

### 3. Block labels only show first chord of section
- **Status:** Resolved (by design)
- **Notes:** Chord labels were removed from blocks entirely (Issue #12). Chords are shown in the chord lane at the bottom.

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
