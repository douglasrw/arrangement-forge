// @vitest-environment jsdom

import { act, createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useProject } from './useProject';
import { useProjectStore } from '@/store/project-store';
import { useSelectionStore } from '@/store/selection-store';
import { useUiStore } from '@/store/ui-store';

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

    await act(async () => {
      await hookValue!.loadProject('project-a');
      await Promise.resolve();
    });

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

    await act(async () => {
      await hookValue!.loadProject('project-b');
      await Promise.resolve();
    });

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
});
