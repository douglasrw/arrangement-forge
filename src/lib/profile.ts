import type { Profile } from '@/types';

export function rowToProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    displayName: (row.display_name as string) ?? '',
    chordDisplayMode: (row.chord_display_mode as 'letter' | 'roman') ?? 'letter',
    defaultGenre: (row.default_genre as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
