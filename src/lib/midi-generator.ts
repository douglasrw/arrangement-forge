// midi-generator.ts — Rule-based MIDI generator (MVP "AI").
// Same API contract as the future AI service — swap implementation later.
// Must not call any external API.

import type {
  GenerationRequest,
  GenerationResponse,
  SectionData,
  StemData,
  BlockData,
  ChordData,
  ChordEntry,
  MidiNoteData,
} from '@/types';
import { degreeToNote } from './chords';

// ---------- Section Creation ----------

function createSections(totalBars: number): SectionData[] {
  if (totalBars === 12) {
    return [
      { name: 'Intro', sort_order: 0, bar_count: 4, start_bar: 1 },
      { name: 'Verse', sort_order: 1, bar_count: 4, start_bar: 5 },
      { name: 'Chorus', sort_order: 2, bar_count: 4, start_bar: 9 },
    ];
  }
  if (totalBars === 16) {
    return [
      { name: 'Intro', sort_order: 0, bar_count: 4, start_bar: 1 },
      { name: 'Verse', sort_order: 1, bar_count: 8, start_bar: 5 },
      { name: 'Chorus', sort_order: 2, bar_count: 4, start_bar: 13 },
    ];
  }
  if (totalBars === 32) {
    return [
      { name: 'Intro', sort_order: 0, bar_count: 4, start_bar: 1 },
      { name: 'Verse 1', sort_order: 1, bar_count: 8, start_bar: 5 },
      { name: 'Chorus', sort_order: 2, bar_count: 8, start_bar: 13 },
      { name: 'Verse 2', sort_order: 3, bar_count: 8, start_bar: 21 },
      { name: 'Outro', sort_order: 4, bar_count: 4, start_bar: 29 },
    ];
  }
  // General case: divide into sections of 4-8 bars
  return divideSections(totalBars);
}

function divideSections(totalBars: number): SectionData[] {
  const SECTION_NAMES = ['Intro', 'Verse', 'Chorus', 'Bridge', 'Outro'];
  const sectionSize = totalBars <= 8 ? totalBars : Math.min(8, Math.ceil(totalBars / 4));
  const sections: SectionData[] = [];
  let bar = 1;
  let sortOrder = 0;
  while (bar <= totalBars) {
    const count = Math.min(sectionSize, totalBars - bar + 1);
    sections.push({
      name: SECTION_NAMES[sortOrder % SECTION_NAMES.length],
      sort_order: sortOrder,
      bar_count: count,
      start_bar: bar,
    });
    bar += count;
    sortOrder++;
  }
  return sections;
}

// ---------- Style Assignment ----------

const GENRE_STYLES: Record<string, Record<string, string>> = {
  Jazz: {
    drums: 'jazz_brush_swing',
    bass: 'walking',
    piano: 'jazz_comp',
    guitar: 'fingerpick_arpeggios',
    strings: 'sustained_pad',
  },
  Blues: {
    drums: 'funk_pocket',
    bass: 'fingerstyle',
    piano: 'block_chords',
    guitar: 'rhythm_strum',
    strings: 'sustained_pad',
  },
  Rock: {
    drums: 'rock_straight',
    bass: 'pick',
    piano: 'block_chords',
    guitar: 'power_chords',
    strings: 'sustained_pad',
  },
  Funk: {
    drums: 'funk_pocket',
    bass: 'slap',
    piano: 'jazz_comp',
    guitar: 'muted_funk',
    strings: 'sustained_pad',
  },
  Latin: {
    drums: 'jazz_brush_swing',
    bass: 'fingerstyle',
    piano: 'arpeggiated',
    guitar: 'fingerpick_arpeggios',
    strings: 'sustained_pad',
  },
};

function getStyle(instrument: string, genre: string): string {
  return GENRE_STYLES[genre]?.[instrument] ?? GENRE_STYLES['Jazz']?.[instrument] ?? 'jazz_comp';
}

// ---------- Music Theory ----------

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const NOTE_SEMITONES: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

const QUALITY_INTERVALS: Record<string, number[]> = {
  '': [0, 4, 7],
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dom7: [0, 4, 7, 10],
  min7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  'half-dim7': [0, 3, 6, 10],
  aug: [0, 4, 8],
};

function noteToMidi(noteName: string, octave: number): string {
  const semitone = NOTE_SEMITONES[noteName] ?? 0;
  return CHROMATIC[semitone] + octave;
}

