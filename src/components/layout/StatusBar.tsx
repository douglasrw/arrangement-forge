// StatusBar.tsx — Bottom status bar with 5 elements.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '@/store/ui-store';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 10) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const STATUS_STYLES: Record<string, { dot: string; text: string; pulse: boolean }> = {
  ready:      { dot: 'bg-success', text: 'Ready', pulse: false },
  generating: { dot: 'bg-warning', text: 'Generating...', pulse: true },
  saving:     { dot: 'bg-warning', text: 'Saving...', pulse: false },
  error:      { dot: 'bg-error', text: 'Error', pulse: false },
  offline:    { dot: 'bg-base-content/30', text: 'Offline', pulse: false },
};

const SHORTCUTS = [
  ['Space', 'Play / Pause', '←  →', 'Prev / Next block'],
  ['⌘↵', 'Generate', '↑  ↓', 'Lane up / down'],
  ['⌘S', 'Save', 'V', 'Select mode'],
  ['⌘Z', 'Undo', 'S', 'Split mode'],
  ['⌘⇧Z', 'Redo', 'M', 'Toggle mixer'],
  ['⌘+', 'Zoom in', 'D', 'Duplicate block'],
  ['⌘-', 'Zoom out', 'Delete', 'Delete block'],
  ['⌘0', 'Fit all', 'Esc', 'Deselect'],
  ['⌘K', 'This panel', '', ''],
];

export function StatusBar() {
  const { systemStatus, errorMessage, unsavedChanges, lastSavedAt, libraryCount } = useUiStore();
  const navigate = useNavigate();
  const [_, setTick] = useState(0);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [errorToast, setErrorToast] = useState(false);

  // Update relative time every 30s
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Open shortcuts on Cmd+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const status = STATUS_STYLES[systemStatus] ?? STATUS_STYLES.ready;

  function handleLibraryClick() {
    if (unsavedChanges) {
      setLeaveOpen(true);
    } else {
      navigate('/library');
    }
  }

  return (
    <>
      <div className="h-8 bg-base-300/60 border-t border-base-300 flex items-center px-4 gap-6 text-xs shrink-0">
        {/* Library count */}
        <button
          className="text-base-content/50 hover:text-base-content transition-colors cursor-pointer flex gap-1"
          onClick={handleLibraryClick}
        >
          Library: <strong className="text-base-content">{libraryCount}</strong> tracks
        </button>

        {/* Status indicator */}
        <div
          className={`flex items-center gap-1.5 ${systemStatus === 'error' ? 'cursor-pointer' : ''}`}
          onClick={systemStatus === 'error' ? () => setErrorToast(true) : undefined}
        >
          <span className={`w-2 h-2 rounded-full ${status.dot} ${status.pulse ? 'animate-pulse' : ''}`} />
          <span className="text-base-content/50">{status.text}</span>
        </div>

        {/* Saved time */}
        <span className="text-base-content/30">
          {unsavedChanges ? 'Unsaved changes' : `Saved: ${relativeTime(lastSavedAt)}`}
        </span>

        <div className="flex-1" />

        {/* Help dropdown */}
        <div className="dropdown dropdown-top dropdown-end">
          <button tabIndex={0} className="text-base-content/40 hover:text-base-content transition-colors">
            ? Help
          </button>
          <ul tabIndex={0} className="dropdown-content menu menu-sm bg-base-200 border border-base-300 rounded-box w-52 p-1 mb-1 shadow-lg">
            <li>
              <button onClick={() => setShortcutsOpen(true)} className="text-xs">
                Keyboard Shortcuts <kbd className="kbd kbd-xs">⌘?</kbd>
              </button>
            </li>
            <li><a className="text-xs text-base-content/40 pointer-events-none">Quick Start Guide</a></li>
            <li className="divider my-0" />
            <li><a className="text-xs" target="_blank" rel="noreferrer">Documentation ↗</a></li>
            <li><a className="text-xs" target="_blank" rel="noreferrer">Report an Issue ↗</a></li>
          </ul>
        </div>

        {/* Cmd+K hint */}
        <kbd className="kbd kbd-xs text-base-content/30" title="Keyboard shortcuts">⌘K</kbd>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {shortcutsOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-sm text-base-content mb-4 tracking-widest uppercase">
              Keyboard Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
              {SHORTCUTS.map(([k1, v1, k2, v2], i) => (
                <div key={i} className="contents">
                  <div className="flex items-center gap-2 py-0.5">
                    {k1 && <kbd className="kbd kbd-xs">{k1}</kbd>}
                    <span className="text-base-content/60">{v1}</span>
                  </div>
                  <div className="flex items-center gap-2 py-0.5">
                    {k2 && <kbd className="kbd kbd-xs">{k2}</kbd>}
                    <span className="text-base-content/60">{v2}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-action mt-4">
              <button className="btn btn-ghost btn-sm" onClick={() => setShortcutsOpen(false)}>Close</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShortcutsOpen(false)} />
        </dialog>
      )}

      {/* Error Toast */}
      {errorToast && errorMessage && (
        <div className="toast toast-end z-50">
          <div className="alert alert-error text-sm">
            <span>{errorMessage}</span>
            <button className="btn btn-ghost btn-xs" onClick={() => setErrorToast(false)}>✕</button>
          </div>
        </div>
      )}

      {/* Leave confirmation */}
      <ConfirmDialog
        open={leaveOpen}
        title="Leave project?"
        message="You have unsaved changes. Leave without saving?"
        confirmLabel="Discard & Leave"
        cancelLabel="Stay"
        danger
        onConfirm={() => { setLeaveOpen(false); navigate('/library'); }}
        onCancel={() => setLeaveOpen(false)}
      />
    </>
  );
}
