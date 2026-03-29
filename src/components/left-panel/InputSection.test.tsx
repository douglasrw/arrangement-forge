// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InputSection } from './InputSection';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import type { Project } from '@/types';

const runGenerationMock = vi.hoisted(() => vi.fn());

vi.mock('./ChordPalette', () => ({
  ChordPalette: () => <div data-testid="chord-palette">Chord palette</div>,
}));

vi.mock('@/hooks/useGenerate', () => ({
  useGenerate: () => ({
    runGeneration: runGenerationMock,
  }),
}));

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function makeProject(partial: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    userId: 'u1',
    name: 'Import Test Project',
    key: 'C',
    tempo: 120,
    timeSignature: '4/4',
    genre: 'Jazz',
    subStyle: 'Swing',
    energy: 60,
    groove: 60,
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

function renderSection() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<InputSection />);
  });

  return { container, root };
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  runGenerationMock.mockReset();

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

describe('InputSection upload tab', () => {
  it('imports a plain-text chord chart file into the current project', async () => {
    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const uploadTabButton = Array.from(mounted.container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Upload'
    ) as HTMLButtonElement | undefined;

    expect(uploadTabButton).not.toBeUndefined();

    act(() => {
      uploadTabButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const fileInput = mounted.container.querySelector(
      '#upload-chord-chart-input'
    ) as HTMLInputElement | null;

    expect(fileInput).not.toBeNull();

    const importedChordChart = '[Verse]\nCmaj7 | Dm7 | G7 | Cmaj7';
    const file = new File(['placeholder'], 'bridge-chart.txt', { type: 'text/plain' });
    vi.spyOn(file, 'text').mockResolvedValue(importedChordChart);

    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [file],
    });

    await act(async () => {
      fileInput?.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(useProjectStore.getState().project?.chordChartRaw).toBe(importedChordChart);
    expect(mounted.container.textContent).toContain('Last imported: bridge-chart.txt');

    const generateButton = Array.from(mounted.container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Generate'
    ) as HTMLButtonElement | undefined;

    expect(generateButton?.disabled).toBe(false);
  });
});
