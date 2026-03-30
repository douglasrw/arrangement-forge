// @vitest-environment jsdom

import { act } from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useProjectStore } from '@/store/project-store';
import { useSelectionStore } from '@/store/selection-store';
import { useUiStore } from '@/store/ui-store';
import { useUndoStore } from '@/store/undo-store';
import type { Block, Chord, Project, Section, Stem } from '@/types';

const saveProjectMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useProject', () => ({
  useProject: () => ({
    saveProject: saveProjectMock,
  }),
}));

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function makeProject(partial: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    userId: 'u1',
    name: 'Undo Boundary Test',
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
    hasArrangement: true,
    generatedAt: '2026-03-31T00:00:00Z',
    generatedTempo: 120,
    createdAt: '2026-03-31T00:00:00Z',
    updatedAt: '2026-03-31T00:00:00Z',
    ...partial,
  };
}

function makeStem(partial: Partial<Stem> = {}): Stem {
  return {
    id: 'st-1',
    projectId: 'p1',
    instrument: 'piano',
    sortOrder: 0,
    volume: 0.8,
    pan: 0,
    isMuted: false,
    isSolo: false,
    createdAt: '2026-03-31T00:00:00Z',
    ...partial,
  };
}

function makeSection(partial: Partial<Section> = {}): Section {
  return {
    id: 'sec-1',
    projectId: 'p1',
    name: 'Verse',
    sortOrder: 0,
    barCount: 4,
    startBar: 1,
    energyOverride: null,
    grooveOverride: null,
    feelOverride: null,
    swingPctOverride: null,
    dynamicsOverride: null,
    createdAt: '2026-03-31T00:00:00Z',
    ...partial,
  };
}

function makeBlock(partial: Partial<Block> = {}): Block {
  return {
    id: 'blk-1',
    stemId: 'st-1',
    sectionId: 'sec-1',
    startBar: 1,
    endBar: 4,
    chordDegree: 'I',
    chordQuality: 'maj7',
    chordBassDegree: null,
    style: 'block_chords',
    energyOverride: null,
    dynamicsOverride: null,
    midiData: [],
    createdAt: '2026-03-31T00:00:00Z',
    ...partial,
  };
}

function makeChord(partial: Partial<Chord> = {}): Chord {
  return {
    id: 'ch-1',
    projectId: 'p1',
    barNumber: 1,
    degree: 'I',
    quality: 'maj7',
    bassDegree: null,
    ...partial,
  };
}

function makeArrangement(label: string) {
  return {
    stems: [makeStem({ id: `st-${label}` })],
    sections: [makeSection({ id: `sec-${label}` })],
    blocks: [makeBlock({ id: `blk-${label}`, stemId: `st-${label}`, sectionId: `sec-${label}` })],
    chords: [makeChord({ id: `ch-${label}` })],
  };
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

function Harness() {
  useKeyboardShortcuts();
  return null;
}

function renderHarness() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(createElement(Harness));
  });

  return { container, root };
}

function dispatchShortcut(key: string, options: Pick<KeyboardEventInit, 'shiftKey'> = {}) {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key,
      ctrlKey: true,
      bubbles: true,
      ...options,
    }));
  });
}

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  saveProjectMock.mockReset();

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
    lastSavedAt: null,
  });

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

  useUndoStore.setState({
    undoStack: [],
    redoStack: [],
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

describe('useKeyboardShortcuts undo boundary truth', () => {
  it('applies the before snapshot when undo runs', () => {
    const before = makeArrangement('before');
    const after = makeArrangement('after');

    useProjectStore.getState().setArrangement(after);
    useUndoStore.getState().pushUndo(
      'Boundary test',
      {
        undo: JSON.stringify(before),
        redo: JSON.stringify(after),
      }
    );

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    dispatchShortcut('z');

    expect(useProjectStore.getState().blocks).toMatchObject([
      { id: 'blk-before', stemId: 'st-before', sectionId: 'sec-before' },
    ]);
    expect(useUndoStore.getState().redoStack).toHaveLength(1);
  });

  it('applies the after snapshot when redo runs', () => {
    const before = makeArrangement('before');
    const after = makeArrangement('after');

    useProjectStore.getState().setArrangement(after);
    useUndoStore.getState().pushUndo(
      'Boundary test',
      {
        undo: JSON.stringify(before),
        redo: JSON.stringify(after),
      }
    );

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    dispatchShortcut('z');
    expect(useProjectStore.getState().blocks).toMatchObject([
      { id: 'blk-before', stemId: 'st-before', sectionId: 'sec-before' },
    ]);

    dispatchShortcut('z', { shiftKey: true });

    expect(useProjectStore.getState().blocks).toMatchObject([
      { id: 'blk-after', stemId: 'st-after', sectionId: 'sec-after' },
    ]);
    expect(useUndoStore.getState().undoStack).toHaveLength(1);
  });
});
