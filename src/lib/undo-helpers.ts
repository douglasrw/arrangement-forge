// undo-helpers.ts — Unified snapshot format for undo/redo.

import type { Stem, Section, Block, Chord } from '@/types';

export interface ArrangementSnapshot {
  stems: Stem[];
  sections: Section[];
  blocks: Block[];
  chords: Chord[];
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
