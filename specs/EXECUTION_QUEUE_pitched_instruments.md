# Execution Queue — Pitched Instrument Pattern Upgrade

**For coding agents:** Read the protocol below, then find the first unchecked
task, execute it completely, check the box, commit, and move to the next.
Do not skip tasks. Do not work on more than one task at a time.

---

## Agent Protocol

1. Read this file top to bottom.
2. Find the first task where the checkbox is `[ ]` (unchecked).
3. Read that task's full spec — it is self-contained. You do not need to read
   any other plan document.
4. Implement exactly as specified. Do not modify files not listed in the task.
   Do not refactor adjacent code.
5. Run both checks in the task's **Verify** section:
   - **Compilation:** must pass before proceeding
   - **Behavioral:** must be manually confirmed or tested; do not skip
5b. Run the full test suite: `PATH="/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH" npm run build`
    If tests you did not introduce are now failing, **stop and report** which
    tests broke and why before touching the checkbox.
6. Edit this file: change `[ ]` to `[x]` on that task's line.
7. Commit all changes (code + this file) together with message: `PitchedUpgrade-T{n}: {title}`
8. Return to step 2.

9. When no unchecked tasks remain, perform the **Completion Check** and
   **Intent Trace** sections:
   - Run the full test suite one final time.
   - For each structural intent trace claim (`- [ ]`), read the referenced
     code and confirm it does what the claim says. Check the box.
   - For each behavioral demo step, execute it and confirm the expected
     outcome. Check the box.
   - Commit the checked intent trace with message: `intent-trace: verified`
   - Only then is the queue complete. Proceed to the **Archive** section.

If a task says **BLOCKED**, skip it and move to the next unblocked one.
If all remaining tasks are **BLOCKED** or done, stop and report.

---

## Context

**Already implemented (do not re-implement):**

- Drum pattern system with per-genre pattern libraries, expression pipeline,
  bar variation via knuthHash — `src/lib/drum-patterns.ts` (1027 lines)
- MIDI generator with `generateMidiForBlock()` orchestrating all instruments —
  `src/lib/midi-generator.ts`
- `GENRE_STYLES` mapping in midi-generator.ts (find the `GENRE_STYLES` object)
  assigning style names per genre per instrument — computed but **not wired** to
  pitched generation
- Helper functions: `getChordTones()` and `noteToMidi()` in
  `src/lib/midi-generator.ts` (NOT exported yet — T1 adds `export`).
  `degreeToNote()` in `src/lib/chords.ts` (already exported).
- `knuthHash()` for deterministic variation — `src/lib/drum-patterns.ts`
  (already exported)
- `MidiNoteData` type — `src/types/index.ts`

**Key facts the agent needs:**

- Chords are stored as Roman numeral degrees (I, IV, V, etc.) with quality
  (major, minor, dom7, etc.). The `getChordTones(degree, quality, key, octave)`
  function resolves these to actual MIDI note names at runtime.
- Bars are 4 beats. Beat 0 = downbeat. Notes use beat-offset timing (0.0 to 3.99).
- `barOffset` passed to builders = `barIndex * 4` (the beat position within the
  block where this bar starts).
- Each bar gets one chord from the chord progression.
- The `style` field from `getStyle(instrument, genre)` returns strings like
  `'walking'`, `'slap'`, `'jazz_comp'`, `'power_chords'` etc. These are the
  keys that pattern lookup functions should match on.
- 9 genres: Jazz, Blues, Rock, Funk, Latin, Country, Gospel, R&B, Pop.

---

## Delegation Strategy

**5 tasks, single agent, sequential execution.**

Tasks 1-4 create new files (no overlap). Task 5 modifies the existing
midi-generator.ts to wire everything together — it must run last.

**File overlap map:**

| Source file | Edited by tasks |
|---|---|
| `src/lib/bass-patterns.ts` (new) | T1 |
| `src/lib/piano-patterns.ts` (new) | T2 |
| `src/lib/guitar-patterns.ts` (new) | T3 |
| `src/lib/strings-patterns.ts` (new) | T4 |
| `src/lib/midi-generator.ts` | T1 (export only), T5 (wiring) |

**Batch assignments:**

