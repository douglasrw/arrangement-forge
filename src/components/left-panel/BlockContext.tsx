import { useState } from "react"
import type { Instrument } from "@/components/sequencer-block"
import { useProjectStore } from "@/store/project-store"
import { useSelectionStore } from "@/store/selection-store"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { INSTRUMENT_STYLE_OPTIONS } from "@/lib/genre-config"
import type { InstrumentType } from "@/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/* ------------------------------------------------------------------ */
/*  Instrument palette (matches sequencer-block.tsx)                    */
/* ------------------------------------------------------------------ */
const INSTRUMENT_COLORS: Record<Instrument, string> = {
  drums: "var(--instrument-drums)",
  bass: "var(--instrument-bass)",
  piano: "var(--instrument-piano)",
  guitar: "var(--instrument-guitar)",
  strings: "var(--instrument-strings)",
}

const INSTRUMENT_LABELS: Record<Instrument, string> = {
  drums: "Drums",
  bass: "Bass",
  piano: "Piano",
  guitar: "Guitar",
  strings: "Strings",
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
  styleName = "Rhodes chord stab",
  startBar = 5,
  endBar = 12,
  onClose,
}: BlockContextProps) {
  const { blocks, deleteBlock, duplicateBlock, updateBlock } = useProjectStore()
  const { blockId } = useSelectionStore()

  /* Derive live block from store */
  const liveBlock = blocks.find((b) => b.id === blockId)

  /* Use live block data if available, otherwise fall back to props */
  const resolvedStartBar = liveBlock?.startBar ?? startBar
  const resolvedEndBar = liveBlock?.endBar ?? endBar

  const color = INSTRUMENT_COLORS[instrument]
  const label = INSTRUMENT_LABELS[instrument]
  const activePattern = liveBlock?.style ?? styleName

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

        {/* PATTERN STYLE */}
        <label
          htmlFor="block-pattern-select"
          className="mt-4 block text-[10px] font-medium uppercase tracking-widest text-zinc-500"
        >
          Pattern
        </label>
        <div className="mt-1.5">
          <Select
            value={activePattern}
            onValueChange={(value) => {
              if (blockId) {
                updateBlock(blockId, { style: value })
              }
            }}
          >
            <SelectTrigger id="block-pattern-select" className="h-8 text-xs bg-secondary">
              <SelectValue placeholder="Select pattern" />
            </SelectTrigger>
            <SelectContent>
              {INSTRUMENT_STYLE_OPTIONS[instrument as InstrumentType]?.map(
                (option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">
            Pattern is the only saved block setting here today.
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-border/70 bg-secondary/30 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                Unavailable In This Build
              </h3>
              <p className="text-xs text-muted-foreground">
                Volume, pan, and custom chord overrides are not saved per block yet.
              </p>
            </div>
            <span className="rounded border border-border/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Truth
            </span>
          </div>
          <p className="mt-3 text-sm text-foreground">
            Block playback follows the mixer and section chord chart today, so this inspector only edits the saved pattern assignment.
          </p>
        </div>

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
