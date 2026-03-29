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
  return Array.from(container.querySelectorAll('button')).find(
    (button): button is HTMLButtonElement => button.textContent?.trim() === text
  ) ?? null;
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
  });

  it('updates filtered delete state and library count honestly after removing a visible project', async () => {
    projectApi.listProjects.mockResolvedValue([
      makeProject({ id: 'project-solo', name: 'Solo Sketch', genre: 'Jazz' }),
      makeProject({ id: 'project-band', name: 'Band Suite', genre: 'Pop', updatedAt: '2026-03-28T00:00:00Z' }),
    ]);

    useUiStore.setState({ libraryCount: 2 });

    const mounted = renderLibrary();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    const searchInput = mounted.container.querySelector('#library-search') as HTMLInputElement | null;

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
    projectApi.listProjects.mockResolvedValue([makeProject({ id: 'project-last', name: 'Last Project' })]);

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
    projectApi.listProjects.mockResolvedValue([makeProject({ id: 'project-stuck', name: 'Stuck Delete' })]);
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

    const searchInput = mounted.container.querySelector('#library-search') as HTMLInputElement | null;
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

  it('reorders the visible library grid when the sort mode changes', async () => {
    projectApi.listProjects.mockResolvedValue([
      makeProject({ id: 'project-bravo', name: 'Bravo Sunset', tempo: 132, updatedAt: '2026-03-28T00:00:00Z' }),
      makeProject({ id: 'project-alpha', name: 'Alpha Dawn', tempo: 90, updatedAt: '2026-03-29T00:00:00Z' }),
      makeProject({ id: 'project-charlie', name: 'Charlie Echo', tempo: 100, updatedAt: '2026-03-27T00:00:00Z' }),
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
