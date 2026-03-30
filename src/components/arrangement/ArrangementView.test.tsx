// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Block, Project, Section, Stem, TransportState } from '@/types';
import { useProjectStore } from '@/store/project-store';
import { useSelectionStore } from '@/store/selection-store';
import { useUiStore } from '@/store/ui-store';
import { ArrangementView } from './ArrangementView';

const useAudioState = vi.hoisted(() => ({
  transportState: {
    playbackState: 'stopped',
    currentBar: 1,
    currentBeat: 1,
    elapsedSeconds: 0,
    totalSeconds: 0,
    isCountingIn: false,
  } as TransportState,
  seek: vi.fn(),
}));

const runGenerationMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useAudio', () => ({
  useAudio: () => ({
    transportState: useAudioState.transportState,
    seek: useAudioState.seek,
  }),
}));

vi.mock('@/hooks/useGenerate', () => ({
  useGenerate: () => ({
    runGeneration: runGenerationMock,
  }),
}));

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
  ResizeObserver?: typeof ResizeObserver;
};

class ResizeObserverMock {
  observe() {}

  unobserve() {}

  disconnect() {}
}

function makeProject(partial: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    userId: 'user-1',
    name: 'Arrangement Truth Demo',
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
    generatedAt: '2026-03-30T00:00:00Z',
    generatedTempo: 120,
    createdAt: '2026-03-30T00:00:00Z',
    updatedAt: '2026-03-30T00:00:00Z',
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
    createdAt: '2026-03-30T00:00:00Z',
    ...partial,
  };
}

function makeStem(partial: Partial<Stem> = {}): Stem {
  return {
    id: 'stem-1',
    projectId: 'project-1',
    instrument: 'drums',
    sortOrder: 0,
    volume: 0.8,
    pan: 0,
    isMuted: false,
    isSolo: false,
    createdAt: '2026-03-30T00:00:00Z',
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
    style: 'steady-groove',
    energyOverride: null,
    dynamicsOverride: null,
    midiData: [],
    createdAt: '2026-03-30T00:00:00Z',
    ...partial,
  };
}

function renderArrangementView() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<ArrangementView />);
  });

  return { container, root };
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  reactActEnv.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

  runGenerationMock.mockReset();
  useAudioState.seek.mockReset();

  useProjectStore.setState({
    project: makeProject(),
    sections: [makeSection()],
    stems: [
      makeStem({ id: 'stem-drums', instrument: 'drums', sortOrder: 0 }),
      makeStem({ id: 'stem-piano', instrument: 'piano', sortOrder: 2 }),
    ],
    blocks: [
      makeBlock({ id: 'block-drums', stemId: 'stem-drums', sectionId: 'section-1' }),
    ],
    chords: [],
    chatMessages: [],
    drumOnlyUpdate: false,
    allInstrumentsUpdate: false,
  });

  useSelectionStore.setState({
    level: 'song',
    sectionId: null,
    blockId: null,
    stemId: null,
  });

  useUiStore.setState({
    generationState: 'complete',
    systemStatus: 'ready',
    errorMessage: null,
    chordDisplayMode: 'letter',
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
  useSelectionStore.getState().clearSelection();
});

describe('ArrangementView empty-state truth', () => {
  it('marks empty, unavailable, and chordless lanes instead of rendering them like normal loaded rows', () => {
    const mounted = renderArrangementView();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(
      mounted.container.querySelector('div[data-lane-instrument="drums"][data-lane-state="ready"]')
    ).not.toBeNull();
    expect(
      mounted.container.querySelector('button[aria-label="drums block, bars 1-4"]')
    ).not.toBeNull();

    expect(
      mounted.container.querySelector('div[data-lane-instrument="piano"][data-lane-state="empty"]')
    ).not.toBeNull();
    expect(mounted.container.textContent).toContain('No piano blocks loaded yet.');

    const pianoLaneButton = mounted.container.querySelector(
      'button[aria-label="PIANO lane empty"]'
    ) as HTMLButtonElement | null;
    expect(pianoLaneButton?.disabled).toBe(true);

    expect(
      mounted.container.querySelector('div[data-lane-instrument="bass"][data-lane-state="unavailable"]')
    ).not.toBeNull();
    expect(mounted.container.textContent).toContain('No bass stem loaded yet.');

    expect(
      mounted.container.querySelector('[data-chord-lane-state="empty"]')
    ).not.toBeNull();
    expect(mounted.container.textContent).toContain('No chord bars loaded yet.');
  });
});
