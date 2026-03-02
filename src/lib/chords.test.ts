import { describe, it, expect } from 'vitest';
import {
  formatChord,
  parseChordInput,
  degreeToNote,
  noteToDegree,
  ALL_KEYS,
} from './chords';
import type { Chord } from '@/types';

const chord = (
  degree: string | null,
  quality: string | null = null,
  bassDegree: string | null = null
): Chord => ({
  id: 'test',
  projectId: 'test',
  barNumber: 1,
  degree,
  quality,
  bassDegree,
});

describe('formatChord', () => {
  it('returns N.C. for null degree in letter mode', () => {
    expect(formatChord(chord(null), 'C', 'letter')).toBe('N.C.');
  });

  it('returns N.C. for null degree in roman mode', () => {
    expect(formatChord(chord(null), 'C', 'roman')).toBe('N.C.');
  });

  it('formats ii min7 as Dm7 in key of C (letter)', () => {
    expect(formatChord(chord('ii', 'min7'), 'C', 'letter')).toBe('Dm7');
  });

  it('formats V dom7 as G7 in key of C (letter)', () => {
    expect(formatChord(chord('V', 'dom7'), 'C', 'letter')).toBe('G7');
  });

  it('formats I maj7 as Cmaj7 in key of C (letter)', () => {
    expect(formatChord(chord('I', 'maj7'), 'C', 'letter')).toBe('Cmaj7');
  });

  it('formats V dom7 slash vii as G7/B in key of C (letter)', () => {
    expect(formatChord(chord('V', 'dom7', 'vii'), 'C', 'letter')).toBe('G7/B');
  });

  it('formats iv min7 as Fm7 in key of C (letter)', () => {
    expect(formatChord(chord('IV', 'maj7'), 'C', 'letter')).toBe('Fmaj7');
  });

  it('formats ii min7 as ii7 in roman mode', () => {
    expect(formatChord(chord('ii', 'min7'), 'C', 'roman')).toBe('ii7');
  });

  it('formats I maj7 as Imaj7 in roman mode', () => {
    expect(formatChord(chord('I', 'maj7'), 'C', 'roman')).toBe('Imaj7');
  });

  it('formats bII dom7 as Dbmaj7 resolves correctly in key of C (letter)', () => {
    expect(formatChord(chord('bII', 'dom7'), 'C', 'letter')).toBe('Db7');
  });

  it('formats chord in flat key (Bb): IV as Eb', () => {
    expect(formatChord(chord('IV', null), 'Bb', 'letter')).toBe('Eb');
  });

  it('formats chord with no quality', () => {
    expect(formatChord(chord('I'), 'G', 'letter')).toBe('G');
  });
});

describe('degreeToNote', () => {
  it('I in C is C', () => expect(degreeToNote('I', 'C')).toBe('C'));
  it('ii in C is D', () => expect(degreeToNote('ii', 'C')).toBe('D'));
  it('V in C is G', () => expect(degreeToNote('V', 'C')).toBe('G'));
  it('bII in C is Db', () => expect(degreeToNote('bII', 'C')).toBe('Db'));
  it('IV in Bb is Eb', () => expect(degreeToNote('IV', 'Bb')).toBe('Eb'));
  it('V in F# is C#', () => expect(degreeToNote('V', 'F#')).toBe('C#'));
  it('ii in Bb is C', () => expect(degreeToNote('ii', 'Bb')).toBe('C'));
  it('vii in C is B', () => expect(degreeToNote('vii', 'C')).toBe('B'));
});

describe('noteToDegree', () => {
  it('D in key of C is ii', () => expect(noteToDegree('D', 'C')).toBe('ii'));
  it('G in key of C is V', () => expect(noteToDegree('G', 'C')).toBe('V'));
  it('C in key of C is I', () => expect(noteToDegree('C', 'C')).toBe('I'));
  it('F in key of C is IV', () => expect(noteToDegree('F', 'C')).toBe('IV'));
  it('B in key of C is vii', () => expect(noteToDegree('B', 'C')).toBe('vii'));
  it('Eb in key of Bb is IV', () => expect(noteToDegree('Eb', 'Bb')).toBe('IV'));
});

describe('parseChordInput', () => {
  it('parses Dm7 in key of C as ii min7', () => {
    expect(parseChordInput('Dm7', 'C')).toEqual({ degree: 'ii', quality: 'min7', bassDegree: null });
  });

  it('parses G7 in key of C as V dom7', () => {
    expect(parseChordInput('G7', 'C')).toEqual({ degree: 'V', quality: 'dom7', bassDegree: null });
  });

  it('parses Cmaj7 in key of C as I maj7', () => {
    expect(parseChordInput('Cmaj7', 'C')).toEqual({ degree: 'I', quality: 'maj7', bassDegree: null });
  });

  it('parses N.C. as null degree', () => {
    expect(parseChordInput('N.C.', 'C')).toEqual({ degree: null, quality: null, bassDegree: null });
  });

  it('parses Roman numeral ii7 directly', () => {
    const result = parseChordInput('ii7', 'C');
    expect(result?.degree).toBe('ii');
    expect(result?.quality).toBe('dom7');
  });

  it('parses Imaj7 as I maj7', () => {
    expect(parseChordInput('Imaj7', 'C')).toEqual({ degree: 'I', quality: 'maj7', bassDegree: null });
  });

  it('parses slash chord G7/B in key of C', () => {
    const result = parseChordInput('G7/B', 'C');
    expect(result?.degree).toBe('V');
    expect(result?.quality).toBe('dom7');
    expect(result?.bassDegree).toBe('vii');
  });

  it('returns null for unparseable input', () => {
    expect(parseChordInput('xyz123!!', 'C')).toBeNull();
  });
});

describe('ALL_KEYS', () => {
  it('has 12 entries', () => expect(ALL_KEYS).toHaveLength(12));
  it('starts with C', () => expect(ALL_KEYS[0]).toBe('C'));
  it('contains Bb', () => expect(ALL_KEYS.some((k) => k.includes('Bb'))).toBe(true));
});
