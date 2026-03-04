# Phase 3: High-Quality Multi-Sample Drum Kit

**Status:** DEFERRED (pick up after Phase 1 is validated and sounds acceptable)
**Author:** Engineering Coach (Planning Mode)
**Date:** 2026-03-03
**Estimated effort:** 16-24 hours across 6 subtasks (includes audio processing pipeline)
**Depends on:** Phase 1 (DrumKit class must exist with the voice mapping interface)

---

## Primitive 1: Self-Contained Problem Statement

Phase 1 replaces the 4-sample drum kit with an 11-voice synthesized drum kit using Tone.js MembraneSynth, NoiseSynth, and MetalSynth. While this is a major upgrade in coverage (11 voices vs. 4), synthesized drums do not sound like a real acoustic kit. MembraneSynth produces a convincing kick and toms but lacks the complex harmonic content of a real drum shell resonating. NoiseSynth produces acceptable snare "snap" but not the warm body of a real snare drum. MetalSynth is the weakest link -- cymbals are extremely difficult to synthesize convincingly and will sound noticeably electronic.

Phase 3 upgrades the DrumKit to use real multi-velocity sampled recordings of an acoustic drum kit. Each drum voice gets 6-8 velocity layers so that soft hits and loud hits produce different timbres (not just different volumes). The samples are processed with tape saturation, analog-style EQ, mild compression, and room reverb to create a warm, pre-mixed character -- the "Tom Petty / Black Keys / Tame Impala" sound the project targets.

**What this is NOT:**
- This is NOT a pattern change. The MIDI patterns from Phase 1 (or Phase 2 LLM patterns) remain the same. Only the sound engine changes.
- This is NOT a real-time download. Samples are loaded once on first play and cached in the browser.
- This is NOT multiple kit types (rock kit, jazz kit, electronic kit). Phase 3 ships ONE high-quality general-purpose kit. Additional kits can be added later.

---

## Primitive 2: Acceptance Criteria

### AC-1: Multi-velocity sample playback

Each of the 11 drum voices has at least 6 velocity layers:
- Layer 1: velocity 1-21 (pp -- very soft ghost note)
- Layer 2: velocity 22-42 (p -- soft)
- Layer 3: velocity 43-63 (mp -- medium soft)
- Layer 4: velocity 64-84 (mf -- medium)
- Layer 5: velocity 85-105 (f -- loud)
- Layer 6: velocity 106-127 (ff -- very loud, full crack)

A velocity-85 snare hit sounds distinctly different from a velocity-30 snare hit -- not just quieter, but different timbre (bright ring vs. warm thud).

### AC-2: Round-robin prevents machine-gun effect

Each velocity layer has at least 2 round-robin alternates (ideally 3). When the same drum at the same velocity is hit consecutively, the system cycles through alternates so no two consecutive hits use the same sample. This eliminates the "machine-gun" artifact that makes sampled drums sound robotic.

### AC-3: Total sample payload under 25 MB

All samples for the complete kit (11 voices x 6 velocity layers x 2-3 round robins = 132-198 samples) total less than 25 MB in the delivery format (OGG Vorbis). This is acceptable for a web application -- comparable to a single high-quality image or a short audio clip.

### AC-4: Samples are pre-mixed with warm character

The raw samples are processed through a signal chain before delivery:
1. **Tape saturation** (subtle harmonic distortion for warmth)
2. **Analog-style EQ** (cut boxiness at 300-500 Hz, add presence at 3-5 kHz, gentle high-shelf boost at 8 kHz)
3. **Light compression** (2:1 ratio, smooth attack, tame peaks without squashing dynamics)
4. **Room reverb** (short, natural room sound -- not dry, not drenched)

The result sounds like a drum kit recorded in a warm studio with good mic technique and mixed by a competent engineer.

### AC-5: Lazy loading

Samples are NOT loaded on page load. They are loaded when the user first clicks Play (or Generate). A loading indicator shows progress. After first load, samples are cached in the browser and load instantly on subsequent visits.

