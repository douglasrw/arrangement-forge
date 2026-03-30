// @vitest-environment jsdom

import { act, createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { getProjectExportReadiness, getProjectSavePlan, useProject } from './useProject';
import type { LoadProjectResult } from './useProject';
import { useAuthStore } from '@/store/auth-store';
import { useProjectStore } from '@/store/project-store';
import { useSelectionStore } from '@/store/selection-store';
import { useUiStore } from '@/store/ui-store';
import type { AiChatMessage, Chord, Project } from '@/types';

type Row = Record<string, unknown>;
type TableResponse = {
  data?: Row[] | Row | null;
  error?: Error | null;
  singleData?: Row | null;
};

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));
const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: supabaseMock.from,
  },
}));

function createTableQuery(response: TableResponse = {}) {
  const data = response.data ?? [];
  const error = response.error ?? null;
  const directPromise = Promise.resolve({ data, error });

  const filteredQuery = {
    order: () => Promise.resolve({ data, error }),
    single: () =>
      Promise.resolve({
        data: response.singleData ?? (Array.isArray(data) ? data[0] ?? null : data),
        error,
      }),
    maybeSingle: () =>
      Promise.resolve({
        data: response.singleData ?? (Array.isArray(data) ? data[0] ?? null : data),
        error,
      }),
    then: directPromise.then.bind(directPromise),
    catch: directPromise.catch.bind(directPromise),
    finally: directPromise.finally.bind(directPromise),
  };

  return {
    select: () => ({
      eq: () => filteredQuery,
      in: () =>
        Promise.resolve({
          data: Array.isArray(data) ? data : data ? [data] : [],
          error,
        }),
    }),
  };
}

function buildStoredProject(projectId: string, hasArrangement = false): Project {
  return {
    id: projectId,
    userId: 'user-1',
    name: `Project ${projectId}`,
    key: 'C',
    tempo: 120,
    timeSignature: '4/4',
    genre: 'Jazz',
    subStyle: 'Swing',
    energy: 50,
    groove: 50,
    feel: 50,
    swingPct: null,
    dynamics: 50,
    generationHints: '',
    chordChartRaw: 'Cmaj7 | Dm7 | G7 | Cmaj7',
    hasArrangement,
    generatedAt: hasArrangement ? '2026-03-28T00:00:00Z' : null,
    generatedTempo: hasArrangement ? 120 : null,
    createdAt: '2026-03-28T00:00:00Z',
    updatedAt: '2026-03-28T00:00:00Z',
  };
}

function buildStoredMessage(projectId: string, partial: Partial<AiChatMessage> = {}): AiChatMessage {
  return {
    id: `${projectId}-message`,
    projectId,
    role: 'assistant',
    content: `Chat for ${projectId}`,
    scope: 'song',
    scopeTarget: null,
    createdAt: '2026-03-28T00:00:00Z',
    ...partial,
  };
}

