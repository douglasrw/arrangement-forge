import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from './project-store';
import { useUndoStore } from './undo-store';
import type { Project, Section, Block, Stem, Chord } from '@/types';

const makeProject = (partial: Partial<Project> = {}): Project => ({
  id: 'p1', userId: 'u1', name: 'Test', key: 'C', tempo: 120,
  timeSignature: '4/4', genre: 'Jazz', subStyle: 'Swing', energy: 60, groove: 70,
  feel: 50, swingPct: 65, dynamics: 50, generationHints: '', chordChartRaw: '',
  hasArrangement: false, generatedAt: null, generatedTempo: null,
  createdAt: '2026-01-01', updatedAt: '2026-01-01', ...partial,
});

const makeSection = (partial: Partial<Section> = {}): Section => ({
  id: 's1', projectId: 'p1', name: 'Verse', sortOrder: 0, barCount: 8, startBar: 1,
  energyOverride: null, grooveOverride: null, feelOverride: null, swingPctOverride: null,
  dynamicsOverride: null, createdAt: '2026-01-01', ...partial,
});

const makeBlock = (partial: Partial<Block> = {}): Block => ({
  id: 'b1', stemId: 'st1', sectionId: 's1', startBar: 1, endBar: 8,
  chordDegree: 'I', chordQuality: 'maj7', chordBassDegree: null, style: 'jazz_comp',
  energyOverride: null, dynamicsOverride: null, midiData: [], createdAt: '2026-01-01',
  ...partial,
});

const makeStem = (partial: Partial<Stem> = {}): Stem => ({
  id: 'st1', projectId: 'p1', instrument: 'piano', sortOrder: 0,
  volume: 0.8, pan: 0, isMuted: false, isSolo: false, createdAt: '2026-01-01', ...partial,
});

const makeChord = (partial: Partial<Chord> = {}): Chord => ({
  id: 'c1', projectId: 'p1', barNumber: 1, degree: 'I', quality: 'maj7', bassDegree: null,
  ...partial,
});

beforeEach(() => {
  useProjectStore.setState({
    project: null, stems: [], sections: [], blocks: [], chords: [], chatMessages: [],
  });
  useUndoStore.setState({ undoStack: [], redoStack: [] });
});

