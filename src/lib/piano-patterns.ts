// piano-patterns.ts — Genre-aware piano pattern library with voicing variations.
// Replaces the inline buildPianoNotes() in midi-generator.ts.

import type { MidiNoteData } from '@/types';
import { getChordTones } from './midi-generator';
import { knuthHash } from './drum-patterns';

// ---------- Types ----------

export interface PianoNote {
  degrees: number[];    // Multiple degrees = chord voicing (e.g. [2, 6] = 3rd + 7th)
  time: number;
  duration: number;
  velocity: number;
}

export interface PianoPattern {
  id: string;
  style: string;
  bars: PianoNote[][];
}

// ---------- Pattern Data ----------

const JAZZ_COMP: PianoPattern = {
  id: 'jazz_comp_01',
  style: 'jazz_comp',
  bars: [
    // Bar A: shell voicings on off-beats
    [
      { degrees: [2, 6], time: 1.5, duration: 0.8, velocity: 70 },
      { degrees: [2, 6], time: 3, duration: 0.8, velocity: 65 },
    ],
    // Bar B: shell voicings on different off-beats
    [
      { degrees: [2, 6], time: 0.5, duration: 0.8, velocity: 65 },
      { degrees: [2, 6], time: 2.5, duration: 0.8, velocity: 70 },
    ],
  ],
};

const BLOCK_CHORDS: PianoPattern = {
  id: 'block_chords_01',
  style: 'block_chords',
  bars: [
    // Bar A: full triads on beats 1 and 3
    [
      { degrees: [0, 2, 4], time: 0, duration: 1.8, velocity: 78 },
      { degrees: [0, 2, 4], time: 2, duration: 1.8, velocity: 72 },
    ],
    // Bar B: full triads on beats 2 and 4
    [
      { degrees: [0, 2, 4], time: 1, duration: 1.8, velocity: 72 },
      { degrees: [0, 2, 4], time: 3, duration: 0.9, velocity: 68 },
    ],
  ],
};

const ARPEGGIATED: PianoPattern = {
  id: 'arpeggiated_01',
  style: 'arpeggiated',
  bars: [
    // Bar A: rolling chord tones
    [
      { degrees: [0], time: 0, duration: 0.4, velocity: 70 },
      { degrees: [2], time: 0.5, duration: 0.4, velocity: 67 },
      { degrees: [4], time: 1, duration: 0.4, velocity: 65 },
      { degrees: [7], time: 1.5, duration: 0.4, velocity: 68 },
      { degrees: [4], time: 2, duration: 0.4, velocity: 67 },
      { degrees: [2], time: 2.5, duration: 0.4, velocity: 65 },
      { degrees: [0], time: 3, duration: 0.4, velocity: 70 },
      { degrees: [2], time: 3.5, duration: 0.4, velocity: 65 },
    ],
    // Bar B: different arpeggio direction
    [
      { degrees: [4], time: 0, duration: 0.4, velocity: 68 },
      { degrees: [2], time: 0.5, duration: 0.4, velocity: 65 },
      { degrees: [0], time: 1, duration: 0.4, velocity: 70 },
      { degrees: [2], time: 1.5, duration: 0.4, velocity: 67 },
      { degrees: [4], time: 2, duration: 0.4, velocity: 65 },
      { degrees: [7], time: 2.5, duration: 0.4, velocity: 68 },
      { degrees: [4], time: 3, duration: 0.4, velocity: 67 },
      { degrees: [0], time: 3.5, duration: 0.4, velocity: 70 },
    ],
  ],
};

// ---------- Pattern Registry ----------

const PATTERNS: Record<string, PianoPattern> = {
  jazz_comp: JAZZ_COMP,
  block_chords: BLOCK_CHORDS,
  arpeggiated: ARPEGGIATED,
};

// ---------- Lookup ----------

/** Returns the piano pattern for the given style. Falls back to block_chords if unknown. */
export function getPianoPattern(style: string): PianoPattern {
  return PATTERNS[style] ?? PATTERNS['block_chords'];
}

// ---------- Degree-to-chord-index mapping ----------
// PianoNote.degrees: 0=root, 2=3rd, 4=5th, 6=7th, 7=octave
// getChordTones returns [root, 3rd, 5th, 7th (if present)] → index 0, 1, 2, 3
const DEGREE_TO_CHORD_INDEX: Record<number, number> = {
  0: 0,  // root
  2: 1,  // 3rd
  4: 2,  // 5th
  6: 3,  // 7th
  7: 0,  // octave (root, handled with octave bump)
};

// ---------- Builder ----------

/**
 * Build MidiNoteData[] from a piano pattern, chord, and position context.
 * For each PianoNote, emits one MidiNoteData per degree (stacked chord = multiple notes at same time).
 */
export function buildPianoFromPattern(
  pattern: PianoPattern,
  chord: { degree: string | null; quality: string | null },
  key: string,
  barNumber: number,
  barOffset: number,
  octave: number = 4
): MidiNoteData[] {
  if (!chord.degree) return [];

  // Select bar variation deterministically
  const barIdx = Math.floor(knuthHash(barNumber, 43) * pattern.bars.length) % pattern.bars.length;
  const bar = pattern.bars[barIdx];

  const tones = getChordTones(chord.degree, chord.quality, key, octave);
  // Also get octave-up tones for degree 7
  const tonesUp = getChordTones(chord.degree, chord.quality, key, octave + 1);
  if (tones.length === 0) return [];

  const notes: MidiNoteData[] = [];
  for (const pn of bar) {
    for (const deg of pn.degrees) {
      let note: string;
      if (deg === 7) {
        // Octave = root one octave up
        note = tonesUp[0] ?? tones[0];
      } else {
        const chordIdx = DEGREE_TO_CHORD_INDEX[deg] ?? 0;
        note = tones[chordIdx] ?? tones[0];
      }

      notes.push({
        note,
        time: barOffset + pn.time,
        duration: pn.duration,
        velocity: pn.velocity,
      });
    }
  }

  return notes;
}
