import { create } from 'zustand';
import type { Project, Stem, Section, Block, Chord, AiChatMessage } from '@/types';
import { useUndoStore } from './undo-store';
import { useUiStore } from './ui-store';
import { useSelectionStore } from './selection-store';
import { snapshotArrangement } from '@/lib/undo-helpers';

const genId = () => crypto.randomUUID();

interface ProjectStore {
  project: Project | null;
  stems: Stem[];
  sections: Section[];
  blocks: Block[];
  chords: Chord[];
  chatMessages: AiChatMessage[];
  /** Flag set by regenerateDrumsOnly(), read and cleared by useAudio */
  drumOnlyUpdate: boolean;
  /** Flag set by setAllInstrumentBlocks(), read and cleared by useAudio */
  allInstrumentsUpdate: boolean;

  setProject: (project: Project) => void;
  updateProject: (partial: Partial<Project>) => void;
  setArrangement: (data: {
    stems: Stem[];
    sections: Section[];
    blocks: Block[];
    chords: Chord[];
  }) => void;
  /** Set arrangement with drum-only update flag for hot-swap path */
  setDrumBlocks: (updatedBlocks: Block[]) => void;
  clearDrumOnlyUpdate: () => void;
  /** Set arrangement blocks with all-instruments update flag for per-instrument hot-swap */
  setAllInstrumentBlocks: (updatedBlocks: Block[]) => void;
  clearAllInstrumentsUpdate: () => void;
  clearArrangement: () => void;

  updateStem: (stemId: string, partial: Partial<Stem>) => void;
  addStem: (stem: Stem) => void;
  reorderStems: (stemIds: string[]) => void;

  addSection: (section: Section) => void;
  updateSection: (sectionId: string, partial: Partial<Section>) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (sectionIds: string[]) => void;

  updateBlock: (blockId: string, partial: Partial<Block>) => void;
  splitBlock: (blockId: string, atBar: number) => void;
  mergeBlocks: (blockId1: string, blockId2: string) => void;
  deleteBlock: (blockId: string) => void;
  duplicateBlock: (blockId: string) => void;

  updateChord: (barNumber: number, chord: Partial<Chord>) => void;
  addChatMessage: (message: AiChatMessage) => void;

  getTotalBars: () => number;
  getBlocksForStem: (stemId: string) => Block[];
  getBlocksForSection: (sectionId: string) => Block[];
  getSectionAtBar: (bar: number) => Section | undefined;
}

