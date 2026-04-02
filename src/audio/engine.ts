// engine.ts — Core AudioEngine class.
// Signal chain: Sampler → Gain (per-stem) → Panner → Master Gain → Destination
// Samplers are cached via sampler-cache.ts and persist across arrangement reloads.

import * as Tone from 'tone';
import type {
  AudioEngineConfig,
  AudioEngineFailureStage,
  AudioEngineReadinessSnapshot,
  AudioEngineSelectionTruth,
  Block,
  Stem,
  Section,
  InstrumentType,
  TransportState,
  CountInSetting,
} from '@/types';
import type { DrumKitLike } from '@/audio/drum-kit';
import { TransportController } from './transport';
import { Metronome } from './metronome';
import { getSampler } from './sampler-cache';

function getAudioFailureMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  return fallback;
}

export class AudioEngine {
  private instruments = new Map<InstrumentType, Tone.Sampler | DrumKitLike>();
  private channelGains = new Map<InstrumentType, Tone.Gain>();
  private channelPanners = new Map<InstrumentType, Tone.Panner>();
  private stemVolumes = new Map<InstrumentType, number>();
  private stemMuted = new Map<InstrumentType, boolean>();
  private stemSoloed = new Map<InstrumentType, boolean>();
  /** Scheduled Tone.js event IDs per instrument for selective cancellation */
  private scheduledEventIds = new Map<InstrumentType, number[]>();
  private masterGain: Tone.Gain | null = null;
  private metronome: Metronome;
  private transportController: TransportController;
  private _initialized = false;
  private _masterVolume = 0.8;
  private _isLoading = false;
  private _failureStage: AudioEngineFailureStage | null = null;
  private _failureMessage: string | null = null;
  private activeLoadPromise: Promise<void> | null = null;
  private arrangementEndEventId: number | null = null;
  private loadedInstrumentSelection: InstrumentType[] = [];
  private audioConfig: AudioEngineConfig = {
    metronomeEnabled: false,
    countIn: 'off',
    masterVolume: 0.8,
    loopEnabled: false,
    loopStartBar: 1,
    loopEndBar: 1,
  };

  get isInitialized(): boolean { return this._initialized; }
  get isLoading(): boolean { return this._isLoading; }

  constructor() {
    this.metronome = new Metronome();
    this.transportController = new TransportController();
  }

  async init(): Promise<void> {
    if (this._initialized) return;
    try {
      await Tone.start();
      this.masterGain = new Tone.Gain(this._masterVolume).toDestination();
      this.metronome.init();
      this.clearFailureState();
      this._initialized = true;
    } catch (error) {
      this.recordFailure('engine-start', error, 'The audio engine could not start.');
      throw error;
    }
  }

  dispose(): void {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    this.arrangementEndEventId = null;
    this.activeLoadPromise = null;
    this._isLoading = false;
    this.metronome.dispose();
    // Don't dispose samplers — they are cached in sampler-cache.ts
    // Just disconnect them from our signal chain
    this.instruments.forEach((inst) => inst.disconnect());
    this.channelGains.forEach((g) => g.dispose());
    this.channelPanners.forEach((p) => p.dispose());
    this.masterGain?.dispose();
    this.instruments.clear();
    this.channelGains.clear();
    this.channelPanners.clear();
    this.stemVolumes.clear();
    this.stemMuted.clear();
    this.stemSoloed.clear();
    this.loadedInstrumentSelection = [];
    this._initialized = false;
  }

