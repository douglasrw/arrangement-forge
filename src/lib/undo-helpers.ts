// undo-helpers.ts — Unified snapshot format and boundary helpers for undo/redo.

import type { Stem, Section, Block, Chord } from '@/types';

export interface ArrangementSnapshot {
  stems: Stem[];
  sections: Section[];
  blocks: Block[];
  chords: Chord[];
}

export type UndoBoundary = 'undo' | 'redo';

export interface UndoBoundaryEntry {
  stateBefore: string;
  stateAfter: string;
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
  const snapshot = boundary === 'undo' ? entry.stateBefore : entry.stateAfter;
  return parseSnapshot(snapshot);
}
