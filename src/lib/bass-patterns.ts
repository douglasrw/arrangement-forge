// bass-patterns.ts — Genre-aware bass pattern library with per-style variations.
// Replaces the inline buildBassNotes() in midi-generator.ts.

import type { MidiNoteData } from '@/types';
import { getChordTones, noteToMidi } from './midi-generator';
import { degreeToNote } from './chords';
import { knuthHash } from './drum-patterns';

// ---------- Types ----------

export interface BassNote {
  degree: number;       // Interval from root: 0=root, 2=3rd, 4=5th, 7=octave
  time: number;         // Beat offset within bar (0-3.99)
  duration: number;     // In beats
  velocity: number;     // 0-127
  chromatic?: number;   // If set, semitone offset from root (for approach notes)
}

export interface BassPattern {
  id: string;
  style: string;
  bars: BassNote[][];   // 2+ bar variations
}

// ---------- Pattern Data ----------

const WALKING: BassPattern = {
  id: 'walking_01',
  style: 'walking',
  bars: [
    // Bar A: root -> 3rd -> 5th -> chromatic approach -1
    [
      { degree: 0, time: 0, duration: 0.9, velocity: 85 },
      { degree: 2, time: 1, duration: 0.9, velocity: 75 },
      { degree: 4, time: 2, duration: 0.9, velocity: 80 },
      { degree: 0, time: 3, duration: 0.9, velocity: 70, chromatic: -1 },
    ],
    // Bar B: root -> 5th -> 3rd -> chromatic approach +1
    [
      { degree: 0, time: 0, duration: 0.9, velocity: 85 },
      { degree: 4, time: 1, duration: 0.9, velocity: 75 },
      { degree: 2, time: 2, duration: 0.9, velocity: 80 },
      { degree: 0, time: 3, duration: 0.9, velocity: 70, chromatic: 1 },
    ],
  ],
};

const SLAP: BassPattern = {
  id: 'slap_01',
  style: 'slap',
  bars: [
    // Bar A: root -> ghost root -> octave -> rest -> root
    [
      { degree: 0, time: 0, duration: 0.3, velocity: 90 },
      { degree: 0, time: 0.75, duration: 0.1, velocity: 40 },
      { degree: 7, time: 1.5, duration: 0.3, velocity: 85 },
      { degree: 0, time: 3, duration: 0.5, velocity: 80 },
    ],
    // Bar B: root -> octave -> ghost -> root -> octave
    [
      { degree: 0, time: 0, duration: 0.3, velocity: 90 },
      { degree: 7, time: 1, duration: 0.3, velocity: 85 },
      { degree: 0, time: 1.75, duration: 0.1, velocity: 40 },
      { degree: 0, time: 2.5, duration: 0.5, velocity: 80 },
      { degree: 7, time: 3.5, duration: 0.3, velocity: 75 },
    ],
  ],
};

const PICK: BassPattern = {
  id: 'pick_01',
  style: 'pick',
  bars: [
    // Bar A: driving 8ths root+5th alternating
    [
      { degree: 0, time: 0, duration: 0.4, velocity: 85 },
      { degree: 0, time: 0.5, duration: 0.4, velocity: 70 },
      { degree: 4, time: 1, duration: 0.4, velocity: 85 },
      { degree: 4, time: 1.5, duration: 0.4, velocity: 70 },
      { degree: 0, time: 2, duration: 0.4, velocity: 85 },
      { degree: 0, time: 2.5, duration: 0.4, velocity: 70 },
      { degree: 4, time: 3, duration: 0.4, velocity: 85 },
      { degree: 4, time: 3.5, duration: 0.4, velocity: 70 },
    ],
    // Bar B: mixed root/5th
    [
      { degree: 0, time: 0, duration: 0.4, velocity: 85 },
      { degree: 0, time: 0.5, duration: 0.4, velocity: 70 },
      { degree: 4, time: 1, duration: 0.4, velocity: 85 },
      { degree: 0, time: 1.5, duration: 0.4, velocity: 70 },
      { degree: 4, time: 2, duration: 0.4, velocity: 85 },
      { degree: 0, time: 2.5, duration: 0.4, velocity: 70 },
      { degree: 4, time: 3, duration: 0.4, velocity: 85 },
      { degree: 0, time: 3.5, duration: 0.4, velocity: 70 },
    ],
  ],
};

