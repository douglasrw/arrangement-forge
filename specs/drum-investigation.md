# Drum System Investigation Report

**Date:** 2026-03-03
**Status:** Investigation complete, ready for implementation planning
**Goal:** Make drums sound like a full kit playing a groove, with genre-specific patterns

---

## 1. Current State Analysis

### 1.1 Drum Samples (sampler-cache.ts)

The drum sampler is configured in `src/audio/sampler-cache.ts` (lines 36-45) as a local sampler with exactly **4 samples**:

```typescript
drums: {
  kind: "local",
  baseUrl: "/samples/drums/",
  urls: {
    C2: "kick.mp3",      // GM note 36 - Bass Drum 1
    D2: "snare.mp3",     // GM note 38 - Acoustic Snare
    "F#2": "hihat.mp3",  // GM note 42 - Closed Hi-Hat
    "D#3": "ride.mp3",   // GM note 51 - Ride Cymbal 1
  },
},
```

**Sample files** live in `/public/samples/drums/`:
- `kick.mp3` — 5.8 KB, 128 kbps, 44.1 kHz, mono
- `snare.mp3` — 4.2 KB, 128 kbps, 48 kHz, mono
- `hihat.mp3` — 2.7 KB, 128 kbps, 48 kHz, mono
- `ride.mp3` — 8.7 KB, 128 kbps, 48 kHz, mono

**Total drum sample payload: 21.6 KB.** Negligible.

**Note mapping is correct for General MIDI.** Tone.js uses the convention where MIDI note 60 = C4, so MIDI 36 = C2, MIDI 38 = D2, MIDI 42 = F#2, MIDI 51 = D#3 (= Eb3). The note names in the code are GM-compliant.

**Sample quality is poor.** These are tiny files (2.7-8.7 KB) with no velocity layers, no round-robin variations, and unknown provenance. At 128 kbps mono, they are adequate for prototyping but far below what a musician would consider acceptable for a practice tool.

### 1.2 MIDI Pattern Generation (midi-generator.ts)

The drum pattern generator in `src/lib/midi-generator.ts` has exactly **3 pattern functions** (lines 155-201):

