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
import { snapshotArrangement } from '@/lib/undo-helpers';
import type { AiChatMessage, Chord, Project } from '@/types';

type Row = Record<string, unknown>;
type TableResponse = {
  data?: Row[] | Row | null;
  error?: Error | null;
  singleData?: Row | null;
};

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

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

function setAuthStoreFixture(state: Partial<ReturnType<typeof useAuthStore.getState>>) {
  useAuthStore.setState(state);
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
  setAuthStoreFixture({
    user: null,
    profile: null,
    authStatus: 'signed-out',
    signedOutReason: 'no-session',
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
      actionType: 'export-chart-and-snapshot',
      actionLabel: 'Export chart + saved snapshot',
      hasTextTruth: false,
      hasArrangementRows: true,
      exportsArrangementSnapshot: true,
      arrangementTruth: {
        status: 'loaded-and-persisted',
        loadedRowsState: 'saved-snapshot',
        hasArrangementRows: true,
        hasPersistedArrangement: true,
        hasAnyArrangementTruth: true,
        hasDraftArrangementRows: false,
        currentState: 'Loaded arrangement rows already match the saved arrangement snapshot.',
        nextStep: 'Edit the arrangement to create a draft, or save project fields and chat without replacing arrangement rows.',
      },
      currentState: 'Loaded arrangement rows are ready to export from the saved arrangement snapshot already loaded in this session.',
      nextStep: 'Export now to download the chord chart and arrangement snapshot.',
    });
    expect(readiness).not.toHaveProperty('message');
  });

  it('keeps chart-only export truth explicit when project text is ready but the saved arrangement snapshot is not loaded', () => {
    const readiness = getProjectExportReadiness({
      project: buildStoredProject('project-text-over-saved-arrangement', true),
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
    });

    expect(readiness).toEqual({
      canExport: true,
      actionType: 'export-chart',
      actionLabel: 'Export chart',
      hasTextTruth: true,
      hasArrangementRows: false,
      exportsArrangementSnapshot: false,
      arrangementTruth: {
        status: 'persisted-only',
        loadedRowsState: 'not-loaded',
        hasArrangementRows: false,
        hasPersistedArrangement: true,
        hasAnyArrangementTruth: true,
        hasDraftArrangementRows: false,
        currentState: 'A saved arrangement snapshot exists, but its rows are not loaded in the project store right now.',
        nextStep:
          'Use Reload saved snapshot in the top bar to load the arrangement rows before editing, saving, or exporting the current arrangement snapshot.',
      },
      currentState: 'Project text is ready to export, but the saved arrangement snapshot is not loaded in this session.',
      nextStep:
        'Export now to download the chord chart, or use Reload saved snapshot in the top bar before exporting the arrangement snapshot.',
    });
  });

  it('keeps chart-only export truth explicit when project text exists without any arrangement rows yet', () => {
    const readiness = getProjectExportReadiness({
      project: {
        ...buildStoredProject('project-text-only'),
        chordChartRaw: 'Dm7 | G7 | Cmaj7 | Cmaj7',
        generationHints: 'Keep the piano sparse',
      },
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
    });

    expect(readiness).toEqual({
      canExport: true,
      actionType: 'export-chart',
      actionLabel: 'Export chart',
      hasTextTruth: true,
      hasArrangementRows: false,
      exportsArrangementSnapshot: false,
      arrangementTruth: {
        status: 'missing',
        loadedRowsState: 'not-loaded',
        hasArrangementRows: false,
        hasPersistedArrangement: false,
        hasAnyArrangementTruth: false,
        hasDraftArrangementRows: false,
        currentState: 'No arrangement rows or saved arrangement snapshot exist yet.',
        nextStep: 'Generate or import an arrangement before saving or exporting arrangement rows.',
      },
      currentState: 'Project text is ready to export, but no arrangement rows are loaded yet.',
      nextStep: 'Export now to download the chord chart, or generate or import arrangement rows before exporting an arrangement snapshot.',
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
      actionType: 'reload-saved-snapshot',
      actionLabel: 'Reload saved snapshot',
      hasTextTruth: false,
      hasArrangementRows: false,
      exportsArrangementSnapshot: false,
      arrangementTruth: {
        status: 'persisted-only',
        loadedRowsState: 'not-loaded',
        hasArrangementRows: false,
        hasPersistedArrangement: true,
        hasAnyArrangementTruth: true,
        hasDraftArrangementRows: false,
        currentState: 'A saved arrangement snapshot exists, but its rows are not loaded in the project store right now.',
        nextStep:
          'Use Reload saved snapshot in the top bar to load the arrangement rows before editing, saving, or exporting the current arrangement snapshot.',
      },
      currentState: 'A saved arrangement snapshot exists, but its rows are not loaded in this session.',
      nextStep:
        'Use Reload saved snapshot in the top bar to load the arrangement rows before exporting the arrangement snapshot.',
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
      actionType: 'none',
      actionLabel: 'Nothing to export',
      hasTextTruth: false,
      hasArrangementRows: false,
      exportsArrangementSnapshot: false,
      arrangementTruth: {
        status: 'missing',
        loadedRowsState: 'not-loaded',
        hasArrangementRows: false,
        hasPersistedArrangement: false,
        hasAnyArrangementTruth: false,
        hasDraftArrangementRows: false,
        currentState: 'No arrangement rows or saved arrangement snapshot exist yet.',
        nextStep: 'Generate or import an arrangement before saving or exporting arrangement rows.',
      },
      currentState: 'No chord chart, generation hints, or arrangement rows are ready to export yet.',
      nextStep: 'Add a chord chart, description, or arrangement before exporting.',
    });
  });

  it('names draft snapshot export directly when loaded rows are ahead of the saved arrangement snapshot', () => {
    const readiness = getProjectExportReadiness({
      project: buildStoredProject('project-draft-export', true),
      stems: [
        {
          id: 'stem-1',
          projectId: 'project-draft-export',
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
      persistedArrangementFingerprint: snapshotArrangement({
        stems: [],
        sections: [],
        blocks: [],
        chords: [],
      }),
    });

    expect(readiness.actionLabel).toBe('Export chart + draft snapshot');
    expect(readiness.arrangementTruth.loadedRowsState).toBe('draft-over-saved-snapshot');
    expect(readiness.currentState).toBe(
      'Project text and loaded draft arrangement rows are both ready to export.'
    );
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
      saveAction: 'save-arrangement',
      statusLabel: 'Arrangement draft only',
      savingLabel: 'Saving first arrangement snapshot…',
      currentState: 'Loaded arrangement rows exist only in the current draft state.',
      nextStep: 'Save now to create the first saved arrangement snapshot from the loaded arrangement rows.',
      arrangementTruth: {
        status: 'draft-only',
        loadedRowsState: 'draft',
        hasArrangementRows: true,
        hasPersistedArrangement: false,
        hasAnyArrangementTruth: true,
        hasDraftArrangementRows: true,
        currentState: 'Arrangement rows are loaded, but no saved arrangement snapshot exists yet.',
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
      persistedArrangementFingerprint: snapshotArrangement({
        stems: [],
        sections: [],
        blocks: [],
        chords: [],
      }),
    });

    expect(plan).toEqual({
      saveStatus: 'arrangement-draft-over-saved-arrangement',
      saveTarget: 'arrangement',
      saveAction: 'save-arrangement',
      statusLabel: 'Arrangement draft + saved snapshot',
      savingLabel: 'Saving arrangement snapshot…',
      currentState: 'Loaded arrangement rows are currently ahead of the saved arrangement snapshot.',
      nextStep: 'Save now to replace the saved arrangement snapshot with the current draft arrangement rows.',
      arrangementTruth: {
        status: 'draft-over-persisted',
        loadedRowsState: 'draft-over-saved-snapshot',
        hasArrangementRows: true,
        hasPersistedArrangement: true,
        hasAnyArrangementTruth: true,
        hasDraftArrangementRows: true,
        currentState: 'Loaded arrangement rows are currently ahead of the saved arrangement snapshot.',
        nextStep: 'Save the current arrangement rows to replace the saved arrangement snapshot.',
      },
    });
  });

  it('keeps project-only persistence when loaded rows already match the saved arrangement snapshot', () => {
    const currentArrangement = {
      stems: [
        {
          id: 'stem-1',
          projectId: 'project-loaded-arrangement',
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
    };

    const plan = getProjectSavePlan({
      project: buildStoredProject('project-loaded-arrangement', true),
      ...currentArrangement,
      persistedArrangementFingerprint: snapshotArrangement(currentArrangement),
    });

    expect(plan).toEqual({
      saveStatus: 'project-draft-with-loaded-arrangement',
      saveTarget: 'project',
      saveAction: 'save-project',
      statusLabel: 'Project draft + loaded snapshot',
      savingLabel: 'Saving project draft…',
      currentState: 'Project fields and chat are in draft state, while the loaded arrangement rows already match the saved arrangement snapshot.',
      nextStep: 'Save now to persist project fields and chat without replacing arrangement rows.',
      arrangementTruth: {
        status: 'loaded-and-persisted',
        loadedRowsState: 'saved-snapshot',
        hasArrangementRows: true,
        hasPersistedArrangement: true,
        hasAnyArrangementTruth: true,
        hasDraftArrangementRows: false,
        currentState: 'Loaded arrangement rows already match the saved arrangement snapshot.',
        nextStep: 'Edit the arrangement to create a draft, or save project fields and chat without replacing arrangement rows.',
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
      saveAction: 'save-project',
      statusLabel: 'Project draft',
      savingLabel: 'Saving project draft…',
      currentState: 'Only project fields and chat are in play right now; no arrangement rows are loaded.',
      nextStep: 'Save now to persist project fields and chat without replacing arrangement rows.',
      arrangementTruth: {
        status: 'missing',
        loadedRowsState: 'not-loaded',
        hasArrangementRows: false,
        hasPersistedArrangement: false,
        hasAnyArrangementTruth: false,
        hasDraftArrangementRows: false,
        currentState: 'No arrangement rows or saved arrangement snapshot exist yet.',
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
      saveAction: 'save-project',
      statusLabel: 'Project draft + saved snapshot',
      savingLabel: 'Saving project draft…',
      currentState: 'Only project fields and chat will change; the saved arrangement snapshot exists but is not loaded in this session.',
      nextStep: 'Save now to persist project fields and chat without replacing arrangement rows.',
      arrangementTruth: {
        status: 'persisted-only',
        loadedRowsState: 'not-loaded',
        hasArrangementRows: false,
        hasPersistedArrangement: true,
        hasAnyArrangementTruth: true,
        hasDraftArrangementRows: false,
        currentState: 'A saved arrangement snapshot exists, but its rows are not loaded in the project store right now.',
        nextStep:
          'Use Reload saved snapshot in the top bar to load the arrangement rows before editing, saving, or exporting the current arrangement snapshot.',
      },
    });
  });

  it('names the next save step explicitly for operator-facing surfaces', () => {
    const plan = getProjectSavePlan({
      project: buildStoredProject('project-next-step', true),
      stems: [
        {
          id: 'stem-1',
          projectId: 'project-next-step',
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
      persistedArrangementFingerprint: snapshotArrangement({
        stems: [],
        sections: [],
        blocks: [],
        chords: [],
      }),
    });

    expect(plan.nextStep).toBe(
      'Save now to replace the saved arrangement snapshot with the current draft arrangement rows.'
    );
    expect(plan).not.toHaveProperty('summary');
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

  it('clears stale project truth before a replacement route load finishes', async () => {
    const projectQuery = createDeferred<{ data: Row | null; error: Error | null }>();
    const stemsQuery = createDeferred<{ data: Row[]; error: Error | null }>();
    const sectionsQuery = createDeferred<{ data: Row[]; error: Error | null }>();
    const chordsQuery = createDeferred<{ data: Row[]; error: Error | null }>();
    const messagesQuery = createDeferred<{ data: Row[]; error: Error | null }>();

    supabaseMock.from.mockImplementation((table: string) => {
      switch (table) {
        case 'projects':
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => projectQuery.promise,
              }),
            }),
          };
        case 'stems':
          return {
            select: () => ({
              eq: () => stemsQuery.promise,
            }),
          };
        case 'sections':
          return {
            select: () => ({
              eq: () => ({
                order: () => sectionsQuery.promise,
              }),
            }),
          };
        case 'chords':
          return {
            select: () => ({
              eq: () => ({
                order: () => chordsQuery.promise,
              }),
            }),
          };
        case 'ai_chat_messages':
          return {
            select: () => ({
              eq: () => ({
                order: () => messagesQuery.promise,
              }),
            }),
          };
        case 'blocks':
          return {
            select: () => ({
              in: () => Promise.resolve({ data: [], error: null }),
            }),
          };
        default:
          return createTableQuery();
      }
    });

    useProjectStore.setState({
      project: {
        ...buildStoredProject('project-a', true),
        name: 'Night Train',
        chordChartRaw: '[Verse]\nCmaj7 | Fmaj7',
        generationHints: 'Keep the groove moving',
      },
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
          id: 'project-a-block',
          stemId: 'project-a-stem',
          sectionId: 'project-a-section',
          startBar: 1,
          endBar: 4,
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

    let loadPromise!: Promise<LoadProjectResult>;
    await act(async () => {
      loadPromise = hookValue!.loadProject('project-b');
      await Promise.resolve();
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
      systemStatus: 'ready',
      errorMessage: null,
      unsavedChanges: false,
      lastSavedAt: null,
    });

    const nextProjectRows = buildProjectRows('project-b', {
      hasArrangement: false,
      includeContent: false,
    });

    await act(async () => {
      projectQuery.resolve({
        data: nextProjectRows.projects.singleData ?? null,
        error: null,
      });
      stemsQuery.resolve({
        data: (nextProjectRows.stems.data ?? []) as Row[],
        error: null,
      });
      sectionsQuery.resolve({
        data: (nextProjectRows.sections.data ?? []) as Row[],
        error: null,
      });
      chordsQuery.resolve({
        data: (nextProjectRows.chords.data ?? []) as Row[],
        error: null,
      });
      messagesQuery.resolve({
        data: (nextProjectRows.ai_chat_messages.data ?? []) as Row[],
        error: null,
      });

      await loadPromise;
      await Promise.resolve();
    });

    expect(useProjectStore.getState()).toMatchObject({
      project: expect.objectContaining({ id: 'project-b' }),
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
      chatMessages: [],
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

  it('keeps loadProject in error truth when arrangement blocks fail to load', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loadError = new Error('blocks query failed');
    const projectRows = buildProjectRows('project-block-failure', {
      hasArrangement: true,
      includeContent: true,
    });

    supabaseMock.from.mockImplementation((table: string) => {
      switch (table) {
        case 'projects':
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: projectRows.projects.singleData ?? null,
                    error: null,
                  }),
              }),
            }),
          };
        case 'stems':
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({
                  data: (projectRows.stems.data ?? []) as Row[],
                  error: null,
                }),
            }),
          };
        case 'sections':
          return {
            select: () => ({
              eq: () => ({
                order: () =>
                  Promise.resolve({
                    data: (projectRows.sections.data ?? []) as Row[],
                    error: null,
                  }),
              }),
            }),
          };
        case 'chords':
          return {
            select: () => ({
              eq: () => ({
                order: () =>
                  Promise.resolve({
                    data: (projectRows.chords.data ?? []) as Row[],
                    error: null,
                  }),
              }),
            }),
          };
        case 'ai_chat_messages':
          return {
            select: () => ({
              eq: () => ({
                order: () =>
                  Promise.resolve({
                    data: (projectRows.ai_chat_messages.data ?? []) as Row[],
                    error: null,
                  }),
              }),
            }),
          };
        case 'blocks':
          return {
            select: () => ({
              in: () => Promise.resolve({ data: [], error: loadError }),
            }),
          };
        default:
          return createTableQuery();
      }
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;
    expect(hookValue).not.toBeNull();

    let loadResult: LoadProjectResult | undefined;
    await act(async () => {
      loadResult = await hookValue!.loadProject('project-block-failure');
      await Promise.resolve();
    });

    expect(loadResult).toEqual({
      status: 'error',
      message: 'Failed to load project blocks: blocks query failed',
    });
    expect(useProjectStore.getState()).toMatchObject({
      project: null,
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
      chatMessages: [],
    });
    expect(useUiStore.getState()).toMatchObject({
      generationState: 'idle',
      systemStatus: 'error',
      errorMessage: 'Failed to load project blocks: blocks query failed',
      unsavedChanges: false,
      lastSavedAt: null,
    });

    consoleErrorSpy.mockRestore();
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

  it('saveProject keeps dirty truth when the project draft write fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const projectUpsert = vi.fn(() =>
      Promise.resolve({ error: new Error('project draft write blocked') })
    );
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
      project: buildStoredProject('project-save-error'),
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
      chatMessages: [buildStoredMessage('project-save-error', { content: 'Do not lose draft truth' })],
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
    expect(chatDelete).not.toHaveBeenCalled();
    expect(chatInsert).not.toHaveBeenCalled();
    expect(useUiStore.getState()).toMatchObject({
      unsavedChanges: true,
      systemStatus: 'error',
      errorMessage: 'Failed to save project draft: project draft write blocked',
    });

    consoleErrorSpy.mockRestore();
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

  it('saveProject keeps loaded saved arrangements on the project path when only project truth is draft', async () => {
    const stemsDeleteEq = vi.fn(() => Promise.resolve({ error: null }));
    const stemsDelete = vi.fn(() => ({ eq: stemsDeleteEq }));
    const stemsUpsert = vi.fn(() => Promise.resolve({ error: null }));
    const projectUpsert = vi.fn(() => Promise.resolve({ error: null }));
    const chatDeleteEq = vi.fn(() => Promise.resolve({ error: null }));
    const chatDelete = vi.fn(() => ({ eq: chatDeleteEq }));
    const chatInsert = vi.fn(() => Promise.resolve({ error: null }));

    supabaseMock.from.mockImplementation((table: string) => {
      switch (table) {
        case 'stems':
          return { delete: stemsDelete, upsert: stemsUpsert };
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
        ...buildStoredProject('project-loaded-save', true),
        generationHints: 'Keep the voicings darker',
      },
      stems: [
        {
          id: 'stem-1',
          projectId: 'project-loaded-save',
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
      chatMessages: [buildStoredMessage('project-loaded-save', { content: 'Keep the save local' })],
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

    expect(stemsDelete).not.toHaveBeenCalled();
    expect(stemsUpsert).toHaveBeenCalledWith([
      expect.objectContaining({
        project_id: 'project-loaded-save',
        instrument: 'piano',
      }),
    ]);
    expect(projectUpsert).toHaveBeenCalledTimes(1);
    expect(chatDeleteEq).toHaveBeenCalledWith('project_id', 'project-loaded-save');
    expect(chatInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        project_id: 'project-loaded-save',
        content: 'Keep the save local',
      }),
    ]);
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

    setAuthStoreFixture({
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
