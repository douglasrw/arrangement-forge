# ElevenLabs Music API: Drum Implementation Feasibility Report

**Date:** 2026-03-03
**Status:** Research complete -- recommendation included
**Goal:** Determine if ElevenLabs Music API can generate isolated, record-ready drum audio for Arrangement Forge, and design the integration if viable.

---

## Table of Contents

1. [ElevenLabs Music API Deep Dive](#1-elevenlabs-music-api-deep-dive)
2. [Can It Generate Isolated Drums?](#2-can-it-generate-isolated-drums)
3. [Integration Architecture](#3-integration-architecture)
4. [Feasibility Assessment](#4-feasibility-assessment)
5. [Alternative APIs](#5-alternative-apis)
6. [Proof of Concept Design](#6-proof-of-concept-design)
7. [Cost Analysis](#7-cost-analysis)
8. [Risk Assessment](#8-risk-assessment)
9. [Recommendation](#9-recommendation)

---

## 1. ElevenLabs Music API Deep Dive

### 1.1 API Endpoints

ElevenLabs offers four music-related endpoints:

| Endpoint | URL | Method | Purpose |
|----------|-----|--------|---------|
| Compose | `POST /v1/music` | POST | Generate music (batch, returns complete file) |
| Stream | `POST /v1/music/stream` | POST | Generate music (streaming binary) |
| Compose Detailed | `POST /v1/music/detailed` | POST | Generate with metadata (multipart response) |
| Create Composition Plan | `POST /v1/music/plan` | POST | Generate a structured composition plan from a prompt (free, no credits) |
| Stem Separation | `POST /v1/music/stem-separation` | POST | Split existing audio into stems |

**Base URLs:**
- Primary: `https://api.elevenlabs.io`
- US: `https://api.us.elevenlabs.io`
- EU: `https://api.eu.residency.elevenlabs.io`
- India: `https://api.in.residency.elevenlabs.io`

### 1.2 Compose Endpoint Parameters

```typescript
// POST https://api.elevenlabs.io/v1/music
interface ComposeRequest {
  // EITHER prompt OR composition_plan (mutually exclusive)
  prompt?: string;                    // Simple text prompt
  composition_plan?: MusicPrompt;     // Structured composition

  music_length_ms?: number;           // 3,000 - 600,000 ms (3s to 10min)
                                      // Only with prompt mode
  model_id?: string;                  // Currently only "music_v1"
  seed?: number;                      // Reproducibility (not with prompt mode)
  force_instrumental?: boolean;       // Default: false. Guarantees no vocals.
  respect_sections_durations?: boolean; // Default: true. Enforce section timing.
  store_for_inpainting?: boolean;     // Enterprise only
  sign_with_c2pa?: boolean;           // C2PA signing for MP3
}

// Query parameter:
// output_format: string (enum) - see Output Formats below

interface MusicPrompt {
  positive_global_styles: string[];   // Required: styles for entire song
  negative_global_styles: string[];   // Required: styles to exclude
  sections: SongSection[];            // Required: song structure
}

interface SongSection {
  section_name: string;               // 1-100 characters
  positive_local_styles: string[];    // Section-specific desired styles
  negative_local_styles: string[];    // Section-specific excluded styles
  duration_ms: number;                // 3,000 - 120,000 ms per section
  lines: string[];                    // Lyrics (200 chars max per line)
  source_from?: SectionSource;        // For inpainting (enterprise)
}
```

### 1.3 Output Formats

**MP3:** mp3_22050_32, mp3_24000_48, mp3_44100_32, mp3_44100_64, mp3_44100_96, mp3_44100_128, mp3_44100_192
**PCM/WAV:** pcm_8000, pcm_16000, pcm_22050, pcm_24000, pcm_32000, pcm_44100, pcm_48000
**Opus:** opus_48000_32, opus_48000_64, opus_48000_96, opus_48000_128, opus_48000_192
**Other:** ulaw_8000, alaw_8000

**Tier restrictions:** MP3 192kbps requires Creator+. PCM 44.1kHz requires Pro+.

### 1.4 Authentication

- Header: `xi-api-key: YOUR_API_KEY`
- Environment variable: `ELEVENLABS_API_KEY`

### 1.5 Response Format

- **200:** `application/octet-stream` (binary audio)
- **422:** JSON validation errors
- **Detailed endpoint:** `multipart/mixed` with JSON metadata + binary audio

### 1.6 TypeScript SDK

```bash
npm install @elevenlabs/elevenlabs-js
```

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// Simple prompt generation
const track = await client.music.compose({
  prompt: "Solo drum kit, rock groove, 120 BPM, punchy kick and snare",
  musicLengthMs: 30000,
  forceInstrumental: true,
});

// Composition plan generation (advanced)
const plan = await client.music.compositionPlan.create({
  prompt: "Solo drum kit, rock groove, 120 BPM",
  musicLengthMs: 30000,
});

const detailedTrack = await client.music.compose({
  compositionPlan: plan,
});
```

**Important:** The SDK is designed for Node.js (server-side). The `@elevenlabs/client` package exists for browser use but music generation should NOT be called from the client due to API key exposure and CORS considerations.

### 1.7 Stem Separation Endpoint

```typescript
// POST https://api.elevenlabs.io/v1/music/stem-separation
// Content-Type: multipart/form-data

interface StemSeparationRequest {
  file: Binary;                    // The audio file to separate
  stem_variation_id?: string;      // "two_stems_v1" | "six_stems_v1" (default)
  output_format?: string;          // Same format options as compose
  sign_with_c2pa?: boolean;
}

// Response: ZIP archive containing separated audio stems
// six_stems_v1: vocals, drums, bass, guitar, piano, other
// two_stems_v1: vocals, instrumental
```

**Pricing:** 0.5x generation cost for 2 stems, 1x generation cost for 6 stems.

### 1.8 Rate Limits

Concurrent request limits by plan:

| Plan | Concurrent Requests | Monthly Cost |
|------|-------------------|-------------|
| Free | 2 | $0 |
| Starter | 3 | $5 |
| Creator | 5 | $22 |
| Pro | 10 | $99 |
| Scale | 15 | $199 |
| Business | 15 | $330 |

### 1.9 Pricing and Credits

ElevenLabs uses a credit-based system. Music generation costs vary by plan because credits have different fiat values per tier:

| Plan | Monthly Credits | Monthly Cost | Approx. Music Minutes | Cost/Minute |
|------|----------------|-------------|----------------------|------------|
| Free | 10,000 | $0 | ~5 min | N/A |
| Starter | 30,000 | $5 | ~15 min | ~$0.33 |
| Creator | 100,000 | $22 | ~50 min | ~$0.44 |
| Pro | 500,000 | $99 | ~250 min | ~$0.40 |
| Scale | 2,000,000 | $199 | ~1000 min | ~$0.20 |

**Key data point:** A 3-minute track costs approximately 2,000 credits. These are rough estimates -- actual credit consumption varies by plan tier because ElevenLabs prices music at a fixed fiat rate that maps to different credit quantities per plan.

The Soundverse comparison article cites ElevenLabs music at approximately **$0.50 per minute** of generated audio, with overage rates of $0.33-$0.80/minute depending on tier.

### 1.10 Commercial License

- **Starter+:** Commercial use for most purposes (social media, YouTube, podcasts, apps)
- **Creator+:** Broader commercial use (advertising, games)
- **Enterprise:** Film, TV, radio distribution
- **SaaS use:** Permitted with substantial added functionality (not a mere reseller/aggregator)
- **Sublicensing:** Requires specific plan authorization
- Content must not contain copyrighted material (no artist names, copyrighted lyrics)

**Critical for Arrangement Forge:** Using ElevenLabs-generated drum audio inside our SaaS product where users create backing tracks should qualify as "substantial added functionality." However, we should verify this interpretation with ElevenLabs before launching, especially if users can download or export the generated audio.

### 1.11 Generation Latency

- **Simple prompts:** Rarely exceeds 30 seconds
- **Complex compositions:** Proportional to content length
- **Streaming endpoint:** Returns chunks as they are generated, reducing perceived latency
- **Composition plan creation:** Free, but rate-limited per tier

---

## 2. Can It Generate Isolated Drums?

### 2.1 Direct Drum Generation (Approach A)

**Yes, with caveats.** ElevenLabs supports generating drum-only tracks using the "solo" keyword in prompts:

```
"Solo drum kit, jazz brush pattern, medium swing, 130 BPM, instrumental only"
"Solo drum kit, rock groove, straight 8ths, 120 BPM, punchy kick and crisp snare"
"Solo drum kit, funk pocket, syncopated kick, ghost notes on snare, 95 BPM"
```

The best practices documentation explicitly mentions: *"Prefix instruments with 'solo' for isolation (e.g., 'solo electric guitar')."* And the prompt guide gives the example: *"Solo drum kit, jazz brush pattern, medium swing."*

**However, there are fundamental limitations:**

1. **No precise tempo guarantee.** The model "accurately follows BPM" but this is probabilistic, not deterministic. Requesting "120 BPM" may yield 118 or 122 BPM. For a backing track tool where drums must sync with other MIDI-generated stems at an exact tempo, even a 1% deviation makes the track drift out of sync over 60 seconds.

2. **No time signature control.** There is no parameter for time signature. You can mention "3/4 waltz" in the prompt, but the model may interpret this loosely. 6/8 and 7/8 are even less reliable.

3. **No bar-level structure control.** You cannot say "play a fill on bar 8" or "crash on beat 1 of bar 9." The composition_plan gives section-level control (Intro, Verse, Chorus), but not bar-level or beat-level control. The model decides where fills go.

4. **No deterministic output.** Even with the same prompt, each generation produces different audio. The `seed` parameter exists but "exact reproducibility is not guaranteed and outputs may change across system updates." This means you cannot reliably regenerate the same drum track.

5. **Duration alignment.** You specify duration in milliseconds, not bars. A 16-bar section at 120 BPM in 4/4 = 32 seconds = 32,000ms. But if the model generates at 118 BPM, the audio will be slightly too long for 16 bars at 120 BPM. You would need to time-stretch the result, which degrades quality.

### 2.2 Generate Full Track + Stem Separate (Approach B)

An alternative workflow:
1. Generate a full song with drums, bass, etc. via the compose endpoint
2. Pass the result through the stem separation endpoint to extract the drum stem

**Advantages:**
- The drum part in a full arrangement context will likely sound more musically coherent (fills at transitions, energy matching other instruments)

**Disadvantages:**
- Double the cost (generation + stem separation at 0.5x or 1x)
- Double the latency (generation time + separation time)
- You still get audio, not MIDI, so tempo sync issues persist
- The separated drum stem may contain artifacts (bleed from other instruments)
- You are paying for bass, guitar, piano, strings generation that you throw away

### 2.3 Verdict on Drum Isolation

**ElevenLabs can produce drum-only audio that sounds good in isolation, but it cannot produce drum audio that reliably syncs to a specific tempo, time signature, and bar structure.** This is the fundamental mismatch with Arrangement Forge's architecture, which is built around precise bar-level MIDI data synchronized across 5 stems.

---

## 3. Integration Architecture

### 3.1 If We Proceed (Design for Best-Case Scenario)

Despite the limitations, here is how ElevenLabs drum audio would integrate:

```
User clicks "Generate"
        |
        v
[Client: project-store.ts]
  Collects: genre, tempo, energy, time_sig, sections
        |
        v
[Supabase Edge Function: /functions/v1/generate-drums]
  1. Build ElevenLabs prompt from project settings
  2. Call ElevenLabs API (compose endpoint)
  3. Receive binary audio
  4. Store in Supabase Storage (bucket: "drum-audio")
  5. Return audio URL to client
        |
        v
[Client: engine.ts]
  1. Fetch audio from Supabase Storage URL
  2. Load into Tone.Player (not Tone.Sampler)
  3. Play audio in sync with Transport
  4. Other stems (bass, piano, guitar, strings) still use MIDI
        |
        v
[Audio output: drums = pre-rendered audio, other stems = MIDI playback]
```

### 3.2 Architecture Diagram

```
+------------------+     +----------------------+     +------------------+
|  Browser Client  |     | Supabase Edge Fn     |     | ElevenLabs API   |
|                  |     | /generate-drums      |     |                  |
|  1. User clicks  |---->| 2. Build prompt      |---->| 3. Generate      |
|     "Generate"   |     |    from project       |     |    drum audio    |
|                  |     |    settings           |<----| 4. Return binary |
|                  |     |                      |     |    audio stream   |
|                  |     | 5. Upload to         |     +------------------+
|                  |     |    Supabase Storage   |
|                  |     | 6. Return audio URL  |     +------------------+
|  7. Fetch audio  |<----|                      |     | Supabase Storage |
|     from Storage  |     +----------------------+     | bucket:          |
|  8. Load into    |                                   | "drum-audio"     |
|     Tone.Player  |<---------------------------------+|                  |
|  9. Play synced  |                                   +------------------+
|     with MIDI    |
+------------------+
```

### 3.3 Prompt Construction

```typescript
// In the Supabase Edge Function
function buildDrumPrompt(project: {
  genre: string;
  subStyle: string;
  tempo: number;
  timeSignature: string;
  energy: number;
  sections: { name: string; barCount: number }[];
}): string {
  const energyDescriptor = project.energy > 70 ? "high energy, driving"
    : project.energy > 40 ? "medium energy, steady groove"
    : "laid back, sparse";

  const genreMap: Record<string, string> = {
    Jazz: "jazz brush swing",
    Blues: "blues shuffle",
    Rock: "rock straight 8ths",
    Funk: "funk pocket syncopated",
    Country: "country shuffle",
    Gospel: "gospel",
    "R&B": "R&B groove",
    Latin: "latin percussion",
    Pop: "pop four-on-the-floor",
  };

  const drumStyle = genreMap[project.genre] ?? "rock";

  return [
    `Solo drum kit, ${drumStyle}, ${project.tempo} BPM,`,
    `${energyDescriptor}, instrumental only,`,
    `${project.timeSignature} time signature,`,
    `crisp and warm acoustic drums, punchy kick, tight snare,`,
    `professional mix, studio quality`,
  ].join(" ");
}

function buildCompositionPlan(project: ProjectSettings): MusicPrompt {
  return {
    positive_global_styles: [
      "solo drum kit",
      genreMap[project.genre],
      `${project.tempo} BPM`,
      "professional studio quality",
      "acoustic drums",
    ],
    negative_global_styles: [
      "vocals", "bass", "guitar", "piano", "strings",
      "synth", "electronic", "lo-fi",
    ],
    sections: project.sections.map(s => ({
      section_name: s.name,
      positive_local_styles: getSectionDrumStyle(s, project),
      negative_local_styles: [],
      duration_ms: sectionDurationMs(s.barCount, project.tempo, project.timeSignature),
      lines: [], // No lyrics for instrumental
    })),
  };
}

function sectionDurationMs(
  barCount: number, tempo: number, timeSig: string
): number {
  const [num] = timeSig.split("/").map(Number);
  const beatsPerBar = num ?? 4;
  const secondsPerBeat = 60 / tempo;
  const totalSeconds = barCount * beatsPerBar * secondsPerBeat;
  return Math.round(totalSeconds * 1000);
}
```

### 3.4 Audio Playback Integration

```typescript
// Modified engine.ts concept
// Instead of MIDI notes for drums, play a pre-rendered audio buffer

import * as Tone from 'tone';

class DrumAudioPlayer {
  private player: Tone.Player | null = null;
  private gain: Tone.Gain;

  constructor(masterGain: Tone.Gain) {
    this.gain = new Tone.Gain(0.8);
    this.gain.connect(masterGain);
  }

  async loadAudio(url: string): Promise<void> {
    if (this.player) {
      this.player.dispose();
    }
    this.player = new Tone.Player(url);
    this.player.connect(this.gain);
    await Tone.loaded();
  }

  play(startOffset: number = 0): void {
    if (!this.player) return;
    // Sync with Transport
    Tone.getTransport().schedule((time) => {
      this.player?.start(time, startOffset);
    }, 0);
  }

  stop(): void {
    this.player?.stop();
  }

  setVolume(volume: number): void {
    this.gain.gain.value = volume;
  }

  dispose(): void {
    this.player?.dispose();
    this.gain.dispose();
  }
}
```

### 3.5 Per-Section Generation

Yes, we can generate per-section drum audio using the composition_plan with `respect_sections_durations: true`. Each section gets its own duration and style descriptors.

**But stitching is problematic:**
- Audio crossfades between sections need careful handling
- Tempo consistency between sections is not guaranteed
- If sections are generated in separate API calls, they will sound like different drummers

**Better approach:** Generate the entire song as one API call with section definitions in the composition_plan. This ensures a single coherent drum performance across the whole arrangement.

### 3.6 Regeneration Handling

When a user changes settings:
1. Mark the cached drum audio as stale
2. Show a "Regenerate Drums" button
3. On click, call the edge function again with new parameters
4. Replace the audio in Supabase Storage
5. Reload the Tone.Player

This means every parameter change that affects drums requires a new API call (~$0.15-$0.50, ~30s latency).

---

## 4. Feasibility Assessment

### 4.1 Is the API Production-Ready?

**Yes.** The ElevenLabs Music API (model `music_v1`) is publicly available to all paid users. It launched in August 2025 and has been generally available since. There is an official TypeScript SDK (`@elevenlabs/elevenlabs-js`) on npm, full documentation, and the API appears stable.

### 4.2 Showstopper Limitations

| Limitation | Severity | Impact on Arrangement Forge |
|-----------|----------|---------------------------|
| **No precise tempo control** | CRITICAL | Drums will drift vs. MIDI stems. A 120 BPM prompt may produce 117-123 BPM audio. Over 2 minutes, a 2% tempo error = drums are 2.4 seconds off from other stems. |
| **No bar-level structure control** | HIGH | Cannot place fills at specific bar numbers. Cannot crash on bar 9 beat 1. Section-level control exists but bar-level does not. |
| **No time signature parameter** | HIGH | Only prompt-based. "3/4 waltz" may work, "7/8" almost certainly will not. |
| **Audio, not MIDI** | HIGH | Cannot edit individual hits. Cannot adjust a fill. Cannot change kick pattern without regenerating entire track. |
| **Non-deterministic output** | MEDIUM | Same prompt produces different results. User cannot "undo" a regeneration to get back to the previous version without caching every generation. |
| **30-second generation latency** | MEDIUM | User waits 30s+ after clicking Generate. For a practice tool, this is acceptable for initial generation but annoying for iterative tweaking. |
| **$0.33-0.50/minute cost** | MEDIUM | At estimated 5-10 generations per session, cost is $1-5 per session per user. |
| **No real-time parameter changes** | MEDIUM | Changing energy from 60 to 80 requires full regeneration. No live tweaking. |

**The tempo sync issue alone is likely a showstopper.** Arrangement Forge plays 5 stems simultaneously, 4 of which are MIDI-controlled at an exact tempo via Tone.js Transport. The drum stem would be a pre-rendered audio file at an approximate tempo. These will not stay in sync.

### 4.3 Realistic Audio Quality for Drums

Based on reviews and the platform's capabilities:
- **Full-band output quality:** High. Reviewers praise coherent arrangements and professional production.
- **Isolated drum quality:** Unknown in production. The "solo drum kit" prompting technique is documented but not widely reviewed for quality. It likely produces decent-sounding drums, but whether they have the organic, "Tom Petty" warmth we want is uncertain without testing.
- **Output format:** MP3 at 128-192kbps. Not ideal for professional drum audio (lossy compression artifacts on transient-heavy material like drums). PCM (WAV) available on Pro plan.

### 4.4 Latency vs. UX

| Action | Latency | User Experience |
|--------|---------|----------------|
| Initial generation | 20-60s | Acceptable with progress indicator |
| Regenerate one section | 10-30s | Tolerable |
| Change tempo slider | 20-60s full regen | Terrible -- breaks the "slider → instant feedback" paradigm |
| Change energy slider | 20-60s full regen | Terrible |
| A/B comparison | 40-120s (two generations) | Poor |

**Verdict:** Acceptable for initial "one-shot" generation, but terrible for the iterative, slider-based workflow Arrangement Forge envisions.

---

## 5. Alternative APIs

### 5.1 Soundverse API

**Website:** https://www.soundverse.ai/ai-music-generation-api
**API Docs:** https://help.soundverse.ai/api_documentation

**Capabilities:**
- Full song generation with vocals
- Instrumental music generation
- **Stem separation into 6 stems: vocals, drums, bass, guitar, accompaniment, melody**
- Streaming (SSE) and synchronous workflows
- Python and JavaScript SDKs

**Workflow for drums:** Generate full song -> stem separate -> extract drums

**Pricing:**
- Starter: $99/mo (1,980 songs, 1,980 separations)
- Growth: $599/mo (11,980 songs, 11,980 separations)
- Scale: $5,999/mo (59,980 songs)
- Royalty-free licensing included

**Assessment:** More expensive than ElevenLabs but includes stem separation in the price. The "generate full -> separate drums" workflow means double processing and still has the tempo sync problem. Same fundamental limitations as ElevenLabs for our use case.

### 5.2 Loudly API

**Website:** https://www.loudly.com/music-api
**Developer Portal:** https://loudly.com/developers

**Capabilities:**
- Music generation with genre, tempo, energy, and duration control
- Text-to-music generation
- **Instrument stems extraction (vocals, drums, bass, etc.)**
- Sample pack retrieval
- Pay-as-you-go and subscription pricing

**Differentiator:** Loudly allows customization by genre, tempo, energy, and duration at the API level, which is closer to what we need. Every track comes with enterprise-level commercial licensing.

**Assessment:** Most promising of the full-song APIs because it explicitly supports tempo and energy parameters (not just prompt-based). Still returns audio, not MIDI. Still has the tempo sync problem unless their tempo control is precise enough. Worth investigating as a PoC.

### 5.3 AIVA

**Website:** https://www.aiva.ai/
**Strengths:** Orchestral and cinematic music. MIDI export. 250+ styles.
**Weaknesses:** Specializes in orchestral/cinematic. API access is limited. Not well-suited for rock/funk/jazz drum patterns. "Developing stem-by-stem generation tools" suggests this feature is not production-ready.

**Assessment:** Wrong tool for this job.

### 5.4 Suno / Udio

Both are leading AI music generators but:
- **Suno:** No official public API. Stem separation available in Suno Studio (12 stems including drums). But no developer API for integration.
- **Udio:** API exists (via MusicAPI.ai). Stem output from generation. Commercial rights included. But same tempo-sync issues apply.

**Assessment:** Not viable for production integration due to API availability/stability concerns.

### 5.5 Drumloop AI

**Website:** https://www.drumloopai.com/
**Capabilities:** AI-generated drum loops with BPM and style control. MIDI export.

**MIDI export is the key differentiator.** If Drumloop AI exports MIDI drum patterns (not just audio), this solves the tempo sync problem entirely -- we would play the MIDI through our own drum samples/synths at the exact project tempo.

**Assessment:** Worth investigating for MIDI output capability. However, the API appears limited (free plan: 3 loops/day), and documentation is sparse. The product seems oriented toward individual producers, not SaaS integration.

### 5.6 The LLM + MIDI Approach (Most Promising Alternative)

Instead of generating audio, use an LLM to generate MIDI drum patterns:

```
User settings (genre: "Jazz", substyle: "Bebop", tempo: 160, energy: 75)
        |
        v
[LLM API Call: Claude/GPT]
  Prompt: "Generate a 16-bar jazz bebop drum pattern at 160 BPM..."
  Output: JSON array of MIDI note events
        |
        v
[Client: Play MIDI through high-quality drum samples/synths]
```

**Advantages:**
- MIDI output syncs perfectly to Transport tempo
- Bar-level control (fill on bar 8, crash on bar 9)
- Time signature is exact (7/8, 5/4, whatever we want)
- Can be edited note-by-note
- Much cheaper per generation (~$0.01-0.05 per LLM call vs $0.50/min audio)
- Pairs with the existing MIDI playback infrastructure
- Can use high-quality samples from any source (Phase 4 in drum-investigation.md)

**Disadvantages:**
- LLM-generated patterns need validation (could output invalid MIDI data)
- Sound quality depends on the sample engine, not the LLM
- Not "record-ready" audio out of the box -- still needs good samples

**This is essentially what drum-investigation.md already recommends as Phase 2 (pattern library), but with an LLM writing the patterns instead of hardcoding them.**

---

## 6. Proof of Concept Design

### 6.1 PoC Option A: ElevenLabs Drum Audio

**Goal:** Test if ElevenLabs can generate isolated drum audio at a consistent, precise tempo.

**Prerequisites:**
- ElevenLabs account (Starter plan, $5/mo minimum)
- API key

**Minimal script:**

```typescript
// poc-elevenlabs-drums.ts
// Run with: npx tsx poc-elevenlabs-drums.ts

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { writeFileSync } from "fs";

const client = new ElevenLabsClient();

async function testDrumGeneration() {
  console.log("Generating drum track...");
  const startTime = Date.now();

  // Test 1: Simple prompt, 16 bars at 120 BPM = 32 seconds
  const track = await client.music.compose({
    prompt: "Solo drum kit, rock groove, straight 8th notes, 120 BPM exactly, " +
            "punchy acoustic kick, tight snare, crisp hi-hats, " +
            "instrumental only, studio quality, warm analog sound",
    musicLengthMs: 32000,
    forceInstrumental: true,
  });

  const elapsed = Date.now() - startTime;
  console.log(`Generation took ${elapsed}ms`);

  // Write to file
  const chunks: Buffer[] = [];
  for await (const chunk of track) {
    chunks.push(Buffer.from(chunk));
  }
  writeFileSync("drums-test-120bpm.mp3", Buffer.concat(chunks));
  console.log("Saved to drums-test-120bpm.mp3");

  // Test 2: Composition plan for multi-section
  const plan = await client.music.compositionPlan.create({
    prompt: "Solo drum kit, jazz swing, 130 BPM, brushes, " +
            "intro with just ride cymbal, verse with full kit, " +
            "chorus with more energy and crash cymbals",
    musicLengthMs: 60000,
  });

  console.log("Composition plan:", JSON.stringify(plan, null, 2));

  const track2 = await client.music.compose({
    compositionPlan: plan,
    forceInstrumental: true,
  });

  const chunks2: Buffer[] = [];
  for await (const chunk of track2) {
    chunks2.push(Buffer.from(chunk));
  }
  writeFileSync("drums-test-jazz.mp3", Buffer.concat(chunks2));
  console.log("Saved to drums-test-jazz.mp3");
}

testDrumGeneration().catch(console.error);
```

**What to measure:**
1. Load the MP3 into a DAW (or use aubio/librosa) to measure actual BPM
2. Compare measured BPM to requested BPM -- what is the deviation?
3. Does the drum track maintain consistent tempo throughout? (No drift?)
4. Do the sections line up with expected bar boundaries?
5. Subjective: Does it sound like a real drummer? Does it have fills, dynamics, groove?

**If BPM deviation is < 0.5%** (< 0.6 BPM at 120), the audio approach might work with minor time-stretching.
**If BPM deviation is > 1%**, the audio approach is not viable for multi-stem sync.

### 6.2 PoC Option B: LLM MIDI Pattern Generation

**Goal:** Test if an LLM can generate musically valid MIDI drum patterns.

```typescript
// poc-llm-drums.ts
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const PROMPT = `Generate a 4-bar rock drum pattern in 4/4 time at 120 BPM.
Return ONLY a JSON array of MIDI note events. Each event:
{
  "note": string (General MIDI drum map: C2=kick, D2=snare, F#2=closed hihat,
                  A#2=open hihat, C#3=crash, D#3=ride),
  "time": number (beat offset from start, 0-based, e.g. 0=beat 1 of bar 1,
                  4=beat 1 of bar 2),
  "duration": number (in beats, typically 0.1-0.5 for drums),
  "velocity": number (0-127, use musical dynamics)
}

Requirements:
- Kick on beats 1 and 3, snare on beats 2 and 4
- Hi-hat on all 8th notes with accent pattern
- Bar 4 should have a fill using toms
- Crash cymbal on beat 1 of bar 1
- Ghost notes on snare (velocity 30-45)
- Humanize velocities (don't use the same velocity for repeated hits)

Return ONLY the JSON array, no explanation.`;

async function testLLMDrums() {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: PROMPT }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  const notes = JSON.parse(text);
  console.log(`Generated ${notes.length} MIDI events`);
  console.log(JSON.stringify(notes, null, 2));

  // Validate
  for (const note of notes) {
    if (typeof note.time !== "number" || note.time < 0) {
      console.error("Invalid time:", note);
    }
    if (typeof note.velocity !== "number" || note.velocity < 0 || note.velocity > 127) {
      console.error("Invalid velocity:", note);
    }
  }
}

testLLMDrums().catch(console.error);
```

**What to measure:**
1. Does the JSON parse without errors?
2. Are all note names valid GM drum map names?
3. Are timings musically correct (kick on 0, 2, 4, 6 etc.)?
4. Does the fill on bar 4 actually sound like a fill?
5. Are ghost notes present at appropriate velocities?
6. When played through the existing Tone.js engine, does it sound musical?

---

## 7. Cost Analysis

### 7.1 ElevenLabs Approach

**Assumptions:**
- Average song length: 2 minutes (8-16 bars is typical for practice)
- Generations per session: 3-5 (initial + 2-4 tweaks)
- Sessions per user per month: 10-20

| Usage Level | Gens/Month | Minutes/Month | Cost/Month | Plan Required |
|------------|-----------|---------------|-----------|--------------|
| Light (hobbyist) | 30 | 60 min | ~$30 | Pro ($99 plan, within quota) |
| Medium (regular) | 100 | 200 min | ~$100 | Scale ($199 plan) |
| Heavy (daily user) | 300 | 600 min | ~$300 | Scale + overages |

**Per-user cost at scale (100 users):**
- Light: $0.30/user/month (if within plan quota)
- Medium: $1.00/user/month
- Heavy: $3.00/user/month

**Problem:** These costs are for drums only. If we later want to generate bass, piano, guitar, strings via AI, costs multiply by 5.

### 7.2 Soundverse Approach

- Starter: $99/mo for 1,980 songs + 1,980 separations
- Cost per song+separation: ~$0.10
- For 100 users at 30 generations/month = 3,000 gens = Growth plan ($599/mo) = $6/user/month

### 7.3 LLM MIDI Approach

- Claude Sonnet: ~$0.003 per 1K input tokens + $0.015 per 1K output tokens
- Typical drum pattern prompt: ~500 tokens input, ~2000 tokens output
- Cost per generation: ~$0.03
- 100 generations/month: $3.00 total
- **50-100x cheaper than audio generation**

### 7.4 Cost Comparison Table

| Approach | Cost/Generation | 100 users, 50 gens each | Notes |
|---------|----------------|------------------------|-------|
| ElevenLabs audio | ~$0.50-1.00 | $2,500-5,000/mo | Audio quality varies |
| Soundverse | ~$0.10 | $500/mo | Requires Growth plan |
| Loudly | Unknown (PAYG) | Unknown | Need to contact sales |
| LLM + MIDI | ~$0.03 | $150/mo | Needs good samples |
| Rule-based MIDI (current) | $0.00 | $0.00 | Poor pattern quality |

---

## 8. Risk Assessment

### 8.1 ElevenLabs Integration Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Tempo drift vs. MIDI stems | Very High | Critical | Time-stretching, but degrades quality |
| API goes down during user session | Medium | High | Cache previous generations; fallback to MIDI |
| Quality inconsistency across genres | Medium | High | Extensive prompt testing per genre |
| ElevenLabs changes pricing significantly | Medium | High | Abstract behind interface; support alternatives |
| Commercial license interpretation dispute | Low | Critical | Get written confirmation before launch |
| Copyright filter rejects valid prompts | Medium | Medium | Avoid genre-specific artist references |
| User exports drum audio (sublicensing concern) | Medium | High | Review terms; may need Enterprise plan |

### 8.2 LLM MIDI Approach Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| LLM outputs invalid MIDI data | Medium | Medium | Validate and sanitize; retry on failure |
| LLM patterns sound formulaic | Medium | Medium | Use detailed prompts with variation instructions |
| LLM hallucinate non-GM note names | Low | Low | Whitelist valid note names; map to nearest |
| Sample quality limits perceived quality | Medium | High | Phase 4 sample upgrade from drum-investigation.md |
| LLM latency (~3-5s) | Low | Low | Much faster than audio generation |
| LLM cost increases | Low | Low | Still 50-100x cheaper than audio |

---

## 9. Recommendation

### 9.1 Do NOT Proceed with ElevenLabs for Drum Generation

**The fundamental architecture mismatch is the dealbreaker.** Arrangement Forge is a bar-level block sequencer with 5 MIDI stems synchronized to a precise Transport clock. ElevenLabs generates audio at an approximate tempo with no bar-level control. These are incompatible paradigms.

Specific reasons:

1. **Tempo sync is unsolvable without degradation.** You cannot guarantee that AI-generated audio at "120 BPM" will be exactly 120.000 BPM. Even 0.5% error accumulates to audible drift in a 2-minute backing track. Time-stretching introduces artifacts on transient-heavy drum audio.

2. **No bar-level control kills the editing model.** The user cannot move, split, or merge drum blocks at the bar level if the drums are a monolithic audio file. The entire block sequencer paradigm breaks down for the drum stem.

3. **Cost is 50-100x higher than the alternative.** At $0.50/minute vs. $0.03/generation for LLM MIDI, the audio approach is economically irrational when the output quality is no better (and arguably worse, due to sync issues).

4. **Regeneration latency destroys the iterative workflow.** 30-second waits every time you adjust energy, tempo, or genre makes the app feel unresponsive. MIDI regeneration is instant.

5. **Commercial licensing is ambiguous for our SaaS model.** We would need to verify with ElevenLabs whether our users' ability to play and potentially export AI-generated drum audio within our SaaS constitutes sublicensing.

### 9.2 Recommended Path Forward

**Phase 1 (immediate): Implement the enhanced MIDI pattern library from drum-investigation.md.**

This is the plan already documented in `/data/projects/arrangement-forge/specs/drum-investigation.md`, Sections 3-6:
- Synthesized drum kit using Tone.js built-in synths (MembraneSynth, NoiseSynth, MetalSynth)
- 10+ genre-specific drum patterns with fills, variations, and humanization
- Full swing, energy, and dynamics parameter support
- Zero cost, zero latency, zero external dependencies

Estimated effort: 3-5 days. This alone will be a massive improvement over the current 3-pattern, 4-sample system.

**Phase 2 (short-term): LLM-generated MIDI drum patterns.**

Replace the hardcoded pattern library with LLM-generated patterns:
- Call Claude/GPT with structured prompts describing genre, substyle, energy, sections
- LLM returns JSON MIDI note arrays
- Validate and play through the synthesized drum kit or sample engine
- Cache generated patterns in Supabase (same pattern for same parameters)
- Cost: ~$0.03/generation. Latency: ~3-5 seconds.

This gives us the "AI" intelligence without the audio generation overhead. The LLM understands music theory, genre conventions, and can generate context-appropriate fills and variations.

**Phase 3 (medium-term): High-quality multi-sample drum kits.**

As documented in drum-investigation.md Phase 4:
- Source or record multi-velocity, multi-round-robin drum samples
- Host in Supabase Storage
- Build a VelocitySampler that switches samples based on velocity
- Multiple kit types (rock, jazz, electronic, latin)

This upgrades the audio output quality to "record-ready" without changing the MIDI/pattern architecture.

**Phase 4 (future, if needed): AI audio as a premium feature.**

If we ever want "AI-generated drum audio" as a differentiator:
- Offer it as a premium "render to audio" step AFTER the user is happy with the MIDI arrangement
- Generate the full mix (all stems) as audio, not just drums
- Use ElevenLabs, Soundverse, or whatever API is best at that time
- This becomes an export feature, not the primary playback engine
- User listens to MIDI during editing, generates audio for final export

### 9.3 Summary Table

| Approach | Tempo Sync | Bar Control | Cost | Latency | Audio Quality | Verdict |
|---------|-----------|-------------|------|---------|--------------|---------|
| Current MIDI (3 patterns) | Perfect | Full | Free | Instant | Poor (4 samples) | Upgrade patterns + samples |
| ElevenLabs audio | Poor | None | High | 30s | High (if isolated) | Do not use for playback |
| Soundverse audio | Poor | None | Medium | Unknown | Unknown | Same problems as ElevenLabs |
| LLM MIDI patterns | Perfect | Full | Very low | 3-5s | Depends on samples | **Best approach for Phase 2** |
| Enhanced MIDI + synths | Perfect | Full | Free | Instant | Medium (synths) | **Best approach for Phase 1** |
| Enhanced MIDI + samples | Perfect | Full | Free | Instant | High (multi-sample) | **Best approach for Phase 3** |

---

## Appendix A: ElevenLabs API Reference Links

- [Music Compose Endpoint](https://elevenlabs.io/docs/api-reference/music/compose)
- [Music Stream Endpoint](https://elevenlabs.io/docs/api-reference/music/stream)
- [Music Compose Detailed](https://elevenlabs.io/docs/api-reference/music/compose-detailed)
- [Create Composition Plan](https://elevenlabs.io/docs/api-reference/music/create-composition-plan)
- [Stem Separation](https://elevenlabs.io/docs/api-reference/music/separate-stems)
- [Music Quickstart](https://elevenlabs.io/docs/eleven-api/guides/cookbooks/music/quickstart)
- [Best Practices](https://elevenlabs.io/docs/overview/capabilities/music/best-practices)
- [Music Overview](https://elevenlabs.io/docs/overview/capabilities/music)
- [Pricing](https://elevenlabs.io/pricing)
- [Music API Terms](https://elevenlabs.io/music-api-terms)
- [TypeScript SDK (GitHub)](https://github.com/elevenlabs/elevenlabs-js)
- [TypeScript SDK (npm)](https://www.npmjs.com/package/@elevenlabs/elevenlabs-js)

## Appendix B: Alternative API Reference Links

- [Soundverse API](https://www.soundverse.ai/ai-music-generation-api) | [Docs](https://help.soundverse.ai/api_documentation) | [Pricing](https://www.soundverse.ai/pricing)
- [Loudly API](https://www.loudly.com/music-api) | [Developers](https://loudly.com/developers) | [Pricing](https://loudly.com/developers/pricing)
- [Drumloop AI](https://www.drumloopai.com/)
- [AIVA](https://www.aiva.ai/)
- [Suno](https://suno.com/) (no public API)
- [Udio](https://www.udio.com/) | [MusicAPI.ai wrapper](https://musicapi.ai/udio-api)

## Appendix C: Key Research Sources

- [ElevenLabs Music Prompt Guide (fal.ai)](https://fal.ai/learn/biz/eleven-music-prompt-guide)
- [AI Music Prompts Best Practices (musicsmith.ai)](https://musicsmith.ai/blog/ai-music-generation-prompts-best-practices)
- [Soundverse vs ElevenLabs Comparison](https://www.soundverse.ai/blog/article/soundverse-api-vs-eleven-labs-music-api-the-ai-music-generator-api-comparison-developers-need)
- [ElevenLabs Music API Blog Post](https://elevenlabs.io/blog/eleven-music-now-available-in-the-api)
- [ElevenLabs Pricing Breakdown (Flexprice)](https://flexprice.io/blog/elevenlabs-pricing-breakdown)
