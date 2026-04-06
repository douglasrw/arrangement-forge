// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TransportBar } from './TransportBar';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import { useUndoStore } from '@/store/undo-store';
import type {
  AudioEngineConfig,
  Block,
  Chord,
  PlaybackTruth,
  PlaybackReadiness,
  Project,
  Section,
  Stem,
  TransportState,
} from '@/types';

const playMock = vi.hoisted(() => vi.fn(async () => undefined));
const pauseMock = vi.hoisted(() => vi.fn());
const stopMock = vi.hoisted(() => vi.fn());
const seekMock = vi.hoisted(() => vi.fn());
const seekToSecondsMock = vi.hoisted(() => vi.fn());
const setMetronomeEnabledMock = vi.hoisted(() => vi.fn());
const setLoopEnabledMock = vi.hoisted(() => vi.fn());
const useAudioState = vi.hoisted(() => ({
  transportState: {
    playbackState: 'stopped',
    currentBar: 1,
    currentBeat: 1,
    elapsedSeconds: 0,
    totalSeconds: 0,
    isCountingIn: false,
  } as TransportState,
  audioConfig: {
    metronomeEnabled: false,
    countIn: 'off',
    masterVolume: 0.8,
    loopEnabled: false,
    loopStartBar: 1,
    loopEndBar: 4,
  } as AudioEngineConfig,
  playbackReadiness: 'ready' as PlaybackReadiness,
  playbackTruth: {
    status: 'ready',
    action: 'play',
    reason: 'ready',
    summary: 'Ready',
    detail: 'Arrangement audio is loaded into the engine.',
    nextStep: 'Play, scrub, or adjust the transport.',
  } as PlaybackTruth,
}));

vi.mock('@/hooks/useAudio', () => ({
  useAudio: () => ({
    transportState: useAudioState.transportState,
    audioConfig: useAudioState.audioConfig,
    playbackReadiness: useAudioState.playbackReadiness,
    playbackTruth: useAudioState.playbackTruth,
    play: playMock,
    pause: pauseMock,
    stop: stopMock,
    seek: seekMock,
    seekToSeconds: seekToSecondsMock,
    setMetronomeEnabled: setMetronomeEnabledMock,
    setLoopEnabled: setLoopEnabledMock,
  }),
}));

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function makeProject(partial: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    userId: 'u1',
    name: 'Test Project',
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
    chordChartRaw: 'Cmaj7 | Dm7 | G7 | Cmaj7',
    hasArrangement: true,
    generatedAt: '2026-03-28T00:00:00Z',
    generatedTempo: 120,
    createdAt: '2026-03-28T00:00:00Z',
    updatedAt: '2026-03-28T00:00:00Z',
    ...partial,
  };
}