### AC-6: Backward compatibility with Phase 1

The sample-based kit uses the exact same GM note name interface as the Phase 1 synthesized DrumKit. All MIDI data plays correctly through the sample kit without any changes. The `triggerAttackRelease(note, duration, time, velocity)` method works identically.

### AC-7: Fallback to synthesis

If samples fail to load (network error, corrupted file), the system falls back to the Phase 1 synthesized DrumKit. The user hears synth drums rather than silence.

### AC-8: License is SaaS-safe

All source samples are CC0 (public domain) or CC-BY (attribution only). Attribution is added to the app's legal/about page as required.

---

## Primitive 3: Constraint Architecture

### Musts

1. **Must** use CC0 or CC-BY licensed samples only.
2. **Must** pre-process samples through the warm signal chain before deployment (not at runtime).
3. **Must** deliver samples in OGG Vorbis format (primary) with MP3 fallback for older Safari.
4. **Must** keep total payload under 25 MB (OGG).
5. **Must** implement lazy loading -- no samples loaded until first playback.
6. **Must** implement velocity layer selection based on MIDI velocity value.
7. **Must** implement round-robin cycling for consecutive same-velocity hits.
8. **Must** fall back to Phase 1 synthesized kit on load failure.
9. **Must** maintain the same `triggerAttackRelease(note, duration, time, velocity)` interface.

### Must-Nots

1. **Must not** use samples with GPL, CC-BY-NC, or "no redistribution" licenses.
2. **Must not** load samples from a third-party CDN at runtime (host on Supabase Storage or bundle).
3. **Must not** exceed 25 MB total delivery size for one kit.
4. **Must not** modify the `MidiNoteData` format or any types.
5. **Must not** process samples at runtime (all EQ/compression/reverb applied offline).

### Preferences

1. **Prefer** The Open Source Drumkit (public domain, 20+ velocity layers) as the primary source.
2. **Prefer** OGG Vorbis at quality 5 (~160 kbps equivalent).
3. **Prefer** Supabase Storage for hosting.
4. **Prefer** a Node.js build script for automated sample processing.

### Escalation Triggers

1. If The Open Source Drumkit is unavailable, fall back to Karoryfer Big Rusty Drums (CC0) or AVL Drumkits (CC-BY-SA).
2. If total OGG payload exceeds 25 MB, reduce to 4 velocity layers per voice.
3. If Safari does not support OGG in the target market, add MP3 fallback.

---

## Primitive 4: Decomposition

### Subtask 1: Sample Source Acquisition + Selection (3 hours)

Download source samples from The Open Source Drumkit (GitHub). Select 6 velocity layers per voice from the 20+ available. Select 2-3 round-robin alternates per layer. Organize into target directory structure.

**Target structure:**
```
samples/drums/premium-kit/
  kick/v1_r1.ogg, v1_r2.ogg, v2_r1.ogg, ...
  snare/v1_r1.ogg, v1_r2.ogg, v1_r3.ogg, ...
  sidestick/...
  closed_hat/...
  open_hat/...
  pedal_hat/...
  low_tom/...
  high_tom/...
  crash/...
  ride/...
  ride_bell/...
  manifest.json
```

### Subtask 2: Audio Processing Pipeline (4 hours)

Create `scripts/process-drum-samples.ts` that:
1. Reads source WAV samples.
2. Trims onset silence (critical for timing accuracy).
3. Normalizes to -1 dBFS peak.
4. Applies tape saturation, EQ (cut 300-500 Hz, boost 3-5 kHz), compression (2:1), room reverb (0.3s RT60).
5. Converts to OGG Vorbis (quality 5, 44.1 kHz).
6. Generates `manifest.json` with velocity ranges, round-robin counts, and file paths.

**Tools:** SoX for processing, FFmpeg for format conversion, scripted via Node.js.

### Subtask 3: Sample Hosting + Loading (3 hours)

