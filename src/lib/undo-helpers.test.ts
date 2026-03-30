import { describe, it, expect } from 'vitest';
import {
  parseRedoSnapshot,
  parseSnapshot,
  parseUndoBoundarySnapshot,
  parseUndoSnapshot,
  snapshotArrangement,
} from './undo-helpers';

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

describe('parseUndoBoundarySnapshot', () => {
  const beforeSnapshot = JSON.stringify({
    stems: [{ id: 'before-stem' }],
    sections: [],
    blocks: [],
    chords: [],
  });
  const afterSnapshot = JSON.stringify({
    stems: [{ id: 'after-stem' }],
    sections: [],
    blocks: [],
    chords: [],
  });

  it('selects the before snapshot for undo boundaries', () => {
    expect(
      parseUndoBoundarySnapshot(
        { stateBefore: beforeSnapshot, stateAfter: afterSnapshot },
        'undo'
      )
    ).toMatchObject({
      stems: [{ id: 'before-stem' }],
    });
  });

  it('selects the after snapshot for redo boundaries', () => {
    expect(
      parseUndoBoundarySnapshot(
        { stateBefore: beforeSnapshot, stateAfter: afterSnapshot },
        'redo'
      )
    ).toMatchObject({
      stems: [{ id: 'after-stem' }],
    });
  });
});

describe('parseUndoSnapshot', () => {
  it('parses the restore target for undo entries without a boundary literal', () => {
    expect(
      parseUndoSnapshot({
        stateBefore: JSON.stringify({
          stems: [{ id: 'before-stem' }],
          sections: [],
          blocks: [],
          chords: [],
        }),
        stateAfter: JSON.stringify({
          stems: [{ id: 'after-stem' }],
          sections: [],
          blocks: [],
          chords: [],
        }),
      })
    ).toMatchObject({
      stems: [{ id: 'before-stem' }],
    });
  });
});

describe('parseRedoSnapshot', () => {
  it('parses the restore target for redo entries without a boundary literal', () => {
    expect(
      parseRedoSnapshot({
        stateBefore: JSON.stringify({
          stems: [{ id: 'before-stem' }],
          sections: [],
          blocks: [],
          chords: [],
        }),
        stateAfter: JSON.stringify({
          stems: [{ id: 'after-stem' }],
          sections: [],
          blocks: [],
          chords: [],
        }),
      })
    ).toMatchObject({
      stems: [{ id: 'after-stem' }],
    });
  });
});
