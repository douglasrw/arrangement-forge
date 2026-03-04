import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from './project-store';
import { useUndoStore } from './undo-store';
import { parseSnapshot } from '@/lib/undo-helpers';
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

  it('setAllInstrumentBlocks updates blocks and sets allInstrumentsUpdate flag', () => {
    const stem1 = makeStem({ id: 'st-drums', instrument: 'drums' });
    const stem2 = makeStem({ id: 'st-bass', instrument: 'bass' });
    const section = makeSection({ id: 's1' });
    const block1 = makeBlock({ id: 'b1', stemId: 'st-drums', sectionId: 's1', midiData: [] });
    const block2 = makeBlock({ id: 'b2', stemId: 'st-bass', sectionId: 's1', midiData: [] });

    useProjectStore.getState().setArrangement({
      stems: [stem1, stem2],
      sections: [section],
      blocks: [block1, block2],
      chords: [],
    });

    // Simulate regeneration: update midiData on all blocks
    const updatedBlocks = [
      { ...block1, midiData: [{ note: 'C2', time: 0, duration: 0.25, velocity: 100 }] },
      { ...block2, midiData: [{ note: 'E2', time: 0, duration: 0.9, velocity: 85 }] },
    ];

    useProjectStore.getState().setAllInstrumentBlocks(updatedBlocks);

    const state = useProjectStore.getState();
    expect(state.allInstrumentsUpdate).toBe(true);
    expect(state.blocks).toHaveLength(2);
    expect(state.blocks[0].midiData).toHaveLength(1);
    expect(state.blocks[1].midiData).toHaveLength(1);
  });

  it('clearAllInstrumentsUpdate resets the flag', () => {
    useProjectStore.setState({ allInstrumentsUpdate: true });
    useProjectStore.getState().clearAllInstrumentsUpdate();
    expect(useProjectStore.getState().allInstrumentsUpdate).toBe(false);
  });
});

describe('undo/redo round-trip', () => {
  it('split then undo restores original blocks', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [makeBlock({ startBar: 1, endBar: 8 })], chords: [],
    });
    const originalBlocks = useProjectStore.getState().blocks;
    useProjectStore.getState().splitBlock('b1', 5);
    expect(useProjectStore.getState().blocks).toHaveLength(2);

    // Undo
    const entry = useUndoStore.getState().undo();
    expect(entry).not.toBeNull();
    const snapshot = parseSnapshot(entry!.stateBefore);
    expect(snapshot).not.toBeNull();
    useProjectStore.getState().setArrangement(snapshot!);
    expect(useProjectStore.getState().blocks).toHaveLength(1);
    expect(useProjectStore.getState().blocks[0].startBar).toBe(originalBlocks[0].startBar);
    expect(useProjectStore.getState().blocks[0].endBar).toBe(originalBlocks[0].endBar);
  });

  it('undo then redo restores post-action state', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [makeBlock({ startBar: 1, endBar: 8 })], chords: [],
    });
    useProjectStore.getState().splitBlock('b1', 5);

    // Undo
    const undoEntry = useUndoStore.getState().undo();
    const undoSnap = parseSnapshot(undoEntry!.stateBefore);
    useProjectStore.getState().setArrangement(undoSnap!);
    expect(useProjectStore.getState().blocks).toHaveLength(1);

    // Redo
    const redoEntry = useUndoStore.getState().redo();
    const redoSnap = parseSnapshot(redoEntry!.stateAfter);
    useProjectStore.getState().setArrangement(redoSnap!);
    expect(useProjectStore.getState().blocks).toHaveLength(2);
  });

  it('multiple actions then multiple undos restore in LIFO order', () => {
    useProjectStore.getState().setProject(makeProject());
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [makeBlock({ startBar: 1, endBar: 12 })],
      chords: [{ id: 'c1', projectId: 'p1', barNumber: 1, degree: 'I', quality: 'maj7', bassDegree: null }],
    });
    const s0Blocks = [...useProjectStore.getState().blocks];

    // Action A: split
    useProjectStore.getState().splitBlock('b1', 5);

    // Action B: update chord
    useProjectStore.getState().updateChord(1, { quality: 'min7' });

    // Action C: delete a block
    const blockToDelete = useProjectStore.getState().blocks[0];
    useProjectStore.getState().deleteBlock(blockToDelete.id);

    // Undo C
    const entryC = useUndoStore.getState().undo();
    useProjectStore.getState().setArrangement(parseSnapshot(entryC!.stateBefore)!);

    // Undo B
    const entryB = useUndoStore.getState().undo();
    useProjectStore.getState().setArrangement(parseSnapshot(entryB!.stateBefore)!);
    expect(useProjectStore.getState().chords[0].quality).toBe('maj7');

    // Undo A
    const entryA = useUndoStore.getState().undo();
    useProjectStore.getState().setArrangement(parseSnapshot(entryA!.stateBefore)!);
    expect(useProjectStore.getState().blocks).toHaveLength(1);
    expect(useProjectStore.getState().blocks[0].startBar).toBe(s0Blocks[0].startBar);
    expect(useProjectStore.getState().blocks[0].endBar).toBe(s0Blocks[0].endBar);
  });

  it('new action after undo clears redo stack', () => {
    useProjectStore.getState().setProject(makeProject());
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [makeBlock({ startBar: 1, endBar: 8 })], chords: [],
    });

    // Action A
    useProjectStore.getState().splitBlock('b1', 5);
    expect(useUndoStore.getState().undoStack).toHaveLength(1);

    // Undo A
    const entry = useUndoStore.getState().undo();
    useProjectStore.getState().setArrangement(parseSnapshot(entry!.stateBefore)!);
    expect(useUndoStore.getState().redoStack).toHaveLength(1);

    // Action B (new action after undo)
    useProjectStore.getState().updateBlock('b1', { style: 'rock_power' });
    expect(useUndoStore.getState().redoStack).toHaveLength(0);
    expect(useUndoStore.getState().undoStack).toHaveLength(1);
  });

  it('removeSection undo restores both section and its blocks', () => {
    useProjectStore.getState().setProject(makeProject());
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection({ id: 's1' })],
      blocks: [
        makeBlock({ id: 'b1', sectionId: 's1' }),
        makeBlock({ id: 'b2', sectionId: 's1', startBar: 9, endBar: 16 }),
      ],
      chords: [],
    });
    expect(useProjectStore.getState().sections).toHaveLength(1);
    expect(useProjectStore.getState().blocks).toHaveLength(2);

    useProjectStore.getState().removeSection('s1');
    expect(useProjectStore.getState().sections).toHaveLength(0);
    expect(useProjectStore.getState().blocks).toHaveLength(0);

    // Undo
    const entry = useUndoStore.getState().undo();
    useProjectStore.getState().setArrangement(parseSnapshot(entry!.stateBefore)!);
    expect(useProjectStore.getState().sections).toHaveLength(1);
    expect(useProjectStore.getState().blocks).toHaveLength(2);
  });

  it('updateChord undo restores original chord', () => {
    useProjectStore.getState().setProject(makeProject());
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [{ id: 'c1', projectId: 'p1', barNumber: 3, degree: 'I', quality: 'maj7', bassDegree: null }],
    });

    useProjectStore.getState().updateChord(3, { quality: 'min7' });
    expect(useProjectStore.getState().chords[0].quality).toBe('min7');

    // Undo
    const entry = useUndoStore.getState().undo();
    useProjectStore.getState().setArrangement(parseSnapshot(entry!.stateBefore)!);
    expect(useProjectStore.getState().chords[0].quality).toBe('maj7');
  });
});
