import { describe, expect, it } from 'vitest';
import {
  describeChordModeSelectionTruth,
  describeDefaultGenreSelectionTruth,
  describeSettingsProfileFailureTruth,
  describeSavedProfilePresenceTruth,
  describeSupportedProfileSettingsTruth,
  formatChordDisplayModeLabel,
  rowToProfile,
} from './profile';

describe('rowToProfile', () => {
  it('formats saved chord display mode labels for settings truth surfaces', () => {
    expect(formatChordDisplayModeLabel('letter')).toBe('Letter names');
    expect(formatChordDisplayModeLabel('roman')).toBe('Roman numerals');
  });

  it('describes the current saved profile settings truth for each editable field', () => {
    expect(describeSupportedProfileSettingsTruth()).toEqual({
      displayName: 'Display names may be left blank and save exactly as entered.',
      chordDisplayModes: 'letter (Letter names) or roman (Roman numerals)',
      defaultGenres: 'Jazz, Blues, Rock, Funk, Country, Gospel, R&B, Latin, or Pop',
    });
  });

  it('describes whether saved profile settings are already present on the page', () => {
    expect(
      describeSavedProfilePresenceTruth({
        id: 'profile-1',
        displayName: 'Doug',
        chordDisplayMode: 'letter',
        defaultGenre: 'Jazz',
        createdAt: '2026-03-28T00:00:00Z',
        updatedAt: '2026-03-28T01:00:00Z',
      })
    ).toEqual({
      currentState: 'Saved profile settings are loaded on this page.',
      nextStep: 'Edit any field to create a local change, then save when ready.',
    });

    expect(describeSavedProfilePresenceTruth(null)).toEqual({
      currentState: 'No saved profile settings exist yet.',
      nextStep: 'Your first save here will create profile settings for future sessions.',
    });
  });

  it('describes whether chord mode is saved, pending, or just the unsaved default selection', () => {
    expect(
      describeChordModeSelectionTruth('letter', null)
    ).toEqual({
      badgeLabel: 'Default now',
      badgeVariant: 'outline',
      detail: 'Letter names is selected on this page as the default chord display mode until you save a profile.',
    });

    expect(
      describeChordModeSelectionTruth(
        'roman',
        {
          id: 'profile-1',
          displayName: 'Doug',
          chordDisplayMode: 'letter',
          defaultGenre: 'Jazz',
          createdAt: '2026-03-28T00:00:00Z',
          updatedAt: '2026-03-28T01:00:00Z',
        }
      )
    ).toEqual({
      badgeLabel: 'Pending selection',
      badgeVariant: 'outline',
      detail: 'Roman numerals is selected locally. Letter names stays saved until you save.',
    });
  });

  it('describes whether default genre is saved, pending, or still unset', () => {
    expect(
      describeDefaultGenreSelectionTruth('', null)
    ).toEqual({
      badgeLabel: 'No default',
      badgeVariant: 'outline',
      detail: 'No default genre is selected yet, so new projects stay unset until you choose one and save.',
    });

    expect(
      describeDefaultGenreSelectionTruth(
        '',
        {
          id: 'profile-1',
          displayName: 'Doug',
          chordDisplayMode: 'letter',
          defaultGenre: 'Jazz',
          createdAt: '2026-03-28T00:00:00Z',
          updatedAt: '2026-03-28T01:00:00Z',
        }
      )
    ).toEqual({
      badgeLabel: 'Pending selection',
      badgeVariant: 'outline',
      detail: 'No default genre is selected locally. Jazz stays saved until you save.',
    });
  });

  it('describes save and validation failures with an explicit next step', () => {
    expect(
      describeSettingsProfileFailureTruth({
        detail: 'new row violates row-level security policy for table "profiles"',
        hasSavedProfile: true,
        kind: 'save-rejected',
      })
    ).toEqual({
      title: 'Settings save failed',
      currentState:
        'The profile save request failed: new row violates row-level security policy for table "profiles"',
      nextStep:
        'Your last confirmed saved settings remain loaded. Fix the save failure, then try saving these pending changes again.',
    });

    expect(
      describeSettingsProfileFailureTruth({
        detail: 'Profile save succeeded but no persisted profile row was returned.',
        hasSavedProfile: true,
        kind: 'missing-saved-row',
      })
    ).toEqual({
      title: 'Saved profile could not be confirmed',
      currentState: 'Profile save succeeded but no persisted profile row was returned.',
      nextStep:
        'Your last confirmed saved settings remain loaded. Retry the save until the persisted profile row comes back for validation.',
    });

    expect(
      describeSettingsProfileFailureTruth({
        detail: 'Invalid profile chord display mode: solfege.',
        hasSavedProfile: true,
        kind: 'invalid-saved-row',
      })
    ).toEqual({
      title: 'Saved profile row was invalid',
      currentState: 'Invalid profile chord display mode: solfege.',
      nextStep:
        'Your last confirmed saved settings remain loaded. Fix the returned profile data, then save again so Settings can load confirmed saved values.',
    });
  });

  it('maps a Supabase profile row into the shared Profile shape', () => {
    expect(
      rowToProfile({
        id: 'profile-1',
        display_name: 'Doug',
        chord_display_mode: 'roman',
        default_genre: 'Funk',
        created_at: '2026-03-28T00:00:00Z',
        updated_at: '2026-03-28T01:00:00Z',
      })
    ).toEqual({
      id: 'profile-1',
      displayName: 'Doug',
      chordDisplayMode: 'roman',
      defaultGenre: 'Funk',
      createdAt: '2026-03-28T00:00:00Z',
      updatedAt: '2026-03-28T01:00:00Z',
    });
  });

  it('normalizes missing default genre to null', () => {
    expect(
      rowToProfile({
        id: 'profile-2',
        display_name: 'Ashlyn',
        chord_display_mode: 'letter',
        default_genre: null,
        created_at: '2026-03-28T00:00:00Z',
        updated_at: '2026-03-28T01:00:00Z',
      })
    ).toEqual({
      id: 'profile-2',
      displayName: 'Ashlyn',
      chordDisplayMode: 'letter',
      defaultGenre: null,
      createdAt: '2026-03-28T00:00:00Z',
      updatedAt: '2026-03-28T01:00:00Z',
    });
  });

  it('normalizes blank default genre to null', () => {
    expect(
      rowToProfile({
        id: 'profile-3',
        display_name: 'Ashlyn',
        chord_display_mode: 'letter',
        default_genre: '',
        created_at: '2026-03-28T00:00:00Z',
        updated_at: '2026-03-28T01:00:00Z',
      })
    ).toEqual({
      id: 'profile-3',
      displayName: 'Ashlyn',
      chordDisplayMode: 'letter',
      defaultGenre: null,
      createdAt: '2026-03-28T00:00:00Z',
      updatedAt: '2026-03-28T01:00:00Z',
    });
  });

  it('rejects unsupported chord display modes instead of inventing a saved setting', () => {
    expect(() =>
      rowToProfile({
        id: 'profile-4',
        display_name: 'Ashlyn',
        chord_display_mode: 'solfege',
        default_genre: 'Pop',
        created_at: '2026-03-28T00:00:00Z',
        updated_at: '2026-03-28T01:00:00Z',
      })
    ).toThrow(
      'Invalid profile chord display mode: solfege. Supported modes: letter (Letter names) or roman (Roman numerals).'
    );
  });

  it('rejects unsupported default genres instead of treating them as saved truth', () => {
    expect(() =>
      rowToProfile({
        id: 'profile-5',
        display_name: 'Ashlyn',
        chord_display_mode: 'letter',
        default_genre: 'Trap Metal',
        created_at: '2026-03-28T00:00:00Z',
        updated_at: '2026-03-28T01:00:00Z',
      })
    ).toThrow(
      'Invalid profile default genre: Trap Metal. Supported genres: Jazz, Blues, Rock, Funk, Country, Gospel, R&B, Latin, or Pop.'
    );
  });

  it('rejects malformed required profile fields instead of coercing them into saved truth', () => {
    expect(() =>
      rowToProfile({
        id: '',
        display_name: 'Ashlyn',
        chord_display_mode: 'letter',
        default_genre: 'Pop',
        created_at: '2026-03-28T00:00:00Z',
        updated_at: '2026-03-28T01:00:00Z',
      })
    ).toThrow('Invalid profile id: ');

    expect(() =>
      rowToProfile({
        id: 'profile-6',
        display_name: 'Ashlyn',
        chord_display_mode: 'letter',
        default_genre: 'Pop',
        created_at: null,
        updated_at: '2026-03-28T01:00:00Z',
      })
    ).toThrow('Invalid profile created at: null');
  });
});
