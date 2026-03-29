// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { Project } from '@/types';
import { useProjectStore } from '@/store/project-store';
import { useSelectionStore } from '@/store/selection-store';
import { useUiStore } from '@/store/ui-store';
import EditorPage from './EditorPage';

const loadProjectMock = vi.fn<(projectId: string) => Promise<void>>();
const signOutMock = vi.hoisted(() => vi.fn());
let routeProjectId = 'project-a';
const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock('@/components/left-panel/LeftPanel', () => ({
  LeftPanel: () => <div data-testid="left-panel">Left panel</div>,
}));

vi.mock('@/components/arrangement/ArrangementView', () => ({
  ArrangementView: () => <div data-testid="selection-surface">Arrangement view</div>,
}));

vi.mock('@/components/transport/TransportBar', () => ({
  TransportBar: () => <div data-testid="transport-bar">Transport</div>,
}));

vi.mock('@/components/mixer/MixerDrawer', () => ({
  MixerDrawer: () => <div data-testid="mixer-drawer">Mixer</div>,
}));

vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => {},
}));

vi.mock('@/hooks/useAutoSave', () => ({
  useAutoSave: () => {},
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signOut: signOutMock,
  }),
}));

vi.mock('@/hooks/useProject', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useProject')>(
    '@/hooks/useProject'
  );

  return {
    ...actual,
    useProject: () => ({
      loadProject: loadProjectMock,
    }),
  };
});

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
  return document.querySelector('[data-testid="editor-shell"]');
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
  loadProjectMock.mockReset();
  signOutMock.mockReset();
  window.scrollTo = vi.fn();
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
    systemStatus: 'ready',
    errorMessage: null,
    unsavedChanges: false,
    chordDisplayMode: 'letter',
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

  it('keeps export wired into the editor shell alongside project, tempo, and selection surfaces', async () => {
    useProjectStore.setState({
      project: {
        ...makeProject('project-a'),
        name: 'Night Train',
        tempo: 132,
        chordChartRaw: '[Verse]\nCmaj7 | Fmaj7',
        generationHints: 'Keep the groove moving',
      },
      stems: [
        {
          id: 'stem-1',
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
          id: 'section-1',
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
          id: 'block-1',
          stemId: 'stem-1',
          sectionId: 'section-1',
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
          id: 'chord-1',
          projectId: 'project-a',
          barNumber: 1,
          degree: 'I',
          quality: 'maj7',
          bassDegree: null,
        },
      ],
    });
    useSelectionStore.setState({
      level: 'block',
      sectionId: null,
      blockId: 'block-1',
      stemId: 'stem-1',
    });

    let exportUrlCounter = 0;
    const createObjectUrlMock = vi.fn(() => {
      exportUrlCounter += 1;
      return `blob:editor-export-${exportUrlCounter}`;
    });
    const revokeObjectUrlMock = vi.fn();
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    Object.defineProperty(globalThis.URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrlMock,
    });
    Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrlMock,
    });

    const mounted = renderEditor('project-a');
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const exportButton = mounted.container.querySelector(
      '[data-testid="topbar-export-button"]'
    ) as HTMLButtonElement | null;
    expect(queryAppShell()).not.toBeNull();
    expect(exportButton?.disabled).toBe(false);
    expect(mounted.container.textContent).toContain('Night Train');
    expect(mounted.container.textContent).toContain('132 bpm');
    expect(useSelectionStore.getState()).toMatchObject({
      level: 'block',
      sectionId: null,
      blockId: 'block-1',
      stemId: 'stem-1',
    });

    await act(async () => {
      exportButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(createObjectUrlMock).toHaveBeenCalledTimes(2);
    expect(anchorClickSpy).toHaveBeenCalledTimes(2);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:editor-export-1');
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:editor-export-2');
    expect(exportButton?.textContent).toBe('Exported');
    expect(mounted.container.textContent).toContain('Night Train');
    expect(mounted.container.textContent).toContain('132 bpm');
    expect(useSelectionStore.getState()).toMatchObject({
      level: 'block',
      sectionId: null,
      blockId: 'block-1',
      stemId: 'stem-1',
    });

    anchorClickSpy.mockRestore();
  });
});
