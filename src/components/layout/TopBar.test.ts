// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '@/types';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import {
  TopBar,
  formatProjectChordChartExport,
  normalizeProjectNameDraft,
  reconcileProjectNameDraft,
} from './TopBar';

const signOutMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signOut: signOutMock,
  }),
}));

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

function renderTopBar() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(createElement(TopBar));
  });

  return { container, root };
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;
let createObjectUrlMock: ReturnType<typeof vi.fn>;
let revokeObjectUrlMock: ReturnType<typeof vi.fn>;
let anchorClickSpy: ReturnType<typeof vi.spyOn> | null = null;
let downloadRequest: { href: string; download: string } | null = null;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  signOutMock.mockReset();

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
  });

  createObjectUrlMock = vi.fn(() => 'blob:export-url');
  revokeObjectUrlMock = vi.fn();
  downloadRequest = null;

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
      downloadRequest = {
        href: this.href,
        download: this.download,
      };
    });
});

afterEach(() => {
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
    const reconciled = reconcileProjectNameDraft(
      'Local draft',
      'Renamed from store',
      false
    );

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

describe('TopBar export baseline', () => {
  it('downloads the current project as a plain-text chord chart with labeled hints', async () => {
    useProjectStore.setState({
      project: makeProject({
        name: 'Midnight Changes',
        chordChartRaw: '[Verse]\nCmaj7 | Dm7 | G7 | Cmaj7',
        generationHints: 'Keep the voicings airy',
      }),
    });

    const mounted = renderTopBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const exportButton = mounted.container.querySelector(
      '[data-testid="topbar-export-button"]'
    ) as HTMLButtonElement | null;

    expect(exportButton).not.toBeNull();
    expect(exportButton?.disabled).toBe(false);

    await act(async () => {
      exportButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    expect(downloadRequest).toEqual({
      href: 'blob:export-url',
      download: 'Midnight Changes.txt',
    });
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:export-url');

    const exportBlob = createObjectUrlMock.mock.calls[0]?.[0] as Blob;
    const exportText = await exportBlob.text();

    expect(exportText).toContain('Arrangement Forge Export');
    expect(exportText).toContain('Project: Midnight Changes');
    expect(exportText).toContain('Chord Chart\n[Verse]\nCmaj7 | Dm7 | G7 | Cmaj7');
    expect(exportText).toContain('Generation Hints\nKeep the voicings airy');
  });

  it('keeps the export button disabled when no project is loaded', () => {
    useProjectStore.setState({
      project: null,
    });

    const mounted = renderTopBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const exportButton = mounted.container.querySelector(
      '[data-testid="topbar-export-button"]'
    ) as HTMLButtonElement | null;

    expect(exportButton?.disabled).toBe(true);
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
});
