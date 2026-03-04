import { describe, it, expect } from 'vitest';
import { getPianoPattern, buildPianoFromPattern } from './piano-patterns';

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
