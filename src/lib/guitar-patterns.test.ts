import { describe, it, expect } from 'vitest';
import { getGuitarPattern, getGuitarPatternSelectionTruth, buildGuitarFromPattern } from './guitar-patterns';

describe('getGuitarPattern', () => {
  it('returns power_chords pattern', () => {
    const pattern = getGuitarPattern('power_chords');
    expect(pattern.style).toBe('power_chords');
  });

  it('returns fingerpick_arpeggios pattern', () => {
    const pattern = getGuitarPattern('fingerpick_arpeggios');
    expect(pattern.style).toBe('fingerpick_arpeggios');
  });

  it('returns rhythm_strum pattern', () => {
    const pattern = getGuitarPattern('rhythm_strum');
    expect(pattern.style).toBe('rhythm_strum');
  });

  it('returns muted_funk pattern', () => {
    const pattern = getGuitarPattern('muted_funk');
    expect(pattern.style).toBe('muted_funk');
  });

  it('falls back to rhythm_strum for unknown style', () => {
    const pattern = getGuitarPattern('unknown');
    expect(pattern.style).toBe('rhythm_strum');
  });
});

describe('getGuitarPatternSelectionTruth', () => {
  it('keeps the selected guitar pattern visible when the style is supported', () => {
    const selection = getGuitarPatternSelectionTruth('muted_funk');

    expect(selection).toMatchObject({
      requestedStyleId: 'muted_funk',
      usedDefaultStyle: false,
      defaultStyleId: 'power_chords',
      defaultStyleLabel: 'Power Chords',
      selectedStyleId: 'muted_funk',
      selectedStyleLabel: 'Muted Funk',
      fallbackStyleId: 'rhythm_strum',
      fallbackStyleLabel: 'Rhythm Strum',
      patternSource: 'requested_style',
      selectionPolicy:
        'Supported guitar styles use their matching named pattern, so Muted Funk selects muted_funk_01. Unsupported guitar requests still fall back to Rhythm Strum.',
      supportedStyleIds: ['power_chords', 'fingerpick_arpeggios', 'rhythm_strum', 'muted_funk'],
      supportedStyleLabels: ['Power Chords', 'Fingerpick Arpeggios', 'Rhythm Strum', 'Muted Funk'],
      fallbackApplied: false,
      summary: 'Muted Funk uses guitar pattern muted_funk_01.',
      currentState: 'Guitar style Muted Funk is active with pattern muted_funk_01. No fallback was needed.',
      nextStep:
        'Keep Muted Funk, or switch to one of the supported guitar styles: Power Chords, Fingerpick Arpeggios, Rhythm Strum, Muted Funk (power_chords, fingerpick_arpeggios, rhythm_strum, muted_funk).',
    });
    expect(selection.selectedPattern.id).toBe('muted_funk_01');
  });

  it('makes the default guitar pattern explicit when the request is blank', () => {
    const selection = getGuitarPatternSelectionTruth('   ');

    expect(selection).toMatchObject({
      requestedStyleId: null,
      usedDefaultStyle: true,
      defaultStyleId: 'power_chords',
      defaultStyleLabel: 'Power Chords',
      selectedStyleId: 'power_chords',
      selectedStyleLabel: 'Power Chords',
      fallbackStyleId: 'rhythm_strum',
      fallbackStyleLabel: 'Rhythm Strum',
      patternSource: 'default_style',
      selectionPolicy:
        'When no guitar style is requested, guitar uses the default Power Chords style and its matching pattern power_chords_01. Unsupported guitar requests fall back to Rhythm Strum.',
      fallbackApplied: false,
      summary: 'No guitar style was requested, so the default Power Chords pattern power_chords_01 is active.',
      currentState:
        'Guitar is using the default Power Chords style with pattern power_chords_01 because no explicit style was requested.',
      nextStep:
        'Keep the default Power Chords style, or switch to one of the supported guitar styles: Power Chords, Fingerpick Arpeggios, Rhythm Strum, Muted Funk (power_chords, fingerpick_arpeggios, rhythm_strum, muted_funk).',
    });
    expect(selection.selectedPattern.id).toBe('power_chords_01');
  });

  it('reports fallback guitar truth when the requested style is unsupported', () => {
    const selection = getGuitarPatternSelectionTruth('surf_lead');

    expect(selection).toMatchObject({
      requestedStyleId: 'surf_lead',
      usedDefaultStyle: false,
      defaultStyleId: 'power_chords',
      defaultStyleLabel: 'Power Chords',
      selectedStyleId: 'rhythm_strum',
      selectedStyleLabel: 'Rhythm Strum',
      fallbackStyleId: 'rhythm_strum',
      fallbackStyleLabel: 'Rhythm Strum',
      patternSource: 'unsupported_style_safe_fallback',
      selectionPolicy:
        'Unsupported guitar styles do not fall back to the default Power Chords style. They fall back to the safer Rhythm Strum pattern rhythm_strum_01.',
      fallbackApplied: true,
      summary:
        'Requested guitar style surf_lead is unsupported, so guitar uses the safer Rhythm Strum fallback pattern rhythm_strum_01 instead of the default Power Chords style.',
      currentState:
        'Requested guitar style "surf_lead" is unavailable. Guitar is currently using the Rhythm Strum fallback pattern rhythm_strum_01; the normal default remains Power Chords.',
      nextStep:
        'Choose one of the supported guitar styles if you want something other than the current Rhythm Strum fallback: Power Chords, Fingerpick Arpeggios, Rhythm Strum, Muted Funk (power_chords, fingerpick_arpeggios, rhythm_strum, muted_funk).',
    });
    expect(selection.selectedPattern.id).toBe('rhythm_strum_01');
  });
});

