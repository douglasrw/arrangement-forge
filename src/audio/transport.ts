// transport.ts — TransportController wraps Tone.js Transport for bar/beat-level control.
// Converts between seconds and bar positions using tempo and time signature.

import * as Tone from 'tone';
import type { PlaybackTruthAction, PlaybackTruthReason } from '@/types';

export type TransportReadinessState = 'ready' | 'waiting' | 'blocked' | 'error';

export interface TransportReadinessTruth {
  detailLabel: string;
  state: TransportReadinessState;
  summaryLabel: 'Ready' | 'Waiting' | 'Blocked' | 'Error';
  summaryClassName: string;
}

export type TransportSelectionState = 'default' | 'selected';

export interface TransportSettingTruth {
  detailLabel: string;
  key: 'loop' | 'metronome';
  state: TransportSelectionState;
  summaryLabel: string;
}

export interface TransportSelectionTruth {
  detailLabel: string;
  settings: TransportSettingTruth[];
  summaryLabel: string;
}

export function getTransportReadinessTruth({
  timelineAvailable,
  transportReady,
  playbackAction,
  playbackReason,
  playbackSummary,
}: {
  timelineAvailable: boolean;
  transportReady: boolean;
  playbackAction: PlaybackTruthAction;
  playbackReason: PlaybackTruthReason;
  playbackSummary: string;
}): TransportReadinessTruth {
  if (transportReady) {
    return {
      detailLabel: 'Ready',
      state: 'ready',
      summaryLabel: 'Ready',
      summaryClassName: 'bg-emerald-500/10 text-emerald-300',
    };
  }

  if (!timelineAvailable) {
    return {
      detailLabel: playbackSummary === 'Reload arrangement' ? playbackSummary : 'No timeline',
      state: 'blocked',
      summaryLabel: 'Blocked',
      summaryClassName: 'bg-rose-500/10 text-rose-300',
    };
  }

  if (playbackAction === 'retry-play') {
    return {
      detailLabel: playbackSummary,
      state: 'error',
      summaryLabel: 'Error',
      summaryClassName: 'bg-rose-500/10 text-rose-300',
    };
  }

  if (playbackAction === 'unavailable') {
    return {
      detailLabel: playbackReason === 'no-stems' ? 'No stems' : playbackSummary,
      state: 'blocked',
      summaryLabel: 'Blocked',
      summaryClassName: 'bg-rose-500/10 text-rose-300',
    };
  }

  return {
    detailLabel: playbackSummary,
    state: 'waiting',
    summaryLabel: 'Waiting',
    summaryClassName: 'bg-amber-500/10 text-amber-300',
  };
}

function getTransportSettingTruth({
  enabled,
  key,
  label,
}: {
  enabled: boolean;
  key: 'loop' | 'metronome';
  label: 'Loop' | 'Metronome';
}): TransportSettingTruth {
  if (enabled) {
    return {
      detailLabel: `${label} is selected for playback.`,
      key,
      state: 'selected',
      summaryLabel: `${label} on`,
    };
  }

  return {
    detailLabel: `${label} is off by default until you select it.`,
    key,
    state: 'default',
    summaryLabel: `${label} default off`,
  };
}

export function getTransportSelectionTruth({
  loopEnabled,
  metronomeEnabled,
}: {
  loopEnabled: boolean;
  metronomeEnabled: boolean;
}): TransportSelectionTruth {
  const settings = [
    getTransportSettingTruth({
      enabled: loopEnabled,
      key: 'loop',
      label: 'Loop',
    }),
    getTransportSettingTruth({
      enabled: metronomeEnabled,
      key: 'metronome',
      label: 'Metronome',
    }),
  ];

  return {
    detailLabel: settings.map((setting) => setting.detailLabel).join(' '),
    settings,
    summaryLabel: settings.map((setting) => setting.summaryLabel).join(' · '),
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
