// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AiChatMessage,
  Block,
  PlaybackReadiness,
  PlaybackTruth,
  Project,
  Section,
  Stem,
  TransportState,
} from '@/types';
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

function makeChatMessage(partial: Partial<AiChatMessage> = {}): AiChatMessage {
  return {
    id: 'chat-1',
    projectId: 'project-1',
    role: 'assistant',
    content: 'Generation failed: Generator offline',
    scope: 'setup',
    scopeTarget: null,
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
    projectLoadStatus: 'ready',
    projectLoadTargetId: 'project-1',
    projectLoadMessage: null,
    projectLoadFailureTarget: null,
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
  it('treats raw generator failures as generation-origin failures and keeps regenerate available', () => {
    useProjectStore.setState({
      chatMessages: [makeChatMessage({ content: 'Generation failed: Generator offline' })],
    });
    useUiStore.setState({
      generationState: 'idle',
      systemStatus: 'error',
      errorMessage: 'Generator offline',
    });

    const mounted = renderArrangementView();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const failureState = mounted.container.querySelector(
      '[data-testid="arrangement-failure-state"]'
    );

    expect(failureState).not.toBeNull();
    expect(mounted.container.textContent).toContain('Generation failed');
    expect(mounted.container.textContent).toContain('Generator offline');
    expect(mounted.container.textContent).toContain(
      'Next step: Review the current input blockers, then generate again.'
    );
    expect(mounted.container.textContent).toContain('Generate again');
    expect(mounted.container.textContent).not.toContain('Arrangement blocked');
    expect(mounted.container.textContent).not.toContain('Ready to generate');
    expect(
      mounted.container.querySelector('[data-testid="arrangement-empty-state"]')
    ).toBeNull();
  });

  it('shows a blocked arrangement state for non-generation errors instead of mislabeling them as generation failures', () => {
    useUiStore.setState({
      generationState: 'idle',
      systemStatus: 'error',
      errorMessage: 'AudioContext was not allowed to start',
    });

    const mounted = renderArrangementView();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const failureState = mounted.container.querySelector(
      '[data-testid="arrangement-failure-state"]'
    );

    expect(failureState).not.toBeNull();
    expect(mounted.container.textContent).toContain('Arrangement blocked');
    expect(mounted.container.textContent).toContain('AudioContext was not allowed to start');
    expect(mounted.container.textContent).toContain(
      'Resolve the current system error, then return to the arrangement.'
    );
    expect(mounted.container.textContent).not.toContain('Generation failed');
    expect(mounted.container.textContent).not.toContain('Generate again');
  });

  it('keeps the latest assistant generation failure visible in the empty arrangement state after global status returns to ready', () => {
    useUiStore.setState({
      generationState: 'idle',
      systemStatus: 'ready',
      errorMessage: null,
    });
    useProjectStore.setState({
      chatMessages: [
        makeChatMessage({
          content:
            'Generation failed: Generator offline Next step: Reconnect the generator, then run Generate again.',
          scope: 'song',
        }),
      ],
    });

    const mounted = renderArrangementView();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(
      mounted.container.querySelector('[data-testid="arrangement-failure-state"]')
    ).not.toBeNull();
    expect(mounted.container.textContent).toContain('Generation failed');
    expect(mounted.container.textContent).toContain('Generator offline');
    expect(mounted.container.textContent).toContain(
      'Next step: Reconnect the generator, then run Generate again.'
    );
    expect(
      mounted.container.querySelector('[data-testid="arrangement-empty-state"]')
    ).toBeNull();
  });

  it('keeps regeneration failures visible inside the arrangement surface when the last arrangement stays loaded', () => {
    useProjectStore.setState({
      chatMessages: [
        makeChatMessage({
          content:
            'Generation failed: Generator offline while refreshing the arrangement preview. Next step: Reconnect the generator, then run Generate again.',
          scope: 'song',
        }),
      ],
    });
    useUiStore.setState({
      generationState: 'complete',
      systemStatus: 'error',
      errorMessage:
        'Generator offline while refreshing the arrangement preview. Next step: Reconnect the generator, then run Generate again.',
    });

    const mounted = renderArrangementView();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const failureBanner = mounted.container.querySelector(
      '[data-testid="arrangement-failure-banner"]'
    );
    const chordLane = mounted.container.querySelector('[data-chord-lane-state="blocked"]');
    const chordReadiness = mounted.container.querySelector('[data-chord-lane-readiness="blocked"]');

    expect(failureBanner).not.toBeNull();
    expect(chordLane).not.toBeNull();
    expect(chordReadiness?.textContent).toContain('Failed');
    expect(mounted.container.querySelector('[data-testid="arrangement-view"]')).not.toBeNull();
    expect(mounted.container.textContent).toContain('Generation failed');
    expect(mounted.container.textContent).toContain(
      'Generator offline while refreshing the arrangement preview.'
    );
    expect(mounted.container.textContent).toContain(
      'Next step: Reconnect the generator, then run Generate again.'
    );
    expect(mounted.container.textContent).toContain(
      'Previous arrangement remains loaded below for reference.'
    );
    expect(mounted.container.textContent).toContain('Generate again');
    expect(mounted.container.textContent).not.toContain(
      'Chord lane is waiting for chord bars to load for this arrangement.'
    );
    expect(
      mounted.container.querySelector('button[aria-label="drums block, bars 1-4"]')
    ).not.toBeNull();
    expect(mounted.container.textContent).not.toContain('Ready to generate');
  });

  it('keeps the latest assistant generation failure banner visible after global status returns to ready', () => {
    useUiStore.setState({
      generationState: 'complete',
      systemStatus: 'ready',
      errorMessage: null,
    });
    useProjectStore.setState({
      chatMessages: [
        makeChatMessage({
          id: 'm0',
          role: 'user',
          content: 'Try a leaner arrangement.',
        }),
        makeChatMessage({
          id: 'm1',
          content:
            'Generation failed: Generator offline while refreshing the arrangement preview. Next step: Reconnect the generator, then run Generate again.',
          scope: 'song',
        }),
      ],
    });

    const mounted = renderArrangementView();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(
      mounted.container.querySelector('[data-testid="arrangement-failure-banner"]')
    ).not.toBeNull();
    expect(mounted.container.textContent).toContain(
      'Generator offline while refreshing the arrangement preview.'
    );
    expect(mounted.container.textContent).toContain(
      'Next step: Reconnect the generator, then run Generate again.'
    );
    expect(mounted.container.textContent).toContain(
      'Previous arrangement remains loaded below for reference.'
    );
  });

  it('clears stale arrangement failure truth after a later assistant success replaces the failed reply', () => {
    useUiStore.setState({
      generationState: 'complete',
      systemStatus: 'ready',
      errorMessage: null,
    });
    useProjectStore.setState({
      chatMessages: [
        makeChatMessage({
          id: 'm0',
          content: 'Generation failed: Generator offline',
          scope: 'song',
        }),
        makeChatMessage({
          id: 'm1',
          content: 'Arrangement updated with a leaner groove and lighter harmony.',
          scope: 'song',
        }),
      ],
    });

    const mounted = renderArrangementView();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(
      mounted.container.querySelector('[data-testid="arrangement-failure-banner"]')
    ).toBeNull();
    expect(
      mounted.container.querySelector('[data-testid="arrangement-view"]')
    ).not.toBeNull();
    expect(mounted.container.textContent).not.toContain('Generation failed');
    expect(mounted.container.textContent).not.toContain(
      'Previous arrangement remains loaded below for reference.'
    );
  });

  it('marks empty, unavailable, and waiting chord truth instead of rendering them like normal loaded rows', () => {
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
      mounted.container.querySelector('[data-chord-lane-state="waiting"]')
    ).not.toBeNull();
    expect(mounted.container.textContent).toContain('Chord lane is waiting for chord bars to load for this arrangement.');
    const chordReadiness = mounted.container.querySelector(
      '[data-chord-lane-readiness="waiting"]'
    );

    expect(chordReadiness?.textContent).toContain('Waiting');
  });

  it('keeps chord lane blocked truth visible when the project store is blocked', () => {
    useProjectStore.setState({
      project: null,
      projectLoadStatus: 'error',
      projectLoadTargetId: 'project-1',
      projectLoadMessage: 'Backend unavailable',
      projectLoadFailureTarget: 'project blocks',
      sections: [],
      blocks: [],
      stems: [],
      chords: [],
    });

    const mounted = renderArrangementView();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const chordLane = mounted.container.querySelector('[data-chord-lane-state="blocked"]');
    const chordReadiness = mounted.container.querySelector('[data-chord-lane-readiness="blocked"]');

    expect(chordLane).not.toBeNull();
    expect(chordReadiness?.textContent).toContain('Blocked');
    expect(mounted.container.textContent).toContain(
      'Project project-1 is blocked because project blocks could not be loaded into the project store. Backend unavailable'
    );
  });

  it('keeps chord lane waiting truth visible while the project store is still loading', () => {
    useProjectStore.setState({
      project: null,
      projectLoadStatus: 'loading',
      projectLoadTargetId: 'project-2',
      projectLoadMessage: null,
      projectLoadFailureTarget: null,
      sections: [],
      blocks: [],
      stems: [],
      chords: [],
    });

    const mounted = renderArrangementView();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const chordLane = mounted.container.querySelector('[data-chord-lane-state="waiting"]');
    const chordReadiness = mounted.container.querySelector('[data-chord-lane-readiness="waiting"]');

    expect(chordLane).not.toBeNull();
    expect(chordReadiness?.textContent).toContain('Waiting');
    expect(mounted.container.textContent).toContain(
      'Project project-2 is still loading into the project store.'
    );
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
    expect(mounted.container.textContent).toContain('Needs pattern');
    expect(mounted.container.textContent).toContain(
      'Choose a pattern in Block Inspector to make this block playable.'
    );
    expect(mounted.container.textContent).not.toContain('Default');
  });

  it('keeps missing block style truth honest when a block is selected into inspector context', () => {
    const onBlockSelect = vi.fn();

    useProjectStore.setState({
      blocks: [
        makeBlock({
          id: 'block-drums',
          stemId: 'stem-drums',
          sectionId: 'section-1',
          style: null,
        }),
      ],
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<ArrangementView onBlockSelect={onBlockSelect} />);
    });

    mountedRoot = root;
    mountedContainer = container;

    const blockButton = container.querySelector(
      'button[aria-label="drums block, bars 1-4"]'
    ) as HTMLButtonElement | null;

    expect(blockButton).not.toBeNull();

    act(() => {
      blockButton?.click();
    });

    expect(onBlockSelect).toHaveBeenCalledWith({
      instrument: 'drums',
      styleName: null,
      startBar: 1,
      endBar: 4,
    });
    expect(container.textContent).toContain('Pattern missing');
    expect(container.textContent).toContain('Needs pattern');
    expect(container.textContent).toContain(
      'Choose a pattern in Block Inspector to make this block playable.'
    );
    expect(container.textContent).toContain(
      'Pattern missing for bars 1-4. Choose a pattern in Block Inspector to make this block playable.'
    );
    expect(container.textContent).not.toContain('Default');
  });
  it('surfaces song-default selection truth and marks each lane entry point explicitly', () => {
    const mounted = renderArrangementView();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const selectionTruth = mounted.container.querySelector(
      '[data-testid="arrangement-selection-truth"]'
    ) as HTMLDivElement | null;
    const defaultBadge = mounted.container.querySelector(
      '[data-block-selection-state="default"]'
    ) as HTMLSpanElement | null;

    expect(selectionTruth?.textContent).toContain('Song default');
    expect(selectionTruth?.getAttribute('data-arrangement-selection-state')).toBe('default');
    expect(
      mounted.container.querySelector('[data-testid="chord-lane-selection-truth"]')?.textContent
    ).toContain('Song default');
    expect(
      mounted.container
        .querySelector('[data-testid="chord-lane-selection-truth"]')
        ?.getAttribute('data-chord-lane-selection-state')
    ).toBe('default');
    expect(mounted.container.textContent).toContain(
      'No section or block is selected. Lane headers target the first loaded block in each lane.'
    );
    expect(
      mounted.container
        .querySelector('[data-testid="chord-lane-selection-truth"]')
        ?.getAttribute('title')
    ).toContain(
      'No section or block is selected. The chord lane is showing the whole-song chart every arrangement lane inherits.'
    );
    expect(defaultBadge?.textContent).toContain('Lane default');
  });

  it('surfaces inherited section scope when a section is selected but no block is explicit', () => {
    useProjectStore.setState({
      stems: [
        makeStem({ id: 'stem-drums', instrument: 'drums', sortOrder: 0 }),
      ],
      blocks: [
        makeBlock({ id: 'block-verse', stemId: 'stem-drums', sectionId: 'section-1', startBar: 1, endBar: 4 }),
      ],
    });
    useSelectionStore.getState().selectSection('section-1');

    const mounted = renderArrangementView();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const selectionTruth = mounted.container.querySelector(
      '[data-testid="arrangement-selection-truth"]'
    ) as HTMLDivElement | null;
    const inheritedBadge = mounted.container.querySelector(
      '[data-block-selection-state="inherited"]'
    ) as HTMLSpanElement | null;
    const chordSelectionTruth = mounted.container.querySelector(
      '[data-testid="chord-lane-selection-truth"]'
    ) as HTMLSpanElement | null;

    expect(selectionTruth?.textContent).toContain('Verse selected');
    expect(selectionTruth?.getAttribute('data-arrangement-selection-state')).toBe('inherited');
    expect(chordSelectionTruth?.textContent).toContain('Verse selected');
    expect(chordSelectionTruth?.getAttribute('data-chord-lane-selection-state')).toBe('selected');
    expect(chordSelectionTruth?.getAttribute('title')).toContain(
      'Verse is selected in the arrangement, but the chord lane still shows the whole-song chart this section inherits today.'
    );
    expect(mounted.container.textContent).toContain(
      '4 bars in focus. Blocks inside this section inherit the active scope until you pick a block.'
    );
    expect(inheritedBadge?.textContent).toContain('Inherited');
  });

  it('surfaces explicit block selection truth when a block is active', () => {
    useSelectionStore.getState().selectBlock('block-drums', 'stem-drums');

    const mounted = renderArrangementView();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const selectionTruth = mounted.container.querySelector(
      '[data-testid="arrangement-selection-truth"]'
    ) as HTMLDivElement | null;
    const selectedBadge = mounted.container.querySelector(
      '[data-block-selection-state="selected"]'
    ) as HTMLSpanElement | null;
    const chordSelectionTruth = mounted.container.querySelector(
      '[data-testid="chord-lane-selection-truth"]'
    ) as HTMLSpanElement | null;

    expect(selectionTruth?.textContent).toContain('DRUMS selected');
    expect(selectionTruth?.getAttribute('data-arrangement-selection-state')).toBe('selected');
    expect(chordSelectionTruth?.textContent).toContain('DRUMS bars 1-4 selected');
    expect(chordSelectionTruth?.getAttribute('data-chord-lane-selection-state')).toBe('selected');
    expect(chordSelectionTruth?.getAttribute('title')).toContain(
      'DRUMS bars 1-4 is selected in the arrangement, but the chord lane still shows the whole-song chart that block inherits today.'
    );
    expect(mounted.container.textContent).toContain('Steady Groove covers bars 1-4.');
    expect(selectedBadge?.textContent).toContain('Selected');
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