describe('buildGuitarFromPattern', () => {
  const cMajorChord = { degree: 'I', quality: null as string | null };

  it('power_chords: each note event has exactly 2 notes (root + 5th)', () => {
    const pattern = getGuitarPattern('power_chords');
    const notes = buildGuitarFromPattern(pattern, cMajorChord, 'C', 1, 0);
    // 8 events per bar × 2 notes each = 16 MidiNoteData
    expect(notes.length).toBe(16);
    // Each pair of notes at same time should have 2 entries
    const timeGroups = new Map<number, number>();
    for (const note of notes) {
      timeGroups.set(note.time, (timeGroups.get(note.time) ?? 0) + 1);
    }
    for (const count of timeGroups.values()) {
      expect(count).toBe(2);
    }
  });

  it('fingerpick: 8 sequential single notes per bar', () => {
    const pattern = getGuitarPattern('fingerpick_arpeggios');
    const notes = buildGuitarFromPattern(pattern, cMajorChord, 'C', 1, 0);
    expect(notes.length).toBe(8);
  });

  it('rhythm_strum: downbeats louder than upbeats', () => {
    const pattern = getGuitarPattern('rhythm_strum');
    // Use bar A specifically (bar 1 should select it via knuthHash)
    // Check across many bars to find bar A
    let found = false;
    for (let bar = 1; bar <= 20; bar++) {
      const notes = buildGuitarFromPattern(pattern, cMajorChord, 'C', bar, 0);
      // In bar A: beat 0 vel 80, beat 1 vel 60
      const beat0Notes = notes.filter((n) => n.time === 0);
      const beat1Notes = notes.filter((n) => n.time === 1);
      if (beat0Notes.length > 0 && beat1Notes.length > 0) {
        const downbeatVel = Math.max(...beat0Notes.map((n) => n.velocity));
        const upbeatVel = Math.max(...beat1Notes.map((n) => n.velocity));
        if (downbeatVel > upbeatVel) {
          found = true;
          break;
        }
      }
    }
    expect(found).toBe(true);
  });

  it('muted_funk: all durations <= 0.15', () => {
    const pattern = getGuitarPattern('muted_funk');
    for (let bar = 1; bar <= 20; bar++) {
      const notes = buildGuitarFromPattern(pattern, cMajorChord, 'C', bar, 0);
      for (const note of notes) {
        expect(note.duration).toBeLessThanOrEqual(0.15);
      }
    }
  });

  it('returns empty array when chord degree is null', () => {
    const pattern = getGuitarPattern('power_chords');
    const notes = buildGuitarFromPattern(pattern, { degree: null, quality: null }, 'C', 1, 0);
    expect(notes.length).toBe(0);
  });

  it('applies barOffset correctly', () => {
    const pattern = getGuitarPattern('fingerpick_arpeggios');
    const notes = buildGuitarFromPattern(pattern, cMajorChord, 'C', 1, 16);
    for (const note of notes) {
      expect(note.time).toBeGreaterThanOrEqual(16);
      expect(note.time).toBeLessThan(20);
    }
  });

  it('velocities are in valid range 1-127', () => {
    const pattern = getGuitarPattern('muted_funk');
    const notes = buildGuitarFromPattern(pattern, cMajorChord, 'C', 1, 0);
    for (const note of notes) {
      expect(note.velocity).toBeGreaterThanOrEqual(1);
      expect(note.velocity).toBeLessThanOrEqual(127);
    }
  });
});
