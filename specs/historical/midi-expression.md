> **ARCHIVED — STALE (2026-03-04)**
> This spec was written before the groove/feel rename, Salamander drum sample integration, and reactive slider pipeline. Its assumptions are no longer valid:
> - Drum builder functions (`buildDrumBar`, `buildJazzDrumBar`, etc.) no longer exist — replaced by `buildDrumMidi()` in `drum-patterns.ts`
> - Drums already implement full expression transforms (applyGroove, applyEnergy, applyDynamics, applySwing, applyFeel)
> - `groove` now means complexity/busyness, not humanization — `feel` handles humanization
> - `ExpressionParams` is missing the `feel` field
> - Scope should be narrowed to non-drum instruments only (bass, piano, guitar, strings)
>
> A replacement spec scoped to non-drum instrument expression is needed before this work can proceed.

---

# Spec: Energy / Dynamics / Groove / Swing MIDI Integration

**Status:** Ready for implementation
**Author:** Engineering Coach (Planning Mode)
**Date:** 2026-03-03
**Estimated effort:** 6-8 hours across 4 subtasks
**Target file:** `src/lib/midi-generator.ts` (primary), `src/lib/midi-generator.test.ts` (tests)

---

## Primitive 1: Self-Contained Problem Statement

The `GenerationRequest` type carries four expression parameters — `energy` (0-100), `dynamics` (0-100), `groove` (0-100), and `swing_pct` (0-100) — that the UI exposes as prominent sliders in `StyleControlsSection`. The MIDI generator (`src/lib/midi-generator.ts`) completely ignores all four parameters. A grep for any of these field names in the generator returns zero matches.

**Current state:** Every instrument builder function uses hardcoded velocity constants (e.g., `velocity: 85`, `velocity: 70`). All notes land on exact beat positions with no swing timing. Note density is fixed regardless of energy level. The `generate()` function receives the full `GenerationRequest` but never destructures or passes `energy`, `dynamics`, `groove`, or `swing_pct` to any builder function.

**Desired state:** Moving any of the four sliders produces an audibly different MIDI output. Energy controls note density and pattern complexity. Dynamics controls velocity range and variation. Groove controls timing humanization (micro-timing offsets). Swing controls the eighth-note swing ratio (straight vs shuffled). The changes must be musically coherent — a jazz trio at energy=20 should sound like a quiet ballad, not like the same pattern played quieter.

**What this is NOT:**
- This is NOT a UI task. The sliders already work and write to the project store.
- This is NOT a style cascade task. The cascade (`resolveStyle()`) already resolves values at the project/section/block level. This task consumes those resolved values inside the generator.
- This is NOT a "future AI" task. This is improving the rule-based MVP generator to use parameters it already receives but ignores.

---

## Primitive 2: Acceptance Criteria

Each criterion is independently verifiable by examining MIDI output data.

### AC-1: Energy affects note density
- **energy=20:** Bass plays half notes (2 notes/bar). Piano plays whole-note chords (1 voicing/bar). Guitar plays half-note strums (2/bar). Drums play kick+snare only (no hats/ride subdivisions). Strings unchanged (always sustained pad).
- **energy=50:** Current default patterns (unchanged from today). Bass: quarter notes or walking. Piano: 2 voicings/bar. Guitar: quarter-note strums. Drums: full pattern with 8th-note hats.
- **energy=80:** Bass adds 8th-note fills between chord tones. Piano adds rhythmic comping on offbeats. Guitar adds 16th-note strums (Funk) or arpeggiated fills. Drums add ghost notes, extra kick patterns, open hats. Strings add tremolo articulation (shorter notes, repeated).

### AC-2: Dynamics affects velocity range
- **dynamics=10:** All velocities in range 30-55. Piano dynamic marking: pp.
- **dynamics=50:** All velocities in range 55-85. Piano dynamic marking: mp.
- **dynamics=90:** All velocities in range 80-110. Piano dynamic marking: f/ff.
- Within any dynamics setting, natural instrument accent patterns are preserved (e.g., snare on 2/4 louder than ghost notes), but the entire range shifts.
- All velocities remain clamped to 1-127 (MIDI spec).

### AC-3: Groove affects micro-timing humanization
- **groove=0:** All notes land on exact beat positions (no offset). Identical to current behavior.
- **groove=50:** Notes shift by up to +/-0.03 beats (subtle feel). Each note gets a deterministic pseudo-random offset seeded by its position (not Math.random() — must be reproducible).
- **groove=100:** Notes shift by up to +/-0.06 beats (loose, human feel). Same deterministic seeding.
- Kick drum beat 1 and snare backbeats are NEVER shifted (anchors). Only non-anchor notes get groove offsets.
- The offset is always deterministic: same input produces same output. Use a simple hash of `(barOffset + noteTime + instrumentIndex)` as the seed, not `Math.random()`.

