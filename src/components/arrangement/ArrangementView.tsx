// ArrangementView.tsx — Container for the arrangement area.
// Pre-gen: renders EmptyState. Post-gen: renders full arrangement stack with playhead.

import { useUiStore } from '@/store/ui-store';
import { useProjectStore } from '@/store/project-store';
import { useAudio } from '@/hooks/useAudio';
import { EmptyState } from './EmptyState';
import { ArrangementToolbar } from './ArrangementToolbar';
import { SectionHeaders } from './SectionHeaders';
import { BarRuler } from './BarRuler';
import { StemLanesContainer } from './StemLane';
import { ChordLane } from './ChordLane';

const GUTTER_WIDTH = 80;

function Playhead() {
  const { transportState } = useAudio();
  const { sections, project } = useProjectStore();

  const sorted = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
  const totalBars = sorted.reduce((sum, s) => sum + s.barCount, 0);

  if (totalBars === 0 || transportState.playbackState === 'stopped') return null;

  // Parse beats per bar from time signature
  const beatsPerBar = project?.timeSignature
    ? parseInt(project.timeSignature.split('/')[0] ?? '4', 10)
    : 4;

  // Position as fraction of total bars (currentBar and currentBeat are 1-indexed)
  const barFraction = (transportState.currentBar - 1 + (transportState.currentBeat - 1) / beatsPerBar) / totalBars;
  const pct = Math.min(barFraction * 100, 100);

  return (
    <div
      className="absolute top-0 bottom-0 flex pointer-events-none"
      style={{ left: 0, right: 0, zIndex: 15 }}
    >
      {/* Gutter spacer */}
      <div style={{ width: GUTTER_WIDTH }} className="shrink-0" />
      {/* Playhead line positioned within the bars area */}
      <div className="flex-1 relative">
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-primary shadow-[0_0_4px_rgba(0,255,128,0.5)]"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ArrangementView() {
  const { generationState } = useUiStore();

  if (generationState !== 'complete') {
    return (
      <div className="flex-1 min-h-0 overflow-auto bg-base-100 flex items-center justify-center">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 border-b border-base-300">
        <ArrangementToolbar />
      </div>

      {/* Scrollable arrangement content */}
      <div className="flex-1 overflow-auto relative">
        {/* Playhead overlay */}
        <Playhead />

        {/* Section headers + bar ruler — sticky */}
        <div className="sticky top-0 z-10 bg-base-100">
          <SectionHeaders />
          <BarRuler />
        </div>

        {/* Stem lanes + chord lane */}
        <div className="flex flex-col">
          <StemLanesContainer />
          <ChordLane />
        </div>
      </div>
    </div>
  );
}
