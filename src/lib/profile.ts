import type { Profile } from '@/types';
import { GENRES, getDefaultProjectStyleTruth } from '@/lib/genre-config';

const VALID_CHORD_DISPLAY_MODES = new Set<Profile['chordDisplayMode']>(['letter', 'roman']);
const VALID_GENRES = new Set(GENRES);
export const SUPPORTED_CHORD_DISPLAY_MODES = ['letter', 'roman'] as const;
const CHORD_DISPLAY_MODE_VALIDATION_TRUTH = SUPPORTED_CHORD_DISPLAY_MODES.map(
  (mode) => `${mode} (${formatChordDisplayModeLabel(mode)})`
);
const DEFAULT_CHORD_DISPLAY_MODE: Profile['chordDisplayMode'] = 'letter';

export type SettingsSelectionTruth = {
  badgeLabel: string;
  badgeVariant: 'outline' | 'secondary';
  detail: string;
};

export function formatChordDisplayModeLabel(mode: Profile['chordDisplayMode']): string {
  return mode === 'roman' ? 'Roman numerals' : 'Letter names';
}

function formatSupportedValues(values: readonly string[]): string {
  if (values.length <= 1) {
    return values[0] ?? '';
  }

  if (values.length === 2) {
    return `${values[0]} or ${values[1]}`;
  }

  return `${values.slice(0, -1).join(', ')}, or ${values[values.length - 1]}`;
}

export function describeSupportedProfileSettingsTruth(): {
  displayName: string;
  chordDisplayModes: string;
  defaultGenres: string;
} {
  return {
    displayName: 'Display names may be left blank and save exactly as entered.',
    chordDisplayModes: formatSupportedValues(CHORD_DISPLAY_MODE_VALIDATION_TRUTH),
    defaultGenres: formatSupportedValues(GENRES),
  };
}

function getSelectionTruth({
  draftValue,
  formatValue,
  profile,
  savedValue,
  valueNoun,
}: {
  draftValue: string | null;
  formatValue: (value: string | null) => string;
  profile: Profile | null;
  savedValue: string | null;
  valueNoun: string;
}): SettingsSelectionTruth {
  const formattedDraftValue = formatValue(draftValue);
  const formattedSavedValue = formatValue(savedValue);

  if (draftValue === savedValue) {
    return {
      badgeLabel: 'Saved selection',
      badgeVariant: 'secondary',
      detail: `${formattedSavedValue} is the saved ${valueNoun} currently selected on this page.`,
    };
  }

  return {
    badgeLabel: 'Pending selection',
    badgeVariant: 'outline',
    detail: `${formattedDraftValue} is selected locally. ${formattedSavedValue} stays saved until you save.`,
  };
}

export function describeChordModeSelectionTruth(
  draftChordMode: Profile['chordDisplayMode'],
  profile: Profile | null
): SettingsSelectionTruth {
  if (!profile && draftChordMode === DEFAULT_CHORD_DISPLAY_MODE) {
    return {
      badgeLabel: 'Default now',
      badgeVariant: 'outline',
      detail: 'Letter names is selected on this page as the default chord display mode until you save a profile.',
    };
  }

  if (!profile) {
    return {
      badgeLabel: 'Pending first save',
      badgeVariant: 'outline',
      detail: `${formatChordDisplayModeLabel(draftChordMode)} is selected locally and will become the saved chord display mode after your first save.`,
    };
  }

  return getSelectionTruth({
    draftValue: draftChordMode,
    formatValue: (value) => formatChordDisplayModeLabel((value as Profile['chordDisplayMode']) ?? DEFAULT_CHORD_DISPLAY_MODE),
    profile,
    savedValue: profile?.chordDisplayMode ?? null,
    valueNoun: 'chord display mode',
  });
}

export function describeDefaultGenreSelectionTruth(
  draftDefaultGenre: string,
  profile: Profile | null
): SettingsSelectionTruth {
  if (!profile && draftDefaultGenre.length === 0) {
    const defaultProjectStyleTruth = getDefaultProjectStyleTruth(null);

    return {
      badgeLabel: 'No default',
      badgeVariant: 'outline',
      detail: `No default genre is selected yet, so new projects currently follow the canonical ${defaultProjectStyleTruth.effectiveGenre} fallback until you choose one and save.`,
    };
  }

  if (!profile) {
    return {
      badgeLabel: 'Pending first save',
      badgeVariant: 'outline',
      detail: `${draftDefaultGenre} is selected locally and will become the saved default genre after your first save.`,
    };
  }

  if (!profile.defaultGenre && draftDefaultGenre.length === 0) {
    const defaultProjectStyleTruth = getDefaultProjectStyleTruth(null);

    return {
      badgeLabel: 'No default',
      badgeVariant: 'secondary',
      detail: `No default genre is saved, so new projects still start as ${defaultProjectStyleTruth.effectiveGenre} with ${defaultProjectStyleTruth.effectiveSubStyle}.`,
    };
  }

  return getSelectionTruth({
    draftValue: draftDefaultGenre || null,
    formatValue: (value) => value ?? 'No default genre',
    profile,
    savedValue: profile?.defaultGenre ?? null,
    valueNoun: 'default genre',
  });
}

export function describeSavedProfilePresenceTruth(profile: Profile | null): {
  currentState: string;
  nextStep: string;
} {
  if (profile) {
    return {
      currentState: 'Saved profile settings are loaded on this page.',
      nextStep: 'Edit any field to create a local change, then save when ready.',
    };
  }

  return {
    currentState: 'No saved profile settings exist yet.',
    nextStep: 'Your first save here will create profile settings for future sessions.',
  };
}

export type SettingsProfileFailureKind =
  | 'save-rejected'
  | 'missing-saved-row'
  | 'invalid-saved-row';

export function describeSettingsProfileFailureTruth({
  detail,
  hasSavedProfile,
  kind,
}: {
  detail: string;
  hasSavedProfile: boolean;
  kind: SettingsProfileFailureKind;
}): {
  currentState: string;
  nextStep: string;
  title: string;
} {
  if (kind === 'save-rejected') {
    return {
      title: 'Settings save failed',
      currentState: `The profile save request failed: ${detail}`,
      nextStep: hasSavedProfile
        ? 'Your last confirmed saved settings remain loaded. Fix the save failure, then try saving these pending changes again.'
        : 'These settings are still local only. Fix the save failure, then try saving again to create a saved profile.',
    };
  }

  if (kind === 'missing-saved-row') {
    return {
      title: 'Saved profile could not be confirmed',
      currentState: detail,
      nextStep: hasSavedProfile
        ? 'Your last confirmed saved settings remain loaded. Retry the save until the persisted profile row comes back for validation.'
        : 'These settings are still local only. Retry the save until the persisted profile row comes back for validation.',
    };
  }

  return {
    title: 'Saved profile row was invalid',
    currentState: detail,
    nextStep: hasSavedProfile
      ? 'Your last confirmed saved settings remain loaded. Fix the returned profile data, then save again so Settings can load confirmed saved values.'
      : 'These settings are still local only. Fix the returned profile data, then save again so Settings can load confirmed saved values.',
  };
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
    `Invalid profile chord display mode: ${String(value)}. Supported modes: ${formatSupportedValues(CHORD_DISPLAY_MODE_VALIDATION_TRUTH)}.`
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