### AC-4: Swing affects eighth-note timing
- **swing_pct=50:** Straight eighths. No timing change. An 8th note at beat position 0.5 stays at 0.5.
- **swing_pct=66:** Triplet swing. An 8th note at beat position 0.5 moves to 0.667 (2/3 of the beat). Standard jazz swing feel.
- **swing_pct=75:** Hard swing. An 8th note at beat position 0.5 moves to 0.75 (dotted-eighth + sixteenth feel).
- Swing applies ONLY to notes on upbeat eighth-note positions (0.5, 1.5, 2.5, 3.5 within a bar). Downbeat notes are never shifted.
- Swing also applies to upbeat 16th notes proportionally: a 16th at 0.25 shifts to `0.25 * swingRatio`, a 16th at 0.75 shifts to `0.5 + 0.25 * swingRatio`.
- When `swing_pct` is `null` or the genre has `GENRE_SLIDERS[genre].swing === false`, treat as swing_pct=50 (straight).

### AC-5: Parameters compose without conflict
- All four parameters can be active simultaneously. Energy changes density, dynamics changes velocity, groove adds micro-timing, swing shifts eighth notes. They stack independently.
- Application order: (1) Energy determines which notes exist, (2) Dynamics sets velocity values, (3) Swing shifts eighth-note timing, (4) Groove adds micro-timing offsets on top.

### AC-6: Backward compatibility
- With `energy=50, dynamics=50, groove=0, swing_pct=50` (or `null`), the output is structurally identical to today's output: same note count per block, same note names, same durations. Velocities may differ by up to 3 due to the `scaleVelocity` remapping at dynamics=50 (acceptable). Note times are unchanged (groove=0 and swing=50 produce no shifts).
- Existing tests pass without modification. The existing `baseRequest` uses `energy: 50, groove: 50, swing_pct: 65, dynamics: 50`. After the change, swing and groove WILL shift note timing, and velocities WILL be remapped. However, all existing test assertions are structural (note count >= 2, velocities in 1-127, section contiguity, block coverage, style name matching) and do not check exact values, so they will still pass.
- New tests are additive.

### AC-7: All velocities remain in valid MIDI range
- Every `velocity` value in every `MidiNoteData` is an integer in range 1-127, regardless of parameter combination. Clamp after all calculations.

---

## Primitive 3: Constraint Architecture

### Musts

1. **Must** keep the `generate()` function signature unchanged — it takes `GenerationRequest` and returns `GenerationResponse`. No type changes.
2. **Must** extract `energy`, `dynamics`, `groove`, and `swing_pct` from the request inside `generate()` and pass them to all builder functions.
3. **Must** keep all generated velocities as integers clamped to 1-127.
4. **Must** use deterministic pseudo-random for groove offsets — same input always produces same output. No `Math.random()`.
5. **Must** preserve existing genre-specific pattern logic (Jazz comping, walking bass, funk 16ths, etc.). Energy modulates the complexity of these patterns; it does not replace them.
6. **Must** apply swing only to upbeat positions. Downbeats are never swung.
7. **Must** ensure that all existing tests continue to pass without modification. The existing `baseRequest` uses `energy: 50, dynamics: 50, groove: 50, swing_pct: 65`. After the change, these values will produce slightly different output (swing shifts timing, groove adds offsets, dynamics remaps velocities), but all existing assertions are structural (counts, ranges, contiguity) and will still hold.

### Must-Nots

1. **Must not** change the `GenerationRequest`, `GenerationResponse`, `MidiNoteData`, or any type in `src/types/`.
2. **Must not** modify any file outside `src/lib/midi-generator.ts` and `src/lib/midi-generator.test.ts`.
3. **Must not** use `Math.random()` or any non-deterministic source.
4. **Must not** add external dependencies.
5. **Must not** change the section creation logic (`createSections`, `divideSections`) — those are unrelated to expression.
6. **Must not** make the builder functions async.
7. **Must not** produce notes with `time < 0` or `duration <= 0`.

### Preferences

