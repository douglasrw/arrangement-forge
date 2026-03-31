import { describe, it, expect } from 'vitest';
import { parseChordChart } from './chord-chart-parser';

describe('parseChordChart', () => {
  it('returns empty array for empty input', () => {
    const { chords, warnings, truth } = parseChordChart('', 'C');
    expect(chords).toHaveLength(0);
    expect(warnings).toHaveLength(0);
    expect(truth).toEqual({
      state: 'ready',
      title: 'Chord chart parsed',
      summary: 'All chord bars resolved cleanly.',
      nextStep: null,
      blockedBars: [],
      issueHighlights: [],
    });
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
    const { chords, warnings, issues, truth } = parseChordChart('C | xyz??', 'C');
    expect(chords[1].degree).toBeNull();
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('xyz??');
    expect(issues).toEqual([
      expect.objectContaining({
        barNumber: 2,
        token: 'xyz??',
        reason: 'invalid_token',
      }),
    ]);
    expect(truth).toMatchObject({
      state: 'blocked',
      title: 'Chord chart needs attention',
      summary: 'Bar 2 will become N.C. during generation. 1 bar has an unrecognized chord token.',
      nextStep: 'Fix or replace the flagged chord bars before generating.',
      blockedBars: [2],
      issueHighlights: ['Bar 2: could not parse "xyz??"'],
    });
  });

  it('captures repeat markers that do not have a previous chord', () => {
    const { chords, issues } = parseChordChart('% | C', 'C');
    expect(chords[0].degree).toBeNull();
    expect(issues).toEqual([
      expect.objectContaining({
        barNumber: 1,
        token: '%',
        reason: 'repeat_without_previous',
      }),
    ]);
  });

  it('captures repeat markers that follow an unresolved bar', () => {
    const { chords, issues, warnings, truth } = parseChordChart('xyz?? | % | C', 'C');
    expect(chords[0].degree).toBeNull();
    expect(chords[1].degree).toBeNull();
    expect(issues).toEqual([
      expect.objectContaining({
        barNumber: 1,
        token: 'xyz??',
        reason: 'invalid_token',
      }),
      expect.objectContaining({
        barNumber: 2,
        token: '%',
        reason: 'repeat_without_resolved_chord',
      }),
    ]);
    expect(warnings[1]).toContain('follows a bar that could not be resolved');
    expect(truth).toMatchObject({
      state: 'blocked',
      title: 'Chord chart has parse issues',
      summary:
        'Bars 1 and 2 will become N.C. during generation. 1 bar has an unrecognized chord token. 1 repeat marker follows an unresolved bar.',
      nextStep: 'Replace the flagged repeat bars with explicit chords or fix the bar before them.',
      blockedBars: [1, 2],
      issueHighlights: [
        'Bar 1: could not parse "xyz??"',
        'Bar 2: repeat marker "%" follows a bar that could not be resolved',
      ],
    });
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
