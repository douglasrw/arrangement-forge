import { create } from 'zustand';
import {
  createUndoBoundaryTruth,
  createUndoBoundaryExecutionTruth,
  createUndoBoundaryEntry,
  createUndoHistoryTruth,
  type UndoBoundaryTruth,
  type UndoBoundaryEntry,
  type UndoHistoryTruth,
  type UndoBoundarySnapshots,
  type UndoBoundaryTransition,
} from '@/lib/undo-helpers';
import type { GenerationState } from '@/types';

export interface UndoEntry extends UndoBoundaryEntry {
  description: string;
}

export interface UndoTransition extends UndoEntry, UndoBoundaryTransition {}

interface UndoStore {
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  maxUndo: number;

  pushUndo: (description: string, snapshots: UndoBoundarySnapshots) => void;
  undo: (generationState?: GenerationState) => UndoTransition | null;
  redo: (generationState?: GenerationState) => UndoTransition | null;
  getUndoBoundaryTruth: (generationState?: GenerationState) => UndoBoundaryTruth;
  getRedoBoundaryTruth: (generationState?: GenerationState) => UndoBoundaryTruth;
  getHistoryTruth: (generationState?: GenerationState) => UndoHistoryTruth;
  canUndo: (generationState?: GenerationState) => boolean;
  canRedo: (generationState?: GenerationState) => boolean;
  getUndoDescription: (generationState?: GenerationState) => string | null;
  getRedoDescription: (generationState?: GenerationState) => string | null;
}

function getUndoBoundaryTruthForEntry(
  entry: UndoEntry | undefined,
  generationState?: GenerationState
): UndoBoundaryTruth {
  return createUndoBoundaryExecutionTruth(
    createUndoBoundaryTruth(entry ?? null, 'undo', entry?.description ?? null),
    generationState
  );
}

function getRedoBoundaryTruthForEntry(
  entry: UndoEntry | undefined,
  generationState?: GenerationState
): UndoBoundaryTruth {
  return createUndoBoundaryExecutionTruth(
    createUndoBoundaryTruth(entry ?? null, 'redo', entry?.description ?? null),
    generationState
  );
}

function getHistoryTruthForEntries(
  undoEntry: UndoEntry | undefined,
  redoEntry: UndoEntry | undefined,
  generationState?: GenerationState
): UndoHistoryTruth {
  return createUndoHistoryTruth(
    getUndoBoundaryTruthForEntry(undoEntry, generationState),
    getRedoBoundaryTruthForEntry(redoEntry, generationState)
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

  undo: (generationState) => {
    const { undoStack, redoStack } = get();
    const entry = undoStack[undoStack.length - 1];
    const truth = getUndoBoundaryTruthForEntry(entry, generationState);
    if (!entry || truth.status !== 'available' || !truth.transition) return null;
    set({ undoStack: undoStack.slice(0, -1), redoStack: [...redoStack, entry] });
    return {
      description: entry.description,
      ...truth.transition,
    };
  },

  redo: (generationState) => {
    const { undoStack, redoStack } = get();
    const entry = redoStack[redoStack.length - 1];
    const truth = getRedoBoundaryTruthForEntry(entry, generationState);
    if (!entry || truth.status !== 'available' || !truth.transition) return null;
    set({ redoStack: redoStack.slice(0, -1), undoStack: [...undoStack, entry] });
    return {
      description: entry.description,
      ...truth.transition,
    };
  },

  getUndoBoundaryTruth: (generationState) => {
    const stack = get().undoStack;
    return getUndoBoundaryTruthForEntry(stack[stack.length - 1], generationState);
  },

  getRedoBoundaryTruth: (generationState) => {
    const stack = get().redoStack;
    return getRedoBoundaryTruthForEntry(stack[stack.length - 1], generationState);
  },

  getHistoryTruth: (generationState) => {
    const { undoStack, redoStack } = get();
    return getHistoryTruthForEntries(
      undoStack[undoStack.length - 1],
      redoStack[redoStack.length - 1],
      generationState
    );
  },

  canUndo: (generationState) => {
    return get().getUndoBoundaryTruth(generationState).status === 'available';
  },
  canRedo: (generationState) => {
    return get().getRedoBoundaryTruth(generationState).status === 'available';
  },

  getUndoDescription: (generationState) => get().getUndoBoundaryTruth(generationState).actionLabel,

  getRedoDescription: (generationState) => get().getRedoBoundaryTruth(generationState).actionLabel,
}));
