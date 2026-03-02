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

  const { project, blocks, stems, sections } = useProjectStore();

  const initEngine = useCallback(async () => {
    await engine.init();
    setIsReady(true);
  }, [engine]);

  // Auto-load arrangement into audio engine when data changes
  useEffect(() => {
    if (engine.isInitialized && stems.length > 0 && project) {
      engine.setTempo(project.tempo);
      engine.loadArrangement(blocks, stems, sections, project.timeSignature);
    }
  }, [engine, isReady, blocks, stems, sections, project]);

  // Poll transport state at ~30fps for smooth playhead updates
  // Use engine.isInitialized instead of local isReady so ALL useAudio consumers get updates
  const lastStateRef = useRef<string>('');
  useEffect(() => {
    pollRef.current = setInterval(() => {
      if (engine.isInitialized) {
        const next = engine.getTransportState();
        const key = `${next.playbackState}:${next.currentBar}:${next.currentBeat}:${Math.round(next.elapsedSeconds * 10)}`;
        if (key !== lastStateRef.current) {
          lastStateRef.current = key;
          setTransportState(next);
          // Sync local isReady if engine was initialized elsewhere
          if (!isReady) setIsReady(true);
        }
      }
    }, 33);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [engine, isReady]);

  const play = useCallback(async () => {
    if (!engine.isInitialized) await initEngine();
    // Ensure arrangement is loaded
    if (stems.length > 0 && project) {
      engine.setTempo(project.tempo);
      engine.loadArrangement(blocks, stems, sections, project.timeSignature);
    }
    engine.play();
  }, [engine, initEngine, blocks, stems, sections, project]);

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
    loadArrangement: useCallback(
      (timeSig: string) => engine.loadArrangement(blocks, stems, sections, timeSig),
      [engine, blocks, stems, sections]
    ),
  };
}