function buildProjectRows(projectId: string, options: { hasArrangement: boolean; includeContent: boolean }) {
  const { hasArrangement, includeContent } = options;
  const stemId = `${projectId}-stem`;
  const sectionId = `${projectId}-section`;
  const blockId = `${projectId}-block`;
  const userIdKey = ['user', 'id'].join('_');

  return {
    projects: {
      singleData: {
        id: projectId,
        [userIdKey]: 'user-1',
        name: `Project ${projectId}`,
        key: 'C',
        tempo: 120,
        time_signature: '4/4',
        genre: 'Jazz',
        sub_style: 'Swing',
        energy: 50,
        groove: 50,
        feel: 50,
        swing_pct: null,
        dynamics: 50,
        generation_hints: '',
        chord_chart_raw: '',
        has_arrangement: hasArrangement,
        generated_at: hasArrangement ? '2026-03-28T00:00:00Z' : null,
        generated_tempo: hasArrangement ? 120 : null,
        created_at: '2026-03-28T00:00:00Z',
        updated_at: '2026-03-28T00:00:00Z',
      },
    },
    stems: {
      data: includeContent
        ? [
            {
              id: stemId,
              project_id: projectId,
              instrument: 'piano',
              sort_order: 0,
              volume: 0.8,
              pan: 0,
              is_muted: false,
              is_solo: false,
              created_at: '2026-03-28T00:00:00Z',
            },
          ]
        : [],
    },
    sections: {
      data: includeContent
        ? [
            {
              id: sectionId,
              project_id: projectId,
              name: 'Verse',
              sort_order: 0,
              bar_count: 8,
              start_bar: 1,
              energy_override: null,
              groove_override: null,
              feel_override: null,
              swing_pct_override: null,
              dynamics_override: null,
              created_at: '2026-03-28T00:00:00Z',
            },
          ]
        : [],
    },
    chords: {
      data: includeContent
        ? [
            {
              id: `${projectId}-chord`,
              project_id: projectId,
              bar_number: 1,
              degree: 'I',
              quality: 'maj7',
              bass_degree: null,
            },
          ]
        : [],
    },
    ai_chat_messages: {
      data: includeContent
        ? [
            {
              id: `${projectId}-message`,
              project_id: projectId,
              role: 'assistant',
              content: `Chat for ${projectId}`,
              scope: 'song',
              scope_target: null,
              created_at: '2026-03-28T00:00:00Z',
            },
          ]
        : [],
    },
    blocks: {
      data: includeContent
        ? [
            {
              id: blockId,
              stem_id: stemId,
              section_id: sectionId,
              start_bar: 1,
              end_bar: 8,
              chord_degree: 'I',
              chord_quality: 'maj7',
              chord_bass_degree: null,
              style: 'jazz_comp',
              energy_override: null,
              dynamics_override: null,
              midi_data: [],
              created_at: '2026-03-28T00:00:00Z',
            },
          ]
        : [],
    },
  };
}

let hookValue: ReturnType<typeof useProject> | null = null;

function UseProjectHarness() {
  hookValue = useProject();
  return null;
}

