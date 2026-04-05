// strings-patterns.ts — Strings pattern library with sustained pad and tremolo modes.
// Replaces the inline buildStringsNotes() in midi-generator.ts.

import type { MidiNoteData } from '@/types';
import { getChordTones } from './midi-generator';
import { getInstrumentStyleSelectionTruth } from './genre-config';

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

export interface StringsPatternSelectionTruth {
  requestedStyleId: string | null;
  energy: number;
  energyThreshold: number;
  defaultStyleId: string;
  defaultStyleLabel: string;
  selectedStyleId: string;
  selectedStyleLabel: string;
  selectedPattern: StringsPattern;
  fallbackStyleId: string;
  fallbackStyleLabel: string;
  patternSource: 'energy_threshold' | 'requested_style' | 'unsupported_style_energy_fallback';
  selectionPolicy: string;
  supportedStyleIds: string[];
  supportedStyleLabels: string[];
  fallbackApplied: boolean;
  selectionSource: 'energy_threshold' | 'explicit_style';
  summary: string;
  currentState: string;
  nextStep: string;
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

const PATTERNS: Record<string, StringsPattern> = {
  sustained_pad: SUSTAINED_PAD,
  tremolo: TREMOLO,
};

export const STRINGS_TREMOLO_ENERGY_THRESHOLD = 70;

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
export function getStringsPatternSelectionTruth(
  styleOverride: string | null | undefined,
  energy: number
): StringsPatternSelectionTruth {
  const styleTruth = getInstrumentStyleSelectionTruth('strings', styleOverride);
  const selectedByEnergy = energy > STRINGS_TREMOLO_ENERGY_THRESHOLD ? TREMOLO : SUSTAINED_PAD;
  const selectedOptionByEnergy =
    styleTruth.supportedStyleIds.find((supportedStyleId) => supportedStyleId === selectedByEnergy.style) === undefined
      ? { id: selectedByEnergy.style, label: selectedByEnergy.style }
      : {
          id: selectedByEnergy.style,
          label:
            styleTruth.supportedStyleLabels[
              styleTruth.supportedStyleIds.findIndex((supportedStyleId) => supportedStyleId === selectedByEnergy.style)
            ] ?? selectedByEnergy.style,
        };
  const availableLabels = styleTruth.supportedStyleLabels.join(', ');

  if (styleTruth.requestedStyleId === null) {
    return {
      requestedStyleId: styleTruth.requestedStyleId,
      energy,
      energyThreshold: STRINGS_TREMOLO_ENERGY_THRESHOLD,
      defaultStyleId: styleTruth.defaultStyleId,
      defaultStyleLabel: styleTruth.defaultStyleLabel,
      selectedStyleId: selectedByEnergy.style,
      selectedStyleLabel: selectedOptionByEnergy.label,
      selectedPattern: selectedByEnergy,
      fallbackStyleId: selectedByEnergy.style,
      fallbackStyleLabel: selectedOptionByEnergy.label,
      patternSource: 'energy_threshold',
      selectionPolicy: `When no strings style is requested, energy drives strings selection. Energy above ${STRINGS_TREMOLO_ENERGY_THRESHOLD} uses ${TREMOLO.id}; energy at or below ${STRINGS_TREMOLO_ENERGY_THRESHOLD} uses ${SUSTAINED_PAD.id}. The canonical strings default style remains ${styleTruth.defaultStyleLabel} when an explicit default is needed elsewhere.`,
      supportedStyleIds: styleTruth.supportedStyleIds,
      supportedStyleLabels: styleTruth.supportedStyleLabels,
      fallbackApplied: false,
      selectionSource: 'energy_threshold',
      summary: `Energy ${energy} selects the ${selectedOptionByEnergy.label} strings pattern ${selectedByEnergy.id}.`,
      currentState: `No explicit strings style was requested, so energy ${energy} is driving strings selection and ${selectedOptionByEnergy.label} is active. The canonical default strings style is still ${styleTruth.defaultStyleLabel} when energy is not the selector.`,
      nextStep: `Keep the energy-driven strings selection, choose ${availableLabels} explicitly, or move energy above or below ${STRINGS_TREMOLO_ENERGY_THRESHOLD} if you want a different automatic result.`,
    };
  }

  if (!styleTruth.fallbackApplied) {
    const selectedPattern = PATTERNS[styleTruth.selectedStyleId] ?? selectedByEnergy;

    return {
      requestedStyleId: styleTruth.requestedStyleId,
      energy,
      energyThreshold: STRINGS_TREMOLO_ENERGY_THRESHOLD,
      defaultStyleId: styleTruth.defaultStyleId,
      defaultStyleLabel: styleTruth.defaultStyleLabel,
      selectedStyleId: styleTruth.selectedStyleId,
      selectedStyleLabel: styleTruth.selectedStyleLabel,
      selectedPattern,
      fallbackStyleId: selectedByEnergy.style,
      fallbackStyleLabel: selectedOptionByEnergy.label,
      patternSource: 'requested_style',
      selectionPolicy: `Supported explicit strings styles override energy-driven selection. When the request is unsupported, strings fall back to the current energy-selected pattern instead of blindly using the canonical default ${styleTruth.defaultStyleLabel}.`,
      supportedStyleIds: styleTruth.supportedStyleIds,
      supportedStyleLabels: styleTruth.supportedStyleLabels,
      fallbackApplied: false,
      selectionSource: 'explicit_style',
      summary: `Explicit strings style ${styleTruth.selectedStyleLabel} selects pattern ${selectedPattern.id}.`,
      currentState: `Strings style ${styleTruth.selectedStyleLabel} is active because the explicit style override takes priority over energy ${energy}. If you clear the override, energy would currently select ${selectedOptionByEnergy.label}.`,
      nextStep: `Keep ${styleTruth.selectedStyleLabel}, switch to one of the supported strings styles: ${availableLabels}, or clear the override to let energy drive selection again.`,
    };
  }

  return {
    requestedStyleId: styleTruth.requestedStyleId,
    energy,
    energyThreshold: STRINGS_TREMOLO_ENERGY_THRESHOLD,
    defaultStyleId: styleTruth.defaultStyleId,
    defaultStyleLabel: styleTruth.defaultStyleLabel,
    selectedStyleId: selectedOptionByEnergy.id,
    selectedStyleLabel: selectedOptionByEnergy.label,
    selectedPattern: selectedByEnergy,
    fallbackStyleId: selectedByEnergy.style,
    fallbackStyleLabel: selectedOptionByEnergy.label,
    patternSource: 'unsupported_style_energy_fallback',
    selectionPolicy: `Unsupported strings styles fall back to the current energy-selected pattern. They do not silently reuse the canonical default ${styleTruth.defaultStyleLabel} unless energy already selects it.`,
    supportedStyleIds: styleTruth.supportedStyleIds,
    supportedStyleLabels: styleTruth.supportedStyleLabels,
    fallbackApplied: true,
    selectionSource: 'energy_threshold',
    summary: `Requested strings style ${styleTruth.requestedStyleId} is unsupported, so energy ${energy} falls back to ${selectedOptionByEnergy.label} pattern ${selectedByEnergy.id}.`,
    currentState: `Strings style "${styleTruth.requestedStyleId}" is unavailable, so the override is ignored and energy ${energy} selects ${selectedOptionByEnergy.label}. The canonical default remains ${styleTruth.defaultStyleLabel}.`,
    nextStep: `Choose one of the supported strings styles: ${availableLabels}, or clear the unsupported override and keep the current energy-driven selection.`,
  };
}

export function buildStringsFromPattern(
  chord: { degree: string | null; quality: string | null },
  key: string,
  _barNumber: number,
  barOffset: number,
  energy: number,
  octave: number = 4,
  styleOverride?: string
): MidiNoteData[] {
  if (!chord.degree) return [];

  const tones = getChordTones(chord.degree, chord.quality, key, octave);
  if (tones.length === 0) return [];

  const pattern = getStringsPatternSelectionTruth(styleOverride, energy).selectedPattern;
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
