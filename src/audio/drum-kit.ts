// drum-kit.ts — DrumKitLike interface and GM drum note map.
// The interface is implemented by SampledDrumKit (sampled-drum-kit.ts).

import * as Tone from 'tone';

/**
 * Interface for drum kit implementations, matching the subset of Tone.Sampler
 * methods that engine.ts actually uses for scheduling and signal routing.
 */
export interface DrumKitLike {
  triggerAttackRelease(
    note: string,
    duration: number | string,
    time?: number,
    velocity?: number
  ): void;
  connect(destination: Tone.InputNode): this;
  disconnect(): this;
  releaseAll(): void;
  dispose(): void;
  getVoiceGroups(): { name: string; label: string; voices: string[] }[];
  getVoiceGroupGain(groupName: string): number;
  setVoiceGroupGain(groupName: string, value: number): void;
}

// GM Drum Note Map (Tone.js note names)
export const NOTE_MAP: Record<string, string> = {
  C2: 'kick',
  'C#2': 'sideStick',
  D2: 'snare',
  F2: 'lowFloorTom',
  'F#2': 'closedHiHat',
  'G#2': 'pedalHiHat',
  A2: 'lowTom',
  'A#2': 'openHiHat',
  'C#3': 'crash',
  D3: 'highTom',
  'D#3': 'ride',
  F3: 'rideBell',
};
