// Block.tsx — Single bar-block in a stem lane.

import { useProjectStore } from '@/store/project-store';
import { useSelectionStore } from '@/store/selection-store';
import { useUiStore } from '@/store/ui-store';
import { useUndoStore } from '@/store/undo-store';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { Block as BlockType, InstrumentType } from '@/types';
import { useState } from 'react';

const INSTRUMENT_COLORS: Record<InstrumentType, string> = {
  drums:   'bg-warning/20 border-warning/40',
  bass:    'bg-info/20 border-info/40',
  piano:   'bg-primary/20 border-primary/30',
  guitar:  'bg-secondary/20 border-secondary/30',
  strings: 'bg-accent/20 border-accent/30',
};

const INSTRUMENT_COLORS_SELECTED: Record<InstrumentType, string> = {
  drums:   'border-2 border-warning',
  bass:    'border-2 border-info/80',
  piano:   'border-2 border-primary',
  guitar:  'border-2 border-secondary',
  strings: 'border-2 border-accent',
};

interface Props {
  block: BlockType;
  instrument: InstrumentType;
  stemId: string;
  barWidth: number;
}

export function Block({ block, instrument, stemId, barWidth }: Props) {
  const { splitBlock, deleteBlock, duplicateBlock } = useProjectStore();
  const { blockId: selectedBlockId, selectBlock } = useSelectionStore();
  const { toolMode } = useUiStore();
  const { pushUndo } = useUndoStore();
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isSelected = selectedBlockId === block.id;
  const barSpan = block.endBar - block.startBar + 1;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (toolMode === 'split' && barSpan > 1) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const barOffset = Math.round(relX / barWidth);
      const splitBar = block.startBar + Math.max(1, Math.min(barSpan - 1, barOffset));
      const before = JSON.stringify({ blocks: useProjectStore.getState().blocks });
      splitBlock(block.id, splitBar);
      const after = JSON.stringify({ blocks: useProjectStore.getState().blocks });
      pushUndo(`Split ${instrument} block at bar ${splitBar}`, before, after);
    } else {
      selectBlock(block.id, stemId);
    }
  }

  function handleCtxMenu(e: React.MouseEvent) {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }

  function handleDelete() {
    const before = JSON.stringify({ blocks: useProjectStore.getState().blocks });
    deleteBlock(block.id);
    const after = JSON.stringify({ blocks: useProjectStore.getState().blocks });
    pushUndo(`Delete ${instrument} block`, before, after);
    setDeleteOpen(false);
  }

  function handleDuplicate() {
    const before = JSON.stringify({ blocks: useProjectStore.getState().blocks });
    duplicateBlock(block.id);
    const after = JSON.stringify({ blocks: useProjectStore.getState().blocks });
    pushUndo(`Duplicate ${instrument} block`, before, after);
    setCtxMenu(null);
  }

  return (
    <>
      <div
        className={`
          w-full h-full flex flex-col justify-center px-2 rounded border cursor-pointer
          transition-all select-none overflow-hidden relative
          ${isSelected ? INSTRUMENT_COLORS_SELECTED[instrument] : INSTRUMENT_COLORS[instrument]}
          ${toolMode === 'split' && barSpan > 1 ? 'cursor-crosshair' : ''}
        `}
        onClick={handleClick}
        onContextMenu={handleCtxMenu}
        title={block.style}
      >
        <span className="text-[9px] text-base-content/50 truncate leading-tight">{block.style}</span>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} />
          <ul
            className="menu menu-sm bg-base-200 border border-base-300 rounded-box w-40 shadow-lg z-50 fixed"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <li><button onClick={handleDuplicate}>Duplicate</button></li>
            <li><button className="text-error" onClick={() => { setCtxMenu(null); setDeleteOpen(true); }}>Delete</button></li>
          </ul>
        </>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Block?"
        message={`Delete this ${instrument} block?`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}
