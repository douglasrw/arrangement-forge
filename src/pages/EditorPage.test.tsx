// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { LoadProjectResult } from '@/hooks/useProject';
import type { Project } from '@/types';
import { useProjectStore } from '@/store/project-store';
import { useSelectionStore } from '@/store/selection-store';
import { useUiStore } from '@/store/ui-store';
import type { EditorRouteMode } from './EditorPage';
import EditorPage from './EditorPage';

const loadProjectMock = vi.fn<(projectId: string) => Promise<LoadProjectResult>>();
const signOutMock = vi.hoisted(() => vi.fn());
let routeProjectId: string | undefined = 'project-a';
let routeSearch = '';
let routeHash = '';
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
  Link: ({
    children,
    to,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useParams: () => ({ id: routeProjectId }),
  useLocation: () => ({
    pathname: routeProjectId ? `/project/${routeProjectId}` : '/project',
    search: routeSearch,
    hash: routeHash,
  }),
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

function renderEditor(
  projectId: string | undefined,
  routeMode?: EditorRouteMode,
  routeState?: { search?: string; hash?: string }
) {
  routeProjectId = projectId;
  routeSearch = routeState?.search ?? '';
  routeHash = routeState?.hash ?? '';
  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = createRoot(container);

  act(() => {
    root.render(<EditorPage routeMode={routeMode} />);
  });

  return { container, root };
}

function queryLoadingGate() {
  return document.querySelector('[data-testid="editor-shell-loading-state"]');
}

function queryMissingProjectState() {
  return document.querySelector('[data-testid="editor-shell-missing-project-state"]');
}

function queryAppShell() {
  return document.querySelector('[data-testid="editor-shell"]');
}

function queryErrorState() {
  return document.querySelector('[data-testid="editor-shell-error-state"]');
}

function queryNoProjectState() {
  return document.querySelector('[data-testid="editor-shell-no-project-state"]');
}

function queryBackToLibraryLink() {
  return document.querySelector('a[href="/library"]');
}

function querySelectionSurface() {
  return document.querySelector('[data-testid="selection-surface"]');
}

function queryReadyBanner() {
  return document.querySelector('[data-testid="editor-route-ready-banner"]');
}

function queryReadyBannerLink(href: string) {
  return document.querySelector(`[data-testid="editor-route-ready-banner"] a[href="${href}"]`);
}

function queryProjectNameTrigger() {
  return document.querySelector('[data-testid="project-name-trigger"]');
}

function queryTopBarSaveLabel() {
  return document.querySelector('[data-testid="topbar-save-label"]');
}

function getStatusBarText(): string {
  return document.querySelector('[data-testid="status-bar"]')?.textContent ?? '';
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  routeProjectId = 'project-a';
  routeSearch = '';
  routeHash = '';
  loadProjectMock.mockReset();
  loadProjectMock.mockResolvedValue({ status: 'ready' });
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
  it('keeps the workspace behind a loading gate until the current route load resolves', async () => {
    useProjectStore.setState({ project: makeProject('project-a') });

    let resolveLoad: (() => void) | undefined;
    loadProjectMock.mockImplementation(
      (projectId) =>
        new Promise<LoadProjectResult>((resolve) => {
          resolveLoad = () => {
            useProjectStore.setState({ project: makeProject(projectId) });
            resolve({ status: 'ready' });
          };
        })
    );

    const mounted = renderEditor('project-b');
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(loadProjectMock).toHaveBeenCalledWith('project-b');
    expect(queryLoadingGate()).not.toBeNull();
    expect(queryAppShell()).not.toBeNull();
    expect(querySelectionSurface()).toBeNull();
    expect(getStatusBarText()).toContain('Loading project');
    expect(document.body.textContent).toContain('Opening project project-b in the editor.');
    expect(document.body.textContent).toContain(
      'Current state: Arrangement Forge is still loading the requested project route for project-b.'
    );
    expect(document.body.textContent).toContain('Route mode: requested project route');
    expect(document.body.textContent).toContain(
      'Route readiness: /project/project-b is still loading before the editor becomes interactive.'
    );
    expect(document.body.textContent).toContain('Current route: /project/project-b');
    expect(document.body.textContent).toContain('Editor fallback route: /project');
    expect(document.body.textContent).toContain(
      'Route truth: /project/project-b is still resolving before the editor becomes ready.'
    );
    expect(document.body.textContent).toContain(
      'Next step: Wait for the current route load to finish before editing this arrangement.'
    );
    expect(queryProjectNameTrigger()?.textContent).toBe('Loading project route');
    expect(queryTopBarSaveLabel()?.textContent).toBe('Loading project...');
    expect(mounted.container.textContent).not.toContain('Untitled Project');
    expect(mounted.container.textContent).not.toContain('120 bpm');

    await act(async () => {
      resolveLoad?.();
      await Promise.resolve();
    });

    expect(queryLoadingGate()).toBeNull();
    expect(queryAppShell()).not.toBeNull();
    expect(querySelectionSurface()).not.toBeNull();
  });

  it('keeps the exact requested editor route visible while the project is still loading', async () => {
    let resolveLoad: (() => void) | undefined;
    loadProjectMock.mockImplementation(
      (projectId) =>
        new Promise<LoadProjectResult>((resolve) => {
          resolveLoad = () => {
            useProjectStore.setState({ project: makeProject(projectId) });
            resolve({ status: 'ready' });
          };
        })
    );

    const mounted = renderEditor('project-b', undefined, {
      search: '?tab=arrangement',
      hash: '#bridge',
    });
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(document.body.textContent).toContain(
      'Current route: /project/project-b?tab=arrangement#bridge'
    );

    await act(async () => {
      resolveLoad?.();
      await Promise.resolve();
    });
  });

  it('keeps route loading truth even when the store already holds the requested project id', async () => {
    useProjectStore.setState({ project: makeProject('project-a') });

    let resolveLoad: (() => void) | undefined;
    loadProjectMock.mockImplementation(
      (projectId) =>
        new Promise<LoadProjectResult>((resolve) => {
          resolveLoad = () => {
            useProjectStore.setState({ project: makeProject(projectId) });
            resolve({ status: 'ready' });
          };
        })
    );

    const mounted = renderEditor('project-a');
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(loadProjectMock).toHaveBeenCalledWith('project-a');
    expect(queryLoadingGate()).not.toBeNull();
    expect(querySelectionSurface()).toBeNull();

    await act(async () => {
      resolveLoad?.();
      await Promise.resolve();
    });

    expect(queryLoadingGate()).toBeNull();
    expect(queryAppShell()).not.toBeNull();
    expect(querySelectionSurface()).not.toBeNull();
    expect(queryReadyBanner()).not.toBeNull();
    expect(document.body.textContent).toContain('Editor route ready for project project-a.');
    expect(document.body.textContent).toContain(
      'The requested project route is open and the editor workspace is ready.'
    );
    expect(document.body.textContent).toContain(
      'Current state: the requested project is loaded in this workspace.'
    );
    expect(document.body.textContent).toContain('Route mode: active project route');
    expect(document.body.textContent).toContain(
      'Next step: edit this arrangement or return to the library to open a different project.'
    );
    expect(document.body.textContent).toContain(
      'Route readiness: /project/project-a is ready in this workspace.'
    );
    expect(document.body.textContent).toContain('Current route: /project/project-a');
    expect(document.body.textContent).toContain('Editor fallback route: /project');
    expect(document.body.textContent).toContain(
      'Route truth: /project/project-a is loaded in this workspace. If you leave this project route, /project is the editor fallback route until you choose another project from the library.'
    );
    expect(queryReadyBannerLink('/project')).not.toBeNull();
    expect(queryReadyBannerLink('/library')).not.toBeNull();
  });

  it('keeps the exact requested editor route visible after the project is ready', async () => {
    useProjectStore.setState({ project: makeProject('project-a') });

    let resolveLoad: (() => void) | undefined;
    loadProjectMock.mockImplementation(
      (projectId) =>
        new Promise<LoadProjectResult>((resolve) => {
          resolveLoad = () => {
            useProjectStore.setState({ project: makeProject(projectId) });
            resolve({ status: 'ready' });
          };
        })
    );

    const mounted = renderEditor('project-a', undefined, {
      search: '?tab=arrangement',
      hash: '#bridge',
    });
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      resolveLoad?.();
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain(
      'Route readiness: /project/project-a is ready in this workspace.'
    );
    expect(document.body.textContent).toContain(
      'Current route: /project/project-a?tab=arrangement#bridge'
    );
  });

  it('removes the stale workspace immediately when the route switches to another project', async () => {
    useProjectStore.setState({ project: makeProject('project-a') });

    loadProjectMock.mockImplementation(async (projectId) => {
      if (projectId === 'project-a') {
        useProjectStore.setState({ project: makeProject(projectId) });
        return { status: 'ready' };
      }

      return new Promise<LoadProjectResult>(() => {
        // Keep the new project unresolved so the route stays behind the loading gate.
      });
    });

    const mounted = renderEditor('project-a');
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    expect(querySelectionSurface()).not.toBeNull();

    await act(async () => {
      routeProjectId = 'project-b';
      mounted.root.render(<EditorPage />);
      await Promise.resolve();
    });

    expect(loadProjectMock).toHaveBeenCalledWith('project-b');
    expect(queryLoadingGate()).not.toBeNull();
    expect(queryAppShell()).not.toBeNull();
    expect(querySelectionSurface()).toBeNull();
    expect(getStatusBarText()).toContain('Loading project');
  });

  it('shows a distinct missing-project state when the requested project does not exist', async () => {
    loadProjectMock.mockImplementation(async () => {
      useUiStore.setState({ systemStatus: 'error', errorMessage: 'Project not found' });
      return {
        status: 'missing-project',
        message: 'Project not found',
      };
    });

    const mounted = renderEditor('missing-project');
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadProjectMock).toHaveBeenCalledWith('missing-project');
    expect(queryLoadingGate()).toBeNull();
    expect(queryAppShell()).not.toBeNull();
    expect(queryMissingProjectState()).not.toBeNull();
    expect(querySelectionSurface()).toBeNull();
    expect(getStatusBarText()).toContain('Error: Project not found');
    expect(document.body.textContent).toContain(
      'Project missing-project is not available, so the editor cannot open this route. Project not found'
    );
    expect(document.body.textContent).toContain(
      'Current state: The requested project route for missing-project did not resolve to an available project.'
    );
    expect(document.body.textContent).toContain(
      'Route readiness: /project/missing-project is blocked because that project is unavailable.'
    );
    expect(document.body.textContent).toContain('Current route: /project/missing-project');
    expect(document.body.textContent).toContain('Editor fallback route: /project');
    expect(document.body.textContent).toContain(
      'Route truth: /project/missing-project cannot open because the requested project is unavailable.'
    );
    expect(document.body.textContent).toContain(
      'Next step: Return to the library and open a different project.'
    );
    expect(queryBackToLibraryLink()).not.toBeNull();
  });

  it('shows a route error when the requested project load fails unexpectedly', async () => {
    loadProjectMock.mockImplementation(async () => {
      useUiStore.setState({
        systemStatus: 'error',
        errorMessage: 'Backend unavailable',
      });

      return {
        status: 'error',
        message: 'Backend unavailable',
      };
    });

    const mounted = renderEditor('project-a');
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    expect(queryErrorState()).not.toBeNull();
    expect(querySelectionSurface()).toBeNull();
    expect(document.body.textContent).toContain(
      'Project project-a could not be loaded for this editor route. Backend unavailable'
    );
    expect(document.body.textContent).toContain(
      'Current state: The requested project route for project-a is blocked by a load failure.'
    );
    expect(document.body.textContent).toContain(
      'Route readiness: /project/project-a is blocked until the load failure is resolved.'
    );
    expect(document.body.textContent).toContain('Current route: /project/project-a');
    expect(document.body.textContent).toContain('Editor fallback route: /project');
    expect(document.body.textContent).toContain(
      'Route truth: /project/project-a is blocked until Arrangement Forge can load the requested project.'
    );
    expect(document.body.textContent).toContain(
      'Next step: Return to the library, then retry this project after the load failure is resolved.'
    );
    expect(queryBackToLibraryLink()).not.toBeNull();
  });

  it('makes a malformed /project/:id route explicit when no project id is present', async () => {
    useProjectStore.setState({
      project: makeProject('stale-project'),
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
      chatMessages: [],
    });

    const mounted = renderEditor(undefined);
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadProjectMock).not.toHaveBeenCalled();
    expect(queryErrorState()).not.toBeNull();
    expect(querySelectionSurface()).toBeNull();
    expect(document.body.textContent).toContain(
      'The /project/:id editor route is missing a project id, so Arrangement Forge cannot load a project here.'
    );
    expect(document.body.textContent).toContain(
      'Current state: The requested editor route is malformed because no project id was provided.'
    );
    expect(document.body.textContent).toContain(
      'Route readiness: /project/:id is blocked because the route is missing a project id.'
    );
    expect(document.body.textContent).toContain('Current route: /project/:id (missing project id)');
    expect(document.body.textContent).toContain('Editor fallback route: /project');
    expect(document.body.textContent).toContain(
      'Route truth: /project/:id cannot open because the route is missing a project id.'
    );
    expect(document.body.textContent).toContain(
      'Next step: Return to the library, then open a project to replace this malformed editor route.'
    );
    expect(queryBackToLibraryLink()).not.toBeNull();
    expect(queryProjectNameTrigger()?.textContent).toBe('Editor route blocked');
    expect(queryTopBarSaveLabel()?.textContent).toBe('Editor route blocked');
    expect(mounted.container.textContent).not.toContain('Untitled Project');
    expect(useProjectStore.getState()).toMatchObject({
      project: null,
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
      chatMessages: [],
    });
  });

  it('shows an explicit no-project-selected state for the /project fallback route', async () => {
    useProjectStore.setState({
      project: {
        ...makeProject('project-a'),
        name: 'Night Train',
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
      sectionId: 'section-1',
      blockId: 'block-1',
      stemId: 'stem-1',
    });

    const mounted = renderEditor(undefined, 'project-selection');
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadProjectMock).not.toHaveBeenCalled();
    expect(queryNoProjectState()).not.toBeNull();
    expect(querySelectionSurface()).toBeNull();
    expect(document.body.textContent).toContain(
      'The /project editor route is open, but no project has been selected yet.'
    );
    expect(document.body.textContent).toContain(
      'Current state: The editor fallback route is open with no active project in this workspace.'
    );
    expect(document.body.textContent).toContain('Route mode: editor fallback route');
    expect(document.body.textContent).toContain(
      'Route readiness: /project is parked as the editor fallback route until you choose a project from the library.'
    );
    expect(document.body.textContent).toContain('Current route: /project');
    expect(document.body.textContent).toContain('Editor fallback route: /project');
    expect(document.body.textContent).toContain(
      'Route truth: /project is the editor fallback route, and it stays parked here until you choose a project from the library.'
    );
    expect(document.body.textContent).toContain(
      'Next step: Return to the library, then open an existing project or create a new one to finish this editor route.'
    );
    expect(getStatusBarText()).toContain('No project selected');
    expect(getStatusBarText()).not.toContain('Saved');
    expect(queryBackToLibraryLink()).not.toBeNull();
    expect(queryNoProjectState()?.getAttribute('data-editor-route-state')).toBe('no-project-selected');
    expect(queryProjectNameTrigger()?.textContent).toBe('No project selected');
    expect(queryTopBarSaveLabel()?.textContent).toBe('No project selected');
    expect(mounted.container.textContent).not.toContain('Night Train');
    expect(mounted.container.textContent).not.toContain('Untitled Project');
    expect(mounted.container.textContent).not.toContain('120 bpm');
    expect(
      mounted.container.querySelector('[data-testid="topbar-export-button"]')?.textContent
    ).toBe('Nothing to export');
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
  });

  it('renders the /project fallback state immediately instead of flashing a loading shell first', () => {
    const mounted = renderEditor(undefined, 'project-selection');
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(loadProjectMock).not.toHaveBeenCalled();
    expect(queryNoProjectState()).not.toBeNull();
    expect(queryLoadingGate()).toBeNull();
    expect(document.body.textContent).toContain(
      'Current state: The editor fallback route is open with no active project in this workspace.'
    );
    expect(document.body.textContent).toContain('Current route: /project');
    expect(document.body.textContent).toContain('Editor fallback route: /project');
  });

  it('keeps the exact /project fallback route visible when no project is selected', async () => {
    const mounted = renderEditor(undefined, 'project-selection', {
      search: '?tab=arrangement',
      hash: '#new',
    });
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadProjectMock).not.toHaveBeenCalled();
    expect(queryNoProjectState()).not.toBeNull();
    expect(document.body.textContent).toContain(
      'Current route: /project?tab=arrangement#new'
    );
    expect(document.body.textContent).toContain('Editor fallback route: /project');
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

    await act(async () => {
      await Promise.resolve();
    });

    const exportButton = mounted.container.querySelector(
      '[data-testid="topbar-export-button"]'
    ) as HTMLButtonElement | null;
    expect(queryAppShell()).not.toBeNull();
    expect(querySelectionSurface()).not.toBeNull();
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