function renderHarness() {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = createRoot(container);

  act(() => {
    root.render(createElement(UseProjectHarness));
  });

  return { container, root };
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;
let tableResponses: Record<string, TableResponse> = {};

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  tableResponses = {};
  hookValue = null;

  supabaseMock.from.mockImplementation((table: string) => createTableQuery(tableResponses[table]));

  useProjectStore.setState({
    project: null,
    stems: [],
    sections: [],
    blocks: [],
    chords: [],
    chatMessages: [],
    drumOnlyUpdate: false,
    allInstrumentsUpdate: false,
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
  useAuthStore.setState({
    user: null,
    profile: null,
    isLoading: false,
    isAuthenticated: false,
  });
});

afterEach(() => {
  if (mountedRoot && mountedContainer) {
    act(() => {
      mountedRoot?.unmount();
    });
    mountedContainer.remove();
  }

  mountedRoot = null;
  mountedContainer = null;
});

describe('useProject export readiness', () => {
  it('treats arrangement rows as exportable truth even when the chord chart and description are blank', () => {
    const readiness = getProjectExportReadiness({
      project: {
        ...buildStoredProject('project-arrangement', true),
        chordChartRaw: '   ',
        generationHints: '   ',
      },
      stems: [],
      sections: [],
      blocks: [],
      chords: [
        {
          id: 'chord-1',
          projectId: 'project-arrangement',
          barNumber: 1,
          degree: 'I',
          quality: 'maj7',
          bassDegree: null,
        } satisfies Chord,
      ],
    });

    expect(readiness).toEqual({
      canExport: true,
      hasTextTruth: false,
      hasArrangementRows: true,
      arrangementTruth: {
        status: 'loaded-and-persisted',
        hasArrangementRows: true,
        hasPersistedArrangement: true,
        hasAnyArrangementTruth: true,
        summary: 'Loaded arrangement rows and a saved arrangement snapshot both exist right now.',
        nextStep: 'Save the loaded arrangement rows if you want them to replace the saved arrangement snapshot.',
      },
      message: 'Download chord chart and arrangement snapshot',
    });
  });

  it('explains the blocked export state when saved arrangement metadata exists without loaded rows', () => {
    const readiness = getProjectExportReadiness({
      project: {
        ...buildStoredProject('project-saved-only', true),
        chordChartRaw: '   ',
        generationHints: '   ',
      },
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
    });

    expect(readiness).toEqual({
      canExport: false,
      hasTextTruth: false,
      hasArrangementRows: false,
      arrangementTruth: {
        status: 'persisted-only',
        hasArrangementRows: false,
        hasPersistedArrangement: true,
        hasAnyArrangementTruth: true,
        summary: 'A saved arrangement snapshot exists, but its rows are not loaded in the project store right now.',
        nextStep: 'Reload the arrangement rows before editing, saving, or exporting the current arrangement snapshot.',
      },
      message: 'Reload the saved arrangement rows before exporting the arrangement snapshot',
    });
  });

  it('stays disabled only when the current project has no exportable truth', () => {
    const readiness = getProjectExportReadiness({
      project: {
        ...buildStoredProject('project-empty'),
        chordChartRaw: '   ',
        generationHints: '   ',
      },
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
    });

    expect(readiness).toEqual({
      canExport: false,
      hasTextTruth: false,
      hasArrangementRows: false,
      arrangementTruth: {
        status: 'missing',
        hasArrangementRows: false,
        hasPersistedArrangement: false,
        hasAnyArrangementTruth: false,
        summary: 'No arrangement rows or saved arrangement snapshot exist yet.',
        nextStep: 'Generate or import an arrangement before saving or exporting arrangement rows.',
      },
      message: 'Add a chord chart, description, or arrangement to export',
    });
  });
});

describe('useProject save planning', () => {
  it('chooses arrangement persistence when draft arrangement rows exist', () => {
    const plan = getProjectSavePlan({
      project: buildStoredProject('project-arrangement-draft'),
      stems: [
        {
          id: 'stem-1',
          projectId: 'project-arrangement-draft',
          instrument: 'piano',
          sortOrder: 0,
          volume: 0.8,
          pan: 0,
          isMuted: false,
          isSolo: false,
          createdAt: '2026-03-28T00:00:00Z',
        },
      ],
      sections: [],
      blocks: [],
      chords: [],
    });

    expect(plan).toEqual({
      saveStatus: 'arrangement-draft',
      saveTarget: 'arrangement',
      nextStep: 'save-arrangement',
      statusLabel: 'Arrangement draft',
      savingLabel: 'Saving arrangement draft…',
      currentState: 'Loaded arrangement rows exist only in the current draft state.',
      summary: 'Saving now will create the first saved arrangement snapshot from the loaded arrangement rows.',
      arrangementTruth: {
        status: 'draft-only',
        hasArrangementRows: true,
        hasPersistedArrangement: false,
        hasAnyArrangementTruth: true,
        summary: 'Arrangement rows are loaded, but no saved arrangement snapshot exists yet.',
        nextStep: 'Save the current arrangement rows to create the first saved arrangement snapshot.',
      },
    });
  });

  it('keeps replacement truth explicit when loaded rows are ahead of a saved arrangement snapshot', () => {
    const plan = getProjectSavePlan({
      project: buildStoredProject('project-arrangement-replace', true),
      stems: [
        {
          id: 'stem-1',
          projectId: 'project-arrangement-replace',
          instrument: 'piano',
          sortOrder: 0,
          volume: 0.8,
          pan: 0,
          isMuted: false,
          isSolo: false,
          createdAt: '2026-03-28T00:00:00Z',
        },
      ],
      sections: [],
      blocks: [],
      chords: [],
    });

    expect(plan).toEqual({
      saveStatus: 'loaded-arrangement',
      saveTarget: 'arrangement',
      nextStep: 'save-arrangement',
      statusLabel: 'Loaded arrangement',
      savingLabel: 'Saving loaded arrangement…',
      currentState: 'Loaded arrangement rows and a saved arrangement snapshot both exist right now.',
      summary: 'Saving now will write the loaded arrangement rows back to the saved arrangement snapshot.',
      arrangementTruth: {
        status: 'loaded-and-persisted',
        hasArrangementRows: true,
        hasPersistedArrangement: true,
        hasAnyArrangementTruth: true,
        summary: 'Loaded arrangement rows and a saved arrangement snapshot both exist right now.',
        nextStep: 'Save the loaded arrangement rows if you want them to replace the saved arrangement snapshot.',
      },
    });
  });

  it('keeps project-only persistence when no arrangement rows are loaded', () => {
    const plan = getProjectSavePlan({
      project: buildStoredProject('project-shell-only'),
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
    });

    expect(plan).toEqual({
      saveStatus: 'project-draft',
      saveTarget: 'project',
      nextStep: 'save-project',
      statusLabel: 'Project draft',
      savingLabel: 'Saving project…',
      currentState: 'Only project fields and chat are in play right now; no arrangement rows are loaded.',
      summary: 'Saving now will persist project fields and chat without replacing arrangement rows.',
      arrangementTruth: {
        status: 'missing',
        hasArrangementRows: false,
        hasPersistedArrangement: false,
        hasAnyArrangementTruth: false,
        summary: 'No arrangement rows or saved arrangement snapshot exist yet.',
        nextStep: 'Generate or import an arrangement before saving or exporting arrangement rows.',
      },
    });
  });

  it('keeps saved arrangement snapshot truth explicit when only project fields are pending save', () => {
    const plan = getProjectSavePlan({
      project: buildStoredProject('project-shell-over-saved-arrangement', true),
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
    });

    expect(plan).toEqual({
      saveStatus: 'project-draft-over-saved-arrangement',
      saveTarget: 'project',
      nextStep: 'save-project',
      statusLabel: 'Project draft + saved arrangement',
      savingLabel: 'Saving project draft…',
      currentState: 'Only project fields and chat will change; the saved arrangement snapshot exists but is not loaded in this session.',
      summary: 'Saving now will persist project fields and chat without replacing arrangement rows.',
      arrangementTruth: {
        status: 'persisted-only',
        hasArrangementRows: false,
        hasPersistedArrangement: true,
        hasAnyArrangementTruth: true,
        summary: 'A saved arrangement snapshot exists, but its rows are not loaded in the project store right now.',
        nextStep: 'Reload the arrangement rows before editing, saving, or exporting the current arrangement snapshot.',
      },
    });
  });
});

describe('useProject loadProject', () => {
  it('replaces stale state when opening project B after project A', async () => {
    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;
    expect(hookValue).not.toBeNull();

    tableResponses = buildProjectRows('project-a', {
      hasArrangement: true,
      includeContent: true,
    });

    let firstLoadResult: LoadProjectResult | undefined;
    await act(async () => {
      firstLoadResult = await hookValue!.loadProject('project-a');
      await Promise.resolve();
    });

    expect(firstLoadResult).toEqual({ status: 'ready' });

    act(() => {
      useSelectionStore.getState().selectBlock('project-a-block', 'project-a-stem');
      useUiStore.setState({
        generationState: 'generating',
        systemStatus: 'error',
        errorMessage: 'Old project failure',
        unsavedChanges: true,
        lastSavedAt: '2026-03-28T00:00:00Z',
      });
    });

    tableResponses = buildProjectRows('project-b', {
      hasArrangement: false,
      includeContent: false,
    });

    let secondLoadResult: LoadProjectResult | undefined;
    await act(async () => {
      secondLoadResult = await hookValue!.loadProject('project-b');
      await Promise.resolve();
    });

    expect(secondLoadResult).toEqual({ status: 'ready' });

    expect(useProjectStore.getState()).toMatchObject({
      project: expect.objectContaining({ id: 'project-b' }),
      stems: [],
      sections: [],
      blocks: [],
      chatMessages: [],
    });
    expect(useSelectionStore.getState()).toMatchObject({
      level: 'song',
      sectionId: null,
      blockId: null,
      stemId: null,
    });
    expect(useUiStore.getState()).toMatchObject({
      generationState: 'idle',
      systemStatus: 'ready',
      errorMessage: null,
      unsavedChanges: false,
      lastSavedAt: null,
    });
  });

  it('clears stale project state and returns missing-project truth when the route target does not exist', async () => {
    useProjectStore.setState({
      project: buildStoredProject('project-a', true),
      stems: [
        {
          id: 'project-a-stem',
          projectId: 'project-a',
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
          id: 'project-a-section',
          projectId: 'project-a',
          name: 'Verse',
          sortOrder: 0,
          barCount: 8,
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
          id: 'project-a-block',
          stemId: 'project-a-stem',
          sectionId: 'project-a-section',
          startBar: 1,
          endBar: 8,
          chordDegree: 'I',
          chordQuality: 'maj7',
          chordBassDegree: null,
          style: 'jazz_comp',
          energyOverride: null,
          dynamicsOverride: null,
          midiData: [],
          createdAt: '2026-03-28T00:00:00Z',
        },
      ],
      chords: [
        {
          id: 'project-a-chord',
          projectId: 'project-a',
          barNumber: 1,
          degree: 'I',
          quality: 'maj7',
          bassDegree: null,
        },
      ],
      chatMessages: [buildStoredMessage('project-a')],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });
    useSelectionStore.setState({
      level: 'block',
      sectionId: 'project-a-section',
      blockId: 'project-a-block',
      stemId: 'project-a-stem',
    });
    useUiStore.setState({
      generationState: 'complete',
      systemStatus: 'ready',
      errorMessage: null,
      unsavedChanges: true,
      lastSavedAt: '2026-03-28T00:00:00Z',
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;
    expect(hookValue).not.toBeNull();

    tableResponses = {
      projects: { singleData: null },
      stems: { data: [] },
      sections: { data: [] },
      chords: { data: [] },
      ai_chat_messages: { data: [] },
    };

    let loadResult: LoadProjectResult | undefined;
    await act(async () => {
      loadResult = await hookValue!.loadProject('missing-project');
      await Promise.resolve();
    });

    expect(loadResult).toEqual({
      status: 'missing-project',
      message: 'Project not found',
    });
    expect(useProjectStore.getState()).toMatchObject({
      project: null,
      stems: [],
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
    expect(useUiStore.getState()).toMatchObject({
      generationState: 'idle',
      systemStatus: 'error',
      errorMessage: 'Project not found',
      unsavedChanges: false,
      lastSavedAt: null,
    });
  });
});

describe('useProject save paths', () => {
  it('saveProject replaces persisted chat history with the current project chat messages', async () => {
    const projectUpsert = vi.fn(() => Promise.resolve({ error: null }));
    const chatDeleteEq = vi.fn(() => Promise.resolve({ error: null }));
    const chatDelete = vi.fn(() => ({ eq: chatDeleteEq }));
    const chatInsert = vi.fn(() => Promise.resolve({ error: null }));

    supabaseMock.from.mockImplementation((table: string) => {
      switch (table) {
        case 'projects':
          return { upsert: projectUpsert };
        case 'ai_chat_messages':
          return { delete: chatDelete, insert: chatInsert };
        default:
          return createTableQuery();
      }
    });

    useProjectStore.setState({
      project: buildStoredProject('project-save'),
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
      chatMessages: [buildStoredMessage('project-save', { content: 'Saved suggestion' })],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });
    useUiStore.setState({ unsavedChanges: true });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await hookValue!.saveProject();
      await Promise.resolve();
    });

    expect(projectUpsert).toHaveBeenCalledTimes(1);
    expect(chatDelete).toHaveBeenCalledTimes(1);
    expect(chatDeleteEq).toHaveBeenCalledWith('project_id', 'project-save');
    expect(chatInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        project_id: 'project-save',
        role: 'assistant',
        content: 'Saved suggestion',
        scope: 'song',
        scope_target: null,
        created_at: '2026-03-28T00:00:00Z',
      }),
    ]);
    expect(useUiStore.getState()).toMatchObject({
      unsavedChanges: false,
      systemStatus: 'ready',
    });
  });

  it('saveProject routes arrangement drafts through the arrangement replacement path', async () => {
    const stemsDeleteEq = vi.fn(() => Promise.resolve({ error: null }));
    const stemsDelete = vi.fn(() => ({ eq: stemsDeleteEq }));
    const stemsInsert = vi.fn(() => Promise.resolve({ error: null }));
    const sectionsDeleteEq = vi.fn(() => Promise.resolve({ error: null }));
    const sectionsDelete = vi.fn(() => ({ eq: sectionsDeleteEq }));
    const sectionsInsert = vi.fn(() => Promise.resolve({ error: null }));
    const chordsDeleteEq = vi.fn(() => Promise.resolve({ error: null }));
    const chordsDelete = vi.fn(() => ({ eq: chordsDeleteEq }));
    const chordsInsert = vi.fn(() => Promise.resolve({ error: null }));
    const blocksInsert = vi.fn(() => Promise.resolve({ error: null }));
    const chatDeleteEq = vi.fn(() => Promise.resolve({ error: null }));
    const chatDelete = vi.fn(() => ({ eq: chatDeleteEq }));
    const chatInsert = vi.fn(() => Promise.resolve({ error: null }));
    const projectUpsert = vi.fn(() => Promise.resolve({ error: null }));

    supabaseMock.from.mockImplementation((table: string) => {
      switch (table) {
        case 'stems':
          return { delete: stemsDelete, insert: stemsInsert };
        case 'sections':
          return { delete: sectionsDelete, insert: sectionsInsert };
        case 'chords':
          return { delete: chordsDelete, insert: chordsInsert };
        case 'blocks':
          return { insert: blocksInsert };
        case 'projects':
          return { upsert: projectUpsert };
        case 'ai_chat_messages':
          return { delete: chatDelete, insert: chatInsert };
        default:
          return createTableQuery();
      }
    });

    useProjectStore.setState({
      project: {
        ...buildStoredProject('project-arrangement-draft'),
        chordChartRaw: 'Am7 | D7 | Gmaj7 | Cmaj7',
        generationHints: 'Keep the voicings darker',
      },
      stems: [
        {
          id: 'stem-1',
          projectId: 'project-arrangement-draft',
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
          id: 'section-1',
          projectId: 'project-arrangement-draft',
          name: 'Verse',
          sortOrder: 0,
          barCount: 8,
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
          id: 'block-1',
          stemId: 'stem-1',
          sectionId: 'section-1',
          startBar: 1,
          endBar: 8,
          chordDegree: 'I',
          chordQuality: 'maj7',
          chordBassDegree: null,
          style: 'jazz_comp',
          energyOverride: null,
          dynamicsOverride: null,
          midiData: [],
          createdAt: '2026-03-28T00:00:00Z',
        },
      ],
      chords: [
        {
          id: 'chord-1',
          projectId: 'project-arrangement-draft',
          barNumber: 1,
          degree: 'I',
          quality: 'maj7',
          bassDegree: null,
        },
      ],
      chatMessages: [buildStoredMessage('project-arrangement-draft', { content: 'Generation summary' })],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });
    useUiStore.setState({ unsavedChanges: true });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await hookValue!.saveProject();
      await Promise.resolve();
    });

    expect(stemsDelete).toHaveBeenCalledTimes(1);
    expect(stemsDeleteEq).toHaveBeenCalledWith('project_id', 'project-arrangement-draft');
    expect(sectionsDelete).toHaveBeenCalledTimes(1);
    expect(sectionsDeleteEq).toHaveBeenCalledWith('project_id', 'project-arrangement-draft');
    expect(chordsDelete).toHaveBeenCalledTimes(1);
    expect(chordsDeleteEq).toHaveBeenCalledWith('project_id', 'project-arrangement-draft');
    expect(stemsInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        project_id: 'project-arrangement-draft',
        instrument: 'piano',
      }),
    ]);
    expect(sectionsInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        project_id: 'project-arrangement-draft',
        name: 'Verse',
      }),
    ]);
    expect(blocksInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        stem_id: 'stem-1',
        section_id: 'section-1',
        midi_data: [],
      }),
    ]);
    expect(chordsInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        project_id: 'project-arrangement-draft',
        degree: 'I',
      }),
    ]);
    expect(chatDelete).toHaveBeenCalledTimes(1);
    expect(chatDeleteEq).toHaveBeenCalledWith('project_id', 'project-arrangement-draft');
    expect(chatInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        project_id: 'project-arrangement-draft',
        content: 'Generation summary',
      }),
    ]);
    expect(projectUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'project-arrangement-draft',
        chord_chart_raw: 'Am7 | D7 | Gmaj7 | Cmaj7',
        generation_hints: 'Keep the voicings darker',
        has_arrangement: true,
        generated_tempo: 120,
      })
    );
    expect(useUiStore.getState()).toMatchObject({
      unsavedChanges: false,
      systemStatus: 'ready',
    });
    expect(useProjectStore.getState().project).toMatchObject({
      id: 'project-arrangement-draft',
      hasArrangement: true,
      generatedAt: expect.any(String),
      generatedTempo: 120,
    });
  });

  it('saveArrangement replaces persisted arrangement rows and saves current project metadata', async () => {
    const stemsDeleteEq = vi.fn(() => Promise.resolve({ error: null }));
    const stemsDelete = vi.fn(() => ({ eq: stemsDeleteEq }));
    const sectionsDeleteEq = vi.fn(() => Promise.resolve({ error: null }));
    const sectionsDelete = vi.fn(() => ({ eq: sectionsDeleteEq }));
    const chordsDeleteEq = vi.fn(() => Promise.resolve({ error: null }));
    const chordsDelete = vi.fn(() => ({ eq: chordsDeleteEq }));
    const chatDeleteEq = vi.fn(() => Promise.resolve({ error: null }));
    const chatDelete = vi.fn(() => ({ eq: chatDeleteEq }));
    const chatInsert = vi.fn(() => Promise.resolve({ error: null }));
    const projectUpsert = vi.fn(() => Promise.resolve({ error: null }));

    supabaseMock.from.mockImplementation((table: string) => {
      switch (table) {
        case 'stems':
          return { delete: stemsDelete, insert: vi.fn(() => Promise.resolve({ error: null })) };
        case 'sections':
          return { delete: sectionsDelete, insert: vi.fn(() => Promise.resolve({ error: null })) };
        case 'chords':
          return { delete: chordsDelete, insert: vi.fn(() => Promise.resolve({ error: null })) };
        case 'projects':
          return { upsert: projectUpsert };
        case 'ai_chat_messages':
          return { delete: chatDelete, insert: chatInsert };
        default:
          return { insert: vi.fn(() => Promise.resolve({ error: null })) };
      }
    });

    useProjectStore.setState({
      project: {
        ...buildStoredProject('project-arrangement', true),
        tempo: 132,
        generationHints: 'Keep the voicings darker',
        chordChartRaw: 'Am7 | D7 | Gmaj7 | Cmaj7',
        generatedAt: '2026-03-29T00:00:00Z',
        generatedTempo: 132,
      },
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
      chatMessages: [buildStoredMessage('project-arrangement', { content: 'Generation summary' })],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });
    useUiStore.setState({ unsavedChanges: true });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await hookValue!.saveArrangement();
      await Promise.resolve();
    });

    expect(stemsDelete).toHaveBeenCalledTimes(1);
    expect(stemsDeleteEq).toHaveBeenCalledWith('project_id', 'project-arrangement');
    expect(sectionsDelete).toHaveBeenCalledTimes(1);
    expect(sectionsDeleteEq).toHaveBeenCalledWith('project_id', 'project-arrangement');
    expect(chordsDelete).toHaveBeenCalledTimes(1);
    expect(chordsDeleteEq).toHaveBeenCalledWith('project_id', 'project-arrangement');
    expect(chatDelete).toHaveBeenCalledTimes(1);
    expect(chatDeleteEq).toHaveBeenCalledWith('project_id', 'project-arrangement');
    expect(chatInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        project_id: 'project-arrangement',
        content: 'Generation summary',
      }),
    ]);
    expect(projectUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'project-arrangement',
        tempo: 132,
        generation_hints: 'Keep the voicings darker',
        chord_chart_raw: 'Am7 | D7 | Gmaj7 | Cmaj7',
        has_arrangement: true,
        generated_at: '2026-03-29T00:00:00Z',
        generated_tempo: 132,
      })
    );
    expect(useUiStore.getState()).toMatchObject({
      unsavedChanges: false,
      systemStatus: 'ready',
    });
  });
});

