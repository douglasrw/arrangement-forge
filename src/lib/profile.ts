import type { Profile } from '@/types';
import { GENRES } from '@/lib/genre-config';

const VALID_CHORD_DISPLAY_MODES = new Set<Profile['chordDisplayMode']>(['letter', 'roman']);
const VALID_GENRES = new Set(GENRES);

function parseChordDisplayMode(value: unknown): Profile['chordDisplayMode'] {
  if (VALID_CHORD_DISPLAY_MODES.has(value as Profile['chordDisplayMode'])) {
    return value as Profile['chordDisplayMode'];
  }

  throw new Error(`Invalid profile chord display mode: ${String(value)}`);
}

function parseDefaultGenre(value: unknown): string | null {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'string' && VALID_GENRES.has(value)) {
    return value;
  }

  throw new Error(`Invalid profile default genre: ${String(value)}`);
}

export function rowToProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    displayName: (row.display_name as string) ?? '',
    chordDisplayMode: parseChordDisplayMode(row.chord_display_mode),
    defaultGenre: parseDefaultGenre(row.default_genre),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
