import { create } from 'zustand';
import {
  createUndoBoundaryTruth,
  createUndoBoundaryEntry,
  createUndoHistoryTruth,
  type UndoBoundaryTruth,
  type UndoBoundaryEntry,
  type UndoHistoryTruth,
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
  getUndoBoundaryTruth: () => UndoBoundaryTruth;
  getRedoBoundaryTruth: () => UndoBoundaryTruth;
  getHistoryTruth: () => UndoHistoryTruth;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getUndoDescription: () => string | null;
  getRedoDescription: () => string | null;
}

function getUndoBoundaryTruthForEntry(entry: UndoEntry | undefined): UndoBoundaryTruth {
  return createUndoBoundaryTruth(entry ?? null, 'undo', entry?.description ?? null);
}

function getRedoBoundaryTruthForEntry(entry: UndoEntry | undefined): UndoBoundaryTruth {
  return createUndoBoundaryTruth(entry ?? null, 'redo', entry?.description ?? null);
}

function getHistoryTruthForEntries(
  undoEntry: UndoEntry | undefined,
  redoEntry: UndoEntry | undefined
): UndoHistoryTruth {
  return createUndoHistoryTruth(
    getUndoBoundaryTruthForEntry(undoEntry),
    getRedoBoundaryTruthForEntry(redoEntry)
  );
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
    const entry = undoStack[undoStack.length - 1];
    const truth = getUndoBoundaryTruthForEntry(entry);
    if (!entry || truth.status !== 'available' || !truth.transition) return null;
    set({ undoStack: undoStack.slice(0, -1), redoStack: [...redoStack, entry] });
    return {
      description: entry.description,
      ...truth.transition,
    };
  },

  redo: () => {
    const { undoStack, redoStack } = get();
    const entry = redoStack[redoStack.length - 1];
    const truth = getRedoBoundaryTruthForEntry(entry);
    if (!entry || truth.status !== 'available' || !truth.transition) return null;
    set({ redoStack: redoStack.slice(0, -1), undoStack: [...undoStack, entry] });
    return {
      description: entry.description,
      ...truth.transition,
    };
  },

  getUndoBoundaryTruth: () => {
    const stack = get().undoStack;
    return getUndoBoundaryTruthForEntry(stack[stack.length - 1]);
  },

  getRedoBoundaryTruth: () => {
    const stack = get().redoStack;
    return getRedoBoundaryTruthForEntry(stack[stack.length - 1]);
  },

  getHistoryTruth: () => {
    const { undoStack, redoStack } = get();
    return getHistoryTruthForEntries(
      undoStack[undoStack.length - 1],
      redoStack[redoStack.length - 1]
    );
  },

  canUndo: () => {
    return get().getUndoBoundaryTruth().status === 'available';
  },
  canRedo: () => {
    return get().getRedoBoundaryTruth().status === 'available';
  },

  getUndoDescription: () => get().getUndoBoundaryTruth().actionLabel,

  getRedoDescription: () => get().getRedoBoundaryTruth().actionLabel,
}));
