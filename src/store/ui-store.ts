import { create } from 'zustand';
import type { ToolMode, GenerationState, SystemStatus } from '@/types';

export const ZOOM_STEPS = [1, 1.3, 1.7, 2.2, 3, 4];

interface UiStore {
  toolMode: ToolMode;
  generationState: GenerationState;
  systemStatus: SystemStatus;
  errorMessage: string | null;
  mixerExpanded: boolean;
  zoomIndex: number;
  unsavedChanges: boolean;
  lastSavedAt: string | null;
  libraryCount: number;
  chordDisplayMode: 'letter' | 'roman';

  setToolMode: (mode: ToolMode) => void;
  setGenerationState: (state: GenerationState) => void;
  setSystemStatus: (status: SystemStatus, errorMsg?: string) => void;
  toggleMixer: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomFitAll: () => void;
  markDirty: () => void;
  markSaved: () => void;
  toggleChordDisplay: () => void;
  setChordDisplayMode: (mode: 'letter' | 'roman') => void;
  setLibraryCount: (count: number) => void;
}

export const useUiStore = create<UiStore>()((set) => ({
  toolMode: 'select',
  generationState: 'idle',
  systemStatus: 'ready',
  errorMessage: null,
  mixerExpanded: false,
  zoomIndex: 0,
  unsavedChanges: false,
  lastSavedAt: null,
  libraryCount: 0,
  chordDisplayMode: 'letter',

  setToolMode: (mode) => set({ toolMode: mode }),

  setGenerationState: (state) => set({ generationState: state }),

  setSystemStatus: (status, errorMsg) =>
    set({ systemStatus: status, errorMessage: errorMsg ?? null }),

  toggleMixer: () => set((state) => ({ mixerExpanded: !state.mixerExpanded })),

  zoomIn: () =>
    set((state) => ({ zoomIndex: Math.min(state.zoomIndex + 1, ZOOM_STEPS.length - 1) })),

  zoomOut: () => set((state) => ({ zoomIndex: Math.max(state.zoomIndex - 1, 0) })),

  zoomFitAll: () => set({ zoomIndex: 0 }),

  markDirty: () => set({ unsavedChanges: true }),

  markSaved: () => set({ unsavedChanges: false, lastSavedAt: new Date().toISOString() }),

  toggleChordDisplay: () =>
    set((state) => ({
      chordDisplayMode: state.chordDisplayMode === 'letter' ? 'roman' : 'letter',
    })),

  setChordDisplayMode: (mode) => set({ chordDisplayMode: mode }),

  setLibraryCount: (count) => set({ libraryCount: count }),
}));
