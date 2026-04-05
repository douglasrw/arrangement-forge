import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  describeChordModeSelectionTruth,
  describeDefaultGenreSelectionTruth,
  describeSettingsProfileFailureTruth,
  describeSavedProfilePresenceTruth,
  describeSupportedProfileSettingsTruth,
  formatChordDisplayModeLabel,
  rowToProfile,
} from '@/lib/profile';
import { cn } from '@/lib/utils';
import { getAuthTruth, useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';
import { GENRES, getDefaultProjectStyleTruth } from '@/lib/genre-config';
import type { Profile } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

type SettingsField = 'displayName' | 'chordMode' | 'defaultGenre';

const EDITABLE_SETTINGS: SettingsField[] = ['displayName', 'chordMode', 'defaultGenre'];

const SETTINGS_FIELD_LABELS: Record<SettingsField, string> = {
  displayName: 'Display Name',
  chordMode: 'Chord Display Mode',
  defaultGenre: 'Default Genre',
};

export interface SettingsDraft {
  profileId: string | null;
  displayName: string;
  chordMode: 'letter' | 'roman';
  defaultGenre: string;
  touchedFields: Record<SettingsField, boolean>;
}

const EMPTY_TOUCHED_FIELDS: Record<SettingsField, boolean> = {
  displayName: false,
  chordMode: false,
  defaultGenre: false,
};

const UNAVAILABLE_SETTINGS = [
  {
    title: 'Audio Output Device',
    summary: 'Playback follows your browser or system default output device.',
    detail: 'Device selection is not available in Settings yet.',
  },
  {
    title: 'Auto-Save Interval',
    summary: 'Projects auto-save after 30 seconds of unsaved changes.',
    detail: 'The auto-save timing is fixed in this build.',
  },
  {
    title: 'Theme',
    summary: 'Arrangement Forge uses one built-in theme.',
    detail: 'Theme switching is not available in this build.',
  },
] as const;

export function createSettingsDraft(profile: Profile | null): SettingsDraft {
  return {
    profileId: profile?.id ?? null,
    displayName: profile?.displayName ?? '',
    chordMode: profile?.chordDisplayMode ?? 'letter',
    defaultGenre: profile?.defaultGenre ?? '',
    touchedFields: { ...EMPTY_TOUCHED_FIELDS },
  };
}

export function reconcileSettingsDraft(
  currentDraft: SettingsDraft,
  profile: Profile | null
): SettingsDraft {
  if (!profile) {
    return currentDraft;
  }

  if (currentDraft.profileId !== profile.id) {
    return createSettingsDraft(profile);
  }

  return {
    ...currentDraft,
    displayName: currentDraft.touchedFields.displayName
      ? currentDraft.displayName
      : profile.displayName,
    chordMode: currentDraft.touchedFields.chordMode
      ? currentDraft.chordMode
      : profile.chordDisplayMode,
    defaultGenre: currentDraft.touchedFields.defaultGenre
      ? currentDraft.defaultGenre
      : profile.defaultGenre ?? '',
  };
}

export function applySavedProfile(
  _currentDraft: SettingsDraft,
  profile: Profile
): SettingsDraft {
  return createSettingsDraft(profile);
}

function formatDisplayNameValue(value: string): string {
  return value.length > 0 ? `"${value}"` : 'blank';
}

function formatDefaultGenreValue(value: string | null): string {
  return value ? value : 'no default genre';
}

type SettingsFieldTruth = {
  currentState: string;
  nextStep: string;
};

function getDisplayNameTruth(
  draft: SettingsDraft,
  profile: Profile | null
): SettingsFieldTruth {
  const savedDisplayName = profile?.displayName ?? null;
  const hasPendingChange = draft.displayName !== (savedDisplayName ?? '');

  if (!profile) {
    return {
      currentState: 'No saved display name exists yet.',
      nextStep: `The first save will create the profile with ${formatDisplayNameValue(draft.displayName)} as the display name.`,
    };
  }

  return {
    currentState: `Saved now as ${formatDisplayNameValue(savedDisplayName)}.`,
    nextStep: hasPendingChange
      ? `Next save will store ${formatDisplayNameValue(draft.displayName)} as the display name.`
      : 'Edit this field to change the saved display name.',
  };
}

function getChordModeTruth(
  draft: SettingsDraft,
  profile: Profile | null
): SettingsFieldTruth {
  const savedChordMode = profile?.chordDisplayMode ?? null;
  const hasPendingChange = draft.chordMode !== (savedChordMode ?? 'letter');

  if (!profile) {
    return {
      currentState: 'No saved chord display mode exists yet.',
      nextStep: `The first save will create the profile with ${formatChordDisplayModeLabel(draft.chordMode)} as the chord display mode.`,
    };
  }

  return {
    currentState: `Saved now as ${formatChordDisplayModeLabel(savedChordMode)}.`,
    nextStep: hasPendingChange
      ? `Next save will switch the saved chord display mode to ${formatChordDisplayModeLabel(draft.chordMode)}.`
      : 'Choose a different option here to update the saved chord display mode.',
  };
}

function getDefaultGenreTruth(
  draft: SettingsDraft,
  profile: Profile | null
): SettingsFieldTruth {
  const savedDefaultGenre = profile?.defaultGenre ?? null;
  const draftDefaultGenre = draft.defaultGenre || null;
  const hasPendingChange = draftDefaultGenre !== savedDefaultGenre;
  const savedProjectStyleTruth = getDefaultProjectStyleTruth(savedDefaultGenre);

  if (!profile) {
    return {
      currentState: savedProjectStyleTruth.currentState,
      nextStep: `The first save will create the profile with ${formatDefaultGenreValue(draftDefaultGenre)} for new projects.`,
    };
  }

  return {
    currentState: savedProjectStyleTruth.currentState,
    nextStep: hasPendingChange
      ? `Next save will store ${formatDefaultGenreValue(draftDefaultGenre)} for new projects.`
      : savedProjectStyleTruth.nextStep,
  };
}

function getPendingSettingsFields(
  draft: SettingsDraft,
  profile: Profile | null
): SettingsField[] {
  const savedDraft = createSettingsDraft(profile);
  const pendingFields: SettingsField[] = [];

  if (draft.displayName !== savedDraft.displayName) {
    pendingFields.push('displayName');
  }

  if (draft.chordMode !== savedDraft.chordMode) {
    pendingFields.push('chordMode');
  }

  if (draft.defaultGenre !== savedDraft.defaultGenre) {
    pendingFields.push('defaultGenre');
  }

  return pendingFields;
}

function formatSettingsFieldList(fields: SettingsField[]): string {
  const labels = fields.map((field) => SETTINGS_FIELD_LABELS[field]);

  if (labels.length <= 1) {
    return labels[0] ?? '';
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

type SettingsSaveTruth = {
  badgeLabel: string;
  badgeVariant: 'secondary' | 'outline' | 'destructive';
  canSubmit: boolean;
  detail: string;
  status: 'blocked' | 'clear' | 'ready' | 'saving';
  title: string;
};

type SettingsPageReadinessTruth = {
  badgeLabel: string;
  badgeVariant: 'secondary' | 'outline' | 'destructive';
  detail: string;
  status: 'blocked' | 'error' | 'ready' | 'waiting';
  title: string;
};

type SettingsPageFailureTruth = {
  currentState: string;
  nextStep: string;
  title: string;
} | null;

export function getSettingsSaveTruth({
  authTruth,
  pendingFields,
  saving,
}: {
  authTruth: ReturnType<typeof getAuthTruth>;
  pendingFields: SettingsField[];
  saving: boolean;
}): SettingsSaveTruth {
  if (saving) {
    return {
      badgeLabel: 'Saving',
      badgeVariant: 'outline',
      canSubmit: false,
      detail: `${pendingFields.length} setting change${pendingFields.length === 1 ? ' is' : 's are'} being applied now.`,
      status: 'saving',
      title: 'Saving now',
    };
  }

  if (pendingFields.length === 0) {
    return {
      badgeLabel: 'Clear',
      badgeVariant: 'secondary',
      canSubmit: false,
      detail: 'This page already matches your saved profile settings.',
      status: 'clear',
      title: 'Nothing to save',
    };
  }

  if (authTruth.access !== 'granted') {
    return {
      badgeLabel: 'Blocked',
      badgeVariant: 'destructive',
      canSubmit: false,
      detail: `${authTruth.nextStepDetail} Pending changes stay local until saving is unblocked.`,
      status: 'blocked',
      title: 'Save is blocked',
    };
  }

  const pendingSettingsLabel = formatSettingsFieldList(pendingFields);

  return {
    badgeLabel: `${pendingFields.length} waiting`,
    badgeVariant: 'outline',
    canSubmit: true,
    detail: `${pendingSettingsLabel} ${pendingFields.length === 1 ? 'is' : 'are'} still waiting until you save.`,
    status: 'ready',
    title: 'Save is ready',
  };
}

export function getSettingsPageReadinessTruth({
  authTruth,
  failureTruth,
  pendingFields,
  profile,
  saving,
}: {
  authTruth: ReturnType<typeof getAuthTruth>;
  failureTruth: SettingsPageFailureTruth;
  pendingFields: SettingsField[];
  profile: Profile | null;
  saving: boolean;
}): SettingsPageReadinessTruth {
  if (authTruth.readiness === 'waiting') {
    return {
      badgeLabel: 'Waiting',
      badgeVariant: 'outline',
      detail: `${authTruth.currentState} ${authTruth.nextStepDetail}`,
      status: 'waiting',
      title: 'Settings are waiting',
    };
  }

  if (authTruth.access !== 'granted') {
    return {
      badgeLabel: 'Blocked',
      badgeVariant: 'destructive',
      detail: `${authTruth.currentState} Next step: ${authTruth.nextStepLabel}. ${authTruth.nextStepDetail}`,
      status: 'blocked',
      title: 'Settings are blocked',
    };
  }

  if (failureTruth) {
    return {
      badgeLabel: 'Error',
      badgeVariant: 'destructive',
      detail: `${failureTruth.currentState} Next step: ${failureTruth.nextStep}`,
      status: 'error',
      title: failureTruth.title,
    };
  }

  if (saving) {
    return {
      badgeLabel: 'Waiting',
      badgeVariant: 'outline',
      detail: `${pendingFields.length} setting change${pendingFields.length === 1 ? ' is' : 's are'} being applied now.`,
      status: 'waiting',
      title: 'Settings are applying changes',
    };
  }

  const savedProfilePresenceTruth = describeSavedProfilePresenceTruth(profile);

  return {
    badgeLabel: 'Ready',
    badgeVariant: 'secondary',
    detail: pendingFields.length === 0
      ? `${savedProfilePresenceTruth.currentState} ${savedProfilePresenceTruth.nextStep}`
      : `${pendingFields.length} setting change${pendingFields.length === 1 ? ' is' : 's are'} waiting locally until you save. ${savedProfilePresenceTruth.currentState}`,
    status: 'ready',
    title: 'Settings are ready',
  };
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, profile, setProfile, authStatus, signedOutReason } = useAuthStore();
  const { setChordDisplayMode } = useUiStore();

  const [draft, setDraft] = useState<SettingsDraft>(() => createSettingsDraft(profile));
  const [saving, setSaving] = useState(false);
  const [failureTruth, setFailureTruth] = useState<SettingsPageFailureTruth>(null);

  // Sync from profile when the same surface rerenders. Untouched fields should
  // absorb fresh props while locally edited fields preserve draft wins.
  useEffect(() => {
    setDraft((currentDraft) => reconcileSettingsDraft(currentDraft, profile));
  }, [profile]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const pendingFields = getPendingSettingsFields(draft, profile);

    if (!user || pendingFields.length === 0) return;

    setSaving(true);
    setFailureTruth(null);

    const { data, error: err } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        display_name: draft.displayName,
        chord_display_mode: draft.chordMode,
        default_genre: draft.defaultGenre || null,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    setSaving(false);

    if (err) {
      setFailureTruth(
        describeSettingsProfileFailureTruth({
          detail: err.message,
          hasSavedProfile: profile !== null,
          kind: 'save-rejected',
        })
      );
    } else if (!data) {
      setFailureTruth(
        describeSettingsProfileFailureTruth({
          detail: 'Profile save succeeded but no persisted profile row was returned.',
          hasSavedProfile: profile !== null,
          kind: 'missing-saved-row',
        })
      );
    } else {
      try {
        const savedProfile = rowToProfile(data as Record<string, unknown>);
        setProfile(savedProfile);
        setChordDisplayMode(savedProfile.chordDisplayMode);
        setDraft((currentDraft) => applySavedProfile(currentDraft, savedProfile));
      } catch (profileError) {
        setFailureTruth(
          describeSettingsProfileFailureTruth({
            detail:
              profileError instanceof Error
                ? profileError.message
                : 'The saved profile row was invalid.',
            hasSavedProfile: profile !== null,
            kind: 'invalid-saved-row',
          })
        );
      }
    }
  }

  const selectClasses =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

  const settingsCardClasses = 'rounded-lg border border-border bg-card p-6 py-6 ring-0 gap-6';

  const settingsCardHeaderClasses = 'px-0 pb-0 rounded-none';

  const settingsCardContentClasses = 'px-0';

  const sectionHeadingClasses = 'text-lg font-semibold text-foreground';
  const pendingFields = getPendingSettingsFields(draft, profile);
  const authTruth = getAuthTruth({
    user,
    profile,
    authStatus,
    signedOutReason,
  });
  const saveTruth = getSettingsSaveTruth({
    authTruth,
    pendingFields,
    saving,
  });
  const pageReadinessTruth = getSettingsPageReadinessTruth({
    authTruth,
    failureTruth,
    pendingFields,
    profile,
    saving,
  });
  const supportedProfileSettingsTruth = describeSupportedProfileSettingsTruth();
  const displayNameTruth = getDisplayNameTruth(draft, profile);
  const chordModeTruth = getChordModeTruth(draft, profile);
  const chordModeSelectionTruth = describeChordModeSelectionTruth(draft.chordMode, profile);
  const defaultGenreTruth = getDefaultGenreTruth(draft, profile);
  const defaultGenreSelectionTruth = describeDefaultGenreSelectionTruth(draft.defaultGenre, profile);
  const hasPendingChanges = pendingFields.length > 0;
  const savedSettingsCount = profile ? EDITABLE_SETTINGS.length - pendingFields.length : 0;
  const pendingSettingsLabel = formatSettingsFieldList(pendingFields);
  const saveButtonLabel = saving
    ? 'Saving...'
    : saveTruth.status === 'blocked'
      ? 'Save Blocked'
      : hasPendingChanges
        ? 'Save Pending Changes'
        : profile
          ? 'All Changes Saved'
          : 'No Changes to Save';
  const saveCaption = hasPendingChanges || saveTruth.status === 'saving'
    ? saveTruth.detail
    : profile
      ? 'This page already matches your saved profile settings.'
      : 'Change a setting here to create saved profile preferences.';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-8 py-4 flex items-center gap-4">
        <Button
          variant="ghost"
          className="rounded-md px-4 py-2"
          onClick={() => navigate('/library')}
        >
          &larr; Back to Library
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <Alert
            data-testid="settings-page-readiness"
            data-settings-page-readiness={pageReadinessTruth.status}
            className={cn(
              pageReadinessTruth.status === 'blocked' && 'border-destructive/50',
              pageReadinessTruth.status === 'error' && 'border-destructive/50',
              pageReadinessTruth.status === 'waiting' && 'border-status-saving/50',
              pageReadinessTruth.status === 'ready' && 'border-status-ready/50'
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <AlertTitle>{pageReadinessTruth.title}</AlertTitle>
              <Badge variant={pageReadinessTruth.badgeVariant}>{pageReadinessTruth.badgeLabel}</Badge>
            </div>
            <AlertDescription>{pageReadinessTruth.detail}</AlertDescription>
          </Alert>

          <Card className={settingsCardClasses}>
            <CardHeader className={settingsCardHeaderClasses}>
              <div className="flex flex-col gap-1.5">
                <h2 className={sectionHeadingClasses}>Settings State</h2>
                <p className="text-sm text-muted-foreground">
                  Page readiness, saved settings, pending edits, and unavailable settings stay
                  explicit here so you can tell what is ready, waiting, or blocked before
                  leaving the page.
                </p>
              </div>
            </CardHeader>
            <CardContent className={settingsCardContentClasses}>
              <div className="grid gap-3 md:grid-cols-3">
                <div
                  data-testid="settings-state-saved"
                  className="rounded-lg border border-border/70 bg-background/60 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-status-ready" />
                      <h3 className="text-sm font-medium text-foreground">Saved</h3>
                    </div>
                    <Badge variant="secondary">
                      {profile ? `${savedSettingsCount} applied` : 'No saved profile'}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-foreground">
                    {profile
                      ? hasPendingChanges
                        ? `${savedSettingsCount} editable setting${savedSettingsCount === 1 ? '' : 's'} already match your saved profile.`
                        : 'All editable settings match your saved profile.'
                      : 'No saved profile settings exist yet.'}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {profile
                      ? 'Saved settings are already applied on this page and in future sessions.'
                      : 'Save changes here to carry your profile preferences into future sessions.'}
                  </p>
                </div>

                <div
                  data-testid="settings-state-pending"
                  className={cn(
                    'rounded-lg border border-border/70 bg-background/60 p-4',
                    hasPendingChanges && 'border-status-unsaved/50'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'size-2 rounded-full',
                          saving ? 'bg-status-saving animate-pulse' : 'bg-status-unsaved'
                        )}
                      />
                      <h3 className="text-sm font-medium text-foreground">Pending</h3>
                    </div>
                    <Badge variant={hasPendingChanges || saving ? 'outline' : 'secondary'}>
                      {saving
                        ? 'Saving'
                        : hasPendingChanges
                          ? `${pendingFields.length} waiting`
                          : 'Clear'}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-foreground">
                    {saving
                      ? `${pendingFields.length} setting change${pendingFields.length === 1 ? ' is' : 's are'} being applied now.`
                      : hasPendingChanges
                        ? `${pendingFields.length} setting change${pendingFields.length === 1 ? ' is' : 's are'} waiting to be applied.`
                        : 'No pending changes.'}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {hasPendingChanges
                      ? `${pendingSettingsLabel} ${pendingFields.length === 1 ? 'is' : 'are'} still local until you save.`
                      : 'Any edit you make here will move into pending until you save it.'}
                  </p>
                </div>

                <div
                  data-testid="settings-state-unavailable"
                  className="rounded-lg border border-border/70 bg-background/60 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-muted-foreground" />
                      <h3 className="text-sm font-medium text-foreground">Unavailable</h3>
                    </div>
                    <Badge variant="outline">{UNAVAILABLE_SETTINGS.length} fixed today</Badge>
                  </div>
                  <p className="mt-3 text-sm text-foreground">
                    {UNAVAILABLE_SETTINGS.length} settings stay fixed in this build.
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Audio output, auto-save interval, and theme show current behavior instead of
                    fake controls.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile card */}
          <Card className={settingsCardClasses}>
            <CardHeader className={settingsCardHeaderClasses}>
              <div className="flex flex-col gap-1.5">
                <h2 className={sectionHeadingClasses}>Profile</h2>
                <p className="text-sm text-muted-foreground">
                  Saved profile truth for this field stays simple:
                  {' '}
                  {supportedProfileSettingsTruth.displayName}
                </p>
              </div>
            </CardHeader>
            <CardContent className={settingsCardContentClasses}>
              <div className="flex flex-col gap-4">
                {/* Display Name */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="settings-display-name">
                    Display Name
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {displayNameTruth.currentState}
                    {' '}
                    {displayNameTruth.nextStep}
                  </span>
                  <Input
                    id="settings-display-name"
                    type="text"
                    placeholder="Your name"
                    value={draft.displayName}
                    onChange={(e) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        displayName: e.target.value,
                        touchedFields: {
                          ...currentDraft.touchedFields,
                          displayName: true,
                        },
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Editor Preferences card */}
          <Card className={settingsCardClasses}>
            <CardHeader className={settingsCardHeaderClasses}>
              <div className="flex flex-col gap-1.5">
                <h2 className={sectionHeadingClasses}>Editor Preferences</h2>
                <p className="text-sm text-muted-foreground">
                  Saved profile validation only accepts chord modes
                  {' '}
                  {supportedProfileSettingsTruth.chordDisplayModes}
                  {' '}
                  and default genres from the supported list below.
                </p>
              </div>
            </CardHeader>
            <CardContent className={settingsCardContentClasses}>
              <div className="flex flex-col gap-4">
                {/* Chord Display Mode */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Chord Display Mode</span>
                  <div
                    data-testid="settings-chord-selection-truth"
                    className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
                  >
                    <Badge variant={chordModeSelectionTruth.badgeVariant}>
                      {chordModeSelectionTruth.badgeLabel}
                    </Badge>
                    <span>{chordModeSelectionTruth.detail}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {chordModeTruth.currentState}
                    {' '}
                    {chordModeTruth.nextStep}
                  </span>
                  <div className="flex gap-4 mt-1">
                    <Label htmlFor="settings-chord-letter" className="flex items-center gap-2 cursor-pointer">
                      <input
                        id="settings-chord-letter"
                        type="radio"
                        className="h-4 w-4 accent-primary"
                        checked={draft.chordMode === 'letter'}
                        onChange={() =>
                          setDraft((currentDraft) => ({
                            ...currentDraft,
                            chordMode: 'letter',
                            touchedFields: {
                              ...currentDraft.touchedFields,
                              chordMode: true,
                            },
                          }))
                        }
                      />
                      <span className="text-sm text-foreground">Letter names</span>
                      <Badge variant="secondary">(C, Dm7, G7)</Badge>
                    </Label>
                    <Label htmlFor="settings-chord-roman" className="flex items-center gap-2 cursor-pointer">
                      <input
                        id="settings-chord-roman"
                        type="radio"
                        className="h-4 w-4 accent-primary"
                        checked={draft.chordMode === 'roman'}
                        onChange={() =>
                          setDraft((currentDraft) => ({
                            ...currentDraft,
                            chordMode: 'roman',
                            touchedFields: {
                              ...currentDraft.touchedFields,
                              chordMode: true,
                            },
                          }))
                        }
                      />
                      <span className="text-sm text-foreground">Roman numerals</span>
                      <Badge variant="secondary">(I, ii7, V7)</Badge>
                    </Label>
                  </div>
                </div>

                <Separator />

                {/* Default Genre */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="settings-genre">
                    Default Genre
                  </Label>
                  <div
                    data-testid="settings-genre-selection-truth"
                    className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
                  >
                    <Badge variant={defaultGenreSelectionTruth.badgeVariant}>
                      {defaultGenreSelectionTruth.badgeLabel}
                    </Badge>
                    <span>{defaultGenreSelectionTruth.detail}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Pre-selected when creating a new project. Saved profile truth accepts
                    {' '}
                    {supportedProfileSettingsTruth.defaultGenres}
                    . {defaultGenreTruth.currentState} {defaultGenreTruth.nextStep}
                  </span>
                  <select
                    id="settings-genre"
                    className={selectClasses}
                    value={draft.defaultGenre}
                    onChange={(e) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        defaultGenre: e.target.value,
                        touchedFields: {
                          ...currentDraft.touchedFields,
                          defaultGenre: true,
                        },
                      }))
                    }
                  >
                    <option value="">No default</option>
                    {GENRES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unsupported settings card */}
          <Card className={settingsCardClasses}>
            <CardHeader className={settingsCardHeaderClasses}>
              <div className="flex flex-col gap-1.5">
                <h2 className={sectionHeadingClasses}>Unavailable in this build</h2>
                <p className="text-sm text-muted-foreground">
                  These settings are fixed today, so this page shows the current behavior instead
                  of fake controls.
                </p>
              </div>
            </CardHeader>
            <CardContent className={settingsCardContentClasses}>
              <div className="flex flex-col gap-4">
                {UNAVAILABLE_SETTINGS.map((setting) => (
                  <div
                    key={setting.title}
                    className="rounded-lg border border-border/70 bg-background/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-medium text-foreground">{setting.title}</h3>
                        <p className="text-xs text-muted-foreground">{setting.detail}</p>
                      </div>
                      <Badge variant="outline">Unavailable</Badge>
                    </div>
                    <p className="mt-3 text-sm text-foreground">{setting.summary}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Error */}
          {failureTruth && (
            <Alert data-testid="settings-failure-truth" variant="destructive">
              <AlertTitle>{failureTruth.title}</AlertTitle>
              <AlertDescription>
                {failureTruth.currentState} Next step: {failureTruth.nextStep}
              </AlertDescription>
            </Alert>
          )}

          {saveTruth.status !== 'clear' && (
            <Alert
              data-testid="settings-save-readiness"
              className={cn(
                saveTruth.status === 'blocked' && 'border-destructive/50',
                saveTruth.status === 'ready' && 'border-status-unsaved/50'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <AlertTitle>{saveTruth.title}</AlertTitle>
                <Badge variant={saveTruth.badgeVariant}>{saveTruth.badgeLabel}</Badge>
              </div>
              <AlertDescription>
                {saveTruth.status === 'blocked' ? `${authTruth.currentState} ` : ''}
                {saveTruth.detail}
              </AlertDescription>
            </Alert>
          )}

          {/* Save button */}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={!saveTruth.canSubmit}
              className="px-4 py-2"
            >
              {saving ? (
                <span className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin inline-block" />
              ) : (
                saveButtonLabel
              )}
            </Button>
            <span
              data-testid="settings-save-caption"
              className="text-sm text-muted-foreground"
            >
              {saveCaption}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
