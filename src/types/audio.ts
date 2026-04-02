// audio.ts — Audio engine and transport state types.

export type PlaybackState = 'stopped' | 'playing' | 'paused';
export type PlaybackReadiness = 'ready' | 'loading' | 'unavailable';
export type CountInSetting = 'off' | '1-bar' | '2-bars';
export type AudioEngineFailureStage = 'engine-start' | 'load-arrangement' | 'hot-swap';
export type PlaybackTruthAction =
  | 'play'
  | 'load-and-play'
  | 'retry-play'
  | 'wait'
  | 'unavailable';
export type PlaybackTruthReason =
  | 'ready'
  | 'no-arrangement'
  | 'saved-arrangement-not-loaded'
  | 'no-stems'
  | 'awaiting-user-play'
  | 'loading-arrangement'
  | 'engine-start-failed'
  | 'arrangement-load-failed'
  | 'instrument-update-failed';

export interface TransportState {
  playbackState: PlaybackState;
  currentBar: number;
  currentBeat: number;
  elapsedSeconds: number;
  totalSeconds: number;
  isCountingIn: boolean;
}

export interface AudioEngineConfig {
  metronomeEnabled: boolean;
  countIn: CountInSetting;
  masterVolume: number; // 0.0-1.0
  loopEnabled: boolean;
  loopStartBar: number;
  loopEndBar: number;
}

export interface AudioEngineReadinessSnapshot {
  isInitialized: boolean;
  isLoading: boolean;
  failureStage: AudioEngineFailureStage | null;
  failureMessage: string | null;
}

export interface PlaybackTruth {
  status: PlaybackReadiness;
  action: PlaybackTruthAction;
  reason: PlaybackTruthReason;
  summary: string;
  detail: string;
  nextStep: string;
}
