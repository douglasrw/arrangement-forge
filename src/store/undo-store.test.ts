import { describe, it, expect, beforeEach } from 'vitest';
import { useUndoStore } from './undo-store';

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
    useUndoStore.getState().pushUndo('Action', { undo: 'before', redo: 'after' });
    const entry = useUndoStore.getState().undo();
    expect(entry?.undoSnapshot).toBe('before');
    expect(useUndoStore.getState().undoStack).toHaveLength(0);
    expect(useUndoStore.getState().redoStack).toHaveLength(1);
  });

  it('redo returns null when redo stack is empty', () => {
    expect(useUndoStore.getState().redo()).toBeNull();
  });

  it('redo moves entry back to undo stack', () => {
    useUndoStore.getState().pushUndo('Action', { undo: 'before', redo: 'after' });
    useUndoStore.getState().undo();
    const entry = useUndoStore.getState().redo();
    expect(entry?.redoSnapshot).toBe('after');
    expect(useUndoStore.getState().undoStack).toHaveLength(1);
    expect(useUndoStore.getState().redoStack).toHaveLength(0);
  });

  it('canUndo and canRedo reflect stack state', () => {
    expect(useUndoStore.getState().canUndo()).toBe(false);
    useUndoStore.getState().pushUndo('A', { undo: 'a', redo: 'b' });
    expect(useUndoStore.getState().canUndo()).toBe(true);
    useUndoStore.getState().undo();
    expect(useUndoStore.getState().canRedo()).toBe(true);
  });

  it('getUndoDescription returns null when empty', () => {
    expect(useUndoStore.getState().getUndoDescription()).toBeNull();
  });

  it('getUndoDescription returns formatted string', () => {
    useUndoStore.getState().pushUndo('Split block', { undo: 'a', redo: 'b' });
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
