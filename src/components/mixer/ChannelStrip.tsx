// ChannelStrip.tsx — Per-stem vertical fader strip (expanded mixer view).

import { useProjectStore } from '@/store/project-store';
import { useAudio } from '@/hooks/useAudio';
import type { Stem, InstrumentType } from '@/types';

const ABBREV: Record<InstrumentType, string> = {
  drums: 'DRUMS', bass: 'BASS', piano: 'PIANO', guitar: 'GTR', strings: 'STRS',
};

function volToDb(vol: number): string {
  if (vol <= 0) return '-∞';
  const db = 20 * Math.log10(vol);
  return `${db >= 0 ? '+' : ''}${db.toFixed(1)}`;
}

interface Props { stem: Stem; }

export function ChannelStrip({ stem }: Props) {
  const { updateStem } = useProjectStore();
  const { engine } = useAudio();

  function handleVolume(v: number) {
    updateStem(stem.id, { volume: v });
    engine.setVolume(stem.instrument, v);
  }

  function handlePan(p: number) {
    updateStem(stem.id, { pan: p });
    engine.setPan(stem.instrument, p);
  }

  function handleMute() {
    const next = !stem.isMuted;
    updateStem(stem.id, { isMuted: next });
    engine.setMute(stem.instrument, next);
  }

  function handleSolo() {
    const next = !stem.isSolo;
    updateStem(stem.id, { isSolo: next });
    engine.setSolo(stem.instrument, next);
  }

  return (
    <div
      className={`flex flex-col items-center gap-1.5 w-16 shrink-0 px-2 py-2 border-r border-base-300 transition-opacity ${stem.isMuted ? 'opacity-50' : ''}`}
    >
      {/* Instrument name */}
      <span className="text-[9px] font-bold text-base-content/50 tracking-wider">{ABBREV[stem.instrument]}</span>

      {/* Solo / Mute */}
      <div className="flex gap-1">
        <button
          className={`btn btn-sm w-7 h-7 p-0 text-xs min-h-0 ${stem.isSolo ? 'btn-accent' : 'btn-ghost border border-base-300'}`}
          onClick={handleSolo}
        >
          S
        </button>
        <button
          className={`btn btn-sm w-7 h-7 p-0 text-xs min-h-0 ${stem.isMuted ? 'btn-warning' : 'btn-ghost border border-base-300'}`}
          onClick={handleMute}
        >
          M
        </button>
      </div>

      {/* Fader — rotated range input */}
      <div className="relative flex items-center justify-center" style={{ height: 160, width: 24 }}>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={stem.volume}
          onChange={(e) => handleVolume(parseFloat(e.target.value))}
          className="range range-xs range-primary"
          style={{
            writingMode: 'vertical-lr' as React.CSSProperties['writingMode'],
            direction: 'rtl',
            width: 160,
            height: 24,
            transform: 'rotate(180deg)',
            cursor: 'ns-resize',
          }}
        />
      </div>

      {/* dB display */}
      <span className="text-[9px] font-mono text-base-content/40">{volToDb(stem.volume)}</span>

      {/* Pan */}
      <input
        type="range"
        min={-1}
        max={1}
        step={0.05}
        value={stem.pan}
        onChange={(e) => handlePan(parseFloat(e.target.value))}
        className="range range-xs w-10"
        title={`Pan: ${stem.pan.toFixed(2)}`}
      />
      <span className="text-[9px] font-mono text-base-content/30">
        {stem.pan === 0 ? 'C' : stem.pan > 0 ? `R${Math.round(stem.pan * 100)}` : `L${Math.round(-stem.pan * 100)}`}
      </span>
    </div>
  );
}
