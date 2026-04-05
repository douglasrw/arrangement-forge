// ChordLane.tsx — Chord reference row below stem lanes.

import { formatChord } from '@/lib/chords';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import type { Chord } from '@/types';

export const CHORD_LANE_HEIGHT = 32;

export interface ChordLaneTruth {
  state: 'ready' | 'waiting' | 'blocked';
  badge: string;
  detail: string;
  title: string;
}

interface ChordLaneProps {
  barWidth: number;
  truth: ChordLaneTruth;
}

export function ChordLane({ barWidth, truth }: ChordLaneProps) {
  const { chords, sections, project } = useProjectStore();
  const { chordDisplayMode } = useUiStore();

  const sortedSections = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
  const totalBars = sortedSections.reduce((sum, section) => sum + section.barCount, 0);

  if (truth.state !== 'ready') {
    return (
      <div
        className="flex shrink-0 items-center border-b border-border border-t border-border/50 bg-[var(--surface-sunken)] px-3"
        data-chord-lane-state={truth.state}
        style={{ height: CHORD_LANE_HEIGHT }}
      >
        <div
          className={
            truth.state === 'blocked'
              ? 'inline-flex max-w-full items-center gap-2 rounded-full border border-dashed border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[10px] text-destructive'
              : 'inline-flex max-w-full items-center gap-2 rounded-full border border-dashed border-warning/30 bg-warning/10 px-2.5 py-1 text-[10px] text-warning'
          }
          role="status"
          title={truth.title}
        >
          <span className="font-semibold uppercase tracking-[0.16em]">{truth.badge}</span>
          <span
            className={
              truth.state === 'blocked'
                ? 'truncate text-destructive/80'
                : 'truncate text-warning/80'
            }
          >
            {truth.detail}
          </span>
        </div>
      </div>
    );
  }

  if (totalBars === 0 || !project || chords.length === 0) return null;

  const chordMap = new Map<number, Chord>();
  for (const chord of chords) chordMap.set(chord.barNumber, chord);

  const bars: { bar: number; sectionStart: boolean }[] = [];
  let barNumber = 1;
  for (const section of sortedSections) {
    for (let i = 0; i < section.barCount; i++) {
      bars.push({ bar: barNumber + i, sectionStart: i === 0 });
    }
    barNumber += section.barCount;
  }

  return (
    <div
      className="flex shrink-0 border-b border-border border-t border-border/50 bg-[var(--surface-sunken)]"
      data-chord-lane-state="ready"
      style={{ height: CHORD_LANE_HEIGHT }}
    >
      {bars.map(({ bar, sectionStart }, idx) => {
        const chord = chordMap.get(bar);
        const previousChord = idx > 0 ? chordMap.get(bars[idx - 1]?.bar) : undefined;
        const isRepeat =
          chord &&
          previousChord &&
          chord.degree === previousChord.degree &&
          chord.quality === previousChord.quality;

        const label =
          !chord || chord.degree === null
            ? idx === 0
              ? 'N.C.'
              : ''
            : isRepeat
              ? '%'
              : formatChord(chord, project.key, chordDisplayMode);

        const tooltip = chord?.degree
          ? `Bar ${bar}: ${formatChord(chord, project.key, 'letter')} (${formatChord(chord, project.key, 'roman')})`
          : `Bar ${bar}: N.C.`;

        return (
          <div
            key={bar}
            className="flex items-center justify-center overflow-hidden border-r"
            style={{
              width: barWidth,
              borderColor: sectionStart ? 'rgba(244,244,245,0.15)' : 'rgba(244,244,245,0.08)',
            }}
            title={tooltip}
          >
            <span className="truncate px-0.5 text-[10px] font-bold text-muted-foreground">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
