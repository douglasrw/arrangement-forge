import { create } from 'zustand';
import type { Block, InstrumentType, Section, SelectionLevel, Stem } from '@/types';
import { useProjectStore } from './project-store';

export type ChordPaletteReadiness = 'ready' | 'waiting' | 'blocked';

export interface ChordPaletteReadinessTruth {
  readiness: ChordPaletteReadiness;
  badge: string;
  title: string;
  detail: string;
  scopeLabel: string;
  scopeValue: string;
  footer: string;
}

function formatBarRange(startBar: number, endBar: number) {
  return startBar === endBar ? `Bar ${startBar}` : `Bars ${startBar}-${endBar}`;
}

function formatSectionBarRange(section: Section) {
  return formatBarRange(section.startBar, section.startBar + section.barCount - 1);
}

const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  drums: 'Drums',
  bass: 'Bass',
  piano: 'Piano',
  guitar: 'Guitar',
  strings: 'Strings',
};

function formatInstrumentLabel(stem?: Stem) {
  if (!stem) return 'Selected';
  return INSTRUMENT_LABELS[stem.instrument];
}

function getMissingSelectionTruth(chordCount: number): ChordPaletteReadinessTruth {
  return {
    readiness: 'blocked',
    badge: 'Blocked',
    title: 'Selection missing',
    detail:
      'The current arrangement selection no longer resolves to live data, so this palette cannot safely honor section or block scope right now.',
    scopeLabel: 'Fallback scope',
    scopeValue: 'Whole song',
    footer:
      chordCount > 0
        ? 'Clear the stale selection before relying on narrower edits. Changes here still update the whole-song chart.'
        : 'Clear the stale selection or add chords below to rebuild the whole-song chart truth first.',
  };
}

export function getChordPaletteReadinessTruth({
  selectionLevel,
  sectionId,
  blockId,
  sections,
  blocks,
  stems,
  chordCount,
}: {
  selectionLevel: SelectionLevel;
  sectionId: string | null;
  blockId: string | null;
  sections: Section[];
  blocks: Block[];
  stems: Stem[];
  chordCount: number;
}): ChordPaletteReadinessTruth {
  if (selectionLevel === 'section') {
    const section = sectionId
      ? sections.find((candidate) => candidate.id === sectionId)
      : undefined;

    if (!section) {
      return getMissingSelectionTruth(chordCount);
    }

    return {
      readiness: 'blocked',
      badge: 'Blocked',
      title: 'Section scope unavailable',
      detail: `${section.name} is selected in the arrangement, but this palette still edits the whole-song chord chart today.`,
      scopeLabel: 'Current selection',
      scopeValue: `${section.name} (${formatSectionBarRange(section)})`,
      footer:
        chordCount > 0
          ? 'Changes below still update the whole-song chart instead of a section-only progression.'
          : 'Add chords below to create the whole-song chart this section will inherit.',
    };
  }

  if (selectionLevel === 'block') {
    const block = blockId
      ? blocks.find((candidate) => candidate.id === blockId)
      : undefined;

    if (!block) {
      return getMissingSelectionTruth(chordCount);
    }

    const stem = stems.find((candidate) => candidate.id === block.stemId);

    return {
      readiness: 'blocked',
      badge: 'Blocked',
      title: 'Block scope unavailable',
      detail: `${formatInstrumentLabel(stem)} ${formatBarRange(block.startBar, block.endBar).toLowerCase()} is selected in the arrangement, but this palette still edits the whole-song chord chart today.`,
      scopeLabel: 'Current selection',
      scopeValue: `${formatInstrumentLabel(stem)} block`,
      footer:
        chordCount > 0
          ? 'Changes below still update the whole-song chart for the project.'
          : 'Add chords below to create the whole-song chart this block will inherit.',
    };
  }

  if (chordCount === 0) {
    return {
      readiness: 'waiting',
      badge: 'Waiting',
      title: 'Song chart needed',
      detail: 'No whole-song chord chart is loaded yet, so this palette is waiting for the first chord.',
      scopeLabel: 'Current selection',
      scopeValue: 'Whole song',
      footer: 'Add chords below to create the progression truth the arrangement will follow.',
    };
  }

  return {
    readiness: 'ready',
    badge: 'Ready',
    title: 'Whole-song chart active',
    detail: 'This palette is editing the whole-song chord chart the arrangement inherits today.',
    scopeLabel: 'Current selection',
    scopeValue: 'Whole song',
    footer: 'This palette is ready to add, remove, or replace chords for the full project.',
  };
}