**buildJazzDrumBar** (lines 155-167):
- Ride cymbal (D#3) on all 4 beats with alternating velocity (70/60)
- Snare (D2) on beats 2 and 4 at velocity 80
- Kick (C2) only on beat 1 of the FIRST bar (barOffset === 0)
- **Problem:** No swing feel at all. No hihat feathering. Kick only plays once in the entire song. No ghost notes. This is not jazz.

**buildRockDrumBar** (lines 169-182):
- Kick (C2) on beats 1 and 3
- Snare (D2) on beats 2 and 4
- Hihat (F#2) on all 8th notes with alternating velocity (70/50)
- **Problem:** Extremely rigid. No variation between bars. No fills. No crash cymbal on downbeats. Just a click-track-with-attitude.

**buildFunkDrumBar** (lines 184-195):
- Kick on beat 1 and the "and" of beat 2 (2.5)
- Snare on beats 2, 4, and a ghost note on the "and" of 4 (3.5)
- Hihat on all 16th notes with accent pattern
- **Problem:** The ghost note is good, but having identical 16th-note hihat with no open hats, no dynamics variance, and no bar-to-bar variation makes it lifeless.

**buildDrumBar** (lines 197-201) — the dispatcher:
```typescript
function buildDrumBar(genre: string, barOffset: number): MidiNoteData[] {
  if (genre === 'Rock' || genre === 'Blues') return buildRockDrumBar(barOffset);
  if (genre === 'Funk' || genre === 'R&B') return buildFunkDrumBar(barOffset);
  return buildJazzDrumBar(barOffset); // Jazz, Latin, Gospel, Country, Pop default
}
```

**Critical observation:** Country, Latin, Gospel, Pop, and R&B all fall through to jazz or rock patterns. The 9 genres in `genre-config.ts` produce only 3 distinct drum patterns, and those 3 patterns are rudimentary.

### 1.3 Audio Engine Playback (engine.ts)

The engine (`src/audio/engine.ts`, lines 170-198) correctly:
- Loads the drum sampler via `getSampler('drums')`
- Routes it through Gain -> Panner -> Master
- Schedules MIDI notes from block data with beat-to-seconds conversion
- Uses velocity (0-127 scaled to 0-1)

However, Tone.js Sampler does **not** support velocity layers. It only changes gain (volume) based on velocity. This means a soft snare hit and a hard snare hit sound identical except for volume. Real drums change timbre dramatically with velocity (a quiet snare is warm and round; a loud snare cracks and rings).

### 1.4 Genre Configuration (genre-config.ts)

Nine genres are defined in `GENRE_SUBSTYLES`:
Jazz, Blues, Rock, Funk, Country, Gospel, R&B, Latin, Pop

Each genre has substyles (e.g., Country has Traditional, Outlaw, Bluegrass, Country Pop, Western Swing). Each genre also has slider configuration for energy, groove, swing, and dynamics.

**But none of this configuration actually affects drum generation.** The `energy`, `groove`, `swing_pct`, and `dynamics` parameters from the GenerationRequest are completely ignored by `buildDrumBar()`. The substyle is also ignored. Only the top-level genre string is used, and only to dispatch to one of 3 patterns.

### 1.5 Supabase Edge Function (supabase/functions/generate/index.ts)

The edge function has its own simpler drum generation (lines 117-122):
```typescript
if (instrument === 'drums') {
  notes.push({ note: 'C2', time: offset, duration: 0.25, velocity: 90 });
  notes.push({ note: 'D2', time: offset + 1, duration: 0.2, velocity: 80 });
  notes.push({ note: 'C2', time: offset + 2, duration: 0.25, velocity: 85 });
  notes.push({ note: 'D2', time: offset + 3, duration: 0.2, velocity: 80 });
}
```

This is even more basic: kick-snare-kick-snare with no hihat or ride. No genre awareness at all.

### 1.6 Summary: What Currently Happens

When a user generates a song and presses play:
1. Four tiny MP3 samples load from `/public/samples/drums/`
2. One of 3 rigid patterns is selected based on genre (most genres get the jazz pattern)
3. Every bar in the song plays the identical pattern with zero variation
4. The samples play through a single Tone.js Sampler with volume-only velocity response
5. No crash cymbals, no toms, no open hihat, no ghost notes, no fills, no swing timing, no dynamic variation across sections

**The result sounds like a metronome with slightly different timbres, not a drum kit.**

---

## 2. Gap Analysis

### 2.1 Missing Drum Sounds

The GM drum map (MIDI channel 10) defines 47 percussion instruments from MIDI notes 35-81. The current implementation uses 4.

**Essential additions for a convincing kit (minimum viable kit):**

| GM Note | Tone.js Name | Sound | Priority | Why Needed |
|---------|-------------|-------|----------|------------|
| 35 | B1 | Acoustic Bass Drum | Medium | Softer kick alternative |
| 36 | C2 | Bass Drum 1 | **Have** | Main kick |
| 37 | C#2 | Side Stick | High | Essential for bossa nova, ballads, country |
| 38 | D2 | Acoustic Snare | **Have** | Main snare |
| 39 | D#2 | Hand Clap | Low | Funk/Pop accent |
| 40 | E2 | Electric Snare | Medium | Rock/pop alternative |
| 41 | F2 | Low Floor Tom | High | Fills |
| 42 | F#2 | Closed Hi-Hat | **Have** | Main hat |
| 43 | G2 | High Floor Tom | High | Fills |
| 44 | G#2 | Pedal Hi-Hat | Medium | Foot splash between hat patterns |
| 45 | A2 | Low Tom | High | Fills |
| 46 | A#2 | Open Hi-Hat | **Critical** | No open hat = no groove |
| 47 | B2 | Low-Mid Tom | Medium | Fills |
| 48 | C3 | Hi-Mid Tom | Medium | Fills |
| 49 | C#3 | Crash Cymbal 1 | **Critical** | Section transitions, downbeats |
| 50 | D3 | High Tom | Medium | Fills |
| 51 | D#3 | Ride Cymbal 1 | **Have** | Jazz ride |
| 52 | E3 | Chinese Cymbal | Low | Effect |
| 53 | F3 | Ride Bell | High | Ride bell is crucial for jazz/latin |
| 55 | G3 | Splash Cymbal | Low | Accent |
| 56 | G#3 | Cowbell | Medium | Latin/funk |
| 57 | A3 | Crash Cymbal 2 | Low | Second crash |

**Minimum viable additions: open hi-hat (A#2), crash cymbal (C#3), side stick (C#2), ride bell (F3), and at least 2 toms (F2, A2). That brings the kit from 4 to 10 sounds.**

### 2.2 Missing Pattern Intelligence

| Gap | Impact | Severity |
|-----|--------|----------|
| No bar-to-bar variation | Every bar identical = robotic | Critical |
| No fills | No musical punctuation at section boundaries | Critical |
| No swing/shuffle timing | Jazz and blues sound straight, which is wrong | Critical |
| Energy/dynamics ignored | Verse and chorus sound identical | High |
| No ghost notes except 1 in funk | Groove feels stiff | High |
| No open hihat | Rock and funk lose signature groove element | High |
| No crash on section starts | No sense of arrival or transition | High |
| Substyle ignored | "Bossa Nova" plays jazz brush swing | High |
| Only 3 patterns for 9 genres | 6 genres have wrong patterns | High |
| No section-aware dynamics | Intro should be lighter than chorus | Medium |
| No humanization (timing jitter) | Perfectly quantized = inhuman | Medium |

### 2.3 Missing Audio Quality

| Gap | Impact |
|-----|--------|
| Tiny samples (2-8 KB each) | Thin, unconvincing sound |
| No velocity layers | Soft and loud hits sound the same (just quieter) |
| No round-robin (alternating samples) | Repeated hits sound machine-gun-like |
| Inconsistent sample rates (44.1 vs 48 kHz) | Potential pitch issues |
| Unknown sample provenance | May not be the right aesthetic |
| CDN for other instruments, local for drums | Inconsistent loading strategy |

---

## 3. Recommended Approach

### 3.1 Sample Strategy: Hybrid (Synthesis + Samples)

**Recommendation: Start with synthesis, add samples as a quality upgrade.**

**Phase 1 — Synthesized drum kit using Tone.js built-in synths:**

Tone.js has three synth types purpose-built for drums:
- `Tone.MembraneSynth` — kick drums and toms (oscillator with pitch envelope)
- `Tone.NoiseSynth` — snare and hats (filtered noise with amplitude envelope)
- `Tone.MetalSynth` — cymbals, ride, hihat ring (FM synthesis of metallic tones)

A composite `DrumKit` class wraps multiple synths, one per drum voice. Each voice can have tailored parameters. This eliminates sample loading entirely for the initial implementation.

**Advantages:**
- Zero network requests for drums — instant availability
- No CDN dependency
- Full parameter control (can shape each sound precisely)
- Velocity affects synth parameters, not just volume (more realistic)
- Easy to create distinct kit "flavors" (brush kit, electronic kit, etc.)

**Disadvantages:**
- Will not sound like a real acoustic drum kit (synthesized timbres)
- Requires careful parameter tuning for each voice
- Cymbals are the hardest to synthesize convincingly

**Phase 2 — High-quality samples (post-Phase 1):**

Replace synthesis with multi-sample drum kits. Host samples in Supabase Storage (not a third-party CDN). Use 3-4 velocity layers per drum voice, 2-3 round-robin alternates.

Recommended sample sources (all CC-by or similar):
- 99Sounds Drum Samples (CC-by, high quality, multi-velocity)
- SampleSwap full kits (royalty-free)
- Self-recorded (highest control, but most effort)

**Phase 3 — Multiple kit types:**

Offer selectable kits per genre:
- Standard rock kit (deep kick, ringy snare, bright hats)
- Jazz kit (dry kick, brush snare, dark ride)
- Electronic kit (808 sounds, tight hats)
- Latin percussion kit (timbales, congas, bells alongside standard)

### 3.2 Drum Kit Architecture

```typescript
// Proposed: src/audio/drum-kit.ts

interface DrumVoice {
  name: string;
  midiNote: string;        // Tone.js note name (GM mapping)
  synth: Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth;
  params: Record<string, unknown>;  // voice-specific parameters
}

class DrumKit {
  private voices: Map<string, DrumVoice>;
  private output: Tone.Gain;

  trigger(note: string, time: number, velocity: number): void;
  connect(destination: Tone.InputNode): this;
  dispose(): void;
}
```

The kit replaces the current `Tone.Sampler` for drums. The `sampler-cache.ts` config for drums changes from `kind: "local"` to a factory that returns a `DrumKit` instance.

### 3.3 Pattern Library Architecture

```typescript
// Proposed: src/lib/drum-patterns.ts

interface DrumHit {
  note: string;            // GM note name (C2, D2, F#2, etc.)
  time: number;            // beat offset within bar (0-based)
  velocity: number;        // 0-127
  probability?: number;    // 0-1, for humanization (ghost notes, variations)
}

interface DrumPattern {
  name: string;            // e.g., "country_shuffle"
  genre: string;
  timeSignature: string;   // "4/4", "3/4", "6/8"
  subdivisions: number;    // 8 for 8th-note patterns, 16 for 16th-note patterns
  swing?: number;          // 0-1, how much to delay upbeats
  bars: DrumHit[][];       // Array of bars, each bar is array of hits
  fills?: DrumHit[][];     // Optional fill patterns (1-2 bars each)
  variations?: DrumHit[][];// Subtle variations to alternate with main pattern
}

// Pattern registry
const DRUM_PATTERNS: Record<string, DrumPattern> = { ... };

// Pattern builder function (replaces buildDrumBar)
function buildDrumMidi(
  genre: string,
  substyle: string,
  barCount: number,
  energy: number,        // 0-100
  dynamics: number,      // 0-100
  swingPct: number | null,
  sectionType: string,   // "intro", "verse", "chorus", etc.
  isFirstBar: boolean,
  isLastBar: boolean,
  nextSectionType?: string
): MidiNoteData[];
```

### 3.4 How Patterns Should Work

**Pattern selection flow:**
1. Genre + substyle determines the base pattern (e.g., "Country" + "Traditional" = country shuffle)
2. Energy level scales hit density and velocity ranges
3. Dynamics controls velocity spread (high dynamics = bigger difference between ghost notes and accents)
4. Swing percentage shifts upbeat timing
5. Section type modifies the pattern (intro = lighter, chorus = fuller)
6. Last bar of a section triggers a fill (if energy > 30)
7. First bar of a section gets a crash cymbal (if energy > 20)
8. Random variation selection prevents consecutive identical bars

**Swing implementation:**

Swing timing shifts every "upbeat" (off-beat 8th note or 16th note) later in time. A swing percentage of 50% is straight, 67% is triplet swing (standard jazz), higher values are "behind the beat."

```typescript
function applySwing(time: number, swingAmount: number, subdivision: number): number {
  const beatFraction = time % 1;
  const isUpbeat = Math.round(beatFraction * subdivision) % 2 === 1;
  if (!isUpbeat) return time;
  // Shift upbeat toward next downbeat by swing amount
  const shift = (swingAmount - 0.5) * (1 / subdivision);
  return time + shift;
}
```

---

## 4. Genre-Specific Drum Patterns

Below are pattern definitions for at least 8 genres. Time positions use beat notation where 0 = beat 1, 0.5 = the "and" of beat 1, 1 = beat 2, etc. (in 4/4 time, one bar = 4 beats). Velocity is 0-127.

### 4.1 Rock — Straight 8th

**Signature:** Kick on 1 and 3, snare on 2 and 4, hihat on 8th notes.

| Voice | Beats | Velocity | Notes |
|-------|-------|----------|-------|
| Closed HH (F#2) | 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5 | 80/60 alternating | Downbeats louder |
| Kick (C2) | 0, 2 | 100, 90 | Beat 1 slightly harder |
| Snare (D2) | 1, 3 | 95, 95 | Consistent backbeat |

**Variations:**
- High energy: add kick on "and" of 3 (2.5), open hihat on "and" of 4 (3.5)
- Low energy: hihats to quarter notes only, lower velocity overall
- Fill (last bar): toms descending (high to low) on beats 3-4 with crash on next downbeat

### 4.2 Country Shuffle

**Signature:** Swung 8th notes, cross-stick on 2 and 4, light kick on 1 and 3.

| Voice | Beats | Velocity | Notes |
|-------|-------|----------|-------|
| Closed HH (F#2) | 0, 0.33, 1, 1.33, 2, 2.33, 3, 3.33 | 70/50 | Triplet-feel swing (upbeats at 33% through beat, not 50%) |
| Kick (C2) | 0, 2 | 75, 65 | Lighter than rock |
| Side Stick (C#2) | 1, 3 | 70, 70 | Cross-stick instead of full snare |

**Substyle variations:**
- *Outlaw*: Replace cross-stick with snare, increase kick velocity
- *Bluegrass*: Faster tempo, add hihat foot on 2 and 4
- *Western Swing*: Ride cymbal instead of hihat, jazz-like brush snare
- *Country Pop*: Standard rock pattern with lighter dynamics

### 4.3 Jazz Swing

**Signature:** Ride cymbal pattern (ding-ding-da-ding), hihat foot on 2 and 4, ghost snare comping.

| Voice | Beats | Velocity | Notes |
|-------|-------|----------|-------|
| Ride (D#3) | 0, 1, 1.67, 2, 3, 3.67 | 70, 65, 55, 70, 65, 55 | Classic spang-a-lang pattern |
| Ride Bell (F3) | (occasional, beat 1 of phrase starts) | 80 | Marks phrases |
| Pedal HH (G#2) | 1, 3 | 40, 40 | Foot splash, very quiet |
| Snare (D2) | 0.67, 2.33 (ghost notes) | 30, 25 | Random ghost notes, very soft |
| Kick (C2) | 0, (random: 2.67 or 3.33) | 60, 45 | Feathered kick, very subtle |

**Key:** Swing amount should be ~67% (triplet feel). Ghost notes should use the `probability` field (0.3-0.5) so they don't play every bar.

**Substyle variations:**
- *Bebop*: Higher tempo, more active kick comping, ride bell on 1
- *Cool*: Brushes (use lighter velocity on all voices, no ride bell)
- *Modal*: Sparser, more space, pedal hihat more prominent
- *Fusion*: Straight 8ths or 16ths on hihat, more aggressive kick patterns
- *Latin Jazz*: Cross-stick pattern, no swing (straight 8ths), cascara-influenced ride

### 4.4 Blues Shuffle

**Signature:** Shuffle feel (swung 8ths), driving hihat, kick on 1 and 3, snare on 2 and 4. More aggressive than country shuffle.

| Voice | Beats | Velocity | Notes |
|-------|-------|----------|-------|
| Closed HH (F#2) | 0, 0.67, 1, 1.67, 2, 2.67, 3, 3.67 | 80/55 | Triplet swing, accented downbeats |
| Kick (C2) | 0, 2, (optional: 2.67) | 95, 85, 70 | Pickup kick adds drive |
| Snare (D2) | 1, 3 | 90, 90 | Full snare (not cross-stick) |
| Snare ghost (D2) | 0.67, 2.67 | 35, 30 | Very soft ghost notes (probability: 0.4) |

**Substyle variations:**
- *Delta*: Sparser, cross-stick instead of snare, lower velocity
- *Chicago*: Full shuffle with driving hihat
- *Texas*: Heavier kick, more aggressive
- *Jump Blues*: Faster, swing ride instead of hihat

### 4.5 Funk

**Signature:** Syncopated kick, ghost notes on snare, 16th-note hihat with open hat accents.

| Voice | Beats | Velocity | Notes |
|-------|-------|----------|-------|
| Closed HH (F#2) | Every 16th note except where open hat plays | 65/45 alternating | Tight, consistent |
| Open HH (A#2) | 1.5, 3.5 (the "and" of 2, "and" of 4) | 75 | Signature funk open hat |
| Kick (C2) | 0, 0.75, 2.5 | 100, 75, 85 | Syncopated, pickup on "e" of 1 |
| Snare (D2) | 1, 3 | 95, 95 | Backbeat |
| Snare ghost (D2) | 0.5, 1.75, 2.25, 3.75 | 30-40 | Multiple ghost notes, make it breathe |

**Substyle variations:**
- *P-Funk*: Even more syncopated kick, add cowbell (G#3) on quarter notes
- *Neo-soul*: Fewer 16ths on hat, more open hat, lower tempo feel
- *Disco*: Four-on-the-floor kick, open hat on upbeats (see 4.8)

### 4.6 Bossa Nova

**Signature:** Cross-stick pattern, bass drum ostinato, closed hihat on 8th notes. Straight feel (no swing).

| Voice | Beats | Velocity | Notes |
|-------|-------|----------|-------|
| Closed HH (F#2) | 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5 | 60/50 | Gentle, even 8th notes |
| Side Stick (C#2) | 0.5, 1.5, 2, 3.5 | 65, 55, 70, 60 | Syncopated clave-like pattern |
| Kick (C2) | 0, 1.5, 3 | 70, 60, 65 | Bass drum ostinato with anticipation |

**Key:** Bossa nova is NOT swung. Straight 8th notes. The rhythmic interest comes from the cross-stick pattern against the kick pattern.

**Substyle variations:**
- *Samba*: 16th-note hihat, more aggressive kick, faster tempo, add shaker feel
- *Bolero*: Slower, ride cymbal instead of hihat, more legato

### 4.7 Reggae (One Drop)

**Signature:** No kick on beat 1. Kick and snare together on beat 3 (the "drop"). Cross-stick on 3. Hihat on 8th notes.

| Voice | Beats | Velocity | Notes |
|-------|-------|----------|-------|
| Closed HH (F#2) | 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5 | 60/45 | Even, laid back |
| Open HH (A#2) | 1.5, 3.5 | 55, 55 | Subtle open hat on upbeats |
| Kick (C2) | 2 | 85 | The "one drop" - only on beat 3 |
| Side Stick (C#2) | 2 | 75 | Simultaneous with kick |

**Key:** The absence of a kick on beat 1 is what defines reggae. The "drop" on beat 3 is the signature.

### 4.8 Four-on-the-Floor (Pop/Dance/Disco)

**Signature:** Kick on every beat, open hihat on upbeats, snare on 2 and 4.

| Voice | Beats | Velocity | Notes |
|-------|-------|----------|-------|
| Kick (C2) | 0, 1, 2, 3 | 100, 90, 95, 90 | Every quarter note |
| Snare (D2) | 1, 3 | 90, 90 | Standard backbeat |
| Closed HH (F#2) | 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5 | 70/60 | 8th notes |
| Open HH (A#2) | 0.5, 1.5, 2.5, 3.5 | 75 | Upbeat open hats (replace closed on those beats) |

**Substyle variations:**
- *Synth Pop*: Electronic kit sounds, hi-hat on 16ths, clap instead of snare
- *Disco*: Heavier open hat emphasis
- *Indie Pop*: Lighter dynamics, less open hat

### 4.9 Gospel

**Signature:** Varies widely but often features syncopated kick, open hihat accents, and a strong backbeat with fills.

| Voice | Beats | Velocity | Notes |
|-------|-------|----------|-------|
| Closed HH (F#2) | 16th notes | 65/50 | Driving 16th-note hihat |
| Open HH (A#2) | 1.5, 3.5 | 80 | Expressive open hat |
| Kick (C2) | 0, 0.5, 2, 2.75 | 95, 70, 90, 65 | Syncopated with ghost kicks |
| Snare (D2) | 1, 3 | 100, 100 | Strong backbeat |
| Snare ghost (D2) | 0.75, 2.5 | 35, 30 | Ghost notes for swing |

**Key:** Gospel drums are often very dynamic, with big fills at transitions.

### 4.10 Latin Salsa

**Signature:** Cascara pattern on ride/bell, tumbao bass drum, and clave-aligned snare.

| Voice | Beats | Velocity | Notes |
|-------|-------|----------|-------|
| Ride Bell (F3) | 0, 0.5, 1, 1.5, 2, 3, 3.5 | 70, 55, 65, 55, 75, 65, 55 | Cascara pattern |
| Kick (C2) | 1.5, 3.5 | 75, 80 | Tumbao pattern (anticipation) |
| Side Stick (C#2) | 1, 2.5 | 65, 60 | Clave-influenced |
| Pedal HH (G#2) | 0, 1, 2, 3 | 40, 40, 40, 40 | Foot keeping time |

---

## 5. Fills and Transitions

Fills mark section transitions and add musical interest. The system needs a fill library organized by energy level.

### 5.1 Fill Structure

```typescript
interface DrumFill {
  name: string;
  energyRange: [number, number];  // min-max energy where this fill is appropriate
  duration: 1 | 2;               // bars
  hits: DrumHit[];
}
```

### 5.2 Fill Categories

**Low energy fills (energy 0-30):**
- Single snare roll into beat 1
- Cross-stick on beat 4 only
- Ride bell accent

**Medium energy fills (energy 30-60):**
- Snare hits on beats 3 and 4
- Tom descent (high tom -> low tom) on beat 4
- Hihat open -> close pattern

**High energy fills (energy 60-100):**
- 16th-note snare run across beats 3-4
- Tom cascade: high -> mid -> low -> floor tom across beats 3-4
- Full 2-bar fill: toms + snare building to crash

### 5.3 Crash Cymbal Rules

- **Section start (chorus/bridge):** Crash on beat 1, velocity 90-110 based on energy
- **Section start (verse):** Crash on beat 1, velocity 60-80 (lighter)
- **Section start (intro):** No crash (too early)
- **After a fill:** Always crash on the next beat 1
- **Never:** Crash in the middle of a section without a fill

---

## 6. Implementation Roadmap

### Phase 1: Synthesized Drum Kit (estimated effort: 1-2 days)

**Goal:** Replace the 4-sample kit with a 10+ voice synthesized kit.

**New file: `src/audio/drum-kit.ts`**
- Create a `DrumKit` class with individual synth voices:
  - Kick: `MembraneSynth` (pitchDecay: 0.05, octaves: 10, envelope: {attack: 0.001, decay: 0.4, sustain: 0, release: 0.4})
  - Snare: `NoiseSynth` (noise: {type: "white"}) + `MembraneSynth` layered
  - Side Stick: `NoiseSynth` with very short envelope and high filter
  - Closed HH: `MetalSynth` (envelope: {attack: 0.001, decay: 0.05, release: 0.01})
  - Open HH: `MetalSynth` (envelope: {attack: 0.001, decay: 0.3, release: 0.1})
  - Pedal HH: `MetalSynth` (very short, low resonance)
  - Ride: `MetalSynth` (long decay, specific harmonicity)
  - Ride Bell: `MetalSynth` (shorter, brighter)
  - Crash: `MetalSynth` (long decay, wide harmonics)
  - Low Tom: `MembraneSynth` (tuned lower)
  - High Tom: `MembraneSynth` (tuned higher)

**Modify: `src/audio/sampler-cache.ts`**
- Change drums config from `kind: "local"` to `kind: "synth"`, returning a `DrumKit` instance that exposes a Sampler-compatible interface (triggerAttackRelease).

**Acceptance:** All existing MIDI note names (C2, D2, F#2, D#3) still work. New note names (C#2, A#2, C#3, F2, A2, G#2, F3) also work.

### Phase 2: Pattern Library (estimated effort: 2-3 days)

**Goal:** Replace the 3 hardcoded patterns with a comprehensive pattern library.

**New file: `src/lib/drum-patterns.ts`**
- Define `DrumPattern` interface (as described in Section 3.3)
- Implement at least 10 base patterns (the 10 defined in Section 4)
- Implement swing timing function
- Implement energy/dynamics scaling
- Implement variation selection (2-3 variations per pattern)
- Implement fill library (3 fills per energy bracket)

**Modify: `src/lib/midi-generator.ts`**
- Replace `buildJazzDrumBar`, `buildRockDrumBar`, `buildFunkDrumBar` with a single `buildDrumMidi` function that:
  1. Selects base pattern from genre + substyle
  2. Applies energy scaling to velocity ranges
  3. Applies swing timing to note positions
  4. Alternates between main pattern and variations
  5. Inserts fills at section boundaries
  6. Adds crash cymbals at section starts

**Modify: `src/lib/genre-config.ts`**
- Add drum pattern mapping to genre configuration
- Map substyles to specific drum patterns

**Acceptance:** Each of the 9 genres produces a distinct, recognizable drum groove. Fills appear at section transitions. Energy slider audibly changes drum intensity.

### Phase 3: Humanization (estimated effort: 1 day)

**Goal:** Make patterns feel performed, not programmed.

**Additions to `src/lib/drum-patterns.ts`:**
- Timing jitter: +/- 5-15ms random offset on each hit (scaled by "groove" parameter)
- Velocity jitter: +/- 5-10 random velocity variation
- Ghost note probability: some notes only play 30-60% of the time
- Accent curves: subtle velocity increases approaching beat 1

### Phase 4: Sample Upgrade (estimated effort: 2-3 days, can be deferred)

**Goal:** Replace synthesis with high-quality multi-sample playback.

**Steps:**
1. Source or record a high-quality acoustic drum kit (10 voices, 3 velocity layers each = 30 samples)
2. Source a jazz brush kit (at least kick, snare with brushes, ride, hihat)
3. Host samples in Supabase Storage or self-host in `/public/samples/drums/`
4. Modify `DrumKit` to use `Tone.Sampler` per voice with velocity-switched sample selection
5. Add kit selection to the project model (kit_type: 'standard' | 'jazz' | 'electronic')

**Sample budget estimate:**
- 30 samples x ~20 KB average = ~600 KB per kit
- 3 kits = ~1.8 MB total
- Acceptable for a web app (loads once, cached)

### Phase 5: Edge Function Sync (estimated effort: 0.5 days)

**Goal:** Bring the Supabase edge function drum generation up to parity with the client-side generator.

The edge function (`supabase/functions/generate/index.ts`) has an even simpler drum implementation. Once the client-side pattern library is finalized, the pattern definitions should be shared or duplicated to the edge function.

---

## 7. Technical Risks and Mitigation

### 7.1 Synthesized Drums May Sound Cheap

**Risk:** MembraneSynth/NoiseSynth/MetalSynth can sound "electronic" rather than "acoustic."

**Mitigation:**
- Extensive parameter tuning (there are many knobs: pitchDecay, octaves, harmonicity, modulationIndex, resonance, envelope shape)
- Layer multiple synths per voice (e.g., snare = MembraneSynth for body + NoiseSynth for snap)
- Add subtle reverb (Tone.Reverb) to the drum bus for room feel
- Accept that Phase 1 is a stepping stone; Phase 4 samples will be the quality jump

### 7.2 Tone.js Sampler Does Not Support Velocity Layers

**Risk:** Even with samples, velocity only changes gain, not timbre.

**Mitigation:**
- Build a custom `VelocitySampler` class that holds 3-4 Tone.Sampler instances (one per velocity layer) and routes based on input velocity
- Or use Tone.Players for each velocity variant and switch manually
- This is a Phase 4 concern; Phase 1 synthesis naturally handles velocity-to-timbre mapping through synth parameters

### 7.3 Pattern Complexity Explosion

**Risk:** 9 genres x 5+ substyles x 3 energy brackets x section types = hundreds of pattern variants.

**Mitigation:**
- Use a compositional approach: base pattern + modifiers (energy scaling, swing application, fill insertion) rather than defining every permutation
- Start with 10 base patterns and 3 fill templates
- The pattern data is just arrays of numbers — easy to expand incrementally

### 7.4 Timing Precision in Web Audio

**Risk:** Browser audio scheduling can introduce latency artifacts, especially with many simultaneous drum hits.

**Mitigation:**
- Tone.js Transport scheduling (already used) handles this well
- Schedule all notes ahead of time (current approach) rather than real-time triggering
- The synthesized approach actually helps here: no sample decoding latency

### 7.5 Swing Timing Math Errors

**Risk:** Incorrectly shifting beat positions could cause notes to overlap bars or land in wrong positions.

**Mitigation:**
- Unit test swing timing extensively with known-good values (67% = triplet swing, 50% = straight)
- Clamp shifted positions to bar boundaries
- Test with actual playback at multiple tempos

### 7.6 Breaking Existing Functionality

**Risk:** Changing the drum system could break playback for existing saved projects.

**Mitigation:**
- Keep the same MIDI note name convention (C2 = kick, D2 = snare, etc.)
- New drum voices use new note names (A#2 = open hat, C#2 = side stick) that existing projects don't reference
- The DrumKit class must accept all note names that existing MIDI data uses
- Existing saved projects will play exactly as before; new generations will use the improved patterns

---

## 8. Open Questions for Discussion

1. **Kit selection UI:** Should the user be able to choose a drum kit (acoustic, jazz, electronic), or should this be automatic based on genre? The latter is simpler for MVP.

2. **Per-bar drum style override:** The SHAKEDOWN.md describes per-bar block editing where drums show a "pattern/style" (e.g., "Jazz brush swing", "Funk pocket"). How granular should the pattern library be? Should users be able to pick from a dropdown of 30+ patterns, or keep it to 3-5 per genre?

3. **Fill placement:** Should fills be automatic (always at section boundaries) or user-controlled (a "fill" toggle on specific bars)? Automatic is simpler and covers 90% of use cases.

4. **Brush sounds:** Jazz with brushes requires a fundamentally different kit (brush snare, brush ride pattern). Is this a substyle variant or a separate kit? Separate kit is cleaner.

5. **Latin percussion:** Bossa nova and salsa really want additional percussion (shaker, guiro, cowbell, clave). These are not standard drum kit sounds. Should they be generated as part of the drum stem, or would they need a sixth "percussion" stem?

---

## Appendix A: General MIDI Drum Map (Relevant Subset)

Tone.js note names using C4 = MIDI 60 convention:

| MIDI # | Tone.js Note | GM Sound | Current Status |
|--------|-------------|----------|----------------|
| 35 | B1 | Acoustic Bass Drum | Not mapped |
| 36 | C2 | Bass Drum 1 | **Mapped (kick.mp3)** |
| 37 | C#2 | Side Stick | Not mapped |
| 38 | D2 | Acoustic Snare | **Mapped (snare.mp3)** |
| 39 | D#2 | Hand Clap | Not mapped |
| 40 | E2 | Electric Snare | Not mapped |
| 41 | F2 | Low Floor Tom | Not mapped |
| 42 | F#2 | Closed Hi-Hat | **Mapped (hihat.mp3)** |
| 43 | G2 | High Floor Tom | Not mapped |
| 44 | G#2 | Pedal Hi-Hat | Not mapped |
| 45 | A2 | Low Tom | Not mapped |
| 46 | A#2 | Open Hi-Hat | Not mapped |
| 47 | B2 | Low-Mid Tom | Not mapped |
| 48 | C3 | Hi-Mid Tom | Not mapped |
| 49 | C#3 | Crash Cymbal 1 | Not mapped |
| 50 | D3 | High Tom | Not mapped |
| 51 | D#3 | Ride Cymbal 1 | **Mapped (ride.mp3)** |
| 53 | F3 | Ride Bell | Not mapped |
| 55 | G3 | Splash Cymbal | Not mapped |
| 56 | G#3 | Cowbell | Not mapped |
| 57 | A3 | Crash Cymbal 2 | Not mapped |

## Appendix B: File Impact Summary

| File | Action | Phase |
|------|--------|-------|
| `src/audio/drum-kit.ts` | **Create** | Phase 1 |
| `src/audio/sampler-cache.ts` | Modify (add synth drum kit support) | Phase 1 |
| `src/audio/engine.ts` | Modify (handle DrumKit vs Sampler) | Phase 1 |
| `src/lib/drum-patterns.ts` | **Create** | Phase 2 |
| `src/lib/midi-generator.ts` | Modify (replace buildDrumBar functions) | Phase 2 |
| `src/lib/genre-config.ts` | Modify (add drum pattern mappings) | Phase 2 |
| `supabase/functions/generate/index.ts` | Modify (sync drum patterns) | Phase 5 |
| `public/samples/drums/*` | Remove (replaced by synthesis) | Phase 1 |
| `src/types/project.ts` | No change (MidiNoteData format unchanged) | -- |