1. **Prefer** adding an `ExpressionParams` interface to group the four values, rather than passing 4 separate arguments to every function.
2. **Prefer** a single `applySwing(time, swingPct)` utility function rather than inline swing math in every builder.
3. **Prefer** a single `applyGroove(time, seed, groove)` utility function for the same reason.
4. **Prefer** a single `scaleVelocity(baseVelocity, dynamics)` utility function.
5. **Prefer** keeping the energy-based note selection readable with named helper functions rather than complex ternary chains.
6. **Prefer** rounding velocity to the nearest integer after scaling (use `Math.round`, then clamp).

### Escalation Triggers

1. If any existing test fails after the change, stop and investigate — the backward-compatibility guarantee (AC-6) is violated.
2. If the implementation would require changing the UI sliders' min/max ranges, stop — that is out of scope.
3. If the swing math produces notes that overlap or go negative, stop — the formula is wrong.

---

## Primitive 4: Decomposition

Four subtasks, each independently testable. Execute in order (each builds on the previous).

---

### Subtask 1: Expression Utilities (estimated: 1 hour)

**Goal:** Create the shared utility functions and `ExpressionParams` interface that all builder functions will use.

**Creates (all inside `src/lib/midi-generator.ts`):**

```typescript
/** Grouped expression parameters extracted from GenerationRequest */
interface ExpressionParams {
  energy: number;    // 0-100
  dynamics: number;  // 0-100
  groove: number;    // 0-100
  swingPct: number;  // 0-100, 50 = straight
}
```

**Function: `scaleVelocity(baseVelocity: number, dynamics: number): number`**

Maps a base velocity through the dynamics range. The dynamics parameter shifts the entire velocity curve up or down.

Formula:
```
// dynamics=0  -> output range 30-55  (pp)
// dynamics=50 -> output range 55-85  (mp, the current hardcoded range)
// dynamics=100 -> output range 80-110 (ff)
//
// Linear interpolation of the range boundaries:
//   lowBound  = lerp(30, 80, dynamics / 100)  = 30 + dynamics * 0.5
//   highBound = lerp(55, 110, dynamics / 100)  = 55 + dynamics * 0.55
//
// The base velocity (0-127) is normalized to 0-1, then mapped into [lowBound, highBound]:
//   normalized = baseVelocity / 127
//   scaled = lowBound + normalized * (highBound - lowBound)
//   return clamp(Math.round(scaled), 1, 127)
```

**Function: `applySwing(time: number, barOffset: number, swingPct: number): number`**

Shifts upbeat eighth-note positions based on swing percentage.

```
// swingPct is 0-100, where 50 = straight, 66 = triplet swing, 75 = hard swing
// Convert to swing ratio: swingRatio = swingPct / 100
// (so 50 -> 0.5, 66 -> 0.66, 75 -> 0.75)
//
// beatPosition = time - barOffset (position within the bar, 0-3.999...)
// beatFraction = beatPosition % 1.0 (position within the beat, 0-0.999...)
// beatWhole = floor(beatPosition) (which beat: 0, 1, 2, 3)
//
// If beatFraction is near 0.5 (+/- 0.01), this is an upbeat eighth:
//   newFraction = swingRatio
//   return barOffset + beatWhole + newFraction
//
// If beatFraction is near 0.25 (+/- 0.01), this is an upbeat 16th (first):
//   newFraction = swingRatio / 2
//   return barOffset + beatWhole + newFraction
//
// If beatFraction is near 0.75 (+/- 0.01), this is an upbeat 16th (second):
//   newFraction = swingRatio + (1 - swingRatio) / 2
//   return barOffset + beatWhole + newFraction
//
// Otherwise: return time unchanged (downbeats are never swung)
```

**Function: `applyGroove(time: number, seed: number, groove: number): number`**

Adds deterministic micro-timing offset.

```
// groove is 0-100
// maxOffset = groove * 0.0006 (so groove=0 -> 0, groove=50 -> 0.03, groove=100 -> 0.06)
//
// Deterministic hash: use a simple integer hash of the seed
//   hash = ((seed * 2654435761) >>> 0) % 1000  // Knuth multiplicative hash, unsigned
//   normalized = (hash / 1000) * 2 - 1          // range -1 to +1
//   offset = normalized * maxOffset
//
// return time + offset
```

The seed for each note should be: `Math.round((barOffset + time) * 1000) + instrumentSeed` where `instrumentSeed` is a fixed value per instrument (drums=0, bass=1000, piano=2000, guitar=3000, strings=4000). This ensures:
- Same note in same position always gets same offset
- Different instruments at the same time get different offsets (they are different humans)
- The result is fully deterministic

