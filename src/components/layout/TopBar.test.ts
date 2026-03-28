import { describe, expect, it } from 'vitest';
import {
  normalizeProjectNameDraft,
  reconcileProjectNameDraft,
} from './TopBar';

describe('TopBar project-name draft reconciliation', () => {
  it('refreshes the draft from external project updates when editing is inactive', () => {
    const reconciled = reconcileProjectNameDraft(
      'Local draft',
      'Renamed from store',
      false
    );

    expect(reconciled).toBe('Renamed from store');
  });

  it('preserves the local draft while editing even if the external project name changes', () => {
    const reconciled = reconcileProjectNameDraft(
      'Keep my in-progress rename',
      'External rename',
      true
    );

    expect(reconciled).toBe('Keep my in-progress rename');
  });

  it('trims committed project names', () => {
    expect(normalizeProjectNameDraft('  Midnight Waltz  ')).toBe('Midnight Waltz');
  });

  it('falls back to Untitled Project for blank committed names', () => {
    expect(normalizeProjectNameDraft('   ')).toBe('Untitled Project');
  });
});
