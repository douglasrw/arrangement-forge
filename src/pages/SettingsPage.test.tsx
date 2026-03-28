import { describe, expect, it } from 'vitest';
import type { Profile } from '@/types';
import {
  applySavedProfile,
  createSettingsDraft,
  reconcileSettingsDraft,
  type SettingsDraft,
} from './SettingsPage';

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'profile-1',
    displayName: 'Doug',
    chordDisplayMode: 'letter',
    defaultGenre: 'Jazz',
    createdAt: '2026-03-27T00:00:00Z',
    updatedAt: '2026-03-27T00:00:00Z',
    ...overrides,
  };
}

describe('SettingsPage draft reconciliation', () => {
  it('creates the initial draft from profile props', () => {
    const draft = createSettingsDraft(makeProfile());

    expect(draft).toEqual({
      profileId: 'profile-1',
      displayName: 'Doug',
      chordMode: 'letter',
      defaultGenre: 'Jazz',
      touchedFields: {
        displayName: false,
        chordMode: false,
        defaultGenre: false,
      },
    });
  });

  it('refreshes untouched fields while preserving local draft wins on the same profile', () => {
    const initialDraft = createSettingsDraft(makeProfile());
    const locallyEditedDraft: SettingsDraft = {
      ...initialDraft,
      displayName: 'Local Draft Name',
      touchedFields: {
        ...initialDraft.touchedFields,
        displayName: true,
      },
    };

    const reconciled = reconcileSettingsDraft(
      locallyEditedDraft,
      makeProfile({
        displayName: 'Remote Rename',
        chordDisplayMode: 'roman',
        defaultGenre: 'Funk',
        updatedAt: '2026-03-27T01:00:00Z',
      })
    );

    expect(reconciled.displayName).toBe('Local Draft Name');
    expect(reconciled.chordMode).toBe('roman');
    expect(reconciled.defaultGenre).toBe('Funk');
    expect(reconciled.touchedFields).toEqual({
      displayName: true,
      chordMode: false,
      defaultGenre: false,
    });
  });

  it('resets the draft when a different profile arrives', () => {
    const initialDraft = createSettingsDraft(makeProfile());
    const locallyEditedDraft: SettingsDraft = {
      ...initialDraft,
      displayName: 'Keep me only for the old profile',
      chordMode: 'roman',
      defaultGenre: '',
      touchedFields: {
        displayName: true,
        chordMode: true,
        defaultGenre: true,
      },
    };

    const reconciled = reconcileSettingsDraft(
      locallyEditedDraft,
      makeProfile({
        id: 'profile-2',
        displayName: 'Ashlyn',
        chordDisplayMode: 'roman',
        defaultGenre: 'Pop',
      })
    );

    expect(reconciled).toEqual({
      profileId: 'profile-2',
      displayName: 'Ashlyn',
      chordMode: 'roman',
      defaultGenre: 'Pop',
      touchedFields: {
        displayName: false,
        chordMode: false,
        defaultGenre: false,
      },
    });
  });

  it('refreshes the draft from the saved profile while clearing touched fields', () => {
    const initialDraft = createSettingsDraft(makeProfile());
    const locallyEditedDraft: SettingsDraft = {
      ...initialDraft,
      displayName: 'Saved Name',
      chordMode: 'roman',
      defaultGenre: 'Funk',
      touchedFields: {
        displayName: true,
        chordMode: true,
        defaultGenre: true,
      },
    };

    const updated = applySavedProfile(
      locallyEditedDraft,
      makeProfile({
        displayName: 'Saved Name',
        chordDisplayMode: 'roman',
        defaultGenre: 'Funk',
        updatedAt: '2026-03-28T01:00:00Z',
      })
    );

    expect(updated).toEqual({
      profileId: 'profile-1',
      displayName: 'Saved Name',
      chordMode: 'roman',
      defaultGenre: 'Funk',
      touchedFields: {
        displayName: false,
        chordMode: false,
        defaultGenre: false,
      },
    });
  });
});
