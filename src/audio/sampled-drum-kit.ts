// sampled-drum-kit.ts — Sample-based drum kit using Salamander Drumkit OGG files.
// Implements DrumKitLike with velocity layers (med/hard) and 5-voice round-robin.
// Salamander Drumkit by Alexander Holm — CC BY-SA 3.0.

import * as Tone from 'tone';
import type { DrumKitLike } from './drum-kit';
import { NOTE_MAP } from './drum-kit';

const SAMPLE_BASE_URL = '/samples/drums/salamander';

// Voices that have unique sample sets (10 sample-voices)
const SAMPLE_VOICES = [
  'kick',
  'snare',
  'hihat-closed',
  'hihat-open',
  'ride',
  'ride-bell',
  'crash',
  'sidestick',
  'tom-hi',
  'tom-lo',
] as const;

type SampleVoice = (typeof SAMPLE_VOICES)[number];

const LAYERS = ['med', 'hard'] as const;
const RR_COUNT = 5;
// Velocity threshold: >= 96/127 = hard, < 96/127 = med (0-1 Tone.js scale)

// Map from drum-kit voice names (used in NOTE_MAP) to sample voice names
const VOICE_TO_SAMPLE: Record<string, SampleVoice> = {
  kick: 'kick',
  snare: 'snare',
  closedHiHat: 'hihat-closed',
  openHiHat: 'hihat-open',
  pedalHiHat: 'hihat-closed', // shared with closedHiHat
  ride: 'ride',
  rideBell: 'ride-bell',
  crash: 'crash',
  sideStick: 'sidestick',
  highTom: 'tom-hi',
  lowTom: 'tom-lo',
  lowFloorTom: 'tom-lo', // shared with lowTom
};

// Voice groups for sub-mix (same groups as synth DrumKit)
const VOICE_GROUPS = [
  { name: 'kick', label: 'Kick', voices: ['kick'] },
  { name: 'snare', label: 'Snare', voices: ['snare', 'sideStick'] },
  {
    name: 'hihat',
    label: 'Hi-Hat',
    voices: ['closedHiHat', 'openHiHat', 'pedalHiHat'],
  },
  { name: 'cymbals', label: 'Cymbals', voices: ['ride', 'rideBell', 'crash'] },
  {
    name: 'toms',
    label: 'Toms',
    voices: ['highTom', 'lowTom', 'lowFloorTom'],
  },
];

// Hi-hat choke: these voices stop any ringing openHiHat
const HIHAT_CHOKE_TRIGGERS = new Set(['closedHiHat', 'pedalHiHat']);

/**
 * Sample-based drum kit using Salamander Drumkit OGG files.
 * Implements DrumKitLike for drop-in replacement of the synth DrumKit.
 */
export class SampledDrumKit implements DrumKitLike {
  private players: Map<string, Tone.Player> = new Map();
  // key = "{sampleVoice}-{layer}-{n}" e.g. "kick-med-1"

  private groupGains: Map<string, Tone.Gain> = new Map();
  // One gain per voice group (kick, snare, hihat, cymbals, toms)

  private outputGain: Tone.Gain;
  // Master output before connect()

  private rrCounters: Map<string, number> = new Map();
  // Round-robin counter per "{sampleVoice}-{layer}"

  private loaded = false;
  private disposed = false;

  constructor() {
    this.outputGain = new Tone.Gain(1);

    // Create group gains → connect to outputGain
    for (const group of VOICE_GROUPS) {
      const groupGain = new Tone.Gain(1).connect(this.outputGain);
      this.groupGains.set(group.name, groupGain);
    }
  }

  async load(): Promise<void> {
    for (const sampleVoice of SAMPLE_VOICES) {
      // Determine which group gain this sample voice routes to
      const groupGain = this.getGroupGainForSampleVoice(sampleVoice);

      for (const layer of LAYERS) {
        for (let n = 1; n <= RR_COUNT; n++) {
          const playerKey = `${sampleVoice}-${layer}-${n}`;
          const url = `${SAMPLE_BASE_URL}/${sampleVoice}-${layer}-${n}.ogg`;

          const player = new Tone.Player(url);
          player.connect(groupGain);
          this.players.set(playerKey, player);
        }
      }
    }

    // Wait for all buffers to finish loading via Tone's global promise
    await Tone.loaded();
    this.resetRoundRobin();
    this.loaded = true;
  }

