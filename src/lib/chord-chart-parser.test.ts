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
      currentState: 'All chord bars resolved cleanly.',
      summary: 'Generation can use the current chord chart as written.',
      nextStep: null,
      blockedBars: [],
      issueHighlights: [],
      remainingIssueCount: 0,
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

  it('skips unbracketed section header lines without shifting bar truth', () => {
    const { chords, issues, truth } = parseChordChart('Verse:\nCmaj7 | Dm7 | G7 | Cmaj7', 'C');

    expect(chords).toHaveLength(4);
    expect(chords[0].bar_number).toBe(1);
    expect(chords[3].bar_number).toBe(4);
    expect(issues).toHaveLength(0);
    expect(truth).toMatchObject({
      state: 'ready',
      currentState: 'All chord bars resolved cleanly.',
    });
  });

  it('keeps header-only charts blocked until at least one playable bar exists', () => {
    const { chords, issues, truth } = parseChordChart('[Verse]\n\nChorus:', 'C');

    expect(chords).toHaveLength(0);
    expect(issues).toHaveLength(0);
    expect(truth).toEqual({
      state: 'blocked',
      title: 'Chord chart needs chord bars',
      currentState:
        'No playable chord bars are present yet, so Generate stays blocked until the chart includes at least one chord bar.',
      summary: 'Section labels and blank lines do not create playable bars on their own.',
      nextStep: 'Add at least one chord bar such as Cmaj7 | Fmaj7 | G7 | Cmaj7.',
      blockedBars: [],
      issueHighlights: [],
      remainingIssueCount: 0,
    });
  });

  it('keeps no-chord-only charts blocked until at least one playable bar exists', () => {
    const { chords, issues, truth } = parseChordChart('N.C. | - | nc', 'C');

    expect(chords).toHaveLength(3);
    expect(chords.every((chord) => chord.degree === null)).toBe(true);
    expect(issues).toHaveLength(0);
    expect(truth).toEqual({
      state: 'blocked',
      title: 'Chord chart needs chord bars',
      currentState:
        'The current chart only contains N.C. or rest bars, so Generate stays blocked until at least one playable chord bar is entered.',
      summary: 'Bars marked as N.C. or rest do not create playable harmony on their own.',
      nextStep:
        'Replace at least one N.C. or rest bar with a chord such as Cmaj7 | Fmaj7 | G7 | Cmaj7.',
      blockedBars: [],
      issueHighlights: [],
      remainingIssueCount: 0,
    });
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
        lineNumber: 1,
        barNumber: 2,
        token: 'xyz??',
        reason: 'invalid_token',
      }),
    ]);
    expect(truth).toMatchObject({
      state: 'blocked',
      title: 'Chord chart needs attention',
      currentState:
        'Bar 2 currently parses as N.C., so Generate stays blocked until the chart is fixed.',
      summary: '1 bar has an unrecognized chord token.',
      nextStep: 'Fix or replace bar 2 before generating.',
      blockedBars: [2],
      issueHighlights: ['Line 1, bar 2: could not parse "xyz??"'],
      remainingIssueCount: 0,
    });
  });

  it('keeps all-invalid charts in the parse-issue path instead of collapsing them into missing-bar truth', () => {
    const { chords, warnings, issues, truth } = parseChordChart('xyz?? | %', 'C');

    expect(chords).toHaveLength(2);
    expect(chords.every((chord) => chord.degree === null)).toBe(true);
    expect(warnings).toHaveLength(2);
    expect(issues).toEqual([
      expect.objectContaining({
        lineNumber: 1,
        barNumber: 1,
        token: 'xyz??',
        reason: 'invalid_token',
      }),
      expect.objectContaining({
        lineNumber: 1,
        barNumber: 2,
        token: '%',
        reason: 'repeat_without_resolved_chord',
      }),
    ]);
    expect(truth).toMatchObject({
      state: 'blocked',
      title: 'Chord chart has parse issues',
      currentState:
        'Bars 1 and 2 currently parse as N.C., so Generate stays blocked until the chart is fixed.',
      summary: '1 bar has an unrecognized chord token. 1 repeat marker follows an unresolved bar.',
      nextStep: 'Replace bars 1 and 2 with explicit chords or fix the bar before them.',
      blockedBars: [1, 2],
      issueHighlights: [
        'Line 1, bar 1: could not parse "xyz??"',
        'Line 1, bar 2: repeat marker "%" follows a bar that could not be resolved',
      ],
      remainingIssueCount: 0,
    });
  });

  it('captures repeat markers that do not have a previous chord', () => {
    const { chords, issues, truth } = parseChordChart('% | C', 'C');
    expect(chords[0].degree).toBeNull();
    expect(issues).toEqual([
      expect.objectContaining({
        lineNumber: 1,
        barNumber: 1,
        token: '%',
        reason: 'repeat_without_previous',
      }),
    ]);
    expect(truth).toMatchObject({
      state: 'blocked',
      nextStep: 'Replace bar 1 with explicit chords before using repeat markers.',
    });
  });

  it('captures repeat markers that follow an unresolved bar', () => {
    const { chords, issues, warnings, truth } = parseChordChart('xyz?? | % | C', 'C');
    expect(chords[0].degree).toBeNull();
    expect(chords[1].degree).toBeNull();
    expect(issues).toEqual([
      expect.objectContaining({
        lineNumber: 1,
        barNumber: 1,
        token: 'xyz??',
        reason: 'invalid_token',
      }),
      expect.objectContaining({
        lineNumber: 1,
        barNumber: 2,
        token: '%',
        reason: 'repeat_without_resolved_chord',
      }),
    ]);
    expect(warnings[1]).toContain('follows a bar that could not be resolved');
    expect(truth).toMatchObject({
      state: 'blocked',
      title: 'Chord chart has parse issues',
      currentState:
        'Bars 1 and 2 currently parse as N.C., so Generate stays blocked until the chart is fixed.',
      summary: '1 bar has an unrecognized chord token. 1 repeat marker follows an unresolved bar.',
      nextStep: 'Replace bars 1 and 2 with explicit chords or fix the bar before them.',
      blockedBars: [1, 2],
      issueHighlights: [
        'Line 1, bar 1: could not parse "xyz??"',
        'Line 1, bar 2: repeat marker "%" follows a bar that could not be resolved',
      ],
      remainingIssueCount: 0,
    });
  });

  it('keeps hidden overflow issue count explicit when only the first highlights are surfaced', () => {
    const { truth } = parseChordChart('xyz?? | % | / | % | C', 'C');

    expect(truth).toMatchObject({
      blockedBars: [1, 2, 3, 4],
      issueHighlights: [
        'Line 1, bar 1: could not parse "xyz??"',
        'Line 1, bar 2: repeat marker "%" follows a bar that could not be resolved',
        'Line 1, bar 3: repeat marker "/" follows a bar that could not be resolved',
      ],
      remainingIssueCount: 1,
    });
  });

  it('keeps issue locations line-aware when invalid bars appear after section headers', () => {
    const { issues, truth } = parseChordChart('[Verse]\nCmaj7 | xyz?? | %', 'C');

    expect(issues).toEqual([
      expect.objectContaining({
        lineNumber: 2,
        barNumber: 2,
        token: 'xyz??',
        reason: 'invalid_token',
      }),
      expect.objectContaining({
        lineNumber: 2,
        barNumber: 3,
        token: '%',
        reason: 'repeat_without_resolved_chord',
      }),
    ]);
    expect(truth.issueHighlights).toEqual([
      'Line 2, bar 2: could not parse "xyz??"',
      'Line 2, bar 3: repeat marker "%" follows a bar that could not be resolved',
    ]);
  });

  it('keeps issue locations aligned to the original chart line numbers when blank lines are present', () => {
    const { issues, truth } = parseChordChart('[Verse]\n\nCmaj7 | xyz?? | %', 'C');

    expect(issues).toEqual([
      expect.objectContaining({
        lineNumber: 3,
        barNumber: 2,
        token: 'xyz??',
        reason: 'invalid_token',
      }),
      expect.objectContaining({
        lineNumber: 3,
        barNumber: 3,
        token: '%',
        reason: 'repeat_without_resolved_chord',
      }),
    ]);
    expect(truth.issueHighlights).toEqual([
      'Line 3, bar 2: could not parse "xyz??"',
      'Line 3, bar 3: repeat marker "%" follows a bar that could not be resolved',
    ]);
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
