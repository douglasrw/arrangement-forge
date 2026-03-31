import { describe, it, expect } from 'vitest';
import {
  createUndoBoundaryTruth,
  createUndoBoundaryExecutionTruth,
  createUndoBoundaryTransition,
  createUndoHistoryTruth,
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

describe('createUndoBoundaryTruth', () => {
  it('describes an empty undo boundary without exposing an action label', () => {
    expect(createUndoBoundaryTruth(null, 'undo')).toEqual({
      boundary: 'undo',
      status: 'empty',
      description: null,
      actionLabel: null,
      statusLabel: 'Nothing to undo',
      currentState: 'No undo boundary is available right now.',
      nextStep: 'Edit the arrangement to create the next undo boundary.',
      transition: null,
    });
  });

  it('describes an available undo boundary with its action label and restore target', () => {
    const truth = createUndoBoundaryTruth(
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
      'undo',
      'Split block'
    );

    expect(truth.status).toBe('available');
    expect(truth.actionLabel).toBe('Undo: Split block');
    expect(truth.statusLabel).toBe('Undo: Split block');
    expect(truth.currentState).toBe(
      'Undo is ready to restore the arrangement captured before Split block.'
    );
    expect(truth.nextStep).toBe(
      'Use Undo to restore the arrangement captured before Split block.'
    );
    expect(truth.transition?.restoreSnapshot).toMatchObject({
      stems: [{ id: 'undo-stem' }],
    });
  });

  it('describes a blocked redo boundary when the restore snapshot cannot be read', () => {
    const truth = createUndoBoundaryTruth(
      {
        undoSnapshot: JSON.stringify({
          stems: [{ id: 'undo-stem' }],
          sections: [],
          blocks: [],
          chords: [],
        }),
        redoSnapshot: 'not json',
      },
      'redo',
      'Split block'
    );

    expect(truth.status).toBe('blocked');
    expect(truth.actionLabel).toBeNull();
    expect(truth.statusLabel).toBe('Redo blocked');
    expect(truth.currentState).toBe(
      'The latest redo boundary is still on the stack, but its restore snapshot cannot be read.'
    );
    expect(truth.nextStep).toBe(
      'Do not offer Redo for this boundary until a valid restore snapshot is stored.'
    );
    expect(truth.transition?.restoreSnapshot).toBeNull();
  });
});

describe('createUndoBoundaryExecutionTruth', () => {
  it('describes an available undo boundary as paused while generation is running', () => {
    const truth = createUndoBoundaryExecutionTruth(
      createUndoBoundaryTruth(
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
        'undo',
        'Split block'
      ),
      'generating'
    );

    expect(truth).toMatchObject({
      boundary: 'undo',
      status: 'paused',
      actionLabel: null,
      statusLabel: 'Undo paused',
      currentState:
        'Generation is still running, so Undo is temporarily paused even though the arrangement captured before Split block is still preserved on the stack.',
      nextStep:
        'Wait for generation to finish, then use Undo to restore the arrangement captured before Split block.',
    });
  });
});

describe('createUndoHistoryTruth', () => {
  it('stays idle when neither undo nor redo has a restorable boundary', () => {
    expect(
      createUndoHistoryTruth(
        createUndoBoundaryTruth(null, 'undo'),
        createUndoBoundaryTruth(null, 'redo')
      )
    ).toEqual({
      status: 'idle',
      boundary: null,
      label: 'History idle',
      currentState: 'No undo boundary is available right now.',
      nextStep: 'Edit the arrangement to create the next undo boundary.',
      tooltip:
        'No undo boundary is available right now. Edit the arrangement to create the next undo boundary.',
    });
  });

  it('surfaces the redo boundary when it is the next restorable history step', () => {
    const historyTruth = createUndoHistoryTruth(
      createUndoBoundaryTruth(null, 'undo'),
      createUndoBoundaryTruth(
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
        'redo',
        'Split block'
      )
    );

    expect(historyTruth).toEqual({
      status: 'available',
      boundary: 'redo',
      label: 'Redo: Split block',
      currentState: 'Redo is ready to restore the arrangement captured after Split block.',
      nextStep: 'Use Redo to restore the arrangement captured after Split block.',
      tooltip:
        'Redo is ready to restore the arrangement captured after Split block. Use Redo to restore the arrangement captured after Split block.',
    });
  });

  it('surfaces both undo and redo boundary truth when both stack edges are still restorable', () => {
    const historyTruth = createUndoHistoryTruth(
      createUndoBoundaryTruth(
        {
          undoSnapshot: JSON.stringify({
            stems: [{ id: 'undo-stem' }],
            sections: [],
            blocks: [],
            chords: [],
          }),
          redoSnapshot: JSON.stringify({
            stems: [{ id: 'undo-redo-stem' }],
            sections: [],
            blocks: [],
            chords: [],
          }),
        },
        'undo',
        'Split block'
      ),
      createUndoBoundaryTruth(
        {
          undoSnapshot: JSON.stringify({
            stems: [{ id: 'redo-undo-stem' }],
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
        'redo',
        'Merge blocks'
      )
    );

    expect(historyTruth).toEqual({
      status: 'available',
      boundary: 'undo',
      label: 'Undo: Split block · Redo: Merge blocks',
      currentState:
        'Undo is ready to restore the arrangement captured before Split block. ' +
        'Redo is ready to restore the arrangement captured after Merge blocks.',
      nextStep:
        'Use Undo to restore the arrangement captured before Split block. ' +
        'Use Redo to restore the arrangement captured after Merge blocks.',
      tooltip:
        'Undo is ready to restore the arrangement captured before Split block. ' +
        'Redo is ready to restore the arrangement captured after Merge blocks. ' +
        'Use Undo to restore the arrangement captured before Split block. ' +
        'Use Redo to restore the arrangement captured after Merge blocks.',
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
