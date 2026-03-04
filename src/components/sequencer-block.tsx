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

interface SequencerBlockProps {
  instrument: Instrument
  styleName?: string
  state?: BlockState
  /** True when any block in the arrangement is selected (dims unselected blocks) */
  dimmed?: boolean
  onClick?: () => void
  className?: string
}

export function SequencerBlock({
  instrument,
  state = "default",
  dimmed = false,
  onClick,
  className,
}: SequencerBlockProps) {
  const color = INSTRUMENT_COLORS[instrument]
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
        background: isSelected
          ? `linear-gradient(to bottom, ${color}33 0%, ${color}0d 100%), #141416`
          : `linear-gradient(to bottom, ${color}26 0%, transparent 100%), #111113`,
        border: isSelected ? `2px solid ${color}` : undefined,
        borderTop: isSelected ? undefined : `2px solid ${color}99`,
        borderRight: isSelected ? undefined : `1px solid transparent`,
        borderBottom: isSelected ? undefined : `1px solid #27272a`,
        borderLeft: isSelected ? undefined : `1px solid transparent`,
        boxShadow: isSelected
          ? `0 0 20px 3px ${color}40, 0 0 6px 1px ${color}30, inset 0 0 12px ${color}10`
          : "none",
        opacity: dimmed && !isSelected ? 0.55 : 1,
        outlineColor: color,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderTopColor = color
          if (dimmed) e.currentTarget.style.opacity = "0.8"
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderTopColor = `${color}99`
          if (dimmed) e.currentTarget.style.opacity = "0.55"
        }
      }}
    >
    </button>
  )
}
