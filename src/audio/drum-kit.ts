// drum-kit.ts — Synthesized drum kit using Tone.js synths.
// 11 voices: kick, snare, side stick, closed HH, open HH, pedal HH,
// ride cymbal, ride bell, crash cymbal, high tom, low tom.
// No network requests — all sounds are synthesized.

import * as Tone from 'tone';

/**
 * Interface that DrumKit implements, matching the subset of Tone.Sampler
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

// Voice type flag so we know how to call triggerAttackRelease
type VoiceType = 'membrane' | 'noise' | 'metal';

interface VoiceEntry {
  type: VoiceType;
  synth: Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth;
  gain: Tone.Gain;
  triggerNote?: string; // MembraneSynth: pitch note, MetalSynth: base frequency
  filter?: Tone.Filter; // Optional filter (e.g., side stick bandpass)
}

// Layered voice: snare uses both a NoiseSynth and a MembraneSynth
interface LayeredVoiceEntry {
  type: 'layered';
  voices: VoiceEntry[];
  gain: Tone.Gain;
}

type DrumVoice = VoiceEntry | LayeredVoiceEntry;

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

function createMetalSynth(
  freq: number,
  opts: Partial<{
    harmonicity: number;
    modulationIndex: number;
    resonance: number;
    octaves: number;
    envelope: { attack: number; decay: number; release: number };
  }>
): Tone.MetalSynth {
  const synth = new Tone.MetalSynth({
    envelope: opts.envelope,
    harmonicity: opts.harmonicity,
    modulationIndex: opts.modulationIndex,
    resonance: opts.resonance,
    octaves: opts.octaves,
  });
  synth.frequency.value = freq;
  return synth;
}

function createVoices(outputGain: Tone.Gain): Map<string, DrumVoice> {
  const voices = new Map<string, DrumVoice>();

  // --- KICK (C2) --- MembraneSynth
  const kickGain = new Tone.Gain(1).connect(outputGain);
  const kickSynth = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 10,
    oscillator: { type: 'sine' },
    envelope: {
      attack: 0.001,
      decay: 0.4,
      sustain: 0.01,
      release: 1.4,
    },
  }).connect(kickGain);
  voices.set('kick', {
    type: 'membrane',
    synth: kickSynth,
    gain: kickGain,
    triggerNote: 'C1',
  });

  // --- SNARE (D2) --- Layered: NoiseSynth (wire snap) + MembraneSynth (body)
  const snareGain = new Tone.Gain(1).connect(outputGain);

  const snareNoiseSynth = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: {
      attack: 0.001,
      decay: 0.13,
      sustain: 0,
      release: 0.03,
    },
  });
  const snareNoiseGain = new Tone.Gain(1).connect(snareGain);
  snareNoiseSynth.connect(snareNoiseGain);

  const snareBodySynth = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 4,
    oscillator: { type: 'triangle' },
    envelope: {
      attack: 0.001,
      decay: 0.1,
      sustain: 0,
      release: 0.1,
    },
  });
  const snareBodyGain = new Tone.Gain(1).connect(snareGain);
  snareBodySynth.connect(snareBodyGain);

  voices.set('snare', {
    type: 'layered',
    voices: [
      { type: 'noise', synth: snareNoiseSynth, gain: snareNoiseGain },
      { type: 'membrane', synth: snareBodySynth, gain: snareBodyGain, triggerNote: 'E3' },
    ],
    gain: snareGain,
  });

  // --- SIDE STICK (C#2) --- NoiseSynth with bandpass filter
  // Cross-stick / rim click: needs enough presence to cut through a mix
  const sideStickGain = new Tone.Gain(3).connect(outputGain);
  const sideStickFilter = new Tone.Filter({
    type: 'bandpass',
    frequency: 1600,
    Q: 1.5,
  }).connect(sideStickGain);
  const sideStickSynth = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: {
      attack: 0.001,
      decay: 0.12,
      sustain: 0,
      release: 0.03,
    },
  }).connect(sideStickFilter);
  voices.set('sideStick', {
    type: 'noise',
    synth: sideStickSynth,
    gain: sideStickGain,
    filter: sideStickFilter,
  });

  // --- CLOSED HI-HAT (F#2) --- MetalSynth
  const closedHiHatGain = new Tone.Gain(3).connect(outputGain);
  const closedHiHatSynth = createMetalSynth(400, {
    envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5,
  }).connect(closedHiHatGain);
  voices.set('closedHiHat', {
    type: 'metal',
    synth: closedHiHatSynth,
    gain: closedHiHatGain,
    triggerNote: '400',
  });

  // --- OPEN HI-HAT (A#2) --- MetalSynth (longer decay)
  const openHiHatGain = new Tone.Gain(3).connect(outputGain);
  const openHiHatSynth = createMetalSynth(400, {
    envelope: { attack: 0.001, decay: 0.5, release: 0.1 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5,
  }).connect(openHiHatGain);
  voices.set('openHiHat', {
    type: 'metal',
    synth: openHiHatSynth,
    gain: openHiHatGain,
    triggerNote: '400',
  });

  // --- PEDAL HI-HAT (G#2) --- MetalSynth (very short, muted)
  const pedalHiHatGain = new Tone.Gain(2.5).connect(outputGain);
  const pedalHiHatSynth = createMetalSynth(400, {
    envelope: { attack: 0.001, decay: 0.06, release: 0.01 },
    harmonicity: 5.1,
    modulationIndex: 20,
    resonance: 3000,
    octaves: 1,
  }).connect(pedalHiHatGain);
  voices.set('pedalHiHat', {
    type: 'metal',
    synth: pedalHiHatSynth,
    gain: pedalHiHatGain,
    triggerNote: '400',
  });

  // --- RIDE CYMBAL (D#3) --- MetalSynth (long, shimmery)
  const rideGain = new Tone.Gain(2.5).connect(outputGain);
  const rideSynth = createMetalSynth(300, {
    envelope: { attack: 0.001, decay: 1.4, release: 0.2 },
    harmonicity: 12,
    modulationIndex: 20,
    resonance: 5000,
    octaves: 2,
  }).connect(rideGain);
  voices.set('ride', {
    type: 'metal',
    synth: rideSynth,
    gain: rideGain,
    triggerNote: '300',
  });

  // --- RIDE BELL (F3) --- MetalSynth (shorter, brighter)
  const rideBellGain = new Tone.Gain(2.5).connect(outputGain);
  const rideBellSynth = createMetalSynth(500, {
    envelope: { attack: 0.001, decay: 0.5, release: 0.1 },
    harmonicity: 14,
    modulationIndex: 14,
    resonance: 6000,
    octaves: 1.5,
  }).connect(rideBellGain);
  voices.set('rideBell', {
    type: 'metal',
    synth: rideBellSynth,
    gain: rideBellGain,
    triggerNote: '500',
  });

  // --- CRASH CYMBAL (C#3) --- MetalSynth (long, washy)
  const crashGain = new Tone.Gain(3).connect(outputGain);
  const crashSynth = createMetalSynth(300, {
    envelope: { attack: 0.001, decay: 1.8, release: 0.3 },
    harmonicity: 5.1,
    modulationIndex: 40,
    resonance: 4000,
    octaves: 3,
  }).connect(crashGain);
  voices.set('crash', {
    type: 'metal',
    synth: crashSynth,
    gain: crashGain,
    triggerNote: '300',
  });

  // --- HIGH TOM (D3) --- MembraneSynth
  const highTomGain = new Tone.Gain(1).connect(outputGain);
  const highTomSynth = new Tone.MembraneSynth({
    pitchDecay: 0.08,
    octaves: 6,
    oscillator: { type: 'sine' },
    envelope: {
      attack: 0.001,
      decay: 0.25,
      sustain: 0.01,
      release: 0.3,
    },
  }).connect(highTomGain);
  voices.set('highTom', {
    type: 'membrane',
    synth: highTomSynth,
    gain: highTomGain,
    triggerNote: 'A2',
  });

  // --- LOW TOM (A2 note mapping) --- MembraneSynth
  const lowTomGain = new Tone.Gain(1).connect(outputGain);
  const lowTomSynth = new Tone.MembraneSynth({
    pitchDecay: 0.08,
    octaves: 8,
    oscillator: { type: 'sine' },
    envelope: {
      attack: 0.001,
      decay: 0.35,
      sustain: 0.01,
      release: 0.4,
    },
  }).connect(lowTomGain);
  voices.set('lowTom', {
    type: 'membrane',
    synth: lowTomSynth,
    gain: lowTomGain,
    triggerNote: 'E1',
  });

  // --- LOW FLOOR TOM (F2) --- MembraneSynth, tuned between low tom and high tom
  const lowFloorTomGain = new Tone.Gain(1).connect(outputGain);
  const lowFloorTomSynth = new Tone.MembraneSynth({
    pitchDecay: 0.08,
    octaves: 8,
    oscillator: { type: 'sine' },
    envelope: {
      attack: 0.001,
      decay: 0.35,
      sustain: 0.01,
      release: 0.4,
    },
  }).connect(lowFloorTomGain);
  voices.set('lowFloorTom', {
    type: 'membrane',
    synth: lowFloorTomSynth,
    gain: lowFloorTomGain,
    triggerNote: 'D1',
  });

  return voices;
}

/**
 * Synthesized drum kit with 11+ voices.
 * Implements the same triggerAttackRelease API as Tone.Sampler
 * so engine.ts can use it identically.
 */