  triggerAttackRelease(
    note: string,
    _duration: number | string,
    time?: number,
    velocity?: number
  ): void {
    if (!this.loaded || this.disposed) return;

    const voiceName = NOTE_MAP[note];
    if (!voiceName) return;

    const sampleVoice = VOICE_TO_SAMPLE[voiceName];
    if (!sampleVoice) return;

    // Hi-hat choke: if this is a closedHiHat or pedalHiHat, stop openHiHat
    if (HIHAT_CHOKE_TRIGGERS.has(voiceName)) {
      this.stopVoice('hihat-open');
    }

    // Select velocity layer
    // NOTE_MAP velocities come from the MIDI generator as 0-1 range (Tone.js convention)
    // but the spec threshold is 96 on 0-127 scale.
    // Engine passes velocity in 0-1 range, so convert: 96/127 ≈ 0.756
    const vel = velocity ?? 0.8;
    const layer = vel >= 96 / 127 ? 'hard' : 'med';

    // Advance round-robin counter
    const rrKey = `${sampleVoice}-${layer}`;
    const currentRR = (this.rrCounters.get(rrKey) ?? 0) % RR_COUNT;
    this.rrCounters.set(rrKey, currentRR + 1);

    // Get player and trigger
    const playerKey = `${sampleVoice}-${layer}-${currentRR + 1}`;
    const player = this.players.get(playerKey);
    if (player?.loaded) {
      const t = time ?? Tone.now();
      // Adjust volume by velocity for dynamics
      player.volume.value = Tone.gainToDb(Math.max(0.1, vel));
      // Stop if already playing (for repeated hits)
      try {
        player.stop(t);
      } catch {
        // Ignore stop errors (player may not be started)
      }
      player.start(t);
    }
  }

  releaseAll(): void {
    this.players.forEach((p) => {
      try {
        p.stop();
      } catch {
        // Ignore
      }
    });
  }

  connect(destination: Tone.InputNode): this {
    this.outputGain.connect(destination);
    return this;
  }

  disconnect(): this {
    this.outputGain.disconnect();
    return this;
  }

  setVoiceGroupGain(groupName: string, value: number): void {
    const groupGain = this.groupGains.get(groupName);
    if (groupGain) groupGain.gain.value = value;
  }

  getVoiceGroupGain(groupName: string): number {
    const groupGain = this.groupGains.get(groupName);
    if (groupGain) return groupGain.gain.value;
    return 1;
  }

  getVoiceGroups(): { name: string; label: string; voices: string[] }[] {
    return VOICE_GROUPS;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.players.forEach((p) => p.dispose());
    this.groupGains.forEach((g) => g.dispose());
    this.outputGain.dispose();
    this.players.clear();
    this.groupGains.clear();
    this.rrCounters.clear();
  }

  /** Reset all round-robin counters (call on arrangement reload) */
  resetRoundRobin(): void {
    this.rrCounters.clear();
  }

  /**
   * Find the group gain node for a given sample voice name.
   * Maps sample voice names back to voice group names via VOICE_TO_SAMPLE.
   */
  private getGroupGainForSampleVoice(sampleVoice: SampleVoice): Tone.Gain {
    // Find which group contains a voice that maps to this sample voice
    for (const group of VOICE_GROUPS) {
      for (const voiceName of group.voices) {
        if (VOICE_TO_SAMPLE[voiceName] === sampleVoice) {
          const gain = this.groupGains.get(group.name);
          if (gain) return gain;
        }
      }
    }
    // Fallback to output gain (should never happen with correct config)
    return this.outputGain;
  }

  private stopVoice(sampleVoice: SampleVoice): void {
    // Stop all players for this sample voice (both layers, all RR)
    for (const layer of LAYERS) {
      for (let n = 1; n <= RR_COUNT; n++) {
        const key = `${sampleVoice}-${layer}-${n}`;
        const player = this.players.get(key);
        try {
          player?.stop();
        } catch {
          // Ignore
        }
      }
    }
  }
}
