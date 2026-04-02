// transport.ts — TransportController wraps Tone.js Transport for bar/beat-level control.
// Converts between seconds and bar positions using tempo and time signature.

import * as Tone from 'tone';
import type { PlaybackTruthAction } from '@/types';

export type TransportReadinessState = 'ready' | 'waiting' | 'blocked';

export interface TransportReadinessTruth {
  detailLabel: string;
  state: TransportReadinessState;
  summaryLabel: 'Ready' | 'Waiting' | 'Blocked';
  summaryClassName: string;
}

export function getTransportReadinessTruth({
  timelineAvailable,
  transportReady,
  playbackAction,
}: {
  timelineAvailable: boolean;
  transportReady: boolean;
  playbackAction: PlaybackTruthAction;
}): TransportReadinessTruth {
  if (transportReady) {
    return {
      detailLabel: 'Ready',
      state: 'ready',
      summaryLabel: 'Ready',
      summaryClassName: 'bg-emerald-500/10 text-emerald-300',
    };
  }

  if (!timelineAvailable || playbackAction === 'retry-play' || playbackAction === 'unavailable') {
    return {
      detailLabel: timelineAvailable ? 'Transport blocked' : 'No timeline',
      state: 'blocked',
      summaryLabel: 'Blocked',
      summaryClassName: 'bg-rose-500/10 text-rose-300',
    };
  }

  return {
    detailLabel: playbackAction === 'wait' ? 'Loading audio' : 'Load to play',
    state: 'waiting',
    summaryLabel: 'Waiting',
    summaryClassName: 'bg-amber-500/10 text-amber-300',
  };
}

export class TransportController {
  private bpm = 120;
  private beatsPerBar = 4;

  setTempo(bpm: number): void {
    this.bpm = bpm;
    Tone.getTransport().bpm.value = bpm;
  }

  setTimeSignature(numerator: number, _denominator: number): void {
    this.beatsPerBar = numerator;
    Tone.getTransport().timeSignature = numerator;
  }

  /** Seconds per beat at current tempo */
  private get secondsPerBeat(): number {
    return 60 / this.bpm;
  }

  /** Convert a 1-indexed bar number to transport seconds */
  getTimeAtBar(bar: number): number {
    return (bar - 1) * this.beatsPerBar * this.secondsPerBeat;
  }

  /** Convert transport seconds to a 1-indexed bar number */
  getBarAtTime(seconds: number): number {
    return Math.floor(seconds / (this.beatsPerBar * this.secondsPerBeat)) + 1;
  }

  /** Total duration in seconds for a given number of bars */
  getTotalDuration(totalBars: number): number {
    return totalBars * this.beatsPerBar * this.secondsPerBeat;
  }

  getCurrentBar(): number {
    const ticks = Tone.getTransport().ticks;
    const ppq = Tone.getTransport().PPQ;
    const beatPosition = ticks / ppq;
    return Math.floor(beatPosition / this.beatsPerBar) + 1;
  }

  getCurrentBeat(): number {
    const ticks = Tone.getTransport().ticks;
    const ppq = Tone.getTransport().PPQ;
    const beatPosition = ticks / ppq;
    return Math.floor(beatPosition % this.beatsPerBar) + 1;
  }
}
