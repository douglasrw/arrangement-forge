> **ARCHIVED — FULLY IMPLEMENTED (2026-03-04)**
> All files and functions proposed in this spec already exist in the codebase.
> Implementation was done across the Salamander drum samples and groove/complexity work.

---

# Phase 1: Synthesized Drum Kit + Comprehensive Pattern Library

**Status:** READY TO IMPLEMENT
**Date:** 2026-03-03
**Estimated effort:** 4-6 days (7 subtasks, each under 2 hours)
**Dependencies:** None (modifies existing files only; no new npm packages)
**Prerequisite reading:** ARCHITECTURE.md, CLAUDE.md, this spec

---

## Problem Statement

The current drum system produces robotic, unconvincing output that undermines the core product promise of "professional backing tracks." Three specific failures:

1. **Only 4 sounds** (kick, snare, closed hihat, ride) loaded from tiny MP3 files (21.6 KB total). Missing: open hihat, crash cymbal, side stick, toms, ride bell, pedal hihat. No open hihat means no groove. No crash means no section transitions. No toms means no fills.

2. **Only 3 patterns** for 9 genres. Country, Latin, Gospel, Pop, and Blues all play wrong patterns. Jazz has no swing timing. No pattern uses ghost notes, fills, crashes, or dynamic variation. Every bar in the song is identical.

3. **Expression parameters are ignored.** The `energy`, `dynamics`, `swing_pct`, and `groove` values from `GenerationRequest` pass through the system untouched. Adjusting sliders changes nothing in drum output.

The result sounds like a metronome with slightly different timbres, not a drum kit.

---

## Intent Trace

### Structural Trace

Map from each problem statement claim to the function/file that fixes it:

| Problem | Fix Location |
|---------|-------------|
| "Only 4 sounds" | `DrumKit` class in `src/audio/drum-kit.ts` (11 voices via Tone.js synths) |
| "Only 3 patterns" | `src/lib/drum-patterns.ts` (9 genre patterns + variations + fills) |
| "Expression params ignored" | `applyEnergy()`, `applyDynamics()`, `applySwing()`, `applyGroove()` in `src/lib/drum-patterns.ts` |
| "No fills" | Fill library + section-boundary detection in `generate()` refactor in `src/lib/midi-generator.ts` |
| "No variation" | Bar-number-based deterministic variation via `knuthHash()` in `src/lib/drum-patterns.ts` |

### Behavioral Trace (End-to-End Scenarios)

1. **Jazz at varying energy:** Create a Jazz project at energy=30, generate, play. Hear ride cymbal + brush-like snare + sparse kick. Switch to energy=80, re-generate. Hear denser ride patterns, added hi-hat, busier kick.

2. **Section transitions in Rock:** Create a Rock project, generate 3 sections (Intro, Verse, Chorus). Hear crash cymbal at each section start (except Intro). Hear a fill in the last bar of Intro before Verse starts.

3. **Swing feel:** Set swing to 67 on a Jazz project. Re-generate. Upbeat 8th notes audibly shift to triplet feel.

---

## Solution

Replace the sample-based drum playback with Tone.js synthesized drums (zero network requests, full parameter control), and replace the 3 hardcoded patterns with a comprehensive genre-specific pattern library that responds to all expression parameters.

---

## Acceptance Criteria

All criteria are independently verifiable.

