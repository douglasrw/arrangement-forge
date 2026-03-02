// engine.ts — Core AudioEngine class.
// Signal chain: Instrument → Gain (per-stem) → Panner → Master Gain → Destination

import * as Tone from 'tone';
import type { Block, Stem, Section, InstrumentType, TransportState, CountInSetting } from '@/types';
import { TransportController } from './transport';
import { Metronome } from './metronome';
import { createInstrument } from './instruments';

type AnyInstrument = ReturnType<typeof createInstrument>;

export class AudioEngine {
  private instruments = new Map<InstrumentType, AnyInstrument>();
  private channelGains = new Map<InstrumentType, Tone.Gain>();
  private channelPanners = new Map<InstrumentType, Tone.Panner>();
  private stemMuted = new Map<InstrumentType, boolean>();
  private stemSoloed = new Map<InstrumentType, boolean>();
  private masterGain: Tone.Gain | null = null;
  private metronome: Metronome;
  private transportController: TransportController;
  private initialized = false;

  constructor() {
    this.metronome = new Metronome();
    this.transportController = new TransportController();
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    await Tone.start(); // Resume AudioContext after user gesture
    this.masterGain = new Tone.Gain(0.8).toDestination();
    this.metronome.init();
    this.initialized = true;
  }

  dispose(): void {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    this.metronome.dispose();
    this.instruments.forEach((inst) => inst.dispose());
    this.channelGains.forEach((g) => g.dispose());
    this.channelPanners.forEach((p) => p.dispose());
    this.masterGain?.dispose();
    this.instruments.clear();
    this.channelGains.clear();
    this.channelPanners.clear();
    this.initialized = false;
  }

  play(): void {
    Tone.getTransport().start();
  }

  pause(): void {
    Tone.getTransport().pause();
  }

  stop(): void {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
  }

  seek(bar: number): void {
    const seconds = this.transportController.getTimeAtBar(bar);
    Tone.getTransport().seconds = seconds;
  }

  setVolume(instrument: InstrumentType, volume: number): void {
    const gain = this.channelGains.get(instrument);
    if (gain) gain.gain.value = volume;
  }

  setPan(instrument: InstrumentType, pan: number): void {
    const panner = this.channelPanners.get(instrument);
    if (panner) panner.pan.value = pan;
  }

  setMute(instrument: InstrumentType, muted: boolean): void {
    this.stemMuted.set(instrument, muted);
    this.applyMuteState();
  }

  setSolo(instrument: InstrumentType, soloed: boolean): void {
    this.stemSoloed.set(instrument, soloed);
    this.applyMuteState();
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) this.masterGain.gain.value = volume;
  }

  setMetronomeEnabled(enabled: boolean): void {
    this.metronome.setEnabled(enabled);
  }

  setMetronomeCountIn(setting: CountInSetting): void {
    this.metronome.setCountIn(setting);
  }

  setTempo(bpm: number): void {
    this.transportController.setTempo(bpm);
  }

  loadArrangement(
    blocks: Block[],
    stems: Stem[],
    sections: Section[],
    timeSignature: string
  ): void {
    if (!this.initialized || !this.masterGain) return;

    // Parse time signature
    const [numStr] = timeSignature.split('/');
    const numerator = parseInt(numStr ?? '4', 10);
    this.transportController.setTimeSignature(numerator, 4);

    // Clear existing schedules
    Tone.getTransport().cancel();

    // Rebuild instruments for stems present in this arrangement
    this.instruments.forEach((inst) => inst.dispose());
    this.channelGains.forEach((g) => g.dispose());
    this.channelPanners.forEach((p) => p.dispose());
    this.instruments.clear();
    this.channelGains.clear();
    this.channelPanners.clear();

    for (const stem of stems) {
      const inst = createInstrument(stem.instrument);
      const gain = new Tone.Gain(stem.volume);
      const panner = new Tone.Panner(stem.pan);
      inst.connect(gain);
      gain.connect(panner);
      panner.connect(this.masterGain);
      this.instruments.set(stem.instrument, inst);
      this.channelGains.set(stem.instrument, gain);
      this.channelPanners.set(stem.instrument, panner);
      this.stemMuted.set(stem.instrument, stem.isMuted);
      this.stemSoloed.set(stem.instrument, stem.isSolo);
    }

    this.applyMuteState();

    // Schedule MIDI notes
    const tempo = Tone.getTransport().bpm.value;
    const secondsPerBeat = 60 / tempo;

    for (const block of blocks) {
      const stem = stems.find((s) => s.id === block.stemId);
      if (!stem) continue;
      const instrument = this.instruments.get(stem.instrument);
      if (!instrument) continue;

      const blockStartSeconds = this.transportController.getTimeAtBar(block.startBar);

      for (const note of block.midiData) {
        const noteTime = blockStartSeconds + note.time * secondsPerBeat;
        const noteDuration = note.duration * secondsPerBeat;
        const velocity = note.velocity / 127;

        Tone.getTransport().schedule((t) => {
          try {
            if ('triggerAttackRelease' in instrument) {
              (instrument as Tone.PolySynth | Tone.MonoSynth | Tone.MembraneSynth).triggerAttackRelease(
                note.note,
                noteDuration,
                t,
                velocity
              );
            }
          } catch {
            // Ignore scheduling errors (e.g., invalid note names for drum synths)
          }
        }, noteTime);
      }
    }

    // Set total duration loop end
    const totalBars = sections.reduce((sum, s) => sum + s.barCount, 0);
    const totalSeconds = this.transportController.getTotalDuration(totalBars);
    Tone.getTransport().loopEnd = totalSeconds;
  }

  getTransportState(): TransportState {
    const transport = Tone.getTransport();
    const stateMap: Record<string, 'stopped' | 'playing' | 'paused'> = {
      stopped: 'stopped',
      started: 'playing',
      paused: 'paused',
    };
    return {
      playbackState: stateMap[transport.state] ?? 'stopped',
      currentBar: this.transportController.getCurrentBar(),
      currentBeat: this.transportController.getCurrentBeat(),
      elapsedSeconds: transport.seconds,
      totalSeconds: typeof transport.loopEnd === 'number' ? transport.loopEnd : 0,
      isCountingIn: false,
    };
  }

  private applyMuteState(): void {
    const anysoloed = Array.from(this.stemSoloed.values()).some(Boolean);
    this.instruments.forEach((_, instrument) => {
      const gain = this.channelGains.get(instrument);
      if (!gain) return;
      const muted = this.stemMuted.get(instrument) ?? false;
      const soloed = this.stemSoloed.get(instrument) ?? false;
      if (anysoloed) {
        gain.gain.value = soloed ? gain.gain.value || 0.8 : 0;
      } else {
        gain.gain.value = muted ? 0 : gain.gain.value || 0.8;
      }
    });
  }
}
