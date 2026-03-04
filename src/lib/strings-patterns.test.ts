import { describe, it, expect } from 'vitest';
import { buildStringsFromPattern } from './strings-patterns';

describe('buildStringsFromPattern', () => {
  const cMajorChord = { degree: 'I', quality: null as string | null };

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
