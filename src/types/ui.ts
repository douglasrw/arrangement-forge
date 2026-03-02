// ui.ts — UI state types for selection, tools, and system status.

export type SelectionLevel = 'song' | 'section' | 'block';
export type ToolMode = 'select' | 'split';
export type GenerationState = 'idle' | 'generating' | 'complete';
export type SystemStatus = 'ready' | 'generating' | 'saving' | 'error' | 'offline';

export interface SelectionState {
  level: SelectionLevel;
  sectionId: string | null;
  blockId: string | null;
  stemId: string | null;
}

export interface UiState {
  toolMode: ToolMode;
  generationState: GenerationState;
  systemStatus: SystemStatus;
  errorMessage: string | null;
  mixerExpanded: boolean;
  zoomIndex: number;
  unsavedChanges: boolean;
  lastSavedAt: string | null;
  libraryCount: number;
}
