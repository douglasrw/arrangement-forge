// guitar-patterns.ts — Genre-aware guitar pattern library with strum/pick variations.
// Replaces the inline buildGuitarNotes() in midi-generator.ts.

import type { MidiNoteData } from '@/types';
import { getChordTones } from './midi-generator';
import { knuthHash } from './drum-patterns';

// ---------- Types ----------

export interface GuitarNote {
  degrees: number[];    // Multiple degrees = strum, single = pick
  time: number;
  duration: number;
  velocity: number;
}

export interface GuitarPattern {
  id: string;
  style: string;
  bars: GuitarNote[][];
}

// ---------- Pattern Data ----------

const POWER_CHORDS: GuitarPattern = {
  id: 'power_chords_01',
  style: 'power_chords',
  bars: [
    // Bar A: driving 8ths root+5th
    [
      { degrees: [0, 4], time: 0, duration: 0.4, velocity: 85 },
      { degrees: [0, 4], time: 0.5, duration: 0.4, velocity: 70 },
      { degrees: [0, 4], time: 1, duration: 0.4, velocity: 80 },
      { degrees: [0, 4], time: 1.5, duration: 0.4, velocity: 65 },
      { degrees: [0, 4], time: 2, duration: 0.4, velocity: 85 },
      { degrees: [0, 4], time: 2.5, duration: 0.4, velocity: 70 },
      { degrees: [0, 4], time: 3, duration: 0.4, velocity: 80 },
      { degrees: [0, 4], time: 3.5, duration: 0.4, velocity: 65 },
    ],
    // Bar B: same rhythm, accent beats 1 and 3 harder
    [
      { degrees: [0, 4], time: 0, duration: 0.4, velocity: 90 },
      { degrees: [0, 4], time: 0.5, duration: 0.4, velocity: 70 },
      { degrees: [0, 4], time: 1, duration: 0.4, velocity: 75 },
      { degrees: [0, 4], time: 1.5, duration: 0.4, velocity: 65 },
      { degrees: [0, 4], time: 2, duration: 0.4, velocity: 90 },
      { degrees: [0, 4], time: 2.5, duration: 0.4, velocity: 70 },
      { degrees: [0, 4], time: 3, duration: 0.4, velocity: 75 },
      { degrees: [0, 4], time: 3.5, duration: 0.4, velocity: 65 },
    ],
  ],
};

const FINGERPICK_ARPEGGIOS: GuitarPattern = {
  id: 'fingerpick_arpeggios_01',
  style: 'fingerpick_arpeggios',
  bars: [
    // Bar A: p-i-m-a cycling
    [
      { degrees: [0], time: 0, duration: 0.4, velocity: 70 },
      { degrees: [2], time: 0.5, duration: 0.4, velocity: 65 },
      { degrees: [4], time: 1, duration: 0.4, velocity: 63 },
      { degrees: [7], time: 1.5, duration: 0.4, velocity: 68 },
      { degrees: [4], time: 2, duration: 0.4, velocity: 63 },
      { degrees: [2], time: 2.5, duration: 0.4, velocity: 60 },
      { degrees: [0], time: 3, duration: 0.4, velocity: 70 },
      { degrees: [4], time: 3.5, duration: 0.4, velocity: 63 },
    ],
    // Bar B: different arpeggio pattern
    [
      { degrees: [0], time: 0, duration: 0.4, velocity: 70 },
      { degrees: [4], time: 0.5, duration: 0.4, velocity: 63 },
      { degrees: [2], time: 1, duration: 0.4, velocity: 65 },
      { degrees: [7], time: 1.5, duration: 0.4, velocity: 68 },
      { degrees: [2], time: 2, duration: 0.4, velocity: 65 },
      { degrees: [0], time: 2.5, duration: 0.4, velocity: 60 },
      { degrees: [4], time: 3, duration: 0.4, velocity: 63 },
      { degrees: [2], time: 3.5, duration: 0.4, velocity: 65 },
    ],
  ],
};

