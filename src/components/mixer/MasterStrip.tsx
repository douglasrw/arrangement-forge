// MasterStrip.tsx — Master volume channel in mixer.

import { useState } from 'react';
import { useAudio } from '@/hooks/useAudio';

function volToDb(vol: number): string {
  if (vol <= 0) return '-∞';
  const db = 20 * Math.log10(vol);
  return `${db >= 0 ? '+' : ''}${db.toFixed(1)}`;
}

export function MasterStrip() {
  const { engine } = useAudio();
  const [volume, setVolume] = useState(0.8);

  function handleVolume(v: number) {
    setVolume(v);
    engine.setMasterVolume(v);
  }

  return (
    <div className="flex flex-col items-center gap-1.5 w-20 shrink-0 px-3 py-2 border-l border-base-300/50 bg-base-300/20">
      <span className="text-[9px] font-bold text-base-content/60 tracking-wider">MASTER</span>

      <div className="relative flex items-center justify-center overflow-hidden" style={{ height: 120, width: 32 }}>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => handleVolume(parseFloat(e.target.value))}
          className="range range-xs range-primary absolute"
          style={{
            width: 120,
            transform: 'rotate(-90deg)',
          }}
        />
      </div>

      <span className="text-[9px] font-mono text-base-content/50">{volToDb(volume)}</span>
    </div>
  );
}
