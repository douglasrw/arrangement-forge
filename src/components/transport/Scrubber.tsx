import { useId } from "react"
import { cn } from "@/lib/utils"

// Scrubber.tsx — Playback position slider.

export type ScrubberState = "unavailable" | "idle" | "active"

interface Props {
  value: number // current position in seconds
  max: number // total duration in seconds
  disabled?: boolean
  state?: ScrubberState
  stateLabel?: string
  valueText?: string
  onChange: (seconds: number) => void
}

const scrubberStateClasses: Record<
  ScrubberState,
  {
    badge: string
    dot: string
    wrapper: string
    input: string
  }
> = {
  unavailable: {
    badge: "bg-zinc-800 text-zinc-500",
    dot: "bg-zinc-600",
    wrapper: "",
    input:
      "bg-zinc-800 accent-zinc-600 opacity-50 [&::-webkit-slider-thumb]:bg-zinc-600",
  },
  idle: {
    badge: "bg-sky-500/10 text-sky-300",
    dot: "bg-sky-300",
    wrapper: "shadow-[0_0_0_1px_rgba(56,189,248,0.12)]",
    input:
      "bg-secondary accent-zinc-300 [&::-webkit-slider-thumb]:bg-zinc-200",
  },
  active: {
    badge: "bg-playhead/10 text-playhead-light",
    dot: "bg-playhead",
    wrapper: "shadow-[0_0_0_1px_rgba(45,212,191,0.2)]",
    input:
      "bg-instrument-strings/15 accent-playhead [&::-webkit-slider-thumb]:bg-playhead",
  },
}

export function Scrubber({
  value,
  max,
  disabled = false,
  state = disabled ? "unavailable" : "idle",
  stateLabel,
  valueText,
  onChange,
}: Props) {
  const safeMax = Math.max(0, max)
  const safeValue = disabled ? 0 : Math.min(Math.max(0, value), safeMax)
  const stateStyles = scrubberStateClasses[state]
  const stateLabelId = useId()

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1 transition-shadow",
        stateStyles.wrapper
      )}
      data-playhead-state={state}
    >
      <span
        id={stateLabelId}
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
          stateStyles.badge
        )}
      >
        <span
          aria-hidden="true"
          className={cn("size-1.5 rounded-full", stateStyles.dot)}
        />
        {stateLabel ?? state}
      </span>
      <input
        aria-describedby={stateLabelId}
        aria-label="Transport scrubber"
        aria-valuetext={valueText}
        type="range"
        min={0}
        max={safeMax}
        step={0.1}
        value={safeValue}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={cn(
          "h-1 flex-1 appearance-none rounded-full transition-[background-color,opacity]",
          "[&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-colors",
          stateStyles.input,
          disabled && "cursor-not-allowed"
        )}
        style={{ cursor: disabled ? "not-allowed" : "pointer" }}
      />
    </div>
  )
}
