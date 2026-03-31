import type { Profile } from '@/types';
import { GENRES } from '@/lib/genre-config';

const VALID_CHORD_DISPLAY_MODES = new Set<Profile['chordDisplayMode']>(['letter', 'roman']);
const VALID_GENRES = new Set(GENRES);
const SUPPORTED_CHORD_DISPLAY_MODES = ['letter', 'roman'] as const;

function formatSupportedValues(values: readonly string[]): string {
  if (values.length <= 1) {
    return values[0] ?? '';
  }

  if (values.length === 2) {
    return `${values[0]} or ${values[1]}`;
  }

  return `${values.slice(0, -1).join(', ')}, or ${values[values.length - 1]}`;
}

function parseRequiredString(
  value: unknown,
  fieldName: string,
  options?: { allowEmpty?: boolean }
): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid profile ${fieldName}: ${String(value)}`);
  }

  if (options?.allowEmpty !== true && value.length === 0) {
    throw new Error(`Invalid profile ${fieldName}: ${String(value)}`);
  }

  return value;
}

function parseChordDisplayMode(value: unknown): Profile['chordDisplayMode'] {
  if (VALID_CHORD_DISPLAY_MODES.has(value as Profile['chordDisplayMode'])) {
    return value as Profile['chordDisplayMode'];
  }

  throw new Error(
    `Invalid profile chord display mode: ${String(value)}. Supported modes: ${formatSupportedValues(SUPPORTED_CHORD_DISPLAY_MODES)}.`
  );
}

function parseDefaultGenre(value: unknown): string | null {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'string' && VALID_GENRES.has(value)) {
    return value;
  }

  throw new Error(
    `Invalid profile default genre: ${String(value)}. Supported genres: ${formatSupportedValues(GENRES)}.`
  );
}

export function rowToProfile(row: Record<string, unknown>): Profile {
  return {
    id: parseRequiredString(row.id, 'id'),
    displayName: parseRequiredString(row.display_name, 'display name', {
      allowEmpty: true,
    }),
    chordDisplayMode: parseChordDisplayMode(row.chord_display_mode),
    defaultGenre: parseDefaultGenre(row.default_genre),
    createdAt: parseRequiredString(row.created_at, 'created at'),
    updatedAt: parseRequiredString(row.updated_at, 'updated at'),
  };
}
