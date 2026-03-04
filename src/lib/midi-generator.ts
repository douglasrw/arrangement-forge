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
import { buildDrumMidi } from './drum-patterns';
import { getBassPattern, buildBassFromPattern } from './bass-patterns';
import { getPianoPattern, buildPianoFromPattern } from './piano-patterns';
import { getGuitarPattern, buildGuitarFromPattern } from './guitar-patterns';
import { buildStringsFromPattern } from './strings-patterns';

// ---------- Drum Context (passed to buildDrumMidi) ----------

export interface DrumContext {
  substyle: string;
  energy: number;
  dynamics: number;
  swingPct: number | null;
  groove: number;
  feel: number;
  beatsPerBar: number;
  sectionType: string;
  sectionIndex: number;
  isLastSection: boolean;
  totalBarsInSection: number;
  barNumberGlobal: number; // 1-based global start bar of this block
}

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
  const nameCount: Record<string, number> = {};
  let bar = 1;
  let sortOrder = 0;
  while (bar <= totalBars) {
    const count = Math.min(sectionSize, totalBars - bar + 1);
    const baseName = SECTION_NAMES[sortOrder % SECTION_NAMES.length];
    nameCount[baseName] = (nameCount[baseName] ?? 0) + 1;
    const name = nameCount[baseName] > 1 ? `${baseName} ${nameCount[baseName]}` : baseName;
    sections.push({
      name,
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
    drums: 'blues_shuffle',
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
    drums: 'bossa_nova',
    bass: 'fingerstyle',
    piano: 'arpeggiated',
    guitar: 'fingerpick_arpeggios',
    strings: 'sustained_pad',
  },
  Country: {
    drums: 'country_shuffle',
    bass: 'fingerstyle',
    piano: 'block_chords',
    guitar: 'fingerpick_arpeggios',
    strings: 'sustained_pad',
  },
  Gospel: {
    drums: 'gospel_drive',
    bass: 'fingerstyle',
    piano: 'block_chords',
    guitar: 'rhythm_strum',
    strings: 'sustained_pad',
  },
  'R&B': {
    drums: 'rnb_groove',
    bass: 'fingerstyle',
    piano: 'jazz_comp',
    guitar: 'rhythm_strum',
    strings: 'sustained_pad',
  },
  Pop: {
    drums: 'pop_four_on_floor',
    bass: 'pick',
    piano: 'block_chords',
    guitar: 'rhythm_strum',
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

export function noteToMidi(noteName: string, octave: number): string {
  const semitone = NOTE_SEMITONES[noteName] ?? 0;
  return CHROMATIC[semitone] + octave;
}

export function getChordTones(degree: string | null, quality: string | null, key: string, octave: number): string[] {
  if (!degree) return [];
  const root = degreeToNote(degree, key);
  const intervals = QUALITY_INTERVALS[quality ?? ''] ?? QUALITY_INTERVALS[''];
  const rootSemitone = NOTE_SEMITONES[root] ?? 0;
  return intervals.map((interval) => {
    const semitone = (rootSemitone + interval) % 12;
    return CHROMATIC[semitone] + octave;
  });
}

// ---------- Block Generation ----------

export function generateMidiForBlock(
  instrument: string,
  barCount: number,
  chordsForBlock: ChordEntry[],
  key: string,
  genre: string,
  drumContext?: DrumContext,
  startBar: number = 1
): MidiNoteData[] {
  const notes: MidiNoteData[] = [];

  for (let i = 0; i < barCount; i++) {
    const chord = chordsForBlock[i] ?? chordsForBlock[chordsForBlock.length - 1];
    if (!chord) continue;

    const barOffset = i * 4;
    const barNumberGlobal = startBar + i;

    switch (instrument) {
      case 'drums': {
        if (!drumContext) {
          // Fallback: basic drum pattern (should not happen in practice)
          const barNotes = buildDrumMidi({
            genre,
            substyle: '',
            barCount: 1,
            beatsPerBar: 4,
            energy: 50,
            dynamics: 50,
            swingPct: null,
            groove: 0,
            feel: 0,
            sectionType: 'Verse',
            sectionIndex: 0,
            isLastSection: true,
            barNumberInSection: i,
            barNumberGlobal: i + 1,
            totalBarsInSection: barCount,
          });
          notes.push(...barNotes.map((n) => ({
            ...n,
            time: n.time + barOffset,
          })));
          break;
        }
        const barNotes = buildDrumMidi({
          genre,
          substyle: drumContext.substyle,
          barCount: 1,
          beatsPerBar: drumContext.beatsPerBar,
          energy: drumContext.energy,
          dynamics: drumContext.dynamics,
          swingPct: drumContext.swingPct,
          groove: drumContext.groove,
          feel: drumContext.feel,
          sectionType: drumContext.sectionType,
          sectionIndex: drumContext.sectionIndex,
          isLastSection: drumContext.isLastSection,
          barNumberInSection: i,
          barNumberGlobal: drumContext.barNumberGlobal + i,
          totalBarsInSection: drumContext.totalBarsInSection,
        });
        // Offset notes by bar position within block
        const drumBarOffset = i * drumContext.beatsPerBar;
        notes.push(...barNotes.map((n) => ({
          ...n,
          time: n.time + drumBarOffset,
        })));
        break;
      }
      case 'bass': {
        const style = getStyle('bass', genre);
        const pattern = getBassPattern(style);
        notes.push(...buildBassFromPattern(pattern, chord, key, barNumberGlobal, barOffset));
        break;
      }
      case 'piano': {
        const style = getStyle('piano', genre);
        const pattern = getPianoPattern(style);
        notes.push(...buildPianoFromPattern(pattern, chord, key, barNumberGlobal, barOffset));
        break;
      }
      case 'guitar': {
        const style = getStyle('guitar', genre);
        const pattern = getGuitarPattern(style);
        notes.push(...buildGuitarFromPattern(pattern, chord, key, barNumberGlobal, barOffset));
        break;
      }
      case 'strings': {
        const energy = drumContext?.energy ?? 50;
        notes.push(...buildStringsFromPattern(chord, key, barNumberGlobal, barOffset, energy));
        break;
      }
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
          feel: request.feel ?? 50,
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
      // --- PITCHED STEMS: one block per section (mirrors drum loop) ---
      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const section = sections[sIdx];
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
            request.genre,
            undefined, // no DrumContext for pitched instruments
            section.start_bar
          ),
        });
      }
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
