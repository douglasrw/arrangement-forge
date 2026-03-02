// MixerDrawer.tsx — Collapsible mixer with channel strips and master fader.

import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import { ChannelStrip } from './ChannelStrip';
import { MasterStrip } from './MasterStrip';
import type { InstrumentType } from '@/types';

const ABBREV: Record<InstrumentType, string> = {
  drums: 'DRM', bass: 'BAS', piano: 'PNO', guitar: 'GTR', strings: 'STR',
};

function MiniBar({ volume }: { volume: number }) {
  return (
    <div className="flex items-center gap-0.5 w-12">
      <div
        className="h-2 bg-primary/60 rounded-sm transition-all"
        style={{ width: `${volume * 100}%`, minWidth: 2 }}
      />
    </div>
  );
}

export function MixerDrawer() {
  const { stems, updateStem } = useProjectStore();
  const { mixerExpanded, toggleMixer, generationState } = useUiStore();

  if (generationState !== 'complete') return null;

  const sorted = [...stems].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div
      className={`bg-base-200 border-t border-base-300 shrink-0 transition-all duration-200 overflow-hidden`}
      style={{ height: mixerExpanded ? 260 : 36 }}
    >
      {/* Collapsed row */}
      <div className="flex items-center h-9 px-3 gap-4 border-b border-base-300">
        <button
          className="btn btn-ghost btn-xs text-base-content/50 gap-1"
          onClick={toggleMixer}
        >
          {mixerExpanded ? '▼' : '▲'} Mixer
        </button>

        {/* Mini channel overview */}
        <div className="flex items-center gap-3">
          {sorted.map((stem) => (
            <button
              key={stem.id}
              className="flex items-center gap-1.5 text-[10px] text-base-content/50 hover:text-base-content/80 transition-colors"
              onClick={() => updateStem(stem.id, { isMuted: !stem.isMuted })}
              onDoubleClick={() => updateStem(stem.id, { isSolo: !stem.isSolo })}
              title={`Click to mute/unmute · Double-click to solo`}
            >
              <span className={`font-mono ${stem.isMuted ? 'opacity-30' : ''}`}>
                {ABBREV[stem.instrument]}
              </span>
              <MiniBar volume={stem.volume} />
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <div className="text-[9px] text-base-content/25">
          Click: mute · Double-click: solo
        </div>
      </div>

      {/* Expanded channel strips */}
      {mixerExpanded && (
        <div className="flex h-[calc(100%-36px)] overflow-x-auto">
          <div className="flex items-stretch">
            {sorted.map((stem) => (
              <ChannelStrip key={stem.id} stem={stem} />
            ))}
          </div>
          <MasterStrip />
        </div>
      )}
    </div>
  );
}
