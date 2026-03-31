import { create } from 'zustand';
import type { Project, Stem, Section, Block, Chord, AiChatMessage } from '@/types';
import { useUndoStore } from './undo-store';
import { useUiStore } from './ui-store';
import { useSelectionStore } from './selection-store';
import { snapshotArrangement } from '@/lib/undo-helpers';
import { generateMidiForBlock } from '@/lib/midi-generator';
import { resolveStyle } from '@/lib/style-cascade';

const genId = () => crypto.randomUUID();
const STEM_PAN_PRECISION = 100;

function normalizeStemPan(pan: number): number {
  if (!Number.isFinite(pan)) {
    return 0;
  }

  const clamped = Math.max(-1, Math.min(1, pan));
  const snapped = Math.round(clamped * STEM_PAN_PRECISION) / STEM_PAN_PRECISION;

  return Object.is(snapped, -0) ? 0 : snapped;
}

function normalizeStem(stem: Stem): Stem {
  return {
    ...stem,
    pan: normalizeStemPan(stem.pan),
  };
}

function normalizeStems(stems: Stem[]): Stem[] {
  return stems.map(normalizeStem);
}

function normalizeStemPartial(partial: Partial<Stem>): Partial<Stem> {
  if (partial.pan === undefined) {
    return partial;
  }

  return {
    ...partial,
    pan: normalizeStemPan(partial.pan),
  };
}

function sortSectionsByTimeline(sections: Section[]): Section[] {
  return [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
}

function reflowSections(sections: Section[]): Section[] {
  const nextById = new Map<string, Section>();
  let startBar = 1;

  for (const section of sortSectionsByTimeline(sections)) {
    const nextSection = { ...section, startBar };
    nextById.set(nextSection.id, nextSection);
    startBar += nextSection.barCount;
  }

  return sections.map((section) => nextById.get(section.id) ?? section);
}

function findSectionForBar(sections: Section[], barNumber: number): Section | undefined {
  return sortSectionsByTimeline(sections).find(
    (section) =>
      barNumber >= section.startBar &&
      barNumber < section.startBar + section.barCount
  );
}

function applySectionUpdate(state: {
  sections: Section[];
  blocks: Block[];
  chords: Chord[];
}, sectionId: string, partial: Partial<Section>) {
  const currentSection = state.sections.find((section) => section.id === sectionId);

  if (!currentSection) {
    return {
      sections: state.sections,
      blocks: state.blocks,
      chords: state.chords,
    };
  }

  const shouldReflowTimeline =
    partial.barCount !== undefined || partial.sortOrder !== undefined;
  const normalizedBarCount =
    partial.barCount === undefined
      ? currentSection.barCount
      : Math.max(1, partial.barCount);

  const nextSectionsInput = state.sections.map((section) =>
    section.id === sectionId
      ? { ...section, ...partial, barCount: normalizedBarCount }
      : section
  );

  if (!shouldReflowTimeline) {
    return {
      sections: nextSectionsInput,
      blocks: state.blocks,
      chords: state.chords,
    };
  }

  const nextSections = reflowSections(nextSectionsInput);
  const nextSectionById = new Map(nextSections.map((section) => [section.id, section]));
  const currentSectionById = new Map(state.sections.map((section) => [section.id, section]));

  const nextBlocks = state.blocks.flatMap((block) => {
    const currentBlockSection = currentSectionById.get(block.sectionId);
    const nextBlockSection = nextSectionById.get(block.sectionId);

    if (!currentBlockSection || !nextBlockSection) {
      return [block];
    }

    const relativeStart = block.startBar - currentBlockSection.startBar;
    const relativeEnd = block.endBar - currentBlockSection.startBar;

    if (relativeStart >= nextBlockSection.barCount) {
      return [];
    }

    const nextStartBar = nextBlockSection.startBar + relativeStart;
    const nextEndBar = Math.min(
      nextBlockSection.startBar + relativeEnd,
      nextBlockSection.startBar + nextBlockSection.barCount - 1
    );

    return [{ ...block, startBar: nextStartBar, endBar: nextEndBar }];
  });

  const nextChords = state.chords.flatMap((chord) => {
    const currentChordSection = findSectionForBar(state.sections, chord.barNumber);

    if (!currentChordSection) {
      return [chord];
    }

    const nextChordSection = nextSectionById.get(currentChordSection.id);
    if (!nextChordSection) {
      return [];
    }

    const relativeBar = chord.barNumber - currentChordSection.startBar;
    if (relativeBar >= nextChordSection.barCount) {
      return [];
    }

    return [{ ...chord, barNumber: nextChordSection.startBar + relativeBar }];
  });

  return {
    sections: nextSections,
    blocks: nextBlocks,
    chords: nextChords,
  };
}

const SECTION_STYLE_OVERRIDE_FIELDS = [
  'energyOverride',
  'dynamicsOverride',
  'grooveOverride',
  'feelOverride',
  'swingPctOverride',
] as const;

function updatesSectionStyleOverrides(partial: Partial<Section>): boolean {
  return SECTION_STYLE_OVERRIDE_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(partial, field)
  );
}

