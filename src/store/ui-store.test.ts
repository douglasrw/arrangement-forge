import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore, ZOOM_STEPS } from './ui-store';

beforeEach(() => {
  useUiStore.setState({
    toolMode: 'select', generationState: 'idle', systemStatus: 'ready',
    errorMessage: null, mixerExpanded: false, zoomIndex: 0,
    unsavedChanges: false, lastSavedAt: null, libraryCount: 0, chordDisplayMode: 'letter',
  });
});

describe('uiStore', () => {
  it('setToolMode updates toolMode', () => {
    useUiStore.getState().setToolMode('split');
    expect(useUiStore.getState().toolMode).toBe('split');
  });

  it('toggleMixer toggles mixerExpanded', () => {
    useUiStore.getState().toggleMixer();
    expect(useUiStore.getState().mixerExpanded).toBe(true);
    useUiStore.getState().toggleMixer();
    expect(useUiStore.getState().mixerExpanded).toBe(false);
  });

  it('zoomIn increments zoomIndex', () => {
    useUiStore.getState().zoomIn();
    expect(useUiStore.getState().zoomIndex).toBe(1);
  });

  it('zoomOut decrements zoomIndex but not below 0', () => {
    useUiStore.getState().zoomOut();
    expect(useUiStore.getState().zoomIndex).toBe(0);
  });

  it('zoomIn stops at max zoom', () => {
    const max = ZOOM_STEPS.length - 1;
    for (let i = 0; i < max + 5; i++) useUiStore.getState().zoomIn();
    expect(useUiStore.getState().zoomIndex).toBe(max);
  });

  it('zoomFitAll resets to 0', () => {
    useUiStore.getState().zoomIn();
    useUiStore.getState().zoomIn();
    useUiStore.getState().zoomFitAll();
    expect(useUiStore.getState().zoomIndex).toBe(0);
  });

  it('markDirty sets unsavedChanges to true', () => {
    useUiStore.getState().markDirty();
    expect(useUiStore.getState().unsavedChanges).toBe(true);
  });

  it('markSaved clears unsavedChanges and sets lastSavedAt', () => {
    useUiStore.getState().markDirty();
    useUiStore.getState().markSaved();
    expect(useUiStore.getState().unsavedChanges).toBe(false);
    expect(useUiStore.getState().lastSavedAt).not.toBeNull();
  });

  it('toggleChordDisplay switches between letter and roman', () => {
    expect(useUiStore.getState().chordDisplayMode).toBe('letter');
    useUiStore.getState().toggleChordDisplay();
    expect(useUiStore.getState().chordDisplayMode).toBe('roman');
    useUiStore.getState().toggleChordDisplay();
    expect(useUiStore.getState().chordDisplayMode).toBe('letter');
  });

  it('setSystemStatus with error message sets both fields', () => {
    useUiStore.getState().setSystemStatus('error', 'Something went wrong');
    expect(useUiStore.getState().systemStatus).toBe('error');
    expect(useUiStore.getState().errorMessage).toBe('Something went wrong');
  });
});
