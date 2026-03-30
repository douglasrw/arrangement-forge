import { describe, it, expect } from 'vitest';
import {
  createUndoBoundaryTransition,
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
  const undoSnapshot = JSON.stringify({
    stems: [{ id: 'undo-stem' }],
    sections: [],
    blocks: [],
    chords: [],
  });
  const redoSnapshot = JSON.stringify({
    stems: [{ id: 'redo-stem' }],
    sections: [],
    blocks: [],
    chords: [],
  });

  it('selects the undo snapshot for undo boundaries', () => {
    expect(
      parseUndoBoundarySnapshot(
        { undoSnapshot, redoSnapshot },
        'undo'
      )
    ).toMatchObject({
      stems: [{ id: 'undo-stem' }],
    });
  });

  it('selects the redo snapshot for redo boundaries', () => {
    expect(
      parseUndoBoundarySnapshot(
        { undoSnapshot, redoSnapshot },
        'redo'
      )
    ).toMatchObject({
      stems: [{ id: 'redo-stem' }],
    });
  });
});

describe('createUndoBoundaryTransition', () => {
  it('returns the named restore snapshot for an undo boundary', () => {
    const transition = createUndoBoundaryTransition(
      {
        undoSnapshot: JSON.stringify({
          stems: [{ id: 'undo-stem' }],
          sections: [],
          blocks: [],
          chords: [],
        }),
        redoSnapshot: JSON.stringify({
          stems: [{ id: 'redo-stem' }],
          sections: [],
          blocks: [],
          chords: [],
        }),
      },
      'undo'
    );

    expect(transition.boundary).toBe('undo');
    expect(transition.restoreSnapshot).toMatchObject({
      stems: [{ id: 'undo-stem' }],
    });
  });
});

describe('parseUndoSnapshot', () => {
  it('parses the restore target for undo entries without a boundary literal', () => {
    expect(
      parseUndoSnapshot({
        undoSnapshot: JSON.stringify({
          stems: [{ id: 'undo-stem' }],
          sections: [],
          blocks: [],
          chords: [],
        }),
        redoSnapshot: JSON.stringify({
          stems: [{ id: 'redo-stem' }],
          sections: [],
          blocks: [],
          chords: [],
        }),
      })
    ).toMatchObject({
      stems: [{ id: 'undo-stem' }],
    });
  });
});

describe('parseRedoSnapshot', () => {
  it('parses the restore target for redo entries without a boundary literal', () => {
    expect(
      parseRedoSnapshot({
        undoSnapshot: JSON.stringify({
          stems: [{ id: 'undo-stem' }],
          sections: [],
          blocks: [],
          chords: [],
        }),
        redoSnapshot: JSON.stringify({
          stems: [{ id: 'redo-stem' }],
          sections: [],
          blocks: [],
          chords: [],
        }),
      })
    ).toMatchObject({
      stems: [{ id: 'redo-stem' }],
    });
  });
});
