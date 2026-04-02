// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LibraryPage from './LibraryPage';
import { useUiStore } from '@/store/ui-store';
import type { Project } from '@/types';

const projectApi = vi.hoisted(() => ({
  listProjects: vi.fn<() => Promise<Project[]>>(),
  createProject: vi.fn<() => Promise<string | null>>(),
  deleteProject: vi.fn<(projectId: string) => Promise<boolean>>(),
}));

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useProject', () => ({
  useProject: () => projectApi,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function makeProject(partial: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    userId: 'user-1',
    name: 'Amber Nights',
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
    createdAt: '2026-03-29T00:00:00Z',
    updatedAt: '2026-03-29T00:00:00Z',
    ...partial,
  };
}

function renderLibrary() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<LibraryPage />);
  });

  return { container, root };
}

function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement | null {
  return (
    Array.from(container.querySelectorAll('button')).find(
      (button): button is HTMLButtonElement => button.textContent?.trim() === text
    ) ?? null
  );
}

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function setSelectValue(select: HTMLSelectElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
  valueSetter?.call(select, value);
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function getVisibleProjectNames(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('h3')).map((heading) => heading.textContent ?? '');
}

function getProjectCard(container: HTMLElement, projectId: string): HTMLElement | null {
  return container.querySelector(`[data-project-id="${projectId}"]`);
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();

  projectApi.listProjects.mockReset();
  projectApi.createProject.mockReset();
  projectApi.deleteProject.mockReset();
  navigateMock.mockReset();

  projectApi.listProjects.mockResolvedValue([]);
  projectApi.createProject.mockResolvedValue('project-new');
  projectApi.deleteProject.mockResolvedValue(true);

  useUiStore.setState({
    generationState: 'idle',
    systemStatus: 'ready',
    errorMessage: null,
    mixerExpanded: false,
    leftPanelCollapsed: false,
    zoomIndex: 0,
    unsavedChanges: false,
    lastSavedAt: null,
    libraryCount: 0,
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
  vi.useRealTimers();
});

describe('LibraryPage', () => {
  it('shows a library error state instead of pretending the library is empty on load failure', async () => {
    projectApi.listProjects.mockImplementation(async () => {
      useUiStore.getState().setSystemStatus('error', 'Library backend offline');
      return [];
    });

    const mounted = renderLibrary();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    expect(mounted.container.textContent).toContain('Unable to load library');
    expect(mounted.container.textContent).toContain('Library backend offline');
    expect(mounted.container.textContent).not.toContain('No projects yet.');
    expect(mounted.container.textContent).toContain('Library readiness');
    expect(mounted.container.textContent).toContain('Blocked');
  });

  it('keeps offline library truth blocked on the page surface instead of falling through to the empty state', async () => {
    projectApi.listProjects.mockImplementation(async () => {
      useUiStore.getState().setSystemStatus('offline', 'Connection lost while loading the library');
      return [];
    });

    const mounted = renderLibrary();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    const readiness = mounted.container.querySelector('[data-testid="library-readiness"]');

    expect(readiness?.textContent).toContain('Blocked');
    expect(readiness?.textContent).toContain('Connection lost while loading the library');
    expect(mounted.container.textContent).toContain('Library offline');
    expect(mounted.container.textContent).toContain('Retry library');
    expect(mounted.container.textContent).not.toContain('No projects yet.');
  });

  it('shows waiting readiness while the library route is still loading', () => {
    projectApi.listProjects.mockReturnValue(new Promise(() => {}));

    const mounted = renderLibrary();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const readiness = mounted.container.querySelector('[data-testid="library-readiness"]');

    expect(readiness?.textContent).toContain('Library readiness');
    expect(readiness?.textContent).toContain('Waiting');
    expect(readiness?.textContent).toContain('Arrangement Forge is still loading this route.');
    expect(readiness?.textContent).toContain('Loading your saved projects for this workspace.');
  });

  it('shows ready readiness when the library surface is usable', async () => {
    projectApi.listProjects.mockResolvedValue([
      makeProject({ id: 'project-ready', name: 'Ready Cut' }),
    ]);

    const mounted = renderLibrary();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    const readiness = mounted.container.querySelector('[data-testid="library-readiness"]');

    expect(readiness?.textContent).toContain('Library readiness');
    expect(readiness?.textContent).toContain('Ready');
    expect(readiness?.textContent).toContain('1 project in library');
    expect(readiness?.textContent).toContain(
      'Open a saved project or create a new arrangement from here.'
    );
    const selectionTruth = mounted.container.querySelector('[data-testid="library-selection-truth"]');
    expect(selectionTruth?.textContent).toContain('Current library default');
    expect(selectionTruth?.textContent).toContain(
      'This is the only saved project in the library, so it is the current default target.'
    );
  });

  it('keeps an empty library visibly ready instead of implying the route is blocked', async () => {
    projectApi.listProjects.mockResolvedValue([]);

    const mounted = renderLibrary();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    const readiness = mounted.container.querySelector('[data-testid="library-readiness"]');

    expect(readiness?.textContent).toContain('Library readiness');
    expect(readiness?.textContent).toContain('Ready');
    expect(readiness?.textContent).toContain('0 projects in library');
    expect(readiness?.textContent).toContain('The library is ready for your next arrangement.');
    expect(readiness?.textContent).not.toContain('Blocked');
    expect(readiness?.textContent).not.toContain('Waiting');
    expect(mounted.container.textContent).toContain('No projects yet.');
  });

  it('updates filtered delete state and library count honestly after removing a visible project', async () => {
    projectApi.listProjects.mockResolvedValue([
      makeProject({ id: 'project-solo', name: 'Solo Sketch', genre: 'Jazz' }),
      makeProject({
        id: 'project-band',
        name: 'Band Suite',
        genre: 'Pop',
        updatedAt: '2026-03-28T00:00:00Z',
      }),
    ]);

    useUiStore.setState({ libraryCount: 2 });

    const mounted = renderLibrary();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    const searchInput = mounted.container.querySelector(
      '#library-search'
    ) as HTMLInputElement | null;

    expect(searchInput).not.toBeNull();

    act(() => {
      setInputValue(searchInput!, 'solo');
      vi.advanceTimersByTime(300);
    });

    expect(getVisibleProjectNames(mounted.container)).toEqual(['Solo Sketch']);

    const deleteButton = mounted.container.querySelector(
      'button[aria-label="Delete Solo Sketch"]'
    ) as HTMLButtonElement | null;

    expect(deleteButton).not.toBeNull();

    act(() => {
      deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const confirmButton = findButtonByText(mounted.container, 'Delete');
    expect(confirmButton).not.toBeNull();

    await act(async () => {
      confirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(getVisibleProjectNames(mounted.container)).toEqual([]);
    expect(mounted.container.textContent).toContain('No projects match "solo"');
    expect(mounted.container.textContent).not.toContain('No projects yet.');
    expect(useUiStore.getState().libraryCount).toBe(1);
  });

  it('shows the empty state after deleting the final project in the library', async () => {
    projectApi.listProjects.mockResolvedValue([
      makeProject({ id: 'project-last', name: 'Last Project' }),
    ]);

    useUiStore.setState({ libraryCount: 1 });

    const mounted = renderLibrary();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    const deleteButton = mounted.container.querySelector(
      'button[aria-label="Delete Last Project"]'
    ) as HTMLButtonElement | null;

    expect(deleteButton).not.toBeNull();

    act(() => {
      deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const confirmButton = findButtonByText(mounted.container, 'Delete');
    expect(confirmButton).not.toBeNull();

    await act(async () => {
      confirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(getVisibleProjectNames(mounted.container)).toEqual([]);
    expect(mounted.container.textContent).toContain('No projects yet.');
    expect(useUiStore.getState().libraryCount).toBe(0);
  });

  it('keeps the project visible and surfaces the failure when delete does not persist', async () => {
    projectApi.listProjects.mockResolvedValue([
      makeProject({ id: 'project-stuck', name: 'Stuck Delete' }),
    ]);
    projectApi.deleteProject.mockImplementation(async () => {
      useUiStore.getState().setSystemStatus('error', 'Delete blocked by policy');
      return false;
    });

    useUiStore.setState({ libraryCount: 1 });

    const mounted = renderLibrary();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    const deleteButton = mounted.container.querySelector(
      'button[aria-label="Delete Stuck Delete"]'
    ) as HTMLButtonElement | null;

    expect(deleteButton).not.toBeNull();

    act(() => {
      deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const confirmButton = findButtonByText(mounted.container, 'Delete');
    expect(confirmButton).not.toBeNull();

    await act(async () => {
      confirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(getVisibleProjectNames(mounted.container)).toEqual(['Stuck Delete']);
    expect(mounted.container.textContent).toContain('Library action failed');
    expect(mounted.container.textContent).toContain('Delete blocked by policy');
    expect(mounted.container.textContent).not.toContain('No projects yet.');
    expect(useUiStore.getState().libraryCount).toBe(1);
  });

  it('debounces library search and matches name, genre, and key fields', async () => {
    projectApi.listProjects.mockResolvedValue([
      makeProject({ id: 'project-pulse', name: 'Pulse Driver', genre: 'EDM', key: 'F#' }),
      makeProject({ id: 'project-moon', name: 'Moonlight Hymn', genre: 'Folk', key: 'Dm' }),
      makeProject({ id: 'project-solo', name: 'Solo Sketch', genre: 'Jazz', key: 'Bb' }),
    ]);

    const mounted = renderLibrary();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    const searchInput = mounted.container.querySelector(
      '#library-search'
    ) as HTMLInputElement | null;
    expect(searchInput).not.toBeNull();

    act(() => {
      setInputValue(searchInput!, 'pulse');
    });

    expect(getVisibleProjectNames(mounted.container)).toEqual([
      'Pulse Driver',
      'Moonlight Hymn',
      'Solo Sketch',
    ]);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(getVisibleProjectNames(mounted.container)).toEqual(['Pulse Driver']);

    act(() => {
      setInputValue(searchInput!, 'folk');
      vi.advanceTimersByTime(300);
    });

    expect(getVisibleProjectNames(mounted.container)).toEqual(['Moonlight Hymn']);

    act(() => {
      setInputValue(searchInput!, 'bb');
      vi.advanceTimersByTime(300);
    });

    expect(getVisibleProjectNames(mounted.container)).toEqual(['Solo Sketch']);
  });

  it('shows fresh, stale, and incomplete metadata truth on library cards', async () => {
    projectApi.listProjects.mockResolvedValue([
      makeProject({
        id: 'project-fresh',
        name: 'Fresh Cut',
        chordChartRaw: 'Cmaj7 | Fmaj7 | G7 | Cmaj7',
        generationHints: 'Brushes on snare',
        hasArrangement: true,
        generatedAt: '2026-03-29T00:00:00Z',
        generatedTempo: 120,
        updatedAt: '2026-03-29T00:00:00Z',
        tempo: 120,
      }),
      makeProject({
        id: 'project-stale',
        name: 'Stale Cut',
        chordChartRaw: 'Am7 | D7 | Gmaj7 | Cmaj7',
        generationHints: '',
        hasArrangement: true,
        generatedAt: '2026-03-28T00:00:00Z',
        generatedTempo: 100,
        updatedAt: '2026-03-29T00:00:00Z',
        tempo: 120,
      }),
      makeProject({
        id: 'project-incomplete',
        name: 'Incomplete Idea',
        chordChartRaw: 'Dm7 | G7 | Cmaj7 | Cmaj7',
        generationHints: 'Keep it sparse',
        hasArrangement: false,
        generatedAt: null,
        generatedTempo: null,
      }),
    ]);

    const mounted = renderLibrary();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    const freshCard = getProjectCard(mounted.container, 'project-fresh');
    const staleCard = getProjectCard(mounted.container, 'project-stale');
    const incompleteCard = getProjectCard(mounted.container, 'project-incomplete');

    expect(freshCard).not.toBeNull();
    expect(staleCard).not.toBeNull();
    expect(incompleteCard).not.toBeNull();

    expect(freshCard?.textContent).toContain('Fresh');
    expect(freshCard?.textContent).toContain(
      'The saved arrangement matches the latest generated snapshot.'
    );
    expect(freshCard?.textContent).toContain('Current library default');
    expect(freshCard?.textContent).toContain(
      'Fresh Cut is first in the visible library because the most recently saved project comes first.'
    );
    expect(freshCard?.textContent).toContain('Last saved');
    expect(freshCard?.textContent).toContain('Generated tempo');
    expect(freshCard?.textContent).toContain('Chord chart');
    expect(freshCard?.textContent).toContain('Notes');
    expect(freshCard?.textContent).toContain('Arrangement');

    expect(staleCard?.textContent).toContain('Stale');
    expect(staleCard?.textContent).toContain(
      'Saved edits and tempo changes are newer than the last generation.'
    );
    expect(staleCard?.textContent).toContain('100 BPM');

    expect(incompleteCard?.textContent).toContain('Incomplete');
    expect(incompleteCard?.textContent).toContain(
      'Chord chart and notes are saved, but no arrangement is generated yet.'
    );
    expect(incompleteCard?.textContent).toContain('Not yet');
  });

  it('states which visible project is the filtered default target instead of leaving search and sort implied', async () => {
    projectApi.listProjects.mockResolvedValue([
      makeProject({
        id: 'project-beta',
        name: 'Beta Sketch',
        genre: 'Jazz',
        updatedAt: '2026-03-28T00:00:00Z',
      }),
      makeProject({
        id: 'project-alpha',
        name: 'Alpha Sketch',
        genre: 'Jazz',
        updatedAt: '2026-03-29T00:00:00Z',
      }),
      makeProject({
        id: 'project-zeta',
        name: 'Zeta Hymn',
        genre: 'Folk',
        updatedAt: '2026-03-27T00:00:00Z',
      }),
    ]);

    const mounted = renderLibrary();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    const searchInput = mounted.container.querySelector(
      '#library-search'
    ) as HTMLInputElement | null;
    const sortSelect = mounted.container.querySelector('#library-sort') as HTMLSelectElement | null;

    expect(searchInput).not.toBeNull();
    expect(sortSelect).not.toBeNull();

    act(() => {
      setInputValue(searchInput!, 'sketch');
      vi.advanceTimersByTime(300);
      setSelectValue(sortSelect!, 'name-desc');
    });

    const selectionTruth = mounted.container.querySelector('[data-testid="library-selection-truth"]');
    const betaCard = getProjectCard(mounted.container, 'project-beta');
    const alphaCard = getProjectCard(mounted.container, 'project-alpha');

    expect(selectionTruth?.textContent).toContain('Filtered library default');
    expect(selectionTruth?.textContent).toContain(
      'Beta Sketch is first in the visible library after filtering for "sketch" because projects are ordered from Z to A.'
    );
    expect(betaCard?.textContent).toContain('Filtered library default');
    expect(alphaCard?.textContent).not.toContain('Filtered library default');
  });

  it('reorders the visible library grid when the sort mode changes', async () => {
    projectApi.listProjects.mockResolvedValue([
      makeProject({
        id: 'project-bravo',
        name: 'Bravo Sunset',
        tempo: 132,
        updatedAt: '2026-03-28T00:00:00Z',
      }),
      makeProject({
        id: 'project-alpha',
        name: 'Alpha Dawn',
        tempo: 90,
        updatedAt: '2026-03-29T00:00:00Z',
      }),
      makeProject({
        id: 'project-charlie',
        name: 'Charlie Echo',
        tempo: 100,
        updatedAt: '2026-03-27T00:00:00Z',
      }),
    ]);

    const mounted = renderLibrary();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    const sortSelect = mounted.container.querySelector('#library-sort') as HTMLSelectElement | null;
    expect(sortSelect).not.toBeNull();

    expect(getVisibleProjectNames(mounted.container)).toEqual([
      'Alpha Dawn',
      'Bravo Sunset',
      'Charlie Echo',
    ]);

    act(() => {
      setSelectValue(sortSelect!, 'name-desc');
    });

    expect(getVisibleProjectNames(mounted.container)).toEqual([
      'Charlie Echo',
      'Bravo Sunset',
      'Alpha Dawn',
    ]);

    act(() => {
      setSelectValue(sortSelect!, 'tempo');
    });

    expect(getVisibleProjectNames(mounted.container)).toEqual([
      'Alpha Dawn',
      'Charlie Echo',
      'Bravo Sunset',
    ]);
  });
});
