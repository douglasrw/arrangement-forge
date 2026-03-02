// TransportBar.tsx — Playback controls: play/pause, skip, position, loop, metronome.

import { useState } from 'react';
import { useAudio } from '@/hooks/useAudio';
import { useProjectStore } from '@/store/project-store';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TransportBar() {
  const { transportState, play, pause, stop, seek, engine } = useAudio();
  const { sections } = useProjectStore();
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopSectionId, setLoopSectionId] = useState<string>('');
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [countIn, setCountIn] = useState<'off' | '1-bar' | '2-bars'>('off');

  const isPlaying = transportState.playbackState === 'playing';
  const sorted = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);

  function handlePlayPause() {
    if (isPlaying) pause();
    else play();
  }

  function handlePrevSection() {
    const currentBar = transportState.currentBar;
    const prev = [...sorted].reverse().find((s) => s.startBar < currentBar);
    if (prev) seek(prev.startBar);
    else seek(1);
  }

  function handleNextSection() {
    const currentBar = transportState.currentBar;
    const next = sorted.find((s) => s.startBar > currentBar);
    if (next) seek(next.startBar);
  }

  function handleMetronome() {
    const next = !metronomeOn;
    setMetronomeOn(next);
    engine.setMetronomeEnabled(next);
  }

  const btnBase = 'btn btn-sm min-h-0 w-9 h-9 p-0 text-base';

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 bg-base-200 border-t border-base-300 shrink-0">
      {/* Transport buttons — all uniform size */}
      <div className="flex items-center gap-1">
        <button className={`${btnBase} btn-ghost`} onClick={() => seek(1)} title="Go to start">⏮</button>
        <button className={`${btnBase} btn-ghost`} onClick={handlePrevSection} title="Previous section">⏪</button>
        <button
          className={`${btnBase} ${isPlaying ? 'btn-primary' : 'btn-ghost border border-primary/40'}`}
          onClick={handlePlayPause}
        >
          {isPlaying ? '❙❙' : '▶'}
        </button>
        <button className={`${btnBase} btn-ghost`} onClick={handleNextSection} title="Next section">⏩</button>
        <button className={`${btnBase} btn-ghost`} onClick={stop} title="Stop">⏹</button>
      </div>

      {/* Position display */}
      <div className="shrink-0 flex items-center gap-2 font-mono text-xs">
        <span className="font-bold text-base-content">Bar {transportState.currentBar}</span>
        <span className="text-base-content/40">
          {formatTime(transportState.elapsedSeconds)} / {formatTime(transportState.totalSeconds)}
        </span>
      </div>

      <div className="flex-1" />

      {/* Loop */}
      <button
        className={`btn btn-xs ${loopEnabled ? 'btn-secondary' : 'btn-ghost'}`}
        onClick={() => setLoopEnabled(!loopEnabled)}
        title="Loop"
      >
        ↻ Loop
      </button>
      {loopEnabled && (
        <select
          className="select select-xs select-ghost text-base-content/70"
          value={loopSectionId}
          onChange={(e) => setLoopSectionId(e.target.value)}
        >
          <option value="">Full track</option>
          {sorted.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}

      {/* Master volume */}
      <div className="flex items-center gap-1.5">
        <span className="text-base-content/40 text-[10px]">Vol</span>
        <input
          type="range"
          min={0} max={1} step={0.05}
          defaultValue={0.8}
          className="range range-xs range-primary w-20"
          onChange={(e) => engine.setMasterVolume(parseFloat(e.target.value))}
        />
      </div>

      {/* Metronome */}
      <button
        className={`btn btn-xs ${metronomeOn ? 'btn-secondary' : 'btn-ghost'}`}
        onClick={handleMetronome}
      >
        Click
      </button>

      {/* Count-in */}
      <select
        className="select select-xs select-ghost text-base-content/50"
        value={countIn}
        onChange={(e) => {
          const v = e.target.value as typeof countIn;
          setCountIn(v);
          engine.setMetronomeCountIn(v);
        }}
      >
        <option value="off">Count: Off</option>
        <option value="1-bar">Count: 1 bar</option>
        <option value="2-bars">Count: 2 bars</option>
      </select>
    </div>
  );
}
