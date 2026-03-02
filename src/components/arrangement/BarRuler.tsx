// BarRuler.tsx — Bar number ruler with click-to-seek.

import { useProjectStore } from '@/store/project-store';
import { useAudio } from '@/hooks/useAudio';

const GUTTER_WIDTH = 80;
const BAR_MIN_WIDTH = 24;

export function BarRuler() {
  const { sections } = useProjectStore();
  const { seek } = useAudio();

  const sorted = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
  const totalBars = sorted.reduce((sum, s) => sum + s.barCount, 0);
  if (totalBars === 0) return null;

  // Generate bar numbers across all sections
  const bars: { bar: number; sectionStart: boolean }[] = [];
  let bar = 1;
  for (const section of sorted) {
    for (let i = 0; i < section.barCount; i++) {
      bars.push({ bar: bar + i, sectionStart: i === 0 });
    }
    bar += section.barCount;
  }

  return (
    <div className="flex h-5 bg-base-200 border-b border-base-300 select-none">
      {/* Gutter */}
      <div style={{ width: GUTTER_WIDTH }} className="shrink-0" />

      {/* Bar numbers */}
      <div className="flex flex-1 min-w-0">
        {bars.map(({ bar: b, sectionStart }) => (
          <div
            key={b}
            style={{ flex: 1, minWidth: BAR_MIN_WIDTH }}
            className={`flex items-center justify-center cursor-pointer border-r text-[9px] font-mono text-base-content/30 hover:text-base-content/60 transition-colors
              ${sectionStart ? 'border-base-content/15' : 'border-base-content/8'}`}
            onClick={() => seek(b)}
            title={`Bar ${b}`}
          >
            {b % 4 === 1 || b === 1 ? b : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
