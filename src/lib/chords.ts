// chords.ts — Chord parsing, Roman numeral ↔ letter name conversion.
// All chords are stored as Roman numerals internally.
// Letter names are computed at display time from key + degree.

import type { Chord } from '@/types';

export const ALL_KEYS: string[] = [
  'C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B',
];

// Semitone offsets from C for each key spelling
const KEY_SEMITONES: Record<string, number> = {
  C: 0, 'B#': 0,
  'C#': 1, Db: 1,
  D: 2,
  'D#': 3, Eb: 3,
  E: 4, Fb: 4,
  F: 5, 'E#': 5,
  'F#': 6, Gb: 6,
  G: 7,
  'G#': 8, Ab: 8,
  A: 9,
  'A#': 10, Bb: 10,
  B: 11, Cb: 11,
};

const CHROMATIC_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHROMATIC_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']);

// Semitone offset from root for each Roman numeral (uppercase)
const ROMAN_SEMITONES: Record<string, number> = {
  I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11,
};

// Note interval → Roman numeral (major scale convention; uses lowercase for minor scale degrees)
const INTERVAL_TO_ROMAN: Record<number, string> = {
  0: 'I',
  1: 'bII',
  2: 'ii',
  3: 'bIII',
  4: 'iii',
  5: 'IV',
  6: 'bV',
  7: 'V',
  8: 'bVI',
  9: 'vi',
  10: 'bVII',
  11: 'vii',
};

// Canonical quality names (internal storage)
export const QUALITY_MAP: Record<string, string> = {
  '': '',
  '5': '5',
  m: 'min',
  min: 'min',
  '-': 'min',
  maj: 'maj',
  M: 'maj',
  '7': 'dom7',
  dom7: 'dom7',
  m7: 'min7',
  min7: 'min7',
  '-7': 'min7',
  M7: 'maj7',
  maj7: 'maj7',
  'Δ7': 'maj7',
  Δ: 'maj7',
  dim: 'dim',
  '°': 'dim',
  dim7: 'dim7',
  '°7': 'dim7',
  m7b5: 'half-dim7',
  ø: 'half-dim7',
  ø7: 'half-dim7',
  aug: 'aug',
  '+': 'aug',
  aug7: 'aug7',
  sus2: 'sus2',
  sus4: 'sus4',
  '9': '9',
  m9: 'min9',
  min9: 'min9',
  maj9: 'maj9',
  M9: 'maj9',
  '11': '11',
  '13': '13',
  '6': '6',
  m6: 'min6',
};

// Quality display in letter mode
const QUALITY_LETTER_DISPLAY: Record<string, string> = {
  '': '',
  '5': '5',
  min: 'm',
  maj: '',
  dom7: '7',
  min7: 'm7',
  maj7: 'maj7',
  dim: 'dim',
  dim7: 'dim7',
  'half-dim7': 'ø7',
  aug: 'aug',
  aug7: 'aug7',
  sus2: 'sus2',
  sus4: 'sus4',
  '9': '9',
  min9: 'm9',
  maj9: 'maj9',
  '11': '11',
  '13': '13',
  '6': '6',
  min6: 'm6',
};

// Quality display in Roman numeral mode
const QUALITY_ROMAN_DISPLAY: Record<string, string> = {
  '': '',
  '5': '5',
  min: '',
  maj: '',
  dom7: '7',
  min7: '7',
  maj7: 'maj7',
  dim: '°',
  dim7: '°7',
  'half-dim7': 'ø7',
  aug: '+',
  aug7: '+7',
  sus2: 'sus2',
  sus4: 'sus4',
  '9': '9',
  min9: '9',
  maj9: 'maj9',
  '11': '11',
  '13': '13',
  '6': '6',
  min6: 'm6',
};

/**
 * Parses a Roman numeral degree string into its semitone offset and modifier.
 * Handles b/# prefix and case-insensitive numeral matching.
 */
function parseDegreeString(degree: string): { semitones: number; modifier: number } {
  let rest = degree;
  let modifier = 0;

  if (rest.startsWith('b')) {
    modifier = -1;
    rest = rest.slice(1);
  } else if (rest.startsWith('#')) {
    modifier = 1;
    rest = rest.slice(1);
  }

  const upper = rest.toUpperCase();
  const semitones = ROMAN_SEMITONES[upper];
  if (semitones === undefined) {
    throw new Error(`Unknown Roman numeral degree: "${degree}"`);
  }
  return { semitones, modifier };
}

/**
 * Convert a Roman numeral degree to a note name in the given key.
 * e.g. degreeToNote('ii', 'C') → 'D', degreeToNote('bII', 'C') → 'Db'
 * Flat-prefixed degrees use flat spelling; sharp-prefixed use sharp spelling;
 * natural degrees use key-based spelling (flat keys → flat names).
 */
