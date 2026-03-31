import { describe, it, expect, beforeEach } from 'vitest';
import { useUndoStore } from './undo-store';

function makeSnapshot(label: string) {
  return JSON.stringify({
    stems: [{ id: `st-${label}` }],
    sections: [],
    blocks: [],
    chords: [],
  });
}

beforeEach(() => {
  useUndoStore.setState({ undoStack: [], redoStack: [] });
});

describe('undoStore', () => {
  it('pushUndo adds an entry to the undo stack', () => {
    useUndoStore.getState().pushUndo('Test action', { undo: '{}', redo: '{"a":1}' });
    expect(useUndoStore.getState().undoStack).toHaveLength(1);
    expect(useUndoStore.getState().undoStack[0]).toMatchObject({
      description: 'Test action',
      undoSnapshot: '{}',
      redoSnapshot: '{"a":1}',
    });
  });

  it('pushUndo clears the redo stack', () => {
    useUndoStore.setState({ redoStack: [{ description: 'old', undoSnapshot: '', redoSnapshot: '' }] });
    useUndoStore.getState().pushUndo('New', { undo: 'a', redo: 'b' });
    expect(useUndoStore.getState().redoStack).toHaveLength(0);
  });

  it('undo returns null when stack is empty', () => {
    expect(useUndoStore.getState().undo()).toBeNull();
  });

  it('undo returns the entry and moves it to redo stack', () => {
    const undoSnapshot = makeSnapshot('before');
    const redoSnapshot = makeSnapshot('after');
    useUndoStore.getState().pushUndo('Action', { undo: undoSnapshot, redo: redoSnapshot });
    const transition = useUndoStore.getState().undo();
    expect(transition).toMatchObject({
      boundary: 'undo',
      description: 'Action',
      undoSnapshot,
      redoSnapshot,
    });
    expect(transition?.restoreSnapshot).toMatchObject({
      stems: [{ id: 'st-before' }],
    });
    expect(useUndoStore.getState().undoStack).toHaveLength(0);
    expect(useUndoStore.getState().redoStack).toHaveLength(1);
  });

  it('undo leaves stacks unchanged when the restore snapshot is invalid', () => {
    useUndoStore.getState().pushUndo('Broken action', {
      undo: 'not json',
      redo: makeSnapshot('after'),
    });

    expect(useUndoStore.getState().undo()).toBeNull();
    expect(useUndoStore.getState().undoStack).toHaveLength(1);
    expect(useUndoStore.getState().redoStack).toHaveLength(0);
  });

  it('redo returns null when redo stack is empty', () => {
    expect(useUndoStore.getState().redo()).toBeNull();
  });

  it('redo moves entry back to undo stack', () => {
    const undoSnapshot = makeSnapshot('before');
    const redoSnapshot = makeSnapshot('after');
    useUndoStore.getState().pushUndo('Action', { undo: undoSnapshot, redo: redoSnapshot });
    useUndoStore.getState().undo();
    const transition = useUndoStore.getState().redo();
    expect(transition).toMatchObject({
      boundary: 'redo',
      description: 'Action',
      undoSnapshot,
      redoSnapshot,
    });
    expect(transition?.restoreSnapshot).toMatchObject({
      stems: [{ id: 'st-after' }],
    });
    expect(useUndoStore.getState().undoStack).toHaveLength(1);
    expect(useUndoStore.getState().redoStack).toHaveLength(0);
  });

  it('redo leaves stacks unchanged when the restore snapshot is invalid', () => {
    useUndoStore.getState().pushUndo('Broken redo', {
      undo: makeSnapshot('before'),
      redo: 'not json',
    });

    expect(useUndoStore.getState().undo()).not.toBeNull();
    expect(useUndoStore.getState().undoStack).toHaveLength(0);
    expect(useUndoStore.getState().redoStack).toHaveLength(1);

    expect(useUndoStore.getState().redo()).toBeNull();
    expect(useUndoStore.getState().undoStack).toHaveLength(0);
    expect(useUndoStore.getState().redoStack).toHaveLength(1);
  });

  it('canUndo and canRedo reflect stack state', () => {
    expect(useUndoStore.getState().canUndo()).toBe(false);
    useUndoStore.getState().pushUndo('A', {
      undo: makeSnapshot('before'),
      redo: makeSnapshot('after'),
    });
    expect(useUndoStore.getState().canUndo()).toBe(true);
    useUndoStore.getState().undo();
    expect(useUndoStore.getState().canRedo()).toBe(true);
  });

  it('describes the current undo boundary with explicit status, state, and next step', () => {
    useUndoStore.getState().pushUndo('Split block', {
      undo: makeSnapshot('before'),
      redo: makeSnapshot('after'),
    });

    expect(useUndoStore.getState().getUndoBoundaryTruth()).toMatchObject({
      boundary: 'undo',
      status: 'available',
      actionLabel: 'Undo: Split block',
      statusLabel: 'Undo ready: Split block',
      currentState: 'Undo is ready to restore the arrangement captured before Split block.',
      nextStep: 'Use Undo to restore the arrangement captured before Split block.',
      tooltip:
        'Undo is ready to restore the arrangement captured before Split block. ' +
        'Use Undo to restore the arrangement captured before Split block.',
    });
  });

  it('marks an available undo boundary as paused while generation is running', () => {
    useUndoStore.getState().pushUndo('Split block', {
      undo: makeSnapshot('before'),
      redo: makeSnapshot('after'),
    });

    expect(useUndoStore.getState().canUndo('generating')).toBe(false);
    expect(useUndoStore.getState().getUndoBoundaryTruth('generating')).toMatchObject({
      boundary: 'undo',
      status: 'paused',
      actionLabel: null,
      statusLabel: 'Undo paused: Split block',
      currentState:
        'Generation is still running, so Undo is temporarily paused even though the arrangement captured before Split block is still preserved on the stack.',
      nextStep:
        'Wait for generation to finish, then use Undo to restore the arrangement captured before Split block.',
    });
    expect(useUndoStore.getState().getHistoryTruth('generating')).toMatchObject({
      status: 'paused',
      boundary: 'undo',
      label: 'Undo paused: Split block',
    });
  });

  it('leaves the undo stack unchanged while generation keeps the boundary paused', () => {
    useUndoStore.getState().pushUndo('Split block', {
      undo: makeSnapshot('before'),
      redo: makeSnapshot('after'),
    });

    expect(useUndoStore.getState().undo('generating')).toBeNull();
    expect(useUndoStore.getState().undoStack).toHaveLength(1);
    expect(useUndoStore.getState().redoStack).toHaveLength(0);
  });

  it('does not advertise undo when the top undo boundary is not restorable', () => {
    useUndoStore.getState().pushUndo('Broken action', {
      undo: 'not json',
      redo: makeSnapshot('after'),
    });

    expect(useUndoStore.getState().canUndo()).toBe(false);
    expect(useUndoStore.getState().getUndoDescription()).toBeNull();
  });

  it('does not advertise redo when the top redo boundary is not restorable', () => {
    useUndoStore.getState().pushUndo('Broken redo', {
      undo: makeSnapshot('before'),
      redo: 'not json',
    });

    expect(useUndoStore.getState().undo()).not.toBeNull();
    expect(useUndoStore.getState().canRedo()).toBe(false);
    expect(useUndoStore.getState().getRedoDescription()).toBeNull();
  });

  it('describes a blocked redo boundary when the latest redo snapshot cannot be restored', () => {
    useUndoStore.getState().pushUndo('Broken redo', {
      undo: makeSnapshot('before'),
      redo: 'not json',
    });

    expect(useUndoStore.getState().undo()).not.toBeNull();
    expect(useUndoStore.getState().getRedoBoundaryTruth()).toMatchObject({
      boundary: 'redo',
      status: 'blocked',
      actionLabel: null,
      statusLabel: 'Redo blocked: Broken redo',
      currentState:
        'The latest redo boundary is still on the stack, but the arrangement captured after Broken redo cannot be read.',
      nextStep:
        'Do not offer Redo for the arrangement captured after Broken redo until a valid restore snapshot is stored.',
      tooltip:
        'The latest redo boundary is still on the stack, but the arrangement captured after Broken redo cannot be read. ' +
        'Do not offer Redo for the arrangement captured after Broken redo until a valid restore snapshot is stored.',
    });
  });

  it('explains when a blocked undo boundary traps older restorable undo history behind it', () => {
    useUndoStore.getState().pushUndo('Older action', {
      undo: makeSnapshot('older-before'),
      redo: makeSnapshot('older-after'),
    });
    useUndoStore.getState().pushUndo('Broken action', {
      undo: 'not json',
      redo: makeSnapshot('broken-after'),
    });

    expect(useUndoStore.getState().getUndoBoundaryTruth()).toMatchObject({
      boundary: 'undo',
      status: 'blocked',
      statusLabel: 'Undo blocked: Broken action',
      currentState:
        'The latest undo boundary is still on the stack, but the arrangement captured before Broken action cannot be read. ' +
        'One older undo boundary is still preserved behind this blocked step, but it cannot be reached until the latest boundary is repaired or removed.',
      nextStep:
        'Do not offer Undo for the arrangement captured before Broken action until a valid restore snapshot is stored. ' +
        'Repair or remove the latest undo boundary before trying to reach the older undo history still preserved behind it.',
    });
  });

  it('surfaces redo as the next history truth after undo consumes the undo boundary', () => {
    useUndoStore.getState().pushUndo('Split block', {
      undo: makeSnapshot('before'),
      redo: makeSnapshot('after'),
    });

    expect(useUndoStore.getState().undo()).not.toBeNull();
    expect(useUndoStore.getState().getHistoryTruth()).toMatchObject({
      status: 'available',
      boundary: 'redo',
      label: 'Redo ready: Split block',
      currentState: 'Redo is ready to restore the arrangement captured after Split block.',
      nextStep: 'Use Redo to restore the arrangement captured after Split block.',
    });
  });

  it('surfaces both undo and redo history truth when both stack edges remain available', () => {
    useUndoStore.getState().pushUndo('Split block', {
      undo: makeSnapshot('split-before'),
      redo: makeSnapshot('split-after'),
    });
    useUndoStore.getState().pushUndo('Merge blocks', {
      undo: makeSnapshot('merge-before'),
      redo: makeSnapshot('merge-after'),
    });

    expect(useUndoStore.getState().undo()).not.toBeNull();
    expect(useUndoStore.getState().getHistoryTruth()).toMatchObject({
      status: 'available',
      boundary: 'undo',
      activeBoundaryTruth: {
        boundary: 'undo',
        status: 'available',
        statusLabel: 'Undo ready: Split block',
      },
      companionBoundaryTruth: {
        boundary: 'redo',
        status: 'available',
        statusLabel: 'Redo ready: Merge blocks',
      },
      label: 'Undo ready: Split block · Redo ready: Merge blocks',
      currentState:
        'Undo is ready to restore the arrangement captured before Split block. ' +
        'Redo is ready to restore the arrangement captured after Merge blocks.',
      nextStep:
        'Use Undo to restore the arrangement captured before Split block. ' +
        'Use Redo to restore the arrangement captured after Merge blocks.',
    });
  });

  it('keeps the actionable undo history truth ahead of a blocked redo companion', () => {
    useUndoStore.getState().pushUndo('Split block', {
      undo: makeSnapshot('split-before'),
      redo: makeSnapshot('split-after'),
    });
    useUndoStore.getState().pushUndo('Broken redo', {
      undo: makeSnapshot('broken-before'),
      redo: 'not json',
    });

    expect(useUndoStore.getState().undo()).not.toBeNull();
    expect(useUndoStore.getState().getHistoryTruth()).toMatchObject({
      status: 'available',
      boundary: 'undo',
      activeBoundaryTruth: {
        boundary: 'undo',
        status: 'available',
        statusLabel: 'Undo ready: Split block',
      },
      companionBoundaryTruth: {
        boundary: 'redo',
        status: 'blocked',
        statusLabel: 'Redo blocked: Broken redo',
      },
      label: 'Undo ready: Split block · Redo blocked: Broken redo',
      currentState:
        'Undo is ready to restore the arrangement captured before Split block. ' +
        'The latest redo boundary is still on the stack, but the arrangement captured after Broken redo cannot be read.',
      nextStep:
        'Use Undo to restore the arrangement captured before Split block. ' +
        'Do not offer Redo for the arrangement captured after Broken redo until a valid restore snapshot is stored.',
    });
  });

  it('leaves the redo stack unchanged while generation keeps the redo boundary paused', () => {
    useUndoStore.getState().pushUndo('Split block', {
      undo: makeSnapshot('before'),
      redo: makeSnapshot('after'),
    });

    expect(useUndoStore.getState().undo()).not.toBeNull();
    expect(useUndoStore.getState().redo('generating')).toBeNull();
    expect(useUndoStore.getState().undoStack).toHaveLength(0);
    expect(useUndoStore.getState().redoStack).toHaveLength(1);
    expect(useUndoStore.getState().getRedoBoundaryTruth('generating')).toMatchObject({
      boundary: 'redo',
      status: 'paused',
      statusLabel: 'Redo paused: Split block',
    });
  });

  it('getUndoDescription returns null when empty', () => {
    expect(useUndoStore.getState().getUndoDescription()).toBeNull();
  });

  it('getUndoDescription returns formatted string', () => {
    useUndoStore.getState().pushUndo('Split block', {
      undo: makeSnapshot('before'),
      redo: makeSnapshot('after'),
    });
    expect(useUndoStore.getState().getUndoDescription()).toBe('Undo: Split block');
  });

  it('limits stack to maxUndo entries', () => {
    const store = useUndoStore.getState();
    for (let i = 0; i < 55; i++) {
      store.pushUndo(`Action ${i}`, { undo: 'a', redo: 'b' });
    }
    expect(useUndoStore.getState().undoStack.length).toBeLessThanOrEqual(50);
  });
});
