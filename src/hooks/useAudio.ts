// useAudio.ts — React hook wrapping the AudioEngine singleton.

import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEngine } from '@/audio/engine';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import type { AudioEngineConfig, TransportState } from '@/types';

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
  const [audioConfig, setAudioConfig] = useState<AudioEngineConfig>(() => engine.getAudioConfig());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastArrangementSignatureRef = useRef('');
  const lastMixerSignatureRef = useRef('');

  const { project, blocks, stems, sections, drumOnlyUpdate, clearDrumOnlyUpdate, allInstrumentsUpdate, clearAllInstrumentsUpdate } = useProjectStore();
  const { setSystemStatus } = useUiStore();

  const arrangementSignature = JSON.stringify({
    projectId: project?.id ?? null,
    tempo: project?.tempo ?? null,
    timeSignature: project?.timeSignature ?? null,
    stems: stems.map((stem) => ({
      id: stem.id,
      instrument: stem.instrument,
      sortOrder: stem.sortOrder,
    })),
    sections: sections.map((section) => ({
      id: section.id,
      sortOrder: section.sortOrder,
      startBar: section.startBar,
      barCount: section.barCount,
    })),
    blocks: blocks.map((block) => ({
      id: block.id,
      stemId: block.stemId,
      sectionId: block.sectionId,
      startBar: block.startBar,
      endBar: block.endBar,
      midiData: block.midiData,
    })),
  });

  const mixerSignature = JSON.stringify(
    stems.map((stem) => ({
      id: stem.id,
      instrument: stem.instrument,
      volume: stem.volume,
      pan: stem.pan,
      isMuted: stem.isMuted,
      isSolo: stem.isSolo,
    }))
  );

  const syncStemMixerState = useCallback(() => {
    for (const stem of stems) {
      engine.setVolume(stem.instrument, stem.volume);
      engine.setPan(stem.instrument, stem.pan);
      engine.setMute(stem.instrument, stem.isMuted);
      engine.setSolo(stem.instrument, stem.isSolo);
    }
    lastMixerSignatureRef.current = mixerSignature;
  }, [engine, mixerSignature, stems]);

  const initEngine = useCallback(async () => {
    await engine.init();
    setIsReady(true);
  }, [engine]);

  useEffect(() => {
    if (!project || stems.length === 0) {
      lastArrangementSignatureRef.current = '';
      lastMixerSignatureRef.current = '';
    }
  }, [project, stems.length]);

  // Auto-load arrangement into audio engine when structure changes.
  // Stem mix updates are handled separately so mixer moves do not reload samples.
  useEffect(() => {
    if (!engine.isInitialized || stems.length === 0 || !project) return;

    // All-instruments update: hot-swap every instrument without full reload
    if (allInstrumentsUpdate) {
      clearAllInstrumentsUpdate();
      try {
        for (const stem of stems) {
          engine.hotSwapInstrument(stem.instrument, blocks, stems, sections);
        }
        lastArrangementSignatureRef.current = arrangementSignature;
        syncStemMixerState();
      } catch (err) {
        console.error('Failed to hot-swap instruments:', err);
      }
      return;
    }

    // Drum-only update: hot-swap drum notes without full reload
    if (drumOnlyUpdate) {
      clearDrumOnlyUpdate();
      try {
        engine.hotSwapInstrument('drums', blocks, stems, sections);
        lastArrangementSignatureRef.current = arrangementSignature;
        syncStemMixerState();
      } catch (err) {
        console.error('Failed to hot-swap drum instrument:', err);
      }
      return;
    }

    if (arrangementSignature === lastArrangementSignatureRef.current) {
      return;
    }

    let cancelled = false;
    lastArrangementSignatureRef.current = arrangementSignature;

    async function load() {
      try {
        setSystemStatus('loading-samples');
        engine.setTempo(project!.tempo);
        await engine.loadArrangement(blocks, stems, sections, project!.timeSignature);
        if (!cancelled) {
          syncStemMixerState();
          setSystemStatus('ready');
        }
      } catch (err) {
        console.error('Failed to load arrangement samples:', err);
        lastArrangementSignatureRef.current = '';
        if (!cancelled) setSystemStatus('error');
      }
    }

    load();

    return () => { cancelled = true; };
  }, [
    arrangementSignature,
    allInstrumentsUpdate,
    blocks,
    clearAllInstrumentsUpdate,
    clearDrumOnlyUpdate,
    drumOnlyUpdate,
    engine,
    isReady,
    project,
    sections,
    setSystemStatus,
    stems,
    syncStemMixerState,
  ]);

  useEffect(() => {
    if (!engine.isInitialized || stems.length === 0 || !project) return;
    if (mixerSignature === lastMixerSignatureRef.current) return;
    syncStemMixerState();
  }, [engine, mixerSignature, project, stems.length, syncStemMixerState]);

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
    // Ensure arrangement is loaded before playing
    if (stems.length > 0 && project) {
      engine.setTempo(project.tempo);
      await engine.loadArrangement(blocks, stems, sections, project.timeSignature);
    }
    engine.play();
  }, [engine, initEngine, blocks, stems, sections, project]);

  const pause = useCallback(() => engine.pause(), [engine]);
  const stop = useCallback(() => engine.stop(), [engine]);
  const seek = useCallback((bar: number) => engine.seek(bar), [engine]);
  const seekToSeconds = useCallback((seconds: number) => engine.seekToSeconds(seconds), [engine]);
  const setMetronomeEnabled = useCallback((enabled: boolean) => {
    engine.setMetronomeEnabled(enabled);
    setAudioConfig(engine.getAudioConfig());
  }, [engine]);
  const setLoopEnabled = useCallback((enabled: boolean) => {
    engine.setLoopEnabled(enabled);
    setAudioConfig(engine.getAudioConfig());
  }, [engine]);
  const setMasterVolume = useCallback((volume: number) => {
    engine.setMasterVolume(volume);
    setAudioConfig(engine.getAudioConfig());
  }, [engine]);

  return {
    engine,
    transportState,
    audioConfig,
    isReady,
    play,
    pause,
    stop,
    seek,
    seekToSeconds,
    setMetronomeEnabled,
    setLoopEnabled,
    setMasterVolume,
    initEngine,
    loadArrangement: useCallback(
      async (timeSig: string) => engine.loadArrangement(blocks, stems, sections, timeSig),
      [engine, blocks, stems, sections]
    ),
  };
}
