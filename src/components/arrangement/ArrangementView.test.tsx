// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Block, PlaybackReadiness, PlaybackTruth, Project, Section, Stem, TransportState } from '@/types';
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
  playbackReadiness: 'ready' as PlaybackReadiness,
  playbackTruth: {
    status: 'ready',
    action: 'play',
    reason: 'ready',
    summary: 'Ready',
    detail: 'Arrangement audio is loaded into the engine.',
    nextStep: 'Play, scrub, or adjust the transport.',
  } as PlaybackTruth,
  seek: vi.fn(),
}));

const runGenerationMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useAudio', () => ({
  useAudio: () => ({
    transportState: useAudioState.transportState,
    playbackReadiness: useAudioState.playbackReadiness,
    playbackTruth: useAudioState.playbackTruth,
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
  useAudioState.playbackReadiness = 'ready';
  useAudioState.playbackTruth = {
    status: 'ready',
    action: 'play',
    reason: 'ready',
    summary: 'Ready',
    detail: 'Arrangement audio is loaded into the engine.',
    nextStep: 'Play, scrub, or adjust the transport.',
  };

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
  it('shows explicit generation failure truth instead of neutral empty-state copy', () => {
    useUiStore.setState({
      generationState: 'idle',
      systemStatus: 'error',
      errorMessage:
        'Generation failed: Bars 2 and 3 currently parse as N.C., so Generate stays blocked until the chart is fixed. Next step: Replace bars 2 and 3 with explicit chords or fix the bar before them.',
    });

    const mounted = renderArrangementView();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const failureState = mounted.container.querySelector(
      '[data-testid="arrangement-failure-state"]'
    );

    expect(failureState).not.toBeNull();
    expect(mounted.container.textContent).toContain('Generation failed');
    expect(mounted.container.textContent).toContain(
      'Bars 2 and 3 currently parse as N.C., so Generate stays blocked until the chart is fixed.'
    );
    expect(mounted.container.textContent).toContain(
      'Next step: Replace bars 2 and 3 with explicit chords or fix the bar before them.'
    );
    expect(mounted.container.textContent).toContain('Generate again');
    expect(mounted.container.textContent).not.toContain('Ready to generate');
    expect(
      mounted.container.querySelector('[data-testid="arrangement-empty-state"]')
    ).toBeNull();
  });

  it('keeps regeneration failures visible inside the arrangement surface when the last arrangement stays loaded', () => {
    useUiStore.setState({
      generationState: 'complete',
      systemStatus: 'error',
      errorMessage:
        'Generation failed: Generator offline while refreshing the arrangement preview. Next step: Reconnect the generator, then run Generate again.',
    });

    const mounted = renderArrangementView();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const failureBanner = mounted.container.querySelector(
      '[data-testid="arrangement-failure-banner"]'
    );

    expect(failureBanner).not.toBeNull();
    expect(mounted.container.querySelector('[data-testid="arrangement-view"]')).not.toBeNull();
    expect(mounted.container.textContent).toContain(
      'Generator offline while refreshing the arrangement preview.'
    );
    expect(mounted.container.textContent).toContain(
      'Next step: Reconnect the generator, then run Generate again.'
    );
    expect(mounted.container.textContent).toContain(
      'Previous arrangement remains loaded below for reference.'
    );
    expect(
      mounted.container.querySelector('button[aria-label="drums block, bars 1-4"]')
    ).not.toBeNull();
    expect(mounted.container.textContent).not.toContain('Ready to generate');
  });

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
    expect(mounted.container.textContent).toContain('Pattern ready');
    expect(mounted.container.textContent).toContain('Steady Groove');

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

  it('surfaces missing block pattern truth instead of a fake default label', () => {
    useProjectStore.setState({
      blocks: [
        makeBlock({
          id: 'block-drums',
          stemId: 'stem-drums',
          sectionId: 'section-1',
          style: '   ',
        }),
      ],
    });

    const mounted = renderArrangementView();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.textContent).toContain('Pattern missing');
    expect(mounted.container.textContent).toContain('Choose a pattern');
    expect(mounted.container.textContent).not.toContain('Default');
  });

  it('surfaces idle playhead truth inside the arrangement when transport is ready', () => {
    const mounted = renderArrangementView();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const playheadBadge = mounted.container.querySelector(
      '[data-arrangement-playhead-state="idle"]'
    );
    const playheadLine = mounted.container.querySelector(
      '[data-arrangement-playhead-line="idle"]'
    );

    expect(playheadBadge?.textContent).toContain('Idle');
    expect(playheadBadge?.textContent).toContain('Ready');
    expect(playheadBadge?.textContent).toContain('Bar 1 Beat 1');
    expect(playheadBadge?.getAttribute('data-arrangement-readiness')).toBe('ready');
    expect(playheadLine).not.toBeNull();
  });

  it('keeps waiting playhead truth explicit while arrangement audio is still loading', () => {
    useAudioState.playbackReadiness = 'loading';
    useAudioState.playbackTruth = {
      status: 'loading',
      action: 'wait',
      reason: 'loading-arrangement',
      summary: 'Loading audio',
      detail: 'Arrangement audio is loading into the engine right now.',
      nextStep: 'Wait for the current audio load to finish.',
    };

    const mounted = renderArrangementView();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const playheadBadge = mounted.container.querySelector(
      '[data-arrangement-playhead-state="waiting"]'
    );

    expect(playheadBadge?.textContent).toContain('Waiting');
    expect(playheadBadge?.textContent).toContain('Loading audio');
    expect(playheadBadge?.textContent).toContain(
      'Arrangement audio is loading into the engine right now.'
    );
    expect(playheadBadge?.getAttribute('data-arrangement-readiness')).toBe('waiting');
    expect(
      mounted.container.querySelector('[data-arrangement-playhead-line]')
    ).toBeNull();
  });

  it('keeps blocked playhead truth explicit when arrangement rows exist but playback is unavailable', () => {
    useAudioState.playbackReadiness = 'unavailable';
    useAudioState.playbackTruth = {
      status: 'unavailable',
      action: 'retry-play',
      reason: 'engine-start-failed',
      summary: 'Audio engine blocked',
      detail: 'The audio engine could not start: no output device is available.',
      nextStep: 'Resolve the audio engine start error, then press play again.',
    };

    const mounted = renderArrangementView();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const playheadBadge = mounted.container.querySelector(
      '[data-arrangement-playhead-state="blocked"]'
    );

    expect(playheadBadge?.textContent).toContain('Blocked');
    expect(playheadBadge?.textContent).toContain('Audio engine blocked');
    expect(playheadBadge?.textContent).toContain(
      'The audio engine could not start: no output device is available.'
    );
    expect(playheadBadge?.getAttribute('data-arrangement-readiness')).toBe('blocked');
    expect(
      mounted.container.querySelector('[data-arrangement-playhead-line]')
    ).toBeNull();
  });
});