1. **Kit completeness:** At least 11 distinct drum voices are playable: kick, snare, side stick, closed hihat, open hihat, pedal hihat, ride cymbal, ride bell, crash cymbal, low tom, high tom.
2. **Genre coverage — structural tests:** Each of the 9 genres (Jazz, Blues, Rock, Funk, Country, Gospel, R&B, Latin, Pop) produces a structurally distinct groove, verified by measurable properties:
   - **Jazz:** Ride cymbal (D#3) is the primary timekeeping instrument (most hits), not hi-hat
   - **Rock:** Hi-hat 8th notes (F#2) with kick on beats 1 and 3
   - **Funk:** 16th-note hi-hats with ghost snare notes (velocity < 40)
   - **Latin:** Includes side stick (C#2) or clave pattern
   - **Country:** Uses cross-stick/side stick (C#2) on beats 2 and 4 instead of full snare
   - **Blues:** Shuffle feel with ride or hi-hat as timekeeping, kick on 1 and 3, snare on 2 and 4
   - **Gospel:** Driving 8th-note hi-hat with strong backbeat (snare on 2 and 4)
   - **R&B:** 16th-note hi-hat with ghost notes (velocity < 40)
   - **Pop:** 4-on-the-floor kick (kick on every beat), snare on 2 and 4
3. **No two consecutive bars identical:** Given the same genre and energy, bar N and bar N+1 must differ in at least one note's velocity, timing, or presence (probabilistic ghost notes count).
4. **Fills at section boundaries:** The last bar of every section (except the final section) contains a fill pattern instead of the main groove.
5. **Crash on section starts:** The first beat of every section (except Intro) includes a crash cymbal hit.
6. **Energy affects density:** At energy=20, drum patterns use fewer hits and lower velocities than at energy=80. Specifically: low energy (0-33) uses quarter-note or 8th-note hat patterns; medium energy (34-66) uses 8th-note patterns with ghost notes; high energy (67-100) uses 16th-note patterns with open hats and additional kick syncopation.
7. **Swing timing works:** When `swing_pct` is non-null, upbeat notes shift later in time proportional to the swing value. At swing_pct=67, the timing matches triplet swing. Conversion: `const swingAmount = swingPct !== null ? swingPct / 100 : 0.5;`
8. **Dynamics affect velocity range:** At dynamics=20, the velocity range is narrow (60-90). At dynamics=80, the range is wide (25-110), with louder accents and softer ghost notes.
9. **Groove parameter adds humanization:** When groove > 0, note timings have deterministic micro-offsets (jitter) that make the pattern feel less quantized. The jitter is deterministic (same bar number produces same offsets) so playback is reproducible.
10. **Time signature support:** Patterns adapt to 4/4, 3/4, 6/8, and 2/4. A 3/4 pattern plays 3 beats per bar, not 4.
11. **Existing MIDI notes still play:** All note names used by existing saved projects (C2, D2, F#2, D#3) continue to produce sound. No regression in playback of previously generated arrangements.
12. **Zero network requests for drums:** The synthesized drum kit loads instantly with no external file fetches.
13. **All existing tests pass:** `npm run build` succeeds and any existing Vitest tests pass.
14. **Section context passed to drum builder:** The `generate()` function passes section context (sectionType, sectionIndex, isLastSection, totalBarsInSection) to the drum builder, enabling section-boundary fills and section-start crashes.

---

## Constraints

### Musts

- Must use Tone.js synths already bundled (MembraneSynth, NoiseSynth, MetalSynth) -- no new npm dependencies
- Must produce the same `MidiNoteData[]` output format (`{ note, time, duration, velocity }`) so engine.ts scheduling works unchanged
- Must use General MIDI note names (C2=kick, D2=snare, F#2=closed HH, etc.) for backward compatibility
- Must keep the drum kit instance out of Zustand stores (module-scoped or managed by sampler-cache.ts)
- Must use deterministic randomness (seeded from bar number) so playback is reproducible
- Must colocate test files next to source files (e.g., `drum-patterns.test.ts` next to `drum-patterns.ts`)

### Must-Nots

- Must not add any npm dependencies not in ARCHITECTURE.md
- Must not change the `MidiNoteData` interface in `src/types/project.ts`
- Must not change the `GenerationRequest` or `GenerationResponse` interfaces
- Must not modify the engine.ts scheduling logic (it already handles note, time, duration, velocity correctly) — EXCEPT: the `instruments` Map type on engine.ts line 12 may be widened from `Map<InstrumentType, Tone.Sampler>` to `Map<InstrumentType, Tone.Sampler | DrumKit>` to accommodate the DrumKit type
- Must not store Tone.js synth objects in Zustand stores
- Must not break playback of existing saved arrangements (existing note names must still work)
- Must not use `Math.random()` for variation -- use deterministic hash from bar number

### Preferences

- Prefer `interface` over `type` for new type definitions
- Prefer early return over nested if/else in builder functions
- Keep functions under 50 lines
- If a pattern sounds wrong but is structurally correct, ship it -- tonal quality tuning is iterative

### Escalation Triggers

- If MetalSynth cannot produce a usable hi-hat sound, escalate
- If Sampler API type mismatch causes engine.ts runtime errors, escalate
- If any genre pattern requires > 50 lines for a single bar, decompose into helper functions

---

## GM Drum Note Map (Tone.js Names)

Reference for all pattern data. Tone.js uses C4 = MIDI 60 convention.

| MIDI # | Tone.js Note | Sound | Used in Phase 1 |
|--------|-------------|-------|-----------------|
| 35 | B1 | Acoustic Bass Drum | No |
| 36 | C2 | Bass Drum 1 (Kick) | **Yes** |
| 37 | C#2 | Side Stick | **Yes** |
| 38 | D2 | Acoustic Snare | **Yes** |
| 40 | E2 | Electric Snare | No |
| 41 | F2 | Low Floor Tom | **Yes** |
| 42 | F#2 | Closed Hi-Hat | **Yes** |
| 44 | G#2 | Pedal Hi-Hat | **Yes** |
| 45 | A2 | Low Tom | **Yes** |
| 46 | A#2 | Open Hi-Hat | **Yes** |
| 49 | C#3 | Crash Cymbal 1 | **Yes** |
| 50 | D3 | High Tom | **Yes** |
| 51 | D#3 | Ride Cymbal 1 | **Yes** |
| 53 | F3 | Ride Bell | **Yes** |

---

## File Changes

### New Files

#### 1. `src/audio/drum-kit.ts` -- Synthesized Drum Kit + DrumKitLike Interface

Creates a `DrumKit` class that wraps 11+ Tone.js synth voices and exposes a `triggerAttackRelease(note, duration, time, velocity)` method matching the Tone.Sampler API.

The `DrumKitLike` interface lives in this file, alongside the `DrumKit` class:

```typescript
// The DrumKit must implement this interface so engine.ts can use it
// the same way it uses Tone.Sampler:
export interface DrumKitLike {
  triggerAttackRelease(note: string, duration: number | string, time?: number, velocity?: number): void;
  connect(destination: Tone.InputNode): this;
  disconnect(): this;
  releaseAll(): void;
  dispose(): void;
}
```

**Synth configuration for each voice:**

```typescript
// KICK (C2) -- MembraneSynth
// Deep, punchy kick with fast attack and medium decay
{
  pitchDecay: 0.05,
  octaves: 10,
  oscillator: { type: 'sine' },
  envelope: {
    attack: 0.001,
    decay: 0.4,
    sustain: 0.01,
    release: 1.4,
  },
}
// Trigger at C1 (one octave below note name) for deeper fundamental

// SNARE (D2) -- NoiseSynth (snap) + MembraneSynth (body), layered
// NoiseSynth for the wire snap:
{
  noise: { type: 'white' },
  envelope: {
    attack: 0.001,
    decay: 0.13,
    sustain: 0,
    release: 0.03,
  },
}
// MembraneSynth for the body:
{
  pitchDecay: 0.05,
  octaves: 4,
  oscillator: { type: 'triangle' },
  envelope: {
    attack: 0.001,
    decay: 0.1,
    sustain: 0,
    release: 0.1,
  },
}
// Both triggered simultaneously. Noise amplitude scaled by velocity.

// SIDE STICK (C#2) -- NoiseSynth with bandpass filter
{
  noise: { type: 'pink' },
  envelope: {
    attack: 0.001,
    decay: 0.03,
    sustain: 0,
    release: 0.01,
  },
}
// Route through Tone.Filter({ type: 'bandpass', frequency: 1800, Q: 8 })

// CLOSED HI-HAT (F#2) -- MetalSynth
{
  frequency: 400,
  envelope: {
    attack: 0.001,
    decay: 0.05,
    release: 0.01,
  },
  harmonicity: 5.1,
  modulationIndex: 32,
  resonance: 4000,
  octaves: 1.5,
}

// OPEN HI-HAT (A#2) -- MetalSynth (longer decay)
{
  frequency: 400,
  envelope: {
    attack: 0.001,
    decay: 0.3,
    release: 0.08,
  },
  harmonicity: 5.1,
  modulationIndex: 32,
  resonance: 4000,
  octaves: 1.5,
}
// When open hat triggers, close any ringing open hat (choke behavior)

// PEDAL HI-HAT (G#2) -- MetalSynth (very short, muted)
{
  frequency: 400,
  envelope: {
    attack: 0.001,
    decay: 0.02,
    release: 0.01,
  },
  harmonicity: 5.1,
  modulationIndex: 20,
  resonance: 3000,
  octaves: 1,
}

// RIDE CYMBAL (D#3) -- MetalSynth (long, shimmery)
{
  frequency: 300,
  envelope: {
    attack: 0.001,
    decay: 1.4,
    release: 0.2,
  },
  harmonicity: 12,
  modulationIndex: 20,
  resonance: 5000,
  octaves: 2,
}

// RIDE BELL (F3) -- MetalSynth (shorter, brighter)
{
  frequency: 500,
  envelope: {
    attack: 0.001,
    decay: 0.5,
    release: 0.1,
  },
  harmonicity: 14,
  modulationIndex: 14,
  resonance: 6000,
  octaves: 1.5,
}

// CRASH CYMBAL (C#3) -- MetalSynth (long, washy)
{
  frequency: 300,
  envelope: {
    attack: 0.001,
    decay: 1.8,
    release: 0.3,
  },
  harmonicity: 5.1,
  modulationIndex: 40,
  resonance: 4000,
  octaves: 3,
}

// HIGH TOM (D3) -- MembraneSynth
{
  pitchDecay: 0.08,
  octaves: 6,
  oscillator: { type: 'sine' },
  envelope: {
    attack: 0.001,
    decay: 0.25,
    sustain: 0.01,
    release: 0.3,
  },
}
// Trigger at A2 (tuned high)

// LOW TOM (F2) -- MembraneSynth
{
  pitchDecay: 0.08,
  octaves: 8,
  oscillator: { type: 'sine' },
  envelope: {
    attack: 0.001,
    decay: 0.35,
    sustain: 0.01,
    release: 0.4,
  },
}
// Trigger at E1 (tuned low)

// LOW FLOOR TOM (A2) -- MembraneSynth
// Maps to same voice config as LOW TOM but tuned between low tom and high tom
```

**NoiseSynth and MetalSynth API note:** `NoiseSynth.triggerAttackRelease()` takes `(duration, time?, velocity?)` with NO note parameter (noise has no pitch). `MetalSynth.triggerAttackRelease()` also takes `(duration, time?, velocity?)` without a note parameter. The `DrumKit` class must handle this internally by detecting the voice type before calling `triggerAttackRelease`. For `MembraneSynth` voices, call `triggerAttackRelease(triggerNote, duration, time, velocity)`. For `NoiseSynth` and `MetalSynth` voices, call `triggerAttackRelease(duration, time, velocity)` (omit note). Implement this as a simple type check or a voice-type flag in the voice map.

**Velocity-to-parameter mapping (critical for realism):**

Unlike Tone.Sampler which only adjusts volume, the DrumKit adjusts synth parameters based on velocity:
- **Kick:** Higher velocity = longer pitch decay, more octave sweep (harder hit = more "click")
- **Snare:** Higher velocity = more noise (wire snap), longer decay
- **Hi-hats:** Higher velocity = brighter (higher resonance), slightly longer decay
- **Cymbals:** Higher velocity = wider frequency spread, longer sustain
- **Toms:** Higher velocity = more pitch sweep, longer sustain

Each voice routes through an individual `Tone.Gain` to a shared output `Tone.Gain`. The DrumKit output gain connects to the engine's signal chain the same way a Sampler does.

#### 2. `src/audio/drum-kit.test.ts` -- Unit Tests for DrumKit

Test that:
- All 11 note names trigger without error
- `connect()`, `disconnect()`, `dispose()` work
- Velocity 0 produces no sound (gain = 0)
- Unknown note names are silently ignored (no throw)
- Backward-compatible note names (C2, D2, F#2, D#3) all work

#### 3. `src/lib/drum-patterns.ts` -- Pattern Library + Builder

The core pattern library. Contains:
- Type definitions (`DrumHit`, `DrumPattern`, `DrumFill`)
- Pattern data for all 9 genres
- The `buildDrumMidi()` function that replaces `buildDrumBar()`
- Swing, energy scaling, dynamics, humanization functions

**Type definitions:**

```typescript
interface DrumHit {
  note: string;           // GM note name (C2, D2, F#2, etc.)
  time: number;           // Beat offset within bar (0-based, fractional)
  duration: number;       // Duration in beats (typically 0.05-0.5 for drums)
  velocity: number;       // 0-127
  probability?: number;   // 0-1; if present, hit only plays when hash < probability
}

interface DrumPattern {
  id: string;             // e.g., 'rock_straight_4-4'
  genre: string;          // Primary genre
  substyles: string[];    // Which substyles this pattern serves
  timeSignature: string;  // '4/4', '3/4', '6/8', '2/4'
  subdivision: 8 | 16;    // Base grid: 8th notes or 16th notes
  swing: number;          // Default swing amount 0-1 (0.5 = straight, 0.67 = triplet)
  bars: DrumHit[][];      // Main groove bars (cycle through these)
  variations: DrumHit[][]; // Alternate bars to mix in for variety
}

interface DrumFill {
  id: string;
  energyRange: [number, number]; // Min-max energy where appropriate
  timeSignature: string;
  hits: DrumHit[];        // Hits for a 1-bar fill (time 0-3 in 4/4)
}

// The main builder function signature
function buildDrumMidi(params: {
  genre: string;
  substyle: string;
  barCount: number;
  beatsPerBar: number;
  energy: number;          // 0-100
  dynamics: number;        // 0-100
  swingPct: number | null; // 50-80 or null
  groove: number;          // 0-100 (humanization amount)
  sectionType: string;     // 'Intro', 'Verse', 'Chorus', 'Bridge', 'Outro'
  sectionIndex: number;    // 0-based index into sections array
  isLastSection: boolean;
  barNumberInSection: number; // 0-based bar within this section
  barNumberGlobal: number;   // 1-based global bar number (for deterministic hash)
  totalBarsInSection: number;
}): MidiNoteData[];
```

**Deterministic hash function (Knuth multiplicative hash):**

```typescript
// Used for: ghost note probability, variation selection, micro-timing jitter
// Must be deterministic so playback is reproducible
function knuthHash(barNumber: number, seed: number = 0): number {
  const n = ((barNumber + seed) * 2654435761) >>> 0;
  return (n % 1000) / 1000; // Returns 0-0.999
}
```

**Swing implementation:**

```typescript
function applySwing(time: number, swingAmount: number, beatsPerBar: number): number {
  // swingAmount: 0.5 = straight, 0.67 = triplet swing, 0.75 = heavy shuffle
  // Only shift upbeats (odd-numbered 8th notes)
  const eighthNote = time * 2; // Convert beats to 8th notes
  const isUpbeat = Math.round(eighthNote) % 2 === 1;
  if (!isUpbeat) return time;
  const gridSize = 0.5; // 8th note = half a beat
  const shift = (swingAmount - 0.5) * gridSize;
  return time + shift;
}
```

**swing_pct -> swingAmount conversion:** `GenerationRequest.swing_pct` is an integer 50-80 (or null). `applySwing()` expects a float 0.5-0.75. The conversion happens inside `buildDrumMidi()`:

```typescript
// Inside buildDrumMidi(), before calling applySwing():
const swingAmount = params.swingPct !== null ? params.swingPct / 100 : 0.5;
// swingPct=50 → swingAmount=0.5 (straight)
// swingPct=67 → swingAmount=0.67 (triplet swing)
// swingPct=75 → swingAmount=0.75 (heavy shuffle)
// null → swingAmount=0.5 (straight, no swing)
```

**Energy scaling:**

```typescript
function applyEnergy(pattern: DrumHit[], energy: number): DrumHit[] {
  // Low energy (0-33): remove 16th-note hats, remove ghost notes,
  //   reduce velocities by 15%, remove open hats
  // Medium energy (34-66): standard pattern as written
  // High energy (67-100): add open hats on upbeats, add ghost notes,
  //   increase velocities by 10%, add kick syncopation
  //
  // Implementation: filter hits based on energy tier, then scale velocities
}
```

**Dynamics scaling:**

```typescript
function applyDynamics(hits: DrumHit[], dynamics: number): DrumHit[] {
  // dynamics 0-100 controls the velocity RANGE
  // Low dynamics (0-33): compress all velocities toward 70 (narrow range 60-80)
  // Medium dynamics (34-66): moderate range (45-100)
  // High dynamics (67-100): full range (25-110), ghost notes very soft, accents very loud
  //
  // Formula: velocity = centerVelocity + (originalVelocity - centerVelocity) * dynamicsScale
  // where dynamicsScale = dynamics / 50 (0.0 at dynamics=0, 2.0 at dynamics=100)
  //
  // IMPORTANT: Clamp final velocity to 0-110 range (not 127). 110 provides safe headroom
  // for synthesized drums which can clip at full MIDI velocity.
}
```

**Humanization (groove parameter):**

```typescript
function applyGroove(hits: DrumHit[], groove: number, barNumber: number): DrumHit[] {
  // groove 0-100 controls timing micro-offsets
  // groove=0: perfectly quantized (no change)
  // groove=50: +/- 8ms offset (subtle feel)
  // groove=100: +/- 20ms offset (loose, behind-the-beat feel)
  //
  // Offset is deterministic: knuthHash(barNumber * 1000 + hitIndex)
  // Convert ms to beats: offset_beats = offset_ms / (60000 / tempo)
  // But since we don't have tempo here, express as fraction of a beat:
  // At 120 BPM, 1 beat = 500ms, so 15ms = 0.03 beats
  // maxOffset = groove / 100 * 0.04 beats (caps at ~20ms at 120 BPM)
}
```

#### Full Pattern Examples (All 9 Genres in Complete Notation)

**Rock Straight 4/4 -- Main Groove (bar 1 of 2):**

```typescript
const ROCK_STRAIGHT_BAR_1: DrumHit[] = [
  // Kick
  { note: 'C2',  time: 0,    duration: 0.25, velocity: 100 },
  { note: 'C2',  time: 2,    duration: 0.25, velocity: 90 },
  // Snare
  { note: 'D2',  time: 1,    duration: 0.2,  velocity: 95 },
  { note: 'D2',  time: 3,    duration: 0.2,  velocity: 95 },
  // Closed hi-hat on 8th notes
  { note: 'F#2', time: 0,    duration: 0.1,  velocity: 80 },
  { note: 'F#2', time: 0.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 1,    duration: 0.1,  velocity: 75 },
  { note: 'F#2', time: 1.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 2,    duration: 0.1,  velocity: 78 },
  { note: 'F#2', time: 2.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 3,    duration: 0.1,  velocity: 75 },
  { note: 'F#2', time: 3.5,  duration: 0.1,  velocity: 55 },
];
```

**Rock Straight 4/4 -- Variation (bar 2 of 2, adds pickup kick):**

```typescript
const ROCK_STRAIGHT_BAR_2: DrumHit[] = [
  // Kick -- adds syncopated pickup on "and" of 3
  { note: 'C2',  time: 0,    duration: 0.25, velocity: 100 },
  { note: 'C2',  time: 2,    duration: 0.25, velocity: 90 },
  { note: 'C2',  time: 2.5,  duration: 0.2,  velocity: 70 },  // pickup kick
  // Snare
  { note: 'D2',  time: 1,    duration: 0.2,  velocity: 95 },
  { note: 'D2',  time: 3,    duration: 0.2,  velocity: 95 },
  // Ghost note before beat 2 (probabilistic)
  { note: 'D2',  time: 0.75, duration: 0.1,  velocity: 35, probability: 0.4 },
  // Closed hi-hat on 8th notes
  { note: 'F#2', time: 0,    duration: 0.1,  velocity: 80 },
  { note: 'F#2', time: 0.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 1,    duration: 0.1,  velocity: 75 },
  { note: 'F#2', time: 1.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 2,    duration: 0.1,  velocity: 78 },
  { note: 'F#2', time: 2.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 3,    duration: 0.1,  velocity: 75 },
  // Open hat on the last upbeat (replaces closed hat)
  { note: 'A#2', time: 3.5,  duration: 0.2,  velocity: 70 },
];
```

**Jazz Swing 4/4 -- Main Groove:**

```typescript
const JAZZ_SWING_BAR_1: DrumHit[] = [
  // Ride cymbal -- spang-a-lang pattern
  // The "skip" note (beat 1.5 / 3.5) creates the swing feel
  // These will be further shifted by applySwing()
  { note: 'D#3', time: 0,    duration: 0.3,  velocity: 72 },
  { note: 'D#3', time: 1,    duration: 0.3,  velocity: 65 },
  { note: 'D#3', time: 1.5,  duration: 0.2,  velocity: 55 },  // skip note (swung)
  { note: 'D#3', time: 2,    duration: 0.3,  velocity: 70 },
  { note: 'D#3', time: 3,    duration: 0.3,  velocity: 65 },
  { note: 'D#3', time: 3.5,  duration: 0.2,  velocity: 55 },  // skip note (swung)
  // Pedal hi-hat -- foot on 2 and 4
  { note: 'G#2', time: 1,    duration: 0.1,  velocity: 40 },
  { note: 'G#2', time: 3,    duration: 0.1,  velocity: 40 },
  // Kick -- feathered (very soft, probabilistic)
  { note: 'C2',  time: 0,    duration: 0.3,  velocity: 50, probability: 0.7 },
  { note: 'C2',  time: 2,    duration: 0.3,  velocity: 45, probability: 0.5 },
  // Snare -- ghost note comping (probabilistic)
  { note: 'D2',  time: 1.5,  duration: 0.1,  velocity: 30, probability: 0.35 },
  { note: 'D2',  time: 2.5,  duration: 0.1,  velocity: 28, probability: 0.3 },
];
```

**Jazz Swing 4/4 -- Variation (ride bell on beat 1, different ghost note placement):**

```typescript
const JAZZ_SWING_BAR_2: DrumHit[] = [
  // Ride bell on beat 1 (phrase emphasis)
  { note: 'F3',  time: 0,    duration: 0.3,  velocity: 78 },
  // Ride cymbal continues
  { note: 'D#3', time: 1,    duration: 0.3,  velocity: 65 },
  { note: 'D#3', time: 1.5,  duration: 0.2,  velocity: 55 },
  { note: 'D#3', time: 2,    duration: 0.3,  velocity: 70 },
  { note: 'D#3', time: 3,    duration: 0.3,  velocity: 65 },
  { note: 'D#3', time: 3.5,  duration: 0.2,  velocity: 55 },
  // Pedal hi-hat
  { note: 'G#2', time: 1,    duration: 0.1,  velocity: 40 },
  { note: 'G#2', time: 3,    duration: 0.1,  velocity: 40 },
  // Kick -- different placement
  { note: 'C2',  time: 0,    duration: 0.3,  velocity: 55, probability: 0.6 },
  { note: 'C2',  time: 2.5,  duration: 0.25, velocity: 42, probability: 0.4 },
  // Snare ghost comping -- different beats than bar 1
  { note: 'D2',  time: 0.5,  duration: 0.1,  velocity: 32, probability: 0.3 },
  { note: 'D2',  time: 3.5,  duration: 0.1,  velocity: 28, probability: 0.25 },
];
```

**Funk 16th-Note 4/4 -- Main Groove:**

```typescript
const FUNK_POCKET_BAR_1: DrumHit[] = [
  // Kick -- syncopated
  { note: 'C2',  time: 0,     duration: 0.2,  velocity: 100 },
  { note: 'C2',  time: 0.75,  duration: 0.15, velocity: 72 },   // "e" of beat 1
  { note: 'C2',  time: 2.5,   duration: 0.2,  velocity: 88 },   // "and" of 3
  // Snare -- backbeat
  { note: 'D2',  time: 1,     duration: 0.2,  velocity: 95 },
  { note: 'D2',  time: 3,     duration: 0.2,  velocity: 95 },
  // Snare ghost notes
  { note: 'D2',  time: 0.5,   duration: 0.1,  velocity: 32 },
  { note: 'D2',  time: 1.75,  duration: 0.1,  velocity: 35 },
  { note: 'D2',  time: 2.25,  duration: 0.1,  velocity: 30, probability: 0.6 },
  { note: 'D2',  time: 3.75,  duration: 0.1,  velocity: 33 },
  // Closed hi-hat on 16th notes (except where open hat plays)
  { note: 'F#2', time: 0,     duration: 0.05, velocity: 68 },
  { note: 'F#2', time: 0.25,  duration: 0.05, velocity: 45 },
  { note: 'F#2', time: 0.5,   duration: 0.05, velocity: 58 },
  { note: 'F#2', time: 0.75,  duration: 0.05, velocity: 45 },
  { note: 'F#2', time: 1,     duration: 0.05, velocity: 65 },
  { note: 'F#2', time: 1.25,  duration: 0.05, velocity: 45 },
  // Open hi-hat on "and" of 2
  { note: 'A#2', time: 1.5,   duration: 0.15, velocity: 75 },
  { note: 'F#2', time: 1.75,  duration: 0.05, velocity: 45 },
  { note: 'F#2', time: 2,     duration: 0.05, velocity: 65 },
  { note: 'F#2', time: 2.25,  duration: 0.05, velocity: 45 },
  { note: 'F#2', time: 2.5,   duration: 0.05, velocity: 58 },
  { note: 'F#2', time: 2.75,  duration: 0.05, velocity: 45 },
  { note: 'F#2', time: 3,     duration: 0.05, velocity: 65 },
  { note: 'F#2', time: 3.25,  duration: 0.05, velocity: 45 },
  // Open hi-hat on "and" of 4
  { note: 'A#2', time: 3.5,   duration: 0.15, velocity: 75 },
  { note: 'F#2', time: 3.75,  duration: 0.05, velocity: 45 },
];
```

**Blues Shuffle 4/4 -- Main Groove (bar 1 of 2):**

```typescript
const BLUES_SHUFFLE_BAR_1: DrumHit[] = [
  // Kick -- on 1 and 3
  { note: 'C2',  time: 0,    duration: 0.25, velocity: 90 },
  { note: 'C2',  time: 2,    duration: 0.25, velocity: 82 },
  // Snare -- on 2 and 4
  { note: 'D2',  time: 1,    duration: 0.2,  velocity: 88 },
  { note: 'D2',  time: 3,    duration: 0.2,  velocity: 88 },
  // Hi-hat -- shuffle feel (swung 8ths, accented downbeats)
  // The swing timing shift is applied by applySwing(), so write straight here
  { note: 'F#2', time: 0,    duration: 0.1,  velocity: 78 },
  { note: 'F#2', time: 0.5,  duration: 0.1,  velocity: 52 },
  { note: 'F#2', time: 1,    duration: 0.1,  velocity: 72 },
  { note: 'F#2', time: 1.5,  duration: 0.1,  velocity: 52 },
  { note: 'F#2', time: 2,    duration: 0.1,  velocity: 75 },
  { note: 'F#2', time: 2.5,  duration: 0.1,  velocity: 52 },
  { note: 'F#2', time: 3,    duration: 0.1,  velocity: 72 },
  { note: 'F#2', time: 3.5,  duration: 0.1,  velocity: 52 },
  // Ghost snare on "and" of 4 (pickup into next bar)
  { note: 'D2',  time: 3.5,  duration: 0.1,  velocity: 30, probability: 0.4 },
];
```

**Blues Shuffle 4/4 -- Variation (bar 2 of 2, adds ghost kick):**

```typescript
const BLUES_SHUFFLE_BAR_2: DrumHit[] = [
  // Kick -- on 1 and 3, with ghost on "and" of 3
  { note: 'C2',  time: 0,    duration: 0.25, velocity: 90 },
  { note: 'C2',  time: 2,    duration: 0.25, velocity: 82 },
  { note: 'C2',  time: 2.5,  duration: 0.2,  velocity: 55, probability: 0.5 },
  // Snare -- on 2 and 4
  { note: 'D2',  time: 1,    duration: 0.2,  velocity: 88 },
  { note: 'D2',  time: 3,    duration: 0.2,  velocity: 88 },
  // Hi-hat -- shuffle feel
  { note: 'F#2', time: 0,    duration: 0.1,  velocity: 78 },
  { note: 'F#2', time: 0.5,  duration: 0.1,  velocity: 52 },
  { note: 'F#2', time: 1,    duration: 0.1,  velocity: 72 },
  { note: 'F#2', time: 1.5,  duration: 0.1,  velocity: 52 },
  { note: 'F#2', time: 2,    duration: 0.1,  velocity: 75 },
  { note: 'F#2', time: 2.5,  duration: 0.1,  velocity: 52 },
  { note: 'F#2', time: 3,    duration: 0.1,  velocity: 72 },
  // Open hat on last upbeat for turnaround
  { note: 'A#2', time: 3.5,  duration: 0.15, velocity: 65 },
];
```

**Country Shuffle 4/4 -- Main Groove (bar 1 of 2):**

```typescript
const COUNTRY_SHUFFLE_BAR_1: DrumHit[] = [
  // Kick -- on 1 and 3 (light)
  { note: 'C2',  time: 0,    duration: 0.2,  velocity: 75 },
  { note: 'C2',  time: 2,    duration: 0.2,  velocity: 68 },
  // Cross-stick / side stick -- on 2 and 4 (NOT full snare)
  { note: 'C#2', time: 1,    duration: 0.1,  velocity: 72 },
  { note: 'C#2', time: 3,    duration: 0.1,  velocity: 72 },
  // Hi-hat -- "train beat" 8th notes, light and even
  { note: 'F#2', time: 0,    duration: 0.08, velocity: 62 },
  { note: 'F#2', time: 0.5,  duration: 0.08, velocity: 48 },
  { note: 'F#2', time: 1,    duration: 0.08, velocity: 58 },
  { note: 'F#2', time: 1.5,  duration: 0.08, velocity: 48 },
  { note: 'F#2', time: 2,    duration: 0.08, velocity: 60 },
  { note: 'F#2', time: 2.5,  duration: 0.08, velocity: 48 },
  { note: 'F#2', time: 3,    duration: 0.08, velocity: 58 },
  { note: 'F#2', time: 3.5,  duration: 0.08, velocity: 48 },
];
```

**Country Shuffle 4/4 -- Variation (bar 2 of 2):**

```typescript
const COUNTRY_SHUFFLE_BAR_2: DrumHit[] = [
  // Kick -- on 1 and 3, pickup on "and" of 4
  { note: 'C2',  time: 0,    duration: 0.2,  velocity: 75 },
  { note: 'C2',  time: 2,    duration: 0.2,  velocity: 68 },
  { note: 'C2',  time: 3.5,  duration: 0.15, velocity: 55, probability: 0.5 },
  // Cross-stick on 2 and 4
  { note: 'C#2', time: 1,    duration: 0.1,  velocity: 72 },
  { note: 'C#2', time: 3,    duration: 0.1,  velocity: 72 },
  // Hi-hat -- train beat
  { note: 'F#2', time: 0,    duration: 0.08, velocity: 62 },
  { note: 'F#2', time: 0.5,  duration: 0.08, velocity: 48 },
  { note: 'F#2', time: 1,    duration: 0.08, velocity: 58 },
  { note: 'F#2', time: 1.5,  duration: 0.08, velocity: 48 },
  { note: 'F#2', time: 2,    duration: 0.08, velocity: 60 },
  { note: 'F#2', time: 2.5,  duration: 0.08, velocity: 48 },
  { note: 'F#2', time: 3,    duration: 0.08, velocity: 58 },
  { note: 'F#2', time: 3.5,  duration: 0.08, velocity: 48 },
];
```

**Gospel Drive 4/4 -- Main Groove (bar 1 of 2):**

```typescript
const GOSPEL_DRIVE_BAR_1: DrumHit[] = [
  // Kick -- driving, syncopated
  { note: 'C2',  time: 0,    duration: 0.2,  velocity: 95 },
  { note: 'C2',  time: 1.5,  duration: 0.15, velocity: 72 },  // syncopated
  { note: 'C2',  time: 2,    duration: 0.2,  velocity: 88 },
  // Snare -- strong backbeat on 2 and 4
  { note: 'D2',  time: 1,    duration: 0.2,  velocity: 100 },
  { note: 'D2',  time: 3,    duration: 0.2,  velocity: 100 },
  // Closed hi-hat -- driving 8th notes
  { note: 'F#2', time: 0,    duration: 0.08, velocity: 75 },
  { note: 'F#2', time: 0.5,  duration: 0.08, velocity: 58 },
  { note: 'F#2', time: 1,    duration: 0.08, velocity: 72 },
  { note: 'F#2', time: 1.5,  duration: 0.08, velocity: 58 },
  { note: 'F#2', time: 2,    duration: 0.08, velocity: 72 },
  { note: 'F#2', time: 2.5,  duration: 0.08, velocity: 58 },
  { note: 'F#2', time: 3,    duration: 0.08, velocity: 72 },
  { note: 'F#2', time: 3.5,  duration: 0.08, velocity: 58 },
];
```

**Gospel Drive 4/4 -- Variation (bar 2 of 2, adds open hat accent):**

```typescript
const GOSPEL_DRIVE_BAR_2: DrumHit[] = [
  // Kick -- driving, different syncopation
  { note: 'C2',  time: 0,    duration: 0.2,  velocity: 95 },
  { note: 'C2',  time: 2,    duration: 0.2,  velocity: 88 },
  { note: 'C2',  time: 2.75, duration: 0.15, velocity: 68, probability: 0.6 },
  // Snare -- strong backbeat
  { note: 'D2',  time: 1,    duration: 0.2,  velocity: 100 },
  { note: 'D2',  time: 3,    duration: 0.2,  velocity: 100 },
  // Ghost snare
  { note: 'D2',  time: 0.5,  duration: 0.1,  velocity: 35, probability: 0.4 },
  // Hi-hat -- 8th notes with open hat on "and" of 4
  { note: 'F#2', time: 0,    duration: 0.08, velocity: 75 },
  { note: 'F#2', time: 0.5,  duration: 0.08, velocity: 58 },
  { note: 'F#2', time: 1,    duration: 0.08, velocity: 72 },
  { note: 'F#2', time: 1.5,  duration: 0.08, velocity: 58 },
  { note: 'F#2', time: 2,    duration: 0.08, velocity: 72 },
  { note: 'F#2', time: 2.5,  duration: 0.08, velocity: 58 },
  { note: 'F#2', time: 3,    duration: 0.08, velocity: 72 },
  // Open hat accent
  { note: 'A#2', time: 3.5,  duration: 0.15, velocity: 70 },
];
```

**R&B Groove 4/4 -- Main Groove (bar 1 of 2):**

```typescript
const RNB_GROOVE_BAR_1: DrumHit[] = [
  // Kick -- laid-back, syncopated
  { note: 'C2',  time: 0,    duration: 0.2,  velocity: 88 },
  { note: 'C2',  time: 1.75, duration: 0.15, velocity: 65 },   // "a" of beat 2
  { note: 'C2',  time: 2.5,  duration: 0.2,  velocity: 78 },   // "and" of 3
  // Snare -- lighter backbeat
  { note: 'D2',  time: 1,    duration: 0.2,  velocity: 82 },
  { note: 'D2',  time: 3,    duration: 0.2,  velocity: 82 },
  // Snare ghost notes (key R&B characteristic)
  { note: 'D2',  time: 0.5,  duration: 0.1,  velocity: 28 },
  { note: 'D2',  time: 1.5,  duration: 0.1,  velocity: 30, probability: 0.5 },
  { note: 'D2',  time: 2.75, duration: 0.1,  velocity: 28 },
  { note: 'D2',  time: 3.5,  duration: 0.1,  velocity: 32, probability: 0.6 },
  // 16th-note hi-hat
  { note: 'F#2', time: 0,    duration: 0.05, velocity: 62 },
  { note: 'F#2', time: 0.25, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 0.5,  duration: 0.05, velocity: 52 },
  { note: 'F#2', time: 0.75, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 1,    duration: 0.05, velocity: 60 },
  { note: 'F#2', time: 1.25, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 1.5,  duration: 0.05, velocity: 52 },
  { note: 'F#2', time: 1.75, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 2,    duration: 0.05, velocity: 60 },
  { note: 'F#2', time: 2.25, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 2.5,  duration: 0.05, velocity: 52 },
  { note: 'F#2', time: 2.75, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 3,    duration: 0.05, velocity: 60 },
  { note: 'F#2', time: 3.25, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 3.5,  duration: 0.05, velocity: 52 },
  { note: 'F#2', time: 3.75, duration: 0.05, velocity: 40 },
];
```

**R&B Groove 4/4 -- Variation (bar 2 of 2, open hat accent):**

```typescript
const RNB_GROOVE_BAR_2: DrumHit[] = [
  // Kick
  { note: 'C2',  time: 0,    duration: 0.2,  velocity: 88 },
  { note: 'C2',  time: 2,    duration: 0.2,  velocity: 80 },
  { note: 'C2',  time: 3.25, duration: 0.15, velocity: 62, probability: 0.5 },
  // Snare
  { note: 'D2',  time: 1,    duration: 0.2,  velocity: 82 },
  { note: 'D2',  time: 3,    duration: 0.2,  velocity: 82 },
  // Ghost notes -- different placement from bar 1
  { note: 'D2',  time: 0.75, duration: 0.1,  velocity: 30 },
  { note: 'D2',  time: 2.25, duration: 0.1,  velocity: 28, probability: 0.5 },
  { note: 'D2',  time: 3.75, duration: 0.1,  velocity: 30 },
  // 16th hi-hats with open hat on "and" of 2
  { note: 'F#2', time: 0,    duration: 0.05, velocity: 62 },
  { note: 'F#2', time: 0.25, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 0.5,  duration: 0.05, velocity: 52 },
  { note: 'F#2', time: 0.75, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 1,    duration: 0.05, velocity: 60 },
  { note: 'F#2', time: 1.25, duration: 0.05, velocity: 40 },
  // Open hat
  { note: 'A#2', time: 1.5,  duration: 0.12, velocity: 68 },
  { note: 'F#2', time: 1.75, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 2,    duration: 0.05, velocity: 60 },
  { note: 'F#2', time: 2.25, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 2.5,  duration: 0.05, velocity: 52 },
  { note: 'F#2', time: 2.75, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 3,    duration: 0.05, velocity: 60 },
  { note: 'F#2', time: 3.25, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 3.5,  duration: 0.05, velocity: 52 },
  { note: 'F#2', time: 3.75, duration: 0.05, velocity: 40 },
];
```

**Latin (Bossa Nova) 4/4 -- Main Groove (bar 1 of 2):**

```typescript
const BOSSA_NOVA_BAR_1: DrumHit[] = [
  // Kick -- bass drum ostinato (bossa pattern)
  // Beat 1 and "and of 2" are the signature bossa kick
  { note: 'C2',  time: 0,    duration: 0.25, velocity: 75 },
  { note: 'C2',  time: 1.5,  duration: 0.2,  velocity: 65 },   // "and" of 2
  // Side stick -- cross-stick pattern (NO hi-hat, NO full snare)
  // Bossa clave-inspired: beats 1-and, 2-and, 4
  { note: 'C#2', time: 0.5,  duration: 0.1,  velocity: 68 },
  { note: 'C#2', time: 1,    duration: 0.1,  velocity: 62 },
  { note: 'C#2', time: 2,    duration: 0.1,  velocity: 70 },
  { note: 'C#2', time: 3,    duration: 0.1,  velocity: 65 },
  { note: 'C#2', time: 3.5,  duration: 0.1,  velocity: 58 },
];
```

**Latin (Bossa Nova) 4/4 -- Variation (bar 2 of 2, slightly different kick):**

```typescript
const BOSSA_NOVA_BAR_2: DrumHit[] = [
  // Kick -- variation: add light hit on 3
  { note: 'C2',  time: 0,    duration: 0.25, velocity: 75 },
  { note: 'C2',  time: 1.5,  duration: 0.2,  velocity: 65 },
  { note: 'C2',  time: 3,    duration: 0.2,  velocity: 55, probability: 0.5 },
  // Side stick -- slightly different pattern
  { note: 'C#2', time: 0.5,  duration: 0.1,  velocity: 68 },
  { note: 'C#2', time: 1.5,  duration: 0.1,  velocity: 60 },
  { note: 'C#2', time: 2,    duration: 0.1,  velocity: 70 },
  { note: 'C#2', time: 3,    duration: 0.1,  velocity: 65 },
  { note: 'C#2', time: 3.5,  duration: 0.1,  velocity: 58 },
];
```

**Pop Four-on-the-Floor 4/4 -- Main Groove (bar 1 of 2):**

```typescript
const POP_FOUR_ON_FLOOR_BAR_1: DrumHit[] = [
  // Kick -- every beat (four on the floor)
  { note: 'C2',  time: 0,    duration: 0.25, velocity: 95 },
  { note: 'C2',  time: 1,    duration: 0.25, velocity: 85 },
  { note: 'C2',  time: 2,    duration: 0.25, velocity: 90 },
  { note: 'C2',  time: 3,    duration: 0.25, velocity: 85 },
  // Snare -- on 2 and 4
  { note: 'D2',  time: 1,    duration: 0.2,  velocity: 92 },
  { note: 'D2',  time: 3,    duration: 0.2,  velocity: 92 },
  // Closed hi-hat -- 8th notes, simple and driving
  { note: 'F#2', time: 0,    duration: 0.1,  velocity: 72 },
  { note: 'F#2', time: 0.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 1,    duration: 0.1,  velocity: 68 },
  { note: 'F#2', time: 1.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 2,    duration: 0.1,  velocity: 70 },
  { note: 'F#2', time: 2.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 3,    duration: 0.1,  velocity: 68 },
  { note: 'F#2', time: 3.5,  duration: 0.1,  velocity: 55 },
];
```

**Pop Four-on-the-Floor 4/4 -- Variation (bar 2 of 2, open hat on upbeats):**

```typescript
const POP_FOUR_ON_FLOOR_BAR_2: DrumHit[] = [
  // Kick -- every beat
  { note: 'C2',  time: 0,    duration: 0.25, velocity: 95 },
  { note: 'C2',  time: 1,    duration: 0.25, velocity: 85 },
  { note: 'C2',  time: 2,    duration: 0.25, velocity: 90 },
  { note: 'C2',  time: 3,    duration: 0.25, velocity: 85 },
  // Snare
  { note: 'D2',  time: 1,    duration: 0.2,  velocity: 92 },
  { note: 'D2',  time: 3,    duration: 0.2,  velocity: 92 },
  // Hi-hat -- 8th notes with open hat on "and" of 4
  { note: 'F#2', time: 0,    duration: 0.1,  velocity: 72 },
  { note: 'F#2', time: 0.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 1,    duration: 0.1,  velocity: 68 },
  { note: 'F#2', time: 1.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 2,    duration: 0.1,  velocity: 70 },
  { note: 'F#2', time: 2.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 3,    duration: 0.1,  velocity: 68 },
  // Open hat on last upbeat
  { note: 'A#2', time: 3.5,  duration: 0.15, velocity: 65 },
];
```

#### Genre-to-Pattern Mapping (all 9 genres)

| Genre | Default Pattern ID | Swing | Subdivision | Key Characteristics |
|-------|-------------------|-------|-------------|---------------------|
| Jazz | `jazz_swing` | 0.67 (triplet) | 8 | Ride spang-a-lang, feathered kick, ghost snare comping, pedal HH on 2 and 4 |
| Blues | `blues_shuffle` | 0.67 (triplet) | 8 | Swung 8th hats, kick on 1 and 3, snare on 2 and 4, occasional ghost notes |
| Rock | `rock_straight` | 0.5 (straight) | 8 | Kick 1 and 3, snare 2 and 4, 8th-note hats, straight feel |
| Funk | `funk_pocket` | 0.5 (straight) | 16 | Syncopated kick, 16th hats, open hats on upbeats, many ghost notes |
| Country | `country_shuffle` | 0.62 (light swing) | 8 | Side stick on 2 and 4 (not full snare), light kick, gentle hats |
| Gospel | `gospel_drive` | 0.5 (straight) | 8 | Driving 8th hats, open hat accents, syncopated kick, strong backbeat |
| R&B | `rnb_groove` | 0.5 (straight) | 16 | Laid-back kick, ghost notes, open hat, moderate 16th hats |
| Latin | `bossa_nova` | 0.5 (straight) | 8 | Side stick pattern, bass drum ostinato, NO hi-hat, NO swing |
| Pop | `pop_four_on_floor` | 0.5 (straight) | 8 | Kick every beat, snare on 2 and 4, open hat upbeats |

**Substyle overrides (partial list):**

| Genre | Substyle | Pattern Override | Notes |
|-------|----------|-----------------|-------|
| Jazz | Bebop | Use `jazz_swing` + higher energy default | More active kick comping |
| Jazz | Latin Jazz | Use `latin_jazz` | Cascara ride, no swing, cross-stick |
| Jazz | Fusion | Use `fusion_straight` | Straight 16ths on hat |
| Blues | Jump Blues | Use `blues_shuffle` + ride instead of hat | Faster, ride cymbal |
| Rock | Punk | Use `rock_straight` + high energy | Faster, all 8ths on hat |
| Country | Western Swing | Use `jazz_swing` variant | Ride cymbal, brush feel |
| Country | Outlaw | Use `rock_straight` variant | Heavier kick, full snare |
| Latin | Salsa | Use `salsa_cascara` | Ride bell cascara, tumbao kick |
| Latin | Samba | Use `samba` | 16th hats, aggressive |

#### Fill Library

At least 9 fills organized by energy bracket:

**Low energy (0-33) fills:**
- `fill_low_1`: Single snare hit on beat 4 + crash on next beat 1
- `fill_low_2`: Side stick rhythm on beats 3 and 4
- `fill_low_3`: Ride bell accent on beat 4

**Medium energy (34-66) fills:**
- `fill_med_1`: Snare on beats 3 and 4 with kick on 3
- `fill_med_2`: High tom beat 3 + low tom beat 4
- `fill_med_3`: Open hat on beat 3 + snare on beat 4

**High energy (67-100) fills:**
- `fill_high_1`: 16th-note snare across beats 3-4
- `fill_high_2`: Tom cascade: high tom (beat 3) -> low tom (3.5) -> kick (4) -> crash (next 1)
- `fill_high_3`: Snare + kick together on 16th notes across beat 4

#### 4. `src/lib/drum-patterns.test.ts` -- Unit Tests for Pattern Library

Test cases:
- `buildDrumMidi` returns non-empty array for all 9 genres
- All returned notes have valid GM drum note names
- All velocities are 0-110 (clamped range)
- All times are >= 0 and < beatsPerBar * barCount
- Energy scaling: count notes at energy=20 < count notes at energy=80
- Swing: upbeat note times differ between swing=50 and swing=67
- Dynamics: velocity spread at dynamics=20 < velocity spread at dynamics=80
- Fills: last bar of non-final section contains different notes than previous bar
- Crash: first bar of non-intro section contains C#3 (crash)
- 3/4 time: no notes at time >= 3.0 within a bar
- Determinism: same inputs produce same outputs on two calls
- No two consecutive bars have identical note arrays (bar variation)
- **Genre structural tests (per AC #2):**
  - Jazz: D#3 (ride) has more hits than F#2 (hi-hat)
  - Rock: F#2 (hi-hat) has 8 hits per bar, C2 (kick) on times 0 and 2
  - Funk: F#2 (hi-hat) has 16 hits per bar, at least 2 snare hits with velocity < 40
  - Latin: C#2 (side stick) present, F#2 (hi-hat) absent
  - Country: C#2 (side stick) on times 1 and 3, D2 (snare) absent from backbeat

### Modified Files

#### 5. `src/audio/sampler-cache.ts` -- Lines 36-45 (drum config)

**Current code (lines 36-45):**
```typescript
drums: {
  kind: "local",
  baseUrl: "/samples/drums/",
  urls: {
    C2: "kick.mp3",
    D2: "snare.mp3",
    "F#2": "hihat.mp3",
    "D#3": "ride.mp3",
  },
},
```

**Change:** Add a third config kind `"synth"` alongside `"cdn"` and `"local"`. When `kind === "synth"`, `createSampler()` instantiates a `DrumKit` instead of a `Tone.Sampler`. Since `DrumKit` implements the same `triggerAttackRelease` interface, the rest of the system works unchanged.

The `INSTRUMENT_CONFIG` type union gains a new member:
```typescript
| { kind: "synth" }
```

The `createSampler` function (line 65) adds a branch:
```typescript
if (cfg.kind === "synth") {
  const kit = new DrumKit();
  // DrumKit constructor is synchronous -- no samples to load
  return Promise.resolve(kit as unknown as Tone.Sampler);
}
```

**Type widening for getSampler:** The return type of `getSampler()` stays as `Promise<Tone.Sampler>` (the `as unknown as Tone.Sampler` cast handles this). This avoids changing the dozens of call sites. The cast is safe because `DrumKit` implements `DrumKitLike`, which has the same method signatures that `engine.ts` actually uses (`triggerAttackRelease`, `connect`, `disconnect`, `releaseAll`).

**Allowed narrow change to engine.ts line 12:** Widen the `instruments` Map type from `Map<InstrumentType, Tone.Sampler>` to `Map<InstrumentType, Tone.Sampler | DrumKit>`. Import `DrumKit` (or `DrumKitLike`) from `@/audio/drum-kit`. This is the ONLY change allowed in engine.ts -- do NOT modify the scheduling logic.

#### 6. `src/lib/midi-generator.ts` -- Lines 155-201, 306-344, 348+

**Remove (lines 155-201):** `buildJazzDrumBar`, `buildRockDrumBar`, `buildFunkDrumBar`, `buildDrumBar`

**Replace with:** Import `buildDrumMidi` from `@/lib/drum-patterns` and call it from `generateMidiForBlock`.

**Modify `generateMidiForBlock` (lines 306-344):**

Currently the drum case at line 329 is:
```typescript
case 'drums':
  notes.push(...buildDrumBar(genre, barOffset));
  break;
```

This calls `buildDrumBar` once per bar with only `genre` and `barOffset`. The new code needs to pass all expression parameters. Since `generateMidiForBlock` currently has the signature:

```typescript
function generateMidiForBlock(
  instrument: string,
  barCount: number,
  chordsForBlock: ChordEntry[],
  key: string,
  genre: string
): MidiNoteData[]
```

This signature must be extended to pass the full generation context for drums. Add an optional `drumContext` parameter:

```typescript
interface DrumContext {
  substyle: string;
  energy: number;
  dynamics: number;
  swingPct: number | null;
  groove: number;
  beatsPerBar: number;
  sectionType: string;
  sectionIndex: number;
  isLastSection: boolean;
  totalBarsInSection: number;
  barNumberGlobal: number; // 1-based global start bar of this block
}

function generateMidiForBlock(
  instrument: string,
  barCount: number,
  chordsForBlock: ChordEntry[],
  key: string,
  genre: string,
  drumContext?: DrumContext
): MidiNoteData[]
```

The drum case becomes:
```typescript
case 'drums': {
  if (!drumContext) {
    // Fallback for backward compatibility (should not happen in practice)
    notes.push(...buildDrumMidi({ /* defaults */ }));
    break;
  }
  for (let bar = 0; bar < barCount; bar++) {
    const barNotes = buildDrumMidi({
      genre,
      substyle: drumContext.substyle,
      barCount: 1,
      beatsPerBar: drumContext.beatsPerBar,
      energy: drumContext.energy,
      dynamics: drumContext.dynamics,
      swingPct: drumContext.swingPct,
      groove: drumContext.groove,
      sectionType: drumContext.sectionType,
      sectionIndex: drumContext.sectionIndex,
      isLastSection: drumContext.isLastSection,
      barNumberInSection: bar,
      barNumberGlobal: drumContext.barNumberGlobal + bar,
      totalBarsInSection: drumContext.totalBarsInSection,
    });
    // Offset notes by bar position within block
    const barOffset = bar * drumContext.beatsPerBar;
    notes.push(...barNotes.map(n => ({
      ...n,
      time: n.time + barOffset,
    })));
  }
  break;
}
```

**Modify `generate()` (line 348+) -- CRITICAL REFACTOR for section context:**

The current `generate()` creates one block per stem spanning ALL bars. The drum builder needs per-section context (sectionType, isLastSection, totalBarsInSection) for fills and crashes. The drum stem must be handled differently: instead of one block spanning all bars, the drum stem creates one block per section.

Here is exactly how `generate()` must be refactored for the drum case:

```typescript
export function generate(request: GenerationRequest): GenerationResponse {
  const totalBars = request.chords.length || 8;
  const sections = createSections(totalBars);

  const stems: StemData[] = request.stems.map((instrument, i) => ({
    instrument,
    sort_order: i,
  }));

  // Parse beatsPerBar from time signature
  const [numStr] = request.time_signature.split('/');
  const beatsPerBar = parseInt(numStr ?? '4', 10);

  const blocks: BlockData[] = [];
  for (const stem of stems) {
    if (stem.instrument === 'drums') {
      // --- DRUM STEM: one block per section with full context ---
      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const section = sections[sIdx];
        const isLastSection = sIdx === sections.length - 1;
        const sectionChords = request.chords.slice(
          section.start_bar - 1,
          section.start_bar - 1 + section.bar_count
        );

        const drumContext: DrumContext = {
          substyle: request.sub_style,
          energy: request.energy,
          dynamics: request.dynamics,
          swingPct: request.swing_pct,
          groove: request.groove,
          beatsPerBar,
          sectionType: section.name.replace(/\s*\d+$/, ''), // "Verse 2" -> "Verse"
          sectionIndex: sIdx,
          isLastSection,
          totalBarsInSection: section.bar_count,
          barNumberGlobal: section.start_bar,
        };

        blocks.push({
          stem_instrument: stem.instrument,
          section_name: section.name,
          start_bar: section.start_bar,
          end_bar: section.start_bar + section.bar_count - 1,
          chord_degree: sectionChords[0]?.degree ?? null,
          chord_quality: sectionChords[0]?.quality ?? null,
          style: getStyle(stem.instrument, request.genre),
          midi_data: generateMidiForBlock(
            stem.instrument,
            section.bar_count,
            sectionChords,
            request.key,
            request.genre,
            drumContext
          ),
        });
      }
    } else {
      // --- NON-DRUM STEMS: one block spanning all bars (existing behavior) ---
      const firstChord = request.chords[0];
      blocks.push({
        stem_instrument: stem.instrument,
        section_name: sections[0].name,
        start_bar: 1,
        end_bar: totalBars,
        chord_degree: firstChord?.degree ?? null,
        chord_quality: firstChord?.quality ?? null,
        style: getStyle(stem.instrument, request.genre),
        midi_data: generateMidiForBlock(
          stem.instrument,
          totalBars,
          request.chords,
          request.key,
          request.genre
        ),
      });
    }
  }

  const chords: ChordData[] = request.chords.map((c) => ({
    bar_number: c.bar_number,
    degree: c.degree,
    quality: c.quality,
    bass_degree: c.bass_degree,
  }));

  return { sections, stems, blocks, chords };
}
```

**Key changes in the refactored generate():**
1. `beatsPerBar` is parsed from `request.time_signature` at the top
2. Drum stem loops over sections, creating one block per section with full `DrumContext`
3. `sectionType` is derived by stripping trailing numbers from section name (e.g., "Verse 2" -> "Verse")
4. Non-drum stems keep the existing single-block behavior unchanged

#### 7. `src/lib/genre-config.ts` -- Add drum pattern mapping

Add a mapping from genre+substyle to drum pattern ID:

```typescript
export const GENRE_DRUM_PATTERNS: Record<string, Record<string, string>> = {
  Jazz: {
    _default: 'jazz_swing',
    'Latin Jazz': 'latin_jazz',
    Fusion: 'fusion_straight',
  },
  Blues: {
    _default: 'blues_shuffle',
    'Jump Blues': 'blues_shuffle', // same pattern, higher energy
  },
  Rock: {
    _default: 'rock_straight',
    Punk: 'rock_straight', // same but higher energy
    Garage: 'rock_straight',
  },
  Funk: {
    _default: 'funk_pocket',
    'P-Funk': 'funk_pocket',
    Disco: 'pop_four_on_floor',
    'Neo-soul': 'rnb_groove',
  },
  Country: {
    _default: 'country_shuffle',
    Outlaw: 'rock_straight',
    'Western Swing': 'jazz_swing',
    'Country Pop': 'pop_four_on_floor',
  },
  Gospel: {
    _default: 'gospel_drive',
  },
  'R&B': {
    _default: 'rnb_groove',
    'New Jack Swing': 'funk_pocket',
  },
  Latin: {
    _default: 'bossa_nova',
    Samba: 'samba',
    Salsa: 'salsa_cascara',
    Son: 'salsa_cascara',
  },
  Pop: {
    _default: 'pop_four_on_floor',
    'Indie Pop': 'rock_straight',
  },
};

export function getDrumPatternId(genre: string, substyle: string): string {
  const genreMap = GENRE_DRUM_PATTERNS[genre];
  if (!genreMap) return 'rock_straight'; // safe fallback
  return genreMap[substyle] ?? genreMap['_default'] ?? 'rock_straight';
}
```

---

## Execution Queue

### Agent Protocol

1. Read CLAUDE.md and ARCHITECTURE.md before starting any subtask
2. Execute subtasks in order (respect dependency graph)
3. Do NOT proceed to the next subtask until the current subtask's Verify command passes
4. If Verify fails, fix the issue and re-run Verify -- do not skip
5. After all subtasks pass, run the full integration verify
6. Commit format: `Drum-P1-T{N}: {subtask title}`

### Subtask Dependency Graph

```
Subtask 1 (DrumKit class)
    |
    v
Subtask 2 (Wire into sampler-cache)
    |
Subtask 3 (Pattern data) -- no dependency on 1 or 2
    |
    v
Subtask 4 (Builder function) -- depends on 3
    |
    v
Subtask 5 (Tests) -- depends on 4
    |
Subtask 6 (Wire into midi-generator) -- depends on 4
    |
    v
Subtask 7 (Genre config + integration) -- depends on 2, 5, 6
```

Subtasks 1 and 3 can run in parallel. Subtask 2 depends on 1. Subtask 4 depends on 3. Subtask 7 is the integration point.

---

- [ ] **Subtask 1: DrumKit Class** (est. 90m)

  **Context:** Read these files first: `CLAUDE.md`, `ARCHITECTURE.md`, `src/audio/engine.ts` (line 12 for instruments Map type, lines 186-194 for how triggerAttackRelease is called), `src/audio/sampler-cache.ts` (for the interface DrumKit must match)

  **Creates:** `src/audio/drum-kit.ts`, `src/audio/drum-kit.test.ts`
  **Modifies:** Nothing

  **Steps:**
  1. Create `src/audio/drum-kit.ts` with the `DrumKitLike` interface (exported) and `DrumKit` class (exported)
  2. Implement all 11 voices using the synth configurations specified above
  3. Implement `triggerAttackRelease(note, duration, time, velocity)` -- route to correct voice by note name lookup. **IMPORTANT:** NoiseSynth and MetalSynth take `(duration, time?, velocity?)` without a note parameter. MembraneSynth takes `(note, duration, time?, velocity?)`. Detect voice type and call accordingly.
  4. Implement velocity-to-parameter mapping (adjust synth params per velocity before triggering)
  5. Implement `connect()`, `disconnect()`, `releaseAll()`, `dispose()` matching the DrumKitLike interface
  6. Implement hi-hat choke behavior (open hat closes ringing open hat)
  7. Wire all voices through individual Tone.Gain nodes to a shared output Tone.Gain
  8. Write unit tests in `src/audio/drum-kit.test.ts` covering: all 11 note names, connect/disconnect/dispose, velocity 0, unknown note names, backward-compatible names

  **Verify:** `npx vitest run src/audio/drum-kit.test.ts && npm run build`

  **Done when:** All 11 note names trigger without error in test. DrumKit can connect to a Tone.Gain node. Build passes.

---

- [ ] **Subtask 2: Wire DrumKit into sampler-cache.ts** (est. 30m)

  **Context:** Read these files first: `src/audio/sampler-cache.ts`, `src/audio/drum-kit.ts` (from subtask 1), `src/audio/engine.ts` (line 12 for instruments Map type)

  **Creates:** Nothing
  **Modifies:** `src/audio/sampler-cache.ts`, `src/audio/engine.ts` (line 12 ONLY -- widen Map type)

  **Steps:**
  1. Import `DrumKit` from `@/audio/drum-kit` in sampler-cache.ts
  2. Add `| { kind: "synth" }` to the INSTRUMENT_CONFIG type union
  3. Change the drums config from `kind: "local"` to `kind: "synth"` (remove the urls and baseUrl)
  4. Add a branch in `createSampler()`: if `cfg.kind === "synth"`, return `Promise.resolve(new DrumKit() as unknown as Tone.Sampler)`
  5. In `engine.ts` line 12: widen the type from `Map<InstrumentType, Tone.Sampler>` to `Map<InstrumentType, Tone.Sampler | DrumKit>`. Import `DrumKit` (or `DrumKitLike`) from `@/audio/drum-kit`. This is the ONLY change to engine.ts.
  6. Verify that `getSampler('piano')`, `getSampler('bass')`, etc. still work unchanged

  **Verify:** `npm run build`

  **Done when:** `getSampler('drums')` returns a DrumKit instance. Build passes. Existing `getSampler('piano')` etc. still work.

---

- [ ] **Subtask 3: Pattern Data (core patterns for all 9 genres)** (est. 120m)

  **Context:** Read these files first: `CLAUDE.md`, this spec (GM Drum Note Map, Full Pattern Examples sections), `src/types/project.ts` (for `MidiNoteData` interface)

  **Creates:** `src/lib/drum-patterns.ts` (pattern data section only, not the builder)
  **Modifies:** Nothing

  **Steps:**
  1. Create `src/lib/drum-patterns.ts`
  2. Define the `DrumHit`, `DrumPattern`, `DrumFill` interfaces (use `interface`, not `type`)
  3. Implement the `knuthHash()` function
  4. Enter pattern data arrays for all 9 genres using the full notation in this spec: Rock (2 bars), Jazz (2 bars), Funk (1 bar + data in spec), Blues (2 bars), Country (2 bars), Gospel (2 bars), R&B (2 bars), Latin/Bossa Nova (2 bars), Pop (2 bars)
  5. Enter fill data arrays for all 9 fills (3 per energy bracket)
  6. Create the `PATTERNS` map keyed by pattern ID and the `FILLS` array
  7. Export `DrumHit`, `DrumPattern`, `DrumFill`, `PATTERNS`, `FILLS`, `knuthHash`

  **Verify:** `npm run build` (type-checks the pattern data)

  **Done when:** Pattern data is importable and type-checks. Each genre has at least 2 main bars, 1 variation, and access to 3+ fills. Build passes.

---

- [ ] **Subtask 4: Pattern Builder Function** (est. 90m)

  **Context:** Read these files first: `src/lib/drum-patterns.ts` (from subtask 3), `src/types/project.ts` (for `MidiNoteData`), `src/lib/genre-config.ts` (for GENRE_DRUM_PATTERNS which will be added in subtask 7 -- for now use a local lookup or import if already present)

  **Creates:** Nothing
  **Modifies:** `src/lib/drum-patterns.ts`

  **Steps:**
  1. Implement `applySwing(time, swingAmount, beatsPerBar)` -- shift upbeats proportional to swing amount
  2. Implement `applyEnergy(pattern, energy)` -- filter/modify hits based on energy tier (0-33, 34-66, 67-100)
  3. Implement `applyDynamics(hits, dynamics)` -- scale velocity range based on dynamics value. **IMPORTANT:** Clamp to 0-110 (not 127). Use the formula: `velocity = centerVelocity + (originalVelocity - centerVelocity) * dynamicsScale` where `dynamicsScale = dynamics / 50`
  4. Implement `applyGroove(hits, groove, barNumber)` -- add deterministic micro-timing offsets using knuthHash
  5. Implement fill selection logic: pick fill based on energy bracket and deterministic hash
  6. Implement crash insertion logic: add C#3 crash hit on beat 0 of first bar when sectionIndex > 0
  7. Implement bar variation selection: use knuthHash(barNumberGlobal) to select from main bars vs variations
  8. Implement `buildDrumMidi(params)` -- the main function that orchestrates all of the above. Include the swing_pct -> swingAmount conversion: `const swingAmount = params.swingPct !== null ? params.swingPct / 100 : 0.5;`
  9. Export `buildDrumMidi`, `applySwing`, `applyEnergy`, `applyDynamics`, `applyGroove`

  **Verify:** `npm run build`

  **Done when:** `buildDrumMidi({ genre: 'Rock', ... })` returns a valid `MidiNoteData[]` with correct notes. Build passes.

---

- [ ] **Subtask 5: Pattern Unit Tests** (est. 75m)

  **Context:** Read these files first: `src/lib/drum-patterns.ts` (from subtasks 3+4), `src/types/project.ts` (for `MidiNoteData`), this spec (Acceptance Criteria section)

  **Creates:** `src/lib/drum-patterns.test.ts`
  **Modifies:** Nothing

  **Steps:**
  1. Create `src/lib/drum-patterns.test.ts`
  2. Test: `buildDrumMidi` returns non-empty array for all 9 genres
  3. Test: All returned notes have valid GM drum note names (from the note map)
  4. Test: All velocities are 0-110 (clamped range, matching AC #8)
  5. Test: All times are >= 0 and < beatsPerBar * barCount
  6. Test: Energy scaling -- note count at energy=20 < note count at energy=80
  7. Test: Swing -- upbeat note times differ between swingPct=50 and swingPct=67
  8. Test: Dynamics -- velocity spread at dynamics=20 < velocity spread at dynamics=80
  9. Test: Fills -- last bar of non-final section contains different notes than previous bar
  10. Test: Crash -- first bar of non-intro section contains C#3 (crash)
  11. Test: 3/4 time -- no notes at time >= 3.0 within a bar
  12. Test: Determinism -- same inputs produce same outputs on two calls
  13. Test: No two consecutive bars identical
  14. Test: Genre structural properties (per AC #2): Jazz ride > hi-hat, Rock 8th-note hats, Funk 16th hats + ghost snare, Latin has side stick, Country has cross-stick on 2 and 4

  **Verify:** `npx vitest run src/lib/drum-patterns.test.ts && npm run build`

  **Done when:** All tests pass. Build passes.

---

- [ ] **Subtask 6: Wire into midi-generator.ts** (est. 75m)

  **Context:** Read these files first: `src/lib/midi-generator.ts` (full file -- understand current generate() and generateMidiForBlock()), `src/lib/drum-patterns.ts` (from subtasks 3+4), `src/types/project.ts` (for GenerationRequest, BlockData, SectionData)

  **Creates:** Nothing
  **Modifies:** `src/lib/midi-generator.ts`

  **Steps:**
  1. Import `buildDrumMidi` from `@/lib/drum-patterns`
  2. Remove `buildJazzDrumBar`, `buildRockDrumBar`, `buildFunkDrumBar`, `buildDrumBar` (lines 155-201)
  3. Define the `DrumContext` interface (locally in midi-generator.ts, not exported)
  4. Add optional `drumContext?: DrumContext` parameter to `generateMidiForBlock`
  5. Replace the `case 'drums'` block with the new loop that calls `buildDrumMidi` per bar with full context
  6. Refactor `generate()` to loop over sections for the drum stem, creating one block per section with full DrumContext. Non-drum stems keep existing single-block behavior. Parse `beatsPerBar` from `request.time_signature`.
  7. Strip trailing numbers from section names for sectionType (e.g., "Verse 2" -> "Verse")

  **Verify:** `npm run build`

  **Done when:** `generate({ genre: 'Funk', energy: 80, ... })` returns drum blocks with genre-appropriate, energy-scaled MIDI data. Build passes.

---

- [ ] **Subtask 7: Genre config update + integration verification** (est. 30m)

  **Context:** Read these files first: `src/lib/genre-config.ts`, `src/lib/midi-generator.ts` (from subtask 6), `src/lib/drum-patterns.ts` (from subtasks 3+4)

  **Creates:** Nothing
  **Modifies:** `src/lib/genre-config.ts`

  **Steps:**
  1. Add `GENRE_DRUM_PATTERNS` mapping to `genre-config.ts` (using the data from this spec)
  2. Add `getDrumPatternId(genre, substyle)` function
  3. Export both
  4. Verify `buildDrumMidi` uses `getDrumPatternId` to select patterns (or wire this into the builder if not yet connected)
  5. Run full build and all tests

  **Verify:** `npx vitest run && npm run build`

  **Done when:** Full build passes. All vitest tests pass. Manual playback test confirms drums sound different per genre, fills appear at section boundaries, and energy slider changes drum intensity.

---

## Risk Mitigation

### Synthesized drums may sound cheap

**Accepted risk for Phase 1.** The synths will sound electronic, not acoustic. This is a known tradeoff: we are trading audio quality for instant availability, zero network dependency, and full parameter control. Phase 3 replaces synthesis with premium multi-sample playback. Phase 1 is the pattern intelligence foundation that all later phases build on.

**Mitigation:** Careful parameter tuning (the synth configs above are starting points -- expect iteration).

**Room reverb is OUT OF SCOPE for Phase 1.** Room reverb on the drum bus is a Phase 3 concern (when premium samples replace synthesis). Do not add reverb in this phase.

### Pattern data is large and tedious

Each genre needs 2+ main bars + 1+ variation + access to fills. That is approximately 20-30 `DrumHit` objects per bar x 2-3 bars x 9 genres = ~500-800 objects total.

**Mitigation:** All 9 genres are fully notated in this spec (Rock, Jazz, Funk, Blues, Country, Gospel, R&B, Latin, Pop). Copy the data exactly -- do not improvise patterns. The data entry is mechanical but the musical choices are already made.

### Breaking existing saved projects

Existing drum blocks contain MIDI data with note names C2, D2, F#2, D#3. These must continue to play.

**Mitigation:** The DrumKit class maps all existing note names to synth voices. C2 triggers the kick synth. D2 triggers the snare. F#2 triggers closed hat. D#3 triggers ride. No regression.

### MetalSynth for cymbals

Tone.js MetalSynth is notoriously difficult to make sound like a real cymbal. Hi-hats tend to sound too ringy, and crashes can sound harsh.

**Mitigation:** Use low `modulationIndex` and carefully tuned `harmonicity` to control the metallic character. Keep `octaves` low (1-2) for hats to avoid excessive ringing. Accept that cymbal synthesis is the weakest part of Phase 1 -- it improves dramatically in Phase 3 with real samples.

---

## Out of Scope for Phase 1

- Premium audio quality (Phase 3)
- LLM-generated patterns (Phase 2)
- AI audio rendering for export (Phase 4)
- Multiple kit types (jazz brushes, electronic kit)
- Per-bar manual pattern selection in the UI
- Latin percussion (congas, timbales, shaker) -- would need a 6th stem
- Supabase edge function sync (deferred)
- Sample loading from CDN or Supabase Storage
- Room reverb on drum bus (Phase 3)
