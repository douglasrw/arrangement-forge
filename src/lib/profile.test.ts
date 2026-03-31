import { describe, expect, it } from 'vitest';
import {
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
