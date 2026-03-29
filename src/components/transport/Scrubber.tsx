// Scrubber.tsx — Playback position slider.

interface Props {
  value: number;         // current position in seconds
  max: number;           // total duration in seconds
  disabled?: boolean;
  onChange: (seconds: number) => void;
}

export function Scrubber({ value, max, disabled = false, onChange }: Props) {
  const safeMax = Math.max(0, max);
  const safeValue = disabled ? 0 : Math.min(Math.max(0, value), safeMax);

  return (
    <input
      aria-label="Transport scrubber"
      type="range"
      min={0}
      max={safeMax}
      step={0.1}
      value={safeValue}
      disabled={disabled}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="h-1 flex-1 appearance-none rounded-full bg-secondary accent-primary disabled:cursor-not-allowed disabled:opacity-40"
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
    />
  );
}