export class DrumKit implements DrumKitLike {
  private outputGain: Tone.Gain;
  private voices: Map<string, DrumVoice>;
  private disposed = false;

  constructor() {
    this.outputGain = new Tone.Gain(1);
    this.voices = createVoices(this.outputGain);
  }

  triggerAttackRelease(
    note: string,
    duration: number | string,
    time?: number,
    velocity?: number
  ): void {
    if (this.disposed) return;

    const voiceName = NOTE_MAP[note];
    if (!voiceName) return; // Unknown note -- silently ignore

    const voice = this.voices.get(voiceName);
    if (!voice) return;

    const vel = velocity ?? 1;
    if (vel <= 0) return; // Velocity 0 = no sound

    const dur = typeof duration === 'string' ? Tone.Time(duration).toSeconds() : duration;

    // Hi-hat choke: opening a hat chokes any ringing open hat
    if (voiceName === 'closedHiHat' || voiceName === 'openHiHat' || voiceName === 'pedalHiHat') {
      this.chokeOpenHiHat(time);
    }

    if (voice.type === 'layered') {
      this.triggerLayered(voice, dur, time, vel);
    } else {
      this.triggerSingle(voice, voiceName, dur, time, vel);
    }
  }

  connect(destination: Tone.InputNode): this {
    this.outputGain.connect(destination);
    return this;
  }

