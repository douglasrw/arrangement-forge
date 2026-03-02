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
      className="range range-xs range-primary flex-1"
      style={{ cursor: 'pointer' }}
    />
  );
}