function getSectionDisplayName(section: Section | undefined): string | null {
  const name = section?.name?.trim();
  return name ? name : null;
}

function describeSectionUndoTarget(action: string, section: Section | undefined): string {
  const sectionName = getSectionDisplayName(section);
  return sectionName ? `${action} section: ${sectionName}` : `${action} section`;
}

function describeSectionUpdateUndoTarget(
  section: Section | undefined,
  partial: Partial<Section>
): string {
  const currentName = getSectionDisplayName(section);
  const nextName = partial.name?.trim() || null;

  if (currentName && nextName && nextName !== currentName) {
    return `Rename section: ${currentName} -> ${nextName}`;
  }

  return describeSectionUndoTarget('Update', section);
}

function describeBlockUndoTarget(
  action: string,
  block: Block | undefined,
  sections: Section[],
  stems: Stem[]
): string {
  if (!block) {
    return `${action} block`;
  }

  const sectionName = getSectionDisplayName(
    sections.find((section) => section.id === block.sectionId)
  );
  const stemInstrument = stems.find((stem) => stem.id === block.stemId)?.instrument?.trim() || null;
  const blockLabel = stemInstrument ? `${stemInstrument} block` : 'block';
  const sectionTarget = sectionName ? ` in ${sectionName}` : '';

  return `${action} ${blockLabel}${sectionTarget} (bars ${block.startBar}-${block.endBar})`;
}

function regenerateBlockWithProjectState(state: {
  project: Project | null;
  stems: Stem[];
  sections: Section[];
  chords: Chord[];
}, currentBlock: Block, nextBlock: Block, forceMidiRefresh: boolean = false): Block {
  if (!state.project) {
    return nextBlock;
  }

  const section = state.sections.find((candidate) => candidate.id === nextBlock.sectionId);
  const stem = state.stems.find((candidate) => candidate.id === nextBlock.stemId);

  if (!section || !stem) {
    return nextBlock;
  }

  const needsMidiRefresh =
    forceMidiRefresh ||
    nextBlock.style !== currentBlock.style ||
    nextBlock.startBar !== currentBlock.startBar ||
    nextBlock.endBar !== currentBlock.endBar ||
    nextBlock.sectionId !== currentBlock.sectionId ||
    nextBlock.energyOverride !== currentBlock.energyOverride ||
    nextBlock.dynamicsOverride !== currentBlock.dynamicsOverride;

  if (!needsMidiRefresh) {
    return nextBlock;
  }

  const beatsPerBar = parseInt(state.project.timeSignature.split('/')[0] ?? '4', 10) || 4;
  const blockChords = state.chords
    .filter((chord) => chord.barNumber >= nextBlock.startBar && chord.barNumber <= nextBlock.endBar)
    .map((chord) => ({
      bar_number: chord.barNumber,
      degree: chord.degree,
      quality: chord.quality,
      bass_degree: chord.bassDegree,
    }));

  const effectiveEnergy = resolveStyle(state.project, section, nextBlock, 'energy').value;
  const effectiveDynamics = resolveStyle(state.project, section, nextBlock, 'dynamics').value;
  const midiData = generateMidiForBlock(
    stem.instrument,
    nextBlock.endBar - nextBlock.startBar + 1,
    blockChords,
    state.project.key,
    state.project.genre,
    stem.instrument === 'drums'
      ? {
          substyle: state.project.subStyle,
          energy: effectiveEnergy,
          dynamics: effectiveDynamics,
          swingPct: section.swingPctOverride ?? state.project.swingPct,
          groove: section.grooveOverride ?? state.project.groove,
          feel: section.feelOverride ?? state.project.feel,
          beatsPerBar,
          sectionType: section.name.replace(/\s*\d+$/, ''),
          sectionIndex: section.sortOrder,
          isLastSection: section.sortOrder === state.sections.length - 1,
          totalBarsInSection: section.barCount,
          barNumberGlobal: nextBlock.startBar,
        }
      : {
          substyle: state.project.subStyle,
          energy: effectiveEnergy,
          dynamics: effectiveDynamics,
          swingPct: section.swingPctOverride ?? state.project.swingPct,
          groove: section.grooveOverride ?? state.project.groove,
          feel: section.feelOverride ?? state.project.feel,
          beatsPerBar,
          sectionType: section.name.replace(/\s*\d+$/, ''),
          sectionIndex: section.sortOrder,
          isLastSection: section.sortOrder === state.sections.length - 1,
          totalBarsInSection: section.barCount,
          barNumberGlobal: nextBlock.startBar,
        },
    nextBlock.startBar,
    nextBlock.style
  );

  return { ...nextBlock, midiData };
}

