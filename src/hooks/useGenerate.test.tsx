// @vitest-environment jsdom

import { act } from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGenerate } from './useGenerate';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import { useUndoStore } from '@/store/undo-store';
import type { Project } from '@/types';

const saveArrangementMock = vi.hoisted(() => vi.fn(async () => undefined));
const saveProjectMock = vi.hoisted(() => vi.fn(async () => undefined));
const generateMock = vi.hoisted(() => vi.fn());
const parseChordChartMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useProject', () => ({
  useProject: () => ({
    saveArrangement: saveArrangementMock,
    saveProject: saveProjectMock,
  }),
}));

vi.mock('@/lib/midi-generator', () => ({
  generate: generateMock,
  generateMidiForBlock: vi.fn(),
}));

vi.mock('@/lib/chord-chart-parser', () => ({
  parseChordChart: parseChordChartMock,
}));

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function makeProject(partial: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    userId: 'u1',
    name: 'Prompted Generation',
    key: 'C',
    tempo: 120,
    timeSignature: '4/4',
    genre: 'Jazz',
    subStyle: 'Swing',
    energy: 60,
    groove: 55,
    feel: 50,
    swingPct: null,
    dynamics: 50,
    generationHints: 'Brushes only',
    chordChartRaw: 'Cmaj7 | Dm7 | G7 | Cmaj7',
    hasArrangement: false,
    generatedAt: null,
    generatedTempo: null,
    createdAt: '2026-03-28T00:00:00Z',
    updatedAt: '2026-03-28T00:00:00Z',
    ...partial,
  };
}

let hookValue: ReturnType<typeof useGenerate> | null = null;
let consoleErrorSpy: ReturnType<typeof vi.spyOn> | null = null;

function UseGenerateHarness() {
  hookValue = useGenerate();
  return null;
}

