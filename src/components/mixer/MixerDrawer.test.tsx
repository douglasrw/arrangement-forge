// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MixerDrawer } from './MixerDrawer';
import type { DrumKitLike } from '@/audio/drum-kit';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import type { AudioEngineConfig, Project, Stem, TransportState } from '@/types';

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
  engine: {
    getDrumKit: () => null,
  },
}));

const setMasterVolumeMock = vi.hoisted(() => vi.fn((volume: number) => {
  useAudioState.audioConfig.masterVolume = volume;
}));

vi.mock('@/hooks/useAudio', () => ({
  useAudio: () => ({
    engine: useAudioState.engine,
    transportState: useAudioState.transportState,
    audioConfig: useAudioState.audioConfig,
    setMasterVolume: setMasterVolumeMock,
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
    id: 'st-1',
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

function renderMixer() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<MixerDrawer />);
  });

  return { container, root };
}

function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement | null {
  return Array.from(container.querySelectorAll('button')).find(
    (button): button is HTMLButtonElement => button.textContent?.includes(text) ?? false
  ) ?? null;
}

function makeDrumKit(overrides: Partial<DrumKitLike> = {}): DrumKitLike {
  const drumKit: DrumKitLike = {
    triggerAttackRelease: () => undefined,
    connect: () => drumKit,
    disconnect: () => drumKit,
    releaseAll: () => undefined,
    dispose: () => undefined,
    getVoiceGroups: () => [],
    getVoiceGroupGain: () => 1,
    setVoiceGroupGain: () => undefined,
    ...overrides,
  };

  return drumKit;
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  setMasterVolumeMock.mockClear();

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
    masterVolume: 0.75,
    loopEnabled: false,
    loopStartBar: 1,
    loopEndBar: 4,
  };
  useAudioState.engine = {
    getDrumKit: () => null,
  };

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

  useUiStore.setState({
    generationState: 'idle',
    systemStatus: 'ready',
    errorMessage: null,
    mixerExpanded: true,
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

describe('MixerDrawer', () => {
  it('reflects persisted stem state and disables unavailable channels', () => {
    useProjectStore.setState({
      stems: [
        makeStem({ id: 'st-drums', instrument: 'drums', sortOrder: 0 }),
        makeStem({
          id: 'st-piano',
          instrument: 'piano',
          sortOrder: 1,
          volume: 0.5,
          pan: -0.4,
          isMuted: true,
        }),
      ],
    });

    const mounted = renderMixer();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const pianoMuteButton = mounted.container.querySelector(
      'button[aria-label="Toggle PIANO mute"]'
    ) as HTMLButtonElement | null;
    const pianoSlider = mounted.container.querySelector(
      '[aria-label="PIANO volume fader"]'
    ) as HTMLDivElement | null;
    const pianoPan = mounted.container.querySelector(
      'input[aria-label="PIANO pan"]'
    ) as HTMLInputElement | null;
    const pianoPanValue = mounted.container.querySelector(
      '[aria-label="PIANO pan value"]'
    ) as HTMLSpanElement | null;
    const pianoPanReset = mounted.container.querySelector(
      'button[aria-label="Center PIANO pan"]'
    ) as HTMLButtonElement | null;
    const stringsMuteButton = mounted.container.querySelector(
      'button[aria-label="Toggle STRINGS mute"]'
    ) as HTMLButtonElement | null;
    const stringsSlider = mounted.container.querySelector(
      '[aria-label="STRINGS volume fader"]'
    ) as HTMLDivElement | null;
    const stringsPan = mounted.container.querySelector(
      'input[aria-label="STRINGS pan"]'
    ) as HTMLInputElement | null;
    const stringsPanValue = mounted.container.querySelector(
      '[aria-label="STRINGS pan value"]'
    ) as HTMLSpanElement | null;
    const stringsPanReset = mounted.container.querySelector(
      'button[aria-label="Center STRINGS pan"]'
    ) as HTMLButtonElement | null;
    const masterSlider = mounted.container.querySelector(
      '[aria-label="Master volume fader"]'
    ) as HTMLDivElement | null;

    expect(pianoMuteButton?.getAttribute('aria-pressed')).toBe('true');
    expect(pianoSlider?.getAttribute('aria-valuenow')).toBe('40');
    expect(pianoPan?.value).toBe('-40');
    expect(pianoPanValue?.textContent).toBe('L40');
    expect(pianoPanReset?.disabled).toBe(false);
    expect(stringsMuteButton?.disabled).toBe(true);
    expect(stringsSlider?.getAttribute('aria-disabled')).toBe('true');
    expect(stringsPan?.disabled).toBe(true);
    expect(stringsPanValue?.textContent).toBe('--');
    expect(stringsPanReset?.disabled).toBe(true);
    expect(masterSlider?.getAttribute('aria-valuenow')).toBe('60');
  });

  it('writes mixer changes back to stem state, including pan reset truth, and master volume', () => {
    useProjectStore.setState({
      stems: [makeStem({ id: 'st-piano', instrument: 'piano', volume: 0.5 })],
    });

    const mounted = renderMixer();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const pianoMuteButton = mounted.container.querySelector(
      'button[aria-label="Toggle PIANO mute"]'
    ) as HTMLButtonElement | null;
    const pianoSlider = mounted.container.querySelector(
      '[aria-label="PIANO volume fader"]'
    ) as HTMLDivElement | null;
    const pianoPan = mounted.container.querySelector(
      'input[aria-label="PIANO pan"]'
    ) as HTMLInputElement | null;
    const pianoPanValue = mounted.container.querySelector(
      '[aria-label="PIANO pan value"]'
    ) as HTMLSpanElement | null;
    const pianoPanReset = mounted.container.querySelector(
      'button[aria-label="Center PIANO pan"]'
    ) as HTMLButtonElement | null;
    const masterSlider = mounted.container.querySelector(
      '[aria-label="Master volume fader"]'
    ) as HTMLDivElement | null;

    act(() => {
      pianoMuteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      pianoSlider?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      if (pianoPan) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(pianoPan, '25');
        pianoPan.dispatchEvent(new Event('input', { bubbles: true }));
        pianoPan.dispatchEvent(new Event('change', { bubbles: true }));
      }
      masterSlider?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    });

    expect(pianoPanValue?.textContent).toBe('R25');
    expect(pianoPanReset?.disabled).toBe(false);

    act(() => {
      pianoPanReset?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const pianoStem = useProjectStore.getState().stems.find((stem) => stem.instrument === 'piano');

    expect(pianoStem?.isMuted).toBe(true);
    expect(pianoStem?.volume).toBeCloseTo(42 / 80);
    expect(pianoStem?.pan).toBe(0);
    expect(pianoPanValue?.textContent).toBe('C');
    expect(pianoPanReset?.disabled).toBe(true);
    expect(setMasterVolumeMock).toHaveBeenCalledTimes(1);
    expect(setMasterVolumeMock.mock.calls[0]?.[0]).toBeCloseTo(62 / 80);
  });

  it('surfaces audio load failures in the mixer itself', () => {
    useUiStore.setState({
      systemStatus: 'error',
      errorMessage: 'Salamander drum samples missing',
    });

    const mounted = renderMixer();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.textContent).toContain('Audio unavailable: Salamander drum samples missing');
  });

  it('hydrates drum sub-mix controls from the live drum kit and writes normalized gains back', () => {
    const setVoiceGroupGain = vi.fn();
    const getVoiceGroupGain = vi.fn((groupName: string) => {
      if (groupName === 'kick') return 1.4;
      if (groupName === 'snare') return 0.6;
      return 1;
    });

    useAudioState.engine = {
      getDrumKit: () =>
        makeDrumKit({
          getVoiceGroupGain,
          setVoiceGroupGain,
        }),
    };

    useProjectStore.setState({
      stems: [makeStem({ id: 'st-drums', instrument: 'drums', sortOrder: 0 })],
    });

    const mounted = renderMixer();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const drumButton = findButtonByText(mounted.container, 'DRUMS');

    act(() => {
      drumButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const kickSlider = mounted.container.querySelector('#drum-sub-kick') as HTMLInputElement | null;
    const snareSlider = mounted.container.querySelector('#drum-sub-snare') as HTMLInputElement | null;

    expect(kickSlider?.value).toBe('70');
    expect(snareSlider?.value).toBe('30');

    act(() => {
      if (!kickSlider) return;
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      )?.set;
      valueSetter?.call(kickSlider, '65');
      kickSlider.dispatchEvent(new Event('input', { bubbles: true }));
      kickSlider.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(setVoiceGroupGain).toHaveBeenCalledWith('kick', 1.3);
    expect(kickSlider?.value).toBe('65');
  });

  it('shows the drum sub-mix unavailable state until the drum kit is loaded', () => {
    useProjectStore.setState({
      stems: [makeStem({ id: 'st-drums', instrument: 'drums', sortOrder: 0 })],
    });

    const mounted = renderMixer();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const drumButton = findButtonByText(mounted.container, 'DRUMS');

    act(() => {
      drumButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mounted.container.textContent).toContain('Drum kit unavailable until samples load.');
    expect((mounted.container.querySelector('#drum-sub-kick') as HTMLInputElement | null)?.disabled).toBe(true);
  });
});