export interface ProjectExportSnapshot {
  version: 1;
  exportedAt: string;
  project: Project;
  stems: Stem[];
  sections: Section[];
  blocks: Block[];
  chords: Chord[];
}

export type ProjectArrangementTruthStatus =
  | 'missing'
  | 'draft-only'
  | 'draft-over-persisted'
  | 'persisted-only'
  | 'loaded-and-persisted';

export type ProjectArrangementLoadedRowsState =
  | 'not-loaded'
  | 'draft'
  | 'draft-over-saved-snapshot'
  | 'saved-snapshot';

export interface ProjectArrangementTruth {
  status: ProjectArrangementTruthStatus;
  loadedRowsState: ProjectArrangementLoadedRowsState;
  hasArrangementRows: boolean;
  hasPersistedArrangement: boolean;
  hasAnyArrangementTruth: boolean;
  hasDraftArrangementRows: boolean;
  currentState: string;
  nextStep: string;
}

const persistedArrangementFingerprintByProject = new WeakMap<Project, string>();

function captureArrangementFingerprint(state: {
  stems: Stem[];
  sections: Section[];
  blocks: Block[];
  chords: Chord[];
}): string {
  return snapshotArrangement(state);
}

function rememberPersistedArrangementFingerprint(
  project: Project,
  state: {
    stems: Stem[];
    sections: Section[];
    blocks: Block[];
    chords: Chord[];
  }
) {
  persistedArrangementFingerprintByProject.set(project, captureArrangementFingerprint(state));
}

export function syncPersistedProjectArrangement(
  project: Project,
  state: {
    stems: Stem[];
    sections: Section[];
    blocks: Block[];
    chords: Chord[];
  }
) {
  rememberPersistedArrangementFingerprint(project, state);
}

function carryPersistedArrangementFingerprint(previousProject: Project, nextProject: Project) {
  const fingerprint = persistedArrangementFingerprintByProject.get(previousProject);

  if (fingerprint) {
    persistedArrangementFingerprintByProject.set(nextProject, fingerprint);
  }
}

function getPersistedArrangementFingerprint(state: {
  project: Project | null;
  persistedArrangementFingerprint?: string | null;
}): string | null {
  if (state.persistedArrangementFingerprint !== undefined) {
    return state.persistedArrangementFingerprint;
  }

  if (!state.project) {
    return null;
  }

  return persistedArrangementFingerprintByProject.get(state.project) ?? null;
}

function describeProjectArrangementTruth({
  hasArrangementRows,
  hasPersistedArrangement,
  hasDraftArrangementRows,
}: {
  hasArrangementRows: boolean;
  hasPersistedArrangement: boolean;
  hasDraftArrangementRows: boolean;
}): Pick<ProjectArrangementTruth, 'status' | 'loadedRowsState' | 'currentState' | 'nextStep'> {
  if (hasArrangementRows && hasPersistedArrangement && hasDraftArrangementRows) {
    return {
      status: 'draft-over-persisted',
      loadedRowsState: 'draft-over-saved-snapshot',
      currentState: 'Loaded arrangement rows are currently ahead of the saved arrangement snapshot.',
      nextStep: 'Save the current arrangement rows to replace the saved arrangement snapshot.',
    };
  }

  if (hasArrangementRows && hasPersistedArrangement) {
    return {
      status: 'loaded-and-persisted',
      loadedRowsState: 'saved-snapshot',
      currentState: 'Loaded arrangement rows already match the saved arrangement snapshot.',
      nextStep: 'Edit the arrangement to create a draft, or save project fields and chat without replacing arrangement rows.',
    };
  }

  if (hasArrangementRows) {
    return {
      status: 'draft-only',
      loadedRowsState: 'draft',
      currentState: 'Arrangement rows are loaded, but no saved arrangement snapshot exists yet.',
      nextStep: 'Save the current arrangement rows to create the first saved arrangement snapshot.',
    };
  }

  if (hasPersistedArrangement) {
    return {
      status: 'persisted-only',
      loadedRowsState: 'not-loaded',
      currentState: 'A saved arrangement snapshot exists, but its rows are not loaded in the project store right now.',
      nextStep:
        'Use Reload saved snapshot in the top bar to load the arrangement rows before editing, saving, or exporting the current arrangement snapshot.',
    };
  }

  return {
    status: 'missing',
    loadedRowsState: 'not-loaded',
    currentState: 'No arrangement rows or saved arrangement snapshot exist yet.',
    nextStep: 'Generate or import an arrangement before saving or exporting arrangement rows.',
  };
}