  disconnect(): this {
    this.outputGain.disconnect();
    return this;
  }

  /** Get the names of all drum voice groups for sub-mix UI */
  getVoiceGroups(): { name: string; label: string; voices: string[] }[] {
    return [
      { name: 'kick', label: 'Kick', voices: ['kick'] },
      { name: 'snare', label: 'Snare', voices: ['snare', 'sideStick'] },
      { name: 'hihat', label: 'Hi-Hat', voices: ['closedHiHat', 'openHiHat', 'pedalHiHat'] },
      { name: 'cymbals', label: 'Cymbals', voices: ['ride', 'rideBell', 'crash'] },
      { name: 'toms', label: 'Toms', voices: ['highTom', 'lowTom', 'lowFloorTom'] },
    ];
  }

  /** Get the current gain value (0-1) for a voice group */
  getVoiceGroupGain(groupName: string): number {
    const groups = this.getVoiceGroups();
    const group = groups.find((g) => g.name === groupName);
    if (!group) return 1;
    const voice = this.voices.get(group.voices[0]);
    if (!voice) return 1;
    return voice.gain.gain.value;
  }

  /** Set the gain multiplier for all voices in a group */
  setVoiceGroupGain(groupName: string, value: number): void {
    const groups = this.getVoiceGroups();
    const group = groups.find((g) => g.name === groupName);
    if (!group) return;
    for (const vName of group.voices) {
      const voice = this.voices.get(vName);
      if (voice) voice.gain.gain.value = value;
    }
  }

