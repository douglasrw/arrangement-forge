# Phase 4: AI Audio Rendering for Premium Export

**Status:** DEFERRED (pick up after Phase 1+3 are validated and sample-based playback sounds good)
**Author:** Engineering Coach (Planning Mode)
**Date:** 2026-03-03
**Estimated effort:** 5-10 days across 7 subtasks (API integration + export pipeline + UX)
**Depends on:** Phase 1 (pattern intelligence), Phase 3 (premium sample playback). Phase 2 (LLM patterns) recommended but not required.

---

## Primitive 1: Self-Contained Problem Statement

Even with Phase 3's premium multi-sample playback, the drum audio is fundamentally "sample-based" -- individual drum hits triggered by MIDI. While this sounds very good for practice, it has inherent limitations that prevent truly "record-ready" output:

1. **No inter-hit physics.** When a real drummer hits a tom, the snare drum resonates sympathetically. When a crash cymbal is struck, it bleeds into every other microphone. Sample-based playback treats each hit as an isolated event with no acoustic interaction between kit pieces.

2. **No performance dynamics beyond velocity.** A real drummer's body position, arm angle, grip pressure, and muscle fatigue create subtle timbral shifts that velocity layers alone cannot capture. A 4-minute track played from samples sounds slightly "stiff" compared to a continuous human performance, even with humanization timing offsets.

3. **No room acoustics.** The Phase 3 samples are close-miked, processed one-shots. A real drum recording has a room sound -- the drum kit interacting with the walls, ceiling, and floor of the recording space. This "glue" makes everything sound like it belongs together.

4. **Export quality ceiling.** Users who want to share or perform with their backing tracks need better-than-practice quality. The gap between "sounds good for rehearsal" and "sounds good on a recording" is meaningful for semi-professional musicians.

**The opportunity:** AI audio generation has reached the point where it can produce studio-quality drum audio that sounds like a real drummer in a real room. The ElevenLabs research (specs/elevenlabs-drum-implementation.md) identified tempo sync as a showstopper for real-time playback, but for export the constraints are different: no real-time sync required, post-processing is acceptable, latency is acceptable (30-120 seconds), and we can use highest-quality API tiers.

**The approach:** A two-stage pipeline. The user edits and rehearses with MIDI playback (Phase 1/3 -- instant, responsive). When they want a final version, they click "Export Studio Quality" which calls an AI audio API, post-processes for tempo alignment, and delivers a downloadable WAV/MP3. The MIDI patterns from Phase 1/2 provide the musical intelligence; the AI audio API provides the sonic quality.

**What this is NOT:**
- This is NOT real-time playback. AI audio is generated once on export, not during editing/rehearsal.
- This is NOT a replacement for MIDI playback. The user always has instant MIDI preview. AI render is an optional premium export tier.
- This is NOT a free feature. AI audio generation costs $0.10-$0.50 per minute of audio. A credit or subscription system is required.

---

## Primitive 2: Acceptance Criteria

### AC-1: Export produces studio-quality drum audio

When the user clicks "Export Studio Quality," the system generates a drum audio track via an AI audio API. The resulting audio sounds like a real acoustic drum kit recorded in a warm studio -- not synthesized, not sample-based, but with inter-hit resonance, room acoustics, and human-like performance feel. A musician listening blind should not immediately identify it as AI-generated.

### AC-2: Tempo alignment within +/- 5ms per bar

The exported audio is post-processed to match the project's exact tempo. After tempo correction, beat onsets in the exported audio align with the expected bar positions within +/- 5ms (imperceptible to human listeners). This is achieved through server-side tempo detection (onset analysis) and high-quality time-stretching (rubberband algorithm).

### AC-3: Section structure preserved

The exported audio reflects the arrangement's section structure: fills at section boundaries, crashes on chorus/bridge entries, energy changes between sections, distinct intro and ending treatments. A 4-bar intro at 120 BPM occupies exactly 8.0 seconds (+/- 0.1s) in the output. Section boundaries align with the arrangement's bar grid.

### AC-4: Export completes within 120 seconds

For a typical 32-bar arrangement (~2 minutes of audio), the full pipeline (API call + tempo correction + format conversion + upload to storage) completes within 120 seconds. The user sees a progress indicator during the process. If the pipeline exceeds 120 seconds, it continues but warns the user.

### AC-5: Total export cost under $1.00 per render

At the chosen API tier, the total cost for generating + post-processing a typical arrangement's drum track is under $1.00. This allows sustainable pricing at $0.25-$0.50 per render to the user (or included in a Pro subscription with N renders/month).

