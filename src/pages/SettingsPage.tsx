import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';
import { GENRES } from '@/lib/genre-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const { setChordDisplayMode } = useUiStore();

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [chordMode, setChordMode] = useState<'letter' | 'roman'>(
    profile?.chordDisplayMode ?? 'letter'
  );
  const [defaultGenre, setDefaultGenre] = useState(profile?.defaultGenre ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync from profile when it loads
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setChordMode(profile.chordDisplayMode);
      setDefaultGenre(profile.defaultGenre ?? '');
    }
  }, [profile]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: err } = await supabase.from('profiles').upsert({
      id: user.id,
      display_name: displayName,
      chord_display_mode: chordMode,
      default_genre: defaultGenre || null,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);

    if (err) {
      setError(err.message);
    } else {
      setChordDisplayMode(chordMode);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  const selectClasses =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

  const disabledSelectClasses =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground opacity-50 cursor-not-allowed';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-8 py-4 flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/library')}
        >
          &larr; Back to Library
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {/* Profile card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
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
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Editor Preferences card */}
          <Card>
            <CardHeader>
              <CardTitle>Editor Preferences</CardTitle>
            </CardHeader>
            <CardContent>
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
                        checked={chordMode === 'letter'}
                        onChange={() => setChordMode('letter')}
                      />
                      <span className="text-sm text-foreground">Letter names</span>
                      <Badge variant="secondary">(C, Dm7, G7)</Badge>
                    </Label>
                    <Label htmlFor="settings-chord-roman" className="flex items-center gap-2 cursor-pointer">
                      <input
                        id="settings-chord-roman"
                        type="radio"
                        className="h-4 w-4 accent-primary"
                        checked={chordMode === 'roman'}
                        onChange={() => setChordMode('roman')}
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
                    value={defaultGenre}
                    onChange={(e) => setDefaultGenre(e.target.value)}
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

          {/* Coming Soon card */}
          <Card className="opacity-60">
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <Separator className="flex-1" />
                <Badge variant="outline">Coming Soon</Badge>
                <Separator className="flex-1" />
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="settings-audio-output">
                    Audio Output Device
                  </Label>
                  <select id="settings-audio-output" className={disabledSelectClasses} disabled>
                    <option>System Default</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="settings-autosave">
                    Auto-Save Interval
                  </Label>
                  <select id="settings-autosave" className={disabledSelectClasses} disabled>
                    <option>Every 60 seconds</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="settings-theme">
                    Theme
                  </Label>
                  <select id="settings-theme" className={disabledSelectClasses} disabled>
                    <option>Forge Dark (default)</option>
                  </select>
                </div>
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