**Anchor notes (exempt from groove):** Define an array of anchor conditions. Kick on beat 1 (`note === 'C2' && beatPosition < 0.01`), snare on beats 2 and 4 (`note === 'D2' && (beatPosition near 1.0 or 3.0)`). These notes skip `applyGroove`. Implementation: pass the note name and beat position; if it matches an anchor condition, return time unchanged.

**Function: `clampVelocity(v: number): number`**

```typescript
function clampVelocity(v: number): number {
  return Math.max(1, Math.min(127, Math.round(v)));
}
```

**Tests for Subtask 1:**

```
- scaleVelocity(85, 50) returns value in range 55-85
- scaleVelocity(85, 10) returns value in range 30-55
- scaleVelocity(85, 90) returns value in range 80-110
- scaleVelocity(127, 100) returns <= 127
- scaleVelocity(0, 0) returns >= 1
- applySwing(0.5, 0, 50) returns 0.5 (straight)
- applySwing(0.5, 0, 66) returns ~0.66
- applySwing(0.5, 0, 75) returns ~0.75
- applySwing(0.0, 0, 75) returns 0.0 (downbeat unchanged)
- applySwing(1.0, 0, 75) returns 1.0 (downbeat unchanged)
- applySwing(1.5, 0, 66) returns ~1.66
- applyGroove(1.0, 42, 0) returns 1.0 (no groove)
- applyGroove(1.0, 42, 50) returns value in range [0.97, 1.03]
- applyGroove(1.0, 42, 100) returns value in range [0.94, 1.06]
- applyGroove called twice with same args returns same result (deterministic)
- applyGroove called with different seeds returns different results
```

**Done when:** All utility tests pass. No builder functions modified yet.

---

### Subtask 2: Dynamics + Energy Integration into Builder Functions (estimated: 2-2.5 hours)

**Goal:** Thread `ExpressionParams` through every builder function. Apply `scaleVelocity()` to all velocity values. Apply energy-based note density changes.

**Changes to function signatures:**

Every builder function gains an `expr: ExpressionParams` parameter:

```typescript
function buildDrumBar(genre: string, barOffset: number, expr: ExpressionParams): MidiNoteData[]
function buildJazzDrumBar(barOffset: number, expr: ExpressionParams): MidiNoteData[]
function buildRockDrumBar(barOffset: number, expr: ExpressionParams): MidiNoteData[]
function buildFunkDrumBar(barOffset: number, expr: ExpressionParams): MidiNoteData[]
function buildBassNotes(chord, key, genre, barOffset, expr: ExpressionParams): MidiNoteData[]
function buildPianoNotes(chord, key, genre, barOffset, expr: ExpressionParams): MidiNoteData[]
function buildGuitarNotes(chord, key, genre, barOffset, expr: ExpressionParams): MidiNoteData[]
function buildStringsNotes(chord, key, barOffset, barCount, expr: ExpressionParams): MidiNoteData[]
function generateMidiForBlock(instrument, barCount, chordsForBlock, key, genre, expr: ExpressionParams): MidiNoteData[]
```

**Dynamics application rule:** Replace every hardcoded `velocity: N` with `velocity: scaleVelocity(N, expr.dynamics)`. The base velocity `N` encodes the instrument's natural accent pattern (snare louder than ghost note). The dynamics parameter shifts the entire range.

**Energy application rules by instrument:**

All energy thresholds are inclusive. "Low" = energy <= 35. "Mid" = 36-65. "High" = energy >= 66.

**Drums — Energy density tiers:**

| Energy | Kick | Snare | Hat/Ride | Ghost notes | Extra |
|--------|------|-------|----------|-------------|-------|
| Low (0-35) | Beat 1 only | Beat 3 only | None | None | — |
| Mid (36-65) | Beats 1, 3 | Beats 2, 4 | 8th notes (current default) | None | — |
| High (66-100) | Beats 1, 3 + "and of 2" | Beats 2, 4 | 16th notes | Ghost snares on offbeats (vel 35) | Open hat on beat 4-and |

Implementation approach for drums: Use `if/else` on energy tier inside each drum builder. At low energy, emit only the essential notes. At mid energy, emit the current pattern (backward compatible). At high energy, add the extra notes.

For `buildJazzDrumBar`:
- Low: Ride on beats 1 and 3 only. No snare. Kick on beat 1 only (if barOffset === 0).
- Mid: Current pattern (ride every beat, snare 2/4, kick on bar 1).
- High: Ride on every 8th note (8 hits). Snare on 2/4 with ghost on "and of 2" and "and of 4". Kick on 1 and 3.

