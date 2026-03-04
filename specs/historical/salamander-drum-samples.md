# Salamander Drum Sample Integration

> Execution queue — 3 tasks, estimated ~45 minutes total

## Pre-flight Checklist

- [x] Read this entire spec before starting any task
- [x] Verify `ffmpeg` is installed (`ffmpeg -version`)
- [x] Verify Salamander samples exist at `/tmp/drum-audition/salamander/stage/salamander_drumkit_v1/OH/`
- [x] Read `src/audio/drum-kit.ts` to confirm `DrumKitLike` interface and `NOTE_MAP` match this spec

## Agent Protocol

- Execute tasks sequentially (T2 depends on T1's output files, T3 depends on T2)
- After each task: run verification steps before marking complete
- Full test suite: `npm run build` (no unit tests exist for audio layer yet)
- Commit each task separately: `SalamanderDrums-T{n}: {title}`

## Context

### Problem Statement

The drum kit in Arrangement Forge uses synthesized sounds (MetalSynth, MembraneSynth, NoiseSynth via Tone.js). These sound robotic and unrealistic — the snare in particular sounds nothing like a real snare. For a backing track tool aimed at practicing musicians, this undermines the core value proposition. The fix: replace synthesis with real recorded samples from the Salamander Drumkit (CC BY-SA 3.0, custom birch shell acoustic kit).

### Current State

- **`src/audio/drum-kit.ts`** — `DrumKit` class (synthesized) + `DrumKitLike` interface + `NOTE_MAP` + voice definitions
- **`src/audio/sampler-cache.ts`** — Singleton cache; drums special-cased as `kind: "synth"` which instantiates `DrumKit`
- **`src/audio/engine.ts`** — Uses `DrumKitLike` interface for drum playback, calls `getDrumKit()` for sub-mix access
- **`src/components/mixer/MixerDrawer.tsx`** — Drum sub-mix UI calls `drumKit.setVoiceGroupGain()`
- **Salamander WAVs** extracted at `/tmp/drum-audition/salamander/stage/salamander_drumkit_v1/OH/` (538 files, ~480MB)

### Target State

- 96 unique OGG Vorbis samples in `public/samples/drums/salamander/` (~5MB total)
- New `SampledDrumKit` class implementing `DrumKitLike` with velocity layers + round-robin
- Synth `DrumKit` class deleted from `drum-kit.ts` (interface and constants preserved)
- All existing playback, sub-mix, and MIDI generation code unchanged

### MIDI Note → Voice → Sample Mapping

The MIDI generator outputs these drum notes. Each maps to a Salamander voice:

| MIDI Note | Voice Name | Salamander Source | Sample Prefix | Notes |
|---|---|---|---|---|
| C2 | kick | kick | `kick` | |
| C#2 | sideStick | snareStick | `sidestick` | |
| D2 | snare | snare | `snare` | |
| F2 | lowFloorTom | loTom | `tom-lo` | Shares samples with lowTom |
| F#2 | closedHiHat | hihatClosed | `hihat-closed` | |
| G#2 | pedalHiHat | hihatClosed | `hihat-closed` | Shares samples with closedHiHat |
| A2 | lowTom | loTom | `tom-lo` | Shares samples with lowFloorTom |
| A#2 | openHiHat | hihatOpen | `hihat-open` | |
| C#3 | crash | crash1 | `crash` | |
| D3 | highTom | hiTom | `tom-hi` | |
| D#3 | ride | ride1 | `ride` | |
| F3 | rideBell | ride1Bell | `ride-bell` | |

**Shared mappings:** pedalHiHat uses closedHiHat samples. lowTom and lowFloorTom both use loTom samples. This is correct — Salamander has a 2-tom kit mapped to 3 voice slots.

### Velocity Layer Design

Two layers per voice, split at velocity 96:
- **Medium (med):** velocity 1-95 → 5 round-robin samples
- **Hard (hard):** velocity 96-127 → 5 round-robin samples

Round-robin cycles sequentially (1→2→3→4→5→1→...) per voice per layer, reset on each new arrangement load.

### Constraints

- **Must not** change the MIDI generator, drum patterns, or note mapping
- **Must not** change the `DrumKitLike` interface
- **Must not** change engine.ts's usage of `getDrumKit()` or `triggerAttackRelease`
- **Must** preserve voice group system (kick, snare, hihat, cymbals, toms) for sub-mix
- **Must** preserve hi-hat choke behavior (closedHiHat/pedalHiHat stops ringing openHiHat)
- **Must** include CC BY-SA 3.0 attribution in the samples directory
- **Must not** add any npm dependencies — Tone.js already supports OGG playback via `Tone.Player`/`Tone.ToneAudioBuffer`

---

## Delegation Strategy

### File Overlap Map

| File | T1 | T2 | T3 |
|---|---|---|---|
| `public/samples/drums/salamander/*.ogg` | **create** | — | — |
| `public/samples/drums/salamander/LICENSE` | **create** | — | — |
| `src/audio/sampled-drum-kit.ts` | — | **create** | — |
| `src/audio/drum-kit.ts` | — | — | **write** (strip synth class) |
| `src/audio/sampler-cache.ts` | — | — | **write** (swap to SampledDrumKit) |

### Batch Assignments

| Batch | Tasks | Agent Prompt |
|---|---|---|
| 1 | T1-T3 | "Read specs/salamander-drum-samples.md. Execute all tasks." |

Single batch — all tasks are sequential, total file count is small, and the agent needs T1's output to verify T2.

---

## Task Queue

---

### [x] T1 — Curate and convert Salamander samples to OGG

**Files:** `public/samples/drums/salamander/` (new directory, 96 OGG files + LICENSE)
**Depends on:** none

**Background:** The full Salamander Drumkit has 538 WAV samples at `/tmp/drum-audition/salamander/stage/salamander_drumkit_v1/OH/`. We need exactly 96 files (10 voices × 2 velocity layers × 5 round-robin, but only 96 unique source files due to some voices having fewer samples — see notes below), converted to OGG Vorbis and renamed to a clean convention.

**What to build:**

**Step 1 — Create the output directory.**

```bash
mkdir -p public/samples/drums/salamander
```

**Step 2 — Convert and rename each sample.**

Use ffmpeg to convert WAV → OGG Vorbis at quality 5 (~128kbps). The naming convention is:

```
{voice}-{layer}-{n}.ogg
```

Where `voice` is from the table below, `layer` is `med` or `hard`, and `n` is 1-5.

**Complete source → destination mapping:**

```
# kick (10 files)
OH/kick_OH_F_1.wav   → kick-med-1.ogg
OH/kick_OH_F_2.wav   → kick-med-2.ogg
OH/kick_OH_F_3.wav   → kick-med-3.ogg
OH/kick_OH_F_4.wav   → kick-med-4.ogg
OH/kick_OH_F_5.wav   → kick-med-5.ogg
OH/kick_OH_FF_1.wav  → kick-hard-1.ogg
OH/kick_OH_FF_2.wav  → kick-hard-2.ogg
OH/kick_OH_FF_3.wav  → kick-hard-3.ogg
OH/kick_OH_FF_4.wav  → kick-hard-4.ogg
OH/kick_OH_FF_5.wav  → kick-hard-5.ogg

# snare (10 files)
OH/snare_OH_F_1.wav  → snare-med-1.ogg
OH/snare_OH_F_2.wav  → snare-med-2.ogg
OH/snare_OH_F_3.wav  → snare-med-3.ogg
OH/snare_OH_F_4.wav  → snare-med-4.ogg
OH/snare_OH_F_5.wav  → snare-med-5.ogg
OH/snare_OH_FF_1.wav → snare-hard-1.ogg
OH/snare_OH_FF_2.wav → snare-hard-2.ogg
OH/snare_OH_FF_3.wav → snare-hard-3.ogg
OH/snare_OH_FF_4.wav → snare-hard-4.ogg
OH/snare_OH_FF_5.wav → snare-hard-5.ogg

# hihat-closed (10 files)
OH/hihatClosed_OH_P_1.wav → hihat-closed-med-1.ogg
OH/hihatClosed_OH_P_2.wav → hihat-closed-med-2.ogg
OH/hihatClosed_OH_P_3.wav → hihat-closed-med-3.ogg
OH/hihatClosed_OH_P_4.wav → hihat-closed-med-4.ogg
OH/hihatClosed_OH_P_5.wav → hihat-closed-med-5.ogg
OH/hihatClosed_OH_F_1.wav → hihat-closed-hard-1.ogg
OH/hihatClosed_OH_F_2.wav → hihat-closed-hard-2.ogg
OH/hihatClosed_OH_F_3.wav → hihat-closed-hard-3.ogg
OH/hihatClosed_OH_F_4.wav → hihat-closed-hard-4.ogg
OH/hihatClosed_OH_F_5.wav → hihat-closed-hard-5.ogg

# hihat-open (10 files)
OH/hihatOpen_OH_F_1.wav  → hihat-open-med-1.ogg
OH/hihatOpen_OH_F_2.wav  → hihat-open-med-2.ogg
OH/hihatOpen_OH_F_3.wav  → hihat-open-med-3.ogg
OH/hihatOpen_OH_F_4.wav  → hihat-open-med-4.ogg
OH/hihatOpen_OH_F_5.wav  → hihat-open-med-5.ogg
OH/hihatOpen_OH_FF_1.wav → hihat-open-hard-1.ogg
OH/hihatOpen_OH_FF_2.wav → hihat-open-hard-2.ogg
OH/hihatOpen_OH_FF_3.wav → hihat-open-hard-3.ogg
OH/hihatOpen_OH_FF_4.wav → hihat-open-hard-4.ogg
OH/hihatOpen_OH_FF_5.wav → hihat-open-hard-5.ogg

# ride (9 unique files — only 4 FF samples exist)
OH/ride1_OH_MP_1.wav → ride-med-1.ogg
OH/ride1_OH_MP_2.wav → ride-med-2.ogg
OH/ride1_OH_MP_3.wav → ride-med-3.ogg
OH/ride1_OH_MP_4.wav → ride-med-4.ogg
OH/ride1_OH_MP_5.wav → ride-med-5.ogg
OH/ride1_OH_FF_1.wav → ride-hard-1.ogg
OH/ride1_OH_FF_2.wav → ride-hard-2.ogg
OH/ride1_OH_FF_3.wav → ride-hard-3.ogg
OH/ride1_OH_FF_4.wav → ride-hard-4.ogg
# ride-hard-5.ogg: copy ride-hard-1.ogg (only 4 FF samples exist)

# ride-bell (6 unique files — single velocity layer, split across med/hard)
OH/ride1Bell_OH_F_1.wav → ride-bell-med-1.ogg
OH/ride1Bell_OH_F_2.wav → ride-bell-med-2.ogg
OH/ride1Bell_OH_F_3.wav → ride-bell-med-3.ogg
OH/ride1Bell_OH_F_4.wav → ride-bell-med-4.ogg
OH/ride1Bell_OH_F_5.wav → ride-bell-med-5.ogg
OH/ride1Bell_OH_F_2.wav → ride-bell-hard-1.ogg
OH/ride1Bell_OH_F_3.wav → ride-bell-hard-2.ogg
OH/ride1Bell_OH_F_4.wav → ride-bell-hard-3.ogg
OH/ride1Bell_OH_F_5.wav → ride-bell-hard-4.ogg
OH/ride1Bell_OH_F_6.wav → ride-bell-hard-5.ogg

# crash (10 files)
OH/crash1_OH_P_1.wav  → crash-med-1.ogg
OH/crash1_OH_P_2.wav  → crash-med-2.ogg
OH/crash1_OH_P_3.wav  → crash-med-3.ogg
OH/crash1_OH_P_4.wav  → crash-med-4.ogg
OH/crash1_OH_P_5.wav  → crash-med-5.ogg
OH/crash1_OH_FF_1.wav → crash-hard-1.ogg
OH/crash1_OH_FF_2.wav → crash-hard-2.ogg
OH/crash1_OH_FF_3.wav → crash-hard-3.ogg
OH/crash1_OH_FF_4.wav → crash-hard-4.ogg
OH/crash1_OH_FF_5.wav → crash-hard-5.ogg

# sidestick (10 files — single velocity layer, split 1-5 med / 6-10 hard)
OH/snareStick_OH_F_1.wav  → sidestick-med-1.ogg
OH/snareStick_OH_F_2.wav  → sidestick-med-2.ogg
OH/snareStick_OH_F_3.wav  → sidestick-med-3.ogg
OH/snareStick_OH_F_4.wav  → sidestick-med-4.ogg
OH/snareStick_OH_F_5.wav  → sidestick-med-5.ogg
OH/snareStick_OH_F_6.wav  → sidestick-hard-1.ogg
OH/snareStick_OH_F_7.wav  → sidestick-hard-2.ogg
OH/snareStick_OH_F_8.wav  → sidestick-hard-3.ogg
OH/snareStick_OH_F_9.wav  → sidestick-hard-4.ogg
OH/snareStick_OH_F_10.wav → sidestick-hard-5.ogg

# tom-hi (10 files)
OH/hiTom_OH_F_1.wav  → tom-hi-med-1.ogg
OH/hiTom_OH_F_2.wav  → tom-hi-med-2.ogg
OH/hiTom_OH_F_3.wav  → tom-hi-med-3.ogg
OH/hiTom_OH_F_4.wav  → tom-hi-med-4.ogg
OH/hiTom_OH_F_5.wav  → tom-hi-med-5.ogg
OH/hiTom_OH_FF_1.wav → tom-hi-hard-1.ogg
OH/hiTom_OH_FF_2.wav → tom-hi-hard-2.ogg
OH/hiTom_OH_FF_3.wav → tom-hi-hard-3.ogg
OH/hiTom_OH_FF_4.wav → tom-hi-hard-4.ogg
OH/hiTom_OH_FF_5.wav → tom-hi-hard-5.ogg

# tom-lo (10 files)
OH/loTom_OH_MP_1.wav → tom-lo-med-1.ogg
OH/loTom_OH_MP_2.wav → tom-lo-med-2.ogg
OH/loTom_OH_MP_3.wav → tom-lo-med-3.ogg
OH/loTom_OH_MP_4.wav → tom-lo-med-4.ogg
OH/loTom_OH_MP_5.wav → tom-lo-med-5.ogg
OH/loTom_OH_FF_1.wav → tom-lo-hard-1.ogg
OH/loTom_OH_FF_2.wav → tom-lo-hard-2.ogg
OH/loTom_OH_FF_3.wav → tom-lo-hard-3.ogg
OH/loTom_OH_FF_4.wav → tom-lo-hard-4.ogg
OH/loTom_OH_FF_5.wav → tom-lo-hard-5.ogg
```

The ffmpeg command for each conversion:
```bash
ffmpeg -i "<source>.wav" -c:a libvorbis -q:a 5 "<dest>.ogg"
```

Write a shell loop to process all conversions. The source directory is:
`/tmp/drum-audition/salamander/stage/salamander_drumkit_v1/OH/`

For the ride-hard-5.ogg duplicate: convert ride1_OH_FF_1.wav to ride-hard-5.ogg (it will be a separate file, identical content to ride-hard-1.ogg).

For ride-bell-hard-1 through 4: these reuse the same source WAVs as some ride-bell-med files. Convert each independently — the OGG files will be byte-different due to encoding, which is fine.

**Step 3 — Create LICENSE file.**

Create `public/samples/drums/salamander/LICENSE`:

```
Salamander Drumkit by Alexander Holm
Licensed under Creative Commons Attribution-ShareAlike 3.0 (CC BY-SA 3.0)
https://creativecommons.org/licenses/by-sa/3.0/

The "share-alike" condition applies only to modifications of the samples
themselves or new sample libraries derived from them. Produced music and
other non-sample-library works can be licensed at will.

Original source: https://archive.org/details/SalamanderDrumkit
Repository: https://github.com/sfzinstruments/SalamanderDrumkit
```

**Verify:**

Compilation:
```
ls public/samples/drums/salamander/*.ogg | wc -l
# Expect: 100 (10 voices × 2 layers × 5 round-robin)
```

Behavioral:
```
# Spot-check that OGG files are valid and reasonable size
file public/samples/drums/salamander/snare-hard-1.ogg
# Expect: "Ogg data, Vorbis audio..."

du -sh public/samples/drums/salamander/
# Expect: roughly 3-6 MB total
```

---

### [x] T2 — Create SampledDrumKit class

**Files:** `src/audio/sampled-drum-kit.ts` (new file)
**Depends on:** T1

**Background:** The current `DrumKit` class in `drum-kit.ts` implements `DrumKitLike` using Tone.js synthesizers. We need a new class that implements the same interface but loads OGG samples from `public/samples/drums/salamander/` and handles velocity layer selection + round-robin.

**What to build:**

**Step 1 — Read `src/audio/drum-kit.ts` first.**

Confirm the `DrumKitLike` interface has these methods:
- `triggerAttackRelease(note: string, duration: number | string, time?: number, velocity?: number): void`
- `releaseAll(): void`
- `connect(destination: Tone.InputNode): this`
- `disconnect(): this`
- `setVoiceGroupGain(groupName: string, gain: number): void`
- `getVoiceGroups(): { name: string; label: string; voices: string[] }[]`
- `dispose(): void`

Also confirm the `NOTE_MAP` constant (maps MIDI notes like `C2` to voice names like `kick`).

**Step 2 — Create `src/audio/sampled-drum-kit.ts`.**

```typescript
import * as Tone from 'tone'
import type { DrumKitLike } from './drum-kit'

// NOTE_MAP imported from drum-kit.ts (will be kept there in T3)
// Or duplicated here if cleaner — agent's choice based on reading drum-kit.ts
```

**Constants to define:**

```typescript
const SAMPLE_BASE_URL = '/samples/drums/salamander'

// Voices that have unique sample sets (10 sample-voices)
const SAMPLE_VOICES = [
  'kick', 'snare', 'hihat-closed', 'hihat-open',
  'ride', 'ride-bell', 'crash', 'sidestick',
  'tom-hi', 'tom-lo',
] as const

type SampleVoice = typeof SAMPLE_VOICES[number]

const LAYERS = ['med', 'hard'] as const
const RR_COUNT = 5
const VELOCITY_THRESHOLD = 96 // >= 96 = hard, < 96 = med

// Map from drum-kit voice names (used in NOTE_MAP) to sample voice names
const VOICE_TO_SAMPLE: Record<string, SampleVoice> = {
  kick: 'kick',
  snare: 'snare',
  closedHiHat: 'hihat-closed',
  openHiHat: 'hihat-open',
  pedalHiHat: 'hihat-closed',    // shared with closedHiHat
  ride: 'ride',
  rideBell: 'ride-bell',
  crash: 'crash',
  sideStick: 'sidestick',
  highTom: 'tom-hi',
  lowTom: 'tom-lo',
  lowFloorTom: 'tom-lo',          // shared with lowTom
}

// Voice groups for sub-mix (same groups as synth DrumKit)
const VOICE_GROUPS = [
  { name: 'kick',    label: 'Kick',    voices: ['kick'] },
  { name: 'snare',   label: 'Snare',   voices: ['snare', 'sideStick'] },
  { name: 'hihat',   label: 'Hi-Hat',  voices: ['closedHiHat', 'openHiHat', 'pedalHiHat'] },
  { name: 'cymbals', label: 'Cymbals', voices: ['ride', 'rideBell', 'crash'] },
  { name: 'toms',    label: 'Toms',    voices: ['highTom', 'lowTom', 'lowFloorTom'] },
]

// Hi-hat choke: these voices stop any ringing openHiHat
const HIHAT_CHOKE_TRIGGERS = new Set(['closedHiHat', 'pedalHiHat'])
```

**Class design:**

```typescript
export class SampledDrumKit implements DrumKitLike {
  private players: Map<string, Tone.Player> = new Map()
  // key = "{sampleVoice}-{layer}-{n}" e.g. "kick-med-1"

  private gainNodes: Map<string, Tone.Gain> = new Map()
  // One gain per drum-kit voice name (kick, snare, closedHiHat, etc.)
  // Multiple voice names may share the same gain if they're in the same group

  private groupGains: Map<string, Tone.Gain> = new Map()
  // One gain per voice group (kick, snare, hihat, cymbals, toms)

  private outputGain: Tone.Gain
  // Master output before connect()

  private rrCounters: Map<string, number> = new Map()
  // Round-robin counter per "{sampleVoice}-{layer}"

  private loaded = false

  constructor() {
    this.outputGain = new Tone.Gain(1)
    // Create group gains → connect to outputGain
    // Create per-voice gains → connect to appropriate group gain
  }

  async load(): Promise<void> {
    // For each SAMPLE_VOICE × LAYER × RR_COUNT:
    //   Create a Tone.Player with url = `${SAMPLE_BASE_URL}/${voice}-${layer}-${n}.ogg`
    //   Connect player → per-voice gain (looked up via VOICE_TO_SAMPLE reverse)
    //   Store in this.players map
    //
    // Use Tone.ToneAudioBuffer.loaded() or Promise.all to wait for all buffers
    // Set this.loaded = true when done
  }

  triggerAttackRelease(
    note: string,
    duration: number | string,
    time?: number,
    velocity?: number
  ): void {
    if (!this.loaded) return

    const voiceName = NOTE_MAP[note]
    if (!voiceName) return

    const sampleVoice = VOICE_TO_SAMPLE[voiceName]
    if (!sampleVoice) return

    // Hi-hat choke: if this is a closedHiHat or pedalHiHat, stop openHiHat
    if (HIHAT_CHOKE_TRIGGERS.has(voiceName)) {
      this.stopVoice('hihat-open')
    }

    // Select velocity layer
    const vel = velocity ?? 100
    const layer = vel >= VELOCITY_THRESHOLD ? 'hard' : 'med'

    // Advance round-robin counter
    const rrKey = `${sampleVoice}-${layer}`
    const currentRR = (this.rrCounters.get(rrKey) ?? 0) % RR_COUNT
    this.rrCounters.set(rrKey, currentRR + 1)

    // Get player and trigger
    const playerKey = `${sampleVoice}-${layer}-${currentRR + 1}`
    const player = this.players.get(playerKey)
    if (player?.loaded) {
      // Stop if already playing (for repeated hits)
      player.stop(time)
      player.start(time)
    }
  }

  releaseAll(): void {
    this.players.forEach(p => { try { p.stop() } catch {} })
  }

  connect(destination: Tone.InputNode): this {
    this.outputGain.connect(destination)
    return this
  }

  disconnect(): this {
    this.outputGain.disconnect()
    return this
  }

  setVoiceGroupGain(groupName: string, gain: number): void {
    const groupGain = this.groupGains.get(groupName)
    if (groupGain) groupGain.gain.value = gain
  }

  getVoiceGroups() {
    return VOICE_GROUPS
  }

  dispose(): void {
    this.players.forEach(p => p.dispose())
    this.gainNodes.forEach(g => g.dispose())
    this.groupGains.forEach(g => g.dispose())
    this.outputGain.dispose()
    this.players.clear()
    this.gainNodes.clear()
    this.groupGains.clear()
  }

  private stopVoice(sampleVoice: SampleVoice): void {
    // Stop all players for this sample voice (both layers, all RR)
    for (const layer of LAYERS) {
      for (let n = 1; n <= RR_COUNT; n++) {
        const key = `${sampleVoice}-${layer}-${n}`
        const player = this.players.get(key)
        try { player?.stop() } catch {}
      }
    }
  }
}
```

**Key implementation details:**

1. **Signal chain:** Each `Tone.Player` → per-voice `Tone.Gain` → group `Tone.Gain` → `outputGain` → (external connection from engine.ts)

2. **Per-voice gains:** Multiple drum-kit voices that share the same sample voice (e.g., `pedalHiHat` and `closedHiHat` both use `hihat-closed` samples) still get separate per-voice gain nodes if they belong to the same voice group. However, since they share the same group gain, sub-mix control works correctly.

3. **Player routing:** When creating players, route each player through the gain node for the drum-kit voice that will trigger it. Since `pedalHiHat` and `closedHiHat` both trigger `hihat-closed` samples, the players connect to the `hihat` group gain.

4. **Round-robin state:** Counters reset to 0 in a `resetRoundRobin()` method called during `load()`. The agent may also expose this for the engine to call on arrangement reload.

**Verify:**

Compilation:
```
npm run build
```

Behavioral:
```
Verify the file exists and exports SampledDrumKit:
  grep "export class SampledDrumKit" src/audio/sampled-drum-kit.ts
Verify it implements DrumKitLike:
  grep "implements DrumKitLike" src/audio/sampled-drum-kit.ts
```

---

### [x] T3 — Wire SampledDrumKit into engine + remove synth DrumKit

**Files:** `src/audio/drum-kit.ts` (modify), `src/audio/sampler-cache.ts` (modify)
**Depends on:** T2

**Background:** `sampler-cache.ts` currently instantiates the synth `DrumKit` class when `instrument === 'drums'`. It needs to instantiate `SampledDrumKit` instead and call its async `load()` method. The synth `DrumKit` class in `drum-kit.ts` should be removed, but the `DrumKitLike` interface, `NOTE_MAP`, and related type exports must be preserved.

**What to build:**

**Step 1 — Read both files first.**

Read `src/audio/drum-kit.ts` and `src/audio/sampler-cache.ts`. Confirm the current drum loading path:
- `sampler-cache.ts` has a `drums` entry with `kind: "synth"`
- It creates a `DrumKit()`, calls `drumKit.connect(...)`, casts to `Tone.Sampler`
- `engine.ts` uses `getDrumKit()` which checks for `DrumKitLike` interface via duck typing

**Step 2 — Strip `drum-kit.ts` down to interface + constants.**

Remove the entire `DrumKit` class (the synth implementation) and all its helper code (individual voice synths, parameter mapping, etc.). Keep:
- The `DrumKitLike` interface export
- The `NOTE_MAP` export
- Any type exports used by other files

The file should go from ~590 lines to ~50-70 lines.

**Step 3 — Update `sampler-cache.ts`.**

Replace the synth drum instantiation with `SampledDrumKit`:

```typescript
import { SampledDrumKit } from './sampled-drum-kit'
```

In the drum loading path:
1. Create `new SampledDrumKit()`
2. Call `await drumKit.load()` to preload all OGG samples
3. Return it (the cast to `Tone.Sampler` via `unknown` should still work since `SampledDrumKit` implements the same `triggerAttackRelease` signature)

The `load()` is async, so verify the loading path in `sampler-cache.ts` already uses `await` (it does for Tone.Sampler loading). If the drum path was synchronous before, make it async.

**Step 4 — Remove dead imports.**

Remove the `DrumKit` import from `sampler-cache.ts`. Check that no other file imports `DrumKit` (only `DrumKitLike` should be imported elsewhere, from `drum-kit.ts`).

**Step 5 — Verify no other files reference the deleted synth code.**

Search for imports of `DrumKit` (not `DrumKitLike`) across the codebase. The only consumer should have been `sampler-cache.ts`, now updated.

**Verify:**

Compilation:
```
npm run build
# Must pass with 0 errors. The synth DrumKit is gone — if anything still imports it, build fails.
```

Behavioral:
```
1. Run `npm run dev`
2. Open the app in browser (http://localhost:5173)
3. Load or generate an arrangement
4. Press Play
5. Listen: drums should play Salamander samples (realistic acoustic sound, not synthesized)
6. In the mixer, expand the drum sub-mix panel
7. Adjust the Kick slider — kick volume should change
8. Adjust the Hi-Hat slider — hi-hat volume should change
9. Listen to a section with both open and closed hi-hat: closed hi-hat should choke (cut short) any ringing open hi-hat
```

---

## Completion Check

When all boxes are checked, run:

```
npm run build
```

Then perform the behavioral smoke test:

1. Open the app, load/generate an arrangement
2. Press Play — all drum voices should be realistic acoustic samples
3. Listen for velocity dynamics: the snare should hit harder on accented beats
4. Listen for round-robin: repeated hi-hat hits should sound natural, not identical
5. Open drum sub-mix, adjust voice group sliders — each group responds independently
6. Confirm the app loads in <5 seconds (samples are small OGG files)

## Intent Trace

### Structural

- [x] `triggerAttackRelease` in `SampledDrumKit` selects velocity layer based on `velocity >= 96` → `src/audio/sampled-drum-kit.ts`
- [x] Round-robin counter advances per-voice per-layer on each hit → `src/audio/sampled-drum-kit.ts`
- [x] `HIHAT_CHOKE_TRIGGERS` set causes `closedHiHat`/`pedalHiHat` to stop `openHiHat` players → `src/audio/sampled-drum-kit.ts`
- [x] `sampler-cache.ts` creates `SampledDrumKit` (not synth `DrumKit`) for `drums` instrument → `src/audio/sampler-cache.ts`
- [x] `drum-kit.ts` no longer contains any synth class — only `DrumKitLike` interface and `NOTE_MAP` → `src/audio/drum-kit.ts`
- [x] OGG sample files are served from `public/samples/drums/salamander/` → verify files exist

### Behavioral

- [ ] Play an arrangement — drums sound like a real acoustic kit (birch shell kit), not synthesized
- [ ] Repeated snare hits within a bar sound slightly different from each other (round-robin working)
- [ ] Accented beats sound louder and punchier than ghost notes (velocity layers working)
- [ ] Adjusting the Kick sub-mix slider affects only the kick volume, not snare or hi-hat

## Archive

When complete:
1. Commit final verification: `intent-trace: verified`
2. Move this spec to `specs/historical/salamander-drum-samples.md`
3. Clean up temp files: `rm -rf /tmp/drum-audition/`
4. Update ARTIFACT_TRACKER.md: move from Ready to Execute → Recently Completed
