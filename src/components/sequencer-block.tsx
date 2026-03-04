import { cn } from "@/lib/utils"

export type Instrument = "drums" | "bass" | "piano" | "guitar" | "strings"

export type BlockState = "default" | "hover" | "selected"

export const INSTRUMENT_COLORS: Record<Instrument, string> = {
  drums: "var(--instrument-drums)",
  bass: "var(--instrument-bass)",
  piano: "var(--instrument-piano)",
  guitar: "var(--instrument-guitar)",
  strings: "var(--instrument-strings)",
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
        "group relative flex min-w-0 flex-col justify-center overflow-hidden rounded-sm px-3 py-2.5",
        "cursor-pointer select-none text-left transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        className,
      )}
      style={{
        background: isSelected
          ? `linear-gradient(to bottom, ${color}33 0%, ${color}0d 100%), var(--surface-raised)`
          : `linear-gradient(to bottom, ${color}26 0%, transparent 100%), var(--sidebar)`,
        border: isSelected ? `2px solid ${color}` : undefined,
        borderTop: isSelected ? undefined : `2px solid ${color}99`,
        borderRight: isSelected ? undefined : `none`,
        borderBottom: isSelected ? undefined : `none`,
        borderLeft: isSelected ? undefined : `none`,
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
