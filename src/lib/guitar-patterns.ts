// guitar-patterns.ts — Genre-aware guitar pattern library with strum/pick variations.
// Replaces the inline buildGuitarNotes() in midi-generator.ts.

import type { MidiNoteData } from '@/types';
import { getChordTones } from './midi-generator';
import { knuthHash } from './drum-patterns';
import { getInstrumentStyleOptionById, getInstrumentStyleSelectionTruth } from './genre-config';

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

const DEFAULT_GUITAR_PATTERN_ID = 'rhythm_strum';

export interface GuitarPatternSelectionTruth {
  requestedStyleId: string | null;
  usedDefaultStyle: boolean;
  defaultStyleId: string;
  defaultStyleLabel: string;
  selectedStyleId: string;
  selectedStyleLabel: string;
  selectedPattern: GuitarPattern;
  fallbackStyleId: string;
  fallbackStyleLabel: string;
  patternSource: 'default_style' | 'requested_style' | 'unsupported_style_safe_fallback';
  selectionPolicy: string;
  supportedStyleIds: string[];
  supportedStyleLabels: string[];
  fallbackApplied: boolean;
  summary: string;
  currentState: string;
  nextStep: string;
}

function getSupportedGuitarStylesText(styleTruth: ReturnType<typeof getInstrumentStyleSelectionTruth>): {
  ids: string;
  labels: string;
} {
  return {
    ids: styleTruth.supportedStyleIds.join(', '),
    labels: styleTruth.supportedStyleLabels.join(', '),
  };
}

function getGuitarPatternByStyleId(styleId: string): GuitarPattern {
  return PATTERNS[styleId] ?? PATTERNS[DEFAULT_GUITAR_PATTERN_ID];
}

// ---------- Lookup ----------

/** Returns the guitar pattern for the given style. Falls back to rhythm_strum if unknown. */
export function getGuitarPattern(style: string): GuitarPattern {
  return getGuitarPatternSelectionTruth(style).selectedPattern;
}

export function getGuitarPatternSelectionTruth(style: string | null | undefined): GuitarPatternSelectionTruth {
  const styleTruth = getInstrumentStyleSelectionTruth('guitar', style);
  const supportedStylesText = getSupportedGuitarStylesText(styleTruth);
  const fallbackStyle =
    getInstrumentStyleOptionById('guitar', DEFAULT_GUITAR_PATTERN_ID) ??
    ({ id: DEFAULT_GUITAR_PATTERN_ID, label: 'Rhythm Strum' } as const);

  if (styleTruth.requestedStyleId === null) {
    const selectedPattern = getGuitarPatternByStyleId(styleTruth.selectedStyleId);

    return {
      requestedStyleId: styleTruth.requestedStyleId,
      usedDefaultStyle: styleTruth.usedDefaultStyle,
      defaultStyleId: styleTruth.defaultStyleId,
      defaultStyleLabel: styleTruth.defaultStyleLabel,
      selectedStyleId: styleTruth.selectedStyleId,
      selectedStyleLabel: styleTruth.selectedStyleLabel,
      selectedPattern,
      fallbackStyleId: fallbackStyle.id,
      fallbackStyleLabel: fallbackStyle.label,
      patternSource: 'default_style',
      selectionPolicy: `When no guitar style is requested, guitar uses the default ${styleTruth.defaultStyleLabel} style and its matching pattern ${selectedPattern.id}. Unsupported guitar requests fall back to ${fallbackStyle.label}.`,
      supportedStyleIds: styleTruth.supportedStyleIds,
      supportedStyleLabels: styleTruth.supportedStyleLabels,
      fallbackApplied: false,
      summary: `No guitar style was requested, so the default ${styleTruth.selectedStyleLabel} pattern ${selectedPattern.id} is active.`,
      currentState: `Guitar is using the default ${styleTruth.selectedStyleLabel} style with pattern ${selectedPattern.id} because no explicit style was requested.`,
      nextStep: `Keep the default ${styleTruth.selectedStyleLabel} style, or switch to one of the supported guitar styles: ${supportedStylesText.labels} (${supportedStylesText.ids}).`,
    };
  }

  if (!styleTruth.fallbackApplied) {
    const selectedPattern = getGuitarPatternByStyleId(styleTruth.selectedStyleId);

    return {
      requestedStyleId: styleTruth.requestedStyleId,
      usedDefaultStyle: styleTruth.usedDefaultStyle,
      defaultStyleId: styleTruth.defaultStyleId,
      defaultStyleLabel: styleTruth.defaultStyleLabel,
      selectedStyleId: styleTruth.selectedStyleId,
      selectedStyleLabel: styleTruth.selectedStyleLabel,
      selectedPattern,
      fallbackStyleId: fallbackStyle.id,
      fallbackStyleLabel: fallbackStyle.label,
      patternSource: 'requested_style',
      selectionPolicy: `Supported guitar styles use their matching named pattern, so ${styleTruth.selectedStyleLabel} selects ${selectedPattern.id}. Unsupported guitar requests still fall back to ${fallbackStyle.label}.`,
      supportedStyleIds: styleTruth.supportedStyleIds,
      supportedStyleLabels: styleTruth.supportedStyleLabels,
      fallbackApplied: false,
      summary: `${styleTruth.selectedStyleLabel} uses guitar pattern ${selectedPattern.id}.`,
      currentState: `Guitar style ${styleTruth.selectedStyleLabel} is active with pattern ${selectedPattern.id}. No fallback was needed.`,
      nextStep: `Keep ${styleTruth.selectedStyleLabel}, or switch to one of the supported guitar styles: ${supportedStylesText.labels} (${supportedStylesText.ids}).`,
    };
  }

  const selectedPattern = getGuitarPatternByStyleId(fallbackStyle.id);

  return {
    requestedStyleId: styleTruth.requestedStyleId,
    usedDefaultStyle: false,
    defaultStyleId: styleTruth.defaultStyleId,
    defaultStyleLabel: styleTruth.defaultStyleLabel,
    selectedStyleId: selectedPattern.style,
    selectedStyleLabel: fallbackStyle.label,
    selectedPattern,
    fallbackStyleId: fallbackStyle.id,
    fallbackStyleLabel: fallbackStyle.label,
    patternSource: 'unsupported_style_safe_fallback',
    selectionPolicy: `Unsupported guitar styles do not fall back to the default ${styleTruth.defaultStyleLabel} style. They fall back to the safer ${fallbackStyle.label} pattern ${selectedPattern.id}.`,
    supportedStyleIds: styleTruth.supportedStyleIds,
    supportedStyleLabels: styleTruth.supportedStyleLabels,
    fallbackApplied: true,
    summary: `Requested guitar style ${styleTruth.requestedStyleId ?? 'default'} is unsupported, so guitar uses the safer ${fallbackStyle.label} fallback pattern ${selectedPattern.id} instead of the default ${styleTruth.defaultStyleLabel} style.`,
    currentState: `Requested guitar style "${styleTruth.requestedStyleId}" is unavailable. Guitar is currently using the ${fallbackStyle.label} fallback pattern ${selectedPattern.id}; the normal default remains ${styleTruth.defaultStyleLabel}.`,
    nextStep: `Choose one of the supported guitar styles if you want something other than the current ${fallbackStyle.label} fallback: ${supportedStylesText.labels} (${supportedStylesText.ids}).`,
  };
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