For `buildRockDrumBar`:
- Low: Kick on 1 only. Snare on 3 only. No hats.
- Mid: Current pattern (kick 1/3, snare 2/4, 8th-note hats).
- High: Kick on 1, "and of 2", 3. Snare on 2/4 with ghost on "and of 4" (vel 35). 16th-note hats. Open hat on "and of 4".

For `buildFunkDrumBar`:
- Low: Kick on 1 only. Snare on 3 only. No hats.
- Mid: Current pattern (syncopated kick, snare 2/4 + ghost, 16th hats).
- High: Add extra kick on "and of 1". Add snare flam on 2 (two hits 0.05 apart). 32nd hats on beats 2-3.

**Bass — Energy density tiers:**

| Energy | Pattern |
|--------|---------|
| Low (0-35) | Root on beat 1 only. Whole note duration (3.8 beats). 1 note/bar. |
| Mid (36-65) | Current patterns (walking for Jazz/Blues = 4 notes/bar; root+fifth for others = 2 notes/bar). |
| High (66-100) | Walking patterns get chromatic passing tones between chord tones (8th note fills). Non-walking patterns add the fifth on beat 3 and an approach note on beat 4. |

For Jazz/Blues walking bass at high energy:
```
Beat 1: root (quarter)
Beat 1.5: chromatic passing tone between root and 3rd (eighth)
Beat 2: 3rd (quarter)
Beat 2.5: chromatic passing tone between 3rd and 5th (eighth)
Beat 3: 5th (quarter)
Beat 3.5: chromatic approach to next root (eighth)
Beat 4: approach note (quarter)
```
The "chromatic passing tone between X and Y" is the note one semitone below Y. Use the existing `noteToMidi` and `NOTE_SEMITONES` infrastructure.

For other genres at high energy:
```
Beat 1: root (quarter, 0.9 dur)
Beat 2: fifth (quarter, 0.9 dur)
Beat 3: root octave up (quarter, 0.9 dur)  [use octave+1]
Beat 4: approach note to next root (quarter, 0.9 dur)
```

**Piano — Energy density tiers:**

| Energy | Pattern |
|--------|---------|
| Low (0-35) | Single whole-note chord voicing on beat 1. Duration = 3.8 beats. |
| Mid (36-65) | Current patterns (Jazz: beats 1.5 and 3; others: beats 1 and 3). |
| High (66-100) | Jazz: comping on beats 1.5, 2.5, 3, 3.5 (4 attacks). Others: beats 1, 2, 3, 4 (quarter-note rhythm). |

**Guitar — Energy density tiers:**

| Energy | Pattern |
|--------|---------|
| Low (0-35) | Single chord on beat 1. Duration = 3.5 beats. |
| Mid (36-65) | Current patterns (Funk: upbeat 8ths; Jazz: arpeggiated; others: quarter strums). |
| High (66-100) | Funk: 16th-note chops on every 16th. Jazz: 8th-note arpeggios cycling through chord tones. Others: 8th-note strums with alternating up/down velocity accent (down=base, up=base-10). |

**Strings — Energy density tiers:**

| Energy | Pattern |
|--------|---------|
| Low (0-35) | Current sustained pad (unchanged). |
| Mid (36-65) | Current sustained pad (unchanged). |
| High (66-100) | Tremolo: repeated 8th-note attacks of the pad tones. Duration = 0.4 beats each. 8 attacks per bar. |

**Tests for Subtask 2:**

```
- generate() with energy=20 produces fewer drum notes than energy=80
  (count notes where stem_instrument='drums' for each)
- generate() with energy=20 produces fewer bass notes per bar than energy=80
- generate() with dynamics=10: all velocities in range 1-60
- generate() with dynamics=90: all velocities in range 70-127
- generate() with energy=50, dynamics=50: output matches current behavior
  (run existing baseRequest which has energy=50, dynamics=50)
- generate() with energy=80, genre='Jazz': drum blocks have > 6 notes per bar
  (current Jazz drums have 5 notes per bar at mid energy)
- All existing tests pass unchanged
```

**Done when:** Energy and dynamics affect the output. Groove and swing not yet applied.

---

### Subtask 3: Swing Integration (estimated: 1-1.5 hours)

**Goal:** Apply `applySwing()` to all note times after they are generated.

**Where to apply:** Inside `generateMidiForBlock()`, after all notes are generated by the builder functions and collected into the `notes` array, apply swing as a post-processing step:

