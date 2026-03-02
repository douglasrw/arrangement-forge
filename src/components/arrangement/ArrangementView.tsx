// ArrangementView.tsx — Container for the arrangement area.
// Pre-gen: renders EmptyState. Post-gen: renders full arrangement stack.

import { useUiStore } from '@/store/ui-store';
import { EmptyState } from './EmptyState';
import { ArrangementToolbar } from './ArrangementToolbar';
import { SectionHeaders } from './SectionHeaders';
import { BarRuler } from './BarRuler';
import { StemLanesContainer } from './StemLane';
import { ChordLane } from './ChordLane';

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
      <div className="flex-1 overflow-auto">
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
