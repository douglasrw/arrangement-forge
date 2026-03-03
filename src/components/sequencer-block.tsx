import { cn } from "@/lib/utils"

export type Instrument = "drums" | "bass" | "piano" | "guitar" | "strings"

export type BlockState = "default" | "hover" | "selected"

export const INSTRUMENT_COLORS: Record<Instrument, string> = {
  drums: "#06b6d4",
  bass: "#34d399",
  piano: "#fbbf24",
  guitar: "#a78bfa",
  strings: "#14b8a6",
}

const INSTRUMENT_LABELS: Record<Instrument, string> = {
  drums: "Drums",
  bass: "Bass",
  piano: "Piano",
  guitar: "Guitar",
  strings: "Strings",
}

interface SequencerBlockProps {
  instrument: Instrument
  styleName?: string
  state?: BlockState
  onClick?: () => void
  className?: string
}

export function SequencerBlock({
  instrument,
  styleName = "Jazz brush swing",
  state = "default",
  onClick,
  className,
}: SequencerBlockProps) {
  const color = INSTRUMENT_COLORS[instrument]
  const label = INSTRUMENT_LABELS[instrument]
  const isSelected = state === "selected"

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex min-w-[140px] flex-col justify-center overflow-hidden rounded-md px-3 py-2.5",
        "cursor-pointer select-none text-left transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        className,
      )}
      style={{
        background: `linear-gradient(to bottom, ${color}26 0%, transparent 100%), #111113`,
        borderTop: isSelected ? `2px solid ${color}` : `2px solid ${color}99`,
        borderRight: isSelected ? `1px solid ${color}` : `1px solid transparent`,
        borderBottom: isSelected ? `1px solid ${color}` : `1px solid #27272a`,
        borderLeft: isSelected ? `1px solid ${color}` : `1px solid transparent`,
        boxShadow: isSelected
          ? `0 0 16px 2px ${color}33, 0 0 4px 1px ${color}22`
          : "none",
        outlineColor: color,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderTopColor = color
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderTopColor = `${color}99`
        }
      }}
    >
      {/* Instrument badge */}
      <span
        className="mb-1 text-[10px] font-semibold uppercase tracking-widest"
        style={{ color }}
      >
        {label}
      </span>

      {/* Style name */}
      <span className="truncate text-xs text-muted-foreground">
        {styleName}
      </span>
    </button>
  )
}