  play(): void {
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(Tone.now());
      this.masterGain.gain.setValueAtTime(this._masterVolume, Tone.now());
    }
    Tone.getTransport().start();
  }

  pause(): void {
    Tone.getTransport().pause();
    this.releaseAllNotes();
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(Tone.now());
      this.masterGain.gain.setValueAtTime(0, Tone.now());
    }
  }

  stop(): void {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    this.arrangementEndEventId = null;
    Tone.getTransport().position = 0;
    this.releaseAllNotes();
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(Tone.now());
      this.masterGain.gain.setValueAtTime(0, Tone.now());
    }
  }

  seek(bar: number): void {
    const seconds = this.transportController.getTimeAtBar(bar);
    Tone.getTransport().seconds = seconds;
  }

  seekToSeconds(seconds: number): void {
    const loopEnd = Tone.getTransport().loopEnd;
    const maxSeconds = typeof loopEnd === 'number' && loopEnd > 0 ? loopEnd : seconds;
    Tone.getTransport().seconds = Math.max(0, Math.min(seconds, maxSeconds));
  }

  setVolume(instrument: InstrumentType, volume: number): void {
    this.stemVolumes.set(instrument, volume);
    this.applyMixState();
  }

  setPan(instrument: InstrumentType, pan: number): void {
    const panner = this.channelPanners.get(instrument);
    if (panner) panner.pan.value = pan;
  }

  /** Get the DrumKit instance if loaded, for sub-mix control */
  getDrumKit(): DrumKitLike | null {
    const drums = this.instruments.get('drums');
    if (drums && 'getVoiceGroups' in drums) return drums as DrumKitLike;
    return null;
  }

  setMute(instrument: InstrumentType, muted: boolean): void {
    this.stemMuted.set(instrument, muted);
    this.applyMixState();
  }

  setSolo(instrument: InstrumentType, soloed: boolean): void {
    this.stemSoloed.set(instrument, soloed);
    this.applyMixState();
  }

  setMasterVolume(volume: number): void {
    this._masterVolume = volume;
    this.audioConfig.masterVolume = volume;
    if (this.masterGain) this.masterGain.gain.value = volume;
  }

  setMetronomeEnabled(enabled: boolean): void {
    this.audioConfig.metronomeEnabled = enabled;
    this.metronome.setEnabled(enabled);
  }

  setMetronomeCountIn(setting: CountInSetting): void {
    this.audioConfig.countIn = setting;
    this.metronome.setCountIn(setting);
  }

  setLoopEnabled(enabled: boolean): void {
    this.audioConfig.loopEnabled = enabled;
    Tone.getTransport().loop = enabled;
    this.scheduleArrangementStop();
  }

  setTempo(bpm: number): void {
    this.transportController.setTempo(bpm);
  }

  getAudioConfig(): AudioEngineConfig {
    return { ...this.audioConfig };
  }

  getReadinessSnapshot(): AudioEngineReadinessSnapshot {
    return {
      isInitialized: this._initialized,
      isLoading: this._isLoading,
      failureStage: this._failureStage,
      failureMessage: this._failureMessage,
    };
  }

  getSelectionTruth(): AudioEngineSelectionTruth {
    if (this.loadedInstrumentSelection.length === 0) {
      return {
        selectedInstruments: [],
        selectionSource: 'default',
        summary: 'No instruments loaded',
        detail: 'The audio engine defaults to no loaded instruments until arrangement playback selects stems.',
      };
    }

    const instrumentList = formatInstrumentList(this.loadedInstrumentSelection);
    return {
      selectedInstruments: [...this.loadedInstrumentSelection],
      selectionSource: 'loaded',
      summary: `Loaded ${instrumentList}`,
      detail: `The audio engine has loaded ${instrumentList} from the current arrangement.`,
    };
  }

  loadArrangement(
    blocks: Block[],
    stems: Stem[],
    sections: Section[],
    timeSignature: string
  ): Promise<void> {
    if (!this._initialized || !this.masterGain) return Promise.resolve();
    if (this.activeLoadPromise) return this.activeLoadPromise;

    this._isLoading = true;
    this.clearFailureState();

    this.activeLoadPromise = (async () => {
      try {
        const [numStr] = timeSignature.split('/');
        const numerator = parseInt(numStr ?? '4', 10);
        this.transportController.setTimeSignature(numerator, 4);

        Tone.getTransport().cancel();
        this.arrangementEndEventId = null;

        // Disconnect old signal chains (but don't dispose cached samplers)
        this.instruments.forEach((inst) => inst.disconnect());
        this.channelGains.forEach((g) => g.dispose());
        this.channelPanners.forEach((p) => p.dispose());
        this.instruments.clear();
        this.channelGains.clear();
        this.channelPanners.clear();
        this.stemVolumes.clear();
        this.loadedInstrumentSelection = [];

        // Load samplers (cached after first load — returns instantly on subsequent calls)
        for (const stem of stems) {
          const inst = await getSampler(stem.instrument);
          const gain = new Tone.Gain(stem.volume);
          const panner = new Tone.Panner(stem.pan);
          inst.disconnect(); // ensure clean state
          inst.connect(gain);
          gain.connect(panner);
          panner.connect(this.masterGain);
          this.instruments.set(stem.instrument, inst);
          this.channelGains.set(stem.instrument, gain);
          this.channelPanners.set(stem.instrument, panner);
          this.stemVolumes.set(stem.instrument, stem.volume);
          this.stemMuted.set(stem.instrument, stem.isMuted);
          this.stemSoloed.set(stem.instrument, stem.isSolo);
        }
        this.loadedInstrumentSelection = Array.from(
          new Set(stems.map((stem) => stem.instrument))
        );

        this.applyMixState();

        // Clear all tracked event IDs
        this.scheduledEventIds.clear();

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

            const eventId = Tone.getTransport().schedule((t) => {
              try {
                instrument.triggerAttackRelease(
                  note.note,
                  noteDuration,
                  t,
                  velocity
                );
              } catch {
                // Ignore scheduling errors
              }
            }, noteTime);

            // Track event ID per instrument
            const ids = this.scheduledEventIds.get(stem.instrument) ?? [];
            ids.push(eventId);
            this.scheduledEventIds.set(stem.instrument, ids);
          }
        }

        const totalBars = sections.reduce((sum, s) => sum + s.barCount, 0);
        const loopEndBar = Math.max(1, totalBars);
        this.audioConfig.loopStartBar = 1;
        this.audioConfig.loopEndBar = loopEndBar;

        const totalSeconds = totalBars > 0
          ? this.transportController.getTimeAtBar(totalBars + 1)
          : 0;
        Tone.getTransport().loop = this.audioConfig.loopEnabled;
        Tone.getTransport().loopStart = 0;
        Tone.getTransport().loopEnd = totalSeconds;
        this.scheduleArrangementStop();

        // Schedule metronome clicks (checks enabled at trigger time)
        this.metronome.scheduleClick(1, totalBars, tempo, timeSignature);
      } catch (error) {
        this.recordFailure('load-arrangement', error, 'Instrument samples could not be loaded.');
        throw error;
      } finally {
        this._isLoading = false;
        this.activeLoadPromise = null;
      }
    })();

    return this.activeLoadPromise;
  }

  /** Hot-swap one instrument's scheduled notes without stopping playback.
   * Cancels all pending events for the given instrument and re-schedules
   * from the updated blocks. Transport position and other instruments are unaffected. */
  hotSwapInstrument(
    instrument: InstrumentType,
    updatedBlocks: Block[],
    stems: Stem[],
    _sections: Section[]
  ): void {
    if (!this._initialized) return;

    const sampler = this.instruments.get(instrument);
    if (!sampler) return;

    try {
      // Cancel all scheduled events for this instrument
      const existingIds = this.scheduledEventIds.get(instrument) ?? [];
      for (const id of existingIds) {
        Tone.getTransport().clear(id);
      }

      // Release any currently sounding notes for this instrument
      sampler.releaseAll();

      // Re-schedule notes from the updated blocks for this instrument only
      const tempo = Tone.getTransport().bpm.value;
      const secondsPerBeat = 60 / tempo;
      const newIds: number[] = [];

      // Filter blocks to only those belonging to the target instrument
      const instrumentBlocks = updatedBlocks.filter((block) => {
        const stem = stems.find((s) => s.id === block.stemId);
        return stem?.instrument === instrument;
      });

      for (const block of instrumentBlocks) {
        const blockStartSeconds = this.transportController.getTimeAtBar(block.startBar);

        for (const note of block.midiData) {
          const noteTime = blockStartSeconds + note.time * secondsPerBeat;
          const noteDuration = note.duration * secondsPerBeat;
          const velocity = note.velocity / 127;

          const eventId = Tone.getTransport().schedule((t) => {
            try {
              sampler.triggerAttackRelease(
                note.note,
                noteDuration,
                t,
                velocity
              );
            } catch {
              // Ignore scheduling errors
            }
          }, noteTime);

          newIds.push(eventId);
        }
      }

      // Store the new event IDs for this instrument
      this.scheduledEventIds.set(instrument, newIds);
      this.clearFailureState();
    } catch (error) {
      this.recordFailure('hot-swap', error, 'Instrument update failed.');
      throw error;
    }
  }

  private clearFailureState(): void {
    this._failureStage = null;
    this._failureMessage = null;
  }

  private recordFailure(
    stage: AudioEngineFailureStage,
    error: unknown,
    fallback: string
  ): void {
    this._failureStage = stage;
    this._failureMessage = getAudioFailureMessage(error, fallback);
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

  private releaseAllNotes(): void {
    this.instruments.forEach((inst) => {
      inst.releaseAll();
    });
  }

  private scheduleArrangementStop(): void {
    if (this.arrangementEndEventId !== null) {
      Tone.getTransport().clear(this.arrangementEndEventId);
      this.arrangementEndEventId = null;
    }

    const loopEndSeconds = Tone.getTransport().loopEnd;
    if (typeof loopEndSeconds !== 'number' || loopEndSeconds <= 0) return;

    this.arrangementEndEventId = Tone.getTransport().schedule(() => {
      if (!Tone.getTransport().loop) {
        this.stop();
      }
    }, loopEndSeconds) as number;
  }

  private applyMixState(): void {
    const anySoloed = Array.from(this.stemSoloed.values()).some(Boolean);
    this.instruments.forEach((_, instrument) => {
      const gain = this.channelGains.get(instrument);
      if (!gain) return;
      const muted = this.stemMuted.get(instrument) ?? false;
      const soloed = this.stemSoloed.get(instrument) ?? false;
      const configuredVolume = this.stemVolumes.get(instrument) ?? 0.8;

      if (muted) {
        gain.gain.value = 0;
        return;
      }

      if (anySoloed) {
        gain.gain.value = soloed ? configuredVolume : 0;
        return;
      }

      gain.gain.value = configuredVolume;
    });
  }
}

function formatInstrumentList(instruments: InstrumentType[]): string {
  return instruments.join(', ');
}
