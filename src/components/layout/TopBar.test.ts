// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { Block, Chord, Project, Section, Stem } from '@/types';
import type { LoadProjectResult } from '@/hooks/useProject';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import {
  TopBar,
  formatProjectChordChartExport,
  getProjectExportFilename,
  getProjectSnapshotFilename,
  hasProjectExportTruth,
  normalizeProjectNameDraft,
  reconcileProjectNameDraft,
} from './TopBar';

const signOutMock = vi.hoisted(() => vi.fn());
const loadProjectMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signOut: signOutMock,
  }),
}));

vi.mock('@/hooks/useProject', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useProject')>('@/hooks/useProject');

  return {
    ...actual,
    useProject: () => ({
      loadProject: loadProjectMock,
    }),
  };
});

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function makeProject(partial: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    userId: 'user-1',
    name: 'Baseline Chart',
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

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

function renderTopBar() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(createElement(TopBar));
  });

  return { container, root };
}

function getTopBarSaveIndicator(container: HTMLDivElement) {
  const indicator = container.querySelector(
    '[data-testid="topbar-save-indicator"]'
  ) as HTMLDivElement | null;
  const dot = container.querySelector('[data-testid="topbar-save-dot"]') as HTMLDivElement | null;
  const label = container.querySelector(
    '[data-testid="topbar-save-label"]'
  ) as HTMLSpanElement | null;

  return { indicator, dot, label };
}

function getTopBarShortcutsButton(container: HTMLDivElement) {
  return container.querySelector(
    '[data-testid="topbar-shortcuts-button"]'
  ) as HTMLButtonElement | null;
}

function makeStem(partial: Partial<Stem> = {}): Stem {
  return {
    id: 'stem-1',
    projectId: 'project-1',
    instrument: 'piano',
    sortOrder: 0,
    volume: 0.8,
    pan: 0,
    isMuted: false,
    isSolo: false,
    createdAt: '2026-03-29T00:00:00Z',
    ...partial,
  };
}

function makeSection(partial: Partial<Section> = {}): Section {
  return {
    id: 'section-1',
    projectId: 'project-1',
    name: 'Verse',
    sortOrder: 0,
    barCount: 4,
    startBar: 1,
    energyOverride: null,
    grooveOverride: null,
    feelOverride: null,
    swingPctOverride: null,
    dynamicsOverride: null,
    createdAt: '2026-03-29T00:00:00Z',
    ...partial,
  };
}

function makeBlock(partial: Partial<Block> = {}): Block {
  return {
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
    midiData: [
      {
        note: 'C4',
        time: 0,
        duration: 1,
        velocity: 96,
      },
    ],
    createdAt: '2026-03-29T00:00:00Z',
    ...partial,
  };
}

function makeChord(partial: Partial<Chord> = {}): Chord {
  return {
    id: 'chord-1',
    projectId: 'project-1',
    barNumber: 1,
    degree: 'I',
    quality: 'maj7',
    bassDegree: null,
    ...partial,
  };
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;
let createObjectUrlMock: ReturnType<typeof vi.fn>;
let revokeObjectUrlMock: ReturnType<typeof vi.fn>;
let anchorClickSpy: ReturnType<typeof vi.spyOn> | null = null;
let downloadRequests: Array<{ href: string; download: string }> = [];

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  signOutMock.mockReset();
  loadProjectMock.mockReset();
  loadProjectMock.mockResolvedValue({ status: 'ready' } satisfies LoadProjectResult);

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
    unsavedChanges: false,
    chordDisplayMode: 'letter',
    systemStatus: 'ready',
    errorMessage: null,
    lastSavedAt: null,
  });

  revokeObjectUrlMock = vi.fn();
  downloadRequests = [];

  let exportUrlCounter = 0;
  createObjectUrlMock = vi.fn(() => {
    exportUrlCounter += 1;
    return `blob:export-url-${exportUrlCounter}`;
  });

  Object.defineProperty(globalThis.URL, 'createObjectURL', {
    configurable: true,
    value: createObjectUrlMock,
  });

  Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
    configurable: true,
    value: revokeObjectUrlMock,
  });

  anchorClickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(function captureDownload(this: HTMLAnchorElement) {
      downloadRequests.push({
        href: this.href,
        download: this.download,
      });
    });
});

