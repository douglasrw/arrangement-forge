// @vitest-environment jsdom

import { act } from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import type { AudioEngineConfig, Block, Project, Section, Stem, TransportState } from '@/types';

const engineState = vi.hoisted(() => ({
  isInitialized: false,
  isLoading: false,
  audioConfig: {
    metronomeEnabled: false,
    countIn: 'off',
    masterVolume: 0.8,
    loopEnabled: false,
    loopStartBar: 1,
    loopEndBar: 1,
  } as AudioEngineConfig,
  transportState: {
    playbackState: 'stopped',
    currentBar: 1,
    currentBeat: 1,
    elapsedSeconds: 0,
    totalSeconds: 0,
    isCountingIn: false,
  } as TransportState,
}));

const initMock = vi.hoisted(() => vi.fn(async () => {
  engineState.isInitialized = true;
}));
const loadArrangementMock = vi.hoisted(() => vi.fn(async () => undefined));
const getTransportStateMock = vi.hoisted(() => vi.fn(() => engineState.transportState));
const getAudioConfigMock = vi.hoisted(() => vi.fn(() => ({ ...engineState.audioConfig })));
const getReadinessSnapshotMock = vi.hoisted(() => vi.fn(() => ({
  isInitialized: engineState.isInitialized,
  isLoading: engineState.isLoading,
})));
const setMetronomeEnabledMock = vi.hoisted(() => vi.fn((enabled: boolean) => {
  engineState.audioConfig.metronomeEnabled = enabled;
}));
const setLoopEnabledMock = vi.hoisted(() => vi.fn((enabled: boolean) => {
  engineState.audioConfig.loopEnabled = enabled;
}));
const setMasterVolumeMock = vi.hoisted(() => vi.fn((volume: number) => {
  engineState.audioConfig.masterVolume = volume;
}));
const playMock = vi.hoisted(() => vi.fn());
const pauseMock = vi.hoisted(() => vi.fn());
const stopMock = vi.hoisted(() => vi.fn());
const seekMock = vi.hoisted(() => vi.fn());
const seekToSecondsMock = vi.hoisted(() => vi.fn());
const setTempoMock = vi.hoisted(() => vi.fn());
const setVolumeMock = vi.hoisted(() => vi.fn());
const setPanMock = vi.hoisted(() => vi.fn());
const setMuteMock = vi.hoisted(() => vi.fn());
const setSoloMock = vi.hoisted(() => vi.fn());
const hotSwapInstrumentMock = vi.hoisted(() => vi.fn());
const AudioEngineMock = vi.hoisted(() => vi.fn(() => ({
  get isInitialized() {
    return engineState.isInitialized;
  },
  init: initMock,
  loadArrangement: loadArrangementMock,
  getTransportState: getTransportStateMock,
  getAudioConfig: getAudioConfigMock,
  getReadinessSnapshot: getReadinessSnapshotMock,
  setMetronomeEnabled: setMetronomeEnabledMock,
  setLoopEnabled: setLoopEnabledMock,
  setMasterVolume: setMasterVolumeMock,
  play: playMock,
  pause: pauseMock,
  stop: stopMock,
  seek: seekMock,
  seekToSeconds: seekToSecondsMock,
  setTempo: setTempoMock,
  setVolume: setVolumeMock,
  setPan: setPanMock,
  setMute: setMuteMock,
  setSolo: setSoloMock,
  hotSwapInstrument: hotSwapInstrumentMock,
})));

vi.mock('@/audio/engine', () => ({
  AudioEngine: AudioEngineMock,
}));

import { useAudio } from './useAudio';

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

let hookValue: ReturnType<typeof useAudio> | null = null;
let consoleErrorSpy: ReturnType<typeof vi.spyOn> | null = null;

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
    chordChartRaw: '',
    hasArrangement: true,
    generatedAt: '2026-03-29T00:00:00Z',
    generatedTempo: 120,
    createdAt: '2026-03-29T00:00:00Z',
    updatedAt: '2026-03-29T00:00:00Z',
    ...partial,
  };
}

function makeStem(partial: Partial<Stem> = {}): Stem {
  return {
    id: 'st-piano',
    projectId: 'p1',
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
    createdAt: '2026-03-29T00:00:00Z',
    ...partial,
  };
}