interface SelectionStore {
  level: SelectionLevel;
  sectionId: string | null;
  blockId: string | null;
  stemId: string | null;

  selectSong: () => void;
  selectSection: (sectionId: string) => void;
  selectBlock: (blockId: string, stemId: string) => void;
  clearSelection: () => void;
  selectNextBlock: () => void;
  selectPrevBlock: () => void;
  selectBlockAbove: () => void;
  selectBlockBelow: () => void;
}

export const useSelectionStore = create<SelectionStore>()((set, get) => ({
  level: 'song',
  sectionId: null,
  blockId: null,
  stemId: null,

  selectSong: () => set({ level: 'song', sectionId: null, blockId: null, stemId: null }),

  selectSection: (sectionId) =>
    set({ level: 'section', sectionId, blockId: null, stemId: null }),

  selectBlock: (blockId, stemId) =>
    set({ level: 'block', blockId, stemId, sectionId: null }),

  clearSelection: () => set({ level: 'song', sectionId: null, blockId: null, stemId: null }),

  selectNextBlock: () => {
    const { blockId, stemId } = get();
    if (!blockId || !stemId) return;
    const blocks = useProjectStore
      .getState()
      .getBlocksForStem(stemId)
      .sort((a, b) => a.startBar - b.startBar);
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx !== -1 && idx < blocks.length - 1) {
      set({ blockId: blocks[idx + 1].id });
    }
  },

  selectPrevBlock: () => {
    const { blockId, stemId } = get();
    if (!blockId || !stemId) return;
    const { useProjectStore } = require('./project-store') as typeof import('./project-store');
    const blocks = useProjectStore
      .getState()
      .getBlocksForStem(stemId)
      .sort((a, b) => a.startBar - b.startBar);
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx > 0) {
      set({ blockId: blocks[idx - 1].id });
    }
  },

  selectBlockAbove: () => {
    const { blockId, stemId } = get();
    if (!blockId || !stemId) return;
    const { useProjectStore } = require('./project-store') as typeof import('./project-store');
    const { blocks, stems } = useProjectStore.getState();
    const currentBlock = blocks.find((b) => b.id === blockId);
    if (!currentBlock) return;
    const sortedStems = [...stems].sort((a, b) => a.sortOrder - b.sortOrder);
    const stemIdx = sortedStems.findIndex((s) => s.id === stemId);
    if (stemIdx <= 0) return;
    const aboveStemId = sortedStems[stemIdx - 1].id;
    const aboveBlocks = blocks.filter((b) => b.stemId === aboveStemId);
    const target = aboveBlocks.find(
      (b) => b.startBar <= currentBlock.startBar && b.endBar >= currentBlock.startBar
    );
    if (target) set({ blockId: target.id, stemId: aboveStemId });
  },

  selectBlockBelow: () => {
    const { blockId, stemId } = get();
    if (!blockId || !stemId) return;
    const { useProjectStore } = require('./project-store') as typeof import('./project-store');
    const { blocks, stems } = useProjectStore.getState();
    const currentBlock = blocks.find((b) => b.id === blockId);
    if (!currentBlock) return;
    const sortedStems = [...stems].sort((a, b) => a.sortOrder - b.sortOrder);
    const stemIdx = sortedStems.findIndex((s) => s.id === stemId);
    if (stemIdx === -1 || stemIdx >= sortedStems.length - 1) return;
    const belowStemId = sortedStems[stemIdx + 1].id;
    const belowBlocks = blocks.filter((b) => b.stemId === belowStemId);
    const target = belowBlocks.find(
      (b) => b.startBar <= currentBlock.startBar && b.endBar >= currentBlock.startBar
    );
    if (target) set({ blockId: target.id, stemId: belowStemId });
  },
}));
