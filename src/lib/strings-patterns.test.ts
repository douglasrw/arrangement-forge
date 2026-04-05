import { describe, it, expect } from 'vitest';
import {
  STRINGS_TREMOLO_ENERGY_THRESHOLD,
  buildStringsFromPattern,
  getStringsPatternSelectionTruth,
} from './strings-patterns';

describe('buildStringsFromPattern', () => {
  const cMajorChord = { degree: 'I', quality: null as string | null };

  describe('getStringsPatternSelectionTruth', () => {
    it('uses the energy threshold when no explicit style override is present', () => {
      expect(getStringsPatternSelectionTruth(null, 50)).toMatchObject({
        requestedStyleId: null,
        energy: 50,
        energyThreshold: STRINGS_TREMOLO_ENERGY_THRESHOLD,
        defaultStyleId: 'sustained_pad',
        defaultStyleLabel: 'Sustained Pad',
        selectedStyleId: 'sustained_pad',
        selectedStyleLabel: 'Sustained Pad',
        fallbackStyleId: 'sustained_pad',
        fallbackStyleLabel: 'Sustained Pad',
        fallbackApplied: false,
        patternSource: 'energy_threshold',
        selectionSource: 'energy_threshold',
      });

      expect(getStringsPatternSelectionTruth(null, 71)).toMatchObject({
        requestedStyleId: null,
        energy: 71,
        energyThreshold: STRINGS_TREMOLO_ENERGY_THRESHOLD,
        defaultStyleId: 'sustained_pad',
        defaultStyleLabel: 'Sustained Pad',
        selectedStyleId: 'tremolo',
        selectedStyleLabel: 'Tremolo',
        fallbackStyleId: 'tremolo',
        fallbackStyleLabel: 'Tremolo',
        fallbackApplied: false,
        patternSource: 'energy_threshold',
        selectionSource: 'energy_threshold',
      });
    });

    it('keeps an explicit supported strings style even when energy would choose a different pattern', () => {
      expect(getStringsPatternSelectionTruth('tremolo', 50)).toMatchObject({
        requestedStyleId: 'tremolo',
        energy: 50,
        defaultStyleId: 'sustained_pad',
        defaultStyleLabel: 'Sustained Pad',
        selectedStyleId: 'tremolo',
        selectedStyleLabel: 'Tremolo',
        fallbackStyleId: 'sustained_pad',
        fallbackStyleLabel: 'Sustained Pad',
        fallbackApplied: false,
        patternSource: 'requested_style',
        selectionSource: 'explicit_style',
      });
    });

    it('falls back to the energy-selected strings pattern when the override is unsupported', () => {
      expect(getStringsPatternSelectionTruth('spiccato', 80)).toMatchObject({
        requestedStyleId: 'spiccato',
        energy: 80,
        energyThreshold: STRINGS_TREMOLO_ENERGY_THRESHOLD,
        defaultStyleId: 'sustained_pad',
        defaultStyleLabel: 'Sustained Pad',
        selectedStyleId: 'tremolo',
        selectedStyleLabel: 'Tremolo',
        fallbackStyleId: 'tremolo',
        fallbackStyleLabel: 'Tremolo',
        fallbackApplied: true,
        patternSource: 'unsupported_style_energy_fallback',
        selectionSource: 'energy_threshold',
      });
    });

    it('makes the strings policy explicit when energy selection differs from the canonical default', () => {
      expect(getStringsPatternSelectionTruth(null, 71)).toMatchObject({
        defaultStyleId: 'sustained_pad',
        defaultStyleLabel: 'Sustained Pad',
        selectedStyleId: 'tremolo',
        selectedStyleLabel: 'Tremolo',
      });
      expect(getStringsPatternSelectionTruth(null, 71).selectionPolicy).toContain(
        'The canonical strings default style remains Sustained Pad'
      );
    });
  });

  it('energy=50 produces 3 notes (root+3rd+5th) with long duration', () => {
    const notes = buildStringsFromPattern(cMajorChord, 'C', 1, 0, 50);
    expect(notes.length).toBe(3);
    for (const note of notes) {
      expect(note.duration).toBeGreaterThan(3.5);
    }
  });

  it('energy=80 produces 16 notes (2 notes x 8 attacks)', () => {
    const notes = buildStringsFromPattern(cMajorChord, 'C', 1, 0, 80);
    expect(notes.length).toBe(16);
  });

  it('tremolo durations are all < 0.5', () => {
    const notes = buildStringsFromPattern(cMajorChord, 'C', 1, 0, 80);
    for (const note of notes) {
      expect(note.duration).toBeLessThan(0.5);
    }
  });

  it('energy=70 uses sustained pad (threshold is > 70)', () => {
    const notes = buildStringsFromPattern(cMajorChord, 'C', 1, 0, 70);
    expect(notes.length).toBe(3); // Sustained pad
  });

  it('energy=71 uses tremolo', () => {
    const notes = buildStringsFromPattern(cMajorChord, 'C', 1, 0, 71);
    expect(notes.length).toBe(16); // Tremolo
  });

  it('explicit strings overrides beat the energy threshold', () => {
    const notes = buildStringsFromPattern(cMajorChord, 'C', 1, 0, 50, 4, 'tremolo');
    expect(notes.length).toBe(16);
  });

  it('unsupported strings overrides fall back to the energy-selected pattern', () => {
    const notes = buildStringsFromPattern(cMajorChord, 'C', 1, 0, 80, 4, 'spiccato');
    expect(notes.length).toBe(16);
  });

  it('returns empty array when chord degree is null', () => {
    const notes = buildStringsFromPattern({ degree: null, quality: null }, 'C', 1, 0, 50);
    expect(notes.length).toBe(0);
  });

  it('applies barOffset correctly', () => {
    const notes = buildStringsFromPattern(cMajorChord, 'C', 1, 8, 50);
    for (const note of notes) {
      expect(note.time).toBeGreaterThanOrEqual(8);
    }
  });

  it('velocities are in valid range 1-127', () => {
    const padNotes = buildStringsFromPattern(cMajorChord, 'C', 1, 0, 50);
    const tremoloNotes = buildStringsFromPattern(cMajorChord, 'C', 1, 0, 80);
    for (const note of [...padNotes, ...tremoloNotes]) {
      expect(note.velocity).toBeGreaterThanOrEqual(1);
      expect(note.velocity).toBeLessThanOrEqual(127);
    }
  });
});