function getChordTones(degree: string | null, quality: string | null, key: string, octave: number): string[] {
  if (!degree) return [];
  const root = degreeToNote(degree, key);
  const intervals = QUALITY_INTERVALS[quality ?? ''] ?? QUALITY_INTERVALS[''];
  const rootSemitone = NOTE_SEMITONES[root] ?? 0;
  return intervals.map((interval) => {
    const semitone = (rootSemitone + interval) % 12;
    return CHROMATIC[semitone] + octave;
  });
}

// ---------- MIDI Generation Per Instrument ----------

function buildJazzDrumBar(barOffset: number): MidiNoteData[] {
  // Ride on every beat, snare on 2 and 4
  const notes: MidiNoteData[] = [];
  for (let beat = 0; beat < 4; beat++) {
    notes.push({ note: 'D#3', time: barOffset + beat, duration: 0.2, velocity: beat % 2 === 0 ? 70 : 60 });
  }
  notes.push({ note: 'D2', time: barOffset + 1, duration: 0.2, velocity: 80 });
  notes.push({ note: 'D2', time: barOffset + 3, duration: 0.2, velocity: 80 });
  if (barOffset === 0) {
    notes.push({ note: 'C2', time: barOffset, duration: 0.3, velocity: 90 });
  }
  return notes;
}

function buildRockDrumBar(barOffset: number): MidiNoteData[] {
  const notes: MidiNoteData[] = [];
  // Kick on 1 and 3
  notes.push({ note: 'C2', time: barOffset + 0, duration: 0.25, velocity: 100 });
  notes.push({ note: 'C2', time: barOffset + 2, duration: 0.25, velocity: 90 });
  // Snare on 2 and 4
  notes.push({ note: 'D2', time: barOffset + 1, duration: 0.2, velocity: 90 });
  notes.push({ note: 'D2', time: barOffset + 3, duration: 0.2, velocity: 90 });
  // Hats on every 8th
  for (let i = 0; i < 8; i++) {
    notes.push({ note: 'F#2', time: barOffset + i * 0.5, duration: 0.1, velocity: i % 2 === 0 ? 70 : 50 });
  }
  return notes;
}

function buildFunkDrumBar(barOffset: number): MidiNoteData[] {
  const notes: MidiNoteData[] = [];
  notes.push({ note: 'C2', time: barOffset + 0, duration: 0.2, velocity: 100 });
  notes.push({ note: 'C2', time: barOffset + 2.5, duration: 0.2, velocity: 80 });
  notes.push({ note: 'D2', time: barOffset + 1, duration: 0.2, velocity: 85 });
  notes.push({ note: 'D2', time: barOffset + 3, duration: 0.2, velocity: 85 });
  notes.push({ note: 'D2', time: barOffset + 3.5, duration: 0.1, velocity: 50 });
  for (let i = 0; i < 16; i++) {
    notes.push({ note: 'F#2', time: barOffset + i * 0.25, duration: 0.05, velocity: i % 4 === 0 ? 70 : 45 });
  }
  return notes;
}

function buildDrumBar(genre: string, barOffset: number): MidiNoteData[] {
  if (genre === 'Rock' || genre === 'Blues') return buildRockDrumBar(barOffset);
  if (genre === 'Funk' || genre === 'R&B') return buildFunkDrumBar(barOffset);
  return buildJazzDrumBar(barOffset); // Jazz, Latin, Gospel, Country, Pop default
}

function buildBassNotes(
  chord: ChordEntry,
  key: string,
  genre: string,
  barOffset: number
): MidiNoteData[] {
  if (!chord.degree) return [{ note: 'C2', time: barOffset, duration: 3.8, velocity: 70 }];
  const tones = getChordTones(chord.degree, chord.quality, key, 2);
  const root = tones[0] ?? 'C2';
  const third = tones[1] ?? root;
  const fifth = tones[2] ?? root;

  if (genre === 'Jazz' || genre === 'Blues') {
    // Walking bass: root → 3rd → 5th → chromatic approach
    const approach = noteToMidi(degreeToNote(chord.degree, key), 2);
    return [
      { note: root, time: barOffset + 0, duration: 0.9, velocity: 85 },
      { note: third, time: barOffset + 1, duration: 0.9, velocity: 75 },
      { note: fifth, time: barOffset + 2, duration: 0.9, velocity: 80 },
      { note: approach, time: barOffset + 3, duration: 0.9, velocity: 70 },
    ];
  }
  // Default: root on beat 1, root on beat 3
  return [
    { note: root, time: barOffset + 0, duration: 1.8, velocity: 85 },
    { note: root, time: barOffset + 2, duration: 1.8, velocity: 75 },
  ];
}