describe('projectStore', () => {
  it('setProject stores the project', () => {
    const project = makeProject();
    useProjectStore.getState().setProject(project);
    expect(useProjectStore.getState().project?.id).toBe('p1');
  });

  it('updateProject merges fields', () => {
    useProjectStore.getState().setProject(makeProject());
    useProjectStore.getState().updateProject({ name: 'Updated' });
    expect(useProjectStore.getState().project?.name).toBe('Updated');
  });

  it('setArrangement populates all data', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [],
    });
    expect(useProjectStore.getState().stems).toHaveLength(1);
    expect(useProjectStore.getState().sections).toHaveLength(1);
    expect(useProjectStore.getState().blocks).toHaveLength(1);
  });

  it('splitBlock creates two blocks with correct bar ranges', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [makeBlock({ startBar: 5, endBar: 12 })], chords: [],
    });
    useProjectStore.getState().splitBlock('b1', 9);
    const blocks = useProjectStore.getState().blocks;
    expect(blocks).toHaveLength(2);
    const sorted = [...blocks].sort((a, b) => a.startBar - b.startBar);
    expect(sorted[0].startBar).toBe(5);
    expect(sorted[0].endBar).toBe(8);
    expect(sorted[1].startBar).toBe(9);
    expect(sorted[1].endBar).toBe(12);
  });

  it('splitBlock rejects invalid atBar', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [makeBlock({ startBar: 5, endBar: 12 })], chords: [],
    });
    useProjectStore.getState().splitBlock('b1', 5); // atBar === startBar is invalid
    expect(useProjectStore.getState().blocks).toHaveLength(1);
  });

  it('mergeBlocks merges two adjacent blocks', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [
        makeBlock({ id: 'b1', startBar: 1, endBar: 4 }),
        makeBlock({ id: 'b2', startBar: 5, endBar: 8 }),
      ],
      chords: [],
    });
    useProjectStore.getState().mergeBlocks('b1', 'b2');
    const blocks = useProjectStore.getState().blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0].startBar).toBe(1);
    expect(blocks[0].endBar).toBe(8);
  });

  it('mergeBlocks rejects non-adjacent blocks', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [
        makeBlock({ id: 'b1', startBar: 1, endBar: 3 }),
        makeBlock({ id: 'b2', startBar: 5, endBar: 8 }),
      ],
      chords: [],
    });
    useProjectStore.getState().mergeBlocks('b1', 'b2');
    expect(useProjectStore.getState().blocks).toHaveLength(2); // unchanged
  });

  it('getTotalBars sums section barCounts', () => {
    useProjectStore.getState().setArrangement({
      stems: [], sections: [makeSection({ barCount: 8 }), makeSection({ id: 's2', barCount: 4, startBar: 9 })],
      blocks: [], chords: [],
    });
    expect(useProjectStore.getState().getTotalBars()).toBe(12);
  });

  it('getBlocksForStem filters correctly', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [
        makeBlock({ id: 'b1', stemId: 'st1' }),
        makeBlock({ id: 'b2', stemId: 'st2' }),
      ],
      chords: [],
    });
    expect(useProjectStore.getState().getBlocksForStem('st1')).toHaveLength(1);
    expect(useProjectStore.getState().getBlocksForStem('st2')).toHaveLength(1);
    expect(useProjectStore.getState().getBlocksForStem('unknown')).toHaveLength(0);
  });

  it('getSectionAtBar finds correct section', () => {
    useProjectStore.getState().setArrangement({
      stems: [], sections: [
        makeSection({ id: 's1', startBar: 1, barCount: 8 }),
        makeSection({ id: 's2', startBar: 9, barCount: 4 }),
      ],
      blocks: [], chords: [],
    });
    expect(useProjectStore.getState().getSectionAtBar(1)?.id).toBe('s1');
    expect(useProjectStore.getState().getSectionAtBar(8)?.id).toBe('s1');
    expect(useProjectStore.getState().getSectionAtBar(9)?.id).toBe('s2');
    expect(useProjectStore.getState().getSectionAtBar(12)?.id).toBe('s2');
  });
});

function hasSnapshotKeys(json: string): boolean {
  const parsed = JSON.parse(json);
  return (
    Array.isArray(parsed.stems) &&
    Array.isArray(parsed.sections) &&
    Array.isArray(parsed.blocks) &&
    Array.isArray(parsed.chords)
  );
}