```typescript
// After all notes are generated for this block:
if (expr.swingPct !== null && expr.swingPct !== 50) {
  for (const note of notes) {
    note.time = applySwing(note.time, /* barOffset for this note's bar */, expr.swingPct);
  }
}
```

**Important detail:** The builder functions generate notes with `time` relative to bar offsets within the block (e.g., bar 0 starts at time 0, bar 1 at time 4, bar 2 at time 8). The `applySwing` function needs to know which bar a note belongs to, so it can compute the beat position within that bar.

The bar offset for a note at time `t` is: `barOffset = Math.floor(t / 4) * 4` (assuming 4 beats per bar in 4/4 time).

**Swing application in `generateMidiForBlock`:** After the per-bar loop that calls builders, process the full notes array:

```typescript
// Post-process: apply swing
const swingPct = expr.swingPct ?? 50;
if (swingPct !== 50) {
  for (const note of notes) {
    const noteBarOffset = Math.floor(note.time / 4) * 4;
    note.time = applySwing(note.time, noteBarOffset, swingPct);
  }
}
```

**Genre-aware swing default:** When `swing_pct` is `null` in the request, check `GENRE_SLIDERS[genre].swing`. If `false` (Rock, Pop), force `swingPct = 50`. Otherwise, use the value from the request (which defaults to the project store value). The `generate()` function should do this normalization before constructing `ExpressionParams`:

```typescript
const swingPct = (request.swing_pct == null || !GENRE_SLIDERS_SWING_ENABLED)
  ? 50
  : request.swing_pct;
```

Note: To access `GENRE_SLIDERS` in `midi-generator.ts`, import it from `@/lib/genre-config`. This is an existing file, not a new dependency.

**Tests for Subtask 3:**

```
- generate() with swing_pct=50, genre='Jazz': all note times match non-swung positions
- generate() with swing_pct=66, genre='Jazz':
  notes that were at time 0.5 (8th-note upbeat in bar 1) are now at ~0.66
  notes that were at time 4.5 (8th-note upbeat in bar 2) are now at ~4.66
  notes at time 0.0, 1.0, 2.0, 3.0 are unchanged (downbeats)
- generate() with swing_pct=75, genre='Jazz': upbeat 8ths shift to 0.75 of the beat
- generate() with swing_pct=66, genre='Rock': swing NOT applied — Rock has
  GENRE_SLIDERS.swing=false, so the generator forces swingPct=50 regardless
  of the passed value. Verify: note times identical to swing_pct=50 output.
- generate() with swing_pct=null, genre='Jazz': treated as 50 (straight)
```

**Done when:** Swing timing is audibly different for Jazz at 66% vs 50%. Rock always plays straight regardless of swing_pct value.

---

### Subtask 4: Groove Integration (estimated: 1-1.5 hours)

**Goal:** Apply `applyGroove()` to all note times as the final post-processing step (after swing).

**Where to apply:** Inside `generateMidiForBlock()`, after swing is applied, apply groove:

```typescript
// Post-process: apply groove (after swing)
if (expr.groove > 0) {
  const instrumentSeed = getInstrumentSeed(instrument);
  for (const note of notes) {
    if (isAnchorNote(note, instrument)) continue; // skip anchors
    const seed = Math.round(note.time * 1000) + instrumentSeed;
    note.time = applyGroove(note.time, seed, expr.groove);
  }
}
```

**Instrument seed mapping:**
```typescript
function getInstrumentSeed(instrument: string): number {
  const seeds: Record<string, number> = {
    drums: 0, bass: 1000, piano: 2000, guitar: 3000, strings: 4000,
  };
  return seeds[instrument] ?? 0;
}
```

**Anchor note detection:**
```typescript
function isAnchorNote(note: MidiNoteData, instrument: string): boolean {
  if (instrument !== 'drums') return false;
  const barOffset = Math.floor(note.time / 4) * 4;
  const beatPos = note.time - barOffset;
  // Kick on beat 1
  if (note.note === 'C2' && Math.abs(beatPos) < 0.05) return true;
  // Snare on beats 2 and 4
  if (note.note === 'D2' && (Math.abs(beatPos - 1) < 0.05 || Math.abs(beatPos - 3) < 0.05)) return true;
  return false;
}
```

**Important:** After swing has been applied, beat positions may have shifted. The anchor detection must account for this by using a tolerance of 0.05 beats (not exact equality), and by checking the note name (MIDI drum map: C2=kick, D2=snare) in combination with approximate position.

