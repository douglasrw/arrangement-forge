// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProjectStore } from '@/store/project-store';
import { useSelectionStore } from '@/store/selection-store';
import { useUiStore } from '@/store/ui-store';
import { AppShell } from './AppShell';

vi.mock('./TopBar', () => ({
  TopBar: () => <div data-testid="top-bar">Top bar</div>,
}));

vi.mock('@/components/left-panel/LeftPanel', () => ({
  LeftPanel: () => <div data-testid="left-panel">Left panel</div>,
}));

vi.mock('@/components/arrangement/ArrangementView', () => ({
  ArrangementView: () => <div data-testid="arrangement-view">Arrangement view</div>,
}));

vi.mock('@/components/transport/TransportBar', () => ({
  TransportBar: () => <div data-testid="transport-bar">Transport</div>,
}));

vi.mock('@/components/mixer/MixerDrawer', () => ({
  MixerDrawer: () => <div data-testid="mixer-drawer">Mixer</div>,
}));

vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  KEYBOARD_SHORTCUT_BUTTON_ID: 'topbar-shortcuts-button',
  KEYBOARD_SHORTCUT_SECTIONS: [],
  useKeyboardShortcuts: () => {},
}));

vi.mock('@/hooks/useAutoSave', () => ({
  useAutoSave: () => {},
}));

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function renderAppShell() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<AppShell />);
  });

  return { container, root };
}

function getStatusBarText(container: HTMLDivElement): string {
  return container.querySelector('[data-testid="status-bar"]')?.textContent ?? '';
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  window.scrollTo = vi.fn();

  useProjectStore.setState({
    project: null,
    projectLoadStatus: 'idle',
    projectLoadTargetId: null,
    projectLoadMessage: null,
    projectLoadFailureTarget: null,
    stems: [],
    sections: [],
    blocks: [],
    chords: [],
  });

  useSelectionStore.setState({
    level: 'song',
    sectionId: null,
    blockId: null,
    stemId: null,
  });

  useUiStore.setState({
    generationState: 'idle',
    systemStatus: 'ready',
    errorMessage: null,
    unsavedChanges: false,
    leftPanelCollapsed: false,
  });
});

afterEach(() => {
  if (mountedRoot && mountedContainer) {
    act(() => {
      mountedRoot.unmount();
    });
    mountedContainer.remove();
  }

  mountedRoot = null;
  mountedContainer = null;
});

describe('AppShell status surface truth', () => {
  it('keeps sample loading visible instead of collapsing to unsaved copy', () => {
    useUiStore.setState({
      systemStatus: 'loading-samples',
      unsavedChanges: true,
    });

    const mounted = renderAppShell();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const statusBarText = getStatusBarText(mounted.container);

    expect(statusBarText).toContain('Waiting for samples');
    expect(statusBarText).toContain('Loading samples');
    expect(statusBarText).not.toContain('Unsaved changes');
  });

  it('keeps offline visible instead of collapsing to saved copy', () => {
    useUiStore.setState({
      systemStatus: 'offline',
      unsavedChanges: false,
    });

    const mounted = renderAppShell();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const statusBarText = getStatusBarText(mounted.container);

    expect(statusBarText).toContain('Blocked: offline');
    expect(statusBarText).toContain('Offline');
    expect(statusBarText).not.toContain('Saved');
  });

  it('keeps concise failure detail visible instead of generic save-state copy', () => {
    useUiStore.setState({
      systemStatus: 'error',
      errorMessage: '  Generation failed: Generator offline  ',
      unsavedChanges: false,
    });

    const mounted = renderAppShell();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const statusBarText = getStatusBarText(mounted.container);

    expect(statusBarText).toContain('Blocked: error');
    expect(statusBarText).toContain('Error: Generator offline');
    expect(statusBarText).not.toContain('Saved');
  });

  it('keeps the selected section visible in the shell status bar instead of generic selection copy', () => {
    useProjectStore.setState({
      project: {
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
        hasArrangement: true,
        generatedAt: null,
        generatedTempo: null,
        createdAt: '2026-03-29T00:00:00Z',
        updatedAt: '2026-03-29T00:00:00Z',
      },
      stems: [
        {
          id: 'stem-1',
          projectId: 'project-1',
          instrument: 'piano',
          sortOrder: 0,
          volume: 0.8,
          pan: 0,
          isMuted: false,
          isSolo: false,
          createdAt: '2026-03-29T00:00:00Z',
        },
      ],
      sections: [
        {
          id: 'section-1',
          projectId: 'project-1',
          name: 'Bridge',
          sortOrder: 0,
          barCount: 4,
          startBar: 13,
          energyOverride: null,
          grooveOverride: null,
          feelOverride: null,
          swingPctOverride: null,
          dynamicsOverride: null,
          createdAt: '2026-03-29T00:00:00Z',
        },
      ],
      blocks: [
        {
          id: 'block-1',
          stemId: 'stem-1',
          sectionId: 'section-1',
          startBar: 13,
          endBar: 16,
          chordDegree: 'I',
          chordQuality: 'maj7',
          chordBassDegree: null,
          style: 'jazz_comp',
          energyOverride: null,
          dynamicsOverride: null,
          midiData: [],
          createdAt: '2026-03-29T00:00:00Z',
        },
      ],
    });
    useSelectionStore.getState().selectSection('section-1');

    const mounted = renderAppShell();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const statusBarText = getStatusBarText(mounted.container);

    expect(statusBarText).toContain('Section: Bridge 13-16');
    expect(statusBarText).not.toContain('Section selected');
  });
});