export function getProjectArrangementTruth(state: {
  project: Project | null;
  stems: Stem[];
  sections: Section[];
  blocks: Block[];
  chords: Chord[];
  persistedArrangementFingerprint?: string | null;
}): ProjectArrangementTruth {
  const hasArrangementRows = Boolean(
    state.stems.length ||
    state.sections.length ||
    state.blocks.length ||
    state.chords.length
  );
  const hasPersistedArrangement = Boolean(state.project?.hasArrangement);
  const persistedArrangementFingerprint = getPersistedArrangementFingerprint(state);
  const currentArrangementFingerprint = hasArrangementRows
    ? captureArrangementFingerprint(state)
    : null;
  const hasDraftArrangementRows = hasArrangementRows
    ? hasPersistedArrangement
      ? Boolean(
          persistedArrangementFingerprint &&
          currentArrangementFingerprint !== persistedArrangementFingerprint
        )
      : true
    : false;
  const arrangementTruth = describeProjectArrangementTruth({
    hasArrangementRows,
    hasPersistedArrangement,
    hasDraftArrangementRows,
  });

  return {
    ...arrangementTruth,
    hasArrangementRows,
    hasPersistedArrangement,
    hasAnyArrangementTruth: hasArrangementRows || hasPersistedArrangement,
    hasDraftArrangementRows,
  };
}

export function hasProjectArrangementTruth(state: {
  project: Project | null;
  stems: Stem[];
  sections: Section[];
  blocks: Block[];
  chords: Chord[];
}): boolean {
  return getProjectArrangementTruth(state).hasAnyArrangementTruth;
}

export function serializeProjectExportSnapshot(
  state: {
    project: Project;
    stems: Stem[];
    sections: Section[];
    blocks: Block[];
    chords: Chord[];
  },
  exportedAt: string = new Date().toISOString()
): string {
  const snapshot: ProjectExportSnapshot = {
    version: 1,
    exportedAt,
    project: state.project,
    stems: state.stems,
    sections: state.sections,
    blocks: state.blocks,
    chords: state.chords,
  };

  return JSON.stringify(snapshot, null, 2);
}

