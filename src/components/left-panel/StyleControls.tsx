// StyleControls.tsx — Genre/sub-style dropdowns and parameter sliders.
// Used at song level, section level (with cascade), and block level (partial).

import { GENRE_SUBSTYLES, GENRE_SLIDERS, GENRES } from '@/lib/genre-config';

interface Props {
  genre: string;
  subStyle: string;
  energy: number;
  groove: number;
  swingPct: number | null;
  dynamics: number;

  // Cascade metadata: if set, show inherited/override visual treatment
  energyInherited?: boolean;
  grooveInherited?: boolean;
  swingInherited?: boolean;
  dynamicsInherited?: boolean;

  onChange: (field: string, value: number | string | null) => void;
  onReset?: (field: string) => void;  // show Reset button when inherited tracking active
  disabled?: boolean;
}

interface SliderRowProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  inherited?: boolean;
  onChange: (v: number) => void;
  onReset?: () => void;
  disabled?: boolean;
}

function SliderRow({ label, value, min = 0, max = 100, inherited, onChange, onReset, disabled }: SliderRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <label className={`text-xs ${inherited ? 'text-base-content/40' : 'text-base-content/70'}`}>
          {label} {inherited && <span className="text-base-content/25 text-[10px]">(inherited)</span>}
        </label>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono ${inherited ? 'text-base-content/30' : 'text-base-content font-semibold'}`}>
            {value}
          </span>
          {onReset && !inherited && (
            <button
              className="text-[10px] text-base-content/30 hover:text-base-content/60 transition-colors"
              onClick={onReset}
              title="Reset to inherited value"
            >
              ↺
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range range-xs range-primary"
        disabled={disabled}
      />
    </div>
  );
}

export function StyleControls({
  genre,
  subStyle,
  energy,
  groove,
  swingPct,
  dynamics,
  energyInherited,
  grooveInherited,
  swingInherited,
  dynamicsInherited,
  onChange,
  onReset,
  disabled,
}: Props) {
  const substyles = GENRE_SUBSTYLES[genre] ?? [];
  const sliders = GENRE_SLIDERS[genre] ?? { energy: true, groove: true, swing: true, dynamics: true };

  return (
    <div className="flex flex-col gap-3">
      {/* Genre */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-base-content/50">Genre</label>
        <select
          className="select select-xs select-bordered w-full"
          value={genre}
          onChange={(e) => {
            const g = e.target.value;
            onChange('genre', g);
            const firstSub = GENRE_SUBSTYLES[g]?.[0] ?? '';
            onChange('subStyle', firstSub);
          }}
          disabled={disabled}
        >
          {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Sub-style */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-base-content/50">Style</label>
        <select
          className="select select-xs select-bordered w-full"
          value={subStyle}
          onChange={(e) => onChange('subStyle', e.target.value)}
          disabled={disabled}
        >
          {substyles.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Energy */}
      {sliders.energy && (
        <SliderRow
          label="Energy"
          value={energy}
          inherited={energyInherited}
          onChange={(v) => onChange('energy', v)}
          onReset={onReset ? () => onReset('energy') : undefined}
          disabled={disabled}
        />
      )}

      {/* Groove */}
      {sliders.groove && (
        <SliderRow
          label="Groove"
          value={groove}
          inherited={grooveInherited}
          onChange={(v) => onChange('groove', v)}
          onReset={onReset ? () => onReset('groove') : undefined}
          disabled={disabled}
        />
      )}

      {/* Swing % — hidden for genres that don't use it */}
      {sliders.swing && (
        <SliderRow
          label="Swing %"
          value={swingPct ?? 65}
          min={50}
          max={80}
          inherited={swingInherited}
          onChange={(v) => onChange('swingPct', v)}
          onReset={onReset ? () => onReset('swingPct') : undefined}
          disabled={disabled}
        />
      )}

      {/* Dynamics */}
      {sliders.dynamics && (
        <SliderRow
          label="Dynamics"
          value={dynamics}
          inherited={dynamicsInherited}
          onChange={(v) => onChange('dynamics', v)}
          onReset={onReset ? () => onReset('dynamics') : undefined}
          disabled={disabled}
        />
      )}
    </div>
  );
}