describe('undo push coverage', () => {
  it('splitBlock pushes undo entry with unified snapshot format', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [makeBlock({ startBar: 1, endBar: 8 })], chords: [],
    });
    useProjectStore.getState().splitBlock('b1', 5);
    const stack = useUndoStore.getState().undoStack;
    expect(stack).toHaveLength(1);
    expect(hasSnapshotKeys(stack[0].stateBefore)).toBe(true);
    expect(hasSnapshotKeys(stack[0].stateAfter)).toBe(true);
  });

  it('mergeBlocks pushes undo entry with unified snapshot format', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [
        makeBlock({ id: 'b1', startBar: 1, endBar: 4 }),
        makeBlock({ id: 'b2', startBar: 5, endBar: 8 }),
      ],
      chords: [],
    });
    useProjectStore.getState().mergeBlocks('b1', 'b2');
    const stack = useUndoStore.getState().undoStack;
    expect(stack).toHaveLength(1);
    expect(hasSnapshotKeys(stack[0].stateBefore)).toBe(true);
    expect(hasSnapshotKeys(stack[0].stateAfter)).toBe(true);
  });

  it('deleteBlock pushes undo entry with unified snapshot format', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [makeBlock()], chords: [],
    });
    useProjectStore.getState().deleteBlock('b1');
    const stack = useUndoStore.getState().undoStack;
    expect(stack).toHaveLength(1);
    expect(hasSnapshotKeys(stack[0].stateBefore)).toBe(true);
    expect(hasSnapshotKeys(stack[0].stateAfter)).toBe(true);
  });

  it('updateBlock pushes undo entry with unified snapshot format', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [makeBlock()], chords: [],
    });
    useProjectStore.getState().updateBlock('b1', { style: 'rock_power' });
    const stack = useUndoStore.getState().undoStack;
    expect(stack).toHaveLength(1);
    expect(hasSnapshotKeys(stack[0].stateBefore)).toBe(true);
    expect(hasSnapshotKeys(stack[0].stateAfter)).toBe(true);
  });

  it('duplicateBlock pushes undo entry with unified snapshot format', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [makeBlock()], chords: [],
    });
    useProjectStore.getState().duplicateBlock('b1');
    const stack = useUndoStore.getState().undoStack;
    expect(stack).toHaveLength(1);
    expect(hasSnapshotKeys(stack[0].stateBefore)).toBe(true);
    expect(hasSnapshotKeys(stack[0].stateAfter)).toBe(true);
  });

  it('addSection pushes undo entry with unified snapshot format', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [], blocks: [], chords: [],
    });
    useProjectStore.getState().addSection(makeSection());
    const stack = useUndoStore.getState().undoStack;
    expect(stack).toHaveLength(1);
    expect(hasSnapshotKeys(stack[0].stateBefore)).toBe(true);
    expect(hasSnapshotKeys(stack[0].stateAfter)).toBe(true);
  });

  it('updateSection pushes undo entry with unified snapshot format', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()], blocks: [], chords: [],
    });
    useProjectStore.getState().updateSection('s1', { name: 'Chorus' });
    const stack = useUndoStore.getState().undoStack;
    expect(stack).toHaveLength(1);
    expect(hasSnapshotKeys(stack[0].stateBefore)).toBe(true);
    expect(hasSnapshotKeys(stack[0].stateAfter)).toBe(true);
  });

  it('removeSection pushes undo entry with unified snapshot format', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [makeBlock()], chords: [],
    });
    useProjectStore.getState().removeSection('s1');
    const stack = useUndoStore.getState().undoStack;
    expect(stack).toHaveLength(1);
    expect(hasSnapshotKeys(stack[0].stateBefore)).toBe(true);
    expect(hasSnapshotKeys(stack[0].stateAfter)).toBe(true);
  });

  it('reorderSections pushes undo entry with unified snapshot format', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()],
      sections: [makeSection({ id: 's1' }), makeSection({ id: 's2', sortOrder: 1 })],
      blocks: [], chords: [],
    });
    useProjectStore.getState().reorderSections(['s2', 's1']);
    const stack = useUndoStore.getState().undoStack;
    expect(stack).toHaveLength(1);
    expect(hasSnapshotKeys(stack[0].stateBefore)).toBe(true);
    expect(hasSnapshotKeys(stack[0].stateAfter)).toBe(true);
  });

  it('updateChord pushes undo entry with unified snapshot format', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()], blocks: [makeBlock()],
      chords: [makeChord({ barNumber: 1 })],
    });
    useProjectStore.getState().updateChord(1, { quality: 'min7' });
    const stack = useUndoStore.getState().undoStack;
    expect(stack).toHaveLength(1);
    expect(hasSnapshotKeys(stack[0].stateBefore)).toBe(true);
    expect(hasSnapshotKeys(stack[0].stateAfter)).toBe(true);
  });

  // Negative tests: non-undo actions
  it('updateProject does NOT push undo entry', () => {
    useProjectStore.getState().setProject(makeProject());
    useUndoStore.setState({ undoStack: [], redoStack: [] });
    useProjectStore.getState().updateProject({ name: 'New Name' });
    expect(useUndoStore.getState().undoStack).toHaveLength(0);
  });

  it('updateStem does NOT push undo entry', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [], blocks: [], chords: [],
    });
    useUndoStore.setState({ undoStack: [], redoStack: [] });
    useProjectStore.getState().updateStem('st1', { volume: 0.5 });
    expect(useUndoStore.getState().undoStack).toHaveLength(0);
  });

  it('setDrumBlocks does NOT push undo entry', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [], blocks: [makeBlock()], chords: [],
    });
    useUndoStore.setState({ undoStack: [], redoStack: [] });
    useProjectStore.getState().setDrumBlocks([makeBlock()]);
    expect(useUndoStore.getState().undoStack).toHaveLength(0);
  });
});
