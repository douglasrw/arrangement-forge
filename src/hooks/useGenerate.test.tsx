// @vitest-environment jsdom

import { act } from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGenerate } from './useGenerate';
import { useProjectStore } from '@/store/project-store';
import { useSelectionStore } from '@/store/selection-store';
import { useUiStore } from '@/store/ui-store';
import { useUndoStore } from '@/store/undo-store';
import type { Project } from '@/types';

const saveArrangementMock = vi.hoisted(() => vi.fn(async () => undefined));
const saveProjectMock = vi.hoisted(() => vi.fn(async () => undefined));
const generateMock = vi.hoisted(() => vi.fn());
const generateMidiForBlockMock = vi.hoisted(() => vi.fn());
const getMidiGenerationReadinessTruthMock = vi.hoisted(() => vi.fn());
const parseChordChartMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useProject', () => ({
  useProject: () => ({
    saveArrangement: saveArrangementMock,
    saveProject: saveProjectMock,
  }),
}));

vi.mock('@/lib/midi-generator', () => ({
  generate: generateMock,
  generateMidiForBlock: generateMidiForBlockMock,
  getMidiGenerationReadinessTruth: getMidiGenerationReadinessTruthMock,
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
  saveArrangementMock.mockImplementation(async () => {
    const currentProject = useProjectStore.getState().project;

    if (!currentProject) {
      return;
    }

    useProjectStore.setState({
      project: {
        ...currentProject,
        hasArrangement: true,
      },
    });
  });
  saveProjectMock.mockClear();
  generateMock.mockReset();
  generateMidiForBlockMock.mockReset();
  getMidiGenerationReadinessTruthMock.mockReset();
  parseChordChartMock.mockReset();
  getMidiGenerationReadinessTruthMock.mockReturnValue({
    state: 'ready',
    currentState: 'MIDI generation is ready to build a full arrangement in 4/4.',
    summary: 'The current meter matches the supported full-arrangement generator path.',
    nextStep: 'Generate when the chord chart is ready.',
  });

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
  useSelectionStore.setState({
    level: 'song',
    sectionId: null,
    blockId: null,
    stemId: null,
  });
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
  it('passes imported upload notes into generation hints on the next generate run', async () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: '[Verse]\nCmaj7 | Dm7 | G7 | Cmaj7',
        generationHints: 'Jazz waltz\nBrushes on snare',
      }),
    });

    parseChordChartMock.mockReturnValue({
      chords: [{ bar_number: 1, degree: 'I', quality: 'maj7', bass_degree: null }],
    });
    generateMock.mockReturnValue({
      sections: [{ name: 'Verse', sort_order: 0, bar_count: 4, start_bar: 1 }],
      stems: [{ instrument: 'piano', sort_order: 0 }],
      blocks: [
        {
          stem_instrument: 'piano',
          section_name: 'Verse',
          start_bar: 1,
          end_bar: 4,
          chord_degree: 'I',
          chord_quality: 'maj7',
          style: 'swing_piano',
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

    expect(parseChordChartMock).toHaveBeenCalledWith('[Verse]\nCmaj7 | Dm7 | G7 | Cmaj7', 'C');
    expect(generateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        generation_hints: 'Jazz waltz\nBrushes on snare',
      })
    );
  });

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

  it('keeps no-playable-result summaries honest when the generator returns blocked readiness truth', async () => {
    parseChordChartMock.mockReturnValue({
      chords: [{ bar_number: 1, degree: 'I', quality: 'maj7', bass_degree: null }],
    });
    generateMock.mockReturnValue({
      sections: [],
      stems: [{ instrument: 'piano', sort_order: 0 }],
      blocks: [],
      chords: [{ bar_number: 1, degree: 'I', quality: 'maj7', bass_degree: null }],
      truth: {
        summary: 'The current chord chart did not produce a playable arrangement yet.',
        currentState: 'No playable arrangement sections are ready yet.',
        nextStep: 'Adjust the chord chart or instrument setup, then generate again.',
      },
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
      content:
        'Generation completed, but no playable arrangement is ready yet. The current chord chart did not produce a playable arrangement yet. Current state: No playable arrangement sections are ready yet. Next step: Adjust the chord chart or instrument setup, then generate again.',
    });
  });

  it('blocks generation when chord parsing still has unresolved bars', async () => {
    parseChordChartMock.mockReturnValue({
      chords: [
        { bar_number: 1, degree: 'I', quality: 'maj7', bass_degree: null },
        { bar_number: 2, degree: null, quality: null, bass_degree: null },
      ],
      warnings: ['Bar 2: could not parse "xyz??", treated as N.C.'],
      issues: [
        {
          barNumber: 2,
          token: 'xyz??',
          reason: 'invalid_token',
          message: 'Bar 2: could not parse "xyz??", treated as N.C.',
        },
      ],
      truth: {
        state: 'blocked',
        currentState:
          '1 of 2 bars are ready. Bar 2 currently parses as N.C., so Generate stays blocked until the chart is fixed.',
        summary: '1 bar has an unrecognized chord token.',
        nextStep: 'Fix or replace bar 2 before generating.',
        blockedTokenLabels: ['bar 2 "xyz??"'],
        issueHighlights: ['Line 1, bar 2: could not parse "xyz??"'],
        remainingIssueCount: 0,
      },
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await hookValue!.runGeneration();
      await Promise.resolve();
    });

    expect(generateMock).not.toHaveBeenCalled();
    expect(saveArrangementMock).not.toHaveBeenCalled();
    expect(useUiStore.getState()).toMatchObject({
      generationState: 'idle',
      systemStatus: 'error',
      errorMessage:
        '1 of 2 bars are ready. Bar 2 currently parses as N.C., so Generate stays blocked until the chart is fixed. 1 bar has an unrecognized chord token. Next step: Fix or replace bar 2 before generating. Blocked tokens: bar 2 "xyz??". Flagged chart locations: Line 1, bar 2: could not parse "xyz??"',
    });
    expect(saveProjectMock).toHaveBeenCalledTimes(1);
    expect(useProjectStore.getState().chatMessages).toHaveLength(1);
    expect(useProjectStore.getState().chatMessages[0]).toMatchObject({
      role: 'assistant',
      scope: 'setup',
      content:
        'Generation failed: 1 of 2 bars are ready. Bar 2 currently parses as N.C., so Generate stays blocked until the chart is fixed. 1 bar has an unrecognized chord token. Next step: Fix or replace bar 2 before generating. Blocked tokens: bar 2 "xyz??". Flagged chart locations: Line 1, bar 2: could not parse "xyz??"',
    });
  });

  it('blocks generation when the chart has no playable bars yet', async () => {
    parseChordChartMock.mockReturnValue({
      chords: [],
      warnings: [],
      issues: [],
      truth: {
        state: 'blocked',
        currentState:
          'No playable chord bars are present yet, so Generate stays blocked until the chart includes at least one chord bar.',
        summary: 'Section labels and blank lines do not create playable bars on their own.',
        nextStep: 'Add at least one chord bar such as Cmaj7 | Fmaj7 | G7 | Cmaj7.',
      },
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await hookValue!.runGeneration();
      await Promise.resolve();
    });

    expect(generateMock).not.toHaveBeenCalled();
    expect(saveArrangementMock).not.toHaveBeenCalled();
    expect(useUiStore.getState()).toMatchObject({
      generationState: 'idle',
      systemStatus: 'error',
      errorMessage:
        'No playable chord bars are present yet, so Generate stays blocked until the chart includes at least one chord bar. Section labels and blank lines do not create playable bars on their own. Next step: Add at least one chord bar such as Cmaj7 | Fmaj7 | G7 | Cmaj7.',
    });
    expect(saveProjectMock).toHaveBeenCalledTimes(1);
    expect(useProjectStore.getState().chatMessages[0]).toMatchObject({
      role: 'assistant',
      scope: 'setup',
      content:
        'Generation failed: No playable chord bars are present yet, so Generate stays blocked until the chart includes at least one chord bar. Section labels and blank lines do not create playable bars on their own. Next step: Add at least one chord bar such as Cmaj7 | Fmaj7 | G7 | Cmaj7.',
    });
  });

  it('blocks generation when the chart only contains no-chord bars', async () => {
    parseChordChartMock.mockReturnValue({
      chords: [
        { bar_number: 1, degree: null, quality: null, bass_degree: null },
        { bar_number: 2, degree: null, quality: null, bass_degree: null },
      ],
      warnings: [],
      issues: [],
      truth: {
        state: 'blocked',
        currentState:
          'The current chart only contains N.C. or rest bars, so Generate stays blocked until at least one playable chord bar is entered.',
        summary: 'Bars marked as N.C. or rest do not create playable harmony on their own.',
        nextStep:
          'Replace at least one N.C. or rest bar with a chord such as Cmaj7 | Fmaj7 | G7 | Cmaj7.',
      },
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await hookValue!.runGeneration();
      await Promise.resolve();
    });

    expect(generateMock).not.toHaveBeenCalled();
    expect(saveArrangementMock).not.toHaveBeenCalled();
    expect(useUiStore.getState()).toMatchObject({
      generationState: 'idle',
      systemStatus: 'error',
      errorMessage:
        'The current chart only contains N.C. or rest bars, so Generate stays blocked until at least one playable chord bar is entered. Bars marked as N.C. or rest do not create playable harmony on their own. Next step: Replace at least one N.C. or rest bar with a chord such as Cmaj7 | Fmaj7 | G7 | Cmaj7.',
    });
    expect(saveProjectMock).toHaveBeenCalledTimes(1);
    expect(useProjectStore.getState().chatMessages[0]).toMatchObject({
      role: 'assistant',
      scope: 'setup',
      content:
        'Generation failed: The current chart only contains N.C. or rest bars, so Generate stays blocked until at least one playable chord bar is entered. Bars marked as N.C. or rest do not create playable harmony on their own. Next step: Replace at least one N.C. or rest bar with a chord such as Cmaj7 | Fmaj7 | G7 | Cmaj7.',
    });
  });

  it('blocks generation when the project time signature is outside the supported full-arrangement meter', async () => {
    useProjectStore.setState({
      project: makeProject({
        timeSignature: '3/4',
      }),
    });
    getMidiGenerationReadinessTruthMock.mockReturnValue({
      state: 'blocked',
      currentState:
        'MIDI generation is blocked for 3/4 because the current pitched-instrument generator patterns are only verified for 4/4.',
      summary:
        'Drum patterns can adapt to other meters, but bass, piano, guitar, and strings still assume 4-beat bars.',
      nextStep: 'Switch the project time signature to 4/4 before generating a full arrangement.',
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await hookValue!.runGeneration();
      await Promise.resolve();
    });

    expect(parseChordChartMock).not.toHaveBeenCalled();
    expect(generateMock).not.toHaveBeenCalled();
    expect(saveArrangementMock).not.toHaveBeenCalled();
    expect(useUiStore.getState()).toMatchObject({
      generationState: 'idle',
      systemStatus: 'error',
      errorMessage:
        'MIDI generation is blocked for 3/4 because the current pitched-instrument generator patterns are only verified for 4/4. Drum patterns can adapt to other meters, but bass, piano, guitar, and strings still assume 4-beat bars. Next step: Switch the project time signature to 4/4 before generating a full arrangement.',
    });
    expect(saveProjectMock).toHaveBeenCalledTimes(1);
    expect(useProjectStore.getState().chatMessages[0]).toMatchObject({
      role: 'assistant',
      scope: 'setup',
      content:
        'Generation failed: MIDI generation is blocked for 3/4 because the current pitched-instrument generator patterns are only verified for 4/4. Drum patterns can adapt to other meters, but bass, piano, guitar, and strings still assume 4-beat bars. Next step: Switch the project time signature to 4/4 before generating a full arrangement.',
    });
  });

  it('turns an assistant prompt into generation, project changes, and chat history', async () => {
    const persistedFlagsSeenBeforeSave: boolean[] = [];

    saveArrangementMock.mockImplementationOnce(async () => {
      persistedFlagsSeenBeforeSave.push(Boolean(useProjectStore.getState().project?.hasArrangement));

      const currentProject = useProjectStore.getState().project;
      if (!currentProject) {
        return;
      }

      useProjectStore.setState({
        project: {
          ...currentProject,
          hasArrangement: true,
        },
      });
    });

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
    expect(persistedFlagsSeenBeforeSave).toEqual([false]);
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
      scope: 'song',
      scopeTarget: 'Whole song default',
    });
    expect(state.chatMessages[1]).toMatchObject({
      role: 'assistant',
      scope: 'song',
      scopeTarget: 'Whole song default',
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

  it('keeps assistant-prompt chat history scoped to the selected section', async () => {
    useProjectStore.setState({
      sections: [
        {
          id: 'section-existing',
          projectId: 'p1',
          name: 'Bridge',
          sortOrder: 0,
          barCount: 4,
          startBar: 9,
          energyOverride: null,
          grooveOverride: null,
          feelOverride: null,
          swingPctOverride: null,
          dynamicsOverride: null,
          createdAt: '2026-03-28T00:00:00Z',
        },
      ],
    });
    useSelectionStore.setState({
      level: 'section',
      sectionId: 'section-existing',
      blockId: null,
      stemId: null,
    });
    parseChordChartMock.mockReturnValue({
      chords: [{ bar_number: 1, degree: 'I', quality: 'maj7', bass_degree: null }],
    });
    generateMock.mockReturnValue({
      sections: [{ name: 'Bridge', sort_order: 0, bar_count: 4, start_bar: 9 }],
      stems: [{ instrument: 'piano', sort_order: 0 }],
      blocks: [
        {
          stem_instrument: 'piano',
          section_name: 'Bridge',
          start_bar: 9,
          end_bar: 12,
          chord_degree: 'I',
          chord_quality: 'maj7',
          style: 'bridge_comp',
          midi_data: [],
        },
      ],
      chords: [{ bar_number: 9, degree: 'I', quality: 'maj7', bass_degree: null }],
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await hookValue!.runGeneration({ assistantPrompt: 'Open up the voicings' });
      await Promise.resolve();
    });

    expect(useProjectStore.getState().chatMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          scope: 'section',
          scopeTarget: 'Bridge (bars 9-12)',
        }),
        expect.objectContaining({
          role: 'assistant',
          scope: 'section',
          scopeTarget: 'Bridge (bars 9-12)',
        }),
      ])
    );
  });

  it('marks assistant-prompt chat history as a whole-song fallback when the selection is stale', async () => {
    useSelectionStore.setState({
      level: 'block',
      sectionId: null,
      blockId: 'missing-block',
      stemId: 'missing-stem',
    });
    parseChordChartMock.mockReturnValue({
      chords: [{ bar_number: 1, degree: 'I', quality: 'maj7', bass_degree: null }],
    });
    generateMock.mockReturnValue({
      sections: [{ name: 'Verse', sort_order: 0, bar_count: 4, start_bar: 1 }],
      stems: [{ instrument: 'piano', sort_order: 0 }],
      blocks: [
        {
          stem_instrument: 'piano',
          section_name: 'Verse',
          start_bar: 1,
          end_bar: 4,
          chord_degree: 'I',
          chord_quality: 'maj7',
          style: 'verse_comp',
          midi_data: [],
        },
      ],
      chords: [{ bar_number: 1, degree: 'I', quality: 'maj7', bass_degree: null }],
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await hookValue!.runGeneration({ assistantPrompt: 'Tighten the groove' });
      await Promise.resolve();
    });

    expect(useProjectStore.getState().chatMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          scope: 'song',
          scopeTarget: 'Whole song fallback',
        }),
        expect.objectContaining({
          role: 'assistant',
          scope: 'song',
          scopeTarget: 'Whole song fallback',
        }),
      ])
    );
  });

  it('drops stored swing_pct from generation requests for straight-time genres', async () => {
    useProjectStore.setState({
      project: makeProject({
        genre: 'Rock',
        subStyle: 'Classic',
        swingPct: 67,
      }),
    });

    parseChordChartMock.mockReturnValue({
      chords: [{ bar_number: 1, degree: 'I', quality: 'maj7', bass_degree: null }],
    });
    generateMock.mockReturnValue({
      sections: [{ name: 'Verse', sort_order: 0, bar_count: 4, start_bar: 1 }],
      stems: [{ instrument: 'drums', sort_order: 0 }],
      blocks: [
        {
          stem_instrument: 'drums',
          section_name: 'Verse',
          start_bar: 1,
          end_bar: 4,
          chord_degree: 'I',
          chord_quality: 'maj7',
          style: 'rock_straight',
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

    expect(generateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        genre: 'Rock',
        sub_style: 'Classic',
        swing_pct: null,
      })
    );
  });

  it('treats assistant revisions on loaded draft arrangement rows as regenerations with undo history', async () => {
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
        hasArrangement: false,
        generatedAt: null,
        generatedTempo: null,
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
    expect(useUndoStore.getState().undoStack[0]?.description).toBe(
      'Assistant revision: Revoice the bridge'
    );
    expect(useUndoStore.getState().getUndoDescription()).toBe(
      'Undo: Assistant revision: Revoice the bridge'
    );
    expect(saveArrangementMock).toHaveBeenCalledTimes(1);
    expect(saveProjectMock).not.toHaveBeenCalled();
  });

  it('names plain regenerations so undo truth does not fall back to a generic label', async () => {
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
      await hookValue!.runGeneration();
      await Promise.resolve();
    });

    expect(useUndoStore.getState().undoStack).toHaveLength(1);
    expect(useUndoStore.getState().undoStack[0]?.description).toBe('Arrangement regeneration');
    expect(useUndoStore.getState().getUndoDescription()).toBe('Undo: Arrangement regeneration');
  });

  it('keeps regeneration state complete when a loaded draft arrangement fails to regenerate', async () => {
    parseChordChartMock.mockReturnValue({
      chords: [{ bar_number: 1, degree: 'ii', quality: 'min7', bass_degree: null }],
    });
    generateMock.mockImplementation(() => {
      throw new Error('Generator offline');
    });

    useProjectStore.setState({
      project: makeProject({
        hasArrangement: false,
        generatedAt: null,
        generatedTempo: null,
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

    expect(useUiStore.getState()).toMatchObject({
      generationState: 'complete',
      systemStatus: 'error',
      errorMessage: 'Generator offline',
    });
    expect(saveArrangementMock).not.toHaveBeenCalled();
    expect(saveProjectMock).toHaveBeenCalledTimes(1);
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

  it('regenerateAllInstruments preserves block style and block start bar for loaded draft arrangement rows', async () => {
    generateMidiForBlockMock.mockImplementation(
      (
        _instrument: string,
        _barCount: number,
        _chords: unknown,
        _key: string,
        _genre: string,
        _drumContext: unknown,
        startBar?: number,
        styleOverride?: string
      ) => [
        {
          note: 'C4',
          time: startBar ?? 0,
          duration: 1,
          velocity: styleOverride === 'arpeggiated' ? 99 : 60,
        },
      ]
    );

    useProjectStore.setState({
      project: makeProject({ hasArrangement: false, genre: 'Rock' }),
      stems: [
        {
          id: 'stem-piano',
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
          id: 'section-chorus',
          projectId: 'p1',
          name: 'Chorus',
          sortOrder: 0,
          barCount: 1,
          startBar: 5,
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
          id: 'block-piano',
          stemId: 'stem-piano',
          sectionId: 'section-chorus',
          startBar: 5,
          endBar: 5,
          chordDegree: 'I',
          chordQuality: 'maj7',
          chordBassDegree: null,
          style: 'arpeggiated',
          energyOverride: null,
          dynamicsOverride: null,
          midiData: [],
          createdAt: '2026-03-28T00:00:00Z',
        },
      ],
      chords: [
        {
          id: 'chord-5',
          projectId: 'p1',
          barNumber: 5,
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
      hookValue!.regenerateAllInstruments();
      await Promise.resolve();
    });

    expect(generateMidiForBlockMock).toHaveBeenCalledWith(
      'piano',
      1,
      expect.arrayContaining([
        expect.objectContaining({ bar_number: 5, degree: 'I' }),
      ]),
      'C',
      'Rock',
      undefined,
      5,
      'arpeggiated'
    );
    expect(useProjectStore.getState().allInstrumentsUpdate).toBe(true);
    expect(useProjectStore.getState().blocks[0]?.midiData[0]).toMatchObject({
      time: 5,
      velocity: 99,
    });
  });
});
