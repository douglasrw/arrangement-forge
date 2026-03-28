// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { Project } from '@/types';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import EditorPage from './EditorPage';

const loadProjectMock = vi.fn<(projectId: string) => Promise<void>>();
let routeProjectId = 'project-a';
const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: () => <div data-testid="app-shell">Editor shell</div>,
}));

vi.mock('@/hooks/useProject', () => ({
  useProject: () => ({
    loadProject: loadProjectMock,
  }),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: routeProjectId }),
}));

function makeProject(id: string): Project {
  return {
    id,
    userId: 'user-1',
    name: `Project ${id}`,
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
    chordChartRaw: '',
    hasArrangement: false,
    generatedAt: null,
    generatedTempo: null,
    createdAt: '2026-03-28T00:00:00Z',
    updatedAt: '2026-03-28T00:00:00Z',
  };
}

function renderEditor(projectId: string) {
  routeProjectId = projectId;
  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = createRoot(container);

  act(() => {
    root.render(<EditorPage />);
  });

  return { container, root };
}

function queryLoadingGate() {
  return document.querySelector('[data-testid="editor-loading-gate"]');
}

function queryAppShell() {
  return document.querySelector('[data-testid="app-shell"]');
}

function queryErrorHeading() {
  return Array.from(document.querySelectorAll('h1')).find(
    (element) => element.textContent === 'Unable to open project'
  );
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  routeProjectId = 'project-a';
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
  useUiStore.setState({
    systemStatus: 'ready',
    errorMessage: null,
  });
  vi.clearAllMocks();
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

describe('EditorPage route loading gate', () => {
  it('shows a loading gate until the target project resolves', async () => {
    useProjectStore.setState({ project: makeProject('project-a') });

    let resolveLoad: (() => void) | undefined;
    loadProjectMock.mockImplementation(
      (projectId) =>
        new Promise<void>((resolve) => {
          resolveLoad = () => {
            useProjectStore.setState({ project: makeProject(projectId) });
            resolve();
          };
        })
    );

    const mounted = renderEditor('project-b');
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(loadProjectMock).toHaveBeenCalledWith('project-b');
    expect(queryLoadingGate()).not.toBeNull();
    expect(queryAppShell()).toBeNull();

    await act(async () => {
      resolveLoad?.();
      await Promise.resolve();
    });

    expect(queryLoadingGate()).toBeNull();
    expect(queryAppShell()).not.toBeNull();
  });

  it('removes the stale shell immediately when the route switches to another project', async () => {
    useProjectStore.setState({ project: makeProject('project-a') });

    loadProjectMock.mockImplementation(async (projectId) => {
      if (projectId === 'project-a') return;

      return new Promise<void>(() => {
        // Keep the new project unresolved so the route stays behind the loading gate.
      });
    });

    const mounted = renderEditor('project-a');
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(queryAppShell()).not.toBeNull();

    await act(async () => {
      routeProjectId = 'project-b';
      mounted.root.render(<EditorPage />);
      await Promise.resolve();
    });

    expect(loadProjectMock).toHaveBeenCalledWith('project-b');
    expect(queryLoadingGate()).not.toBeNull();
    expect(queryAppShell()).toBeNull();
  });

  it('shows a route error when the requested project cannot be loaded', async () => {
    loadProjectMock.mockImplementation(async () => {
      useUiStore.setState({
        systemStatus: 'error',
        errorMessage: 'Project not found',
      });
    });

    const mounted = renderEditor('missing-project');
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadProjectMock).toHaveBeenCalledWith('missing-project');
    expect(queryLoadingGate()).toBeNull();
    expect(queryAppShell()).toBeNull();
    expect(queryErrorHeading()).not.toBeUndefined();
    expect(document.body.textContent).toContain('Project not found');
  });
});
