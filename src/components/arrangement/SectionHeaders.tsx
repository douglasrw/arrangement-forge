// SectionHeaders.tsx — Clickable section header row, proportional bar widths.

import { useState } from 'react';
import { useProjectStore } from '@/store/project-store';
import { useSelectionStore } from '@/store/selection-store';
import { useUndoStore } from '@/store/undo-store';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

const GUTTER_WIDTH = 80;

export function SectionHeaders() {
  const { sections, addSection, removeSection } = useProjectStore();
  const { sectionId: selectedSectionId, selectSection, selectSong } = useSelectionStore();
  const { pushUndo } = useUndoStore();
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; sectionId: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const [newName, setNewName] = useState('New Section');
  const [newBarCount, setNewBarCount] = useState(4);

  const sorted = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);

  function handleCtxMenu(e: React.MouseEvent, sectionId: string) {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, sectionId });
  }

  function closeCtxMenu() { setCtxMenu(null); }

  function handleDelete(sectionId: string) {
    if (sections.length <= 1) return;
    const before = JSON.stringify({ sections });
    removeSection(sectionId);
    const after = JSON.stringify({ sections: useProjectStore.getState().sections });
    pushUndo('Delete section', before, after);
    setDeleteTarget(null);
    selectSong();
  }

  function handleAddSection() {
    const maxSort = sections.reduce((max, s) => Math.max(max, s.sortOrder), 0);
    const lastSection = sorted[sorted.length - 1];
    const startBar = lastSection ? lastSection.startBar + lastSection.barCount : 1;
    const before = JSON.stringify({ sections });
    addSection({
      id: crypto.randomUUID(),
      projectId: sections[0]?.projectId ?? '',
      name: newName,
      sortOrder: maxSort + 1,
      barCount: newBarCount,
      startBar,
      energyOverride: null, grooveOverride: null, swingPctOverride: null, dynamicsOverride: null,
      createdAt: new Date().toISOString(),
    });
    const after = JSON.stringify({ sections: useProjectStore.getState().sections });
    pushUndo(`Add section "${newName}"`, before, after);
    setAddingSection(false);
    setNewName('New Section');
    setNewBarCount(4);
  }

  return (
    <div className="flex border-b border-base-300 bg-base-200">
      {/* Gutter spacer */}
      <div style={{ width: GUTTER_WIDTH }} className="shrink-0 flex items-center justify-center">
        <span className="text-[9px] text-base-content/20 uppercase tracking-wider">Sect</span>
      </div>

      {/* Section headers */}
      <div className="flex flex-1 min-w-0">
        {sorted.map((section) => {
          const isSelected = section.id === selectedSectionId;
          return (
            <div
              key={section.id}
              style={{ flex: section.barCount, minWidth: 60 }}
              className={`h-11 flex flex-col justify-center px-2 border-r border-base-300 cursor-pointer select-none transition-colors
                ${isSelected
                  ? 'bg-neutral/20 border-2 border-base-content/30 text-base-content font-bold'
                  : 'text-base-content/50 hover:border-base-content/20'
                }`}
              onClick={() => isSelected ? selectSong() : selectSection(section.id)}
              onContextMenu={(e) => handleCtxMenu(e, section.id)}
            >
              <span className="text-[11px] font-semibold truncate">{section.name}</span>
              <span className="text-[9px] opacity-60">{section.barCount} bars</span>
            </div>
          );
        })}

        {/* Add section button */}
        {!addingSection ? (
          <button
            className="w-8 shrink-0 flex items-center justify-center text-base-content/30 hover:text-base-content/70 transition-colors text-lg"
            onClick={() => setAddingSection(true)}
            title="Add section"
          >
            +
          </button>
        ) : (
          <div className="flex items-center gap-1 px-2 shrink-0">
            <input
              autoFocus
              type="text"
              className="input input-xs input-bordered w-24"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              type="number"
              className="input input-xs input-bordered w-12"
              min={1} max={64}
              value={newBarCount}
              onChange={(e) => setNewBarCount(Math.max(1, parseInt(e.target.value) || 4))}
            />
            <button className="btn btn-xs btn-primary" onClick={handleAddSection}>Add</button>
            <button className="btn btn-xs btn-ghost" onClick={() => setAddingSection(false)}>✕</button>
          </div>
        )}
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeCtxMenu} />
          <ul
            className="menu menu-sm bg-base-200 border border-base-300 rounded-box w-44 shadow-lg z-50 fixed"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <li><button onClick={() => { selectSection(ctxMenu.sectionId); closeCtxMenu(); }}>Rename…</button></li>
            <li className="divider my-0" />
            <li>
              <button
                className="text-error"
                onClick={() => { setDeleteTarget(ctxMenu.sectionId); closeCtxMenu(); }}
                disabled={sections.length <= 1}
              >
                Delete
              </button>
            </li>
          </ul>
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Section?"
        message={`Delete "${sections.find(s => s.id === deleteTarget)?.name}"? All blocks in this section will be removed.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
