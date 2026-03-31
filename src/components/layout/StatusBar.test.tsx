// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Block, Chord, Project, Section, Stem } from '@/types';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import { useUndoStore } from '@/store/undo-store';
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

function makeSnapshot(label: string) {
  return JSON.stringify({
    stems: [{ id: `st-${label}` }],
    sections: [],
    blocks: [],
    chords: [],
  });
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
    generationState: 'idle',
    systemStatus: 'ready',
    errorMessage: null,
    unsavedChanges: false,
    lastSavedAt: null,
  });
  useUndoStore.setState({
    undoStack: [],
    redoStack: [],
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

  it('keeps saved arrangement truth visible after the project is already saved', () => {
    useProjectStore.setState({
      project: makeProject({ hasArrangement: true }),
      stems: [],
      sections: [],
      blocks: [],
      chords: [],
    });

    const container = renderStatusBar('saved');
    const label = container.querySelector('span[title]') as HTMLSpanElement | null;

    expect(container.textContent).toContain('Saved');
    expect(label?.title).toBe(
      'A saved arrangement snapshot exists, but its rows are not loaded in the project store right now. Use Reload saved snapshot in the top bar to load the arrangement rows before editing, saving, or exporting the current arrangement snapshot.'
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

  it('renders the next undo boundary as explicit status-bar history truth', () => {
    useUndoStore.getState().pushUndo('Split block', {
      undo: makeSnapshot('before'),
      redo: makeSnapshot('after'),
    });

    const container = renderStatusBar('saved');
    const history = container.querySelector(
      '[data-testid="status-bar-history"]'
    ) as HTMLSpanElement | null;

    expect(history?.textContent).toBe('Undo: Split block');
    expect(history?.title).toBe(
      'Undo is ready to restore the arrangement captured before Split block. Use Undo to restore the arrangement captured before Split block.'
    );
  });

  it('renders named block context when project edits push undo boundaries through the store', () => {
    useProjectStore.setState({
      project: makeProject(),
      stems: [makeStem({ instrument: 'piano' })],
      sections: [makeSection({ name: 'Verse' })],
      blocks: [makeBlock({ startBar: 1, endBar: 4 })],
      chords: [],
    });

    useProjectStore.getState().updateBlock('block-1', { style: 'arpeggiated' });

    const container = renderStatusBar('saved');
    const history = container.querySelector(
      '[data-testid="status-bar-history"]'
    ) as HTMLSpanElement | null;

    expect(history?.textContent).toBe('Undo: Update piano block in Verse (bars 1-4)');
    expect(history?.title).toBe(
      'Undo is ready to restore the arrangement captured before Update piano block in Verse (bars 1-4). ' +
      'Use Undo to restore the arrangement captured before Update piano block in Verse (bars 1-4).'
    );
  });

  it('renders chord-change context when harmony edits push undo boundaries through the store', () => {
    useProjectStore.setState({
      project: makeProject(),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [makeChord({ barNumber: 1, degree: 'I', quality: 'maj7' })],
    });

    useProjectStore.getState().updateChord(1, { degree: 'V', quality: 'dom7' });

    const container = renderStatusBar('saved');
    const history = container.querySelector(
      '[data-testid="status-bar-history"]'
    ) as HTMLSpanElement | null;

    expect(history?.textContent).toBe('Undo: Update chord at bar 1: Imaj7 -> V7');
    expect(history?.title).toBe(
      'Undo is ready to restore the arrangement captured before Update chord at bar 1: Imaj7 -> V7. ' +
      'Use Undo to restore the arrangement captured before Update chord at bar 1: Imaj7 -> V7.'
    );
  });

  it('renders split-block context when the history boundary comes from a project split', () => {
    useProjectStore.setState({
      project: makeProject(),
      stems: [makeStem({ instrument: 'piano' })],
      sections: [makeSection({ name: 'Verse', barCount: 8 })],
      blocks: [makeBlock({ startBar: 1, endBar: 8 })],
      chords: [],
    });

    useProjectStore.getState().splitBlock('block-1', 5);

    const container = renderStatusBar('saved');
    const history = container.querySelector(
      '[data-testid="status-bar-history"]'
    ) as HTMLSpanElement | null;

    expect(history?.textContent).toBe('Undo: Split piano block in Verse at bar 5 (bars 1-8)');
    expect(history?.title).toBe(
      'Undo is ready to restore the arrangement captured before Split piano block in Verse at bar 5 (bars 1-8). ' +
      'Use Undo to restore the arrangement captured before Split piano block in Verse at bar 5 (bars 1-8).'
    );
  });

  it('renders merge-block context when the history boundary comes from a project merge', () => {
    useProjectStore.setState({
      project: makeProject(),
      stems: [makeStem({ instrument: 'piano' })],
      sections: [makeSection({ name: 'Verse', barCount: 8 })],
      blocks: [
        makeBlock({ id: 'block-1', startBar: 1, endBar: 4 }),
        makeBlock({ id: 'block-2', startBar: 5, endBar: 8 }),
      ],
      chords: [],
    });

    useProjectStore.getState().mergeBlocks('block-1', 'block-2');

    const container = renderStatusBar('saved');
    const history = container.querySelector(
      '[data-testid="status-bar-history"]'
    ) as HTMLSpanElement | null;

    expect(history?.textContent).toBe('Undo: Merge piano blocks in Verse (bars 1-4 and 5-8)');
    expect(history?.title).toBe(
      'Undo is ready to restore the arrangement captured before Merge piano blocks in Verse (bars 1-4 and 5-8). ' +
      'Use Undo to restore the arrangement captured before Merge piano blocks in Verse (bars 1-4 and 5-8).'
    );
  });

  it('renders reordered section context when the history boundary comes from a project reorder', () => {
    useProjectStore.setState({
      project: makeProject(),
      stems: [makeStem()],
      sections: [
        makeSection({ id: 'section-1', name: 'Verse' }),
        makeSection({ id: 'section-2', name: 'Chorus', sortOrder: 1, startBar: 5 }),
      ],
      blocks: [],
      chords: [],
    });

    useProjectStore.getState().reorderSections(['section-2', 'section-1']);

    const container = renderStatusBar('saved');
    const history = container.querySelector(
      '[data-testid="status-bar-history"]'
    ) as HTMLSpanElement | null;

    expect(history?.textContent).toBe('Undo: Reorder sections: Chorus -> Verse');
    expect(history?.title).toBe(
      'Undo is ready to restore the arrangement captured before Reorder sections: Chorus -> Verse. ' +
      'Use Undo to restore the arrangement captured before Reorder sections: Chorus -> Verse.'
    );
  });

  it('renders section-resize context when the history boundary comes from a section length change', () => {
    useProjectStore.setState({
      project: makeProject(),
      stems: [makeStem()],
      sections: [makeSection({ name: 'Verse', barCount: 8 })],
      blocks: [],
      chords: [],
    });

    useProjectStore.getState().updateSection('section-1', { barCount: 12 });

    const container = renderStatusBar('saved');
    const history = container.querySelector(
      '[data-testid="status-bar-history"]'
    ) as HTMLSpanElement | null;

    expect(history?.textContent).toBe('Undo: Resize section: Verse (8 bars -> 12 bars)');
    expect(history?.title).toBe(
      'Undo is ready to restore the arrangement captured before Resize section: Verse (8 bars -> 12 bars). ' +
      'Use Undo to restore the arrangement captured before Resize section: Verse (8 bars -> 12 bars).'
    );
  });

  it('renders blocked undo boundary truth instead of implying history is simply idle', () => {
    useUndoStore.getState().pushUndo('Broken action', {
      undo: 'not json',
      redo: makeSnapshot('after'),
    });

    const container = renderStatusBar('saved');
    const history = container.querySelector(
      '[data-testid="status-bar-history"]'
    ) as HTMLSpanElement | null;

    expect(history?.textContent).toBe('Undo blocked');
    expect(history?.title).toBe(
      'The latest undo boundary is still on the stack, but its restore snapshot cannot be read. Do not offer Undo for this boundary until a valid restore snapshot is stored.'
    );
  });

  it('renders redo as the next explicit history truth after undo runs', () => {
    useUndoStore.getState().pushUndo('Split block', {
      undo: makeSnapshot('before'),
      redo: makeSnapshot('after'),
    });
    expect(useUndoStore.getState().undo()).not.toBeNull();

    const container = renderStatusBar('saved');
    const history = container.querySelector(
      '[data-testid="status-bar-history"]'
    ) as HTMLSpanElement | null;

    expect(history?.textContent).toBe('Redo: Split block');
    expect(history?.title).toBe(
      'Redo is ready to restore the arrangement captured after Split block. Use Redo to restore the arrangement captured after Split block.'
    );
  });

  it('renders both undo and redo boundary truth when both history paths remain available', () => {
    useUndoStore.getState().pushUndo('Split block', {
      undo: makeSnapshot('split-before'),
      redo: makeSnapshot('split-after'),
    });
    useUndoStore.getState().pushUndo('Merge blocks', {
      undo: makeSnapshot('merge-before'),
      redo: makeSnapshot('merge-after'),
    });
    expect(useUndoStore.getState().undo()).not.toBeNull();

    const container = renderStatusBar('saved');
    const history = container.querySelector(
      '[data-testid="status-bar-history"]'
    ) as HTMLSpanElement | null;

    expect(history?.textContent).toBe('Undo: Split block · Redo: Merge blocks');
    expect(history?.title).toBe(
      'Undo is ready to restore the arrangement captured before Split block. ' +
      'Redo is ready to restore the arrangement captured after Merge blocks. ' +
      'Use Undo to restore the arrangement captured before Split block. ' +
      'Use Redo to restore the arrangement captured after Merge blocks.'
    );
  });

  it('keeps the actionable undo boundary visible before a blocked redo companion', () => {
    useUndoStore.getState().pushUndo('Split block', {
      undo: makeSnapshot('split-before'),
      redo: makeSnapshot('split-after'),
    });
    useUndoStore.getState().pushUndo('Broken redo', {
      undo: makeSnapshot('broken-before'),
      redo: 'not json',
    });
    expect(useUndoStore.getState().undo()).not.toBeNull();

    const container = renderStatusBar('saved');
    const history = container.querySelector(
      '[data-testid="status-bar-history"]'
    ) as HTMLSpanElement | null;

    expect(history?.textContent).toBe('Undo: Split block · Redo blocked');
    expect(history?.title).toBe(
      'Undo is ready to restore the arrangement captured before Split block. ' +
      'The latest redo boundary is still on the stack, but its restore snapshot cannot be read. ' +
      'Use Undo to restore the arrangement captured before Split block. ' +
      'Do not offer Redo for this boundary until a valid restore snapshot is stored.'
    );
  });

  it('renders paused undo history while generation temporarily locks the stack', () => {
    useUiStore.setState({
      generationState: 'generating',
    });
    useUndoStore.getState().pushUndo('Split block', {
      undo: makeSnapshot('before'),
      redo: makeSnapshot('after'),
    });

    const container = renderStatusBar('generating');
    const history = container.querySelector(
      '[data-testid="status-bar-history"]'
    ) as HTMLSpanElement | null;

    expect(history?.textContent).toBe('Undo paused');
    expect(history?.title).toBe(
      'Generation is still running, so Undo is temporarily paused even though the arrangement captured before Split block is still preserved on the stack. Wait for generation to finish, then use Undo to restore the arrangement captured before Split block.'
    );
  });
});
