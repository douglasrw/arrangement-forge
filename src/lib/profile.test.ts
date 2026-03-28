import { describe, expect, it } from 'vitest';
import { rowToProfile } from './profile';

describe('rowToProfile', () => {
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
});
