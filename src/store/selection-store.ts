import { create } from 'zustand';
import type { SelectionLevel } from '@/types';
import { useProjectStore } from './project-store';

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