function reconcileSelectionWithArrangement(state: {
  stems: Stem[];
  sections: Section[];
  blocks: Block[];
}) {
  const selection = useSelectionStore.getState();

  if (selection.level === 'section') {
    const hasSelectedSection =
      selection.sectionId !== null &&
      state.sections.some((section) => section.id === selection.sectionId);

    if (!hasSelectedSection) {
      selection.clearSelection();
    }
    return;
  }

  if (selection.level === 'block') {
    const selectedBlock =
      selection.blockId !== null
        ? state.blocks.find((block) => block.id === selection.blockId)
        : null;

    const hasSelectedStem =
      selectedBlock !== undefined &&
      selectedBlock !== null &&
      state.stems.some((stem) => stem.id === selectedBlock.stemId);

    const hasSelectedSection =
      selectedBlock !== undefined &&
      selectedBlock !== null &&
      state.sections.some((section) => section.id === selectedBlock.sectionId);

    if (!selectedBlock || !hasSelectedStem || !hasSelectedSection) {
      selection.clearSelection();
      return;
    }

    if (selection.stemId !== selectedBlock.stemId) {
      selection.selectBlock(selectedBlock.id, selectedBlock.stemId);
    }
  }
}

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
  hydrateProject: (data: {
    project: Project;
    stems: Stem[];
    sections: Section[];
    blocks: Block[];
    chords: Chord[];
    chatMessages: AiChatMessage[];
  }) => void;
  clearProjectSession: () => void;
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
  centerStemPan: (stemId: string) => void;
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

  setProject: (project) =>
    set((state) => {
      if (state.project && state.project.hasArrangement && project.hasArrangement) {
        carryPersistedArrangementFingerprint(state.project, project);
      }

      return { project };
    }),

  hydrateProject: ({ project, stems, sections, blocks, chords, chatMessages }) =>
    {
      const normalizedStems = normalizeStems(stems);

      if (get().project?.id !== project.id) {
        useSelectionStore.getState().clearSelection();
      }

      useUiStore
        .getState()
        .syncProjectSession(project.hasArrangement && sections.length > 0 ? 'complete' : 'idle');

      if (project.hasArrangement) {
        rememberPersistedArrangementFingerprint(project, {
          stems: normalizedStems,
          sections,
          blocks,
          chords,
        });
      }

      set({
        project,
        stems: normalizedStems,
        sections,
        blocks,
        chords,
        chatMessages,
        drumOnlyUpdate: false,
        allInstrumentsUpdate: false,
      });

      reconcileSelectionWithArrangement({ stems: normalizedStems, sections, blocks });
    },

  clearProjectSession: () => {
    useSelectionStore.getState().clearSelection();
    useUiStore.getState().syncProjectSession('idle');

    set({
      project: null,
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
      chatMessages: [],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });
  },

  updateProject: (partial) => {
    set((state) => {
      if (!state.project) {
        return { project: null };
      }

      const nextProject = { ...state.project, ...partial };

      if (state.project.hasArrangement && nextProject.hasArrangement) {
        carryPersistedArrangementFingerprint(state.project, nextProject);
      }

      return { project: nextProject };
    });
    useUiStore.getState().markDirty();
  },

  setArrangement: ({ stems, sections, blocks, chords }) => {
    const normalizedStems = normalizeStems(stems);
    set({ stems: normalizedStems, sections, blocks, chords });
    reconcileSelectionWithArrangement({ stems: normalizedStems, sections, blocks });
  },

  setDrumBlocks: (updatedBlocks) => {
    const { stems, sections } = get();
    set({ blocks: updatedBlocks, drumOnlyUpdate: true });
    reconcileSelectionWithArrangement({ stems, sections, blocks: updatedBlocks });
  },

  clearDrumOnlyUpdate: () => set({ drumOnlyUpdate: false }),

  setAllInstrumentBlocks: (updatedBlocks) => {
    const { stems, sections } = get();
    set({ blocks: updatedBlocks, allInstrumentsUpdate: true });
    reconcileSelectionWithArrangement({ stems, sections, blocks: updatedBlocks });
  },

  clearAllInstrumentsUpdate: () => set({ allInstrumentsUpdate: false }),

  clearArrangement: () => {
    set({ stems: [], sections: [], blocks: [], chords: [] });
    reconcileSelectionWithArrangement({ stems: [], sections: [], blocks: [] });
  },

  updateStem: (stemId, partial) => {
    const normalizedPartial = normalizeStemPartial(partial);
    set((state) => ({
      stems: state.stems.map((s) => (s.id === stemId ? { ...s, ...normalizedPartial } : s)),
    }));
    useUiStore.getState().markDirty();
  },

  centerStemPan: (stemId) => {
    get().updateStem(stemId, { pan: 0 });
  },

  addStem: (stem) => {
    set((state) => ({ stems: [...state.stems, normalizeStem(stem)] }));
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
    useUndoStore.getState().pushUndo(`Add section: ${section.name}`, { undo: before, redo: after });
    useUiStore.getState().markDirty();
  },

  updateSection: (sectionId, partial) => {
    const currentSection = get().sections.find((section) => section.id === sectionId);
    const before = snapshotArrangement(get());
    set((state) => {
      const nextArrangement = applySectionUpdate(state, sectionId, partial);

      if (!updatesSectionStyleOverrides(partial)) {
        return {
          ...nextArrangement,
        };
      }

      return {
        ...nextArrangement,
        blocks: nextArrangement.blocks.map((block) => {
          if (block.sectionId !== sectionId) {
            return block;
          }

          return regenerateBlockWithProjectState(
            {
              project: state.project,
              stems: state.stems,
              sections: nextArrangement.sections,
              chords: nextArrangement.chords,
            },
            block,
            block,
            true
          );
        }),
      };
    });
    reconcileSelectionWithArrangement(get());
    const after = snapshotArrangement(get());
    useUndoStore.getState().pushUndo(
      describeSectionUpdateUndoTarget(currentSection, partial),
      { undo: before, redo: after }
    );
    useUiStore.getState().markDirty();
  },

  removeSection: (sectionId) => {
    const currentSection = get().sections.find((section) => section.id === sectionId);
    const before = snapshotArrangement(get());
    set((state) => ({
      sections: state.sections.filter((s) => s.id !== sectionId),
      blocks: state.blocks.filter((b) => b.sectionId !== sectionId),
    }));
    reconcileSelectionWithArrangement(get());
    const after = snapshotArrangement(get());
    useUndoStore.getState().pushUndo(
      describeSectionUndoTarget('Remove', currentSection),
      { undo: before, redo: after }
    );
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
    useUndoStore.getState().pushUndo('Reorder sections', { undo: before, redo: after });
    useUiStore.getState().markDirty();
  },

  updateBlock: (blockId, partial) => {
    const state = get();
    const currentBlock = state.blocks.find((block) => block.id === blockId);
    const nextBlock = currentBlock ? { ...currentBlock, ...partial } : undefined;
    const before = snapshotArrangement(get());
    set((state) => ({
      blocks: state.blocks.map((block) => {
        if (block.id !== blockId) {
          return block;
        }

        const nextBlock = { ...block, ...partial };
        return regenerateBlockWithProjectState(state, block, nextBlock);
      }),
    }));
    const after = snapshotArrangement(get());
    useUndoStore.getState().pushUndo(
      describeBlockUndoTarget('Update', nextBlock, state.sections, state.stems),
      { undo: before, redo: after }
    );
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
    useUndoStore.getState().pushUndo(`Split block at bar ${atBar}`, { undo: before, redo: after });
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
    reconcileSelectionWithArrangement(get());
    const after = snapshotArrangement(get());
    useUndoStore.getState().pushUndo(`Merge blocks (bars ${b1.startBar}-${b2.endBar})`, { undo: before, redo: after });
    useUiStore.getState().markDirty();
  },

  deleteBlock: (blockId) => {
    const state = get();
    const currentBlock = state.blocks.find((block) => block.id === blockId);
    const before = snapshotArrangement(get());
    const newBlocks = state.blocks.filter((block) => block.id !== blockId);
    set({ blocks: newBlocks });
    reconcileSelectionWithArrangement(get());
    const after = snapshotArrangement(get());
    useUndoStore.getState().pushUndo(
      describeBlockUndoTarget('Delete', currentBlock, state.sections, state.stems),
      { undo: before, redo: after }
    );
    useUiStore.getState().markDirty();
  },

  duplicateBlock: (blockId) => {
    const state = get();
    const { blocks, sections, stems } = state;
    const original = blocks.find((b) => b.id === blockId);
    if (!original) return;
    const before = snapshotArrangement(get());
    const copy: Block = { ...original, id: genId() };
    set({ blocks: [...blocks, copy] });
    const after = snapshotArrangement(get());
    useUndoStore.getState().pushUndo(
      describeBlockUndoTarget('Duplicate', original, sections, stems),
      { undo: before, redo: after }
    );
    useUiStore.getState().markDirty();
  },

  updateChord: (barNumber, chord) => {
    const before = snapshotArrangement(get());
    set((state) => ({
      chords: state.chords.map((c) => (c.barNumber === barNumber ? { ...c, ...chord } : c)),
    }));
    const after = snapshotArrangement(get());
    useUndoStore.getState().pushUndo(`Update chord at bar ${barNumber}`, { undo: before, redo: after });
    useUiStore.getState().markDirty();
  },

  addChatMessage: (message) => {
    set((state) => ({ chatMessages: [...state.chatMessages, message] }));
    useUiStore.getState().markDirty();
  },

  getTotalBars: () => get().sections.reduce((sum, s) => sum + s.barCount, 0),

  getBlocksForStem: (stemId) => get().blocks.filter((b) => b.stemId === stemId),

  getBlocksForSection: (sectionId) => get().blocks.filter((b) => b.sectionId === sectionId),

  getSectionAtBar: (bar) =>
    get().sections.find((s) => s.startBar <= bar && bar < s.startBar + s.barCount),
}));