Upload processed samples to Supabase Storage bucket `drum-samples`. Create `src/audio/sample-loader.ts` with `SampleDrumKit` class that:
- Loads manifest JSON from Supabase Storage.
- Loads all OGG files referenced in the manifest.
- Implements velocity layer selection (map MIDI velocity 0-127 to layer ranges).
- Implements round-robin cycling per voice per layer.
- Exposes same `triggerAttackRelease` interface as Phase 1 DrumKit.

### Subtask 4: Integration with Existing System (2 hours)

Modify `sampler-cache.ts`:
- Attempt to load `SampleDrumKit` first.
- On failure, fall back to Phase 1 synthesized `DrumKit`.
- Cache the loaded kit for subsequent use.

### Subtask 5: Attribution + Legal (1 hour)

Add required attribution to the app's about/legal page. For CC-BY sources, ensure attribution is visible to users.

### Subtask 6: Quality Assurance -- Manual Listening (2 hours)

Play through all 10 genres at various energy levels. Verify velocity layers, round-robin, cymbal quality, overall mix warmth.

---

## Primitive 5: Evaluation Design

### Test Case 1: Velocity Layer Switching

```
Trigger snare at velocities 20, 50, 80, 110. Each sounds audibly different in timbre.
```

### Test Case 2: Round-Robin Cycling

```
Trigger closed hat 16 times rapidly at same velocity. No two consecutive hits identical.
```

### Test Case 3: Payload Size

```
Total OGG file size < 25 MB.
```

### Test Case 4: Fallback on Load Failure

```
Set manifest URL to non-existent path. System plays Phase 1 synth drums. No crash.
```

### Test Case 5: Full Genre Playthrough (Manual)

```
Generate 8-bar arrangement for each of 10 genres. Listen. Verify drums sound appropriate,
dynamics respond to velocity, fills use toms and sound natural.
```

---

## Sample Source Comparison

| Source | License | Velocity Layers | Round Robins | Est. Web Size | Character |
|--------|---------|----------------|-------------|---------------|-----------|
| The Open Source Drumkit | Public Domain | 20+ | Multiple | 30-50 MB raw, ~20 MB OGG | Clean studio |
| Karoryfer Big Rusty Drums | CC0 | Multiple | Yes | 80-120 MB raw | Vintage warm |
| AVL Drumkits | CC-BY-SA-3.0 | 5 | Unknown | 20-40 MB raw | Rock/jazz |
| FreePats MuldjordKit | CC-BY-4.0 | Multiple | Unknown | ~53 MB SF2 | Metal/rock |

**Recommended:** The Open Source Drumkit (public domain, best legal safety, 20+ velocity layers).

---

## File Size Budget

| Voice | Layers | RR | Samples | Est. OGG |
|-------|--------|-----|---------|----------|
| Kick | 6 | 2 | 12 | 2.0 MB |
| Snare | 6 | 3 | 18 | 2.5 MB |
| Side Stick | 6 | 2 | 12 | 1.0 MB |
| Closed Hat | 6 | 3 | 18 | 1.5 MB |
| Open Hat | 6 | 2 | 12 | 2.0 MB |
| Pedal Hat | 4 | 2 | 8 | 0.8 MB |
| Low Tom | 6 | 2 | 12 | 2.0 MB |
| High Tom | 6 | 2 | 12 | 1.8 MB |
| Crash | 4 | 2 | 8 | 2.5 MB |
| Ride | 6 | 2 | 12 | 2.5 MB |
| Ride Bell | 4 | 2 | 8 | 1.5 MB |
| **Total** | | | **~132** | **~20 MB** |

---

## Open Questions

1. **One kit or multiple kits?** Phase 3 ships one general-purpose kit. Jazz brush kit and electronic kit are follow-up additions.
2. **Supabase Storage vs. bundled?** Supabase Storage recommended for lazy loading and cache control.
3. **Safari OGG support?** Safari 17+ supports OGG. Check user analytics before adding MP3 fallback.
4. **Kit selector UI?** Not needed for Phase 3 (automatic best-available selection). Future feature.