const FINGERSTYLE: BassPattern = {
  id: 'fingerstyle_01',
  style: 'fingerstyle',
  bars: [
    // Bar A: root -> 5th -> root -> 5th
    [
      { degree: 0, time: 0, duration: 0.9, velocity: 85 },
      { degree: 4, time: 1, duration: 0.9, velocity: 70 },
      { degree: 0, time: 2, duration: 0.9, velocity: 80 },
      { degree: 4, time: 3, duration: 0.9, velocity: 70 },
    ],
    // Bar B: root -> 3rd -> root -> 5th
    [
      { degree: 0, time: 0, duration: 0.9, velocity: 85 },
      { degree: 2, time: 1, duration: 0.9, velocity: 70 },
      { degree: 0, time: 2, duration: 0.9, velocity: 80 },
      { degree: 4, time: 3, duration: 0.9, velocity: 70 },
    ],
  ],
};

// ---------- Pattern Registry ----------

const PATTERNS: Record<string, BassPattern> = {
  walking: WALKING,
  slap: SLAP,
  pick: PICK,
  fingerstyle: FINGERSTYLE,
};

// ---------- Lookup ----------

/** Returns the bass pattern for the given style. Falls back to fingerstyle if unknown. */
export function getBassPattern(style: string): BassPattern {
  return PATTERNS[style] ?? PATTERNS['fingerstyle'];
}

// ---------- Degree-to-index mapping ----------
// BassNote.degree: 0=root, 2=3rd, 4=5th, 7=octave
// getChordTones returns [root, 3rd, 5th, ...] (index 0, 1, 2, ...)
const DEGREE_TO_CHORD_INDEX: Record<number, number> = {
  0: 0,  // root
  2: 1,  // 3rd
  4: 2,  // 5th
  7: 0,  // octave (root + 12 semitones, handled separately)
};

// ---------- Builder ----------

/**
 * Build MidiNoteData[] from a bass pattern, chord, and position context.
 * @param pattern - The BassPattern to render
 * @param chord - Chord degree and quality for this bar
 * @param key - Musical key (e.g. 'C', 'Bb')
 * @param barNumber - Global bar number (1-based) for knuthHash variation selection
 * @param barOffset - Beat offset within block (barIndex * 4)
 * @param octave - MIDI octave for bass (default 2)
 */
export function buildBassFromPattern(
  pattern: BassPattern,
  chord: { degree: string | null; quality: string | null },
  key: string,
  barNumber: number,
  barOffset: number,
  octave: number = 2
): MidiNoteData[] {
  if (!chord.degree) {
    return [{ note: 'C' + octave, time: barOffset, duration: 3.8, velocity: 70 }];
  }

  // Select bar variation deterministically
  const barIdx = Math.floor(knuthHash(barNumber, 42) * pattern.bars.length) % pattern.bars.length;
  const bar = pattern.bars[barIdx];

  const tones = getChordTones(chord.degree, chord.quality, key, octave);
  const rootNote = degreeToNote(chord.degree, key);

  const notes: MidiNoteData[] = [];
  for (const bn of bar) {
    let note: string;

    if (bn.chromatic !== undefined) {
      // Chromatic approach: root MIDI note + semitone offset
      note = noteToMidi(rootNote, octave);
      // Apply chromatic offset by computing the MIDI note name
      const chromaticSemitones = bn.chromatic;
      const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const NOTE_SEMITONES: Record<string, number> = {
        C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
        G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
      };
      const rootSemitone = NOTE_SEMITONES[rootNote] ?? 0;
      const totalSemitone = rootSemitone + chromaticSemitones;
      const adjustedOctave = octave + Math.floor(totalSemitone / 12);
      const noteIdx = ((totalSemitone % 12) + 12) % 12;
      note = CHROMATIC[noteIdx] + adjustedOctave;
    } else if (bn.degree === 7) {
      // Octave = root note one octave up
      note = noteToMidi(rootNote, octave + 1);
    } else {
      // Map degree to chord tone index
      const chordIdx = DEGREE_TO_CHORD_INDEX[bn.degree] ?? 0;
      note = tones[chordIdx] ?? tones[0] ?? 'C' + octave;
    }

    notes.push({
      note,
      time: barOffset + bn.time,
      duration: bn.duration,
      velocity: bn.velocity,
    });
  }

  return notes;
}