| Batch | Tasks | Mode | Agent prompt |
|---|---|---|---|
| 1 | T1-T5 | sequential | "Read and execute specs/EXECUTION_QUEUE_pitched_instruments.md" (includes Completion Check + Intent Trace) |

---

## Task Queue

---

### [x] T1 — Bass pattern library

**Files:** `src/lib/bass-patterns.ts` (new), `src/lib/bass-patterns.test.ts` (new), `src/lib/midi-generator.ts` (add `export` to 2 functions only)
**Depends on:** none
**Tests:** `src/lib/bass-patterns.test.ts`

**Background:**

The current `buildBassNotes()` in midi-generator.ts has two branches: Jazz/Blues
gets a 4-note "walking" pattern, everything else gets boring root half-notes.
The `GENRE_STYLES` mapping assigns style names (`walking`, `slap`, `pick`,
`fingerstyle`) per genre but they're never used for generation.

**What to build:**

**Step 1 — Export helpers from midi-generator.ts.**

Read `src/lib/midi-generator.ts`. Find the functions `getChordTones` and
`noteToMidi` (they are NOT currently exported). Add the `export` keyword to both.
Do NOT modify anything else in the file. Confirm `degreeToNote` is exported from
`src/lib/chords.ts` and `knuthHash` is exported from `src/lib/drum-patterns.ts`.

**Step 2 — Create `src/lib/bass-patterns.ts`.**

Define the pattern interfaces:

```typescript
export interface BassNote {
  degree: number        // Interval from root: 0=root, 2=3rd, 4=5th, 7=octave
  time: number          // Beat offset within bar (0-3.99)
  duration: number      // In beats
  velocity: number      // 0-127
  chromatic?: number    // If set, semitone offset from root (for approach notes)
}

export interface BassPattern {
  id: string
  style: string
  bars: BassNote[][]    // 2+ bar variations
}
```

Create patterns for each style:

**`walking`** (Jazz, Latin) — Quarter-note walking bass:
- Bar A: root(beat 0) → 3rd(beat 1) → 5th(beat 2) → chromatic approach -1(beat 3)
- Bar B: root(beat 0) → 5th(beat 1) → 3rd(beat 2) → chromatic approach +1(beat 3)
- Velocities: 85, 75, 80, 70

**`slap`** (Funk) — Syncopated octave pops:
- Bar A: root(0, vel 90) → ghost root(0.75, vel 40, dur 0.1) → octave(1.5, vel 85) → rest → root(3, vel 80)
- Bar B: root(0, vel 90) → octave(1, vel 85) → ghost(1.75, vel 40) → root(2.5, vel 80) → octave(3.5, vel 75)
- Short durations (0.3-0.5) for percussive feel

**`pick`** (Rock, Pop) — Driving 8th notes:
- Bar A: root(0) → root(0.5) → 5th(1) → 5th(1.5) → root(2) → root(2.5) → 5th(3) → 5th(3.5)
- Bar B: root(0) → root(0.5) → 5th(1) → root(1.5) → 5th(2) → root(2.5) → 5th(3) → root(3.5)
- Velocities alternate: 85 on downbeats, 70 on upbeats

**`fingerstyle`** (Blues, Country, Gospel, R&B) — Alternating bass:
- Bar A: root(0, vel 85) → 5th(1, vel 70) → root(2, vel 80) → 5th(3, vel 70)
- Bar B: root(0, vel 85) → 3rd(1, vel 70) → root(2, vel 80) → 5th(3, vel 70)

**Step 3 — Create lookup and builder functions.**

```typescript
export function getBassPattern(style: string): BassPattern
// Returns pattern matching style, falls back to 'fingerstyle' if unknown

export function buildBassFromPattern(
  pattern: BassPattern,
  chord: { degree: string | null; quality: string | null },
  key: string,
  barNumber: number,     // Global bar number (1-based) for knuthHash variation
  barOffset: number,     // Beat offset (barIndex * 4)
  octave?: number        // Default 2 for bass
): MidiNoteData[]
```

The builder must:
1. Select bar variation using `knuthHash(barNumber, 42) % pattern.bars.length`
2. For each BassNote in the selected bar:
   - If `chromatic` is set: compute root MIDI note + chromatic semitones
   - Otherwise: use `getChordTones(degree, quality, key, octave)` and pick
     the note at the degree index (0=root, 1=3rd, 2=5th)
   - Set time = `barOffset + note.time`