function makeBlock(partial: Partial<Block> = {}): Block {
  return {
    id: 'blk-1',
    stemId: 'st-piano',
    sectionId: 'sec-1',
    startBar: 1,
    endBar: 4,
    chordDegree: 'I',
    chordQuality: 'maj7',
    chordBassDegree: null,
    style: 'jazz_comp',
    energyOverride: null,
    dynamicsOverride: null,
    midiData: [
      { note: 'C4', time: 0, duration: 1, velocity: 100 },
    ],
    createdAt: '2026-03-29T00:00:00Z',
    ...partial,
  };
}

function UseAudioHarness() {
  hookValue = useAudio();
  return null;
}

function renderHarness() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(createElement(UseAudioHarness));
  });

  return { container, root };
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  hookValue = null;
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  engineState.isInitialized = false;
  engineState.isLoading = false;
  engineState.audioConfig = {
    metronomeEnabled: false,
    countIn: 'off',
    masterVolume: 0.8,
    loopEnabled: false,
    loopStartBar: 1,
    loopEndBar: 1,
  };
  engineState.transportState = {
    playbackState: 'stopped',
    currentBar: 1,
    currentBeat: 1,
    elapsedSeconds: 0,
    totalSeconds: 0,
    isCountingIn: false,
  };

  initMock.mockClear();
  loadArrangementMock.mockClear();
  getTransportStateMock.mockClear();
  getAudioConfigMock.mockClear();
  getReadinessSnapshotMock.mockClear();
  setMetronomeEnabledMock.mockClear();
  setLoopEnabledMock.mockClear();
  setMasterVolumeMock.mockClear();
  playMock.mockClear();
  pauseMock.mockClear();
  stopMock.mockClear();
  seekMock.mockClear();
  seekToSecondsMock.mockClear();
  setTempoMock.mockClear();
  setVolumeMock.mockClear();
  setPanMock.mockClear();
  setMuteMock.mockClear();
  setSoloMock.mockClear();
  hotSwapInstrumentMock.mockClear();

  useProjectStore.setState({
    project: null,
    stems: [],
    sections: [],
    blocks: [],
    chords: [],
    chatMessages: [],
    drumOnlyUpdate: false,
    allInstrumentsUpdate: false,
  });

  useUiStore.setState({
    generationState: 'idle',
    systemStatus: 'ready',
    errorMessage: null,
    unsavedChanges: false,
    lastSavedAt: null,
  });
});

afterEach(() => {
  if (mountedRoot && mountedContainer) {
    act(() => {
      mountedRoot?.unmount();
    });
    mountedContainer.remove();
  }

  consoleErrorSpy?.mockRestore();
  consoleErrorSpy = null;
  mountedRoot = null;
  mountedContainer = null;
});