function buildPianoNotes(
  chord: ChordEntry,
  key: string,
  genre: string,
  barOffset: number
): MidiNoteData[] {
  if (!chord.degree) return [];
  const tones = getChordTones(chord.degree, chord.quality, key, 4);
  if (tones.length === 0) return [];

  if (genre === 'Jazz') {
    // Off-beat jazz comping: beats 1.5 and 3
    return [
      ...tones.map((n) => ({ note: n, time: barOffset + 1.5, duration: 0.8, velocity: 70 })),
      ...tones.map((n) => ({ note: n, time: barOffset + 3, duration: 0.8, velocity: 65 })),
    ];
  }
  // Default: chord on beat 1 and beat 3
  return [
    ...tones.map((n) => ({ note: n, time: barOffset + 0, duration: 1.8, velocity: 75 })),
    ...tones.map((n) => ({ note: n, time: barOffset + 2, duration: 1.8, velocity: 70 })),
  ];
}

function buildGuitarNotes(
  chord: ChordEntry,
  key: string,
  genre: string,
  barOffset: number
): MidiNoteData[] {
  if (!chord.degree) return [];
  const tones = getChordTones(chord.degree, chord.quality, key, 3);
  if (tones.length === 0) return [];

  if (genre === 'Funk') {
    // Muted funk: 16th note chops on upbeats
    return [0.5, 1.5, 2.5, 3.5].flatMap((beat) =>
      tones.map((n) => ({ note: n, time: barOffset + beat, duration: 0.2, velocity: 65 }))
    );
  }
  if (genre === 'Jazz') {
    // Arpeggiated: one note per beat
    return tones.slice(0, 4).map((n, i) => ({
      note: n,
      time: barOffset + i,
      duration: 0.9,
      velocity: 65,
    }));
  }
  // Default strum: beats 1, 2, 3, 4
  return [0, 1, 2, 3].flatMap((beat) =>
    tones.map((n) => ({ note: n, time: barOffset + beat, duration: 0.85, velocity: 70 }))
  );
}

function buildStringsNotes(
  chord: ChordEntry,
  key: string,
  barOffset: number,
  barCount: number
): MidiNoteData[] {
  if (!chord.degree) return [];
  const tones = getChordTones(chord.degree, chord.quality, key, 4);
  const padTones = tones.slice(0, 2); // root + third for pad
  return padTones.map((n) => ({
    note: n,
    time: barOffset,
    duration: barCount * 4 - 0.1,
    velocity: 60,
  }));
}

// ---------- Block Generation ----------

function generateMidiForBlock(
  instrument: string,
  barCount: number,
  chordsForBlock: ChordEntry[],
  key: string,
  genre: string
): MidiNoteData[] {
  const notes: MidiNoteData[] = [];

  if (instrument === 'strings') {
    // Strings hold over entire block
    const first = chordsForBlock[0];
    if (first) notes.push(...buildStringsNotes(first, key, 0, barCount));
    return notes;
  }

  for (let i = 0; i < barCount; i++) {
    const chord = chordsForBlock[i] ?? chordsForBlock[chordsForBlock.length - 1];
    if (!chord) continue;
    const barOffset = i * 4; // beats per bar = 4 (simplified; time sig handled by engine)

    switch (instrument) {
      case 'drums':
        notes.push(...buildDrumBar(genre, barOffset));
        break;
      case 'bass':
        notes.push(...buildBassNotes(chord, key, genre, barOffset));
        break;
      case 'piano':
        notes.push(...buildPianoNotes(chord, key, genre, barOffset));
        break;
      case 'guitar':
        notes.push(...buildGuitarNotes(chord, key, genre, barOffset));
        break;
    }
  }

  return notes;
}

// ---------- Main Generate Function ----------

export function generate(request: GenerationRequest): GenerationResponse {
  const totalBars = request.chords.length || 8;
  const sections = createSections(totalBars);

  const stems: StemData[] = request.stems.map((instrument, i) => ({
    instrument,
    sort_order: i,
  }));

  const blocks: BlockData[] = [];
  for (const stem of stems) {
    for (const section of sections) {
      const sectionChords = request.chords.slice(
        section.start_bar - 1,
        section.start_bar - 1 + section.bar_count
      );
      const firstChord = sectionChords[0];

      blocks.push({
        stem_instrument: stem.instrument,
        section_name: section.name,
        start_bar: section.start_bar,
        end_bar: section.start_bar + section.bar_count - 1,
        chord_degree: firstChord?.degree ?? null,
        chord_quality: firstChord?.quality ?? null,
        style: getStyle(stem.instrument, request.genre),
        midi_data: generateMidiForBlock(
          stem.instrument,
          section.bar_count,
          sectionChords,
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
