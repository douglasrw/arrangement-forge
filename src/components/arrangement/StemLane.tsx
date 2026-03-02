// StemLane.tsx — Single stem lane with gutter, blocks, and solo/mute controls.

import { useProjectStore } from '@/store/project-store';
import { useAudio } from '@/hooks/useAudio';
import { Block } from './Block';
import type { Stem, InstrumentType } from '@/types';

const GUTTER_WIDTH = 80;
const BAR_WIDTH = 48; // base bar width in pixels

const ABBREV: Record<InstrumentType, string> = {
  drums: 'DRUMS', bass: 'BASS', piano: 'PIANO', guitar: 'GTR', strings: 'STRS',
};

interface Props {
  stem: Stem;
  barWidth?: number;
}

export function StemLane({ stem, barWidth = BAR_WIDTH }: Props) {
  const { blocks, updateStem } = useProjectStore();
  const { engine } = useAudio();

  const stemBlocks = blocks
    .filter((b) => b.stemId === stem.id)
    .sort((a, b) => a.startBar - b.startBar);

  const isMuted = stem.isMuted;
  const isSolo = stem.isSolo;

  function toggleMute() {
    const newMuted = !isMuted;
    updateStem(stem.id, { isMuted: newMuted });
    engine.setMute(stem.instrument, newMuted);
  }

  function toggleSolo() {
    const newSolo = !isSolo;
    updateStem(stem.id, { isSolo: newSolo });
    engine.setSolo(stem.instrument, newSolo);
  }

  return (
    <div
      className={`flex border-b border-base-300 transition-opacity ${isMuted ? 'opacity-50' : ''}`}
      style={{ minHeight: 56 }}
    >
      {/* Gutter — sticky left */}
      <div
        style={{ width: GUTTER_WIDTH, position: 'sticky', left: 0, zIndex: 2 }}
        className="shrink-0 bg-base-200 border-r border-base-300 flex flex-col items-center justify-center gap-1 px-1"
      >
        <span className="text-[9px] font-bold text-base-content/50 tracking-wider">
          {ABBREV[stem.instrument]}
        </span>
        <div className="flex gap-1">
          <button
            className={`btn btn-xs w-5 h-5 p-0 text-[9px] min-h-0 ${isSolo ? 'btn-accent' : 'btn-ghost'}`}
            onClick={toggleSolo}
            title="Solo"
          >
            S
          </button>
          <button
            className={`btn btn-xs w-5 h-5 p-0 text-[9px] min-h-0 ${isMuted ? 'btn-warning' : 'btn-ghost'}`}
            onClick={toggleMute}
            title="Mute"
          >
            M
          </button>
        </div>
      </div>

      {/* Blocks */}
      <div className="flex flex-1 items-stretch">
        {stemBlocks.map((block) => (
          <Block
            key={block.id}
            block={block}
            instrument={stem.instrument}
            stemId={stem.id}
            barWidth={barWidth}
          />
        ))}
      </div>
    </div>
  );
}

/** Container that renders all stem lanes */
export function StemLanesContainer() {
  const { stems } = useProjectStore();
  const sorted = [...stems].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="flex flex-col">
      {sorted.map((stem) => (
        <StemLane key={stem.id} stem={stem} />
      ))}
    </div>
  );
}
