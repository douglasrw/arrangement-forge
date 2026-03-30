import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Block, Section, Stem } from '@/types';

const toneState = vi.hoisted(() => {
  let eventId = 0;

  class MockGain {
    gain: {
      value: number;
      cancelScheduledValues: ReturnType<typeof vi.fn>;
      setValueAtTime: ReturnType<typeof vi.fn>;
    };

    constructor(value = 1) {
      this.gain = {
        value,
        cancelScheduledValues: vi.fn(),
        setValueAtTime: vi.fn(),
      };
    }

    connect = vi.fn();

    disconnect = vi.fn();

    dispose = vi.fn();

    toDestination() {
      return this;
    }
  }

  class MockPanner {
    pan: { value: number };

    constructor(value = 0) {
      this.pan = { value };
    }

    connect = vi.fn();

    disconnect = vi.fn();

    dispose = vi.fn();
  }

  class MockMetalSynth {
    volume = { value: 0 };

    triggerAttackRelease = vi.fn();

    dispose = vi.fn();

    toDestination() {
      return this;
    }
  }

  class MockSampler {
    connect = vi.fn();

    disconnect = vi.fn();

    releaseAll = vi.fn();

    triggerAttackRelease = vi.fn();

    constructor(options: {
      onload?: () => void;
      onerror?: (error: Error) => void;
    }) {
      pendingSamplerLoads.push(options);
    }
  }

  const pendingSamplerLoads: Array<{
    onload?: () => void;
    onerror?: (error: Error) => void;
  }> = [];

  return {
    MockGain,
    MockMetalSynth,
    MockPanner,
    MockSampler,
    pendingSamplerLoads,
    transport: {
      state: 'stopped',
      seconds: 0,
      position: 0,
      ticks: 0,
      PPQ: 192,
      timeSignature: 4,
      loop: false,
      loopStart: 0,
      loopEnd: 0,
      bpm: { value: 120 },
      start: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      cancel: vi.fn(),
      clear: vi.fn(),
      schedule: vi.fn(() => {
        eventId += 1;
        return eventId;
      }),
    },
  };
});

const startMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('tone', () => ({
  default: {},
  start: startMock,
  now: vi.fn(() => 0),
  Gain: toneState.MockGain,
  MetalSynth: toneState.MockMetalSynth,
  Panner: toneState.MockPanner,
  Sampler: toneState.MockSampler,
  getTransport: vi.fn(() => toneState.transport),
}));

import { AudioEngine } from './engine';

function makeStem(partial: Partial<Stem> = {}): Stem {
  return {
    id: 'stem-piano',
    projectId: 'project-1',
    instrument: 'piano',
    sortOrder: 0,
    volume: 0.8,
    pan: 0,
    isMuted: false,
    isSolo: false,
    createdAt: '2026-03-30T00:00:00Z',
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

function makeBlock(partial: Partial<Block> = {}): Block {
  return {
    id: 'block-1',
    stemId: 'stem-piano',
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
    createdAt: '2026-03-30T00:00:00Z',
    ...partial,
  };
}

beforeEach(() => {
  startMock.mockClear();
  toneState.pendingSamplerLoads.length = 0;
  toneState.transport.state = 'stopped';
  toneState.transport.seconds = 0;
  toneState.transport.position = 0;
  toneState.transport.ticks = 0;
  toneState.transport.PPQ = 192;
  toneState.transport.timeSignature = 4;
  toneState.transport.loop = false;
  toneState.transport.loopStart = 0;
  toneState.transport.loopEnd = 0;
  toneState.transport.bpm.value = 120;
  toneState.transport.start.mockClear();
  toneState.transport.stop.mockClear();
  toneState.transport.pause.mockClear();
  toneState.transport.cancel.mockClear();
  toneState.transport.clear.mockClear();
  toneState.transport.schedule.mockClear();
});

describe('AudioEngine loadArrangement', () => {
  it('reuses one in-flight load promise so concurrent callers share the same failure state', async () => {
    const engine = new AudioEngine();
    await engine.init();

    const stems = [makeStem()];
    const sections = [makeSection()];
    const blocks = [makeBlock()];

    const firstLoad = engine.loadArrangement(blocks, stems, sections, '4/4');
    const secondLoad = engine.loadArrangement(blocks, stems, sections, '4/4');

    expect(secondLoad).toBe(firstLoad);
    expect(toneState.pendingSamplerLoads).toHaveLength(1);
    expect(engine.getReadinessSnapshot().isLoading).toBe(true);

    toneState.pendingSamplerLoads[0]?.onerror?.(new Error('Salamander drum samples missing'));

    await expect(firstLoad).rejects.toThrow('Salamander drum samples missing');
    await expect(secondLoad).rejects.toThrow('Salamander drum samples missing');
    expect(engine.getReadinessSnapshot()).toEqual({
      isInitialized: true,
      isLoading: false,
      failureStage: 'load-arrangement',
      failureMessage: 'Salamander drum samples missing',
    });
  });
});
