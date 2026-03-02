// instruments.ts — Tone.js instrument factory for MVP.
// Uses Tone.js built-in synths (SoundFont samples are post-MVP).

import * as Tone from 'tone';
import type { InstrumentType } from '@/types';

type AnyInstrument =
  | Tone.MembraneSynth
  | Tone.NoiseSynth
  | Tone.MonoSynth
  | Tone.PolySynth
  | Tone.PluckSynth;

/** Create a Tone.js instrument appropriate for the given instrument type. */
export function createInstrument(type: InstrumentType): AnyInstrument {
  switch (type) {
    case 'drums':
      return new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 6,
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
      });

    case 'bass':
      return new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.9, release: 0.3 },
        filterEnvelope: {
          attack: 0.02,
          decay: 0.1,
          sustain: 0.9,
          release: 0.3,
          baseFrequency: 200,
          octaves: 2.5,
        },
      });

    case 'piano':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 1.5, sustain: 0.5, release: 1 },
      });

    case 'guitar':
      return new Tone.PluckSynth({
        attackNoise: 1,
        dampening: 4000,
        resonance: 0.98,
      });

    case 'strings':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.5, decay: 0.1, sustain: 0.9, release: 1.5 },
      });
  }
}
