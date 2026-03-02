// audio.ts — Audio engine and transport state types.

export type PlaybackState = 'stopped' | 'playing' | 'paused';
export type CountInSetting = 'off' | '1-bar' | '2-bars';

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
