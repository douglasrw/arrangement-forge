import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Instrument } from "@/components/sequencer-block"
import { useProjectStore } from "@/store/project-store"
import { useSelectionStore } from "@/store/selection-store"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"

/* ------------------------------------------------------------------ */
/*  Instrument palette (matches sequencer-block.tsx)                    */
/* ------------------------------------------------------------------ */
const INSTRUMENT_COLORS: Record<Instrument, string> = {
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

/* ------------------------------------------------------------------ */
/*  Reusable slider with colored thumb + readout + optional reset      */
/* ------------------------------------------------------------------ */
function InstrumentSlider({
  value,
  min,
  max,
  color,
  readout,
  onChange,
  onReset,
  centered = false,
}: {
  value: number
  min: number
  max: number
  color: string
  readout: string
  onChange: (v: number) => void
  onReset?: () => void
  centered?: boolean
}) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="flex items-center gap-2">
      <div className="group relative h-1.5 flex-1 cursor-pointer rounded-full bg-input">
        {/* Fill */}
        {centered ? (
          <div
            className="absolute inset-y-0 rounded-full"
            style={{
              left: pct < 50 ? `${pct}%` : "50%",
              width: `${Math.abs(pct - 50)}%`,
              background: color,
            }}
          />
        ) : (
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${pct}%`, background: color }}
          />
        )}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(
            "absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent",
            "[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3",
            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:shadow-sm",
            "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3",
            "[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:border-0"
          )}
          style={
            {
              "--thumb-color": color,
            } as React.CSSProperties
          }
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            background: ${color};
            box-shadow: 0 0 6px 1px ${color}44;
          }
          input[type="range"]::-moz-range-thumb {
            background: ${color};
            box-shadow: 0 0 6px 1px ${color}44;
          }
        `}</style>
      </div>
      <span className="w-12 text-right font-mono text-xs text-muted-foreground">
        {readout}
      </span>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="text-zinc-600 transition-colors hover:text-zinc-300"
          aria-label="Reset"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Toggle switch                                                      */
/* ------------------------------------------------------------------ */
function ToggleSwitch({
  on,
  onToggle,
}: {
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors duration-200",
        on ? "bg-ring" : "bg-input"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block size-3 rounded-full bg-zinc-100 shadow-sm transition-transform duration-200",
          on ? "translate-x-3.5" : "translate-x-0.5"
        )}
        style={{ marginTop: "2px" }}
      />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  BlockContext                                                        */
/* ------------------------------------------------------------------ */
interface BlockContextProps {
  instrument?: Instrument
  styleName?: string
  startBar?: number
  endBar?: number
  onClose?: () => void
}

export function BlockContext({
  instrument = "piano",
  styleName: _styleName = "Rhodes chord stab",
  startBar = 5,
  endBar = 12,
  onClose,
}: BlockContextProps) {
  const { blocks, deleteBlock, duplicateBlock } = useProjectStore()
  const { blockId } = useSelectionStore()

  /* Derive live block from store */
  const liveBlock = blocks.find((b) => b.id === blockId)

  /* Use live block data if available, otherwise fall back to props */
  const resolvedStartBar = liveBlock?.startBar ?? startBar
  const resolvedEndBar = liveBlock?.endBar ?? endBar

  const color = INSTRUMENT_COLORS[instrument]
  const label = INSTRUMENT_LABELS[instrument]

  /* Volume/pan: local state for MVP (cosmetic only) */
  const [volume, setVolume] = useState(0) // dB, range -24 to +6
  const [pan, setPan] = useState(0) // -100 to 100, 0 = center

  /* Chord override: local state only — Block type has no chordOverride field */
  // TODO: wire when Block type gets a chordOverride field
  const [chordOverride, setChordOverride] = useState(false)
  const [chordText, setChordText] = useState("Cmaj7 | Dm7 | G7 | Cmaj7")

  // Format dB
  const volumeDb =
    volume === 0
      ? "0 dB"
      : volume > 0
        ? `+${volume} dB`
        : `${volume} dB`

  // Format pan
  const panLabel =
    pan === 0 ? "C" : pan < 0 ? `L${Math.abs(pan)}` : `R${pan}`

  /* Confirm dialog for delete block */
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  function handleDeleteBlock() {
    if (!blockId) return
    deleteBlock(blockId)
    setConfirmDeleteOpen(false)
    onClose?.()
  }

  function handleDuplicateBlock() {
    if (!blockId) return
    duplicateBlock(blockId)
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Header with back button */}
      <button
        type="button"
        onClick={onClose}
        className="flex items-center gap-1.5 px-4 py-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        <span>Back to panels</span>
      </button>

      <div className="border-t border-border px-4 pb-4 pt-4">
        {/* Block header — colored dot + instrument name + bar range */}
        <div className="flex items-center gap-2">
          <div
            className="size-2.5 rounded-sm"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-medium text-zinc-200">{label}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Bars {resolvedStartBar} &ndash; {resolvedEndBar}
        </p>

        {/* VOLUME */}
        <label htmlFor="block-volume-slider" className="mt-4 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
          Volume
        </label>
        <div className="mt-1.5">
          <InstrumentSlider
            value={volume}
            min={-24}
            max={6}
            color={color}
            readout={volumeDb}
            onChange={setVolume}
            onReset={() => setVolume(0)}
          />
        </div>

        {/* PAN */}
        <label htmlFor="block-pan-slider" className="mt-4 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
          Pan
        </label>
        <div className="mt-1.5">
          <InstrumentSlider
            value={pan}
            min={-100}
            max={100}
            color={color}
            readout={panLabel}
            onChange={setPan}
            onReset={() => setPan(0)}
            centered
          />
        </div>

        {/* CHORDS */}
        <div className="mt-4 flex items-center justify-between">
          <label className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Chords
          </label>
          <ToggleSwitch
            on={chordOverride}
            onToggle={() => setChordOverride((v) => !v)}
          />
        </div>
        {!chordOverride ? (
          <p className="mt-1.5 text-xs text-zinc-500">
            Using section chords
          </p>
        ) : (
          <textarea
            id="block-chord-override"
            value={chordText}
            onChange={(e) => setChordText(e.target.value)}
            rows={3}
            className={cn(
              "mt-1.5 w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2",
              "font-mono text-xs text-zinc-100",
              "focus:border-ring/50 focus:outline-none focus:ring-1 focus:ring-ring/30"
            )}
          />
        )}

        {/* ACTIONS */}
        <button
          type="button"
          onClick={handleDuplicateBlock}
          className="mt-4 w-full rounded-lg bg-input py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-600 hover:text-zinc-100"
        >
          Duplicate Block
        </button>
        <button
          type="button"
          onClick={() => setConfirmDeleteOpen(true)}
          className="mt-2 text-xs text-zinc-500 transition-colors hover:text-red-400"
        >
          Delete Block
        </button>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteBlock}
        title="Delete Block?"
        body={`This will permanently delete this ${label} block (bars ${resolvedStartBar}\u2013${resolvedEndBar}). This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
