// undo-helpers.ts — Unified snapshot format and boundary helpers for undo/redo.

import type { Stem, Section, Block, Chord, GenerationState } from '@/types';

export interface ArrangementSnapshot {
  stems: Stem[];
  sections: Section[];
  blocks: Block[];
  chords: Chord[];
}

export type UndoBoundary = 'undo' | 'redo';

export interface UndoBoundaryEntry {
  undoSnapshot: string;
  redoSnapshot: string;
}

export interface UndoBoundarySnapshots {
  undo: string;
  redo: string;
}

export interface UndoBoundaryTransition extends UndoBoundaryEntry {
  boundary: UndoBoundary;
  restoreSnapshot: ArrangementSnapshot | null;
}

export type UndoBoundaryStatus = 'empty' | 'available' | 'blocked' | 'paused';

export interface UndoBoundaryTruth {
  boundary: UndoBoundary;
  status: UndoBoundaryStatus;
  description: string | null;
  actionLabel: string | null;
  statusLabel: string;
  currentState: string;
  nextStep: string;
  transition: UndoBoundaryTransition | null;
}

export interface UndoHistoryTruth {
  status: 'idle' | 'available' | 'blocked' | 'paused';
  boundary: UndoBoundary | null;
  label: string;
  currentState: string;
  nextStep: string;
  tooltip: string;
}

export function snapshotArrangement(state: {
  stems: Stem[];
  sections: Section[];
  blocks: Block[];
  chords: Chord[];
}): string {
  const snapshot: ArrangementSnapshot = {
    stems: state.stems,
    sections: state.sections,
    blocks: state.blocks,
    chords: state.chords,
  };
  return JSON.stringify(snapshot);
}

