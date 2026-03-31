import { create } from 'zustand';
import {
  countRestorableUndoBoundaries,
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

function getUndoBoundaryTruthForStack(
  stack: UndoEntry[],
  generationState?: GenerationState
): UndoBoundaryTruth {
  const entry = stack[stack.length - 1];

  return createUndoBoundaryExecutionTruth(
    createUndoBoundaryTruth(entry ?? null, 'undo', entry?.description ?? null, {
      hiddenRestorableBoundaryCount: countRestorableUndoBoundaries(stack.slice(0, -1), 'undo'),
    }),
    generationState
  );
}

function getRedoBoundaryTruthForStack(
  stack: UndoEntry[],
  generationState?: GenerationState
): UndoBoundaryTruth {
  const entry = stack[stack.length - 1];

  return createUndoBoundaryExecutionTruth(
    createUndoBoundaryTruth(entry ?? null, 'redo', entry?.description ?? null, {
      hiddenRestorableBoundaryCount: countRestorableUndoBoundaries(stack.slice(0, -1), 'redo'),
    }),
    generationState
  );
}

function getHistoryTruthForStacks(
  undoStack: UndoEntry[],
  redoStack: UndoEntry[],
  generationState?: GenerationState
): UndoHistoryTruth {
  return createUndoHistoryTruth(
    getUndoBoundaryTruthForStack(undoStack, generationState),
    getRedoBoundaryTruthForStack(redoStack, generationState)
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
    const truth = getUndoBoundaryTruthForStack(undoStack, generationState);
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
    const truth = getRedoBoundaryTruthForStack(redoStack, generationState);
    if (!entry || truth.status !== 'available' || !truth.transition) return null;
    set({ redoStack: redoStack.slice(0, -1), undoStack: [...undoStack, entry] });
    return {
      description: entry.description,
      ...truth.transition,
    };
  },

  getUndoBoundaryTruth: (generationState) => {
    const stack = get().undoStack;
    return getUndoBoundaryTruthForStack(stack, generationState);
  },

  getRedoBoundaryTruth: (generationState) => {
    const stack = get().redoStack;
    return getRedoBoundaryTruthForStack(stack, generationState);
  },

  getHistoryTruth: (generationState) => {
    const { undoStack, redoStack } = get();
    return getHistoryTruthForStacks(undoStack, redoStack, generationState);
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
