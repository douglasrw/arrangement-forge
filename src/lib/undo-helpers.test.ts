import { describe, it, expect } from 'vitest';
import { snapshotArrangement, parseSnapshot } from './undo-helpers';

describe('snapshotArrangement', () => {
  it('returns valid JSON with all four keys', () => {
    const result = snapshotArrangement({
      stems: [{ id: 'st1' }] as any[],
      sections: [{ id: 's1' }] as any[],
      blocks: [{ id: 'b1' }] as any[],
      chords: [{ id: 'c1' }] as any[],
    });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('stems');
    expect(parsed).toHaveProperty('sections');
    expect(parsed).toHaveProperty('blocks');
    expect(parsed).toHaveProperty('chords');
  });
});

describe('parseSnapshot', () => {
  it('returns the object for valid input', () => {
    const json = JSON.stringify({
      stems: [], sections: [], blocks: [], chords: [],
    });
    const result = parseSnapshot(json);
    expect(result).not.toBeNull();
    expect(result!.stems).toEqual([]);
  });

  it('returns null for invalid JSON', () => {
    expect(parseSnapshot('not json')).toBeNull();
  });

  it('returns null for objects missing required keys', () => {
    expect(parseSnapshot(JSON.stringify({ stems: [] }))).toBeNull();
  });

  it('returns null for bare arrays (the old broken format)', () => {
    expect(parseSnapshot(JSON.stringify([{ id: 'b1' }]))).toBeNull();
  });
});
