import { describe, it, expect, beforeEach } from 'vitest';

// Test the underlying store behavior that the hook depends on.
// Since we can't test hooks directly without @testing-library/react,
// test the store prerequisites.

import { useUiStore } from '@/store/ui-store';

describe('auto-save prerequisites', () => {
  beforeEach(() => {
    useUiStore.setState({
      unsavedChanges: false,
      generationState: 'idle' as any,
    });
  });

  it('markDirty sets unsavedChanges to true', () => {
    useUiStore.getState().markDirty();
    expect(useUiStore.getState().unsavedChanges).toBe(true);
  });

  it('markSaved sets unsavedChanges to false', () => {
    useUiStore.getState().markDirty();
    useUiStore.getState().markSaved();
    expect(useUiStore.getState().unsavedChanges).toBe(false);
  });
});
