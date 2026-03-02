// Supabase Edge Function: POST /functions/v1/generate
// Runs in Deno runtime. Receives a GenerationRequest, returns a GenerationResponse.
// MVP: delegates to rule-based MIDI generator. Future: swap in AI API call here.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// ---- Inline types (Deno edge function can't import from src/) ----

interface MidiNoteData {
  note: string;
  time: number;
  duration: number;
  velocity: number;
}

interface ChordEntry {
  bar_number: number;
  degree: string | null;
  quality: string | null;
  bass_degree: string | null;
}

interface GenerationRequest {
  project_id: string;
  key: string;
  tempo: number;
  time_signature: string;
  genre: string;
  sub_style: string;
  energy: number;
  groove: number;
  swing_pct: number | null;
  dynamics: number;
  chords: ChordEntry[];
  generation_hints: string;
  stems: string[];
}

interface SectionData { name: string; sort_order: number; bar_count: number; start_bar: number; }
interface StemData { instrument: string; sort_order: number; }
interface BlockData {
  stem_instrument: string; section_name: string; start_bar: number; end_bar: number;
  chord_degree: string | null; chord_quality: string | null; style: string; midi_data: MidiNoteData[];
}
interface ChordData { bar_number: number; degree: string | null; quality: string | null; bass_degree: string | null; }
interface GenerationResponse { sections: SectionData[]; stems: StemData[]; blocks: BlockData[]; chords: ChordData[]; }

// ---- Minimal chord utilities (duplicated for edge function isolation) ----

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const KEY_SEMITONES: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};
const ROMAN_SEMITONES: Record<string, number> = { I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11 };
const QUALITY_INTERVALS: Record<string, number[]> = {
  '': [0, 4, 7], maj: [0, 4, 7], min: [0, 3, 7], dom7: [0, 4, 7, 10],
  min7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6],
};

function degreeToNote(degree: string, key: string): string {
  let rest = degree;
  let mod = 0;
  if (rest.startsWith('b')) { mod = -1; rest = rest.slice(1); }
  else if (rest.startsWith('#')) { mod = 1; rest = rest.slice(1); }
  const semitones = ROMAN_SEMITONES[rest.toUpperCase()] ?? 0;
  const keySemitone = KEY_SEMITONES[key] ?? 0;
  return CHROMATIC[((keySemitone + semitones + mod) % 12 + 12) % 12];
}

function getChordTones(degree: string | null, quality: string | null, key: string, octave: number): string[] {
  if (!degree) return [];
  const root = degreeToNote(degree, key);
  const intervals = QUALITY_INTERVALS[quality ?? ''] ?? [0, 4, 7];
  const rootSemitone = KEY_SEMITONES[root] ?? 0;
  return intervals.map((i) => CHROMATIC[(rootSemitone + i) % 12] + octave);
}

// ---- Minimal MIDI generator (same logic as src/lib/midi-generator.ts) ----

function createSections(totalBars: number): SectionData[] {
  if (totalBars <= 4) return [{ name: 'Verse', sort_order: 0, bar_count: totalBars, start_bar: 1 }];
  if (totalBars === 12) return [
    { name: 'Intro', sort_order: 0, bar_count: 4, start_bar: 1 },
    { name: 'Verse', sort_order: 1, bar_count: 4, start_bar: 5 },
    { name: 'Chorus', sort_order: 2, bar_count: 4, start_bar: 9 },
  ];
  if (totalBars === 16) return [
    { name: 'Intro', sort_order: 0, bar_count: 4, start_bar: 1 },
    { name: 'Verse', sort_order: 1, bar_count: 8, start_bar: 5 },
    { name: 'Chorus', sort_order: 2, bar_count: 4, start_bar: 13 },
  ];
  const sectionSize = Math.min(8, Math.ceil(totalBars / 4));
  const sections: SectionData[] = [];
  const names = ['Intro', 'Verse', 'Chorus', 'Bridge', 'Outro'];
  let bar = 1; let i = 0;
  while (bar <= totalBars) {
    const count = Math.min(sectionSize, totalBars - bar + 1);
    sections.push({ name: names[i % names.length], sort_order: i, bar_count: count, start_bar: bar });
    bar += count; i++;
  }
  return sections;
}

const GENRE_STYLES: Record<string, Record<string, string>> = {
  Jazz: { drums: 'jazz_brush_swing', bass: 'walking', piano: 'jazz_comp', guitar: 'fingerpick_arpeggios', strings: 'sustained_pad' },
  Rock: { drums: 'rock_straight', bass: 'pick', piano: 'block_chords', guitar: 'power_chords', strings: 'sustained_pad' },
  Blues: { drums: 'funk_pocket', bass: 'fingerstyle', piano: 'block_chords', guitar: 'rhythm_strum', strings: 'sustained_pad' },
  Funk: { drums: 'funk_pocket', bass: 'slap', piano: 'jazz_comp', guitar: 'muted_funk', strings: 'sustained_pad' },
};

function buildSimpleMidi(instrument: string, chords: ChordEntry[], key: string, genre: string): MidiNoteData[] {
  const notes: MidiNoteData[] = [];
  for (let bar = 0; bar < chords.length; bar++) {
    const chord = chords[bar];
    const offset = bar * 4;
    if (instrument === 'drums') {
      notes.push({ note: 'C2', time: offset, duration: 0.25, velocity: 90 });
      notes.push({ note: 'D2', time: offset + 1, duration: 0.2, velocity: 80 });
      notes.push({ note: 'C2', time: offset + 2, duration: 0.25, velocity: 85 });
      notes.push({ note: 'D2', time: offset + 3, duration: 0.2, velocity: 80 });
    } else {
      const tones = getChordTones(chord?.degree ?? null, chord?.quality ?? null, key, instrument === 'bass' ? 2 : 4);
      const root = tones[0] ?? 'C4';
      notes.push({ note: root, time: offset, duration: 3.8, velocity: 75 });
      if (tones[1] && instrument !== 'bass') notes.push({ note: tones[1], time: offset, duration: 3.8, velocity: 65 });
    }
    // Unused vars suppressed
    void genre;
  }
  return notes;
}

function generate(request: GenerationRequest): GenerationResponse {
  const totalBars = Math.max(request.chords.length, 1);
  const sections = createSections(totalBars);
  const stems: StemData[] = request.stems.map((inst, i) => ({ instrument: inst, sort_order: i }));
  const blocks: BlockData[] = [];

  for (const stem of stems) {
    for (const section of sections) {
      const sectionChords = request.chords.slice(section.start_bar - 1, section.start_bar - 1 + section.bar_count);
      const styleMap = GENRE_STYLES[request.genre] ?? GENRE_STYLES['Jazz'];
      blocks.push({
        stem_instrument: stem.instrument,
        section_name: section.name,
        start_bar: section.start_bar,
        end_bar: section.start_bar + section.bar_count - 1,
        chord_degree: sectionChords[0]?.degree ?? null,
        chord_quality: sectionChords[0]?.quality ?? null,
        style: styleMap?.[stem.instrument] ?? 'jazz_comp',
        midi_data: buildSimpleMidi(stem.instrument, sectionChords, request.key, request.genre),
      });
    }
  }

  return {
    sections,
    stems,
    blocks,
    chords: request.chords.map((c) => ({ bar_number: c.bar_number, degree: c.degree, quality: c.quality, bass_degree: c.bass_degree })),
  };
}

// ---- HTTP handler ----

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const request: GenerationRequest = await req.json();
    const response: GenerationResponse = generate(request);
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