function renderHarness() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(createElement(UseGenerateHarness));
  });

  return { container, root };
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  hookValue = null;
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  saveArrangementMock.mockClear();
  saveProjectMock.mockClear();
  generateMock.mockReset();
  parseChordChartMock.mockReset();

  useProjectStore.setState({
    project: makeProject(),
    stems: [],
    sections: [],
    blocks: [],
    chords: [],
    chatMessages: [],
    drumOnlyUpdate: false,
    allInstrumentsUpdate: false,
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

afterEach(() => {
  consoleErrorSpy?.mockRestore();
  consoleErrorSpy = null;

  if (mountedRoot && mountedContainer) {
    act(() => {
      mountedRoot?.unmount();
    });
    mountedContainer.remove();
  }

  mountedRoot = null;
  mountedContainer = null;
});

describe('useGenerate assistant prompt flow', () => {
  it('records setup-scoped generation summaries even when the run did not start from an assistant prompt', async () => {
    parseChordChartMock.mockReturnValue({
      chords: [{ bar_number: 1, degree: 'I', quality: 'maj7', bass_degree: null }],
    });
    generateMock.mockReturnValue({
      sections: [{ name: 'Intro', sort_order: 0, bar_count: 2, start_bar: 1 }],
      stems: [{ instrument: 'piano', sort_order: 0 }],
      blocks: [
        {
          stem_instrument: 'piano',
          section_name: 'Intro',
          start_bar: 1,
          end_bar: 2,
          chord_degree: 'I',
          chord_quality: 'maj7',
          style: 'intro_piano',
          midi_data: [],
        },
      ],
      chords: [{ bar_number: 1, degree: 'I', quality: 'maj7', bass_degree: null }],
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await hookValue!.runGeneration();
      await Promise.resolve();
    });

    const state = useProjectStore.getState();
    expect(state.chatMessages).toHaveLength(1);
    expect(state.chatMessages[0]).toMatchObject({
      role: 'assistant',
      scope: 'setup',
    });
    expect(state.chatMessages[0].content).toContain(
      'Generated 1 section across 2 bars for piano.'
    );
    expect(saveArrangementMock).toHaveBeenCalledTimes(1);
    expect(saveProjectMock).not.toHaveBeenCalled();
  });

  it('turns an assistant prompt into generation, project changes, and chat history', async () => {
    parseChordChartMock.mockReturnValue({
      chords: [{ bar_number: 1, degree: 'I', quality: 'maj7', bass_degree: null }],
    });
    generateMock.mockReturnValue({
      sections: [{ name: 'Verse', sort_order: 0, bar_count: 4, start_bar: 1 }],
      stems: [
        { instrument: 'drums', sort_order: 0 },
        { instrument: 'bass', sort_order: 1 },
      ],
      blocks: [
        {
          stem_instrument: 'drums',
          section_name: 'Verse',
          start_bar: 1,
          end_bar: 4,
          chord_degree: 'I',
          chord_quality: 'maj7',
          style: 'swing_drums',
          midi_data: [],
        },
        {
          stem_instrument: 'bass',
          section_name: 'Verse',
          start_bar: 1,
          end_bar: 4,
          chord_degree: 'I',
          chord_quality: 'maj7',
          style: 'walking_bass',
          midi_data: [],
        },
      ],
      chords: [{ bar_number: 1, degree: 'I', quality: 'maj7', bass_degree: null }],
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await hookValue!.runGeneration({ assistantPrompt: 'Make it darker' });
      await Promise.resolve();
    });

    expect(parseChordChartMock).toHaveBeenCalledWith('Cmaj7 | Dm7 | G7 | Cmaj7', 'C');
    expect(generateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        generation_hints: 'Brushes only\n\nMake it darker',
      })
    );

    const state = useProjectStore.getState();
    expect(state.project).toMatchObject({
      hasArrangement: true,
      generatedTempo: 120,
    });
    expect(state.sections).toHaveLength(1);
    expect(state.blocks).toHaveLength(2);
    expect(state.chatMessages).toHaveLength(2);
    expect(state.chatMessages[0]).toMatchObject({
      role: 'user',
      content: 'Make it darker',
    });
    expect(state.chatMessages[1]).toMatchObject({
      role: 'assistant',
    });
    expect(state.chatMessages[1].content).toContain(
      'Applied your latest request and generated 1 section across 4 bars'
    );
    expect(useUiStore.getState()).toMatchObject({
      generationState: 'complete',
      systemStatus: 'ready',
      errorMessage: null,
    });
    expect(saveArrangementMock).toHaveBeenCalledTimes(1);
    expect(saveProjectMock).not.toHaveBeenCalled();
  });

  it('treats assistant revisions on an existing arrangement as regenerations with undo history', async () => {
    parseChordChartMock.mockReturnValue({
      chords: [{ bar_number: 1, degree: 'ii', quality: 'min7', bass_degree: null }],
    });
    generateMock.mockReturnValue({
      sections: [{ name: 'Bridge', sort_order: 0, bar_count: 4, start_bar: 1 }],
      stems: [{ instrument: 'piano', sort_order: 0 }],
      blocks: [
        {
          stem_instrument: 'piano',
          section_name: 'Bridge',
          start_bar: 1,
          end_bar: 4,
          chord_degree: 'ii',
          chord_quality: 'min7',
          style: 'bridge_comp',
          midi_data: [],
        },
      ],
      chords: [{ bar_number: 1, degree: 'ii', quality: 'min7', bass_degree: null }],
    });

    useProjectStore.setState({
      project: makeProject({
        hasArrangement: true,
        generatedAt: '2026-03-28T00:00:00Z',
        generatedTempo: 120,
      }),
      stems: [
        {
          id: 'stem-existing',
          projectId: 'p1',
          instrument: 'piano',
          sortOrder: 0,
          volume: 0.8,
          pan: 0,
          isMuted: false,
          isSolo: false,
          createdAt: '2026-03-28T00:00:00Z',
        },
      ],
      sections: [
        {
          id: 'section-existing',
          projectId: 'p1',
          name: 'Verse',
          sortOrder: 0,
          barCount: 4,
          startBar: 1,
          energyOverride: null,
          grooveOverride: null,
          feelOverride: null,
          swingPctOverride: null,
          dynamicsOverride: null,
          createdAt: '2026-03-28T00:00:00Z',
        },
      ],
      blocks: [
        {
          id: 'block-existing',
          stemId: 'stem-existing',
          sectionId: 'section-existing',
          startBar: 1,
          endBar: 4,
          chordDegree: 'I',
          chordQuality: 'maj7',
          chordBassDegree: null,
          style: 'old_comp',
          energyOverride: null,
          dynamicsOverride: null,
          midiData: [],
          createdAt: '2026-03-28T00:00:00Z',
        },
      ],
      chords: [
        {
          id: 'chord-existing',
          projectId: 'p1',
          barNumber: 1,
          degree: 'I',
          quality: 'maj7',
          bassDegree: null,
        },
      ],
      chatMessages: [],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await hookValue!.runGeneration({ assistantPrompt: 'Revoice the bridge' });
      await Promise.resolve();
    });

    const state = useProjectStore.getState();
    expect(state.chatMessages).toHaveLength(2);
    expect(state.chatMessages[1].content).toContain(
      'Applied your latest request and regenerated 1 section across 4 bars for piano.'
    );
    expect(useUndoStore.getState().undoStack).toHaveLength(1);
    expect(useUndoStore.getState().undoStack[0]?.description).toBe('Full regeneration');
    expect(saveArrangementMock).toHaveBeenCalledTimes(1);
    expect(saveProjectMock).not.toHaveBeenCalled();
  });

  it('records setup-scoped failures even when generation was not assistant-initiated', async () => {
    parseChordChartMock.mockReturnValue({
      chords: [{ bar_number: 1, degree: 'I', quality: 'maj7', bass_degree: null }],
    });
    generateMock.mockImplementation(() => {
      throw new Error('Generator offline');
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await hookValue!.runGeneration();
      await Promise.resolve();
    });

    const state = useProjectStore.getState();
    expect(state.chatMessages).toHaveLength(1);
    expect(state.chatMessages[0]).toMatchObject({
      role: 'assistant',
      scope: 'setup',
      content: 'Generation failed: Generator offline',
    });
    expect(useUiStore.getState()).toMatchObject({
      generationState: 'idle',
      systemStatus: 'error',
      errorMessage: 'Generator offline',
    });
    expect(saveArrangementMock).not.toHaveBeenCalled();
    expect(saveProjectMock).toHaveBeenCalledTimes(1);
  });

  it('records assistant-visible failures and persists the chat history on generation error', async () => {
    parseChordChartMock.mockReturnValue({
      chords: [{ bar_number: 1, degree: 'I', quality: 'maj7', bass_degree: null }],
    });
    generateMock.mockImplementation(() => {
      throw new Error('Generator offline');
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await hookValue!.runGeneration({ assistantPrompt: 'Thin out the drums' });
      await Promise.resolve();
    });

    const state = useProjectStore.getState();
    expect(state.chatMessages).toHaveLength(2);
    expect(state.chatMessages[0]).toMatchObject({
      role: 'user',
      content: 'Thin out the drums',
    });
    expect(state.chatMessages[1]).toMatchObject({
      role: 'assistant',
      scope: 'song',
      content: 'Generation failed: Generator offline',
    });
    expect(useUiStore.getState()).toMatchObject({
      generationState: 'idle',
      systemStatus: 'error',
      errorMessage: 'Generator offline',
    });
    expect(saveArrangementMock).not.toHaveBeenCalled();
    expect(saveProjectMock).toHaveBeenCalledTimes(1);
  });
});
