// metronome.ts — Click track and count-in using Tone.js.

import * as Tone from 'tone';
import type { CountInSetting } from '@/types';

export class Metronome {
  private synth: Tone.MetalSynth | null = null;
  private enabled = false;
  private countIn: CountInSetting = 'off';
  private scheduledEvents: number[] = [];

  init(): void {
    this.synth = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.1, release: 0.1 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    });
    this.synth.volume.value = -10;
    this.synth.toDestination();
  }

  dispose(): void {
    this.clearScheduled();
    this.synth?.dispose();
    this.synth = null;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setCountIn(setting: CountInSetting): void {
    this.countIn = setting;
  }

  /** Schedule metronome clicks — always schedules, checks enabled at trigger time */
  scheduleClick(startBar: number, endBar: number, tempo: number, timeSig: string): void {
    if (!this.synth) return;
    this.clearScheduled();

    const beatsPerBar = parseInt(timeSig.split('/')[0] ?? '4', 10);
    const secondsPerBeat = 60 / tempo;
    const totalBeats = (endBar - startBar + 1) * beatsPerBar;

    for (let beat = 0; beat < totalBeats; beat++) {
      const bar = startBar + Math.floor(beat / beatsPerBar);
      const beatInBar = beat % beatsPerBar;
      const time = (bar - 1) * beatsPerBar * secondsPerBeat + beatInBar * secondsPerBeat;
      const velocity = beatInBar === 0 ? 0.8 : 0.4;
      const id = Tone.getTransport().schedule((t) => {
        if (this.enabled) {
          this.synth?.triggerAttackRelease('16n', t, velocity);
        }
      }, time);
      this.scheduledEvents.push(id as unknown as number);
    }
  }

  /** Play count-in bars before music starts, then call onComplete */
  scheduleCountIn(tempo: number, timeSig: string, onComplete: () => void): void {
    if (this.countIn === 'off') {
      onComplete();
      return;
    }

    const bars = this.countIn === '1-bar' ? 1 : 2;
    const beatsPerBar = parseInt(timeSig.split('/')[0] ?? '4', 10);
    const secondsPerBeat = 60 / tempo;
    const totalBeats = bars * beatsPerBar;

    for (let beat = 0; beat < totalBeats; beat++) {
      const time = beat * secondsPerBeat;
      const velocity = beat % beatsPerBar === 0 ? 0.9 : 0.5;
      Tone.getTransport().schedule((t) => {
        this.synth?.triggerAttackRelease('16n', t, velocity);
      }, time);
    }

    Tone.getTransport().schedule(() => {
      onComplete();
    }, totalBeats * secondsPerBeat);

    Tone.getTransport().start();
  }

  private clearScheduled(): void {
    this.scheduledEvents.forEach((id) => Tone.getTransport().clear(id));
    this.scheduledEvents = [];
  }
}
