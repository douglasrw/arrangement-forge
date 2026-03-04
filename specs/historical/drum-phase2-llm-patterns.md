# Phase 2: LLM-Generated MIDI Drum Patterns

**Status:** DEFERRED (pick up after Phase 1 is complete and validated)
**Author:** Engineering Coach (Planning Mode)
**Date:** 2026-03-03
**Estimated effort:** 8-12 hours across 5 subtasks
**Depends on:** Phase 1 (pattern library + synthesized drum kit must be working)

---

## Primitive 1: Self-Contained Problem Statement

Phase 1 ships a hand-authored pattern library covering 10 genres with 5 variants each -- 50 total pattern definitions. While this is a massive improvement over the current 3 patterns, it is inherently limited: each genre has a fixed set of grooves that will sound identical across every project in that genre. A user creating their third Jazz project will hear the exact same drum pattern every time.

The goal of Phase 2 is to replace the hand-authored patterns with LLM-generated MIDI drum patterns that respond to the full context of the arrangement: genre, substyle, tempo, energy, section structure, chord progression, and free-text generation hints. Each generation produces unique, musically appropriate drum MIDI data that plays through the existing synthesized DrumKit (Phase 1) or sampled kit (Phase 3).

**Key architectural insight:** The LLM generates MIDI note data (JSON arrays of {note, time, duration, velocity}), not audio. This means:
- Perfect tempo sync with other MIDI stems (the MIDI is played at the Transport's exact BPM).
- Bar-level control is preserved (the LLM is told exactly how many bars, which sections, where fills go).
- Generated patterns can be edited note-by-note in future UI iterations.
- Cost is ~$0.03/generation vs. ~$0.50/minute for audio APIs.
- Latency is ~3-5 seconds vs. ~30 seconds for audio APIs.

**What this is NOT:**
- This is NOT a replacement for the Phase 1 pattern library. Phase 1 patterns serve as the fallback when the API is unavailable, the user is offline, or the LLM produces invalid output.
- This is NOT a real-time feature. The LLM is called once when the user clicks "Generate" (or "Regenerate Drums"). During playback, the cached MIDI data plays.
- This is NOT an audio generation task. The output is MIDI note data, not an audio file.

---

## Primitive 2: Acceptance Criteria

### AC-1: LLM generates valid MIDI drum patterns

When the user generates an arrangement, the system calls an LLM API (Claude or GPT) with a structured prompt describing the musical context. The LLM returns a JSON array of `MidiNoteData` objects. The system validates the response against the existing `MidiNoteData` schema and the GM drum note map from Phase 1. Invalid notes are silently dropped. If the response is entirely invalid (unparseable JSON, empty array), the system falls back to Phase 1 patterns.

### AC-2: Patterns are genre-aware and section-aware

The LLM prompt includes genre, substyle, tempo, time signature, energy, dynamics, section names, bar counts, and section order. The returned patterns demonstrate genre-appropriate characteristics:
- Jazz: ride cymbal spang-a-lang, ghost snare comping, feathered kick.
- Rock: straight 8th-note hats, kick on 1/3, snare on 2/4.
- Bossa Nova: straight 8ths, cross-stick clave, bass drum ostinato.
- Fills appear at section boundaries.
- Crashes on chorus/bridge downbeats.
- Energy level affects density.

### AC-3: Patterns are cached

The same project settings produce the same drum patterns without re-calling the API. Cache key: hash of (genre + substyle + tempo + timeSignature + energy + dynamics + swingPct + sectionNames + sectionBarCounts + generationHints). Cache storage: Supabase `blocks.midi_data` (already stored there). Optional: a dedicated `drum_pattern_cache` table for reuse across projects with identical settings.

### AC-4: Fallback to Phase 1 on failure

If the LLM API call fails (network error, rate limit, invalid response), the system falls back to the Phase 1 hand-authored patterns. The user sees no error -- the patterns just play. A console warning is logged for debugging.

### AC-5: Cost is bounded

Each generation costs no more than $0.10 in API credits. The prompt is designed to be token-efficient: ~500 input tokens, ~2000 output tokens for a typical 16-bar arrangement. At Claude Sonnet pricing (~$3/1M input + $15/1M output tokens), this is ~$0.03 per generation.

### AC-6: Generation happens server-side

The LLM API call is made from a Supabase Edge Function, not the client. The API key is never exposed to the browser. The client sends the project settings to the edge function, which calls the LLM and returns the MIDI data.

### AC-7: Response validates against MidiNoteData schema

Every returned note must have:
- `note`: a string in the Phase 1 GM drum note set (C2, D2, C#2, F#2, A#2, G#2, A2, D3, C#3, D#3, F3).
- `time`: a non-negative number (beats from section start).
- `duration`: a positive number (beats).
- `velocity`: an integer 1-127.

Notes with invalid fields are dropped. If fewer than 2 valid notes remain per bar, the section falls back to Phase 1 patterns.

---

## Primitive 3: Constraint Architecture

### Musts

1. **Must** call the LLM from a Supabase Edge Function, never from the client.
2. **Must** validate all returned MIDI data against the GM drum note set and MidiNoteData schema.
3. **Must** fall back to Phase 1 patterns on any failure (parse error, network error, empty result, rate limit).
4. **Must** use the existing `MidiNoteData` format -- no type changes.
5. **Must** keep the LLM API key in Supabase secrets (not in `.env.local` on the client).
6. **Must** work with the existing `generate()` flow -- the drum MIDI is returned as part of `BlockData.midi_data`.

### Must-Nots

1. **Must not** expose the LLM API key to the browser.
2. **Must not** make the client wait indefinitely -- timeout the LLM call at 15 seconds and fall back.
3. **Must not** generate audio (this is MIDI only).
4. **Must not** modify the `MidiNoteData`, `BlockData`, or `GenerationResponse` types.
5. **Must not** call the LLM during playback (only on Generate/Regenerate).

### Preferences

1. **Prefer** Claude Sonnet for cost efficiency (same quality as Opus for structured MIDI output at lower cost).
2. **Prefer** structured output (JSON mode) over free-text parsing.
3. **Prefer** a single LLM call for the entire arrangement (all sections at once) to ensure coherent fills and transitions.
4. **Prefer** caching at the Supabase level (Edge Function checks cache before calling LLM).

### Escalation Triggers

1. If LLM consistently produces musically incorrect patterns for a specific genre (verified by manual listening), stop and refine the prompt.
2. If token cost exceeds $0.10 per generation consistently, stop and optimize the prompt or switch to a cheaper model.
3. If the Edge Function cold start + LLM latency exceeds 20 seconds, consider a different hosting approach.

---

## Primitive 4: Decomposition

### Subtask 1: LLM Prompt Design + Validation (2 hours)

Design the structured prompt that produces valid drum MIDI. Test offline against Claude API with 5 genres, verify output validity.

**Prompt template:**

```
You are an expert drummer generating MIDI drum patterns for a backing track.

CONTEXT:
- Genre: {genre} ({subStyle})
- Tempo: {tempo} BPM
- Time signature: {timeSignature}
- Energy level: {energy}/100 (0=very sparse, 100=very dense)
- Dynamics: {dynamics}/100 (0=very soft, 100=very loud)
- Swing: {swingPct}% (50=straight, 66=triplet swing, 75=hard swing)

ARRANGEMENT STRUCTURE:
{sections.map(s => `${s.name}: ${s.barCount} bars`).join('\n')}

VALID DRUM NOTES (General MIDI):
C2=Kick, C#2=SideStick, D2=Snare, F#2=ClosedHat, G#2=PedalHat,
A2=LowTom, A#2=OpenHat, C#3=Crash, D3=HighTom, D#3=Ride, F3=RideBell

RULES:
1. Return ONLY a JSON object: { "sections": [{ "name": string, "bars": [[{note,time,duration,velocity}]] }] }
2. Time is beats from START of that bar (0 = beat 1). Each bar has {beatsPerBar} beats.
3. Use genre-appropriate patterns.
4. Place fills in the last bar of each section (except the last -- use an ending there).
5. Crash cymbal on beat 1 of Chorus/Bridge sections.
6. Vary patterns between bars -- no two consecutive bars identical.
7. Ghost notes (velocity 25-40) for groove in Funk, Jazz, Gospel.
8. Energy {energy}: use appropriate density.
9. Velocities: integers 1-127.

{generationHints ? `ADDITIONAL INSTRUCTIONS: ${generationHints}` : ''}

Return ONLY the JSON.
```

**JSON schema for the response:**

```typescript
interface LLMDrumResponse {
  sections: {
    name: string;
    bars: MidiNoteData[][];  // bars[barIndex] = array of notes for that bar
  }[];
}
```

**Validation function:**

```typescript
function validateLLMResponse(raw: unknown): LLMDrumResponse | null {
  // 1. Parse JSON (handle markdown code fences if present)
  // 2. Check sections array exists and is non-empty
  // 3. For each section: check name and bars array
  // 4. For each note: validate note in ALL_DRUM_NOTES, time >= 0, duration > 0, velocity 1-127
  // 5. Drop invalid notes silently
  // 6. If any section has < 2 valid notes per bar average, return null
  // 7. Return validated response
}
```

### Subtask 2: Supabase Edge Function (2 hours)

Create `supabase/functions/generate-drums/index.ts`:
1. Receive project settings as JSON POST body.
2. Authenticate the user (verify JWT).
3. Check optional cache table.
4. Build LLM prompt from settings.
5. Call Anthropic API with the prompt (model: `claude-sonnet-4-20250514`, max_tokens: 4096).
6. Validate response.
7. Store in cache.
8. Return validated MIDI data.
9. On any failure: return `{ sections: [], source: 'fallback' }`.

**API key:** stored in Supabase secrets: `supabase secrets set ANTHROPIC_API_KEY=sk-...`

**Function request/response:**

```typescript
// POST body:
interface DrumGenerationRequest {
  genre: string;
  subStyle: string;
  tempo: number;
  timeSignature: string;
  energy: number;
  dynamics: number;
  swingPct: number | null;
  sections: { name: string; barCount: number }[];
  generationHints: string;
}

// Response:
interface DrumGenerationResponse {
  sections: {
    name: string;
    midiData: MidiNoteData[];  // All bars concatenated, times relative to section start
  }[];
  source: 'llm' | 'fallback';
}
```

### Subtask 3: Client Integration (2 hours)

Modify the generation flow to optionally call the drum Edge Function before falling back to `buildDrumMidi`.

- Create `src/lib/drum-llm-client.ts` with `generateDrumsViaLLM(request: DrumGenerationRequest): Promise<DrumGenerationResponse | null>`.
- In `midi-generator.ts` or the generate hook, attempt the LLM call first for drums.
- If it succeeds, use the returned MIDI data for drum blocks.
- If it fails or times out (15 seconds), use `buildDrumMidi` from Phase 1.
- The `generate()` function may need to become async (coordinate with the calling hook).

### Subtask 4: Caching Strategy (1 hour)

- Cache key: SHA-256 of JSON.stringify({ genre, subStyle, tempo, timeSignature, energy, dynamics, swingPct, sections, generationHints }).
- Cache store: Supabase table `drum_pattern_cache` (id, cache_key UNIQUE, midi_data JSONB, model_id TEXT, created_at TIMESTAMPTZ).
- Edge Function checks cache before calling LLM.
- Cache TTL: 30 days (cron job or on-read check).
- No per-user isolation needed -- same settings produce same patterns regardless of user.

### Subtask 5: Rate Limiting + Cost Controls (1 hour)

- Per-user rate limit: 20 LLM generations per hour (checked via Supabase query on `drum_pattern_cache` with user_id).
- Track usage: add `user_id` and `tokens_used` columns to cache table.
- If limit exceeded: return fallback response immediately.
- Cost monitoring: log token counts, compute estimated cost per generation.

---

## Primitive 5: Evaluation Design

### Test Case 1: Valid JSON Output

```
Call Edge Function with: genre='Rock', tempo=120, 3 sections (Intro 4, Verse 8, Chorus 4).
Verify: parseable JSON, 3 sections, correct bar counts, all notes valid GM drum names, all velocities 1-127.
```

### Test Case 2: Genre Correctness (Manual Listening)

```
Generate for all 10 genres. Play through DrumKit. Verify each sounds like the genre.
```

### Test Case 3: Fallback on API Failure

```
Mock API to return 500 error. Verify: no crash, Phase 1 patterns used, console warning logged.
```

### Test Case 4: Cache Hit

```
Generate twice with identical settings. Verify: second call < 100ms, output identical, one API call made.
```

### Test Case 5: Cost Verification

```
Generate for 32-bar arrangement. Verify: input < 800 tokens, output < 4000 tokens, cost < $0.10.
```

---

## Cost Projections

| Scenario | Generations/Month | Monthly Cost | Notes |
|----------|-------------------|-------------|-------|
| 10 users, light | 100 | ~$3 | |
| 50 users, moderate | 1,000 | ~$30 | |
| 200 users, heavy | 10,000 | ~$300 | |
| With 60% cache hit rate | Reduce API calls by 60% | ~$120 | Same 200 users |

Compare to ElevenLabs audio: 200 users x 50 gens x 2 min = $10,000/month. LLM MIDI is ~80x cheaper.

---

## Architecture Diagram

```
+------------------+     +-----------------------------+     +------------------+
|  Browser Client  |     | Supabase Edge Function      |     | Anthropic API    |
|                  |     | /generate-drums             |     |                  |
|  1. User clicks  |---->| 2. Check cache              |     |                  |
|     "Generate"   |     |    (drum_pattern_cache)      |     |                  |
|                  |     | 3. Cache miss? Build prompt  |---->| 4. Generate MIDI |
|                  |     | 5. Validate response         |<----| (JSON output)    |
|                  |     | 6. Store in cache            |     |                  |
|                  |     | 7. Return MIDI data          |     +------------------+
|  8. Use in       |<----|                              |
|     drum blocks  |     +-----------------------------+
|  9. Play through |
|     DrumKit      |     +------------------+
|                  |     | Phase 1 Fallback |
|  (if API fails)  |<--->| buildDrumMidi()  |
|                  |     +------------------+
+------------------+
```

---

## Open Questions (to resolve before implementation)

1. **Which LLM model?** Claude Sonnet is recommended for cost. GPT-4o-mini is an alternative. Test both for MIDI output quality.
2. **Should the LLM generate for all stems or just drums?** This spec covers drums only. A future spec could extend to LLM-generated bass, piano, guitar patterns using the same architecture.
3. **Should the user see "AI-generated" vs "pattern library" distinction?** For MVP, no -- they just hear better drums.
4. **Should "regenerate drums only" be a separate action?** Yes, but that is a UI spec, not this spec.
