import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';
import { GENRES } from '@/lib/genre-config';

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

  const inputClasses =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

  const selectClasses =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

  const disabledSelectClasses =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground opacity-50 cursor-not-allowed';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-8 py-4 flex items-center gap-4">
        <button
          className="text-muted-foreground hover:bg-secondary rounded-md px-4 py-2 text-sm font-medium transition-colors"
          onClick={() => navigate('/library')}
        >
          &larr; Back to Library
        </button>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {/* Profile card */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Profile</h2>
            <div className="flex flex-col gap-4">
              {/* Display Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="settings-display-name">
                  Display Name
                </label>
                <input
                  id="settings-display-name"
                  type="text"
                  className={inputClasses}
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Editor Preferences card */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Editor Preferences</h2>
            <div className="flex flex-col gap-4">
              {/* Chord Display Mode */}
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Chord Display Mode</span>
                <span className="text-xs text-muted-foreground">How chords appear in the editor</span>
                <div className="flex gap-4 mt-1">
                  <label htmlFor="settings-chord-letter" className="flex items-center gap-2 cursor-pointer">
                    <input
                      id="settings-chord-letter"
                      type="radio"
                      className="h-4 w-4 accent-primary"
                      checked={chordMode === 'letter'}
                      onChange={() => setChordMode('letter')}
                    />
                    <span className="text-sm text-foreground">Letter names</span>
                    <span className="text-xs text-muted-foreground">(C, Dm7, G7)</span>
                  </label>
                  <label htmlFor="settings-chord-roman" className="flex items-center gap-2 cursor-pointer">
                    <input
                      id="settings-chord-roman"
                      type="radio"
                      className="h-4 w-4 accent-primary"
                      checked={chordMode === 'roman'}
                      onChange={() => setChordMode('roman')}
                    />
                    <span className="text-sm text-foreground">Roman numerals</span>
                    <span className="text-xs text-muted-foreground">(I, ii7, V7)</span>
                  </label>
                </div>
              </div>

              {/* Default Genre */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="settings-genre">
                  Default Genre
                </label>
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
          </div>

          {/* Coming Soon card */}
          <div className="bg-card border border-border rounded-lg p-6 opacity-60">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px bg-border flex-1" />
              <span className="text-xs text-muted-foreground">Coming Soon</span>
              <div className="h-px bg-border flex-1" />
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="settings-audio-output">
                  Audio Output Device
                </label>
                <select id="settings-audio-output" className={disabledSelectClasses} disabled>
                  <option>System Default</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="settings-autosave">
                  Auto-Save Interval
                </label>
                <select id="settings-autosave" className={disabledSelectClasses} disabled>
                  <option>Every 60 seconds</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="settings-theme">
                  Theme
                </label>
                <select id="settings-theme" className={disabledSelectClasses} disabled>
                  <option>Forge Dark (default)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <span>{error}</span>
            </div>
          )}

          {/* Save button */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? (
                <span className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin inline-block" />
              ) : (
                'Save Settings'
              )}
            </button>
            {saved && (
              <span className="text-sm font-medium text-green-400">Saved!</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
