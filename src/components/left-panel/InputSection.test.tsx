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

function openTextTab(container: HTMLDivElement) {
  const textTabButton = Array.from(container.querySelectorAll('button')).find(
    (button) => button.textContent === 'Text'
  ) as HTMLButtonElement | undefined;

  expect(textTabButton).not.toBeUndefined();

  act(() => {
    textTabButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
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
    const tabTruth = mounted.container.querySelector(
      '[data-input-tab-selection-state]'
    ) as HTMLDivElement | null;
    const generateGate = mounted.container.querySelector('[data-generate-gate-state]') as HTMLParagraphElement | null;

    expect(readiness?.getAttribute('data-input-readiness')).toBe('empty');
    expect(tabTruth?.getAttribute('data-input-tab-selection-state')).toBe('default');
    expect(tabTruth?.textContent).toContain('Default tab');
    expect(tabTruth?.textContent).toContain(
      'Chord is active because Input opens on the song chord chart by default.'
    );
    expect(tabTruth?.textContent).toContain('Current selection: Chord palette (empty chart)');
    expect(tabTruth?.textContent).toContain(
      'Use Text for line-by-line chart edits or Upload to replace the chart from file.'
    );
    expect(mounted.container.textContent).toContain('Chord chart needed');
    expect(generateGate?.getAttribute('data-generate-gate-state')).toBe('waiting');
    expect(generateGate?.textContent).toBe(
      'Generate unlocks after the chord chart includes at least one bar.'
    );
    expect(getGenerateButton(mounted.container).disabled).toBe(true);
  });

  it('keeps the current input tab and default behavior explicit as the operator switches tabs', () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: '[Verse]\nCmaj7 | Dm7 | G7 | Cmaj7',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const tabTruth = () =>
      mounted.container.querySelector('[data-input-tab-selection-state]') as HTMLDivElement | null;

    expect(tabTruth()?.getAttribute('data-input-tab-selection-state')).toBe('default');
    expect(tabTruth()?.textContent).toContain('Current selection: Chord palette');

    openTextTab(mounted.container);

    expect(tabTruth()?.getAttribute('data-input-tab-selection-state')).toBe('selected');
    expect(tabTruth()?.textContent).toContain('Text selected');
    expect(tabTruth()?.textContent).toContain(
      'Text is active so the raw chord chart and Description can be edited directly.'
    );
    expect(tabTruth()?.textContent).toContain('Current selection: Text editor');

    openUploadTab(mounted.container);

    expect(tabTruth()?.getAttribute('data-input-tab-selection-state')).toBe('selected');
    expect(tabTruth()?.textContent).toContain('Upload selected');
    expect(tabTruth()?.textContent).toContain(
      'Upload is active so the next plain-text file import will replace the current chord chart.'
    );
    expect(tabTruth()?.textContent).toContain('Current selection: File import');
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

  it('keeps text-entry section labels from masquerading as invalid chord bars', () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: 'Verse:\nCmaj7 | Dm7 | G7 | Cmaj7',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;
    openTextTab(mounted.container);

    const readiness = mounted.container.querySelector('[data-input-readiness]') as HTMLDivElement | null;
    const parseTruth = mounted.container.querySelector(
      '[data-chord-chart-parse-state]'
    ) as HTMLDivElement | null;
    const chordChartInput = mounted.container.querySelector('#chord-chart-raw-input') as HTMLTextAreaElement | null;
    const chordChartHint = mounted.container.querySelector(
      '[data-chord-chart-editor-state]'
    ) as HTMLParagraphElement | null;

    expect(readiness?.getAttribute('data-input-readiness')).toBe('ready');
    expect(parseTruth).toBeNull();
    expect(chordChartInput?.getAttribute('aria-invalid')).toBe('false');
    expect(chordChartHint?.getAttribute('data-chord-chart-editor-state')).toBe('ready');
    expect(mounted.container.textContent).toContain('Input is ready');
    expect(getGenerateButton(mounted.container).disabled).toBe(false);
  });

  it('keeps header-only charts visibly blocked until a playable bar is entered', () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: '[Verse]\n\nChorus:',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;
    openTextTab(mounted.container);

    const parseTruth = mounted.container.querySelector(
      '[data-chord-chart-parse-state]'
    ) as HTMLDivElement | null;
    const readiness = mounted.container.querySelector('[data-input-readiness]') as HTMLDivElement | null;
    const chordChartInput = mounted.container.querySelector('#chord-chart-raw-input') as HTMLTextAreaElement | null;
    const chordChartHint = mounted.container.querySelector(
      '[data-chord-chart-editor-state]'
    ) as HTMLParagraphElement | null;

    expect(parseTruth?.getAttribute('data-chord-chart-parse-state')).toBe('blocked');
    expect(readiness?.getAttribute('data-input-readiness')).toBe('blocked');
    expect(chordChartInput?.getAttribute('aria-invalid')).toBe('true');
    expect(mounted.container.textContent).toContain('Chord chart needs chord bars');
    expect(mounted.container.textContent).toContain(
      'No playable chord bars are present yet, so Generate stays blocked until the chart includes at least one chord bar.'
    );
    expect(mounted.container.textContent).toContain(
      'Section labels and blank lines do not create playable bars on their own.'
    );
    expect(mounted.container.textContent).toContain(
      'Next step: Add at least one chord bar such as Cmaj7 | Fmaj7 | G7 | Cmaj7.'
    );
    expect(chordChartHint?.textContent).toContain(
      'No playable chord bars are present yet, so Generate stays blocked until the chart includes at least one chord bar.'
    );
    expect(chordChartHint?.textContent).toContain(
      'Section labels and blank lines do not create playable bars on their own.'
    );
    expect(getGenerateButton(mounted.container).disabled).toBe(true);
  });

  it('keeps no-chord-only charts visibly blocked until a playable bar is entered', () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: 'N.C. | - | nc',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;
    openTextTab(mounted.container);

    const parseTruth = mounted.container.querySelector(
      '[data-chord-chart-parse-state]'
    ) as HTMLDivElement | null;
    const readiness = mounted.container.querySelector('[data-input-readiness]') as HTMLDivElement | null;
    const chordChartInput = mounted.container.querySelector('#chord-chart-raw-input') as HTMLTextAreaElement | null;
    const chordChartHint = mounted.container.querySelector(
      '[data-chord-chart-editor-state]'
    ) as HTMLParagraphElement | null;

    expect(parseTruth?.getAttribute('data-chord-chart-parse-state')).toBe('blocked');
    expect(readiness?.getAttribute('data-input-readiness')).toBe('blocked');
    expect(chordChartInput?.getAttribute('aria-invalid')).toBe('true');
    expect(mounted.container.textContent).toContain('Chord chart needs chord bars');
    expect(mounted.container.textContent).toContain(
      'The current chart only contains N.C. or rest bars, so Generate stays blocked until at least one playable chord bar is entered.'
    );
    expect(mounted.container.textContent).toContain(
      'Bars marked as N.C. or rest do not create playable harmony on their own.'
    );
    expect(mounted.container.textContent).toContain(
      'Next step: Replace at least one N.C. or rest bar with a chord such as Cmaj7 | Fmaj7 | G7 | Cmaj7.'
    );
    expect(chordChartHint?.textContent).toContain(
      'The current chart only contains N.C. or rest bars, so Generate stays blocked until at least one playable chord bar is entered.'
    );
    expect(chordChartHint?.textContent).toContain(
      'Bars marked as N.C. or rest do not create playable harmony on their own.'
    );
    expect(chordChartHint?.textContent).toContain(
      'Next step: Replace at least one N.C. or rest bar with a chord such as Cmaj7 | Fmaj7 | G7 | Cmaj7.'
    );
    expect(getGenerateButton(mounted.container).disabled).toBe(true);
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
    openTextTab(mounted.container);

    const parseTruth = mounted.container.querySelector(
      '[data-chord-chart-parse-state]'
    ) as HTMLDivElement | null;
    const readiness = mounted.container.querySelector('[data-input-readiness]') as HTMLDivElement | null;
    const chordChartInput = mounted.container.querySelector('#chord-chart-raw-input') as HTMLTextAreaElement | null;
    const chordChartHint = mounted.container.querySelector(
      '[data-chord-chart-editor-state]'
    ) as HTMLParagraphElement | null;
    const generateGate = mounted.container.querySelector('[data-generate-gate-state]') as HTMLParagraphElement | null;

    expect(parseTruth?.getAttribute('data-chord-chart-parse-state')).toBe('blocked');
    expect(readiness?.getAttribute('data-input-readiness')).toBe('blocked');
    expect(chordChartInput?.getAttribute('aria-invalid')).toBe('true');
    expect(chordChartInput?.getAttribute('aria-describedby')).toBe('chord-chart-raw-input-hint');
    expect(chordChartHint?.getAttribute('data-chord-chart-editor-state')).toBe('blocked');
    expect(readiness?.textContent).toContain(
      '1 bar has an unrecognized chord token.'
    );
    expect(readiness?.textContent).toContain(
      '1 repeat marker follows an unresolved bar.'
    );
    expect(readiness?.textContent).toContain(
      'Blocked tokens: bar 2 "xyz??"; bar 3 "%".'
    );
    expect(readiness?.textContent).toContain(
      'Flagged chart locations: Line 1, bar 2: could not parse "xyz??"'
    );
    expect(mounted.container.textContent).toContain('Chord chart has parse issues');
    expect(mounted.container.textContent).toContain(
      '1 of 3 bars are ready. Bars 2 and 3 currently parse as N.C., so Generate stays blocked until the chart is fixed.'
    );
    expect(mounted.container.textContent).toContain('1 bar has an unrecognized chord token.');
    expect(mounted.container.textContent).toContain('1 repeat marker follows an unresolved bar.');
    expect(mounted.container.textContent).toContain(
      'Next step: Replace bars 2 and 3 with explicit chords or fix the bar before them.'
    );
    expect(mounted.container.textContent).toContain(
      'Blocked tokens: bar 2 "xyz??"; bar 3 "%".'
    );
    expect(mounted.container.textContent).toContain('Blocked');
    expect(mounted.container.textContent).toContain(
      'Flagged chart locations: Line 1, bar 2: could not parse "xyz??"'
    );
    expect(mounted.container.textContent).toContain('Line 1, bar 2: could not parse "xyz??"');
    expect(mounted.container.textContent).toContain(
      'Line 1, bar 3: repeat marker "%" follows a bar that could not be resolved'
    );
    expect(chordChartHint?.textContent).toContain(
      '1 of 3 bars are ready. Bars 2 and 3 currently parse as N.C., so Generate stays blocked until the chart is fixed.'
    );
    expect(chordChartHint?.textContent).toContain(
      '1 bar has an unrecognized chord token.'
    );
    expect(chordChartHint?.textContent).toContain(
      '1 repeat marker follows an unresolved bar.'
    );
    expect(chordChartHint?.textContent).toContain(
      'Next step: Replace bars 2 and 3 with explicit chords or fix the bar before them.'
    );
    expect(chordChartHint?.textContent).toContain(
      'Blocked tokens: bar 2 "xyz??"; bar 3 "%".'
    );
    expect(chordChartHint?.textContent).toContain(
      'Flagged chart locations: Line 1, bar 2: could not parse "xyz??"'
    );
    expect(chordChartHint?.textContent).toContain(
      'Line 1, bar 3: repeat marker "%" follows a bar that could not be resolved'
    );
    expect(generateGate?.getAttribute('data-generate-gate-state')).toBe('blocked');
    expect(generateGate?.textContent).toBe(
      'Generate is blocked. Next step: Replace bars 2 and 3 with explicit chords or fix the bar before them.'
    );
    expect(getGenerateButton(mounted.container).disabled).toBe(true);
  });

  it('turns blocked chord-chart recovery into a direct action from the default tab', () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: '[Verse]\n\nCmaj7 | xyz?? | %',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const reviewButton = Array.from(mounted.container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Review chord chart text at line 3'
    ) as HTMLButtonElement | undefined;

    expect(reviewButton).not.toBeUndefined();

    act(() => {
      reviewButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const chordChartInput = mounted.container.querySelector('#chord-chart-raw-input') as HTMLTextAreaElement | null;
    const tabTruth = mounted.container.querySelector(
      '[data-input-tab-selection-state]'
    ) as HTMLDivElement | null;

    expect(chordChartInput).not.toBeNull();
    expect(document.activeElement).toBe(chordChartInput);
    expect(chordChartInput?.selectionStart).toBe(9);
    expect(chordChartInput?.selectionEnd).toBe(26);
    expect(chordChartInput?.value.slice(chordChartInput.selectionStart, chordChartInput.selectionEnd)).toBe(
      'Cmaj7 | xyz?? | %'
    );
    expect(tabTruth?.getAttribute('data-input-tab-selection-state')).toBe('selected');
    expect(tabTruth?.textContent).toContain('Text selected');
    expect(tabTruth?.textContent).toContain(
      'Text is active so the raw chord chart truth and any blocked rows can be reviewed directly.'
    );
    expect(tabTruth?.textContent).toContain(
      'The blocked chart row at line 3 is focused here for direct review.'
    );
    expect(
      Array.from(mounted.container.querySelectorAll('button')).some(
        (button) => button.textContent === 'Review chord chart text at line 3'
      )
    ).toBe(false);
    expect(mounted.container.textContent).toContain(
      'Blocked tokens: bar 2 "xyz??"; bar 3 "%".'
    );
  });

  it('keeps all-invalid charts visibly blocked with parse failure truth instead of generic missing-bar copy', () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: 'xyz?? | %',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;
    openTextTab(mounted.container);

    const parseTruth = mounted.container.querySelector(
      '[data-chord-chart-parse-state]'
    ) as HTMLDivElement | null;
    const readiness = mounted.container.querySelector('[data-input-readiness]') as HTMLDivElement | null;
    const chordChartHint = mounted.container.querySelector(
      '[data-chord-chart-editor-state]'
    ) as HTMLParagraphElement | null;

    expect(parseTruth?.getAttribute('data-chord-chart-parse-state')).toBe('blocked');
    expect(readiness?.getAttribute('data-input-readiness')).toBe('blocked');
    expect(mounted.container.textContent).toContain('Chord chart has parse issues');
    expect(mounted.container.textContent).toContain(
      '0 of 2 bars are ready. Bars 1 and 2 currently parse as N.C., so Generate stays blocked until the chart is fixed.'
    );
    expect(mounted.container.textContent).toContain('1 bar has an unrecognized chord token.');
    expect(mounted.container.textContent).toContain('1 repeat marker follows an unresolved bar.');
    expect(mounted.container.textContent).toContain(
      'Next step: Replace bars 1 and 2 with explicit chords or fix the bar before them.'
    );
    expect(mounted.container.textContent).toContain(
      'Blocked tokens: bar 1 "xyz??"; bar 2 "%".'
    );
    expect(mounted.container.textContent).toContain(
      'Flagged chart locations: Line 1, bar 1: could not parse "xyz??"'
    );
    expect(chordChartHint?.textContent).toContain(
      '0 of 2 bars are ready. Bars 1 and 2 currently parse as N.C., so Generate stays blocked until the chart is fixed.'
    );
    expect(chordChartHint?.textContent).toContain(
      '1 bar has an unrecognized chord token.'
    );
    expect(chordChartHint?.textContent).toContain(
      '1 repeat marker follows an unresolved bar.'
    );
    expect(chordChartHint?.textContent).toContain(
      'Blocked tokens: bar 1 "xyz??"; bar 2 "%".'
    );
    expect(chordChartHint?.textContent).toContain(
      'Line 1, bar 2: repeat marker "%" follows a bar that could not be resolved'
    );
    expect(mounted.container.textContent).not.toContain('Chord chart needs chord bars');
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

    expect(mounted.container.textContent).toContain(
      'Bar 1 currently parses as N.C., so Generate stays blocked until the chart is fixed.'
    );
    expect(mounted.container.textContent).toContain('1 repeat marker starts before any chord.');
    expect(mounted.container.textContent).toContain(
      'Replace bar 1 with explicit chords before using repeat markers.'
    );
    expect(mounted.container.textContent).toContain(
      'Line 1, bar 1: repeat marker "%" with no previous chord'
    );
  });

  it('keeps blocked upload next steps honest when an imported chart starts with a repeat marker', async () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: 'Cmaj7 | Fmaj7 | G7 | Cmaj7',
        generationHints: 'Keep the brushes light',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    openUploadTab(mounted.container);
    const fileInput = getUploadFileInput(mounted.container);

    const file = new File(['placeholder'], 'leading-repeat.txt', { type: 'text/plain' });
    vi.spyOn(file, 'text').mockResolvedValue('% | Cmaj7 | Fmaj7');

    await importFile(fileInput, file);

    expect(mounted.container.textContent).toContain(
      'Chart is blocked: Chord chart needs attention. 2 of 3 bars are ready. Bar 1 currently parses as N.C., so Generate stays blocked until the chart is fixed.'
    );
    expect(mounted.container.textContent).toContain(
      'Why it is blocked: 1 repeat marker starts before any chord.'
    );
    expect(mounted.container.textContent).toContain(
      'Next step: Replace bar 1 with explicit chords before using repeat markers.'
    );
    expect(mounted.container.textContent).toContain(
      'Line 1, bar 1: repeat marker "%" with no previous chord'
    );
  });

  it('keeps additional blocked bars explicit when parse highlights are truncated', () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: 'xyz?? | % | / | % | Cmaj7',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.textContent).toContain(
      'Flagged chart locations: Line 1, bar 1: could not parse "xyz??"'
    );
    expect(mounted.container.textContent).toContain(
      'Line 1, bar 2: repeat marker "%" follows a bar that could not be resolved'
    );
    expect(mounted.container.textContent).toContain(
      'Line 1, bar 3: repeat marker "/" follows a bar that could not be resolved'
    );
    expect(mounted.container.textContent).toContain(
      '1 more flagged bar needs review in the chord chart before generation.'
    );
  });

  it('keeps the chord chart field hint self-contained when only the first parse highlights are surfaced', () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: 'xyz?? | % | / | % | Cmaj7',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;
    openTextTab(mounted.container);

    const chordChartHint = mounted.container.querySelector(
      '[data-chord-chart-editor-state]'
    ) as HTMLParagraphElement | null;

    expect(chordChartHint?.textContent).toContain(
      'Bars 1, 2, 3, and 4 currently parse as N.C., so Generate stays blocked until the chart is fixed.'
    );
    expect(chordChartHint?.textContent).toContain(
      'Flagged chart locations: Line 1, bar 1: could not parse "xyz??"'
    );
    expect(chordChartHint?.textContent).toContain(
      'Line 1, bar 2: repeat marker "%" follows a bar that could not be resolved'
    );
    expect(chordChartHint?.textContent).toContain(
      'Line 1, bar 3: repeat marker "/" follows a bar that could not be resolved'
    );
    expect(chordChartHint?.textContent).toContain(
      '1 more flagged bar needs review in the chord chart before generation.'
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

  it('keeps uploaded invalid chord bars in the chart so parse failure truth stays visible', async () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: 'Cmaj7 | Fmaj7 | G7 | Cmaj7',
        generationHints: 'Keep the brushes light',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    openUploadTab(mounted.container);
    const fileInput = getUploadFileInput(mounted.container);

    const file = new File(['placeholder'], 'broken-bars.txt', { type: 'text/plain' });
    vi.spyOn(file, 'text').mockResolvedValue('[Verse]\nCmaj7 | xyz?? | % | Cmaj7');

    await importFile(fileInput, file);

    expect(useProjectStore.getState().project).toMatchObject({
      chordChartRaw: '[Verse]\nCmaj7 | xyz?? | % | Cmaj7',
      generationHints: 'Keep the brushes light',
    });
    expect(mounted.container.textContent).toContain(
      'Imported broken-bars.txt into the current chord chart. Existing Description was kept.'
    );
    expect(mounted.container.textContent).toContain(
      'Chart is blocked: Chord chart has parse issues. 2 of 4 bars are ready. Bars 2 and 3 currently parse as N.C., so Generate stays blocked until the chart is fixed.'
    );
    expect(mounted.container.textContent).toContain(
      'Why it is blocked: 1 bar has an unrecognized chord token. 1 repeat marker follows an unresolved bar.'
    );
    expect(mounted.container.textContent).toContain(
      'Next step: Replace bars 2 and 3 with explicit chords or fix the bar before them.'
    );
    expect(mounted.container.textContent).toContain(
      'Blocked tokens: bar 2 "xyz??"; bar 3 "%".'
    );
    expect(mounted.container.textContent).toContain(
      'Flagged chart locations: Line 2, bar 2: could not parse "xyz??"'
    );
    expect(mounted.container.textContent).toContain(
      'Line 2, bar 3: repeat marker "%" follows a bar that could not be resolved'
    );
    expect(mounted.container.textContent).toContain('Chord chart has parse issues');
    expect(mounted.container.textContent).toContain(
      '2 of 4 bars are ready. Bars 2 and 3 currently parse as N.C., so Generate stays blocked until the chart is fixed.'
    );
    expect(
      mounted.container.querySelector('[data-upload-feedback-tone="blocked"]')
    ).not.toBeNull();
    expect(getGenerateButton(mounted.container).disabled).toBe(true);
  });

  it('keeps uploaded invalid space-delimited chord rows in the chart so parse failure truth stays visible', async () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: 'Cmaj7 | Fmaj7 | G7 | Cmaj7',
        generationHints: 'Keep the brushes light',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    openUploadTab(mounted.container);
    const fileInput = getUploadFileInput(mounted.container);

    const file = new File(['placeholder'], 'broken-spaces.txt', { type: 'text/plain' });
    vi.spyOn(file, 'text').mockResolvedValue('[Verse]\nCmaj7 xyz?? % Cmaj7');

    await importFile(fileInput, file);

    expect(useProjectStore.getState().project).toMatchObject({
      chordChartRaw: '[Verse]\nCmaj7 xyz?? % Cmaj7',
      generationHints: 'Keep the brushes light',
    });
    expect(mounted.container.textContent).toContain(
      'Imported broken-spaces.txt into the current chord chart. Existing Description was kept.'
    );
    expect(mounted.container.textContent).toContain(
      'Chart is blocked: Chord chart has parse issues. 2 of 4 bars are ready. Bars 2 and 3 currently parse as N.C., so Generate stays blocked until the chart is fixed.'
    );
    expect(mounted.container.textContent).toContain(
      'Next step: Replace bars 2 and 3 with explicit chords or fix the bar before them.'
    );
    expect(mounted.container.textContent).toContain(
      'Blocked tokens: bar 2 "xyz??"; bar 3 "%".'
    );
    expect(mounted.container.textContent).toContain(
      'Flagged chart locations: Line 2, bar 2: could not parse "xyz??"'
    );
    expect(mounted.container.textContent).toContain(
      'Line 2, bar 3: repeat marker "%" follows a bar that could not be resolved'
    );
    expect(mounted.container.textContent).toContain('Chord chart has parse issues');
    expect(mounted.container.textContent).toContain(
      '2 of 4 bars are ready. Bars 2 and 3 currently parse as N.C., so Generate stays blocked until the chart is fixed.'
    );
    expect(getGenerateButton(mounted.container).disabled).toBe(true);
  });

  it('keeps blocked upload overflow truth explicit when only the first parser highlights fit in the feedback', async () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: 'Cmaj7 | Fmaj7 | G7 | Cmaj7',
        generationHints: 'Keep the brushes light',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    openUploadTab(mounted.container);
    const fileInput = getUploadFileInput(mounted.container);

    const file = new File(['placeholder'], 'broken-overflow.txt', { type: 'text/plain' });
    vi.spyOn(file, 'text').mockResolvedValue('[Verse]\nxyz?? | % | / | % | Cmaj7');

    await importFile(fileInput, file);

    expect(mounted.container.textContent).toContain(
      'Flagged chart locations: Line 2, bar 1: could not parse "xyz??"'
    );
    expect(mounted.container.textContent).toContain(
      'Line 2, bar 2: repeat marker "%" follows a bar that could not be resolved'
    );
    expect(mounted.container.textContent).toContain(
      'Line 2, bar 3: repeat marker "/" follows a bar that could not be resolved'
    );
    expect(mounted.container.textContent).toContain(
      'Blocked tokens: bar 1 "xyz??"; bar 2 "%"; bar 3 "/".'
    );
    expect(mounted.container.textContent).toContain(
      '1 more flagged bar needs review in the chord chart before generation.'
    );
  });

  it('surfaces blocked upload feedback when an imported chart has no playable bars yet', async () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: 'Cmaj7 | Fmaj7 | G7 | Cmaj7',
        generationHints: 'Keep the brushes light',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    openUploadTab(mounted.container);
    const fileInput = getUploadFileInput(mounted.container);

    const file = new File(['placeholder'], 'headers-only.txt', { type: 'text/plain' });
    vi.spyOn(file, 'text').mockResolvedValue('[Verse]\n\nChorus:');

    await importFile(fileInput, file);

    expect(useProjectStore.getState().project).toMatchObject({
      chordChartRaw: '[Verse]\n\n[Chorus]',
      generationHints: 'Keep the brushes light',
    });
    expect(mounted.container.textContent).toContain(
      'Imported headers-only.txt into the current chord chart. Existing Description was kept.'
    );
    expect(mounted.container.textContent).toContain(
      'Chart is blocked: Chord chart needs chord bars. No playable chord bars are present yet, so Generate stays blocked until the chart includes at least one chord bar.'
    );
    expect(mounted.container.textContent).toContain(
      'Why it is blocked: Section labels and blank lines do not create playable bars on their own.'
    );
    expect(mounted.container.textContent).toContain(
      'Next step: Add at least one chord bar such as Cmaj7 | Fmaj7 | G7 | Cmaj7.'
    );
    expect(mounted.container.textContent).toContain('Chord chart needs chord bars');
    expect(
      mounted.container.querySelector('[data-upload-feedback-tone="blocked"]')
    ).not.toBeNull();
    expect(getGenerateButton(mounted.container).disabled).toBe(true);
  });

  it('surfaces blocked upload feedback when an imported chart only contains no-chord bars', async () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: 'Cmaj7 | Fmaj7 | G7 | Cmaj7',
        generationHints: 'Keep the brushes light',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    openUploadTab(mounted.container);
    const fileInput = getUploadFileInput(mounted.container);

    const file = new File(['placeholder'], 'rests-only.txt', { type: 'text/plain' });
    vi.spyOn(file, 'text').mockResolvedValue('N.C. | - | nc');

    await importFile(fileInput, file);

    expect(useProjectStore.getState().project).toMatchObject({
      chordChartRaw: 'N.C. | - | nc',
      generationHints: 'Keep the brushes light',
    });
    expect(mounted.container.textContent).toContain(
      'Imported rests-only.txt into the current chord chart. Existing Description was kept.'
    );
    expect(mounted.container.textContent).toContain(
      'Chart is blocked: Chord chart needs chord bars. The current chart only contains N.C. or rest bars, so Generate stays blocked until at least one playable chord bar is entered.'
    );
    expect(mounted.container.textContent).toContain(
      'Why it is blocked: Bars marked as N.C. or rest do not create playable harmony on their own.'
    );
    expect(mounted.container.textContent).toContain(
      'Next step: Replace at least one N.C. or rest bar with a chord such as Cmaj7 | Fmaj7 | G7 | Cmaj7.'
    );
    expect(mounted.container.textContent).toContain('Chord chart needs chord bars');
    expect(getGenerateButton(mounted.container).disabled).toBe(true);
  });

  it('surfaces line-aware chart locations when invalid rows appear after a section header', () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: '[Verse]\nCmaj7 | xyz?? | %',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;
    openTextTab(mounted.container);

    const chordChartHint = mounted.container.querySelector(
      '[data-chord-chart-editor-state]'
    ) as HTMLParagraphElement | null;

    expect(mounted.container.textContent).toContain(
      'Flagged chart locations: Line 2, bar 2: could not parse "xyz??"'
    );
    expect(mounted.container.textContent).toContain(
      'Line 2, bar 3: repeat marker "%" follows a bar that could not be resolved'
    );
    expect(chordChartHint?.textContent).toContain(
      'Flagged chart locations: Line 2, bar 2: could not parse "xyz??"'
    );
    expect(chordChartHint?.textContent).toContain(
      'Line 2, bar 3: repeat marker "%" follows a bar that could not be resolved'
    );
  });

  it('keeps parse failure line references aligned when blank lines separate the section header and blocked row', () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: '[Verse]\n\nCmaj7 | xyz?? | %',
      }),
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;
    openTextTab(mounted.container);

    const chordChartHint = mounted.container.querySelector(
      '[data-chord-chart-editor-state]'
    ) as HTMLParagraphElement | null;

    expect(mounted.container.textContent).toContain(
      'Flagged chart locations: Line 3, bar 2: could not parse "xyz??"'
    );
    expect(mounted.container.textContent).toContain(
      'Line 3, bar 3: repeat marker "%" follows a bar that could not be resolved'
    );
    expect(chordChartHint?.textContent).toContain(
      'Flagged chart locations: Line 3, bar 2: could not parse "xyz??"'
    );
    expect(chordChartHint?.textContent).toContain(
      'Line 3, bar 3: repeat marker "%" follows a bar that could not be resolved'
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
