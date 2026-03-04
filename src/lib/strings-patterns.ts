// strings-patterns.ts — Strings pattern library with sustained pad and tremolo modes.
// Replaces the inline buildStringsNotes() in midi-generator.ts.

import type { MidiNoteData } from '@/types';
import { getChordTones } from './midi-generator';

// ---------- Types ----------

export interface StringsNote {
  degrees: number[];    // Chord degrees to play simultaneously
  time: number;
  duration: number;
  velocity: number;
}

export interface StringsPattern {
  id: string;
  style: string;
  bars: StringsNote[][];
}

// ---------- Pattern Data ----------

const SUSTAINED_PAD: StringsPattern = {
  id: 'sustained_pad_01',
  style: 'sustained_pad',
  bars: [
    // One bar: full-bar hold of root+3rd+5th
    [
      { degrees: [0, 2, 4], time: 0, duration: 3.9, velocity: 55 },
    ],
  ],
};

const TREMOLO: StringsPattern = {
  id: 'tremolo_01',
  style: 'tremolo',
  bars: [
    // Re-attacked 8th notes: root+3rd at each position
    [
      { degrees: [0, 2], time: 0, duration: 0.45, velocity: 55 },
      { degrees: [0, 2], time: 0.5, duration: 0.45, velocity: 45 },
      { degrees: [0, 2], time: 1, duration: 0.45, velocity: 55 },
      { degrees: [0, 2], time: 1.5, duration: 0.45, velocity: 45 },
      { degrees: [0, 2], time: 2, duration: 0.45, velocity: 55 },
      { degrees: [0, 2], time: 2.5, duration: 0.45, velocity: 45 },
      { degrees: [0, 2], time: 3, duration: 0.45, velocity: 55 },
      { degrees: [0, 2], time: 3.5, duration: 0.45, velocity: 45 },
    ],
  ],
};

// ---------- Degree-to-chord-index mapping ----------
const DEGREE_TO_CHORD_INDEX: Record<number, number> = {
  0: 0,  // root
  2: 1,  // 3rd
  4: 2,  // 5th
};

// ---------- Builder ----------

/**
 * Build MidiNoteData[] for strings based on energy level.
 * energy <= 70 -> sustained pad (root+3rd+5th, long hold)
 * energy > 70  -> tremolo (root+3rd, re-attacked 8ths)
 */
export function buildStringsFromPattern(
  chord: { degree: string | null; quality: string | null },
  key: string,
  _barNumber: number,
  barOffset: number,
  energy: number,
  octave: number = 4
): MidiNoteData[] {
  if (!chord.degree) return [];

  const tones = getChordTones(chord.degree, chord.quality, key, octave);
  if (tones.length === 0) return [];

  const pattern = energy > 70 ? TREMOLO : SUSTAINED_PAD;
  const bar = pattern.bars[0]; // Strings use single-bar patterns

  const notes: MidiNoteData[] = [];
  for (const sn of bar) {
    for (const deg of sn.degrees) {
      const chordIdx = DEGREE_TO_CHORD_INDEX[deg] ?? 0;
      const note = tones[chordIdx] ?? tones[0];

      notes.push({
        note,
        time: barOffset + sn.time,
        duration: sn.duration,
        velocity: sn.velocity,
      });
    }
  }

  return notes;
}
