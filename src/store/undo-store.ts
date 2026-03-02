import { create } from 'zustand';

export interface UndoEntry {
  description: string;
  stateBefore: string; // JSON snapshot
  stateAfter: string; // JSON snapshot
}

interface UndoStore {
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  maxUndo: number;

  pushUndo: (description: string, before: string, after: string) => void;
  undo: () => UndoEntry | null;
  redo: () => UndoEntry | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getUndoDescription: () => string | null;
  getRedoDescription: () => string | null;
}

export const useUndoStore = create<UndoStore>()((set, get) => ({
  undoStack: [],
  redoStack: [],
  maxUndo: 50,

  pushUndo: (description, before, after) => {
    set((state) => {
      const stack = [...state.undoStack, { description, stateBefore: before, stateAfter: after }];
      return {
        undoStack: stack.length > state.maxUndo ? stack.slice(stack.length - state.maxUndo) : stack,
        redoStack: [],
      };
    });
  },

  undo: () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return null;
    const entry = undoStack[undoStack.length - 1];
    set({ undoStack: undoStack.slice(0, -1), redoStack: [...redoStack, entry] });
    return entry;
  },

  redo: () => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return null;
    const entry = redoStack[redoStack.length - 1];
    set({ redoStack: redoStack.slice(0, -1), undoStack: [...undoStack, entry] });
    return entry;
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  getUndoDescription: () => {
    const stack = get().undoStack;
    return stack.length > 0 ? `Undo: ${stack[stack.length - 1].description}` : null;
  },

  getRedoDescription: () => {
    const stack = get().redoStack;
    return stack.length > 0 ? `Redo: ${stack[stack.length - 1].description}` : null;
  },
}));
