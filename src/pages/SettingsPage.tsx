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

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="bg-base-200 border-b border-base-300 px-8 py-4 flex items-center gap-4">
        <button
          className="btn btn-sm btn-ghost text-base-content/50"
          onClick={() => navigate('/library')}
        >
          ← Back to Library
        </button>
        <h1 className="text-xl font-bold text-base-content">Settings</h1>
      </div>

      <div className="max-w-lg px-8 py-8">
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {/* Display Name */}
          <div className="form-control gap-2">
            <label className="label py-0">
              <span className="label-text font-medium">Display Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          {/* Chord Display Mode */}
          <div className="form-control gap-2">
            <label className="label py-0">
              <span className="label-text font-medium">Chord Display Mode</span>
              <span className="label-text-alt text-base-content/40">How chords appear in the editor</span>
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  className="radio radio-primary radio-sm"
                  checked={chordMode === 'letter'}
                  onChange={() => setChordMode('letter')}
                />
                <span className="text-sm">Letter names</span>
                <span className="text-xs text-base-content/40">(C, Dm7, G7)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  className="radio radio-primary radio-sm"
                  checked={chordMode === 'roman'}
                  onChange={() => setChordMode('roman')}
                />
                <span className="text-sm">Roman numerals</span>
                <span className="text-xs text-base-content/40">(I, ii7, V7)</span>
              </label>
            </div>
          </div>

          {/* Default Genre */}
          <div className="form-control gap-2">
            <label className="label py-0">
              <span className="label-text font-medium">Default Genre</span>
              <span className="label-text-alt text-base-content/40">Pre-selected when creating a new project</span>
            </label>
            <select
              className="select select-bordered"
              value={defaultGenre}
              onChange={(e) => setDefaultGenre(e.target.value)}
            >
              <option value="">No default</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="divider text-xs text-base-content/30">Coming Soon</div>

          {/* Disabled future settings */}
          <div className="opacity-40 flex flex-col gap-4">
            <div className="form-control gap-2">
              <label className="label py-0">
                <span className="label-text font-medium">Audio Output Device</span>
              </label>
              <select className="select select-bordered" disabled>
                <option>System Default</option>
              </select>
            </div>
            <div className="form-control gap-2">
              <label className="label py-0">
                <span className="label-text font-medium">Auto-Save Interval</span>
              </label>
              <select className="select select-bordered" disabled>
                <option>Every 60 seconds</option>
              </select>
            </div>
            <div className="form-control gap-2">
              <label className="label py-0">
                <span className="label-text font-medium">Theme</span>
              </label>
              <select className="select select-bordered" disabled>
                <option>Forge Dark (default)</option>
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="alert alert-error py-2 text-sm">
              <span>{error}</span>
            </div>
          )}

          {/* Save button */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? <span className="loading loading-spinner loading-sm" /> : 'Save Settings'}
            </button>
            {saved && (
              <span className="text-success text-sm font-medium">Saved!</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