Actually, better approach: Mark anchor notes BEFORE swing is applied, then skip them during groove. Implementation: do the groove pass immediately after swing, but compute `beatPos` from the ORIGINAL time (before swing). To achieve this, store original times or check anchor status before swing:

Revised approach in `generateMidiForBlock`:
```typescript
// Identify anchors before any timing modification
const anchorIndices = new Set<number>();
for (let i = 0; i < notes.length; i++) {
  if (isAnchorNote(notes[i], instrument)) {
    anchorIndices.add(i);
  }
}

// Apply swing
if (swingPct !== 50) { ... }

// Apply groove (skip anchors)
if (expr.groove > 0) {
  const instrumentSeed = getInstrumentSeed(instrument);
  for (let i = 0; i < notes.length; i++) {
    if (anchorIndices.has(i)) continue;
    const seed = Math.round(notes[i].time * 1000) + instrumentSeed;
    notes[i].time = applyGroove(notes[i].time, seed, expr.groove);
  }
}
```

**Final validation pass:** After all timing modifications, ensure no note has `time < 0`:
```typescript
for (const note of notes) {
  if (note.time < 0) note.time = 0;
}
```

**Update `generate()` to construct ExpressionParams:**

In the `generate()` function, before the block-building loop:

```typescript
// Import GENRE_SLIDERS at the top of the file
import { GENRE_SLIDERS } from './genre-config';

// Inside generate():
const swingEnabled = GENRE_SLIDERS[request.genre]?.swing !== false;
const expr: ExpressionParams = {
  energy: request.energy,
  dynamics: request.dynamics,
  groove: request.groove,
  swingPct: (request.swing_pct == null || !swingEnabled) ? 50 : request.swing_pct,
};
```

Then pass `expr` to `generateMidiForBlock()`.

**Tests for Subtask 4:**

```
- generate() with groove=0: note times have no offset from expected positions
- generate() with groove=50: note times differ from groove=0 by small amounts (<= 0.03)
- generate() with groove=100: note times differ from groove=0 by up to 0.06
- generate() with groove=50 called twice with identical input: produces identical output
  (deterministic — this is the most important test)
- Drum kick on beat 1 (note='C2', time near 0.0) is unchanged at any groove level
- Drum snare on beat 2 (note='D2', time near 1.0) is unchanged at any groove level
- Bass note on beat 1 is shifted at groove=50 (bass is not drums, not an anchor)
- generate() with energy=50, dynamics=50, groove=0, swing_pct=50:
  output is identical to current default behavior (AC-6 regression test)
```

**Done when:** All four parameters affect output. All tests pass. The full integration works end-to-end.

---

## Primitive 5: Evaluation Design

### Test Cases with Known-Good Outputs

**Test 1: Ballad (low everything)**
```
Input:  energy=20, dynamics=20, groove=30, swing_pct=50, genre='Jazz', key='C'
        4 bars, chords: Imaj7 | iimin7 | Vdom7 | Imaj7
Verify:
  - Drums: <= 3 notes per bar (kick+ride only, no hats)
  - Bass: 1 note per bar (whole note root)
  - Piano: 1 chord voicing per bar
  - All velocities in range 1-55
  - No swing offset (swing_pct=50)
  - Small groove offsets on non-anchor notes
```

**Test 2: Uptempo swing (high energy Jazz)**
```
Input:  energy=85, dynamics=70, groove=40, swing_pct=66, genre='Jazz', key='Bb'
        4 bars, chords: Imaj7 | vim7 | iidom7 | Vdom7
Verify:
  - Drums: >= 8 notes per bar (ride 8ths, snare + ghosts, kick)
  - Bass: >= 6 notes per bar (walking + chromatic fills)
  - Piano: >= 4 attacks per bar
  - Velocities in range 65-100
  - Upbeat 8th notes shifted to ~0.66 of beat
  - Downbeat notes at exact positions (within groove tolerance)
```

**Test 3: Straight rock (no swing)**
```
Input:  energy=60, dynamics=60, groove=20, swing_pct=66, genre='Rock', key='E'
        4 bars, chords: I | IV | V | I
Verify:
  - Swing NOT applied (Rock has swing=false, forced to 50)
  - All 8th-note positions at exact 0.5 offsets
  - Drums: standard rock pattern (kick 1/3, snare 2/4, 8th hats)
  - Velocities in range 55-90
```

