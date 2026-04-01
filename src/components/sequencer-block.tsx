import { cn } from "@/lib/utils"
import { INSTRUMENT_STYLE_OPTIONS } from "@/lib/genre-config"

export type Instrument = "drums" | "bass" | "piano" | "guitar" | "strings"

export type BlockState = "default" | "hover" | "selected"

export const INSTRUMENT_COLORS: Record<Instrument, string> = {
  drums: "var(--instrument-drums)",
  bass: "var(--instrument-bass)",
  piano: "var(--instrument-piano)",
  guitar: "var(--instrument-guitar)",
  strings: "var(--instrument-strings)",
}

/** Build a color-mix() expression for a CSS var color at the given opacity %.
 *  This avoids appending hex alpha suffixes to var() which produces invalid CSS. */
function mix(color: string, opacityPct: number): string {
  return `color-mix(in srgb, ${color} ${opacityPct}%, transparent)`
}

interface SequencerBlockProps {
  instrument: Instrument
  styleName?: string
  state?: BlockState
  /** True when any block in the arrangement is selected (dims unselected blocks) */
  dimmed?: boolean
  onClick?: () => void
  className?: string
  /** Accessible label for the block (e.g. "Drums block, bars 1-8") */
  "aria-label"?: string
}

function toTitleCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

function getBlockPatternTruth(instrument: Instrument, styleName?: string) {
  const normalizedStyleName = styleName?.trim() ?? ""

  if (!normalizedStyleName) {
    return {
      title: "Pattern missing",
      detail: "Choose a pattern",
      isMissing: true,
    }
  }

  const option = INSTRUMENT_STYLE_OPTIONS[instrument].find(
    (candidate) => candidate.id === normalizedStyleName,
  )

  return {
    title: option?.label ?? toTitleCase(normalizedStyleName),
    detail: "Pattern ready",
    isMissing: false,
  }
}

export function SequencerBlock({
  instrument,
  styleName,
  state = "default",
  dimmed = false,
  onClick,
  className,
  "aria-label": ariaLabel,
}: SequencerBlockProps) {
  const color = INSTRUMENT_COLORS[instrument]
  const isSelected = state === "selected"
  const blockTruth = getBlockPatternTruth(instrument, styleName)

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "group relative flex min-w-0 flex-col justify-center overflow-hidden rounded-sm px-3 py-2.5",
        "cursor-pointer select-none text-left transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        className,
      )}
      style={{
        background: isSelected
          ? `linear-gradient(to bottom, ${mix(color, 20)} 0%, ${mix(color, 5)} 100%), var(--surface-raised)`
          : `linear-gradient(to bottom, ${mix(color, 15)} 0%, transparent 100%), var(--sidebar)`,
        border: isSelected ? `2px solid ${color}` : undefined,
        borderTop: isSelected ? undefined : `2px solid ${mix(color, 60)}`,
        borderRight: isSelected ? undefined : `none`,
        borderBottom: isSelected ? undefined : `none`,
        borderLeft: isSelected ? undefined : `none`,
        boxShadow: isSelected
          ? `0 0 20px 3px ${mix(color, 25)}, 0 0 6px 1px ${mix(color, 19)}, inset 0 0 12px ${mix(color, 6)}`
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
          e.currentTarget.style.borderTopColor = mix(color, 60)
          if (dimmed) e.currentTarget.style.opacity = "0.55"
        }
      }}
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span
          className={cn(
            "truncate text-xs font-semibold uppercase tracking-[0.16em]",
            blockTruth.isMissing ? "text-warning" : "text-foreground",
          )}
        >
          {blockTruth.title}
        </span>
        <span
          className={cn(
            "truncate text-[10px] leading-tight",
            blockTruth.isMissing ? "text-warning/80" : "text-muted-foreground",
          )}
        >
          {blockTruth.detail}
        </span>
      </span>
    </button>
  )
}
