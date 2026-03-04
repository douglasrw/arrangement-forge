// useAutoSave.ts — Debounced auto-save and tab-close protection.

import { useEffect, useRef } from 'react';
import { useUiStore } from '@/store/ui-store';
import { useProject } from '@/hooks/useProject';

const AUTO_SAVE_DELAY_MS = 30_000; // 30 seconds after first unsaved change

export function useAutoSave() {
  const unsavedChanges = useUiStore((s) => s.unsavedChanges);
  const generationState = useUiStore((s) => s.generationState);
  const { saveProject } = useProject();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save
  useEffect(() => {
    if (!unsavedChanges) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (generationState === 'generating') {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      const currentState = useUiStore.getState();
      if (currentState.unsavedChanges && currentState.generationState !== 'generating') {
        void saveProject();
      }
      timerRef.current = null;
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [unsavedChanges, generationState, saveProject]);

  // beforeunload: warn user if there are unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (useUiStore.getState().unsavedChanges) {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
}
