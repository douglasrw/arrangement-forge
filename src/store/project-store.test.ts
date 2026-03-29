import { describe, it, expect, beforeEach } from 'vitest';
import { serializeProjectExportSnapshot, useProjectStore } from './project-store';
import { useSelectionStore } from './selection-store';
import { useUiStore } from './ui-store';
import { useUndoStore } from './undo-store';
import { parseSnapshot } from '@/lib/undo-helpers';
import { generateMidiForBlock } from '@/lib/midi-generator';
import type { Project, Section, Block, Stem, Chord, AiChatMessage } from '@/types';

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

const makeMessage = (partial: Partial<AiChatMessage> = {}): AiChatMessage => ({
  id: 'm1',
  projectId: 'p1',
  role: 'assistant',
  content: 'hello',
  scope: 'song',
  scopeTarget: null,
  createdAt: '2026-01-01',
  ...partial,
});

beforeEach(() => {
  useProjectStore.setState({
    project: null, stems: [], sections: [], blocks: [], chords: [], chatMessages: [],
  });
  useSelectionStore.setState({
    level: 'song',
    sectionId: null,
    blockId: null,
    stemId: null,
  });
  useUiStore.setState({
    generationState: 'idle',
    systemStatus: 'ready',
    errorMessage: null,
    unsavedChanges: false,
    lastSavedAt: null,
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

  it('setArrangement clears stale block selection when the replacement snapshot omits it', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [],
    });

    useSelectionStore.getState().selectBlock('b1', 'st1');

    useProjectStore.getState().setArrangement({
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [],
      chords: [],
    });

    expect(useSelectionStore.getState()).toMatchObject({
      level: 'song',
      sectionId: null,
      blockId: null,
      stemId: null,
    });
  });

  it('addChatMessage appends the message and marks the project dirty', () => {
    useProjectStore.getState().addChatMessage(makeMessage());

    expect(useProjectStore.getState().chatMessages).toHaveLength(1);
    expect(useUiStore.getState().unsavedChanges).toBe(true);
  });

  it('hydrateProject replaces prior arrangement and chat state atomically', () => {
    useProjectStore.getState().hydrateProject({
      project: makeProject(),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [makeChord()],
      chatMessages: [makeMessage()],
    });

    useProjectStore.getState().hydrateProject({
      project: makeProject({ id: 'p2', name: 'Second' }),
      stems: [makeStem({ id: 'st2', projectId: 'p2' })],
      sections: [makeSection({ id: 's2', projectId: 'p2', startBar: 9 })],
      blocks: [makeBlock({ id: 'b2', stemId: 'st2', sectionId: 's2', startBar: 9, endBar: 16 })],
      chords: [makeChord({ id: 'c2', projectId: 'p2', barNumber: 9 })],
      chatMessages: [makeMessage({ id: 'm2', projectId: 'p2', content: 'second project' })],
    });

    const state = useProjectStore.getState();
    expect(state.project?.id).toBe('p2');
    expect(state.stems.map((stem) => stem.id)).toEqual(['st2']);
    expect(state.sections.map((section) => section.id)).toEqual(['s2']);
    expect(state.blocks.map((block) => block.id)).toEqual(['b2']);
    expect(state.chords.map((chord) => chord.id)).toEqual(['c2']);
    expect(state.chatMessages.map((message) => message.id)).toEqual(['m2']);
  });

  it('hydrateProject clears stale chat when the loaded project has no messages', () => {
    useProjectStore.getState().hydrateProject({
      project: makeProject(),
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
      chatMessages: [makeMessage()],
    });

    useProjectStore.getState().hydrateProject({
      project: makeProject({ id: 'p2', name: 'Empty Chat' }),
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
      chatMessages: [],
    });

    expect(useProjectStore.getState().chatMessages).toEqual([]);
  });

  it('hydrateProject resets stale selection when switching to a different project', () => {
    useProjectStore.getState().hydrateProject({
      project: makeProject(),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [],
      chatMessages: [],
    });

    useSelectionStore.getState().selectBlock('b1', 'st1');

    useProjectStore.getState().hydrateProject({
      project: makeProject({ id: 'p2', name: 'Second' }),
      stems: [makeStem({ id: 'st2', projectId: 'p2' })],
      sections: [makeSection({ id: 's2', projectId: 'p2' })],
      blocks: [makeBlock({ id: 'b2', stemId: 'st2', sectionId: 's2' })],
      chords: [],
      chatMessages: [],
    });

    expect(useSelectionStore.getState()).toMatchObject({
      level: 'song',
      sectionId: null,
      blockId: null,
      stemId: null,
    });
  });

  it('hydrateProject clears stale selection when the reloaded arrangement no longer contains it', () => {
    useProjectStore.getState().hydrateProject({
      project: makeProject(),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [],
      chatMessages: [],
    });

    useSelectionStore.getState().selectSection('s1');

    useProjectStore.getState().hydrateProject({
      project: makeProject({ name: 'Reloaded' }),
      stems: [makeStem()],
      sections: [],
      blocks: [],
      chords: [],
      chatMessages: [],
    });

    expect(useSelectionStore.getState()).toMatchObject({
      level: 'song',
      sectionId: null,
      blockId: null,
      stemId: null,
    });
  });

  it('hydrateProject syncs session UI to the loaded project when switching projects', () => {
    useProjectStore.getState().hydrateProject({
      project: makeProject({ hasArrangement: true }),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [],
      chatMessages: [],
    });

    useUiStore.setState({
      generationState: 'generating',
      systemStatus: 'error',
      errorMessage: 'Old project failure',
      unsavedChanges: true,
      lastSavedAt: '2026-03-28T00:00:00Z',
    });

    useProjectStore.getState().hydrateProject({
      project: makeProject({ id: 'p2', name: 'Clean Slate', hasArrangement: false }),
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
      chatMessages: [],
    });

    expect(useUiStore.getState()).toMatchObject({
      generationState: 'idle',
      systemStatus: 'ready',
      errorMessage: null,
      unsavedChanges: false,
      lastSavedAt: null,
    });
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

  it('mergeBlocks clears stale selection when the selected block is merged away', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [
        makeBlock({ id: 'b1', startBar: 1, endBar: 4 }),
        makeBlock({ id: 'b2', startBar: 5, endBar: 8 }),
      ],
      chords: [],
    });

    useSelectionStore.getState().selectBlock('b2', 'st1');

    useProjectStore.getState().mergeBlocks('b1', 'b2');

    expect(useSelectionStore.getState()).toMatchObject({
      level: 'song',
      sectionId: null,
      blockId: null,
      stemId: null,
    });
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

  it('deleteBlock clears stale selection when removing the active block', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [makeBlock()], chords: [],
    });

    useSelectionStore.getState().selectBlock('b1', 'st1');

    useProjectStore.getState().deleteBlock('b1');

    expect(useSelectionStore.getState()).toMatchObject({
      level: 'song',
      sectionId: null,
      blockId: null,
      stemId: null,
    });
  });

  it('removeSection clears stale block selection when the selected block belongs to it', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()],
      sections: [makeSection({ id: 's1' })],
      blocks: [makeBlock({ id: 'b1', sectionId: 's1' })],
      chords: [],
    });

    useSelectionStore.getState().selectBlock('b1', 'st1');

    useProjectStore.getState().removeSection('s1');

    expect(useSelectionStore.getState()).toMatchObject({
      level: 'song',
      sectionId: null,
      blockId: null,
      stemId: null,
    });
  });

  it('updateSection growth reflows downstream section, block, and chord bars', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()],
      sections: [
        makeSection({ id: 's1', name: 'Verse', startBar: 1, barCount: 8 }),
        makeSection({ id: 's2', name: 'Chorus', sortOrder: 1, startBar: 9, barCount: 4 }),
      ],
      blocks: [
        makeBlock({ id: 'b1', sectionId: 's1', startBar: 1, endBar: 8 }),
        makeBlock({ id: 'b2', sectionId: 's2', startBar: 9, endBar: 12 }),
      ],
      chords: [
        makeChord({ id: 'c1', barNumber: 1 }),
        makeChord({ id: 'c2', barNumber: 9, degree: 'V', quality: 'dom7' }),
      ],
    });

    useProjectStore.getState().updateSection('s1', { barCount: 12 });

    const state = useProjectStore.getState();
    expect(state.sections.find((section) => section.id === 's1')).toMatchObject({
      barCount: 12,
      startBar: 1,
    });
    expect(state.sections.find((section) => section.id === 's2')).toMatchObject({
      startBar: 13,
    });
    expect(state.blocks.find((block) => block.id === 'b2')).toMatchObject({
      startBar: 13,
      endBar: 16,
    });
    expect(state.chords.find((chord) => chord.id === 'c2')).toMatchObject({
      barNumber: 13,
    });
  });

  it('updateSection shrink trims removed bars, shifts later data earlier, and clears selection for dropped blocks', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()],
      sections: [
        makeSection({ id: 's1', name: 'Verse', startBar: 1, barCount: 8 }),
        makeSection({ id: 's2', name: 'Chorus', sortOrder: 1, startBar: 9, barCount: 4 }),
      ],
      blocks: [
        makeBlock({ id: 'b1', sectionId: 's1', startBar: 3, endBar: 8 }),
        makeBlock({ id: 'b-removed', sectionId: 's1', startBar: 5, endBar: 8 }),
        makeBlock({ id: 'b2', sectionId: 's2', startBar: 9, endBar: 12 }),
      ],
      chords: [
        makeChord({ id: 'c1', barNumber: 3 }),
        makeChord({ id: 'c-trimmed', barNumber: 7, degree: 'ii', quality: 'min7' }),
        makeChord({ id: 'c2', barNumber: 9, degree: 'V', quality: 'dom7' }),
      ],
    });

    useSelectionStore.getState().selectBlock('b-removed', 'st1');

    useProjectStore.getState().updateSection('s1', { barCount: 4 });

    const state = useProjectStore.getState();
    expect(state.sections.find((section) => section.id === 's2')).toMatchObject({
      startBar: 5,
    });
    expect(state.blocks.map((block) => block.id)).toEqual(['b1', 'b2']);
    expect(state.blocks.find((block) => block.id === 'b1')).toMatchObject({
      startBar: 3,
      endBar: 4,
    });
    expect(state.blocks.find((block) => block.id === 'b2')).toMatchObject({
      startBar: 5,
      endBar: 8,
    });
    expect(state.chords.map((chord) => chord.id)).toEqual(['c1', 'c2']);
    expect(state.chords.find((chord) => chord.id === 'c2')).toMatchObject({
      barNumber: 5,
    });
    expect(useSelectionStore.getState()).toMatchObject({
      level: 'song',
      sectionId: null,
      blockId: null,
      stemId: null,
    });
  });

  it('updateBlock regenerates MIDI from the selected block style instead of the genre default', () => {
    useProjectStore.getState().setProject(makeProject({ hasArrangement: true, genre: 'Rock' }));
    useProjectStore.getState().setArrangement({
      stems: [makeStem()],
      sections: [makeSection({ barCount: 1 })],
      blocks: [
        makeBlock({
          style: 'block_chords',
          startBar: 1,
          endBar: 1,
          midiData: [{ note: 'C4', time: 0, duration: 1, velocity: 70 }],
        }),
      ],
      chords: [makeChord({ barNumber: 1 })],
    });

    useProjectStore.getState().updateBlock('b1', { style: 'arpeggiated' });

    const updatedBlock = useProjectStore.getState().blocks[0];
    expect(updatedBlock?.style).toBe('arpeggiated');
    expect(updatedBlock?.midiData).toHaveLength(8);
  });

  it('updateSection regenerates drum MIDI when section style overrides change', () => {
    const project = makeProject({ hasArrangement: true });
    const stem = makeStem({ id: 'st-drums', instrument: 'drums' });
    const section = makeSection({ barCount: 1 });
    const baseMidi = generateMidiForBlock(
      'drums',
      1,
      [{ bar_number: 1, degree: 'I', quality: 'maj7', bass_degree: null }],
      project.key,
      project.genre,
      {
        substyle: project.subStyle,
        energy: project.energy,
        dynamics: project.dynamics,
        swingPct: project.swingPct,
        groove: project.groove,
        feel: project.feel,
        beatsPerBar: 4,
        sectionType: section.name,
        sectionIndex: section.sortOrder,
        isLastSection: true,
        totalBarsInSection: section.barCount,
        barNumberGlobal: section.startBar,
      },
      1,
      'jazz_brush_swing'
    );
    const block = makeBlock({
      stemId: stem.id,
      startBar: 1,
      endBar: 1,
      style: 'jazz_brush_swing',
      midiData: baseMidi,
    });

    useProjectStore.getState().setProject(project);
    useProjectStore.getState().setArrangement({
      stems: [stem],
      sections: [section],
      blocks: [block],
      chords: [makeChord({ barNumber: 1 })],
    });

    useProjectStore.getState().updateSection('s1', {
      energyOverride: 90,
      dynamicsOverride: 20,
    });

    const updatedBlock = useProjectStore.getState().blocks[0];
    const expectedMidi = generateMidiForBlock(
      'drums',
      1,
      [{ bar_number: 1, degree: 'I', quality: 'maj7', bass_degree: null }],
      project.key,
      project.genre,
      {
        substyle: project.subStyle,
        energy: 90,
        dynamics: 20,
        swingPct: project.swingPct,
        groove: project.groove,
        feel: project.feel,
        beatsPerBar: 4,
        sectionType: section.name,
        sectionIndex: section.sortOrder,
        isLastSection: true,
        totalBarsInSection: section.barCount,
        barNumberGlobal: section.startBar,
      },
      1,
      'jazz_brush_swing'
    );

    expect(useProjectStore.getState().sections[0]).toMatchObject({
      energyOverride: 90,
      dynamicsOverride: 20,
    });
    expect(updatedBlock?.midiData).toEqual(expectedMidi);
    expect(updatedBlock?.midiData).not.toEqual(block.midiData);

    useProjectStore.getState().updateSection('s1', {
      energyOverride: null,
      dynamicsOverride: null,
    });

    expect(useProjectStore.getState().sections[0]).toMatchObject({
      energyOverride: null,
      dynamicsOverride: null,
    });
    expect(useProjectStore.getState().blocks[0]?.midiData).toEqual(baseMidi);
  });

  it('updateSection regenerates drum MIDI when groove, feel, and swing overrides change', () => {
    const project = makeProject({ hasArrangement: true, groove: 64, feel: 42, swingPct: 58 });
    const stem = makeStem({ id: 'st-drums', instrument: 'drums' });
    const section = makeSection({ barCount: 1 });
    const baseMidi = generateMidiForBlock(
      'drums',
      1,
      [{ bar_number: 1, degree: 'I', quality: 'maj7', bass_degree: null }],
      project.key,
      project.genre,
      {
        substyle: project.subStyle,
        energy: project.energy,
        dynamics: project.dynamics,
        swingPct: project.swingPct,
        groove: project.groove,
        feel: project.feel,
        beatsPerBar: 4,
        sectionType: section.name,
        sectionIndex: section.sortOrder,
        isLastSection: true,
        totalBarsInSection: section.barCount,
        barNumberGlobal: section.startBar,
      },
      1,
      'jazz_brush_swing'
    );
    const block = makeBlock({
      stemId: stem.id,
      startBar: 1,
      endBar: 1,
      style: 'jazz_brush_swing',
      midiData: baseMidi,
    });

    useProjectStore.getState().setProject(project);
    useProjectStore.getState().setArrangement({
      stems: [stem],
      sections: [section],
      blocks: [block],
      chords: [makeChord({ barNumber: 1 })],
    });

    useProjectStore.getState().updateSection('s1', {
      grooveOverride: 12,
      feelOverride: 83,
      swingPctOverride: 71,
    });

    const updatedBlock = useProjectStore.getState().blocks[0];
    const expectedMidi = generateMidiForBlock(
      'drums',
      1,
      [{ bar_number: 1, degree: 'I', quality: 'maj7', bass_degree: null }],
      project.key,
      project.genre,
      {
        substyle: project.subStyle,
        energy: project.energy,
        dynamics: project.dynamics,
        swingPct: 71,
        groove: 12,
        feel: 83,
        beatsPerBar: 4,
        sectionType: section.name,
        sectionIndex: section.sortOrder,
        isLastSection: true,
        totalBarsInSection: section.barCount,
        barNumberGlobal: section.startBar,
      },
      1,
      'jazz_brush_swing'
    );

    expect(useProjectStore.getState().sections[0]).toMatchObject({
      grooveOverride: 12,
      feelOverride: 83,
      swingPctOverride: 71,
    });
    expect(updatedBlock?.midiData).toEqual(expectedMidi);
    expect(updatedBlock?.midiData).not.toEqual(block.midiData);

    useProjectStore.getState().updateSection('s1', {
      grooveOverride: null,
      feelOverride: null,
      swingPctOverride: null,
    });

    expect(useProjectStore.getState().sections[0]).toMatchObject({
      grooveOverride: null,
      feelOverride: null,
      swingPctOverride: null,
    });
    expect(useProjectStore.getState().blocks[0]?.midiData).toEqual(baseMidi);
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

  it('updateSection barCount undo restores original timeline positions', () => {
    useProjectStore.getState().setProject(makeProject());
    useProjectStore.getState().setArrangement({
      stems: [makeStem()],
      sections: [
        makeSection({ id: 's1', startBar: 1, barCount: 8 }),
        makeSection({ id: 's2', sortOrder: 1, startBar: 9, barCount: 4 }),
      ],
      blocks: [
        makeBlock({ id: 'b1', sectionId: 's1', startBar: 1, endBar: 8 }),
        makeBlock({ id: 'b2', sectionId: 's2', startBar: 9, endBar: 12 }),
      ],
      chords: [
        makeChord({ id: 'c1', barNumber: 1 }),
        makeChord({ id: 'c2', barNumber: 9, degree: 'V', quality: 'dom7' }),
      ],
    });

    useProjectStore.getState().updateSection('s1', { barCount: 12 });

    const entry = useUndoStore.getState().undo();
    useProjectStore.getState().setArrangement(parseSnapshot(entry!.stateBefore)!);

    const state = useProjectStore.getState();
    expect(state.sections.find((section) => section.id === 's2')).toMatchObject({
      startBar: 9,
    });
    expect(state.blocks.find((block) => block.id === 'b2')).toMatchObject({
      startBar: 9,
      endBar: 12,
    });
    expect(state.chords.find((chord) => chord.id === 'c2')).toMatchObject({
      barNumber: 9,
    });
  });

  it('updateBlock style undo and redo preserve regenerated MIDI truth', () => {
    const originalMidi = [{ note: 'C4', time: 0, duration: 1, velocity: 70 }];

    useProjectStore.getState().setProject(makeProject({ hasArrangement: true, genre: 'Rock' }));
    useProjectStore.getState().setArrangement({
      stems: [makeStem()],
      sections: [makeSection({ barCount: 1 })],
      blocks: [
        makeBlock({
          style: 'block_chords',
          startBar: 1,
          endBar: 1,
          midiData: originalMidi,
        }),
      ],
      chords: [makeChord({ barNumber: 1 })],
    });

    useProjectStore.getState().updateBlock('b1', { style: 'arpeggiated' });

    const undoEntry = useUndoStore.getState().undo();
    useProjectStore.getState().setArrangement(parseSnapshot(undoEntry!.stateBefore)!);
    expect(useProjectStore.getState().blocks[0]).toMatchObject({
      style: 'block_chords',
      midiData: originalMidi,
    });

    const redoEntry = useUndoStore.getState().redo();
    useProjectStore.getState().setArrangement(parseSnapshot(redoEntry!.stateAfter)!);
    expect(useProjectStore.getState().blocks[0]).toMatchObject({
      style: 'arpeggiated',
    });
    expect(useProjectStore.getState().blocks[0]?.midiData).toHaveLength(8);
  });

  it('serializes an arrangement snapshot export with project, section, stem, block, and chord truth', () => {
    const serialized = serializeProjectExportSnapshot(
      {
        project: makeProject({
          name: 'Snapshot Test',
          chordChartRaw: '[Verse]\nCmaj7 | Fmaj7',
          generationHints: 'Keep it sparse',
          hasArrangement: true,
        }),
        stems: [makeStem()],
        sections: [makeSection()],
        blocks: [makeBlock()],
        chords: [makeChord()],
      },
      '2026-03-29T08:15:00.000Z'
    );

    expect(JSON.parse(serialized)).toEqual({
      version: 1,
      exportedAt: '2026-03-29T08:15:00.000Z',
      project: makeProject({
        name: 'Snapshot Test',
        chordChartRaw: '[Verse]\nCmaj7 | Fmaj7',
        generationHints: 'Keep it sparse',
        hasArrangement: true,
      }),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [makeChord()],
    });
  });
});
