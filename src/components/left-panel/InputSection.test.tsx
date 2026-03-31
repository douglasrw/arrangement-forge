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

function openUploadTab(container: HTMLDivElement) {
  const uploadTabButton = Array.from(container.querySelectorAll('button')).find(
    (button) => button.textContent === 'Upload'
  ) as HTMLButtonElement | undefined;

  expect(uploadTabButton).not.toBeUndefined();

  act(() => {
    uploadTabButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function getUploadFileInput(container: HTMLDivElement) {
  const fileInput = container.querySelector('#upload-chord-chart-input') as HTMLInputElement | null;

  expect(fileInput).not.toBeNull();
  return fileInput as HTMLInputElement;
}

function getGenerateButton(container: HTMLDivElement) {
  const generateButton = Array.from(container.querySelectorAll('button')).find(
    (button) => ['Generate', 'Generating...', 'Importing...'].includes(button.textContent ?? '')
  ) as HTMLButtonElement | undefined;

  expect(generateButton).not.toBeUndefined();
  return generateButton as HTMLButtonElement;
}

async function importFile(fileInput: HTMLInputElement, file: File) {
  Object.defineProperty(fileInput, 'files', {
    configurable: true,
    value: [file],
  });

  await act(async () => {
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;
let consoleErrorSpy: ReturnType<typeof vi.spyOn> | null = null;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  runGenerationMock.mockReset();
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
  consoleErrorSpy?.mockRestore();
  consoleErrorSpy = null;

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
  it('surfaces empty readiness truth before a chord chart exists', () => {
    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const readiness = mounted.container.querySelector('[data-input-readiness]') as HTMLDivElement | null;

    expect(readiness?.getAttribute('data-input-readiness')).toBe('empty');
    expect(mounted.container.textContent).toContain('Chord chart needed');
    expect(getGenerateButton(mounted.container).disabled).toBe(true);
  });

  it('surfaces ready readiness when the project already has a chord chart', () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: '[Verse]\nCmaj7 | Dm7 | G7 | Cmaj7',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const readiness = mounted.container.querySelector('[data-input-readiness]') as HTMLDivElement | null;

    expect(readiness?.getAttribute('data-input-readiness')).toBe('ready');
    expect(mounted.container.textContent).toContain('Input is ready');
    expect(getGenerateButton(mounted.container).disabled).toBe(false);
  });

  it('surfaces parse failure truth when the current chord chart has invalid bars', () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: 'Cmaj7 | xyz?? | %',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const parseTruth = mounted.container.querySelector(
      '[data-chord-chart-parse-state]'
    ) as HTMLDivElement | null;
    const readiness = mounted.container.querySelector('[data-input-readiness]') as HTMLDivElement | null;

    expect(parseTruth?.getAttribute('data-chord-chart-parse-state')).toBe('attention');
    expect(readiness?.getAttribute('data-input-readiness')).toBe('blocked');
    expect(mounted.container.textContent).toContain('Chord chart needs fixes');
    expect(mounted.container.textContent).toContain(
      'Flagged bars would resolve to N.C. during generation. Fix the chart before generating.'
    );
    expect(mounted.container.textContent).toContain('Chord chart has parse issues');
    expect(mounted.container.textContent).toContain('Bars 2 and 3 will become N.C. during generation.');
    expect(mounted.container.textContent).toContain('1 bar has an unrecognized chord token.');
    expect(mounted.container.textContent).toContain('1 repeat marker follows an unresolved bar.');
    expect(mounted.container.textContent).toContain(
      'Replace the flagged repeat bars with explicit chords or fix the bar before them.'
    );
    expect(mounted.container.textContent).toContain('Bar 2: could not parse "xyz??"');
    expect(mounted.container.textContent).toContain(
      'Bar 3: repeat marker "%" follows a bar that could not be resolved'
    );
    expect(getGenerateButton(mounted.container).disabled).toBe(true);
  });

  it('surfaces the next step when a repeat marker starts before any chord', () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: '% | Cmaj7 | Fmaj7',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.textContent).toContain('Bar 1 will become N.C. during generation.');
    expect(mounted.container.textContent).toContain('1 repeat marker starts before any chord.');
    expect(mounted.container.textContent).toContain(
      'Replace the flagged repeat bars with explicit chords or fix the bar before them.'
    );
    expect(mounted.container.textContent).toContain(
      'Bar 1: repeat marker "%" with no previous chord'
    );
  });

  it('shows waiting readiness truth and blocks uploads while generation is running', () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: '[Verse]\nCmaj7 | Dm7 | G7 | Cmaj7',
      }),
    });
    useUiStore.setState({
      generationState: 'generating',
      systemStatus: 'generating',
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const readiness = mounted.container.querySelector('[data-input-readiness]') as HTMLDivElement | null;

    expect(readiness?.getAttribute('data-input-readiness')).toBe('waiting');
    expect(mounted.container.textContent).toContain('Generation in progress');

    openUploadTab(mounted.container);

    const uploadPanel = mounted.container.querySelector('[data-upload-readiness]') as HTMLDivElement | null;
    expect(uploadPanel?.getAttribute('data-upload-readiness')).toBe('blocked');

    const fileInput = getUploadFileInput(mounted.container);
    expect(fileInput.disabled).toBe(true);
    expect(mounted.container.textContent).toContain(
      'Import is paused while the current arrangement is generating.'
    );
    expect(getGenerateButton(mounted.container).disabled).toBe(true);
    expect(getGenerateButton(mounted.container).textContent).toBe('Generating...');
  });

  it('imports a plain-text chord chart file into the current project', async () => {
    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    openUploadTab(mounted.container);
    const fileInput = getUploadFileInput(mounted.container);

    const importedChordChart = '[Verse]\nCmaj7 | Dm7 | G7 | Cmaj7';
    const file = new File(['placeholder'], 'bridge-chart.txt', { type: 'text/plain' });
    vi.spyOn(file, 'text').mockResolvedValue(importedChordChart);

    await importFile(fileInput, file);

    expect(useProjectStore.getState().project?.chordChartRaw).toBe(importedChordChart);
    expect(mounted.container.textContent).toContain(
      'Imported bridge-chart.txt into the current chord chart.'
    );
    expect(getGenerateButton(mounted.container).disabled).toBe(false);
  });

  it('moves imported note text into the project description and keeps the chart generate-ready', async () => {
    useProjectStore.setState({
      project: makeProject({
        generationHints: 'Old notes',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    openUploadTab(mounted.container);
    const fileInput = getUploadFileInput(mounted.container);

    const file = new File(['placeholder'], 'arrangement-with-notes.txt', { type: 'text/plain' });
    vi.spyOn(file, 'text').mockResolvedValue(
      'Description: Jazz waltz, brushes on snare\n[Verse]\nCmaj7 | Dm7 | G7 | Cmaj7'
    );

    await importFile(fileInput, file);

    expect(useProjectStore.getState().project).toMatchObject({
      chordChartRaw: '[Verse]\nCmaj7 | Dm7 | G7 | Cmaj7',
      generationHints: 'Jazz waltz, brushes on snare',
    });
    expect(mounted.container.textContent).toContain(
      'Imported arrangement-with-notes.txt and updated Description with 1 note line.'
    );
    expect(getGenerateButton(mounted.container).disabled).toBe(false);
  });

  it('preserves imported upload state when switching between upload, text, and chord tabs', async () => {
    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    openUploadTab(mounted.container);
    const fileInput = getUploadFileInput(mounted.container);

    const file = new File(['placeholder'], 'tab-switch-import.txt', { type: 'text/plain' });
    vi.spyOn(file, 'text').mockResolvedValue(
      'Description: Brushes on snare\nVerse:\nCmaj7 | Dm7 | G7 | Cmaj7'
    );

    await importFile(fileInput, file);

    const textTabButton = Array.from(mounted.container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Text'
    ) as HTMLButtonElement | undefined;

    expect(textTabButton).not.toBeUndefined();

    act(() => {
      textTabButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const chordChartTextarea = mounted.container.querySelector(
      '#chord-chart-raw-input'
    ) as HTMLTextAreaElement | null;
    const descriptionTextarea = mounted.container.querySelector(
      '#description-input'
    ) as HTMLTextAreaElement | null;

    expect(chordChartTextarea?.value).toBe('[Verse]\nCmaj7 | Dm7 | G7 | Cmaj7');
    expect(descriptionTextarea?.value).toBe('Brushes on snare');

    const chordTabButton = Array.from(mounted.container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Chord'
    ) as HTMLButtonElement | undefined;

    expect(chordTabButton).not.toBeUndefined();

    act(() => {
      chordTabButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mounted.container.querySelector('#chord-chart-raw-input')).toBeNull();
    expect(mounted.container.querySelector('#upload-chord-chart-input')).toBeNull();

    act(() => {
      textTabButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const chordChartTextareaAfterSwitch = mounted.container.querySelector(
      '#chord-chart-raw-input'
    ) as HTMLTextAreaElement | null;
    const descriptionTextareaAfterSwitch = mounted.container.querySelector(
      '#description-input'
    ) as HTMLTextAreaElement | null;

    expect(chordChartTextareaAfterSwitch?.value).toBe('[Verse]\nCmaj7 | Dm7 | G7 | Cmaj7');
    expect(descriptionTextareaAfterSwitch?.value).toBe('Brushes on snare');
  });

  it('rejects empty imports without overwriting the current chord chart', async () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: 'Cmaj7 | Fmaj7 | G7 | Cmaj7',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    openUploadTab(mounted.container);
    const fileInput = getUploadFileInput(mounted.container);

    const file = new File(['placeholder'], 'empty-chart.txt', { type: 'text/plain' });
    vi.spyOn(file, 'text').mockResolvedValue(' \n\t ');

    await importFile(fileInput, file);

    expect(useProjectStore.getState().project?.chordChartRaw).toBe('Cmaj7 | Fmaj7 | G7 | Cmaj7');
    expect(mounted.container.textContent).toContain(
      'No chord chart was found in that file. Current chord chart was left unchanged.'
    );
  });

  it('surfaces when a no-note import keeps the existing description in place', async () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: 'Am7 | D7 | Gmaj7 | Cmaj7',
        generationHints: 'Keep the brushes light',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    openUploadTab(mounted.container);
    const fileInput = getUploadFileInput(mounted.container);

    const file = new File(['placeholder'], 'fresh-chart.txt', { type: 'text/plain' });
    vi.spyOn(file, 'text').mockResolvedValue('[Verse]\nDm7 | G7 | Cmaj7 | Cmaj7');

    await importFile(fileInput, file);

    expect(useProjectStore.getState().project).toMatchObject({
      chordChartRaw: '[Verse]\nDm7 | G7 | Cmaj7 | Cmaj7',
      generationHints: 'Keep the brushes light',
    });
    expect(mounted.container.textContent).toContain(
      'Imported fresh-chart.txt into the current chord chart. Existing Description was kept.'
    );
  });

  it('surfaces an explicit error for unreadable uploads', async () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: 'Dm7 | G7 | Cmaj7 | Cmaj7',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    openUploadTab(mounted.container);
    const fileInput = getUploadFileInput(mounted.container);

    const file = new File(['placeholder'], 'broken-chart.txt', { type: 'text/plain' });
    vi.spyOn(file, 'text').mockRejectedValue(new Error('Disk read failed'));

    await importFile(fileInput, file);

    expect(useProjectStore.getState().project?.chordChartRaw).toBe('Dm7 | G7 | Cmaj7 | Cmaj7');
    expect(mounted.container.textContent).toContain(
      'Could not read that file. Current chord chart was left unchanged.'
    );
  });

  it('surfaces an explicit error for unsupported uploads', async () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: 'Am7 | D7 | Gmaj7 | Cmaj7',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    openUploadTab(mounted.container);
    const fileInput = getUploadFileInput(mounted.container);

    const file = new File(['{"chart":"C"}'], 'chart.json', { type: 'application/json' });

    await importFile(fileInput, file);

    expect(useProjectStore.getState().project?.chordChartRaw).toBe('Am7 | D7 | Gmaj7 | Cmaj7');
    expect(mounted.container.textContent).toContain(
      'Unsupported file type. Upload a plain-text chord chart file (.txt).'
    );
  });
});
