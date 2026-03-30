import { create } from 'zustand';
import {
  createUndoBoundaryEntry,
  createUndoBoundaryTransition,
  type UndoBoundaryEntry,
  type UndoBoundarySnapshots,
  type UndoBoundaryTransition,
} from '@/lib/undo-helpers';

export interface UndoEntry extends UndoBoundaryEntry {
  description: string;
}

export interface UndoTransition extends UndoEntry, UndoBoundaryTransition {}

interface UndoStore {
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  maxUndo: number;

  pushUndo: (description: string, snapshots: UndoBoundarySnapshots) => void;
  undo: () => UndoTransition | null;
  redo: () => UndoTransition | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getUndoDescription: () => string | null;
  getRedoDescription: () => string | null;
}

export const useUndoStore = create<UndoStore>()((set, get) => ({
  undoStack: [],
  redoStack: [],
  maxUndo: 50,

  pushUndo: (description, snapshots) => {
    set((state) => {
      const stack = [
        ...state.undoStack,
        { description, ...createUndoBoundaryEntry(snapshots) },
      ];
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
    const transition = createUndoBoundaryTransition(entry, 'undo');
    if (!transition.restoreSnapshot) return null;
    set({ undoStack: undoStack.slice(0, -1), redoStack: [...redoStack, entry] });
    return {
      description: entry.description,
      ...transition,
    };
  },

  redo: () => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return null;
    const entry = redoStack[redoStack.length - 1];
    const transition = createUndoBoundaryTransition(entry, 'redo');
    if (!transition.restoreSnapshot) return null;
    set({ redoStack: redoStack.slice(0, -1), undoStack: [...undoStack, entry] });
    return {
      description: entry.description,
      ...transition,
    };
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