export function parseSnapshot(json: string): ArrangementSnapshot | null {
  try {
    const parsed = JSON.parse(json) as ArrangementSnapshot;
    if (
      Array.isArray(parsed.stems) &&
      Array.isArray(parsed.sections) &&
      Array.isArray(parsed.blocks) &&
      Array.isArray(parsed.chords)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function parseUndoBoundarySnapshot(
  entry: UndoBoundaryEntry,
  boundary: UndoBoundary
): ArrangementSnapshot | null {
  const snapshot = boundary === 'undo' ? entry.undoSnapshot : entry.redoSnapshot;
  return parseSnapshot(snapshot);
}

export function createUndoBoundaryTransition(
  entry: UndoBoundaryEntry,
  boundary: UndoBoundary
): UndoBoundaryTransition {
  return {
    ...entry,
    boundary,
    restoreSnapshot: parseUndoBoundarySnapshot(entry, boundary),
  };
}

function getUndoBoundaryActionLabel(boundary: UndoBoundary): 'Undo' | 'Redo' {
  return boundary === 'undo' ? 'Undo' : 'Redo';
}

function getUndoBoundaryActionTarget(description: string | null): string {
  return description?.trim() || 'the last arrangement change';
}

function formatUndoBoundaryTooltip(boundary: UndoBoundaryTruth): string {
  return `${boundary.currentState} ${boundary.nextStep}`.trim();
}

function hasUndoBoundaryTruth(boundary: UndoBoundaryTruth): boolean {
  return boundary.status !== 'empty';
}

function getUndoBoundaryCaptureTarget(
  boundary: UndoBoundary,
  description: string | null
): string {
  const actionTarget = getUndoBoundaryActionTarget(description);

  return boundary === 'undo' ? `before ${actionTarget}` : `after ${actionTarget}`;
}

function createPausedUndoBoundaryTruth(boundaryTruth: UndoBoundaryTruth): UndoBoundaryTruth {
  const action = getUndoBoundaryActionLabel(boundaryTruth.boundary);
  const captureTarget = getUndoBoundaryCaptureTarget(
    boundaryTruth.boundary,
    boundaryTruth.description
  );

  return {
    ...boundaryTruth,
    status: 'paused',
    actionLabel: null,
    statusLabel: `${action} paused`,
    currentState:
      `Generation is still running, so ${action} is temporarily paused ` +
      `even though the arrangement captured ${captureTarget} is still preserved on the stack.`,
    nextStep:
      `Wait for generation to finish, then use ${action} to restore the arrangement captured ${captureTarget}.`,
  };
}

export function createUndoBoundaryExecutionTruth(
  boundaryTruth: UndoBoundaryTruth,
  generationState: GenerationState | null | undefined
): UndoBoundaryTruth {
  if (generationState !== 'generating' || boundaryTruth.status !== 'available') {
    return boundaryTruth;
  }

  return createPausedUndoBoundaryTruth(boundaryTruth);
}

function selectUndoHistoryBoundaryTruth(
  undoBoundary: UndoBoundaryTruth,
  redoBoundary: UndoBoundaryTruth
): UndoBoundaryTruth | null {
  if (undoBoundary.status === 'blocked') return undoBoundary;
  if (redoBoundary.status === 'blocked') return redoBoundary;
  if (undoBoundary.status === 'paused') return undoBoundary;
  if (redoBoundary.status === 'paused') return redoBoundary;
  if (undoBoundary.status === 'available') return undoBoundary;
  if (redoBoundary.status === 'available') return redoBoundary;
  return null;
}

function getCompanionUndoHistoryBoundaryTruth(
  activeBoundary: UndoBoundaryTruth,
  undoBoundary: UndoBoundaryTruth,
  redoBoundary: UndoBoundaryTruth
): UndoBoundaryTruth | null {
  const companionBoundary =
    activeBoundary.boundary === 'undo' ? redoBoundary : undoBoundary;

  return hasUndoBoundaryTruth(companionBoundary) ? companionBoundary : null;
}

export function createUndoBoundaryTruth(
  entry: UndoBoundaryEntry | null | undefined,
  boundary: UndoBoundary,
  description: string | null = null
): UndoBoundaryTruth {
  const action = getUndoBoundaryActionLabel(boundary);
  const normalizedDescription = description?.trim() || null;

  if (!entry) {
    return {
      boundary,
      status: 'empty',
      description: normalizedDescription,
      actionLabel: null,
      statusLabel: boundary === 'undo' ? 'Nothing to undo' : 'Nothing to redo',
      currentState: `No ${boundary} boundary is available right now.`,
      nextStep:
        boundary === 'undo'
          ? 'Edit the arrangement to create the next undo boundary.'
          : 'Undo a change to create the next redo boundary.',
      transition: null,
    };
  }

  const transition = createUndoBoundaryTransition(entry, boundary);
  if (!transition.restoreSnapshot) {
    return {
      boundary,
      status: 'blocked',
      description: normalizedDescription,
      actionLabel: null,
      statusLabel: `${action} blocked`,
      currentState: `The latest ${boundary} boundary is still on the stack, but its restore snapshot cannot be read.`,
      nextStep: `Do not offer ${action} for this boundary until a valid restore snapshot is stored.`,
      transition,
    };
  }

  const actionTarget = getUndoBoundaryActionTarget(normalizedDescription);
  const actionLabel = normalizedDescription ? `${action}: ${normalizedDescription}` : action;

  return {
    boundary,
    status: 'available',
    description: normalizedDescription,
    actionLabel,
    statusLabel: actionLabel,
    currentState:
      boundary === 'undo'
        ? `Undo is ready to restore the arrangement captured before ${actionTarget}.`
        : `Redo is ready to restore the arrangement captured after ${actionTarget}.`,
    nextStep:
      boundary === 'undo'
        ? `Use Undo to restore the arrangement captured before ${actionTarget}.`
        : `Use Redo to restore the arrangement captured after ${actionTarget}.`,
    transition,
  };
}

export function createUndoHistoryTruth(
  undoBoundary: UndoBoundaryTruth,
  redoBoundary: UndoBoundaryTruth
): UndoHistoryTruth {
  const activeBoundary = selectUndoHistoryBoundaryTruth(undoBoundary, redoBoundary);
  if (!activeBoundary) {
    return {
      status: 'idle',
      boundary: null,
      label: 'History idle',
      currentState: undoBoundary.currentState,
      nextStep: undoBoundary.nextStep,
      tooltip: formatUndoBoundaryTooltip(undoBoundary),
    };
  }

  const companionBoundary = getCompanionUndoHistoryBoundaryTruth(
    activeBoundary,
    undoBoundary,
    redoBoundary
  );
  const label = companionBoundary
    ? `${activeBoundary.statusLabel} · ${companionBoundary.statusLabel}`
    : activeBoundary.statusLabel;
  const currentState = companionBoundary
    ? `${activeBoundary.currentState} ${companionBoundary.currentState}`
    : activeBoundary.currentState;
  const nextStep = companionBoundary
    ? `${activeBoundary.nextStep} ${companionBoundary.nextStep}`
    : activeBoundary.nextStep;

  return {
    status: activeBoundary.status,
    boundary: activeBoundary.boundary,
    label,
    currentState,
    nextStep,
    tooltip: `${currentState} ${nextStep}`.trim(),
  };
}

export function createUndoBoundaryEntry(
  snapshots: UndoBoundarySnapshots
): UndoBoundaryEntry {
  return {
    undoSnapshot: snapshots.undo,
    redoSnapshot: snapshots.redo,
  };
}

export function parseUndoSnapshot(entry: UndoBoundaryEntry): ArrangementSnapshot | null {
  return parseUndoBoundarySnapshot(entry, 'undo');
}

export function parseRedoSnapshot(entry: UndoBoundaryEntry): ArrangementSnapshot | null {
  return parseUndoBoundarySnapshot(entry, 'redo');
}