const RHYTHM_STRUM: GuitarPattern = {
  id: 'rhythm_strum_01',
  style: 'rhythm_strum',
  bars: [
    // Bar A: down/up strum — downstrums louder + longer
    [
      { degrees: [0, 2, 4], time: 0, duration: 0.8, velocity: 80 },
      { degrees: [0, 2, 4], time: 1, duration: 0.3, velocity: 60 },
      { degrees: [0, 2, 4], time: 2, duration: 0.8, velocity: 75 },
      { degrees: [0, 2, 4], time: 3, duration: 0.3, velocity: 55 },
    ],
    // Bar B: variation with upstrum shifts
    [
      { degrees: [0, 2, 4], time: 0, duration: 0.8, velocity: 80 },
      { degrees: [2, 4], time: 1.5, duration: 0.3, velocity: 55 },
      { degrees: [0, 2, 4], time: 2, duration: 0.8, velocity: 75 },
      { degrees: [0, 2, 4], time: 3.5, duration: 0.3, velocity: 50 },
    ],
  ],
};

const MUTED_FUNK: GuitarPattern = {
  id: 'muted_funk_01',
  style: 'muted_funk',
  bars: [
    // Bar A: 16th-note percussive scratches
    [
      { degrees: [0], time: 0.5, duration: 0.1, velocity: 65 },
      { degrees: [0], time: 1, duration: 0.1, velocity: 55 },
      { degrees: [0], time: 1.5, duration: 0.1, velocity: 65 },
      { degrees: [0], time: 2.5, duration: 0.1, velocity: 55 },
      { degrees: [0], time: 3, duration: 0.1, velocity: 65 },
      { degrees: [0], time: 3.5, duration: 0.1, velocity: 60 },
    ],
    // Bar B: vary which 16ths are hit
    [
      { degrees: [0], time: 0.5, duration: 0.1, velocity: 60 },
      { degrees: [0], time: 1.5, duration: 0.1, velocity: 65 },
      { degrees: [0], time: 2, duration: 0.1, velocity: 55 },
      { degrees: [0], time: 2.5, duration: 0.1, velocity: 65 },
      { degrees: [0], time: 3.5, duration: 0.1, velocity: 60 },
    ],
  ],
};

// ---------- Pattern Registry ----------

const PATTERNS: Record<string, GuitarPattern> = {
  power_chords: POWER_CHORDS,
  fingerpick_arpeggios: FINGERPICK_ARPEGGIOS,
  rhythm_strum: RHYTHM_STRUM,
  muted_funk: MUTED_FUNK,
};

// ---------- Lookup ----------

/** Returns the guitar pattern for the given style. Falls back to rhythm_strum if unknown. */
export function getGuitarPattern(style: string): GuitarPattern {
  return PATTERNS[style] ?? PATTERNS['rhythm_strum'];
}

// ---------- Degree-to-chord-index mapping ----------
// GuitarNote.degrees: 0=root, 2=3rd, 4=5th, 7=octave
const DEGREE_TO_CHORD_INDEX: Record<number, number> = {
  0: 0,  // root
  2: 1,  // 3rd
  4: 2,  // 5th
  7: 0,  // octave (root, handled with octave bump)
};

// ---------- Builder ----------

/**
 * Build MidiNoteData[] from a guitar pattern, chord, and position context.
 * For each GuitarNote, emits one MidiNoteData per degree.
 */
export function buildGuitarFromPattern(
  pattern: GuitarPattern,
  chord: { degree: string | null; quality: string | null },
  key: string,
  barNumber: number,
  barOffset: number,
  octave: number = 3
): MidiNoteData[] {
  if (!chord.degree) return [];

  // Select bar variation deterministically
  const barIdx = Math.floor(knuthHash(barNumber, 44) * pattern.bars.length) % pattern.bars.length;
  const bar = pattern.bars[barIdx];

  const tones = getChordTones(chord.degree, chord.quality, key, octave);
  const tonesUp = getChordTones(chord.degree, chord.quality, key, octave + 1);
  if (tones.length === 0) return [];

  const notes: MidiNoteData[] = [];
  for (const gn of bar) {
    for (const deg of gn.degrees) {
      let note: string;
      if (deg === 7) {
        note = tonesUp[0] ?? tones[0];
      } else {
        const chordIdx = DEGREE_TO_CHORD_INDEX[deg] ?? 0;
        note = tones[chordIdx] ?? tones[0];
      }

      notes.push({
        note,
        time: barOffset + gn.time,
        duration: gn.duration,
        velocity: gn.velocity,
      });
    }
  }

  return notes;
}