describe('useProject library management', () => {
  it('listProjects clears stale library errors and syncs the library count on success', async () => {
    const projectRows = [buildStoredProject('project-list-a'), buildStoredProject('project-list-b')];

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'projects') {
        return {
          select: () => ({
            order: () => Promise.resolve({ data: projectRows, error: null }),
          }),
        };
      }

      return createTableQuery(tableResponses[table]);
    });

    useUiStore.setState({
      systemStatus: 'error',
      errorMessage: 'Old library failure',
      libraryCount: 99,
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    let projects: Project[] = [];

    await act(async () => {
      projects = await hookValue!.listProjects();
      await Promise.resolve();
    });

    expect(projects.map((project) => project.id)).toEqual(['project-list-a', 'project-list-b']);
    expect(useUiStore.getState()).toMatchObject({
      systemStatus: 'ready',
      errorMessage: null,
      libraryCount: 2,
    });
  });

  it('deleteProject returns true and clears stale errors after a successful delete', async () => {
    const deleteEq = vi.fn(() => Promise.resolve({ error: null }));
    const deleteProjectRow = vi.fn(() => ({ eq: deleteEq }));

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'projects') {
        return { delete: deleteProjectRow };
      }

      return createTableQuery(tableResponses[table]);
    });

    useUiStore.setState({
      systemStatus: 'error',
      errorMessage: 'Delete previously failed',
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    let deleted = false;

    await act(async () => {
      deleted = await hookValue!.deleteProject('project-delete-success');
      await Promise.resolve();
    });

    expect(deleteProjectRow).toHaveBeenCalledTimes(1);
    expect(deleteEq).toHaveBeenCalledWith('id', 'project-delete-success');
    expect(deleted).toBe(true);
    expect(useUiStore.getState()).toMatchObject({
      systemStatus: 'ready',
      errorMessage: null,
    });
  });

  it('deleteProject returns false and surfaces the Supabase failure', async () => {
    const deleteEq = vi.fn(() => Promise.resolve({ error: new Error('Delete blocked') }));
    const deleteProjectRow = vi.fn(() => ({ eq: deleteEq }));

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'projects') {
        return { delete: deleteProjectRow };
      }

      return createTableQuery(tableResponses[table]);
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    let deleted = true;

    await act(async () => {
      deleted = await hookValue!.deleteProject('project-delete-failure');
      await Promise.resolve();
    });

    expect(deleteProjectRow).toHaveBeenCalledTimes(1);
    expect(deleteEq).toHaveBeenCalledWith('id', 'project-delete-failure');
    expect(deleted).toBe(false);
    expect(useUiStore.getState()).toMatchObject({
      systemStatus: 'error',
      errorMessage: 'Delete blocked',
    });
  });
});