### AC-6: Fallback to sample-based export on failure

If the AI audio API fails (network error, rate limit, service outage, quality check failure), the system falls back to a Tone.js offline render of the Phase 3 sample-based drums. The user gets a "Standard Quality" export rather than nothing. A toast notification explains that studio quality was unavailable and standard quality was used instead.

### AC-7: Download in multiple formats

The exported audio is available in at least two formats:
- WAV 44.1 kHz 16-bit (uncompressed, highest quality, ~20 MB per 2-minute track)
- MP3 320 kbps (compressed, good quality, ~4 MB per 2-minute track)

The user selects their preferred format before or after rendering.

### AC-8: Rendered audio stored in Supabase Storage

Rendered audio files are stored in a Supabase Storage bucket (`drum-renders`). Files are associated with the project and user. Storage is managed with a 30-day retention policy (renders older than 30 days are deleted unless the user has re-downloaded them). Each user has a storage quota (e.g., 500 MB total rendered audio).

---

## Primitive 3: Constraint Architecture

### Musts

1. **Must** perform all AI API calls from a Supabase Edge Function, never from the client. API keys must not be exposed to the browser.
2. **Must** post-process AI audio for tempo alignment before delivering to the user. Never deliver raw AI output without tempo verification.
3. **Must** fall back to Phase 3 sample-based export (via Tone.js OfflineAudioContext) when the AI API fails.
4. **Must** verify licensing terms for the chosen AI API before shipping. User-exported audio must be commercially usable by the user.
5. **Must** track render credits/usage per user. No unbounded free access to the AI API.
6. **Must** store rendered audio in Supabase Storage with per-user/per-project association.
7. **Must** support the existing arrangement data model -- read from `blocks.midi_data` and section structure, no schema changes.
8. **Must** show progress feedback during rendering (estimated time, progress bar or spinner).

### Must-Nots

1. **Must not** use AI audio for real-time playback. This is export-only. The ElevenLabs research conclusively demonstrates that tempo sync prevents real-time use.
2. **Must not** expose AI API keys to the browser under any circumstances.
3. **Must not** store rendered audio indefinitely without cleanup. Enforce retention policies.
4. **Must not** block the UI during rendering. The render runs as a background process with polling or websocket updates.
5. **Must not** modify `MidiNoteData`, `BlockData`, or any shared types for this feature.
6. **Must not** render audio client-side via the AI API. All API calls are server-side (Edge Function or dedicated processing server).

### Preferences

1. **Prefer** ElevenLabs Music API with composition_plan mode as the primary AI service (most mature, best section control, force_instrumental support).
2. **Prefer** server-side rubberband for tempo correction (gold standard for time-stretching quality).
3. **Prefer** per-section generation over full-song generation if section alignment proves unreliable in testing.
4. **Prefer** a hybrid export: AI-rendered drums mixed with Tone.js offline-rendered non-drum stems (piano, bass, guitar, strings).
5. **Prefer** a credit system over per-render billing for simpler UX (users buy credit packs, each render costs 1 credit).
6. **Prefer** Supabase Storage for rendered files (consistent with existing architecture).

### Escalation Triggers

1. If ElevenLabs tempo deviation exceeds 3% consistently, evaluate per-section generation or switch to Soundverse/Stable Audio.
2. If post-processing (tempo correction + format conversion) requires more compute than a Supabase Edge Function can provide (10-second execution limit), move to a dedicated audio processing server (e.g., a small EC2 instance with rubberband + FFmpeg).
3. If AI-generated drums consistently fail a quality check (automated onset density verification or manual listening test), pause the feature and re-evaluate the API choice.
4. If licensing review reveals that user exports are restricted by the AI API's terms, switch to a self-hosted model (Stable Audio Open) or the Tier 3 hybrid approach (AI-generated one-shots assembled by MIDI).

---

## Primitive 4: Decomposition

### Subtask 1: AI API Evaluation + Selection (1 day)

Test 2-3 AI audio services with actual drum-only prompts mapped from arrangement data. For each service, generate 5 test renders (Rock 120 BPM, Jazz 140 BPM, Bossa 100 BPM, Funk 110 BPM, Country 130 BPM). Measure:
- Audio quality (manual listening, 1-5 scale)
- Tempo accuracy (detected BPM vs. requested BPM, measure deviation %)
- Section alignment (do fills, crashes, energy changes land at expected bar positions?)
- Latency (time from API call to audio received)
- Cost per minute of generated audio