3. Return `MidiNoteData[]`

Import `getChordTones` and `noteToMidi` from `./midi-generator` (exported in Step 1).
Import `degreeToNote` from `./chords`. Import `knuthHash` from `./drum-patterns`.

**Step 4 — Write unit tests** in `src/lib/bass-patterns.test.ts`:
- `getBassPattern('walking')` returns a pattern with 2 bars
- `getBassPattern('unknown')` falls back to fingerstyle
- `buildBassFromPattern()` with walking style, C major chord, bar 1 returns 4 notes
- `buildBassFromPattern()` with slap style returns notes with short durations (< 0.5)
- Two different barNumbers produce different bar selections

**Verify:**

Compilation:
```
PATH="/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH" npm run build
```

Behavioral (unit-level — live system verification deferred to T5 + Intent Trace):
```
PATH="/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH" npx vitest run src/lib/bass-patterns.test.ts
```
All tests pass. Walking pattern produces 4 notes per bar. Slap pattern produces
5+ notes per bar with short durations.

---

### [x] T2 — Piano pattern library

**Files:** `src/lib/piano-patterns.ts` (new), `src/lib/piano-patterns.test.ts` (new)
**Depends on:** T1 (for exported helpers in midi-generator.ts)
**Tests:** `src/lib/piano-patterns.test.ts`

**Background:**

Same as bass — `buildPianoNotes()` has Jazz (off-beat) and default (block chords).
This task creates genre-aware patterns with proper voicings.

**What to build:**

**Step 1 — Read midi-generator.ts** to understand `getChordTones()` and how
the current `buildPianoNotes()` function works.

**Step 2 — Create `src/lib/piano-patterns.ts`.**

```typescript
export interface PianoNote {
  degrees: number[]     // Multiple degrees = chord voicing (e.g. [2, 6] = 3rd + 7th)
  time: number
  duration: number
  velocity: number
}

export interface PianoPattern {
  id: string
  style: string
  bars: PianoNote[][]
}
```

Patterns:

**`jazz_comp`** (Jazz, Funk, R&B) — Shell voicings, off-beat:
- Bar A: [3rd,7th](beat 1.5, vel 70, dur 0.8) → [3rd,7th](beat 3, vel 65, dur 0.8)
- Bar B: [3rd,7th](beat 0.5, vel 65, dur 0.8) → [3rd,7th](beat 2.5, vel 70, dur 0.8)
- Uses degrees [2, 6] (3rd and 7th) — NO root (bass has it).
  For dominant 7th chords, use [2, 5] (3rd and b7th).

**`block_chords`** (Blues, Rock, Country, Gospel, Pop) — Full voicings:
- Bar A: [root,3rd,5th](beat 0, vel 78, dur 1.8) → [root,3rd,5th](beat 2, vel 72, dur 1.8)
- Bar B: [root,3rd,5th](beat 1, vel 72, dur 1.8) → [root,3rd,5th](beat 3, vel 68, dur 0.9)
- Uses degrees [0, 2, 4] (full triad)

**`arpeggiated`** (Latin) — Rolling chord tones:
- Bar A: root(0) → 3rd(0.5) → 5th(1) → octave(1.5) → 5th(2) → 3rd(2.5) → root(3) → 3rd(3.5)
- Duration 0.4 each, velocity 65-70
- Uses sequential single degrees, not chords

**Step 3 — Create lookup and builder.**

```typescript
export function getPianoPattern(style: string): PianoPattern
export function buildPianoFromPattern(
  pattern: PianoPattern,
  chord: { degree: string | null; quality: string | null },
  key: string,
  barNumber: number,
  barOffset: number,
  octave?: number        // Default 4 for piano
): MidiNoteData[]
```

The builder must handle `degrees` arrays — for each PianoNote, emit one
MidiNoteData per degree (stacked chord = multiple notes at same time).

**Step 4 — Unit tests:**
- jazz_comp produces exactly 2 voicings per bar, each with 2 notes (shell voicing)
- block_chords produces 2 voicings per bar, each with 3 notes (full triad)
- arpeggiated produces 8 sequential single notes per bar
- Two barNumbers produce different patterns

**Verify:**

Compilation:
```
PATH="/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH" npm run build
```