export function degreeToNote(degree: string, key: string): string {
  const keySemitone = KEY_SEMITONES[key] ?? 0;
  const { semitones, modifier } = parseDegreeString(degree);
  const noteSemitone = ((keySemitone + semitones + modifier) % 12 + 12) % 12;
  let noteNames: string[];
  if (modifier === -1) {
    noteNames = CHROMATIC_FLAT;
  } else if (modifier === 1) {
    noteNames = CHROMATIC_SHARP;
  } else {
    noteNames = FLAT_KEYS.has(key) ? CHROMATIC_FLAT : CHROMATIC_SHARP;
  }
  return noteNames[noteSemitone];
}

/**
 * Convert a note name to a Roman numeral degree relative to the given key.
 * e.g. noteToDegree('D', 'C') → 'ii', noteToDegree('G', 'C') → 'V'
 */
export function noteToDegree(note: string, key: string): string {
  const keySemitone = KEY_SEMITONES[key] ?? 0;
  const noteSemitone = KEY_SEMITONES[note] ?? 0;
  const interval = ((noteSemitone - keySemitone) % 12 + 12) % 12;
  return INTERVAL_TO_ROMAN[interval] ?? 'I';
}

/**
 * Display a chord in the requested notation mode.
 * Roman mode: returns degree + quality suffix (e.g. "ii7", "Imaj7", "V7/VII")
 * Letter mode: resolves against key (e.g. "Dm7", "Cmaj7", "G7/B")
 * N.C. (degree=null) returns "N.C." in both modes.
 */
export function formatChord(chord: Chord, key: string, mode: 'letter' | 'roman'): string {
  if (chord.degree === null) return 'N.C.';

  const quality = chord.quality ?? '';

  if (mode === 'roman') {
    const qualitySuffix = QUALITY_ROMAN_DISPLAY[quality] ?? quality;
    let result = chord.degree + qualitySuffix;
    if (chord.bassDegree) result += '/' + chord.bassDegree;
    return result;
  }

  // Letter mode
  const root = degreeToNote(chord.degree, key);
  const qualitySuffix = QUALITY_LETTER_DISPLAY[quality] ?? quality;
  let result = root + qualitySuffix;
  if (chord.bassDegree) result += '/' + degreeToNote(chord.bassDegree, key);
  return result;
}

// Regex to detect Roman numeral input (with optional b/# prefix)
const ROMAN_NUMERAL_RE = /^[b#]?(I{1,3}|I?V|VI{0,3}|i{1,3}|i?v|vi{0,3})(.*)/;

// Quality suffix extraction from letter-name chord input
// Matches optional accidental + quality
const LETTER_CHORD_RE = /^([A-G][#b]?)(.*)/;

/**
 * Parse user chord input (either Roman numeral or letter name) into structured fields.
 * Returns null if the input cannot be parsed.
 */
export function parseChordInput(
  input: string,
  key: string
): { degree: string | null; quality: string | null; bassDegree: string | null } | null {
  const trimmed = input.trim();

  if (/^[Nn]\.[Cc]\.$/.test(trimmed) || trimmed.toLowerCase() === 'nc') {
    return { degree: null, quality: null, bassDegree: null };
  }

  // Try Roman numeral
  const romanMatch = trimmed.match(ROMAN_NUMERAL_RE);
  if (romanMatch) {
    const degreeRaw = romanMatch[1];
    let suffix = romanMatch[2] ?? '';
    let bassDegree: string | null = null;

    // Check for slash chord: /III or /E etc.
    const slashIdx = suffix.indexOf('/');
    if (slashIdx !== -1) {
      const bassRaw = suffix.slice(slashIdx + 1).trim();
      suffix = suffix.slice(0, slashIdx);
      // Bass could be Roman numeral or note name
      if (ROMAN_NUMERAL_RE.test(bassRaw)) {
        bassDegree = bassRaw.match(ROMAN_NUMERAL_RE)?.[1] ?? null;
      } else {
        const bassLetter = bassRaw.match(/^([A-G][#b]?)/)?.[1];
        if (bassLetter) bassDegree = noteToDegree(bassLetter, key);
      }
    }

    const canonical = QUALITY_MAP[suffix.trim()] ?? (suffix.trim() || null);
    return {
      degree: degreeRaw,
      quality: canonical || null,
      bassDegree,
    };
  }

  // Try letter name
  const letterMatch = trimmed.match(LETTER_CHORD_RE);
  if (letterMatch) {
    const noteName = letterMatch[1];
    let suffix = letterMatch[2] ?? '';
    let bassDegree: string | null = null;

    if (!(noteName in KEY_SEMITONES) && !/^[A-G]$/.test(noteName[0])) {
      return null;
    }

    const slashIdx = suffix.indexOf('/');
    if (slashIdx !== -1) {
      const bassRaw = suffix.slice(slashIdx + 1).trim();
      suffix = suffix.slice(0, slashIdx);
      const bassLetter = bassRaw.match(/^([A-G][#b]?)/)?.[1];
      if (bassLetter) bassDegree = noteToDegree(bassLetter, key);
    }

    const degree = noteToDegree(noteName, key);
    const canonical = QUALITY_MAP[suffix.trim()] ?? (suffix.trim() || null);
    return {
      degree,
      quality: canonical || null,
      bassDegree,
    };
  }

  return null;
}