describe('useProject createProject', () => {
  it('uses the loaded profile default genre and matching sub-style for new projects', async () => {
    const insert = vi.fn(() => ({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: { id: 'project-pop' },
            error: null,
          }),
      }),
    }));

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'projects') {
        return { insert };
      }

      return createTableQuery(tableResponses[table]);
    });

    useAuthStore.setState({
      profile: {
        id: 'profile-1',
        displayName: 'Ashlyn',
        chordDisplayMode: 'roman',
        defaultGenre: 'Pop',
        createdAt: '2026-03-29T00:00:00Z',
        updatedAt: '2026-03-29T00:00:00Z',
      },
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    let projectId: string | null = null;

    await act(async () => {
      projectId = await hookValue!.createProject();
      await Promise.resolve();
    });

    expect(projectId).toBe('project-pop');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        genre: 'Pop',
        sub_style: 'Synth Pop',
      })
    );
  });

  it('falls back to the canonical defaults when no saved profile genre exists', async () => {
    const insert = vi.fn(() => ({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: { id: 'project-default' },
            error: null,
          }),
      }),
    }));

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'projects') {
        return { insert };
      }

      return createTableQuery(tableResponses[table]);
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    let projectId: string | null = null;

    await act(async () => {
      projectId = await hookValue!.createProject();
      await Promise.resolve();
    });

    expect(projectId).toBe('project-default');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        genre: 'Jazz',
        sub_style: 'Swing',
      })
    );
  });
});
