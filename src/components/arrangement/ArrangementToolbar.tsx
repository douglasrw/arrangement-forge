// ArrangementToolbar.tsx — Arrangement toolbar: tool mode selector + zoom controls.

import { useUiStore, ZOOM_STEPS } from '@/store/ui-store';
import { useProjectStore } from '@/store/project-store';

export function ArrangementToolbar() {
  const { toolMode, setToolMode, zoomIndex, zoomIn, zoomOut, zoomFitAll } = useUiStore();
  const { getTotalBars } = useProjectStore();

  const totalBars = getTotalBars();
  const zoomPct = Math.round(ZOOM_STEPS[zoomIndex] * 100);

  return (
    <div className="flex items-center gap-4 h-9 px-4 bg-base-200">
      <span className="text-[10px] text-base-content/30 uppercase tracking-wider font-semibold">Arrangement</span>

      <div className="flex-1" />

      {/* Tool mode */}
      <div className="join">
        <button
          className={`join-item btn btn-xs ${toolMode === 'select' ? 'btn-neutral' : 'btn-ghost'}`}
          onClick={() => setToolMode('select')}
          title="Select mode (V)"
        >
          Select
        </button>
        <button
          className={`join-item btn btn-xs ${toolMode === 'split' ? 'btn-neutral' : 'btn-ghost'}`}
          onClick={() => setToolMode('split')}
          title="Split mode (S)"
        >
          Split
        </button>
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-1">
        <button
          className="btn btn-ghost btn-xs px-1"
          onClick={zoomOut}
          disabled={zoomIndex === 0}
          title="Zoom out (Cmd+-)"
        >
          −
        </button>
        <span className="text-[10px] font-mono text-base-content/40 w-10 text-center">{zoomPct}%</span>
        <button
          className="btn btn-ghost btn-xs px-1"
          onClick={zoomIn}
          disabled={zoomIndex === ZOOM_STEPS.length - 1}
          title="Zoom in (Cmd++)"
        >
          +
        </button>
        <button
          className="btn btn-ghost btn-xs"
          onClick={zoomFitAll}
          title="Fit all (Cmd+0)"
        >
          ⊞
        </button>
      </div>

      {/* Bar count */}
      <span className="text-[10px] text-base-content/30 font-mono">{totalBars} bars</span>
    </div>
  );
}