function makeSections(): Section[] {
  return [
    {
      id: 's1',
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
      createdAt: '2026-03-28T00:00:00Z',
    },
  ];
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

function renderTransportBar() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<TransportBar />);
  });

  return { container, root };
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;

  playMock.mockClear();
  pauseMock.mockClear();
  stopMock.mockClear();
  seekMock.mockClear();
  seekToSecondsMock.mockClear();
  setMetronomeEnabledMock.mockClear();
  setLoopEnabledMock.mockClear();

  useAudioState.transportState = {
    playbackState: 'stopped',
    currentBar: 1,
    currentBeat: 1,
    elapsedSeconds: 0,
    totalSeconds: 0,
    isCountingIn: false,
  };
  useAudioState.audioConfig = {
    metronomeEnabled: false,
    countIn: 'off',
    masterVolume: 0.8,
    loopEnabled: false,
    loopStartBar: 1,
    loopEndBar: 4,
  };
  useAudioState.playbackReadiness = 'ready';
  useAudioState.playbackTruth = {
    status: 'ready',
    action: 'play',
    reason: 'ready',
    summary: 'Ready',
    detail: 'Arrangement audio is loaded into the engine.',
    nextStep: 'Play, scrub, or adjust the transport.',
  };

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

  useProjectStore.setState({
    project: makeProject(),
    stems: [],
    sections: makeSections(),
    blocks: [],
    chords: [],
    chatMessages: [],
    drumOnlyUpdate: false,
    allInstrumentsUpdate: false,
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

describe('TransportBar transport controls', () => {
  it('reflects engine-backed loop and metronome state instead of local toggle state', () => {
    useAudioState.transportState = {
      ...useAudioState.transportState,
      currentBar: 3,
      currentBeat: 2,
      elapsedSeconds: 24,
      totalSeconds: 96,
    }
    useAudioState.audioConfig = {
      ...useAudioState.audioConfig,
      loopEnabled: true,
      metronomeEnabled: true,
    };

    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const loopButton = mounted.container.querySelector(
      'button[aria-label="Toggle loop"]'
    ) as HTMLButtonElement | null;
    const metronomeButton = mounted.container.querySelector(
      'button[aria-label="Toggle metronome"]'
    ) as HTMLButtonElement | null;
    const playheadTruth = mounted.container.querySelector(
      '[data-playhead-state="idle"]'
    ) as HTMLDivElement | null;
    const readinessBadge = mounted.container.querySelector(
      '[data-transport-readiness-state]'
    ) as HTMLSpanElement | null;
    const selectionTruth = mounted.container.querySelector(
      '[data-testid="transport-selection-truth"]'
    ) as HTMLDivElement | null;

    expect(loopButton?.getAttribute('aria-pressed')).toBe('true');
    expect(metronomeButton?.getAttribute('aria-pressed')).toBe('true');
    expect(playheadTruth).not.toBeNull();
    expect(readinessBadge?.getAttribute('data-transport-readiness-state')).toBe('ready');
    expect(readinessBadge?.textContent).toBe('Ready');
    expect(selectionTruth?.textContent).toContain('Loop on');
    expect(selectionTruth?.textContent).toContain('Metronome on');
    expect(mounted.container.textContent).toContain('Idle');
    expect(mounted.container.textContent).toContain('Bar 3 Beat 2');
    expect(mounted.container.textContent).toContain('0:24 / 1:36');
  });

  it('surfaces idle playhead truth at the start of a ready timeline', () => {
    useAudioState.transportState = {
      ...useAudioState.transportState,
      playbackState: 'stopped',
      currentBar: 1,
      currentBeat: 1,
      elapsedSeconds: 0,
      totalSeconds: 64,
    };

    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const scrubber = mounted.container.querySelector(
      'input[aria-label="Transport scrubber"]'
    ) as HTMLInputElement | null;
    const playheadTruth = mounted.container.querySelector(
      '[data-playhead-state="idle"]'
    ) as HTMLDivElement | null;

    expect(playheadTruth).not.toBeNull();
    expect(mounted.container.textContent).toContain('Idle');
    expect(mounted.container.textContent).toContain('At start');
    expect(scrubber?.getAttribute('aria-valuetext')).toContain('Idle at start');
  });

  it('surfaces active playhead truth while playback is moving', () => {
    useAudioState.transportState = {
      ...useAudioState.transportState,
      playbackState: 'playing',
      currentBar: 2,
      currentBeat: 4,
      elapsedSeconds: 16,
      totalSeconds: 64,
    };

    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const scrubber = mounted.container.querySelector(
      'input[aria-label="Transport scrubber"]'
    ) as HTMLInputElement | null;
    const playheadTruth = mounted.container.querySelector(
      '[data-playhead-state="active"]'
    ) as HTMLDivElement | null;

    expect(playheadTruth).not.toBeNull();
    expect(mounted.container.textContent).toContain('Playing');
    expect(mounted.container.textContent).toContain('Bar 2 Beat 4');
    expect(scrubber?.getAttribute('aria-valuetext')).toContain(
      'Playing at bar 2 beat 4, 0:16 of 1:04'
    );
  });

  it('applies available undo history directly from the transport surface', () => {
    const before = makeArrangement('before');
    const after = makeArrangement('after');

    useProjectStore.getState().setArrangement(after);
    useUndoStore.getState().pushUndo('Split block', {
      undo: JSON.stringify(before),
      redo: JSON.stringify(after),
    });

    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const undoButton = mounted.container.querySelector(
      'button[aria-label="Undo: Split block"]'
    ) as HTMLButtonElement | null;

    expect(undoButton?.disabled).toBe(false);
    expect(undoButton?.title).toBe(
      'Undo is ready to restore the arrangement captured before Split block. ' +
      'Use Undo to restore the arrangement captured before Split block.'
    );

    act(() => {
      undoButton?.click();
    });

    expect(useProjectStore.getState().blocks).toMatchObject([
      { id: 'blk-before', stemId: 'st-before', sectionId: 'sec-before' },
    ]);
    expect(useUndoStore.getState().undoStack).toHaveLength(0);
    expect(useUndoStore.getState().redoStack).toHaveLength(1);
  });

  it('applies available redo history directly from the transport surface', () => {
    const before = makeArrangement('before');
    const after = makeArrangement('after');

    useProjectStore.getState().setArrangement(after);
    useUndoStore.getState().pushUndo('Split block', {
      undo: JSON.stringify(before),
      redo: JSON.stringify(after),
    });

    const undoTransition = useUndoStore.getState().undo();
    expect(undoTransition?.restoreSnapshot).toMatchObject(before);
    useProjectStore.getState().setArrangement(before);

    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const redoButton = mounted.container.querySelector(
      'button[aria-label="Redo: Split block"]'
    ) as HTMLButtonElement | null;

    expect(redoButton?.disabled).toBe(false);
    expect(redoButton?.title).toBe(
      'Redo is ready to restore the arrangement captured after Split block. ' +
      'Use Redo to restore the arrangement captured after Split block.'
    );

    act(() => {
      redoButton?.click();
    });

    expect(useProjectStore.getState().blocks).toMatchObject([
      { id: 'blk-after', stemId: 'st-after', sectionId: 'sec-after' },
    ]);
    expect(useUndoStore.getState().undoStack).toHaveLength(1);
    expect(useUndoStore.getState().redoStack).toHaveLength(0);
  });

  it('keeps blocked undo history visible but disabled on the transport surface', () => {
    useUndoStore.getState().pushUndo('Broken action', {
      undo: 'not json',
      redo: JSON.stringify(makeArrangement('after')),
    });

    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const undoButton = mounted.container.querySelector(
      'button[aria-label="Undo blocked: Broken action"]'
    ) as HTMLButtonElement | null;

    expect(undoButton?.disabled).toBe(true);
    expect(undoButton?.title).toBe(
      'The latest undo boundary is still on the stack, but the arrangement captured before Broken action cannot be read. ' +
      'Do not offer Undo for the arrangement captured before Broken action until a valid restore snapshot is stored.'
    );
  });

  it('keeps waiting undo history visible on the transport surface before any edits exist', () => {
    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const undoButton = mounted.container.querySelector(
      'button[aria-label="Undo waiting"]'
    ) as HTMLButtonElement | null;
    const redoButton = mounted.container.querySelector(
      'button[aria-label="Redo waiting"]'
    ) as HTMLButtonElement | null;

    expect(undoButton?.disabled).toBe(true);
    expect(undoButton?.title).toBe(
      'Undo is waiting for the first restorable arrangement change. Edit the arrangement to create the next undo boundary.'
    );
    expect(redoButton?.disabled).toBe(true);
    expect(redoButton?.title).toBe(
      'Redo is waiting for an undo step before it can reopen. Undo a change to create the next redo boundary.'
    );

    const historyTruth = mounted.container.querySelector(
      '[data-testid="transport-history-truth"]'
    ) as HTMLDivElement | null;

    expect(historyTruth?.textContent).toContain('Undo waiting');
    expect(historyTruth?.textContent).toContain('Redo waiting');
  });

  it('keeps paused redo history visible but disabled while generation is running', () => {
    const before = makeArrangement('before');
    const after = makeArrangement('after');

    useProjectStore.getState().setArrangement(after);
    useUndoStore.getState().pushUndo('Split block', {
      undo: JSON.stringify(before),
      redo: JSON.stringify(after),
    });

    const undoTransition = useUndoStore.getState().undo();
    expect(undoTransition?.restoreSnapshot).toMatchObject(before);
    useProjectStore.getState().setArrangement(before);
    useUiStore.setState({
      generationState: 'generating',
    });

    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const redoButton = mounted.container.querySelector(
      'button[aria-label="Redo paused: Split block"]'
    ) as HTMLButtonElement | null;

    expect(redoButton?.disabled).toBe(true);
    expect(redoButton?.title).toBe(
      'Generation is still running, so Redo is temporarily paused even though the arrangement captured after Split block is still preserved on the stack. ' +
      'Wait for generation to finish, then use Redo to restore the arrangement captured after Split block.'
    );
  });

  it('renders visible undo and redo readiness truth beside the transport history controls', () => {
    useUndoStore.getState().pushUndo('Split block', {
      undo: JSON.stringify(makeArrangement('before')),
      redo: JSON.stringify(makeArrangement('after')),
    });

    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const historyTruth = mounted.container.querySelector(
      '[data-testid="transport-history-truth"]'
    ) as HTMLDivElement | null;

    expect(historyTruth?.textContent).toContain('Undo ready: Split block');
    expect(historyTruth?.textContent).toContain('Redo waiting');
  });

  it('renders blocked undo truth visibly on the transport surface without requiring hover text', () => {
    useUndoStore.getState().pushUndo('Broken action', {
      undo: 'not json',
      redo: JSON.stringify(makeArrangement('after')),
    });

    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const historyTruth = mounted.container.querySelector(
      '[data-testid="transport-history-truth"]'
    ) as HTMLDivElement | null;

    expect(historyTruth?.textContent).toContain('Undo blocked: Broken action');
    expect(historyTruth?.textContent).toContain('Redo waiting');
  });

  it('renders blocked redo truth visibly on the transport surface without requiring hover text', () => {
    useUndoStore.getState().pushUndo('Broken redo', {
      undo: JSON.stringify(makeArrangement('before')),
      redo: 'not json',
    });

    expect(useUndoStore.getState().undo()).not.toBeNull();

    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const historyTruth = mounted.container.querySelector(
      '[data-testid="transport-history-truth"]'
    ) as HTMLDivElement | null;

    expect(historyTruth?.textContent).toContain('Undo waiting');
    expect(historyTruth?.textContent).toContain('Redo blocked: Broken redo');
  });

  it('forwards loop and metronome toggles into the audio hook', () => {
    useAudioState.transportState = {
      ...useAudioState.transportState,
      totalSeconds: 64,
    };

    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const loopButton = mounted.container.querySelector(
      'button[aria-label="Toggle loop"]'
    ) as HTMLButtonElement | null;
    const metronomeButton = mounted.container.querySelector(
      'button[aria-label="Toggle metronome"]'
    ) as HTMLButtonElement | null;

    act(() => {
      loopButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      metronomeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(setLoopEnabledMock).toHaveBeenCalledWith(true);
    expect(setMetronomeEnabledMock).toHaveBeenCalledWith(true);
  });

  it('forwards scrubber changes into second-level transport seek', () => {
    useAudioState.transportState = {
      ...useAudioState.transportState,
      elapsedSeconds: 12,
      totalSeconds: 64,
    };

    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const scrubber = mounted.container.querySelector(
      'input[aria-label="Transport scrubber"]'
    ) as HTMLInputElement | null;

    expect(scrubber).not.toBeNull();

    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      )?.set;
      valueSetter?.call(scrubber, '32.5');
      scrubber?.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(seekToSecondsMock).toHaveBeenCalledWith(32.5);
  });

  it('disables timeline-dependent controls and surfaces empty timeline truth when no arrangement timeline exists', () => {
    useAudioState.transportState = {
      ...useAudioState.transportState,
      playbackState: 'playing',
      currentBar: 4,
      currentBeat: 3,
      elapsedSeconds: 18,
      totalSeconds: 0,
    };
    useAudioState.audioConfig = {
      ...useAudioState.audioConfig,
      loopEnabled: true,
      metronomeEnabled: true,
    };
    useAudioState.playbackReadiness = 'unavailable';

    useProjectStore.setState({
      project: makeProject({
        hasArrangement: false,
        generatedAt: null,
        generatedTempo: null,
      }),
      sections: [],
    });

    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const skipStartButton = mounted.container.querySelector(
      'button[aria-label="Skip to start"]'
    ) as HTMLButtonElement | null;
    const stopButton = mounted.container.querySelector(
      'button[aria-label="Stop"]'
    ) as HTMLButtonElement | null;
    const playButton = mounted.container.querySelector(
      'button[aria-label="Play unavailable"]'
    ) as HTMLButtonElement | null;
    const skipEndButton = mounted.container.querySelector(
      'button[aria-label="Skip to end"]'
    ) as HTMLButtonElement | null;
    const loopButton = mounted.container.querySelector(
      'button[aria-label="Toggle loop"]'
    ) as HTMLButtonElement | null;
    const metronomeButton = mounted.container.querySelector(
      'button[aria-label="Toggle metronome"]'
    ) as HTMLButtonElement | null;
    const scrubber = mounted.container.querySelector(
      'input[aria-label="Transport scrubber"]'
    ) as HTMLInputElement | null;
    const guidance = mounted.container.querySelector(
      '[data-transport-guidance="no-timeline"]'
    ) as HTMLDivElement | null;
    const selectionTruth = mounted.container.querySelector(
      '[data-testid="transport-selection-truth"]'
    ) as HTMLDivElement | null;
    expect(skipStartButton?.disabled).toBe(true);
    expect(stopButton?.disabled).toBe(false);
    expect(playButton?.disabled).toBe(true);
    expect(skipEndButton?.disabled).toBe(true);
    expect(loopButton?.disabled).toBe(true);
    expect(metronomeButton?.disabled).toBe(true);
    expect(loopButton?.getAttribute('aria-pressed')).toBe('true');
    expect(metronomeButton?.getAttribute('aria-pressed')).toBe('true');
    expect(scrubber).toBeNull();
    expect(guidance?.textContent).toContain('Generate or import an arrangement to enable playback and transport controls.');
    expect(selectionTruth?.textContent).toContain('Loop on');
    expect(selectionTruth?.textContent).toContain('Metronome on');
    expect(mounted.container.textContent).toContain('No timeline');
    expect(mounted.container.textContent).not.toContain('Ready');
    expect(mounted.container.textContent).not.toContain('Bar 4');
  });

  it.each(['ready', 'loading'] as const)(
    'keeps no-timeline truth when playback readiness drifts to %s',
    (readiness) => {
      useAudioState.transportState = {
        ...useAudioState.transportState,
        playbackState: 'playing',
        currentBar: 4,
        currentBeat: 3,
        elapsedSeconds: 18,
        totalSeconds: 64,
      };
      useAudioState.audioConfig = {
        ...useAudioState.audioConfig,
        loopEnabled: true,
        metronomeEnabled: true,
      };
      useAudioState.playbackReadiness = readiness;

      useProjectStore.setState({
        project: makeProject({
          hasArrangement: false,
          generatedAt: null,
          generatedTempo: null,
        }),
        sections: [],
      });

      const mounted = renderTransportBar();
      mountedRoot = mounted.root;
      mountedContainer = mounted.container;

      const skipStartButton = mounted.container.querySelector(
        'button[aria-label="Skip to start"]'
      ) as HTMLButtonElement | null;
      const playButton = mounted.container.querySelector(
        'button[aria-label="Play unavailable"]'
      ) as HTMLButtonElement | null;
      const skipEndButton = mounted.container.querySelector(
        'button[aria-label="Skip to end"]'
      ) as HTMLButtonElement | null;
      const loopButton = mounted.container.querySelector(
        'button[aria-label="Toggle loop"]'
      ) as HTMLButtonElement | null;
      const metronomeButton = mounted.container.querySelector(
        'button[aria-label="Toggle metronome"]'
      ) as HTMLButtonElement | null;
      const scrubber = mounted.container.querySelector(
        'input[aria-label="Transport scrubber"]'
      ) as HTMLInputElement | null;
      const guidance = mounted.container.querySelector(
        '[data-transport-guidance="no-timeline"]'
      ) as HTMLDivElement | null;
      const readinessBadge = mounted.container.querySelector(
        '[data-transport-readiness-state]'
      ) as HTMLSpanElement | null;
      const selectionTruth = mounted.container.querySelector(
        '[data-testid="transport-selection-truth"]'
      ) as HTMLDivElement | null;

      expect(skipStartButton?.disabled).toBe(true);
      expect(playButton?.disabled).toBe(true);
      expect(skipEndButton?.disabled).toBe(true);
      expect(loopButton?.disabled).toBe(true);
      expect(metronomeButton?.disabled).toBe(true);
      expect(loopButton?.getAttribute('aria-pressed')).toBe('true');
      expect(metronomeButton?.getAttribute('aria-pressed')).toBe('true');
      expect(scrubber).toBeNull();
      expect(guidance?.textContent).toContain('Generate or import an arrangement to enable playback and transport controls.');
      expect(readinessBadge?.getAttribute('data-transport-readiness-state')).toBe('blocked');
      expect(readinessBadge?.textContent).toBe('Blocked');
      expect(selectionTruth?.textContent).toContain('Loop on');
      expect(selectionTruth?.textContent).toContain('Metronome on');
      expect(mounted.container.textContent).toContain('No timeline');
      expect(mounted.container.textContent).not.toContain('Ready');
      expect(mounted.container.textContent).not.toContain('Load to play');
      expect(mounted.container.textContent).not.toContain('Loading audio');
      expect(mounted.container.textContent).not.toContain('Bar 4');
      expect(mounted.container.textContent).not.toContain('1:04');
    }
  );

  it('surfaces default-off transport selection truth when the engine config still uses defaults', () => {
    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const selectionTruth = mounted.container.querySelector(
      '[data-testid="transport-selection-truth"]'
    ) as HTMLDivElement | null;
    const loopTruth = mounted.container.querySelector(
      '[data-transport-selection="loop"]'
    ) as HTMLDivElement | null;
    const metronomeTruth = mounted.container.querySelector(
      '[data-transport-selection="metronome"]'
    ) as HTMLDivElement | null;

    expect(selectionTruth?.textContent).toContain('Loop default off');
    expect(selectionTruth?.textContent).toContain('Metronome default off');
    expect(loopTruth?.getAttribute('data-transport-selection-state')).toBe('default');
    expect(metronomeTruth?.getAttribute('data-transport-selection-state')).toBe('default');
  });

  it('surfaces mixed transport selection truth when loop is selected but metronome stays at the default', () => {
    useAudioState.audioConfig = {
      ...useAudioState.audioConfig,
      loopEnabled: true,
      metronomeEnabled: false,
    };

    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const selectionTruth = mounted.container.querySelector(
      '[data-testid="transport-selection-truth"]'
    ) as HTMLDivElement | null;
    const loopTruth = mounted.container.querySelector(
      '[data-transport-selection="loop"]'
    ) as HTMLDivElement | null;
    const metronomeTruth = mounted.container.querySelector(
      '[data-transport-selection="metronome"]'
    ) as HTMLDivElement | null;

    expect(selectionTruth?.textContent).toContain('Loop on');
    expect(selectionTruth?.textContent).toContain('Metronome default off');
    expect(selectionTruth?.getAttribute('title')).toContain('Loop is selected for playback.');
    expect(selectionTruth?.getAttribute('title')).toContain(
      'Metronome is off by default until you select it.'
    );
    expect(loopTruth?.getAttribute('data-transport-selection-state')).toBe('selected');
    expect(loopTruth?.getAttribute('title')).toBe('Loop is selected for playback.');
    expect(metronomeTruth?.getAttribute('data-transport-selection-state')).toBe('default');
    expect(metronomeTruth?.getAttribute('title')).toBe(
      'Metronome is off by default until you select it.'
    );
  });

  it('keeps the transport timeline available for loaded draft arrangement rows', () => {
    useAudioState.transportState = {
      ...useAudioState.transportState,
      totalSeconds: 0,
    };
    useAudioState.playbackReadiness = 'loading';
    useAudioState.playbackTruth = {
      status: 'loading',
      action: 'load-and-play',
      reason: 'awaiting-user-play',
      summary: 'Load to play',
      detail: 'Arrangement audio is not loaded into the engine yet.',
      nextStep: 'Press play to load arrangement audio.',
    };

    useProjectStore.setState({
      project: makeProject({
        hasArrangement: false,
        generatedAt: null,
        generatedTempo: null,
      }),
      sections: makeSections(),
    });

    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const playButton = mounted.container.querySelector(
      'button[aria-label="Load and play"]'
    ) as HTMLButtonElement | null;
    const guidance = mounted.container.querySelector(
      '[data-transport-guidance="awaiting-user-play"]'
    ) as HTMLDivElement | null;
    const readinessBadge = mounted.container.querySelector(
      '[data-transport-readiness-state]'
    ) as HTMLSpanElement | null;

    expect(playButton?.disabled).toBe(false);
    expect(guidance?.textContent).toContain('Arrangement audio is not loaded into the engine yet.');
    expect(guidance?.textContent).toContain('Press play to load arrangement audio.');
    expect(readinessBadge?.getAttribute('data-transport-readiness-state')).toBe('waiting');
    expect(readinessBadge?.textContent).toBe('Waiting');
    expect(mounted.container.textContent).toContain('Load to play');
    expect(mounted.container.textContent).not.toContain('No timeline');
  });

  it('keeps persisted snapshot truth explicit when the arrangement rows are not loaded', () => {
    useAudioState.playbackReadiness = 'unavailable';
    useAudioState.playbackTruth = {
      status: 'unavailable',
      action: 'unavailable',
      reason: 'saved-arrangement-not-loaded',
      summary: 'Reload arrangement',
      detail: 'A saved arrangement snapshot exists, but its rows are not loaded into the editor right now.',
      nextStep: 'Use Reload saved snapshot in the top bar before starting playback.',
    };

    useProjectStore.setState({
      project: makeProject({ hasArrangement: true }),
      sections: [],
    });

    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const playButton = mounted.container.querySelector(
      'button[aria-label="Play unavailable"]'
    ) as HTMLButtonElement | null;
    const guidance = mounted.container.querySelector(
      '[data-transport-guidance="no-timeline"]'
    ) as HTMLDivElement | null;

    expect(playButton?.disabled).toBe(true);
    expect(playButton?.title).toBe(
      'A saved arrangement snapshot exists, but its rows are not loaded in this session. Use Reload saved snapshot in the top bar to enable playback and transport controls.'
    );
    expect(guidance?.textContent).toContain(
      'A saved arrangement snapshot exists, but its rows are not loaded in this session. Use Reload saved snapshot in the top bar to enable playback and transport controls.'
    );
    expect(mounted.container.textContent).toContain('Reload arrangement');
    expect(guidance?.textContent).not.toContain(
      'Generate or import an arrangement to enable playback and transport controls.'
    );
  });

  it('surfaces no-stems transport truth explicitly when the timeline exists but playback is blocked', () => {
    useAudioState.playbackReadiness = 'unavailable';
    useAudioState.playbackTruth = {
      status: 'unavailable',
      action: 'unavailable',
      reason: 'no-stems',
      summary: 'Unavailable',
      detail: 'No playable stems are loaded for this arrangement yet.',
      nextStep: 'Regenerate or import stems before starting playback.',
    };

    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const playButton = mounted.container.querySelector(
      'button[aria-label="Play unavailable"]'
    ) as HTMLButtonElement | null;
    const guidance = mounted.container.querySelector(
      '[data-transport-guidance="no-stems"]'
    ) as HTMLDivElement | null;
    const readinessBadge = mounted.container.querySelector(
      '[data-transport-readiness-state]'
    ) as HTMLSpanElement | null;

    expect(playButton?.disabled).toBe(true);
    expect(guidance?.textContent).toContain('No playable stems are loaded for this arrangement yet.');
    expect(guidance?.textContent).toContain('Regenerate or import stems before starting playback.');
    expect(readinessBadge?.getAttribute('data-transport-readiness-state')).toBe('blocked');
    expect(readinessBadge?.textContent).toBe('Blocked');
    expect(mounted.container.textContent).toContain('No stems');
    expect(mounted.container.textContent).not.toContain('Load to play');
  });

  it('surfaces loading readiness truth before playback is ready', () => {
    useAudioState.transportState = {
      ...useAudioState.transportState,
      totalSeconds: 0,
    };
    useAudioState.playbackReadiness = 'loading';
    useAudioState.playbackTruth = {
      status: 'loading',
      action: 'load-and-play',
      reason: 'awaiting-user-play',
      summary: 'Load to play',
      detail: 'Arrangement audio is not loaded into the engine yet.',
      nextStep: 'Press play to load arrangement audio.',
    };

    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const skipStartButton = mounted.container.querySelector(
      'button[aria-label="Skip to start"]'
    ) as HTMLButtonElement | null;
    const playButton = mounted.container.querySelector(
      'button[aria-label="Load and play"]'
    ) as HTMLButtonElement | null;
    const loopButton = mounted.container.querySelector(
      'button[aria-label="Toggle loop"]'
    ) as HTMLButtonElement | null;
    const metronomeButton = mounted.container.querySelector(
      'button[aria-label="Toggle metronome"]'
    ) as HTMLButtonElement | null;
    const scrubber = mounted.container.querySelector(
      'input[aria-label="Transport scrubber"]'
    ) as HTMLInputElement | null;
    const guidance = mounted.container.querySelector(
      '[data-transport-guidance="awaiting-user-play"]'
    ) as HTMLDivElement | null;
    const readinessBadge = mounted.container.querySelector(
      '[data-transport-readiness-state]'
    ) as HTMLSpanElement | null;

    expect(skipStartButton?.disabled).toBe(true);
    expect(playButton?.disabled).toBe(false);
    expect(loopButton?.disabled).toBe(true);
    expect(metronomeButton?.disabled).toBe(true);
    expect(scrubber).toBeNull();
    expect(guidance?.textContent).toContain('Arrangement audio is not loaded into the engine yet.');
    expect(guidance?.textContent).toContain('Press play to load arrangement audio.');
    expect(readinessBadge?.getAttribute('data-transport-readiness-state')).toBe('waiting');
    expect(readinessBadge?.textContent).toBe('Waiting');
    expect(mounted.container.textContent).toContain('Load to play');
    expect(mounted.container.textContent).toContain('Load to play');
  });

  it('disables play while arrangement audio is actively loading', () => {
    useAudioState.playbackReadiness = 'loading';
    useAudioState.playbackTruth = {
      status: 'loading',
      action: 'wait',
      reason: 'loading-arrangement',
      summary: 'Loading audio',
      detail: 'Arrangement audio is loading into the engine right now.',
      nextStep: 'Wait for the current audio load to finish.',
    };

    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const playButton = mounted.container.querySelector(
      'button[aria-label="Loading audio"]'
    ) as HTMLButtonElement | null;
    const loopButton = mounted.container.querySelector(
      'button[aria-label="Toggle loop"]'
    ) as HTMLButtonElement | null;
    const metronomeButton = mounted.container.querySelector(
      'button[aria-label="Toggle metronome"]'
    ) as HTMLButtonElement | null;
    const scrubber = mounted.container.querySelector(
      'input[aria-label="Transport scrubber"]'
    ) as HTMLInputElement | null;
    const guidance = mounted.container.querySelector(
      '[data-transport-guidance="loading-arrangement"]'
    ) as HTMLDivElement | null;
    const readinessBadge = mounted.container.querySelector(
      '[data-transport-readiness-state]'
    ) as HTMLSpanElement | null;

    expect(playButton?.disabled).toBe(true);
    expect(loopButton?.disabled).toBe(true);
    expect(metronomeButton?.disabled).toBe(true);
    expect(scrubber).toBeNull();
    expect(guidance?.textContent).toContain('Arrangement audio is loading into the engine right now.');
    expect(guidance?.textContent).toContain('Wait for the current audio load to finish.');
    expect(readinessBadge?.getAttribute('data-transport-readiness-state')).toBe('waiting');
    expect(readinessBadge?.textContent).toBe('Waiting');
    expect(mounted.container.textContent).toContain('Loading audio');
    expect(mounted.container.textContent).not.toContain('Load to play');
  });

  it('surfaces unavailable playback truth when arrangement audio is not playable', () => {
    useAudioState.playbackReadiness = 'unavailable';
    useAudioState.playbackTruth = {
      status: 'unavailable',
      action: 'retry-play',
      reason: 'arrangement-load-failed',
      summary: 'Audio load failed',
      detail: 'Audio failed to load: Salamander drum samples missing',
      nextStep: 'Fix the sample error, then press play to try again.',
    };

    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const playButton = mounted.container.querySelector(
      'button[aria-label="Retry audio"]'
    ) as HTMLButtonElement | null;
    const loopButton = mounted.container.querySelector(
      'button[aria-label="Toggle loop"]'
    ) as HTMLButtonElement | null;
    const metronomeButton = mounted.container.querySelector(
      'button[aria-label="Toggle metronome"]'
    ) as HTMLButtonElement | null;
    const scrubber = mounted.container.querySelector(
      'input[aria-label="Transport scrubber"]'
    ) as HTMLInputElement | null;
    const guidance = mounted.container.querySelector(
      '[data-transport-guidance="arrangement-load-failed"]'
    ) as HTMLDivElement | null;
    const readinessBadge = mounted.container.querySelector(
      '[data-transport-readiness-state]'
    ) as HTMLSpanElement | null;

    expect(playButton?.disabled).toBe(false);
    expect(loopButton?.disabled).toBe(true);
    expect(metronomeButton?.disabled).toBe(true);
    expect(scrubber).toBeNull();
    expect(guidance?.textContent).toContain('Audio failed to load: Salamander drum samples missing');
    expect(guidance?.textContent).toContain('Fix the sample error, then press play to try again.');
    expect(readinessBadge?.getAttribute('data-transport-readiness-state')).toBe('error');
    expect(readinessBadge?.textContent).toBe('Error');
    expect(mounted.container.textContent).toContain('Audio load failed');
    expect(mounted.container.textContent).not.toContain('Loading');
    expect(mounted.container.textContent).not.toContain('Load to play');
    expect(playButton?.title).toContain('Audio failed to load: Salamander drum samples missing');

    act(() => {
      playButton?.click();
    });

    expect(playMock).toHaveBeenCalledTimes(1);
  });

  it('announces error transport readiness with next-step guidance as one status message', () => {
    useAudioState.playbackReadiness = 'unavailable';
    useAudioState.playbackTruth = {
      status: 'unavailable',
      action: 'retry-play',
      reason: 'arrangement-load-failed',
      summary: 'Audio load failed',
      detail: 'Audio failed to load: Salamander drum samples missing',
      nextStep: 'Fix the sample error, then press play to try again.',
    };

    const mounted = renderTransportBar();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const readinessStatus = mounted.container.querySelector(
      '[role="status"]'
    ) as HTMLDivElement | null;

    expect(readinessStatus).not.toBeNull();
    expect(readinessStatus?.getAttribute('aria-live')).toBe('polite');
    expect(readinessStatus?.getAttribute('aria-label')).toBe(
      'Error: Audio load failed. Audio failed to load: Salamander drum samples missing Fix the sample error, then press play to try again.'
    );
  });
});
