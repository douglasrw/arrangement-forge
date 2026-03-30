// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Block, Chord, Project, Section, Stem } from '@/types';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { deriveStatusBarStatus, StatusBar, type AppStatus } from './StatusBar';

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

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
    midiData: [],
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

function renderStatusBar(status: AppStatus) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(createElement(StatusBar, { status }));
  });

  mountedRoot = root;
  mountedContainer = container;
  return container;
}

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  useProjectStore.setState({
    project: makeProject(),
    stems: [],
    sections: [],
    blocks: [],
    chords: [],
  });
  useUiStore.setState({
    errorMessage: null,
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

describe('deriveStatusBarStatus', () => {
  it('preserves sample-loading truth instead of falling back to unsaved copy', () => {
    const status = deriveStatusBarStatus({
      generationState: 'idle',
      systemStatus: 'loading-samples',
      unsavedChanges: true,
    });

    expect(status).toBe('loading-samples');
  });

  it('preserves offline truth instead of falling back to saved copy', () => {
    const status = deriveStatusBarStatus({
      generationState: 'idle',
      systemStatus: 'offline',
      unsavedChanges: false,
    });

    expect(status).toBe('offline');
  });

  it('preserves error truth instead of falling back to generation or save-state copy', () => {
    const status = deriveStatusBarStatus({
      generationState: 'generating',
      systemStatus: 'error',
      unsavedChanges: true,
    });

    expect(status).toBe('error');
  });
});

describe('StatusBar', () => {
  it('renders project-draft truth instead of generic unsaved copy', () => {
    const container = renderStatusBar('unsaved');
    const label = container.querySelector('span[title]') as HTMLSpanElement | null;

    expect(container.textContent).toContain('Project draft');
    expect(container.textContent).not.toContain('Unsaved changes');
    expect(label?.title).toBe(
      'Only project fields and chat are in play right now; no arrangement rows are loaded. Save now to persist project fields and chat without replacing arrangement rows.'
    );
  });

  it('renders arrangement-draft truth instead of generic unsaved copy', () => {
    useProjectStore.setState({
      project: makeProject({ hasArrangement: false }),
      stems: [makeStem()],
      sections: [],
      blocks: [],
      chords: [],
    });

    const container = renderStatusBar('unsaved');
    const label = container.querySelector('span[title]') as HTMLSpanElement | null;

    expect(container.textContent).toContain('Arrangement draft only');
    expect(container.textContent).not.toContain('Unsaved changes');
    expect(label?.title).toBe(
      'Loaded arrangement rows exist only in the current draft state. Save now to create the first saved arrangement snapshot from the loaded arrangement rows.'
    );
  });

  it('renders project-draft-with-loaded-arrangement truth instead of generic unsaved copy', () => {
    useProjectStore.setState({
      project: makeProject({ hasArrangement: true }),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [makeChord()],
    });

    const container = renderStatusBar('unsaved');
    const label = container.querySelector('span[title]') as HTMLSpanElement | null;

    expect(container.textContent).toContain('Project draft + loaded snapshot');
    expect(container.textContent).not.toContain('Unsaved changes');
    expect(label?.title).toBe(
      'Project fields and chat are in draft state, while the loaded arrangement rows already match the saved arrangement snapshot. Save now to persist project fields and chat without replacing arrangement rows.'
    );
  });

  it('renders arrangement-draft-over-saved-arrangement truth instead of generic unsaved copy', () => {
    useProjectStore.getState().hydrateProject({
      project: makeProject({ hasArrangement: true }),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [makeChord()],
      chatMessages: [],
    });
    useProjectStore.getState().updateBlock('block-1', { style: 'arpeggiated' });

    const container = renderStatusBar('unsaved');
    const label = container.querySelector('span[title]') as HTMLSpanElement | null;

    expect(container.textContent).toContain('Arrangement draft + saved snapshot');
    expect(container.textContent).not.toContain('Unsaved changes');
    expect(label?.title).toBe(
      'Loaded arrangement rows are currently ahead of the saved arrangement snapshot. Save now to replace the saved arrangement snapshot with the current draft arrangement rows.'
    );
  });

  it('renders project-draft-over-saved-arrangement truth instead of generic unsaved copy', () => {
    useProjectStore.setState({
      project: makeProject({ hasArrangement: true }),
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
    });

    const container = renderStatusBar('unsaved');
    const label = container.querySelector('span[title]') as HTMLSpanElement | null;

    expect(container.textContent).toContain('Project draft + saved snapshot');
    expect(container.textContent).not.toContain('Unsaved changes');
    expect(label?.title).toBe(
      'Only project fields and chat will change; the saved arrangement snapshot exists but is not loaded in this session. Save now to persist project fields and chat without replacing arrangement rows.'
    );
  });

  it('renders project save progress with explicit save-target truth', () => {
    const container = renderStatusBar('saving');
    const label = container.querySelector('span[title]') as HTMLSpanElement | null;

    expect(container.textContent).toContain('Saving project draft…');
    expect(container.textContent).not.toContain('Saving…');
    expect(label?.title).toBe(
      'Only project fields and chat are in play right now; no arrangement rows are loaded. Save now to persist project fields and chat without replacing arrangement rows.'
    );
  });

  it('renders route-level project loading as a distinct shell status', () => {
    const container = renderStatusBar('loading-project');

    expect(container.textContent).toContain('Loading project');
    expect(container.textContent).not.toContain('Saved');
  });

  it('renders sample loading as a distinct visible status', () => {
    const container = renderStatusBar('loading-samples');

    expect(container.textContent).toContain('Loading samples');
    expect(container.textContent).not.toContain('Saved');
  });

  it('renders offline as a distinct visible status', () => {
    const container = renderStatusBar('offline');

    expect(container.textContent).toContain('Offline');
    expect(container.textContent).not.toContain('Saved');
  });

  it('renders concise failure detail when the current state is error', () => {
    useUiStore.setState({
      errorMessage: '  Generation failed: Generator offline  ',
    });

    const container = renderStatusBar('error');

    expect(container.textContent).toContain('Error: Generator offline');
    expect(container.textContent).not.toContain('Loading samples');
  });
});
