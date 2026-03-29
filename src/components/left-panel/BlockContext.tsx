import { useState } from "react"
import type { Instrument } from "@/components/sequencer-block"
import { useProjectStore } from "@/store/project-store"
import { useSelectionStore } from "@/store/selection-store"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { INSTRUMENT_STYLE_OPTIONS } from "@/lib/genre-config"
import { isInherited, resolveStyle } from "@/lib/style-cascade"
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

function getStyleDisplayValue(field: "energy" | "dynamics", value: number): string {
  if (field === "dynamics") {
    if (value <= 20) return "pp"
    if (value <= 40) return "p"
    if (value <= 60) return "mp"
    if (value <= 80) return "f"
    return "ff"
  }

  if (value <= 20) return "Low"
  if (value <= 40) return "Laid"
  if (value <= 60) return "Med"
  if (value <= 80) return "High"
  return "Max"
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
  const { project, sections, blocks, deleteBlock, duplicateBlock, updateBlock } = useProjectStore()
  const { blockId } = useSelectionStore()

  /* Derive live block from store */
  const liveBlock = blocks.find((b) => b.id === blockId)
  const liveSection = sections.find((section) => section.id === liveBlock?.sectionId)

  /* Use live block data if available, otherwise fall back to props */
  const resolvedStartBar = liveBlock?.startBar ?? startBar
  const resolvedEndBar = liveBlock?.endBar ?? endBar

  const color = INSTRUMENT_COLORS[instrument]
  const label = INSTRUMENT_LABELS[instrument]
  const activePattern = liveBlock?.style ?? styleName
  const fallbackProjectEnergy = project?.energy ?? 50
  const effectiveEnergy =
    project && liveSection
      ? resolveStyle(project, liveSection, liveBlock ?? null, "energy")
      : {
          value: liveBlock?.energyOverride ?? fallbackProjectEnergy,
          source: liveBlock?.energyOverride != null ? ("block" as const) : ("project" as const),
        }
  const inheritedEnergy =
    project && liveSection
      ? resolveStyle(project, liveSection, null, "energy")
      : {
          value: fallbackProjectEnergy,
          source: "project" as const,
        }
  const isEnergyInherited = liveSection
    ? isInherited(liveSection, liveBlock ?? null, "energy", "block")
    : liveBlock?.energyOverride == null
  const inheritedEnergySourceLabel =
    inheritedEnergy.source === "section" ? "Section" : "Project"

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

  function updateEnergyOverride(value: number) {
    if (!liveBlock) return
    updateBlock(liveBlock.id, { energyOverride: value })
  }

  function resetEnergyOverride() {
    if (!liveBlock || liveBlock.energyOverride == null) return
    updateBlock(liveBlock.id, { energyOverride: null })
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
            Pattern and energy override are the saved block settings here today.
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-border/70 bg-secondary/30 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                Block Energy Override
              </h3>
              <p className="text-xs text-muted-foreground">
                {isEnergyInherited
                  ? `This block is inheriting the ${inheritedEnergy.source === "section" ? "section" : "project"} energy default.`
                  : "This block is carrying its own saved energy override."}
              </p>
            </div>
            <span className="rounded border border-border/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {isEnergyInherited ? inheritedEnergySourceLabel : "Block"}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <label
              htmlFor="block-slider-Energy"
              className="text-[11px] font-medium text-muted-foreground"
            >
              Energy
            </label>
            <span className="min-w-[4rem] shrink-0 text-right text-[11px] font-semibold text-foreground">
              {getStyleDisplayValue("energy", effectiveEnergy.value)} ({effectiveEnergy.value})
            </span>
          </div>

          <div className="group relative mt-2 h-1.5 w-full rounded-full bg-secondary">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-ring"
              style={{ width: `${effectiveEnergy.value}%` }}
            />
            <input
              type="range"
              id="block-slider-Energy"
              aria-label="Block energy override"
              min={0}
              max={100}
              value={effectiveEnergy.value}
              onChange={(e) => updateEnergyOverride(Number(e.target.value))}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {inheritedEnergySourceLabel} default:{" "}
              {getStyleDisplayValue("energy", inheritedEnergy.value)} ({inheritedEnergy.value})
            </p>
            <button
              type="button"
              id="block-reset-Energy"
              onClick={resetEnergyOverride}
              disabled={isEnergyInherited}
              className="rounded border border-border/70 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear override
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border/70 bg-secondary/30 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                Unavailable In This Build
              </h3>
              <p className="text-xs text-muted-foreground">
                Volume, pan, dynamics, and custom chord overrides are not editable per block here yet.
              </p>
            </div>
            <span className="rounded border border-border/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Truth
            </span>
          </div>
          <p className="mt-3 text-sm text-foreground">
            This inspector now edits saved pattern and energy truth. Other block-specific controls still inherit from the mixer, section style cascade, or chord chart defaults.
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
