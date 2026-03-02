// ChordLane.tsx — Chord reference row below stem lanes.

import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import { formatChord } from '@/lib/chords';
import type { Chord } from '@/types';

const GUTTER_WIDTH = 80;

export function ChordLane() {
  const { chords, sections, project } = useProjectStore();
  const { chordDisplayMode } = useUiStore();

  const sorted = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
  const totalBars = sorted.reduce((sum, s) => sum + s.barCount, 0);
  if (totalBars === 0 || !project) return null;

  // Build a map of bar → chord
  const chordMap = new Map<number, Chord>();
  for (const c of chords) chordMap.set(c.barNumber, c);

  const bars: { bar: number; sectionStart: boolean }[] = [];
  let bar = 1;
  for (const section of sorted) {
    for (let i = 0; i < section.barCount; i++) {
      bars.push({ bar: bar + i, sectionStart: i === 0 });
    }
    bar += section.barCount;
  }

  return (
    <div className="flex h-6 bg-base-200/50 border-t border-base-300 border-b border-base-300">
      {/* Gutter */}
      <div
        style={{ width: GUTTER_WIDTH, position: 'sticky', left: 0, zIndex: 2 }}
        className="shrink-0 bg-base-200 border-r border-base-300 flex items-center justify-center"
      >
        <span className="text-[9px] text-base-content/30 font-mono uppercase tracking-wider">Chords</span>
      </div>

      {/* Chord cells */}
      <div className="flex flex-1 min-w-0">
        {bars.map(({ bar: b, sectionStart }, idx) => {
          const chord = chordMap.get(b);
          const prevChord = idx > 0 ? chordMap.get(bars[idx - 1]?.bar) : undefined;
          const isRepeat = chord && prevChord &&
            chord.degree === prevChord.degree &&
            chord.quality === prevChord.quality;

          const label = !chord || chord.degree === null
            ? (idx === 0 ? 'N.C.' : '')
            : isRepeat
            ? '%'
            : formatChord(chord, project.key, chordDisplayMode);

          const tooltip = chord?.degree
            ? `Bar ${b}: ${formatChord(chord, project.key, 'letter')} (${formatChord(chord, project.key, 'roman')})`
            : `Bar ${b}: N.C.`;

          return (
            <div
              key={b}
              style={{ flex: 1 }}
              className={`flex items-center justify-center border-r cursor-default overflow-hidden
                ${sectionStart ? 'border-base-content/15' : 'border-base-content/8'}
              `}
              title={tooltip}
            >
              <span className="text-[10px] font-bold text-base-content/50 truncate px-0.5">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