  releaseAll(): void {
    this.voices.forEach((voice) => {
      if (voice.type === 'layered') {
        for (const v of voice.voices) {
          try {
            if ('triggerRelease' in v.synth) {
              (v.synth as Tone.MembraneSynth).triggerRelease();
            }
          } catch {
            // Ignore
          }
        }
      } else {
        try {
          if ('triggerRelease' in voice.synth) {
            (voice.synth as Tone.MembraneSynth).triggerRelease();
          }
        } catch {
          // Ignore
        }
      }
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.voices.forEach((voice) => {
      if (voice.type === 'layered') {
        for (const v of voice.voices) {
          v.synth.dispose();
          v.gain.dispose();
          v.filter?.dispose();
        }
        voice.gain.dispose();
      } else {
        voice.synth.dispose();
        voice.gain.dispose();
        voice.filter?.dispose();
      }
    });
    this.outputGain.dispose();
    this.voices.clear();
  }

  private chokeOpenHiHat(time?: number): void {
    const openHat = this.voices.get('openHiHat');
    if (!openHat || openHat.type === 'layered') return;
    try {
      const t = time ?? Tone.now();
      (openHat.synth as Tone.MetalSynth).triggerRelease(t);
    } catch {
      // Ignore release errors
    }
  }

  private triggerSingle(
    voice: VoiceEntry,
    voiceName: string,
    duration: number,
    time: number | undefined,
    velocity: number
  ): void {
    this.applyVelocityParams(voice, voiceName, velocity);

    const t = time ?? Tone.now();

    try {
      if (voice.type === 'membrane') {
        const membSynth = voice.synth as Tone.MembraneSynth;
        membSynth.triggerAttackRelease(voice.triggerNote!, duration, t, velocity);
      } else if (voice.type === 'metal') {
        // MetalSynth extends Monophonic: triggerAttackRelease(note, duration, time, velocity)
        // Pass the configured base frequency as "note" to preserve pitch
        const metalSynth = voice.synth as Tone.MetalSynth;
        metalSynth.triggerAttackRelease(voice.triggerNote!, duration, t, velocity);
      } else {
        // NoiseSynth: triggerAttackRelease(duration, time?, velocity?)
        const noiseSynth = voice.synth as Tone.NoiseSynth;
        noiseSynth.triggerAttackRelease(duration, t, velocity);
      }
    } catch {
      // Ignore trigger errors
    }
  }

  private triggerLayered(
    voice: LayeredVoiceEntry,
    duration: number,
    time: number | undefined,
    velocity: number
  ): void {
    const t = time ?? Tone.now();

    for (const v of voice.voices) {
      // Scale noise amplitude by velocity for snare wire snap realism
      if (v.type === 'noise') {
        v.gain.gain.value = velocity;
      }

      this.applyVelocityParams(v, 'snare', velocity);

      try {
        if (v.type === 'membrane') {
          const membSynth = v.synth as Tone.MembraneSynth;
          membSynth.triggerAttackRelease(v.triggerNote!, duration, t, velocity);
        } else if (v.type === 'metal') {
          // MetalSynth extends Monophonic: (note, duration, time, velocity)
          const metalSynth = v.synth as Tone.MetalSynth;
          metalSynth.triggerAttackRelease(v.triggerNote!, duration, t, velocity);
        } else {
          const noiseSynth = v.synth as Tone.NoiseSynth;
          noiseSynth.triggerAttackRelease(duration, t, velocity);
        }
      } catch {
        // Ignore trigger errors
      }
    }
  }

  /**
   * Velocity-to-parameter mapping for realism.
   * Adjusts synth parameters based on hit velocity before triggering.
   */
  private applyVelocityParams(
    voice: VoiceEntry,
    voiceName: string,
    velocity: number
  ): void {
    try {
      switch (voiceName) {
        case 'kick': {
          const membSynth = voice.synth as Tone.MembraneSynth;
          membSynth.pitchDecay = 0.03 + velocity * 0.04;
          membSynth.octaves = 6 + velocity * 6;
          break;
        }
        case 'snare': {
          if (voice.type === 'noise') {
            voice.gain.gain.value = 0.3 + velocity * 0.7;
          } else if (voice.type === 'membrane') {
            const membSynth = voice.synth as Tone.MembraneSynth;
            membSynth.envelope.decay = 0.06 + velocity * 0.08;
          }
          break;
        }
        case 'closedHiHat':
        case 'openHiHat':
        case 'pedalHiHat': {
          const metalSynth = voice.synth as Tone.MetalSynth;
          metalSynth.resonance = 3000 + velocity * 2000;
          break;
        }
        case 'ride':
        case 'rideBell':
        case 'crash': {
          const metalSynth = voice.synth as Tone.MetalSynth;
          metalSynth.modulationIndex = 10 + velocity * 30;
          break;
        }
        case 'highTom':
        case 'lowTom':
        case 'lowFloorTom': {
          const membSynth = voice.synth as Tone.MembraneSynth;
          membSynth.pitchDecay = 0.04 + velocity * 0.08;
          membSynth.octaves = 4 + velocity * 6;
          break;
        }
      }
    } catch {
      // Ignore parameter adjustment errors
    }
  }
}
