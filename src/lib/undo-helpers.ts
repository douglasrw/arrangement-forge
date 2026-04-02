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
  tooltip: string;
  transition: UndoBoundaryTransition | null;
}

export interface UndoHistoryTruth {
  status: 'waiting' | 'available' | 'blocked' | 'paused';
  boundary: UndoBoundary | null;
  selectedBoundary: UndoBoundary;
  selectedStatus: UndoBoundaryStatus;
  selectionSource: 'default' | 'stack';
  defaultBoundary: UndoBoundary;
  undoBoundaryTruth: UndoBoundaryTruth;
  redoBoundaryTruth: UndoBoundaryTruth;
  activeBoundaryTruth: UndoBoundaryTruth | null;
  companionBoundaryTruth: UndoBoundaryTruth | null;
  label: string;
  currentState: string;
  nextStep: string;
  tooltip: string;
}

interface UndoBoundaryTruthOptions {
  hiddenRestorableBoundaryCount?: number;
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

export function countRestorableUndoBoundaries(
  entries: UndoBoundaryEntry[],
  boundary: UndoBoundary
): number {
  return entries.reduce((count, entry) => {
    return parseUndoBoundarySnapshot(entry, boundary) ? count + 1 : count;
  }, 0);
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

function formatUndoBoundaryStatusLabel(
  action: 'Undo' | 'Redo',
  status: 'blocked' | 'paused',
  description: string | null
): string {
  return description ? `${action} ${status}: ${description}` : `${action} ${status}`;
}

function formatReadyUndoBoundaryStatusLabel(
  action: 'Undo' | 'Redo',
  description: string | null
): string {
  return description ? `${action} ready: ${description}` : `${action} ready`;
}

function formatWaitingUndoBoundaryStatusLabel(action: 'Undo' | 'Redo'): string {
  return `${action} waiting`;
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

function formatTrappedUndoHistoryCurrentState(
  boundary: UndoBoundary,
  hiddenRestorableBoundaryCount: number
): string {
  const noun = hiddenRestorableBoundaryCount === 1 ? 'boundary is' : 'boundaries are';
  const pronoun = hiddenRestorableBoundaryCount === 1 ? 'it' : 'they';
  const quantity =
    hiddenRestorableBoundaryCount === 1
      ? 'One older'
      : `${hiddenRestorableBoundaryCount} older`;

  return (
    `${quantity} ${boundary} ${noun} still preserved behind this blocked step, ` +
    `but ${pronoun} cannot be reached until the latest boundary is repaired or removed.`
  );
}

function formatTrappedUndoHistoryNextStep(boundary: UndoBoundary): string {
  return (
    `Repair or remove the latest ${boundary} boundary before trying to reach ` +
    `the older ${boundary} history still preserved behind it.`
  );
}

function createPausedUndoBoundaryTruth(boundaryTruth: UndoBoundaryTruth): UndoBoundaryTruth {
  const action = getUndoBoundaryActionLabel(boundaryTruth.boundary);
  const captureTarget = getUndoBoundaryCaptureTarget(
    boundaryTruth.boundary,
    boundaryTruth.description
  );

  const pausedBoundaryTruth: UndoBoundaryTruth = {
    ...boundaryTruth,
    status: 'paused',
    actionLabel: null,
    statusLabel: formatUndoBoundaryStatusLabel(
      action,
      'paused',
      boundaryTruth.description
    ),
    currentState:
      `Generation is still running, so ${action} is temporarily paused ` +
      `even though the arrangement captured ${captureTarget} is still preserved on the stack.`,
    nextStep:
      `Wait for generation to finish, then use ${action} to restore the arrangement captured ${captureTarget}.`,
    tooltip: boundaryTruth.tooltip,
  };

  return {
    ...pausedBoundaryTruth,
    tooltip: formatUndoBoundaryTooltip(pausedBoundaryTruth),
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
  if (undoBoundary.status === 'available') return undoBoundary;
  if (redoBoundary.status === 'available') return redoBoundary;
  if (undoBoundary.status === 'paused') return undoBoundary;
  if (redoBoundary.status === 'paused') return redoBoundary;
  if (undoBoundary.status === 'blocked') return undoBoundary;
  if (redoBoundary.status === 'blocked') return redoBoundary;
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
  description: string | null = null,
  options: UndoBoundaryTruthOptions = {}
): UndoBoundaryTruth {
  const action = getUndoBoundaryActionLabel(boundary);
  const normalizedDescription = description?.trim() || null;

  if (!entry) {
    const emptyBoundaryTruth: UndoBoundaryTruth = {
      boundary,
      status: 'empty',
      description: normalizedDescription,
      actionLabel: null,
      statusLabel: formatWaitingUndoBoundaryStatusLabel(action),
      currentState:
        boundary === 'undo'
          ? 'Undo is waiting for the first restorable arrangement change.'
          : 'Redo is waiting for an undo step before it can reopen.',
      nextStep:
        boundary === 'undo'
          ? 'Edit the arrangement to create the next undo boundary.'
          : 'Undo a change to create the next redo boundary.',
      tooltip: '',
      transition: null,
    };

    return {
      ...emptyBoundaryTruth,
      tooltip: formatUndoBoundaryTooltip(emptyBoundaryTruth),
    };
  }

  const transition = createUndoBoundaryTransition(entry, boundary);
  if (!transition.restoreSnapshot) {
    const captureTarget = getUndoBoundaryCaptureTarget(boundary, normalizedDescription);
    const hiddenRestorableBoundaryCount = options.hiddenRestorableBoundaryCount ?? 0;
    const trappedHistoryCurrentState =
      hiddenRestorableBoundaryCount > 0
        ? ` ${formatTrappedUndoHistoryCurrentState(boundary, hiddenRestorableBoundaryCount)}`
        : '';
    const trappedHistoryNextStep =
      hiddenRestorableBoundaryCount > 0
        ? ` ${formatTrappedUndoHistoryNextStep(boundary)}`
        : '';

    const blockedBoundaryTruth: UndoBoundaryTruth = {
      boundary,
      status: 'blocked',
      description: normalizedDescription,
      actionLabel: null,
      statusLabel: formatUndoBoundaryStatusLabel(action, 'blocked', normalizedDescription),
      currentState:
        `The latest ${boundary} boundary is still on the stack, but the arrangement captured ` +
        `${captureTarget} cannot be read.${trappedHistoryCurrentState}`,
      nextStep:
        `Do not offer ${action} for the arrangement captured ${captureTarget} until a valid ` +
        `restore snapshot is stored.${trappedHistoryNextStep}`,
      tooltip: '',
      transition,
    };

    return {
      ...blockedBoundaryTruth,
      tooltip: formatUndoBoundaryTooltip(blockedBoundaryTruth),
    };
  }

  const actionTarget = getUndoBoundaryActionTarget(normalizedDescription);
  const actionLabel = normalizedDescription ? `${action}: ${normalizedDescription}` : action;

  const availableBoundaryTruth: UndoBoundaryTruth = {
    boundary,
    status: 'available',
    description: normalizedDescription,
    actionLabel,
    statusLabel: formatReadyUndoBoundaryStatusLabel(action, normalizedDescription),
    currentState:
      boundary === 'undo'
        ? `Undo is ready to restore the arrangement captured before ${actionTarget}.`
        : `Redo is ready to restore the arrangement captured after ${actionTarget}.`,
    nextStep:
      boundary === 'undo'
        ? `Use Undo to restore the arrangement captured before ${actionTarget}.`
        : `Use Redo to restore the arrangement captured after ${actionTarget}.`,
    tooltip: '',
    transition,
  };

  return {
    ...availableBoundaryTruth,
    tooltip: formatUndoBoundaryTooltip(availableBoundaryTruth),
  };
}

export function createUndoHistoryTruth(
  undoBoundary: UndoBoundaryTruth,
  redoBoundary: UndoBoundaryTruth
): UndoHistoryTruth {
  const activeBoundary = selectUndoHistoryBoundaryTruth(undoBoundary, redoBoundary);
  if (!activeBoundary) {
    const currentState =
      'Undo is waiting for the first restorable arrangement change, and Redo is waiting for an undo step before it can reopen.';
    const nextStep =
      'Edit the arrangement to create the next undo boundary. After you undo a change, redo will become available for that boundary.';

    return {
      status: 'waiting',
      boundary: null,
      selectedBoundary: 'undo',
      selectedStatus: 'empty',
      selectionSource: 'default',
      defaultBoundary: 'undo',
      undoBoundaryTruth: undoBoundary,
      redoBoundaryTruth: redoBoundary,
      activeBoundaryTruth: null,
      companionBoundaryTruth: null,
      label: 'Undo waiting · Redo waiting',
      currentState,
      nextStep,
      tooltip: `${currentState} ${nextStep}`.trim(),
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
    selectedBoundary: activeBoundary.boundary,
    selectedStatus: activeBoundary.status,
    selectionSource: 'stack',
    defaultBoundary: 'undo',
    undoBoundaryTruth: undoBoundary,
    redoBoundaryTruth: redoBoundary,
    activeBoundaryTruth: activeBoundary,
    companionBoundaryTruth: companionBoundary,
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