**Candidates to test:**
- ElevenLabs Music API (composition_plan mode, force_instrumental, pcm_44100 output)
- Soundverse API (full song + 6-stem separation, drum stem extraction)
- Stable Audio Open (self-hosted, if infrastructure available)

Select the winner based on audio quality (40% weight), tempo accuracy (30% weight), cost (20% weight), and integration ease (10% weight).

**Deliverable:** Written evaluation with test audio files, measurements, and API selection decision.

### Subtask 2: Tempo Correction Pipeline (1 day)

Build `supabase/functions/_shared/tempo-correct.ts` (or a standalone processing script if Edge Functions cannot handle the compute) that:

1. Accepts raw AI-generated audio (WAV/PCM buffer)
2. Detects actual tempo via onset detection (port aubiotrack logic or use a lightweight JS beat tracker)
3. Calculates stretch ratio: `targetTempo / detectedTempo`
4. Applies high-quality time-stretching (rubberband CLI via shell exec, or SoundTouch.js for in-process)
5. Verifies bar alignment: checks that beat onsets in stretched audio align with expected positions within +/- 5ms
6. Returns tempo-corrected audio buffer

**Fallback:** If server-side rubberband is unavailable, use SoundTouch.js (lower quality but pure JS). If stretch ratio is < 0.5% (nearly perfect tempo), skip stretching entirely.

**Test:** Feed in audio at 118 BPM, request 120 BPM. Verify output is exactly 120 BPM with beat onsets on the grid.

### Subtask 3: Render Edge Function (1-2 days)

Create `supabase/functions/render-drums/index.ts`:

1. **Authenticate** the user (verify JWT from request).
2. **Check credits** -- user must have at least 1 render credit remaining.
3. **Read arrangement data** -- fetch project sections, blocks, MIDI data from Supabase.
4. **Build AI prompt/config** -- map arrangement structure to the chosen API's format:
   - For ElevenLabs: build `composition_plan` with `positive_global_styles` (genre-specific drum descriptors), `sections` (mapped from arrangement sections with duration_ms computed from barCount * beatsPerBar * 60000 / tempo), `force_instrumental: true`.
   - Include genre-aware style descriptors: Rock -> "powerful rock drums, punchy kick, crisp snare, analog warmth"; Jazz -> "jazz brushes, ride cymbal, subtle kick, warm room"; etc.
5. **Call AI API** -- POST to the selected service. Timeout at 90 seconds.
6. **Tempo-correct** -- pipe raw audio through the tempo correction pipeline (Subtask 2).
7. **Format convert** -- produce WAV and MP3 versions (FFmpeg or lamejs).
8. **Upload to Supabase Storage** -- store in `drum-renders/{user_id}/{project_id}/{render_id}.wav` and `.mp3`.
9. **Deduct credit** -- decrement user's render credit count.
10. **Return** -- `{ render_id, wav_url, mp3_url, duration_ms, source: 'ai' | 'fallback' }`.
11. **On any failure** -- fall back to Tone.js offline render of Phase 3 samples, return `source: 'fallback'`.

**Request/Response:**

```typescript
// POST body:
interface RenderDrumRequest {
  project_id: string;
  format: 'wav' | 'mp3' | 'both';
}

// Response:
interface RenderDrumResponse {
  render_id: string;
  wav_url: string | null;
  mp3_url: string | null;
  duration_ms: number;
  source: 'ai' | 'fallback';
  credits_remaining: number;
}
```

### Subtask 4: Hybrid Full-Mix Export (1 day)

Build a full arrangement export that combines AI-rendered drums with Tone.js offline-rendered non-drum stems:

1. **Drums:** AI-rendered audio from Subtask 3.
2. **Bass, Piano, Guitar, Strings:** Rendered via Tone.js `OfflineAudioContext` from MIDI data and existing samplers/synths. This gives perfect tempo sync for non-drum stems.
3. **Mix:** Combine all stem audio buffers at their configured mix levels (from the mixer -- volumes, pans, mutes/solos).
4. **Master:** Apply a gentle limiter to prevent clipping.
5. **Export:** WAV or MP3 as selected by the user.

This can run client-side (Tone.js offline render for non-drum stems) or server-side (for consistent quality). Client-side is simpler for MVP.

**Deliverable:** `src/audio/offline-render.ts` with `renderFullMix(project, aiDrumAudioBuffer): Promise<AudioBuffer>`.

### Subtask 5: Export UI (1 day)

Add export controls to the existing UI:

1. **Export button** in the transport bar or top bar (per existing UI patterns).
2. **Export dialog** with two tiers:
   - Standard Quality (instant, Tone.js offline render of all MIDI stems including Phase 3 sample drums)
   - Studio Quality (30-120 seconds, AI-rendered drums + Tone.js offline non-drum stems)