Behavioral (unit-level — live system verification deferred to T5 + Intent Trace):
```
PATH="/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH" npx vitest run src/lib/piano-patterns.test.ts
```
Jazz comp: 2 voicings × 2 notes = 4 MidiNoteData per bar.
Block chords: 2 voicings × 3 notes = 6 MidiNoteData per bar.

---

### [ ] T3 — Guitar pattern library

**Files:** `src/lib/guitar-patterns.ts` (new), `src/lib/guitar-patterns.test.ts` (new)
**Depends on:** T1 (for exported helpers in midi-generator.ts)
**Tests:** `src/lib/guitar-patterns.test.ts`

**Background:**

Guitar currently has Funk (upbeat chops), Jazz (arpeggio), and default (4-beat strum).
This task creates genre-specific patterns.

**What to build:**

**Step 1 — Read midi-generator.ts** to understand the current `buildGuitarNotes()` function.

**Step 2 — Create `src/lib/guitar-patterns.ts`.**

Same interface style as piano (degrees array for strums, single degree for picks).

Patterns:

**`power_chords`** (Rock) — Root + 5th only, driving 8ths:
- Bar A: [root,5th](0, vel 85, dur 0.4) → [root,5th](0.5, vel 70, dur 0.4) → [root,5th](1, vel 80, dur 0.4) → [root,5th](1.5, vel 65, dur 0.4) → [root,5th](2, vel 85, dur 0.4) → [root,5th](2.5, vel 70, dur 0.4) → [root,5th](3, vel 80, dur 0.4) → [root,5th](3.5, vel 65, dur 0.4)
- Bar B: same rhythm, accent beats 1 and 3 harder (vel 90)

**`fingerpick_arpeggios`** (Jazz, Latin, Country) — p-i-m-a cycling:
- Bar A: root(0) → 3rd(0.5) → 5th(1) → octave(1.5) → 5th(2) → 3rd(2.5) → root(3) → 5th(3.5)
- Bar B: root(0) → 5th(0.5) → 3rd(1) → octave(1.5) → 3rd(2) → root(2.5) → 5th(3) → 3rd(3.5)
- Duration 0.4, velocity 60-70 (soft fingerpicking)

**`rhythm_strum`** (Blues, Gospel, Pop, R&B) — Down/up strum pattern:
- Bar A: [root,3rd,5th](0, vel 80, dur 0.8) → [root,3rd,5th](1, vel 60, dur 0.3) → [root,3rd,5th](2, vel 75, dur 0.8) → [root,3rd,5th](3, vel 55, dur 0.3)
- Bar B: [root,3rd,5th](0, vel 80, dur 0.8) → [3rd,5th](1.5, vel 55, dur 0.3) → [root,3rd,5th](2, vel 75, dur 0.8) → [root,3rd,5th](3.5, vel 50, dur 0.3)
- Downstrums louder + longer, upstrums softer + shorter

**`muted_funk`** (Funk) — 16th-note percussive scratches:
- Bar A: [root](0.5, vel 65, dur 0.1) → [root](1, vel 55, dur 0.1) → [root](1.5, vel 65, dur 0.1) → [root](2.5, vel 55, dur 0.1) → [root](3, vel 65, dur 0.1) → [root](3.5, vel 60, dur 0.1)
- Bar B: vary which 16ths are hit
- Very short durations (0.1) = percussive, muted feel

**Step 3 — Lookup + builder, same pattern as bass/piano.**

**Step 4 — Unit tests:**
- power_chords: each note event has exactly 2 notes (root + 5th)
- fingerpick: 8 sequential single notes per bar
- rhythm_strum: downbeats louder than upbeats
- muted_funk: all durations ≤ 0.15

**Verify:**

Compilation:
```
PATH="/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH" npm run build
```

Behavioral (unit-level — live system verification deferred to T5 + Intent Trace):
```
PATH="/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH" npx vitest run src/lib/guitar-patterns.test.ts
```
Power chords produce 2-note events. Muted funk durations are all ≤ 0.15.

---

### [ ] T4 — Strings pattern library

**Files:** `src/lib/strings-patterns.ts` (new), `src/lib/strings-patterns.test.ts` (new)
**Depends on:** T1 (for exported helpers in midi-generator.ts)
**Tests:** `src/lib/strings-patterns.test.ts`