**Test 4: Funk with full expression**
```
Input:  energy=75, dynamics=55, groove=60, swing_pct=55, genre='Funk', key='D'
        4 bars, chords: imin7 | IVdom7 | imin7 | Vdom7
Verify:
  - Guitar: >= 6 chord attacks per bar (16th-note chops)
  - Bass: 4 notes per bar with fills
  - Groove offsets present (up to +/-0.036 beats at groove=60)
  - Kick on beat 1 is NOT groove-shifted
  - Slight swing on upbeat 8ths (swing_pct=55 -> ratio 0.55, subtle shift)
```

**Test 5: Backward compatibility (regression)**
```
Input:  energy=50, dynamics=50, groove=0, swing_pct=50, genre='Jazz', key='C'
        Same as existing baseRequest in test file (but with groove=0, swing_pct=50)
Verify:
  - Output note count per block matches pre-change output
  - All note positions match within 0.001 tolerance
  - All velocities match within 1 (rounding tolerance from scaleVelocity at dynamics=50)
```

Note on test 5: The existing `baseRequest` uses `groove: 50, swing_pct: 65`. Since the current code ignores these values, the existing tests will continue to pass regardless. But for the explicit backward-compatibility test, use `groove: 0, swing_pct: 50` (which produce no timing changes) and verify the output matches the current (pre-change) output structurally.

### Intent Trace

**Structural trace:** The user moves the Energy slider from 50 to 80.
1. `StyleControlsSection.tsx` calls `updateProject({ energy: 80 })` (already works)
2. `useGenerate.ts` reads `project.energy` into `request.energy` (already works, line 41)
3. `generate()` in `midi-generator.ts` reads `request.energy` into `expr.energy` (Subtask 4 wires this)
4. `generateMidiForBlock()` passes `expr` to `buildDrumBar()` et al. (Subtask 2)
5. `buildRockDrumBar(barOffset, expr)` checks `expr.energy >= 66` and emits extra ghost notes (Subtask 2)
6. Extra notes appear in `block.midi_data` in the `GenerationResponse`
7. Audio engine plays more notes -> user hears a busier drum pattern

Every link in this chain either already exists (steps 1-2, 6-7) or is created by a specific subtask (steps 3-5).

**Behavioral trace:** End-to-end demo scenarios:

1. **"The ballad test":** User creates a Jazz project. Sets Energy=15, Dynamics=15, Groove=30, Swing=65%. Generates. Listens. Hears: sparse drums (just ride + kick), single bass notes per bar, quiet piano pads, gentle swing feel. Moves Energy to 85 and regenerates. Hears: busy ride cymbal, walking bass with fills, rhythmic piano comping, the same swing feel but with more notes. The dynamics stayed low, so it's busy but still quiet.

2. **"The Rock vs Jazz swing test":** User creates a Rock project. Swing slider is hidden (GENRE_SLIDERS.Rock.swing=false). Generates. All 8th notes are straight. Changes genre to Jazz. Swing slider appears. Sets Swing=66%. Regenerates. Upbeat 8th notes now have triplet feel. Changes back to Rock (swing slider hides). Regenerates. 8th notes are straight again even though the stored swing_pct value is still 66.

3. **"The groove A/B test":** User sets Groove=0. Generates. Notes are perfectly quantized (robot feel). Sets Groove=70. Regenerates. Drum ghost notes and piano comps have slight timing variations. Kick on 1 and snare on 2/4 are still locked. The result sounds more human without being sloppy.

---

## Implementation Checklist

For the implementing agent — verify each item before declaring done:

- [ ] `ExpressionParams` interface defined in midi-generator.ts
- [ ] `scaleVelocity()`, `applySwing()`, `applyGroove()`, `clampVelocity()` implemented
- [ ] `getInstrumentSeed()` and `isAnchorNote()` helper functions implemented
- [ ] All 8 builder functions accept `ExpressionParams` parameter
- [ ] Energy tiers implemented for drums (3 builders), bass, piano, guitar, strings
- [ ] All hardcoded velocity values wrapped in `scaleVelocity(base, expr.dynamics)`
- [ ] Swing post-processing applied in `generateMidiForBlock()`
- [ ] Groove post-processing applied in `generateMidiForBlock()` (after swing)
- [ ] Anchor notes skip groove
- [ ] `generate()` constructs `ExpressionParams` from request (with genre-aware swing default)
- [ ] `GENRE_SLIDERS` imported from `genre-config.ts`
- [ ] All new utility functions have dedicated unit tests
- [ ] All 5 evaluation test cases implemented
- [ ] All existing tests pass without modification
- [ ] `npm run build` passes
- [ ] No `Math.random()` anywhere in the file