export const useProjectStore = create<ProjectStore>()((set, get) => ({
  project: null,
  stems: [],
  sections: [],
  blocks: [],
  chords: [],
  chatMessages: [],
  drumOnlyUpdate: false,
  allInstrumentsUpdate: false,

  setProject: (project) => set({ project }),

  updateProject: (partial) => {
    set((state) => ({ project: state.project ? { ...state.project, ...partial } : null }));
    useUiStore.getState().markDirty();
  },

  setArrangement: ({ stems, sections, blocks, chords }) =>
    set({ stems, sections, blocks, chords }),

  setDrumBlocks: (updatedBlocks) =>
    set({ blocks: updatedBlocks, drumOnlyUpdate: true }),

  clearDrumOnlyUpdate: () => set({ drumOnlyUpdate: false }),

  setAllInstrumentBlocks: (updatedBlocks) =>
    set({ blocks: updatedBlocks, allInstrumentsUpdate: true }),

  clearAllInstrumentsUpdate: () => set({ allInstrumentsUpdate: false }),

  clearArrangement: () => set({ stems: [], sections: [], blocks: [], chords: [] }),

  updateStem: (stemId, partial) => {
    set((state) => ({
      stems: state.stems.map((s) => (s.id === stemId ? { ...s, ...partial } : s)),
    }));
    useUiStore.getState().markDirty();
  },

  addStem: (stem) => {
    set((state) => ({ stems: [...state.stems, stem] }));
    useUiStore.getState().markDirty();
  },

  reorderStems: (stemIds) => {
    set((state) => ({
      stems: stemIds
        .map((id, i) => {
          const stem = state.stems.find((s) => s.id === id);
          return stem ? { ...stem, sortOrder: i } : null;
        })
        .filter(Boolean) as Stem[],
    }));
    useUiStore.getState().markDirty();
  },

  addSection: (section) => {
    const before = snapshotArrangement(get());
    set((state) => ({ sections: [...state.sections, section] }));
    const after = snapshotArrangement(get());
    useUndoStore.getState().pushUndo(`Add section: ${section.name}`, before, after);
    useUiStore.getState().markDirty();
  },

  updateSection: (sectionId, partial) => {
    const before = snapshotArrangement(get());
    set((state) => ({
      sections: state.sections.map((s) => (s.id === sectionId ? { ...s, ...partial } : s)),
    }));
    const after = snapshotArrangement(get());
    useUndoStore.getState().pushUndo('Update section', before, after);
    useUiStore.getState().markDirty();
  },

  removeSection: (sectionId) => {
    const before = snapshotArrangement(get());
    // Defense-in-depth: clear selection if it points at the deleted section
    const sel = useSelectionStore.getState();
    if (sel.sectionId === sectionId) sel.selectSong();
    set((state) => ({
      sections: state.sections.filter((s) => s.id !== sectionId),
      blocks: state.blocks.filter((b) => b.sectionId !== sectionId),
    }));
    const after = snapshotArrangement(get());
    useUndoStore.getState().pushUndo('Remove section', before, after);
    useUiStore.getState().markDirty();
  },

  reorderSections: (sectionIds) => {
    const before = snapshotArrangement(get());
    set((state) => ({
      sections: sectionIds
        .map((id, i) => {
          const sec = state.sections.find((s) => s.id === id);
          return sec ? { ...sec, sortOrder: i } : null;
        })
        .filter(Boolean) as Section[],
    }));
    const after = snapshotArrangement(get());
    useUndoStore.getState().pushUndo('Reorder sections', before, after);
    useUiStore.getState().markDirty();
  },

  updateBlock: (blockId, partial) => {
    const before = snapshotArrangement(get());
    set((state) => ({
      blocks: state.blocks.map((b) => (b.id === blockId ? { ...b, ...partial } : b)),
    }));
    const after = snapshotArrangement(get());
    useUndoStore.getState().pushUndo('Update block', before, after);
    useUiStore.getState().markDirty();
  },

  splitBlock: (blockId, atBar) => {
    const { blocks } = get();
    const original = blocks.find((b) => b.id === blockId);
    if (!original) return;
    if (atBar <= original.startBar || atBar > original.endBar) return;

    const before = snapshotArrangement(get());
    const block1: Block = { ...original, endBar: atBar - 1 };
    const block2: Block = { ...original, id: genId(), startBar: atBar };
    const newBlocks = blocks.map((b) => (b.id === blockId ? block1 : b)).concat(block2);
    set({ blocks: newBlocks });
    const after = snapshotArrangement(get());
    useUndoStore.getState().pushUndo(`Split block at bar ${atBar}`, before, after);
    useUiStore.getState().markDirty();
  },

  mergeBlocks: (blockId1, blockId2) => {
    const { blocks } = get();
    const b1 = blocks.find((b) => b.id === blockId1);
    const b2 = blocks.find((b) => b.id === blockId2);
    if (!b1 || !b2) return;
    if (b1.stemId !== b2.stemId || b1.sectionId !== b2.sectionId) return;
    if (b1.endBar + 1 !== b2.startBar) return;

    const before = snapshotArrangement(get());
    const merged: Block = { ...b1, endBar: b2.endBar };
    const newBlocks = blocks.filter((b) => b.id !== blockId1 && b.id !== blockId2).concat(merged);
    set({ blocks: newBlocks });
    const after = snapshotArrangement(get());
    useUndoStore.getState().pushUndo(`Merge blocks (bars ${b1.startBar}-${b2.endBar})`, before, after);
    useUiStore.getState().markDirty();
  },

  deleteBlock: (blockId) => {
    const before = snapshotArrangement(get());
    const newBlocks = get().blocks.filter((b) => b.id !== blockId);
    set({ blocks: newBlocks });
    const after = snapshotArrangement(get());
    useUndoStore.getState().pushUndo('Delete block', before, after);
    useUiStore.getState().markDirty();
  },

  duplicateBlock: (blockId) => {
    const { blocks } = get();
    const original = blocks.find((b) => b.id === blockId);
    if (!original) return;
    const before = snapshotArrangement(get());
    const copy: Block = { ...original, id: genId() };
    set({ blocks: [...blocks, copy] });
    const after = snapshotArrangement(get());
    useUndoStore.getState().pushUndo('Duplicate block', before, after);
    useUiStore.getState().markDirty();
  },

  updateChord: (barNumber, chord) => {
    const before = snapshotArrangement(get());
    set((state) => ({
      chords: state.chords.map((c) => (c.barNumber === barNumber ? { ...c, ...chord } : c)),
    }));
    const after = snapshotArrangement(get());
    useUndoStore.getState().pushUndo(`Update chord at bar ${barNumber}`, before, after);
    useUiStore.getState().markDirty();
  },

  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),

  getTotalBars: () => get().sections.reduce((sum, s) => sum + s.barCount, 0),

  getBlocksForStem: (stemId) => get().blocks.filter((b) => b.stemId === stemId),

  getBlocksForSection: (sectionId) => get().blocks.filter((b) => b.sectionId === sectionId),

  getSectionAtBar: (bar) =>
    get().sections.find((s) => s.startBar <= bar && bar < s.startBar + s.barCount),
}));
