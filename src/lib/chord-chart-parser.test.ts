import { describe, it, expect } from 'vitest';
import { parseChordChart } from './chord-chart-parser';

describe('parseChordChart', () => {
  it('returns empty array for empty input', () => {
    const { chords, warnings } = parseChordChart('', 'C');
    expect(chords).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it('parses pipe-separated chord names', () => {
    const { chords } = parseChordChart('Cmaj7 | Dm7 | G7 | Cmaj7', 'C');
    expect(chords).toHaveLength(4);
    expect(chords[0].degree).toBe('I');
    expect(chords[0].quality).toBe('maj7');
    expect(chords[1].degree).toBe('ii');
    expect(chords[2].degree).toBe('V');
  });

  it('parses space-separated Roman numerals', () => {
    const { chords } = parseChordChart('I ii V I', 'C');
    expect(chords).toHaveLength(4);
    expect(chords[0].degree).toBe('I');
    expect(chords[1].degree).toBe('ii');
    expect(chords[2].degree).toBe('V');
  });

  it('assigns sequential bar numbers', () => {
    const { chords } = parseChordChart('C G Am F', 'C');
    expect(chords[0].bar_number).toBe(1);
    expect(chords[3].bar_number).toBe(4);
  });

  it('parses two lines as 8 bars', () => {
    const { chords } = parseChordChart('C G Am F\nDm G C C', 'C');
    expect(chords).toHaveLength(8);
  });

  it('repeat marker copies previous chord', () => {
    const { chords, warnings } = parseChordChart('C | %', 'C');
    expect(chords).toHaveLength(2);
    expect(chords[1].degree).toBe(chords[0].degree);
    expect(warnings).toHaveLength(0);
  });

  it('/ repeat marker copies previous chord', () => {
    const { chords } = parseChordChart('Dm7 | /', 'C');
    expect(chords[1].degree).toBe('ii');
    expect(chords[1].quality).toBe('min7');
  });

  it('N.C. produces null degree', () => {
    const { chords } = parseChordChart('C | N.C. | G', 'C');
    expect(chords[1].degree).toBeNull();
    expect(chords[1].quality).toBeNull();
  });

  it('NC produces null degree', () => {
    const { chords } = parseChordChart('NC', 'C');
    expect(chords[0].degree).toBeNull();
  });

  it('- produces null degree', () => {
    const { chords } = parseChordChart('C | - | G', 'C');
    expect(chords[1].degree).toBeNull();
  });

  it('unparseable token produces N.C. and a warning', () => {
    const { chords, warnings } = parseChordChart('C | xyz??', 'C');
    expect(chords[1].degree).toBeNull();
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('xyz??');
  });

  it('handles slash chords', () => {
    const { chords } = parseChordChart('G7/B', 'C');
    expect(chords[0].degree).toBe('V');
    expect(chords[0].bass_degree).toBe('vii');
  });

  it('handles Roman numerals with qualities in pipe format', () => {
    const { chords } = parseChordChart('Imaj7 | iim7 | V7', 'C');
    expect(chords[0].degree).toBe('I');
    expect(chords[1].degree).toBe('ii');
    expect(chords[2].degree).toBe('V');
  });
});