**Background:**

Strings currently play a whole-note root+3rd pad with zero variation. This is the
simplest upgrade — just add a tremolo option and proper chord voicing.

**What to build:**

**Step 1 — Read midi-generator.ts** to understand the current `buildStringsNotes()` function.

**Step 2 — Create `src/lib/strings-patterns.ts`.**

Two patterns only:

**`sustained_pad`** — Soft, full-bar hold (default):
- Bar A: [root, 3rd, 5th](beat 0, vel 55, dur 3.9)
- One bar, no variation needed

**`tremolo`** — Re-attacked 8th notes for energy:
- Bar A: [root, 3rd](beat 0, vel 55, dur 0.45) repeated 8 times at beats 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5
- Velocity alternates: 55, 45, 55, 45... (slight accent on downbeats)

**Step 3 — Builder selects pattern based on an `energy` parameter:**
- energy ≤ 70 → sustained_pad
- energy > 70 → tremolo

```typescript
export function buildStringsFromPattern(
  chord: { degree: string | null; quality: string | null },
  key: string,
  barNumber: number,
  barOffset: number,
  energy: number,         // 0-100, determines pad vs tremolo
  octave?: number         // Default 4
): MidiNoteData[]
```

**Step 4 — Unit tests:**
- energy=50 produces 3 notes (root+3rd+5th, one event) with long duration
- energy=80 produces 16 notes (2 notes × 8 attacks)
- Tremolo durations are all < 0.5

**Verify:**

Compilation:
```
PATH="/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH" npm run build
```

Behavioral (unit-level — live system verification deferred to T5 + Intent Trace):
```
PATH="/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH" npx vitest run src/lib/strings-patterns.test.ts
```
Sustained pad: 3 notes, duration > 3.5. Tremolo: 16 notes, durations < 0.5.

---

### [ ] T5 — Wire patterns into generateMidiForBlock()

**Files:** `src/lib/midi-generator.ts` (modify)
**Depends on:** T1, T2, T3, T4
**Tests:** existing tests in `src/lib/midi-generator.test.ts`

**Background:**

`generateMidiForBlock()` currently calls inline `buildBassNotes()`,
`buildPianoNotes()`, `buildGuitarNotes()`, `buildStringsNotes()`. This task
replaces those calls with the new pattern-based generators.

**What to build:**

**Step 1 — Read midi-generator.ts** to confirm the current structure matches
expectations. Find `generateMidiForBlock()` and the four inline builder functions.

**Step 2 — Add imports at the top:**
```typescript
import { getBassPattern, buildBassFromPattern } from './bass-patterns'
import { getPianoPattern, buildPianoFromPattern } from './piano-patterns'
import { getGuitarPattern, buildGuitarFromPattern } from './guitar-patterns'
import { buildStringsFromPattern } from './strings-patterns'
```

**Step 3 — Verify helper exports.** Confirm that `getChordTones` and `noteToMidi`
are exported (T1 added these). If somehow missing, add `export` now.

**Step 4 — Replace instrument cases** in `generateMidiForBlock()`.

In the per-bar loop (where `chord` is resolved per bar), replace each case:

```typescript
case 'bass': {
  const style = getStyle('bass', genre)
  const pattern = getBassPattern(style)
  notes.push(...buildBassFromPattern(pattern, chord, key, barNumberGlobal, barOffset))
  break
}
case 'piano': {
  const style = getStyle('piano', genre)
  const pattern = getPianoPattern(style)
  notes.push(...buildPianoFromPattern(pattern, chord, key, barNumberGlobal, barOffset))
  break
}
case 'guitar': {
  const style = getStyle('guitar', genre)
  const pattern = getGuitarPattern(style)
  notes.push(...buildGuitarFromPattern(pattern, chord, key, barNumberGlobal, barOffset))
  break
}
case 'strings': {
  const energy = drumContext?.energy ?? 50
  notes.push(...buildStringsFromPattern(chord, key, barNumberGlobal, barOffset, energy))
  break
}
```

Note: `barNumberGlobal` may need to be computed. If `drumContext` is available it
has `barNumberGlobal`. For non-drum instruments, compute it from block startBar +
barIndex.