3. **Format selector:** WAV 44.1 kHz / MP3 320 kbps.
4. **Progress indicator** during Studio Quality render (polling the Edge Function status).
5. **Download button** when render completes.
6. **Credits display** showing remaining render credits.
7. **Error handling:** toast notification if AI render fails, with automatic fallback to Standard Quality.

**Creates:**
- `src/components/export/ExportDialog.tsx`
- `src/components/export/RenderProgress.tsx`

### Subtask 6: Credit System + Storage Management (1 day)

**Credits:**
1. Add `render_credits` column to `profiles` table (integer, default 0).
2. Pro subscription includes N credits/month (set via Supabase cron or Stripe webhook).
3. Credit packs purchasable (10 credits for $X) via Stripe Checkout.
4. Edge Function checks + decrements credits atomically (Postgres transaction).

**Storage management:**
1. Supabase Storage bucket `drum-renders` with per-user folders.
2. 30-day retention: Supabase cron job deletes renders older than 30 days.
3. Per-user quota: 500 MB total. Check before uploading new renders.
4. Metadata table: `drum_renders` (id, user_id, project_id, render_id, format, file_size, created_at, expires_at, storage_path).

**SQL migration:**
```sql
ALTER TABLE profiles ADD COLUMN render_credits integer DEFAULT 0;

CREATE TABLE drum_renders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  render_id text NOT NULL,
  format text NOT NULL CHECK (format IN ('wav', 'mp3')),
  file_size_bytes bigint NOT NULL,
  source text NOT NULL CHECK (source IN ('ai', 'fallback')),
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '30 days'
);

ALTER TABLE drum_renders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own renders" ON drum_renders
  FOR ALL USING (auth.uid() = user_id);
```

### Subtask 7: Quality Assurance (1 day)

Manual testing across all supported genres:

1. **Audio quality listening test:** Generate Studio Quality exports for all 10 genres. Rate each 1-5 on realism, warmth, genre-appropriateness, and mix balance.
2. **Tempo accuracy verification:** For each render, detect BPM of exported audio and verify it matches project tempo within 0.1 BPM.
3. **Section alignment check:** Verify fills, crashes, and energy changes land at expected bar positions.
4. **Fallback test:** Mock AI API failure. Verify Standard Quality export works seamlessly.
5. **Credit system test:** Verify credits are deducted, zero-credit users are blocked from Studio Quality, credits are not deducted on fallback.
6. **Storage test:** Verify files appear in Supabase Storage, are downloadable, and respect the 30-day retention policy.
7. **Cross-browser download test:** Verify WAV and MP3 downloads work in Chrome, Firefox, Safari.

---

## Primitive 5: Evaluation Design

### Test Case 1: Audio Quality (Manual Listening)

```
Generate Studio Quality export for Rock genre, 120 BPM, 16 bars (Intro 4, Verse 8, Chorus 4).
Listen on studio monitors.
Verify: drums sound like a real kit in a room, not synthesized or sample-based.
Verify: fills at section boundaries, crash on chorus beat 1, appropriate energy.
Rate: 1-5 on realism, warmth, genre-fit, mix balance. Must average >= 3.5.
```

### Test Case 2: Tempo Alignment

```
Generate export for tempo 120.0 BPM. Detect actual BPM of exported audio.
Verify: |detected - 120.0| < 0.1 BPM.
Verify: beat onset at bar 1 is at t=0.0s +/- 5ms.
Verify: beat onset at bar 16 is at t=32.0s +/- 5ms.
Repeat for tempos: 80, 100, 120, 140, 160, 180.
```

### Test Case 3: Fallback on API Failure

```
Set AI API endpoint to non-existent URL (or mock 500 response).
Click "Export Studio Quality."
Verify: no crash, no infinite spinner.
Verify: user sees toast "Studio quality unavailable. Exported standard quality."
Verify: download link appears, audio plays correctly.
Verify: no render credit deducted.
```

### Test Case 4: Export Latency

```
Generate Studio Quality export for 32-bar arrangement at 120 BPM (~2 min audio).
Measure time from "Export" click to download link appearing.
Verify: < 120 seconds total pipeline time.
Verify: progress indicator updates at least 3 times during the process.
```

### Test Case 5: Credit System

```
Set user render_credits = 1.
Export Studio Quality. Verify: succeeds, credits = 0.
Export Studio Quality again. Verify: blocked with message "No render credits remaining."
Verify: Standard Quality export still works (no credits required).
```

