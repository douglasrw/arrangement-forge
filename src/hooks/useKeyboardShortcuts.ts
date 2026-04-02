// useKeyboardShortcuts.ts — Global keyboard shortcut handler.

import { useEffect } from 'react';
import { useUiStore } from '@/store/ui-store';
import { useSelectionStore } from '@/store/selection-store';
import { useProjectStore } from '@/store/project-store';
import { useUndoStore } from '@/store/undo-store';
import { useProject } from '@/hooks/useProject';

export const KEYBOARD_SHORTCUT_BUTTON_ID = 'topbar-shortcuts-button';

export const KEYBOARD_SHORTCUT_SECTIONS = [
  {
    heading: 'Project',
    shortcuts: [
      { keys: 'Ctrl/Cmd+S', action: 'Save project' },
      { keys: 'Ctrl/Cmd+Z', action: 'Undo last change' },
      { keys: 'Ctrl/Cmd+Shift+Z', action: 'Redo last change' },
      { keys: 'Ctrl/Cmd+Enter', action: 'Run generation' },
    ],
  },
  {
    heading: 'View',
    shortcuts: [
      { keys: 'Ctrl/Cmd++', action: 'Zoom in' },
      { keys: 'Ctrl/Cmd+-', action: 'Zoom out' },
      { keys: 'Ctrl/Cmd+0', action: 'Fit all blocks' },
      { keys: 'Ctrl/Cmd+K', action: 'Open this shortcut guide' },
    ],
  },
  {
    heading: 'Selection',
    shortcuts: [
      { keys: 'Arrow keys', action: 'Move block selection' },
      { keys: 'Escape', action: 'Clear selection' },
      { keys: 'V', action: 'Select tool' },
      { keys: 'S', action: 'Split tool' },
      { keys: 'M', action: 'Toggle mixer' },
      { keys: 'D', action: 'Duplicate selected block' },
      { keys: 'Delete / Backspace', action: 'Delete selected block' },
    ],
  },
] as const;

function isInputFocused(): boolean {
  const el = document.activeElement;
  return el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    (el instanceof HTMLElement && el.isContentEditable);
}

function isMod(e: KeyboardEvent): boolean {
  return e.metaKey || e.ctrlKey;
}

export function openKeyboardShortcutsGuide(): boolean {
  const shortcutButton = document.getElementById(KEYBOARD_SHORTCUT_BUTTON_ID);

  if (!(shortcutButton instanceof HTMLButtonElement)) {
    return false;
  }

  shortcutButton.click();
  return true;
}

export function useKeyboardShortcuts() {
  const { setToolMode, toggleMixer, zoomIn, zoomOut, zoomFitAll, generationState } = useUiStore();
  const { clearSelection, selectNextBlock, selectPrevBlock, selectBlockAbove, selectBlockBelow } = useSelectionStore();
  const { blockId } = useSelectionStore();
  const { deleteBlock, duplicateBlock } = useProjectStore();
  const { undo, redo } = useUndoStore();
  const { saveProject } = useProject();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+S — save
      if (isMod(e) && e.key === 's') {
        e.preventDefault();
        saveProject();
        return;
      }

      // Cmd+Z — undo
      if (isMod(e) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        const transition = undo(generationState);
        if (transition?.restoreSnapshot) {
          useProjectStore.getState().setArrangement(transition.restoreSnapshot);
        }
        return;
      }

      // Cmd+Shift+Z — redo
      if (isMod(e) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        const transition = redo(generationState);
        if (transition?.restoreSnapshot) {
          useProjectStore.getState().setArrangement(transition.restoreSnapshot);
        }
        return;
      }

      // Cmd++ — zoom in
      if (isMod(e) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
        return;
      }

      // Cmd+- — zoom out
      if (isMod(e) && e.key === '-') {
        e.preventDefault();
        zoomOut();
        return;
      }

      // Cmd+0 — fit all
      if (isMod(e) && e.key === '0') {
        e.preventDefault();
        zoomFitAll();
        return;
      }

      // Cmd+Enter — generate
      if (isMod(e) && e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('generate-btn')?.click();
        return;
      }

      // Cmd+K — keyboard shortcuts
      if (isMod(e) && e.key === 'k') {
        e.preventDefault();
        openKeyboardShortcutsGuide();
        return;
      }

      // Arrow keys — block navigation
      if (!isMod(e) && !isInputFocused()) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); selectPrevBlock(); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); selectNextBlock(); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); selectBlockAbove(); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); selectBlockBelow(); return; }
        if (e.key === 'Escape') { e.preventDefault(); clearSelection(); return; }
      }

      // Single-key shortcuts (skip if typing)
      if (isInputFocused()) return;

      if (e.key === 'v' || e.key === 'V') { setToolMode('select'); return; }
      if (e.key === 's' || e.key === 'S') { setToolMode('split'); return; }
      if (e.key === 'm' || e.key === 'M') { toggleMixer(); return; }

      if ((e.key === 'Delete' || e.key === 'Backspace') && blockId) {
        e.preventDefault();
        deleteBlock(blockId);
        return;
      }

      if ((e.key === 'd' || e.key === 'D') && blockId) {
        duplicateBlock(blockId);
        return;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    setToolMode, toggleMixer, zoomIn, zoomOut, zoomFitAll,
    clearSelection, selectNextBlock, selectPrevBlock, selectBlockAbove, selectBlockBelow,
    deleteBlock, duplicateBlock, blockId, undo, redo,
    saveProject, generationState,
  ]);
}
