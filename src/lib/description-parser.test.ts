import { describe, it, expect } from 'vitest';
import { parseDescription } from './description-parser';

describe('parseDescription', () => {
  it('extracts genre from keyword', () => {
    const result = parseDescription('jazz backing track');
    expect(result.genre).toBe('Jazz');
  });

  it('extracts time signature from waltz keyword', () => {
    const result = parseDescription('jazz waltz, medium tempo, smoky feel');
    expect(result.genre).toBe('Jazz');
    expect(result.timeSignature).toBe('3/4');
    expect(result.energy).toBe(50);
  });

  it('generationHints contains unparsed content', () => {
    const result = parseDescription('jazz waltz, medium tempo, smoky feel');
    expect(result.generationHints).toContain('smoky feel');
  });

  it('extracts blues genre', () => {
    expect(parseDescription('slow blues')).toMatchObject({ genre: 'Blues' });
  });

  it('extracts R&B genre', () => {
    expect(parseDescription('r&b groove')).toMatchObject({ genre: 'R&B' });
    expect(parseDescription('rnb track')).toMatchObject({ genre: 'R&B' });
  });

  it('extracts bossa nova as Latin + Bossa Nova sub-style', () => {
    const result = parseDescription('bossa nova in 4/4');
    expect(result.genre).toBe('Latin');
    expect(result.subStyle).toBe('Bossa Nova');
    expect(result.timeSignature).toBe('4/4');
  });

  it('extracts tempo from bpm pattern', () => {
    const result = parseDescription('jazz at 120 bpm');
    expect(result.tempo).toBe(120);
  });

  it('extracts energy from soft keyword', () => {
    expect(parseDescription('soft jazz')).toMatchObject({ energy: 20 });
  });

  it('extracts energy from intense keyword', () => {
    expect(parseDescription('intense rock')).toMatchObject({ energy: 90 });
  });

  it('returns empty generationHints for fully parsed input', () => {
    const result = parseDescription('jazz');
    expect(result.generationHints).toBe('');
  });

  it('handles empty string', () => {
    const result = parseDescription('');
    expect(result.generationHints).toBe('');
    expect(result.genre).toBeUndefined();
  });

  it('passes unrecognized phrases to generationHints', () => {
    const result = parseDescription('moody, introspective vibe');
    expect(result.generationHints).toContain('introspective vibe');
  });
});
