// @vitest-environment jsdom

import { act } from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import type { AudioEngineConfig, TransportState } from '@/types';

const engineState = vi.hoisted(() => ({
  isInitialized: false,
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
const setMetronomeEnabledMock = vi.hoisted(() => vi.fn((enabled: boolean) => {
  engineState.audioConfig.metronomeEnabled = enabled;
}));
const setLoopEnabledMock = vi.hoisted(() => vi.fn((enabled: boolean) => {
  engineState.audioConfig.loopEnabled = enabled;
}));
const playMock = vi.hoisted(() => vi.fn());
const pauseMock = vi.hoisted(() => vi.fn());
const stopMock = vi.hoisted(() => vi.fn());
const seekMock = vi.hoisted(() => vi.fn());
const seekToSecondsMock = vi.hoisted(() => vi.fn());
const setTempoMock = vi.hoisted(() => vi.fn());
const hotSwapInstrumentMock = vi.hoisted(() => vi.fn());
const AudioEngineMock = vi.hoisted(() => vi.fn(() => ({
  get isInitialized() {
    return engineState.isInitialized;
  },
  init: initMock,
  loadArrangement: loadArrangementMock,
  getTransportState: getTransportStateMock,
  getAudioConfig: getAudioConfigMock,
  setMetronomeEnabled: setMetronomeEnabledMock,
  setLoopEnabled: setLoopEnabledMock,
  play: playMock,
  pause: pauseMock,
  stop: stopMock,
  seek: seekMock,
  seekToSeconds: seekToSecondsMock,
  setTempo: setTempoMock,
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
  engineState.isInitialized = false;
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
  setMetronomeEnabledMock.mockClear();
  setLoopEnabledMock.mockClear();
  playMock.mockClear();
  pauseMock.mockClear();
  stopMock.mockClear();
  seekMock.mockClear();
  seekToSecondsMock.mockClear();
  setTempoMock.mockClear();
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
});
