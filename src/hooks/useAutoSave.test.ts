// @vitest-environment jsdom

import { act, createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useAutoSave } from './useAutoSave';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import type { Project } from '@/types';

const saveProjectMock = vi.fn(() => Promise.resolve());
const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock('@/hooks/useProject', () => ({
  useProject: () => ({
    saveProject: saveProjectMock,
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

function AutoSaveHarness() {
  useAutoSave();
  return null;
}

function renderHarness() {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = createRoot(container);

  act(() => {
    root.render(createElement(AutoSaveHarness));
  });

  return { container, root };
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  saveProjectMock.mockClear();

  useProjectStore.setState({ project: makeProject('project-a') });
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
  vi.useRealTimers();
});

describe('useAutoSave', () => {
  it('saves the active project after the debounce window', async () => {
    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    act(() => {
      useUiStore.getState().markDirty();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(saveProjectMock).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending autosave when the project changes before the timer fires', async () => {
    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    act(() => {
      useUiStore.getState().markDirty();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(29_000);
    });

    act(() => {
      useProjectStore.setState({ project: makeProject('project-b') });
      useUiStore.getState().syncProjectSession('idle');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(saveProjectMock).not.toHaveBeenCalled();
  });
});
