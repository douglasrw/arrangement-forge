// Scrubber.tsx — Playback position slider.

interface Props {
  value: number;         // current position in seconds
  max: number;           // total duration in seconds
  onChange: (seconds: number) => void;
}

export function Scrubber({ value, max, onChange }: Props) {
  return (
    <input
      type="range"
      min={0}
      max={Math.max(1, max)}
      step={0.1}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="h-1 flex-1 appearance-none rounded-full bg-secondary accent-primary"
      style={{ cursor: 'pointer' }}
    />
  );
}
