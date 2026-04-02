import { describe, it, expect } from 'vitest';
import { buildBassFromPattern, getBassPattern, getBassPatternSelectionTruth } from './bass-patterns';

describe('getBassPattern', () => {
  it('returns a walking pattern with 2 bars', () => {
    const pattern = getBassPattern('walking');
    expect(pattern.style).toBe('walking');
    expect(pattern.bars.length).toBe(2);
  });

  it('returns a slap pattern with 2 bars', () => {
    const pattern = getBassPattern('slap');
    expect(pattern.style).toBe('slap');
    expect(pattern.bars.length).toBe(2);
  });

  it('returns a pick pattern with 2 bars', () => {
    const pattern = getBassPattern('pick');
    expect(pattern.style).toBe('pick');
    expect(pattern.bars.length).toBe(2);
  });

  it('returns a fingerstyle pattern with 2 bars', () => {
    const pattern = getBassPattern('fingerstyle');
    expect(pattern.style).toBe('fingerstyle');
    expect(pattern.bars.length).toBe(2);
  });

  it('falls back to fingerstyle for unknown style', () => {
    const pattern = getBassPattern('unknown');
    expect(pattern.style).toBe('fingerstyle');
  });
});

describe('getBassPatternSelectionTruth', () => {
  it('keeps the selected bass pattern visible when the style is supported', () => {
    const selection = getBassPatternSelectionTruth('pick');

    expect(selection.fallbackApplied).toBe(false);
    expect(selection.selectedPattern.style).toBe('pick');
    expect(selection.currentState).toBe('Pick is selected for bass.');
    expect(selection.nextStep).toBe('Keep Pick or choose one of: Walking, Slap, Pick, Fingerstyle.');
  });

  it('makes the fallback selection explicit when the requested style is unsupported', () => {
    const selection = getBassPatternSelectionTruth('walking_bass');

    expect(selection.requestedStyleId).toBe('walking_bass');
    expect(selection.fallbackApplied).toBe(true);
    expect(selection.selectedPattern.style).toBe('fingerstyle');
    expect(selection.currentState).toBe('bass style "walking_bass" is unavailable, so Fingerstyle is selected instead.');
  });
});

describe('buildBassFromPattern', () => {
  const cMajorChord = { degree: 'I', quality: null as string | null };

  it('walking style, C major, bar 1 returns 4 notes', () => {
    const pattern = getBassPattern('walking');
    const notes = buildBassFromPattern(pattern, cMajorChord, 'C', 1, 0);
    expect(notes.length).toBe(4);
  });

  it('slap style returns notes with short durations (< 0.5)', () => {
    const pattern = getBassPattern('slap');
    const notes = buildBassFromPattern(pattern, cMajorChord, 'C', 1, 0);
    expect(notes.length).toBeGreaterThanOrEqual(4);
    for (const note of notes) {
      expect(note.duration).toBeLessThanOrEqual(0.5);
    }
  });

  it('pick style returns 8 notes per bar (driving 8ths)', () => {
    const pattern = getBassPattern('pick');
    const notes = buildBassFromPattern(pattern, cMajorChord, 'C', 1, 0);
    expect(notes.length).toBe(8);
  });

  it('two different barNumbers produce different bar selections', () => {
    const pattern = getBassPattern('walking');
    // With 2 bar variations and knuthHash, different barNumbers should
    // eventually select different bars. Check across a range.
    let foundDifference = false;
    for (let bar = 1; bar <= 20; bar++) {
      const a = buildBassFromPattern(pattern, cMajorChord, 'C', bar, 0);
      const b = buildBassFromPattern(pattern, cMajorChord, 'C', bar + 1, 0);
      const aKey = a.map((n) => n.note).join(',');
      const bKey = b.map((n) => n.note).join(',');
      if (aKey !== bKey) {
        foundDifference = true;
        break;
      }
    }
    expect(foundDifference).toBe(true);
  });

  it('applies barOffset correctly', () => {
    const pattern = getBassPattern('fingerstyle');
    const notes = buildBassFromPattern(pattern, cMajorChord, 'C', 1, 8);
    // All note times should be >= barOffset (8)
    for (const note of notes) {
      expect(note.time).toBeGreaterThanOrEqual(8);
      expect(note.time).toBeLessThan(12); // Within one bar (8 + 4)
    }
  });

  it('returns fallback note when chord degree is null', () => {
    const pattern = getBassPattern('walking');
    const notes = buildBassFromPattern(pattern, { degree: null, quality: null }, 'C', 1, 0);
    expect(notes.length).toBe(1);
    expect(notes[0].note).toBe('C2');
  });

  it('velocities are in valid range 1-127', () => {
    const pattern = getBassPattern('slap');
    const notes = buildBassFromPattern(pattern, cMajorChord, 'C', 1, 0);
    for (const note of notes) {
      expect(note.velocity).toBeGreaterThanOrEqual(1);
      expect(note.velocity).toBeLessThanOrEqual(127);
    }
  });
});
