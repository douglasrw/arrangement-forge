import { describe, it, expect } from 'vitest';
import { getPianoPattern, getPianoPatternSelectionTruth, buildPianoFromPattern } from './piano-patterns';

describe('getPianoPattern', () => {
  it('returns jazz_comp pattern', () => {
    const pattern = getPianoPattern('jazz_comp');
    expect(pattern.style).toBe('jazz_comp');
    expect(pattern.bars.length).toBeGreaterThanOrEqual(2);
  });

  it('returns block_chords pattern', () => {
    const pattern = getPianoPattern('block_chords');
    expect(pattern.style).toBe('block_chords');
  });

  it('returns arpeggiated pattern', () => {
    const pattern = getPianoPattern('arpeggiated');
    expect(pattern.style).toBe('arpeggiated');
  });

  it('falls back to block_chords for unknown style', () => {
    const pattern = getPianoPattern('unknown');
    expect(pattern.style).toBe('block_chords');
  });
});

describe('getPianoPatternSelectionTruth', () => {
  it('keeps the selected piano pattern visible when the style is supported', () => {
    const selection = getPianoPatternSelectionTruth('arpeggiated');

    expect(selection).toMatchObject({
      requestedStyleId: 'arpeggiated',
      usedDefaultStyle: false,
      defaultStyleId: 'jazz_comp',
      defaultStyleLabel: 'Jazz Comping',
      selectedStyleId: 'arpeggiated',
      selectedStyleLabel: 'Arpeggiated',
      fallbackApplied: false,
      supportedStyleIds: ['jazz_comp', 'block_chords', 'arpeggiated'],
      supportedStyleLabels: ['Jazz Comping', 'Block Chords', 'Arpeggiated'],
      summary: 'Arpeggiated uses piano pattern arpeggiated_01.',
      currentState: 'Piano style Arpeggiated is active with pattern arpeggiated_01. No fallback was needed.',
      nextStep: 'Keep Arpeggiated, or switch to one of the supported piano styles: Jazz Comping, Block Chords, Arpeggiated (jazz_comp, block_chords, arpeggiated).',
    });
    expect(selection.selectedPattern.id).toBe('arpeggiated_01');
  });

  it('makes the default piano pattern explicit when the request is blank', () => {
    const selection = getPianoPatternSelectionTruth('   ');

    expect(selection).toMatchObject({
      requestedStyleId: null,
      usedDefaultStyle: true,
      defaultStyleId: 'jazz_comp',
      defaultStyleLabel: 'Jazz Comping',
      selectedStyleId: 'jazz_comp',
      selectedStyleLabel: 'Jazz Comping',
      fallbackApplied: false,
      summary: 'No piano style was requested, so the default Jazz Comping pattern jazz_comp_01 is active.',
      currentState: 'Piano is using the default Jazz Comping style with pattern jazz_comp_01 because no explicit style was requested.',
      nextStep: 'Keep the default Jazz Comping style, or switch to one of the supported piano styles: Jazz Comping, Block Chords, Arpeggiated (jazz_comp, block_chords, arpeggiated).',
    });
    expect(selection.selectedPattern.id).toBe('jazz_comp_01');
  });

  it('reports fallback piano truth when the requested style is unsupported', () => {
    const selection = getPianoPatternSelectionTruth('stride');

    expect(selection).toMatchObject({
      requestedStyleId: 'stride',
      usedDefaultStyle: false,
      defaultStyleId: 'jazz_comp',
      defaultStyleLabel: 'Jazz Comping',
      selectedStyleId: 'block_chords',
      selectedStyleLabel: 'Block Chords',
      fallbackApplied: true,
      summary: 'Requested piano style stride falls back to Block Chords with pattern block_chords_01.',
      currentState: 'Requested piano style "stride" is unavailable, so piano style Block Chords is active with fallback pattern block_chords_01.',
      nextStep: 'Choose one of the supported piano styles: Jazz Comping, Block Chords, Arpeggiated (jazz_comp, block_chords, arpeggiated).',
    });
    expect(selection.selectedPattern.id).toBe('block_chords_01');
  });
});

describe('buildPianoFromPattern', () => {
  const cMajorChord = { degree: 'I', quality: 'maj7' as string | null };
  const cMinorChord = { degree: 'I', quality: 'min7' as string | null };

  it('jazz_comp produces 2 voicings per bar, each with 2 notes (shell voicing)', () => {
    const pattern = getPianoPattern('jazz_comp');
    // Test both bars
    for (let bar = 1; bar <= 20; bar++) {
      const notes = buildPianoFromPattern(pattern, cMajorChord, 'C', bar, 0);
      // Each bar has 2 PianoNotes with 2 degrees each = 4 MidiNoteData
      expect(notes.length).toBe(4);
    }
  });

  it('block_chords produces 2 voicings per bar, each with 3 notes (full triad)', () => {
    const pattern = getPianoPattern('block_chords');
    for (let bar = 1; bar <= 20; bar++) {
      const notes = buildPianoFromPattern(pattern, cMajorChord, 'C', bar, 0);
      // Each bar has 2 PianoNotes with 3 degrees each = 6 MidiNoteData
      expect(notes.length).toBe(6);
    }
  });

  it('arpeggiated produces 8 sequential single notes per bar', () => {
    const pattern = getPianoPattern('arpeggiated');
    for (let bar = 1; bar <= 20; bar++) {
      const notes = buildPianoFromPattern(pattern, cMajorChord, 'C', bar, 0);
      expect(notes.length).toBe(8);
    }
  });

  it('two barNumbers produce different patterns', () => {
    const pattern = getPianoPattern('jazz_comp');
    let foundDifference = false;
    for (let bar = 1; bar <= 20; bar++) {
      const a = buildPianoFromPattern(pattern, cMajorChord, 'C', bar, 0);
      const b = buildPianoFromPattern(pattern, cMajorChord, 'C', bar + 1, 0);
      const aKey = a.map((n) => `${n.note}@${n.time}`).join(',');
      const bKey = b.map((n) => `${n.note}@${n.time}`).join(',');
      if (aKey !== bKey) {
        foundDifference = true;
        break;
      }
    }
    expect(foundDifference).toBe(true);
  });

  it('returns empty array when chord degree is null', () => {
    const pattern = getPianoPattern('jazz_comp');
    const notes = buildPianoFromPattern(pattern, { degree: null, quality: null }, 'C', 1, 0);
    expect(notes.length).toBe(0);
  });

  it('applies barOffset correctly', () => {
    const pattern = getPianoPattern('block_chords');
    const notes = buildPianoFromPattern(pattern, cMajorChord, 'C', 1, 12);
    for (const note of notes) {
      expect(note.time).toBeGreaterThanOrEqual(12);
      expect(note.time).toBeLessThan(16);
    }
  });

  it('velocities are in valid range 1-127', () => {
    const pattern = getPianoPattern('jazz_comp');
    const notes = buildPianoFromPattern(pattern, cMinorChord, 'C', 1, 0);
    for (const note of notes) {
      expect(note.velocity).toBeGreaterThanOrEqual(1);
      expect(note.velocity).toBeLessThanOrEqual(127);
    }
  });
});
