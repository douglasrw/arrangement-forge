// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TransportBar } from './TransportBar';
import { useProjectStore } from '@/store/project-store';
import type { AudioEngineConfig, Project, Section, TransportState } from '@/types';

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
}));

vi.mock('@/hooks/useAudio', () => ({
  useAudio: () => ({
    transportState: useAudioState.transportState,
    audioConfig: useAudioState.audioConfig,
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

    expect(loopButton?.getAttribute('aria-pressed')).toBe('true');
    expect(metronomeButton?.getAttribute('aria-pressed')).toBe('true');
    expect(mounted.container.textContent).toContain('Bar 3');
    expect(mounted.container.textContent).toContain('0:24 / 1:36');
  });

  it('forwards loop and metronome toggles into the audio hook', () => {
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
});
