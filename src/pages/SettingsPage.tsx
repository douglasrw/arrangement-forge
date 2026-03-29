import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { rowToProfile } from '@/lib/profile';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';
import { GENRES } from '@/lib/genre-config';
import type { Profile } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

type SettingsField = 'displayName' | 'chordMode' | 'defaultGenre';

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

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, profile, setProfile } = useAuthStore();
  const { setChordDisplayMode } = useUiStore();

  const [draft, setDraft] = useState<SettingsDraft>(() => createSettingsDraft(profile));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync from profile when the same surface rerenders. Untouched fields should
  // absorb fresh props while locally edited fields preserve draft wins.
  useEffect(() => {
    setDraft((currentDraft) => reconcileSettingsDraft(currentDraft, profile));
  }, [profile]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setSaved(false);

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
      setError(err.message);
    } else if (!data) {
      setError('Profile save succeeded but no persisted profile row was returned.');
    } else {
      const savedProfile = rowToProfile(data as Record<string, unknown>);
      setProfile(savedProfile);
      setChordDisplayMode(savedProfile.chordDisplayMode);
      setDraft((currentDraft) => applySavedProfile(currentDraft, savedProfile));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  const selectClasses =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

  const settingsCardClasses = 'rounded-lg border border-border bg-card p-6 py-6 ring-0 gap-6';

  const settingsCardHeaderClasses = 'px-0 pb-0 rounded-none';

  const settingsCardContentClasses = 'px-0';

  const sectionHeadingClasses = 'text-lg font-semibold text-foreground';

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
          {/* Profile card */}
          <Card className={settingsCardClasses}>
            <CardHeader className={settingsCardHeaderClasses}>
              <h2 className={sectionHeadingClasses}>Profile</h2>
            </CardHeader>
            <CardContent className={settingsCardContentClasses}>
              <div className="flex flex-col gap-4">
                {/* Display Name */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="settings-display-name">
                    Display Name
                  </Label>
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
              <h2 className={sectionHeadingClasses}>Editor Preferences</h2>
            </CardHeader>
            <CardContent className={settingsCardContentClasses}>
              <div className="flex flex-col gap-4">
                {/* Chord Display Mode */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Chord Display Mode</span>
                  <span className="text-xs text-muted-foreground">How chords appear in the editor</span>
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
                  <span className="text-xs text-muted-foreground">Pre-selected when creating a new project</span>
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
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Save button */}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={saving}
              className="px-4 py-2"
            >
              {saving ? (
                <span className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin inline-block" />
              ) : (
                'Save Settings'
              )}
            </Button>
            {saved && (
              <span className="text-sm font-medium text-green-400">Saved!</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