afterEach(() => {
  vi.useRealTimers();

  anchorClickSpy?.mockRestore();
  anchorClickSpy = null;

  if (mountedRoot && mountedContainer) {
    act(() => {
      mountedRoot?.unmount();
    });
    mountedContainer.remove();
  }

  mountedRoot = null;
  mountedContainer = null;
});

describe('TopBar project-name draft reconciliation', () => {
  it('refreshes the draft from external project updates when editing is inactive', () => {
    const reconciled = reconcileProjectNameDraft('Local draft', 'Renamed from store', false);

    expect(reconciled).toBe('Renamed from store');
  });

  it('preserves the local draft while editing even if the external project name changes', () => {
    const reconciled = reconcileProjectNameDraft(
      'Keep my in-progress rename',
      'External rename',
      true
    );

    expect(reconciled).toBe('Keep my in-progress rename');
  });

  it('trims committed project names', () => {
    expect(normalizeProjectNameDraft('  Midnight Waltz  ')).toBe('Midnight Waltz');
  });

  it('falls back to Untitled Project for blank committed names', () => {
    expect(normalizeProjectNameDraft('   ')).toBe('Untitled Project');
  });
});

describe('TopBar keyboard shortcuts discoverability truth', () => {
  it('shows an explicit shortcut guide trigger in the top bar', () => {
    const mounted = renderTopBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const shortcutButton = getTopBarShortcutsButton(mounted.container);

    expect(shortcutButton).not.toBeNull();
    expect(shortcutButton?.textContent).toContain('Shortcuts');
    expect(shortcutButton?.textContent).toContain('Ctrl/Cmd+K');
    expect(shortcutButton?.title).toBe('Open the keyboard shortcuts guide');
  });

  it('opens the shortcut guide with the current keyboard map', async () => {
    const mounted = renderTopBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const shortcutButton = getTopBarShortcutsButton(mounted.container);

    await act(async () => {
      shortcutButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const shortcutGuide = mounted.container.querySelector(
      '[data-testid="topbar-shortcuts-guide"]'
    ) as HTMLDivElement | null;

    expect(shortcutGuide?.textContent).toContain('Keyboard shortcuts');
    expect(shortcutGuide?.textContent).toContain('Save project');
    expect(shortcutGuide?.textContent).toContain('Open this shortcut guide');
    expect(shortcutGuide?.textContent).toContain('Duplicate selected block');
  });
});

describe('TopBar save indicator truth', () => {
  it('shows project-draft truth when only project fields and chat are pending save', () => {
    useUiStore.setState({
      unsavedChanges: true,
      systemStatus: 'ready',
      lastSavedAt: null,
    });

    const mounted = renderTopBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const { dot, label } = getTopBarSaveIndicator(mounted.container);

    expect(label?.textContent).toBe('Project draft');
    expect(label?.title).toBe(
      'Only project fields and chat are in play right now; no arrangement rows are loaded. Save now to persist project fields and chat without replacing arrangement rows.'
    );
    expect(dot?.className).toContain('bg-status-unsaved');
  });

  it('shows arrangement-draft truth when arrangement rows exist without a saved snapshot', () => {
    useProjectStore.setState({
      project: makeProject({ hasArrangement: false }),
      stems: [makeStem()],
      sections: [],
      blocks: [],
      chords: [],
    });
    useUiStore.setState({
      unsavedChanges: true,
      systemStatus: 'ready',
      lastSavedAt: null,
    });

    const mounted = renderTopBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const { dot, label } = getTopBarSaveIndicator(mounted.container);

    expect(label?.textContent).toBe('Arrangement draft only');
    expect(label?.title).toBe(
      'Loaded arrangement rows exist only in the current draft state. Save now to create the first saved arrangement snapshot from the loaded arrangement rows.'
    );
    expect(dot?.className).toContain('bg-status-unsaved');
  });

  it('shows project-draft-with-loaded-arrangement truth when loaded rows still match the saved snapshot', () => {
    useProjectStore.setState({
      project: makeProject({ hasArrangement: true }),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [makeChord()],
    });
    useUiStore.setState({
      unsavedChanges: true,
      systemStatus: 'ready',
      lastSavedAt: null,
    });

    const mounted = renderTopBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const { dot, label } = getTopBarSaveIndicator(mounted.container);

    expect(label?.textContent).toBe('Project draft + loaded snapshot');
    expect(label?.title).toBe(
      'Project fields and chat are in draft state, while the loaded arrangement rows already match the saved arrangement snapshot. Save now to persist project fields and chat without replacing arrangement rows.'
    );
    expect(dot?.className).toContain('bg-status-unsaved');
  });

  it('shows arrangement-draft-over-saved-arrangement truth when loaded rows move ahead of the saved snapshot', () => {
    useProjectStore.getState().hydrateProject({
      project: makeProject({ hasArrangement: true }),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [makeChord()],
      chatMessages: [],
    });
    useProjectStore.getState().updateBlock('block-1', { style: 'arpeggiated' });
    useUiStore.setState({
      unsavedChanges: true,
      systemStatus: 'ready',
      lastSavedAt: null,
    });

    const mounted = renderTopBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const { dot, label } = getTopBarSaveIndicator(mounted.container);

    expect(label?.textContent).toBe('Arrangement draft + saved snapshot');
    expect(label?.title).toBe(
      'Loaded arrangement rows are currently ahead of the saved arrangement snapshot. Save now to replace the saved arrangement snapshot with the current draft arrangement rows.'
    );
    expect(dot?.className).toContain('bg-status-unsaved');
  });

  it('shows project-draft-over-saved-arrangement truth when the snapshot exists but rows are not loaded', () => {
    useProjectStore.setState({
      project: makeProject({ hasArrangement: true }),
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
    });
    useUiStore.setState({
      unsavedChanges: true,
      systemStatus: 'ready',
      lastSavedAt: null,
    });

    const mounted = renderTopBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const { dot, label } = getTopBarSaveIndicator(mounted.container);

    expect(label?.textContent).toBe('Project draft + saved snapshot');
    expect(label?.title).toBe(
      'Only project fields and chat will change; the saved arrangement snapshot exists but is not loaded in this session. Save now to persist project fields and chat without replacing arrangement rows.'
    );
    expect(dot?.className).toContain('bg-status-unsaved');
  });

  it('shows active saving truth instead of collapsing back to a generic saved state', () => {
    useUiStore.setState({
      unsavedChanges: true,
      systemStatus: 'saving',
      lastSavedAt: '2026-03-29T11:55:00Z',
    });

    const mounted = renderTopBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const { dot, label } = getTopBarSaveIndicator(mounted.container);

    expect(label?.textContent).toBe('Saving project draft…');
    expect(label?.title).toBe(
      'Only project fields and chat are in play right now; no arrangement rows are loaded. Save now to persist project fields and chat without replacing arrangement rows.'
    );
    expect(dot?.className).toContain('bg-status-saving');
    expect(dot?.className).toContain('animate-pulse');
  });

  it('surfaces recent save timing from lastSavedAt once changes are saved', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-29T12:00:00Z'));
    useProjectStore.getState().hydrateProject({
      project: makeProject({ hasArrangement: true }),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [makeChord()],
      chatMessages: [],
    });

    useUiStore.setState({
      unsavedChanges: false,
      systemStatus: 'ready',
      lastSavedAt: '2026-03-29T11:55:00Z',
    });

    const mounted = renderTopBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const { dot, label } = getTopBarSaveIndicator(mounted.container);

    expect(label?.textContent).toBe('Saved 5m ago');
    expect(label?.title).toContain('Last saved');
    expect(label?.title).toContain(
      'Loaded arrangement rows already match the saved arrangement snapshot.'
    );
    expect(label?.title).toContain(
      'Edit the arrangement to create a draft, or save project fields and chat without replacing arrangement rows.'
    );
    expect(dot?.className).toContain('bg-status-ready');
  });

  it('surfaces concise failure detail when the save/system state enters error', () => {
    useUiStore.setState({
      unsavedChanges: false,
      lastSavedAt: '2026-03-29T11:55:00Z',
    });
    useUiStore
      .getState()
      .setSystemStatus('error', '  Generation failed: Supabase unavailable  ');

    const mounted = renderTopBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const { dot, label } = getTopBarSaveIndicator(mounted.container);

    expect(label?.textContent).toBe('Error: Supabase unavailable');
    expect(label?.title).toBe('Generation failed: Supabase unavailable');
    expect(dot?.className).toContain('bg-destructive');
  });
});

describe('TopBar export baseline', () => {
  it('downloads the current project as a plain-text chord chart plus arrangement snapshot with visible outcome truth', async () => {
    useProjectStore.setState({
      project: makeProject({
        name: 'Midnight Changes / Demo',
        chordChartRaw: '[Verse]\nCmaj7 | Dm7 | G7 | Cmaj7',
        generationHints: 'Keep the voicings airy',
      }),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [makeChord()],
    });

    const mounted = renderTopBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const exportButton = mounted.container.querySelector(
      '[data-testid="topbar-export-button"]'
    ) as HTMLButtonElement | null;

    expect(exportButton).not.toBeNull();
    expect(exportButton?.disabled).toBe(false);
    expect(exportButton?.textContent).toBe('Export chart + draft snapshot');

    await act(async () => {
      exportButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(createObjectUrlMock).toHaveBeenCalledTimes(2);
    expect(downloadRequests).toEqual([
      {
        href: 'blob:export-url-1',
        download: 'midnight-changes-demo-chord-chart.txt',
      },
      {
        href: 'blob:export-url-2',
        download: 'midnight-changes-demo-arrangement-snapshot.json',
      },
    ]);
    expect(anchorClickSpy).toHaveBeenCalledTimes(2);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:export-url-1');
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:export-url-2');
    expect(exportButton?.textContent).toBe('Exported');
    expect(exportButton?.title).toBe(
      'Exported midnight-changes-demo-chord-chart.txt and midnight-changes-demo-arrangement-snapshot.json'
    );

    const chartBlob = createObjectUrlMock.mock.calls[0]?.[0] as Blob;
    const exportText = await chartBlob.text();

    expect(exportText).toContain('Arrangement Forge Export');
    expect(exportText).toContain('Project: Midnight Changes / Demo');
    expect(exportText).toContain('Chord Chart\n[Verse]\nCmaj7 | Dm7 | G7 | Cmaj7');
    expect(exportText).toContain('Generation Hints\nKeep the voicings airy');
    expect(exportText).toContain('Arrangement Summary');
    expect(exportText).toContain('Stem Count: 1');
    expect(exportText).toContain('Stem Order: piano');
    expect(exportText).toContain('Section Timeline\n- Verse (bars 1-4)');

    const snapshotBlob = createObjectUrlMock.mock.calls[1]?.[0] as Blob;
    const snapshot = JSON.parse(await snapshotBlob.text()) as {
      version: number;
      exportedAt: string;
      project: { name: string };
      stems: Array<{ id: string }>;
      sections: Array<{ id: string }>;
      blocks: Array<{ id: string }>;
      chords: Array<{ id: string }>;
    };

    expect(snapshot).toMatchObject({
      version: 1,
      project: {
        name: 'Midnight Changes / Demo',
      },
      stems: [{ id: 'stem-1' }],
      sections: [{ id: 'section-1' }],
      blocks: [{ id: 'block-1' }],
      chords: [{ id: 'chord-1' }],
    });
    expect(typeof snapshot.exportedAt).toBe('string');
  });

  it('keeps export disabled when the project has no chart, description, or arrangement truth', () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: '   ',
        generationHints: '   ',
      }),
    });

    const mounted = renderTopBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const exportButton = mounted.container.querySelector(
      '[data-testid="topbar-export-button"]'
    ) as HTMLButtonElement | null;

    expect(exportButton?.disabled).toBe(true);
    expect(exportButton?.textContent).toBe('Nothing to export');
    expect(exportButton?.title).toBe(
      'No chord chart, generation hints, or arrangement rows are ready to export yet. Add a chord chart, description, or arrangement before exporting.'
    );
  });

  it('keeps blocked export truth explicit when only a saved arrangement snapshot exists', () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: '   ',
        generationHints: '   ',
        hasArrangement: true,
      }),
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
    });

    const mounted = renderTopBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const exportButton = mounted.container.querySelector(
      '[data-testid="topbar-export-button"]'
    ) as HTMLButtonElement | null;

    expect(exportButton?.disabled).toBe(false);
    expect(exportButton?.textContent).toBe('Reload saved snapshot');
    expect(exportButton?.title).toBe(
      'A saved arrangement snapshot exists, but its rows are not loaded in this session. Use Reload saved snapshot in the top bar to load the arrangement rows before exporting the arrangement snapshot.'
    );
  });

  it('reloads the saved snapshot from the export action when arrangement rows are missing', async () => {
    const reloadDeferred = createDeferred<LoadProjectResult>();
    loadProjectMock.mockReturnValueOnce(reloadDeferred.promise);

    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: '   ',
        generationHints: '   ',
        hasArrangement: true,
      }),
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
    });

    const mounted = renderTopBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const exportButton = mounted.container.querySelector(
      '[data-testid="topbar-export-button"]'
    ) as HTMLButtonElement | null;

    expect(exportButton).not.toBeNull();

    await act(async () => {
      exportButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(loadProjectMock).toHaveBeenCalledWith('project-1');
    expect(exportButton?.disabled).toBe(true);
    expect(exportButton?.textContent).toBe('Reloading snapshot...');
    expect(exportButton?.title).toBe('Reloading the saved arrangement rows for this project.');

    await act(async () => {
      useProjectStore.setState({
        project: makeProject({
          chordChartRaw: '   ',
          generationHints: '   ',
          hasArrangement: true,
        }),
        stems: [makeStem()],
        sections: [makeSection()],
        blocks: [makeBlock()],
        chords: [makeChord()],
      });
      reloadDeferred.resolve({ status: 'ready' });
      await reloadDeferred.promise;
      await Promise.resolve();
    });

    expect(exportButton?.disabled).toBe(false);
    expect(exportButton?.textContent).toBe('Export chart + saved snapshot');
    expect(exportButton?.title).toBe(
      'Loaded arrangement rows are ready to export from the saved arrangement snapshot already loaded in this session. Export now to download the chord chart and arrangement snapshot.'
    );
  });

  it('exports only the chart when project text is ready but the saved arrangement snapshot is not loaded', async () => {
    useProjectStore.setState({
      project: makeProject({
        name: 'Chart Over Saved Snapshot',
        chordChartRaw: 'Dm7 | G7 | Cmaj7 | Cmaj7',
        generationHints: 'Keep the piano sparse',
        hasArrangement: true,
      }),
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
    });

    const mounted = renderTopBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const exportButton = mounted.container.querySelector(
      '[data-testid="topbar-export-button"]'
    ) as HTMLButtonElement | null;

    expect(exportButton).not.toBeNull();
    expect(exportButton?.disabled).toBe(false);
    expect(exportButton?.textContent).toBe('Export chart');
    expect(exportButton?.title).toBe(
      'Project text is ready to export, but the saved arrangement snapshot is not loaded in this session. Export now to download the chord chart, or use Reload saved snapshot in the top bar before exporting the arrangement snapshot.'
    );

    await act(async () => {
      exportButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(downloadRequests).toEqual([
      {
        href: 'blob:export-url-1',
        download: 'chart-over-saved-snapshot-chord-chart.txt',
      },
    ]);
    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    expect(exportButton?.textContent).toBe('Exported');
    expect(exportButton?.title).toBe('Exported chart-over-saved-snapshot-chord-chart.txt');

    const chartBlob = createObjectUrlMock.mock.calls[0]?.[0] as Blob;
    const exportText = await chartBlob.text();

    expect(exportText).toContain('Project: Chart Over Saved Snapshot');
    expect(exportText).toContain('Chord Chart\nDm7 | G7 | Cmaj7 | Cmaj7');
    expect(exportText).toContain('Generation Hints\nKeep the piano sparse');
    expect(exportText).not.toContain('Arrangement Summary');
  });

  it('exports only the chart when project text exists without any arrangement rows yet', async () => {
    useProjectStore.setState({
      project: makeProject({
        name: 'Text Only Chart',
        chordChartRaw: 'Dm7 | G7 | Cmaj7 | Cmaj7',
        generationHints: 'Keep the piano sparse',
        hasArrangement: false,
      }),
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
    });

    const mounted = renderTopBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const exportButton = mounted.container.querySelector(
      '[data-testid="topbar-export-button"]'
    ) as HTMLButtonElement | null;

    expect(exportButton).not.toBeNull();
    expect(exportButton?.disabled).toBe(false);
    expect(exportButton?.textContent).toBe('Export chart');
    expect(exportButton?.title).toBe(
      'Project text is ready to export, but no arrangement rows are loaded yet. Export now to download the chord chart, or generate or import arrangement rows before exporting an arrangement snapshot.'
    );

    await act(async () => {
      exportButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(downloadRequests).toEqual([
      {
        href: 'blob:export-url-1',
        download: 'text-only-chart-chord-chart.txt',
      },
    ]);
    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    expect(exportButton?.textContent).toBe('Exported');
    expect(exportButton?.title).toBe('Exported text-only-chart-chord-chart.txt');

    const chartBlob = createObjectUrlMock.mock.calls[0]?.[0] as Blob;
    const exportText = await chartBlob.text();

    expect(exportText).toContain('Project: Text Only Chart');
    expect(exportText).toContain('Chord Chart\nDm7 | G7 | Cmaj7 | Cmaj7');
    expect(exportText).toContain('Generation Hints\nKeep the piano sparse');
    expect(exportText).not.toContain('Arrangement Summary');
  });

  it('exports arrangement-only projects instead of treating them as an empty-state dead end', async () => {
    useProjectStore.setState({
      project: makeProject({
        name: 'Arrangement Only',
        chordChartRaw: '   ',
        generationHints: '   ',
        hasArrangement: true,
      }),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [makeChord()],
    });

    const mounted = renderTopBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const exportButton = mounted.container.querySelector(
      '[data-testid="topbar-export-button"]'
    ) as HTMLButtonElement | null;

    expect(exportButton).not.toBeNull();
    expect(exportButton?.disabled).toBe(false);
    expect(exportButton?.textContent).toBe('Export chart + saved snapshot');
    expect(exportButton?.title).toBe(
      'Loaded arrangement rows are ready to export from the saved arrangement snapshot already loaded in this session. Export now to download the chord chart and arrangement snapshot.'
    );

    await act(async () => {
      exportButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(downloadRequests).toEqual([
      {
        href: 'blob:export-url-1',
        download: 'arrangement-only-chord-chart.txt',
      },
      {
        href: 'blob:export-url-2',
        download: 'arrangement-only-arrangement-snapshot.json',
      },
    ]);

    const chartBlob = createObjectUrlMock.mock.calls[0]?.[0] as Blob;
    const exportText = await chartBlob.text();

    expect(exportText).toContain('Project: Arrangement Only');
    expect(exportText).toContain('Chord Chart\n(empty)');
    expect(exportText).toContain('Arrangement Summary');
    expect(exportText).toContain('Section Timeline\n- Verse (bars 1-4)');
  });

  it('shows draft snapshot export truth when the loaded arrangement rows have not been saved yet', () => {
    useProjectStore.setState({
      project: makeProject({
        name: 'Unsaved Arrangement Export',
        chordChartRaw: 'Cmaj7 | Dm7 | G7 | Cmaj7',
        generationHints: 'Let the melody breathe',
        hasArrangement: false,
      }),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [makeChord()],
    });

    const mounted = renderTopBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const exportButton = mounted.container.querySelector(
      '[data-testid="topbar-export-button"]'
    ) as HTMLButtonElement | null;

    expect(exportButton?.disabled).toBe(false);
    expect(exportButton?.textContent).toBe('Export chart + draft snapshot');
    expect(exportButton?.title).toBe(
      'Project text and loaded draft arrangement rows are both ready to export. Export now to download the chord chart and arrangement snapshot.'
    );
  });
});

describe('formatProjectChordChartExport', () => {
  it('omits the generation hints section when the project has no hints', () => {
    const exportText = formatProjectChordChartExport(
      makeProject({
        generationHints: '   ',
        chordChartRaw: 'Dm7 | G7 | Cmaj7 | Cmaj7',
      })
    );

    expect(exportText).toContain('Chord Chart\nDm7 | G7 | Cmaj7 | Cmaj7');
    expect(exportText).not.toContain('Generation Hints');
  });

  it('adds a human-readable arrangement summary when arrangement truth exists', () => {
    const exportText = formatProjectChordChartExport(makeProject(), {
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [makeChord()],
    });

    expect(exportText).toContain('Arrangement Summary');
    expect(exportText).toContain('Stem Order: piano');
    expect(exportText).toContain('Block Count: 1');
    expect(exportText).toContain('Chord Count: 1');
    expect(exportText).toContain('Section Timeline\n- Verse (bars 1-4)');
  });
});

describe('export helpers', () => {
  it('treats generation hints alone as exportable project truth', () => {
    expect(
      hasProjectExportTruth(
        makeProject({
          chordChartRaw: '   ',
          generationHints: 'Leave room for the melody',
        })
      )
    ).toBe(true);
  });

  it('derives a stable chord chart filename from the current project state', () => {
    expect(
      getProjectExportFilename(
        makeProject({
          name: '  Night Train: Alt Take #2  ',
        })
      )
    ).toBe('night-train-alt-take-2-chord-chart.txt');
  });

  it('derives a matching arrangement snapshot filename from the current project state', () => {
    expect(
      getProjectSnapshotFilename(
        makeProject({
          name: '  Night Train: Alt Take #2  ',
        })
      )
    ).toBe('night-train-alt-take-2-arrangement-snapshot.json');
  });
});