**Step 5 — Remove the old inline functions** (`buildBassNotes`, `buildPianoNotes`,
`buildGuitarNotes`, `buildStringsNotes`). They are not exported or used elsewhere.
Verify with grep before deleting.

**Step 6 — Run existing tests** to ensure nothing broke:
```
npx vitest run src/lib/midi-generator.test.ts
```

**Verify:**

Compilation:
```
PATH="/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH" npm run build
```

Behavioral:
```
Run the app (npm run dev). Generate a Jazz arrangement. Press Play.
- Bass should play walking quarter notes (not half-note roots)
- Piano should play off-beat shell voicings (not block chords on 1+3)
- Guitar should arpeggiate (not strum on every beat)

Generate a Rock arrangement. Press Play.
- Bass should play driving 8th notes (not half-note roots)
- Piano should play block chords (not off-beat)
- Guitar should play power chords (root+5th, driving feel)

Both should sound distinctly different from each other.
```

---

## Completion Check

When all boxes are checked, run the full suite one final time:

```
PATH="/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH" npm run build && npx vitest run
```

All tests must pass. Then perform the fresh eyes review:

**Fresh eyes review (one pass only).** Re-read every file you modified with
fresh eyes. Look for: pitch calculation errors (wrong octave, wrong interval),
missing null checks on chord degree, import cycles between pattern files and
midi-generator.ts, notes with time > 4.0 (outside bar bounds).

**Smoke test:**
1. Open the app at localhost:5173. Navigate to a project.
2. Generate a Jazz arrangement. Press Play. Listen for walking bass + off-beat
   piano comping + fingerpicked guitar arpeggios.
3. Change genre to Funk. Regenerate. Listen for slap bass + muted guitar chops.
4. Change genre to Rock. Regenerate. Listen for driving bass + power chord guitar.

## Intent Trace

**Original intent:** Each genre should produce a distinctly different-sounding
arrangement for the same chord progression, with musically appropriate patterns
for all 4 pitched instruments.

### Structural (code wiring)

- [ ] Genre → style mapping → pattern selection: `midi-generator.ts:getStyle()` → `bass-patterns.ts:getBassPattern()` (and same for piano, guitar)
- [ ] Pattern → actual notes: `buildBassFromPattern()` uses `getChordTones()` to resolve degrees to MIDI pitches
- [ ] Bar variation: `knuthHash(barNumber, seed) % pattern.bars.length` selects different bars deterministically
- [ ] Strings energy threshold: `buildStringsFromPattern()` switches from pad to tremolo at energy > 70

### Behavioral (end-to-end demo)

Run the app (`npm run dev`), open it in the browser, navigate to a project.

- [ ] Step: Set genre to Jazz, key to C. Generate. Open browser DevTools console.
  Run: `JSON.stringify(window.__projectStore?.getState().blocks.filter(b => b.stemId && b.midiData).slice(0,1).map(b => ({inst: b.instrument, noteCount: b.midiData?.length})))`
  Expect (audible): Walking quarter notes in the bass — 4 distinct pitches per bar, NOT half-note roots.
  Expect (inspectable): Bass block has 4 MidiNoteData entries per bar (not 2). Piano block has 4 entries per bar (2 shell voicings × 2 notes each, not 6 block chord notes).

- [ ] Step: Change genre to Rock, regenerate. Listen again.
  Expect (audible): Bass plays driving 8th notes. Piano plays block chords on 1+3. Guitar plays chunky power chords.
  Expect (inspectable): Bass block now has 8 MidiNoteData entries per bar (8th notes). Guitar block entries each have 2 simultaneous notes (root+5th only).

- [ ] Step: Change genre to Funk, regenerate. Listen to guitar specifically.
  Expect (audible): Short, percussive muted scratches on upbeats — NOT sustained strums.
  Expect (inspectable): Guitar block MidiNoteData entries have duration ≤ 0.15 beats (muted funk). Bass entries include notes with velocity < 50 (ghost notes).

Pitched Instrument Upgrade is complete when all tests pass AND both intent trace checks pass.

## Archive

When complete:
```bash
mkdir -p specs/historical
mv specs/EXECUTION_QUEUE_pitched_instruments.md specs/historical/
git add -A specs/ && git commit -m "chore: archive completed execution queue pitched_instruments"
```
