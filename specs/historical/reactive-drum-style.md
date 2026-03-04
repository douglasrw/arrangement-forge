# Reactive Drum Style Controls

## Problem Statement

When a user adjusts style sliders (Energy, Groove, Feel, Swing %, Dynamics) in the
Style Controls panel, the drums should immediately reflect the change in playback.
The reactive pipeline already exists (T5 commit) — slider changes trigger
`regenerateMidi()` with a 300ms debounce. But the current implementation has two
inefficiencies:

1. **Over-generation:** `regenerateMidi()` regenerates MIDI for ALL instruments, but
   only drums use the 5 style parameters. Bass, piano, guitar, and strings are
   unaffected by energy/groove/feel/swing/dynamics — they only respond to genre,
   chords, and key.

2. **Full reload:** After regeneration, the `useAudio` effect calls
   `engine.loadArrangement()` which tears down and re-schedules ALL instrument
   notes, causing potential audio gaps during playback.

The fix is scoped: regenerate only drum blocks, and hot-swap only the drum track
in the engine.

## Acceptance Criteria

1. **Changing any style slider while playback is running produces audibly different
   drum patterns within ~500ms** (300ms debounce + generation + swap).

2. **Playback does not stop, glitch, or restart** when a slider changes. Transport
   position is preserved. Other instruments continue uninterrupted.

3. **Non-drum instruments are not regenerated** when only style sliders change.
   (Genre/sub-style dropdown changes still trigger full regeneration — that's a
   different code path.)

4. **The style cascade is respected:** section-level overrides (if any) take
   precedence over project-level values during drum regeneration.

5. **Works in both playing and stopped states.** In stopped state, MIDI data is
   updated silently so the next Play uses the new patterns.

## Constraints

### Musts
- Must not modify the existing `regenerateMidi()` full-regen path (other callers
  may depend on it). Add a new `regenerateDrums()` function alongside it.
- Must preserve deterministic drum patterns — same slider values + same bar number
  = same output (existing `knuthHash` behavior).
- Must call `markDirty()` so the updated drum MIDI persists on next auto-save.

### Must-Nots
- Must not introduce a new npm dependency.
- Must not change the `DrumContext` interface or `buildDrumMidi()` function.
- Must not affect the initial generation flow (`runGeneration()`).

### Preferences
- Prefer updating the `useGenerate` hook's existing reactive `useEffect` to call
  the new drums-only path instead of `regenerateMidi()`.
- Prefer a lightweight engine method (`hotSwapDrumMidi()`) over full
  `loadArrangement()` for drum-only updates.

## Decomposition

### Task 1: Add `regenerateDrumsOnly()` to useGenerate hook

**File:** `src/hooks/useGenerate.ts`

Add a new function that:
1. Reads current project + sections + blocks + stems from the store
2. Identifies the drums stem (by `instrument === 'drums'`)
3. Filters blocks to drums-only blocks
4. For each drum block, resolves the style cascade (section override ?? project default)
5. Calls `generateMidiForBlock('drums', ...)` with the resolved `DrumContext`
6. Updates ONLY the drum blocks in the store (preserves all other blocks unchanged)
7. Calls `markDirty()`

Update the existing reactive `useEffect` (watching energy/groove/feel/swingPct/dynamics)
to call `regenerateDrumsOnly()` instead of `regenerateMidi()`.

**Verify:**
- Unit test: mock store with 5 stems × 4 sections = 20 blocks. Call
  `regenerateDrumsOnly()`. Assert only the 4 drum blocks have new `midiData`.
  Assert the other 16 blocks are reference-equal (unchanged).

### Task 2: Add `hotSwapInstrument()` to AudioEngine

**File:** `src/audio/engine.ts`

Add a method:
```typescript
hotSwapInstrument(instrument: string, updatedBlocks: Block[], sections: Section[]): void
```

That:
1. Finds the sampler channel for the given instrument
2. Cancels all pending Tone.js scheduled events for that instrument only
3. Re-schedules notes from the updated blocks for that instrument
4. Preserves transport position and state (playing/stopped)

The key Tone.js mechanism: each instrument's notes are scheduled via
`transport.schedule()`. Store the event IDs per instrument so they can be
selectively cancelled with `transport.clear(eventId)`.

**Verify:**
- Manual test: play arrangement, change Energy slider from 50 to 100 while
  playing. Drums should get louder/more intense. Other instruments unchanged.
  Transport position unaffected.

### Task 3: Wire drum-only updates through `useAudio`

**File:** `src/hooks/useAudio.ts`

Currently, `useAudio` watches ALL blocks and calls `loadArrangement()` on any
change. This needs to distinguish between:
- **Drum-only block updates** → call `engine.hotSwapInstrument('drums', ...)`
- **Full arrangement updates** → call `engine.loadArrangement()` (existing path)

Approach: Add a `lastDrumRegenTimestamp` ref in `useGenerate`. When
`regenerateDrumsOnly()` runs, set this timestamp. In `useAudio`, compare the
block change against this timestamp to determine if it's a drum-only update.

Alternative simpler approach: Add a `drumOnlyUpdate` flag to the project store
that `regenerateDrumsOnly()` sets and `useAudio` reads + clears. This avoids
timestamp comparison complexity.

**Verify:**
- Playwright: load a project, start playback, change Groove slider. Assert
  transport position advances continuously (no reset to bar 1). Assert drums
  channel has different scheduled notes.

## Evaluation

### Test Cases

1. **Slider drag while playing:** Open project → Play → drag Energy from 50 to 90.
   Expected: drums get more intense (higher velocity), playback continues without
   interruption.

2. **Slider drag while stopped:** Open project → change Groove to 80 → Play.
   Expected: drums play the high-complexity pattern from the start.

3. **Rapid slider changes:** Drag Feel slider quickly back and forth.
   Expected: 300ms debounce prevents thrashing. Only final value triggers regen.
   No audio artifacts.

4. **Section override respected:** Set section 2's energy override to 30, project
   energy to 70. Change project energy to 90. Expected: section 2 drums still
   play at energy 30 (override), other sections play at energy 90.

5. **Non-drum instruments unchanged:** Before and after a style slider change,
   export/log the bass block `midiData`. Expected: byte-identical (reference-equal
   in store).

## Intent Trace

**Structural:** Style slider `onChange` → `updateProject()` in store →
`useGenerate` effect fires → `regenerateDrumsOnly()` → store update with
`drumOnlyUpdate` flag → `useAudio` effect fires → `engine.hotSwapInstrument('drums', ...)`
→ Tone.js reschedules drum notes only.

**Behavioral:** User opens project, presses Play, drags the Groove slider from
"Standard" to "Busy". Within half a second, hi-hat pattern changes from 8th notes
to 16th notes with ghost snares. Bass, piano, guitar, strings continue unchanged.
Transport bar shows continuous advancing position with no reset.
