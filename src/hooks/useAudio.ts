// useAudio.ts — React hook wrapping the AudioEngine singleton.

import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEngine } from '@/audio/engine';
import { useProjectStore } from '@/store/project-store';
import type { TransportState } from '@/types';

// Module-level singleton — not stored in Zustand
let engineInstance: AudioEngine | null = null;

function getEngine(): AudioEngine {
  if (!engineInstance) engineInstance = new AudioEngine();
  return engineInstance;
}

const defaultTransportState: TransportState = {
  playbackState: 'stopped',
  currentBar: 1,
  currentBeat: 1,
  elapsedSeconds: 0,
  totalSeconds: 0,
  isCountingIn: false,
};

export function useAudio() {
  const [isReady, setIsReady] = useState(false);
  const [transportState, setTransportState] = useState<TransportState>(defaultTransportState);
  const engine = getEngine();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { blocks, stems, sections } = useProjectStore();

  const initEngine = useCallback(async () => {
    await engine.init();
    setIsReady(true);
  }, [engine]);

  // Poll transport state at ~30fps for smooth playhead updates
  useEffect(() => {
    pollRef.current = setInterval(() => {
      if (isReady) setTransportState(engine.getTransportState());
    }, 33);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [engine, isReady]);

  const play = useCallback(async () => {
    if (!isReady) await initEngine();
    engine.play();
  }, [engine, isReady, initEngine]);

  const pause = useCallback(() => engine.pause(), [engine]);
  const stop = useCallback(() => engine.stop(), [engine]);
  const seek = useCallback((bar: number) => engine.seek(bar), [engine]);

  return {
    engine,
    transportState,
    isReady,
    play,
    pause,
    stop,
    seek,
    initEngine,
    // Expose arrange loader to allow components to trigger loadArrangement
    loadArrangement: useCallback(
      (timeSig: string) => engine.loadArrangement(blocks, stems, sections, timeSig),
      [engine, blocks, stems, sections]
    ),
  };
}