describe('useAudio transport config', () => {
  it('surfaces metronome config from the engine and updates it through the hook', () => {
    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(hookValue?.audioConfig.metronomeEnabled).toBe(false);

    act(() => {
      hookValue?.setMetronomeEnabled(true);
    });

    expect(setMetronomeEnabledMock).toHaveBeenCalledWith(true);
    expect(hookValue?.audioConfig.metronomeEnabled).toBe(true);
  });

  it('surfaces loop config from the engine and updates it through the hook', () => {
    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(hookValue?.audioConfig.loopEnabled).toBe(false);

    act(() => {
      hookValue?.setLoopEnabled(true);
    });

    expect(setLoopEnabledMock).toHaveBeenCalledWith(true);
    expect(hookValue?.audioConfig.loopEnabled).toBe(true);
  });

  it('syncs stem mixer changes through the engine without reloading the arrangement', async () => {
    engineState.isInitialized = true;

    useProjectStore.setState({
      project: makeProject(),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [],
      chatMessages: [],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadArrangementMock).toHaveBeenCalledTimes(1);

    loadArrangementMock.mockClear();
    setVolumeMock.mockClear();
    setPanMock.mockClear();
    setMuteMock.mockClear();
    setSoloMock.mockClear();

    act(() => {
      useProjectStore.setState({
        stems: [makeStem({ volume: 0.5, pan: -0.25, isMuted: true, isSolo: true })],
      });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadArrangementMock).not.toHaveBeenCalled();
    expect(setVolumeMock).toHaveBeenCalledWith('piano', 0.5);
    expect(setPanMock).toHaveBeenCalledWith('piano', -0.25);
    expect(setMuteMock).toHaveBeenCalledWith('piano', true);
    expect(setSoloMock).toHaveBeenCalledWith('piano', true);
  });

  it('marks playback ready after arrangement audio loads and reuses that loaded arrangement on play', async () => {
    engineState.isInitialized = true;
    loadArrangementMock.mockImplementation(async () => {
      engineState.transportState = {
        ...engineState.transportState,
        totalSeconds: 64,
      };
    });

    useProjectStore.setState({
      project: makeProject(),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [],
      chatMessages: [],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadArrangementMock).toHaveBeenCalledTimes(1);
    expect(hookValue?.playbackReadiness).toBe('ready');
    expect(hookValue?.playbackTruth.summary).toBe('Ready');

    loadArrangementMock.mockClear();

    await act(async () => {
      await hookValue?.play();
    });

    expect(loadArrangementMock).not.toHaveBeenCalled();
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces arrangement load failures with the real sampler error', async () => {
    engineState.isInitialized = true;
    loadArrangementMock.mockRejectedValueOnce(new Error('Salamander drum samples missing'));

    useProjectStore.setState({
      project: makeProject(),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [],
      chatMessages: [],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(useUiStore.getState().systemStatus).toBe('error');
    expect(useUiStore.getState().errorMessage).toBe('Salamander drum samples missing');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to load arrangement samples:',
      expect.any(Error)
    );
  });

  it('marks playback unavailable after arrangement audio fails to load', async () => {
    engineState.isInitialized = true;
    loadArrangementMock.mockRejectedValueOnce(new Error('Piano samples unavailable'));

    useProjectStore.setState({
      project: makeProject(),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [],
      chatMessages: [],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(hookValue?.playbackReadiness).toBe('unavailable');
    expect(hookValue?.playbackTruth.detail).toContain('Piano samples unavailable');
  });

  it('surfaces the next playback step before arrangement audio has been loaded', () => {
    useProjectStore.setState({
      project: makeProject(),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [],
      chatMessages: [],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(hookValue?.playbackReadiness).toBe('loading');
    expect(hookValue?.isLoadingAudio).toBe(false);
    expect(hookValue?.playbackTruth.reason).toBe('awaiting-user-play');
    expect(hookValue?.playbackTruth.summary).toBe('Load to play');
    expect(hookValue?.playbackTruth.nextStep).toBe('Press play to load arrangement audio.');
  });

  it('surfaces hot-swap failures instead of only logging them', async () => {
    engineState.isInitialized = true;

    useProjectStore.setState({
      project: makeProject(),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [],
      chatMessages: [],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadArrangementMock).toHaveBeenCalledTimes(1);

    loadArrangementMock.mockClear();
    hotSwapInstrumentMock.mockImplementation(() => {
      throw new Error('Piano sampler hot-swap failed');
    });

    act(() => {
      useProjectStore.setState({
        allInstrumentsUpdate: true,
      });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(useProjectStore.getState().allInstrumentsUpdate).toBe(false);
    expect(useUiStore.getState().systemStatus).toBe('error');
    expect(useUiStore.getState().errorMessage).toBe('Piano sampler hot-swap failed');
    expect(loadArrangementMock).not.toHaveBeenCalled();
  });

  it('captures play-triggered arrangement load failures and prevents playback', async () => {
    initMock.mockImplementationOnce(async () => undefined);
    loadArrangementMock.mockRejectedValueOnce(new Error('Piano samples unavailable'));

    useProjectStore.setState({
      project: makeProject(),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [],
      chatMessages: [],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await hookValue?.play();
    });

    expect(playMock).not.toHaveBeenCalled();
    expect(useUiStore.getState().systemStatus).toBe('error');
    expect(useUiStore.getState().errorMessage).toBe('Piano samples unavailable');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to start audio playback:',
      expect.any(Error)
    );
  });

  it('marks the UI as loading while play bootstraps arrangement audio', async () => {
    let resolveLoad: (() => void) | null = null;
    loadArrangementMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveLoad = resolve;
        })
    );

    useProjectStore.setState({
      project: makeProject(),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [],
      chatMessages: [],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      const playPromise = hookValue?.play();
      await Promise.resolve();
      await Promise.resolve();
      expect(useUiStore.getState().systemStatus).toBe('loading-samples');
      resolveLoad?.();
      await playPromise;
    });

    expect(playMock).toHaveBeenCalledTimes(1);
    expect(useUiStore.getState().systemStatus).toBe('ready');
  });
});