### Test Case 6: Full Genre Coverage

```
For each of {Rock, Country, Jazz, Blues, Funk, Bossa Nova, Reggae, Four-on-Floor, Gospel, Latin}:
  Generate 16-bar arrangement (Intro 4, Verse 8, Chorus 4).
  Export Studio Quality.
  Listen: verify drums sound appropriate for the genre.
  Verify: tempo, section alignment, fill placement all correct.
```

---

## AI Service Comparison (Evaluate at Implementation Time)

The AI audio landscape evolves rapidly. This comparison captures the state at spec time; re-evaluate when implementing.

| Service | Approach | Tempo Control | Section Control | Cost/Minute | Quality | Integration |
|---------|----------|---------------|-----------------|-------------|---------|-------------|
| ElevenLabs Music | Composition plan | Approximate (~2% deviation) | Section definitions + durations | ~$0.50 | High | REST API, mature |
| Soundverse | Full song + stem sep | Genre-implied | Genre/mood prompt | ~$0.10 | Medium-High | REST API |
| Stable Audio Open | Self-hosted diffusion | Approximate | Prompt-based | Compute only | Medium-High | Python SDK |
| DrumGPT (FADR) | AI one-shots + MIDI | Exact (MIDI) | Exact (MIDI) | ~$0.02 | Medium | Web only |

**Recommended:** ElevenLabs for highest quality. Soundverse as cost-effective alternative. DrumGPT Tier 3 hybrid (AI one-shots + MIDI patterns) as a fallback if full-audio APIs prove unreliable.

---

## Architecture Diagram

```
+-----------------+     +----------------------------+     +------------------+
| Browser Client  |     | Supabase Edge Function     |     | AI Audio API     |
|                 |     | /render-drums              |     | (ElevenLabs)     |
| 1. User clicks  |---->| 2. Auth + credit check     |     |                  |
|    "Export       |     | 3. Fetch arrangement data  |     |                  |
|    Studio"       |     | 4. Build composition plan  |---->| 5. Generate      |
|                 |     |    (genre styles, sections) |     |    drum audio    |
|                 |     | 6. Receive raw audio        |<----| (WAV/PCM)        |
|                 |     | 7. Tempo-correct (rubberb.) |     +------------------+
|                 |     | 8. Format convert (WAV/MP3) |
|                 |     | 9. Upload to Storage        |     +------------------+
|                 |     | 10. Deduct credit           |     | Supabase Storage |
| 11. Download    |<----| 11. Return download URLs    |---->| drum-renders/    |
|     audio file  |     +----------------------------+     +------------------+
|                 |
| [Fallback path] |     +---------------------------+
| If API fails:   |     | Tone.js OfflineAudioCtx   |
| 12. Render via  |---->| Phase 3 sample drums      |
|     Tone.js     |     | Perfect tempo, lower      |
|     offline     |<----| quality                    |
+-----------------+     +---------------------------+
```

---

## Cost Projections

| Scenario | Renders/Month | API Cost | Storage | Total | Per-User |
|----------|--------------|----------|---------|-------|----------|
| 10 users, light | 50 | ~$25 | ~$0.50 | ~$26 | ~$2.60 |
| 50 users, moderate | 500 | ~$250 | ~$5 | ~$255 | ~$5.10 |
| 200 users, heavy | 2,000 | ~$1,000 | ~$20 | ~$1,020 | ~$5.10 |
| With 40% cache-hit* | Reduce API calls 40% | ~$600 | ~$20 | ~$620 | ~$3.10 |

*Cache-hit: if the same arrangement settings produce a cached render, serve from storage instead of re-rendering.

**Break-even pricing:** At $1.00/render to the user with 50% margin, need ~$2.00/render in revenue to cover API + storage + overhead. Credit packs of 10 renders for $10 would work.

---

## Open Questions (Resolve Before Implementation)

1. **Edge Function compute limits:** Can a Supabase Edge Function handle 90-second API calls + tempo correction + format conversion, or do we need a dedicated processing server?
2. **ElevenLabs drum isolation quality:** Does force_instrumental + drum-focused composition_plan produce clean drum-only audio, or do we need stem separation as a second step?
3. **User expectations around "studio quality":** How much better does the AI render need to sound compared to Phase 3 samples to justify the render cost? Define a minimum quality bar before launching.
4. **Full-mix export timing:** Should Phase 4 ship drums-only export first, then add full-mix as a follow-up? Or ship full-mix from day one?
5. **Caching strategy:** Should identical arrangement settings produce the same render (cache by settings hash) or should each render be unique (different AI seeds)?
