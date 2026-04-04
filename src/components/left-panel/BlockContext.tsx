import { useState } from "react"
import type { Instrument } from "@/components/sequencer-block"
import { ScopeBadge } from "@/components/shared/ScopeBadge"
import type { Chord, Stem } from "@/types"
import { useProjectStore } from "@/store/project-store"
import { useSelectionStore } from "@/store/selection-store"
import { useUiStore } from "@/store/ui-store"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { INSTRUMENT_STYLE_OPTIONS } from "@/lib/genre-config"
import { formatChord } from "@/lib/chords"
import {
  getCascadeSourceLabel,
  isInherited,
  resolveStyle,
} from "@/lib/style-cascade"
import type { InstrumentType } from "@/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

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

interface BlockAudioTruth {
  badge: string
  summary: string
  sourceLabel: string
  volumeValue: string
  panValue: string
  footer: string
  tone: TruthTone
}

interface BlockChordTruth {
  badge: string
  summary: string
  rows: Array<{
    label: string
    value: string
  }>
  footer: string
  tone: TruthTone
}

type BlockContextReadiness = "ready" | "waiting" | "blocked"
type TruthTone = "default" | "missing"
type BlockScopeTone = "default" | "missing"

interface BlockScopeTruth {
  title: string
  meta: string
  summary: string
  tone: BlockScopeTone
}

interface BlockContextReadinessTruth {
  readiness: BlockContextReadiness
  badge: string
  title: string
  detail: string
  scopeLabel: string
  scopeValue: string
  footer: string
}

const TRUTH_TONE_STYLES: Record<
  TruthTone,
  {
    panel: string
    badge: string
    row: string
    value: string
    footer: string
  }
> = {
  default: {
    panel: "border-border/70 bg-secondary/30",
    badge: "border-border/70 text-foreground",
    row: "border-border/60 bg-card/40",
    value: "text-foreground",
    footer: "text-foreground",
  },
  missing: {
    panel: "border-warning/30 bg-warning/10",
    badge: "border-warning/30 bg-warning/10 text-warning",
    row: "border-warning/20 bg-warning/5",
    value: "text-warning",
    footer: "text-warning",
  },
}

const BLOCK_SCOPE_TONE_STYLES: Record<
  BlockScopeTone,
  {
    panel: string
    title: string
    meta: string
    summary: string
  }
> = {
  default: {
    panel: "border-border/70 bg-secondary/30",
    title: "text-zinc-200",
    meta: "text-muted-foreground",
    summary: "text-muted-foreground",
  },
  missing: {
    panel: "border-warning/30 bg-warning/10",
    title: "text-warning",
    meta: "text-warning",
    summary: "text-warning",
  },
}

const BLOCK_CONTEXT_READINESS_STYLES: Record<
  BlockContextReadiness,
  {
    panel: string
    badge: string
    detail: string
  }
> = {
  ready: {
    panel: "border-emerald-500/30 bg-emerald-500/10",
    badge: "bg-emerald-500/15 text-emerald-200",
    detail: "text-foreground",
  },
  waiting: {
    panel: "border-border/60 bg-secondary/70",
    badge: "bg-secondary text-foreground",
    detail: "text-foreground",
  },
  blocked: {
    panel: "border-amber-500/30 bg-amber-500/10",
    badge: "bg-amber-500/15 text-amber-200",
    detail: "text-foreground",
  },
}

function formatBlockBarRange(startBar: number, endBar: number): string {
  return startBar === endBar
    ? `Bar ${startBar}`
    : `Bars ${startBar} – ${endBar}`
}

function getBlockContextReadinessTruth({
  hasProject,
  hasLiveBlock,
  hasLiveSection,
  blockId,
  instrumentLabel,
  startBar,
  endBar,
}: {
  hasProject: boolean
  hasLiveBlock: boolean
  hasLiveSection: boolean
  blockId: string | null
  instrumentLabel: string
  startBar: number
  endBar: number
}): BlockContextReadinessTruth {
  const blockRange = formatBlockBarRange(startBar, endBar)
  const scopeValue = `${instrumentLabel} ${blockRange}`

  if (!hasProject) {
    return {
      readiness: "waiting",
      badge: "Waiting",
      title: "Project required",
      detail:
        "Load or create a project before this inspector can resolve live block context.",
      scopeLabel: "Inspector fallback",
      scopeValue,
      footer:
        "The fallback range below is placeholder context only until project truth loads.",
    }
  }

  if (hasLiveBlock && hasLiveSection) {
    return {
      readiness: "ready",
      badge: "Ready",
      title: "Block context ready",
      detail:
        "The current block and its parent section are both live, so this inspector is reading real block truth.",
      scopeLabel: "Current block",
      scopeValue,
      footer:
        "Pattern, style inheritance, mixer truth, and chord scope below now reflect the active block selection.",
    }
  }

  if (hasLiveBlock) {
    return {
      readiness: "blocked",
      badge: "Blocked",
      title: "Section context missing",
      detail:
        "The selected block still exists, but its parent section does not, so inherited block defaults are blocked.",
      scopeLabel: "Affected block",
      scopeValue,
      footer:
        "Restore or relink the parent section before relying on section-derived defaults in this inspector.",
    }
  }

  if (blockId) {
    return {
      readiness: "blocked",
      badge: "Blocked",
      title: "Selected block missing",
      detail:
        "The current selection no longer resolves to a live block, so this inspector cannot read saved block truth.",
      scopeLabel: "Last requested block",
      scopeValue,
      footer:
        "Select a live block in the arrangement to restore ready block context here.",
    }
  }

  return {
    readiness: "waiting",
    badge: "Waiting",
    title: "Choose a block",
    detail:
      "No live block is selected yet, so this inspector is waiting for a block before it can show saved block truth.",
    scopeLabel: "Inspector fallback",
    scopeValue,
    footer:
      "The fallback range below is only a placeholder until the operator selects a live block.",
  }
}

function getBlockScopeTruth({
  hasLiveBlock,
  blockId,
  instrumentLabel,
  startBar,
  endBar,
}: {
  hasLiveBlock: boolean
  blockId: string | null
  instrumentLabel: string
  startBar: number
  endBar: number
}): BlockScopeTruth {
  if (hasLiveBlock) {
    return {
      title: instrumentLabel,
      meta: `Bars ${startBar} – ${endBar}`,
      summary: `Active scope: ${instrumentLabel} block across bars ${startBar} – ${endBar}.`,
      tone: "default",
    }
  }

  if (blockId) {
    return {
      title: "Block unavailable",
      meta: `Last requested block: ${instrumentLabel} across bars ${startBar} – ${endBar}.`,
      summary:
        "The selected block is no longer available, so block scope is missing rather than ready.",
      tone: "missing",
    }
  }

  return {
    title: "No block selected",
    meta: `Inspector fallback: ${instrumentLabel} across bars ${startBar} – ${endBar}.`,
    summary: "No live block is selected, so block scope is missing rather than ready.",
    tone: "missing",
  }
}

function formatMixerVolume(gain: number): string {
  if (gain <= 0) return "-inf"
  const db = 20 * Math.log10(gain)
  return `${db >= 0 ? "+" : ""}${Math.round(db)} dB`
}

function formatMixerPan(pan: number): string {
  const snappedPan = Math.round(Math.max(-1, Math.min(1, pan)) * 100)

  if (snappedPan === 0) return "C"
  return `${snappedPan < 0 ? "L" : "R"}${Math.abs(snappedPan)}`
}

function getBlockAudioTruth({
  stem,
  instrumentLabel,
  hasArrangementAudio,
}: {
  stem?: Stem
  instrumentLabel: string
  hasArrangementAudio: boolean
}): BlockAudioTruth {
  if (stem) {
    return {
      badge: "Mixer",
      summary: `This block inherits volume and pan from the current ${instrumentLabel.toLowerCase()} mixer lane.`,
      sourceLabel: `${instrumentLabel} mixer lane`,
      volumeValue: formatMixerVolume(stem.volume),
      panValue: formatMixerPan(stem.pan),
      footer: "Use the mixer drawer to change this lane truth. Block-level audio overrides are not editable here yet.",
      tone: "default",
    }
  }

  if (hasArrangementAudio) {
    return {
      badge: "No stem",
      summary: `No current ${instrumentLabel.toLowerCase()} stem is loaded for this arrangement, so block audio truth is missing rather than hidden.`,
      sourceLabel: `${instrumentLabel} stem missing`,
      volumeValue: "--",
      panValue: "--",
      footer: "Restore the matching mixer lane before expecting inherited block volume or pan truth here.",
      tone: "missing",
    }
  }

  return {
    badge: "No arrangement",
    summary: "This block has no arrangement audio yet, so block audio truth is missing rather than hidden.",
    sourceLabel: "Arrangement audio missing",
    volumeValue: "--",
    panValue: "--",
    footer: "Generate or import an arrangement to create inherited mixer volume and pan truth for this block.",
    tone: "missing",
  }
}

function getBlockChordTruth({
  chords,
  projectKey,
  chordDisplayMode,
  startBar,
  endBar,
  hasChordChartTruth,
}: {
  chords: Chord[]
  projectKey: string
  chordDisplayMode: "letter" | "roman"
  startBar: number
  endBar: number
  hasChordChartTruth: boolean
}): BlockChordTruth {
  const blockChords = chords
    .filter((chord) => chord.barNumber >= startBar && chord.barNumber <= endBar)
    .sort((a, b) => a.barNumber - b.barNumber)

  if (blockChords.length > 0) {
    return {
      badge: "Chart",
      summary: `This block is currently following the chord chart across bars ${startBar} – ${endBar}.`,
      rows: blockChords.map((chord) => ({
        label: `Bar ${chord.barNumber}`,
        value: formatChord(chord, projectKey, chordDisplayMode),
      })),
      footer: "Per-block chord overrides are still unavailable here, so the chord chart remains the active chord source of truth.",
      tone: "default",
    }
  }

  if (hasChordChartTruth) {
    return {
      badge: "No chart bars",
      summary: `The chord chart has no entries inside bars ${startBar} – ${endBar}, so this block has no chart-derived chord changes to follow right now.`,
      rows: [
        {
          label: "Range",
          value: "No chord entries",
        },
      ],
      footer: "Per-block chord overrides are still unavailable here, so there is no narrower block-specific scope to reveal instead.",
      tone: "missing",
    }
  }

  return {
    badge: "No chart",
    summary: `No chord chart truth is loaded for bars ${startBar} – ${endBar}, so scope is missing rather than hidden.`,
    rows: [
      {
        label: "Range",
        value: "No chord chart",
      },
    ],
    footer: "Add or generate chord chart data before expecting chart-derived block chord scope here.",
    tone: "missing",
  }
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
  const {
    project,
    stems,
    sections,
    blocks,
    chords,
    deleteBlock,
    duplicateBlock,
    updateBlock,
  } = useProjectStore()
  const { blockId, stemId } = useSelectionStore()
  const chordDisplayMode = useUiStore((state) => state.chordDisplayMode)

  /* Derive live block from store */
  const liveBlock = blocks.find((b) => b.id === blockId)
  const liveSection = sections.find((section) => section.id === liveBlock?.sectionId)
  const liveBlockStem = liveBlock
    ? stems.find((stem) => stem.id === liveBlock.stemId) ?? null
    : null
  const selectedStem = stemId
    ? stems.find((stem) => stem.id === stemId) ?? null
    : null
  const hasLiveBlock = liveBlock != null

  /* Use live block data if available, otherwise fall back to props */
  const resolvedStartBar = liveBlock?.startBar ?? startBar
  const resolvedEndBar = liveBlock?.endBar ?? endBar

  const resolvedInstrument =
    liveBlockStem?.instrument ??
    selectedStem?.instrument ??
    instrument
  const color = INSTRUMENT_COLORS[resolvedInstrument]
  const label = INSTRUMENT_LABELS[resolvedInstrument]
  const hasProject = project != null
  const blockScopeTruth = getBlockScopeTruth({
    hasLiveBlock,
    blockId,
    instrumentLabel: label,
    startBar: resolvedStartBar,
    endBar: resolvedEndBar,
  })
  const blockContextReadiness = getBlockContextReadinessTruth({
    hasProject,
    hasLiveBlock,
    hasLiveSection: liveSection != null,
    blockId,
    instrumentLabel: label,
    startBar: resolvedStartBar,
    endBar: resolvedEndBar,
  })
  const activePattern = liveBlock?.style ?? styleName
  const liveStem =
    liveBlockStem ??
    selectedStem ??
    (blockId || stemId ? null : stems.find((stem) => stem.instrument === resolvedInstrument) ?? null)
  const hasArrangementAudio = Boolean(project?.hasArrangement || stems.length > 0)
  const blockAudioTruth = getBlockAudioTruth({
    stem: liveStem,
    instrumentLabel: label,
    hasArrangementAudio,
  })
  const hasChordChartTruth = Boolean(project?.chordChartRaw.trim() || chords.length > 0)
  const blockChordTruth = getBlockChordTruth({
    chords,
    projectKey: project?.key ?? "C",
    chordDisplayMode,
    startBar: resolvedStartBar,
    endBar: resolvedEndBar,
    hasChordChartTruth,
  })
  const fallbackProjectEnergy = project?.energy ?? 50
  const fallbackProjectDynamics = project?.dynamics ?? 50
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
  const inheritedEnergySourceLabel = getCascadeSourceLabel(inheritedEnergy.source)
  const effectiveDynamics =
    project && liveSection
      ? resolveStyle(project, liveSection, liveBlock ?? null, "dynamics")
      : {
          value: liveBlock?.dynamicsOverride ?? fallbackProjectDynamics,
          source: liveBlock?.dynamicsOverride != null ? ("block" as const) : ("project" as const),
        }
  const inheritedDynamics =
    project && liveSection
      ? resolveStyle(project, liveSection, null, "dynamics")
      : {
          value: fallbackProjectDynamics,
          source: "project" as const,
        }
  const isDynamicsInherited = liveSection
    ? isInherited(liveSection, liveBlock ?? null, "dynamics", "block")
    : liveBlock?.dynamicsOverride == null
  const inheritedDynamicsSourceLabel = getCascadeSourceLabel(inheritedDynamics.source)
  const blockScopeTone = BLOCK_SCOPE_TONE_STYLES[blockScopeTruth.tone]
  const blockContextReadinessStyles =
    BLOCK_CONTEXT_READINESS_STYLES[blockContextReadiness.readiness]
  const audioTruthTone = TRUTH_TONE_STYLES[blockAudioTruth.tone]
  const chordTruthTone = TRUTH_TONE_STYLES[blockChordTruth.tone]

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

  function updateDynamicsOverride(value: number) {
    if (!liveBlock) return
    updateBlock(liveBlock.id, { dynamicsOverride: value })
  }

  function resetDynamicsOverride() {
    if (!liveBlock || liveBlock.dynamicsOverride == null) return
    updateBlock(liveBlock.id, { dynamicsOverride: null })
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
        <div
          className={cn("rounded-lg border px-3 py-2", blockContextReadinessStyles.panel)}
          data-block-context-readiness={blockContextReadiness.readiness}
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
                blockContextReadinessStyles.badge
              )}
            >
              {blockContextReadiness.badge}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Block readiness
            </span>
          </div>

          <div className="mt-2">
            <p className="text-xs font-medium leading-relaxed text-foreground">
              {blockContextReadiness.title}
            </p>
            <p
              className={cn(
                "mt-1 text-xs leading-relaxed",
                blockContextReadinessStyles.detail
              )}
            >
              {blockContextReadiness.detail}
            </p>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 rounded-md bg-background/40 px-2 py-1.5">
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              {blockContextReadiness.scopeLabel}
            </span>
            <span className="text-[11px] font-medium text-foreground">
              {blockContextReadiness.scopeValue}
            </span>
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {blockContextReadiness.footer}
          </p>
        </div>

        <div className={cn("rounded-lg border p-3", blockScopeTone.panel)}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Block Inspector
              </span>
            </div>
            <ScopeBadge
              scope="block"
              tone={blockScopeTruth.tone}
              className="shrink-0"
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div
              className="size-2.5 rounded-sm"
              style={{ backgroundColor: color }}
            />
            <span className={cn("text-sm font-medium", blockScopeTone.title)}>
              {blockScopeTruth.title}
            </span>
          </div>
          <p className={cn("mt-0.5 text-xs", blockScopeTone.meta)}>
            {blockScopeTruth.meta}
          </p>
          <p
            id="block-scope-summary"
            className={cn("mt-2 text-xs", blockScopeTone.summary)}
          >
            {blockScopeTruth.summary}
          </p>
        </div>

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
            Pattern, energy, and dynamics are the saved block settings here today.
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
                Block Dynamics Override
              </h3>
              <p className="text-xs text-muted-foreground">
                {isDynamicsInherited
                  ? `This block is inheriting the ${inheritedDynamics.source === "section" ? "section" : "project"} dynamics default.`
                  : "This block is carrying its own saved dynamics override."}
              </p>
            </div>
            <span className="rounded border border-border/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {isDynamicsInherited ? inheritedDynamicsSourceLabel : "Block"}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <label
              htmlFor="block-slider-Dynamics"
              className="text-[11px] font-medium text-muted-foreground"
            >
              Dynamics
            </label>
            <span className="min-w-[4rem] shrink-0 text-right text-[11px] font-semibold text-foreground">
              {getStyleDisplayValue("dynamics", effectiveDynamics.value)} ({effectiveDynamics.value})
            </span>
          </div>

          <div className="group relative mt-2 h-1.5 w-full rounded-full bg-secondary">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-ring"
              style={{ width: `${effectiveDynamics.value}%` }}
            />
            <input
              type="range"
              id="block-slider-Dynamics"
              aria-label="Block dynamics override"
              min={0}
              max={100}
              value={effectiveDynamics.value}
              onChange={(e) => updateDynamicsOverride(Number(e.target.value))}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {inheritedDynamicsSourceLabel} default:{" "}
              {getStyleDisplayValue("dynamics", inheritedDynamics.value)} ({inheritedDynamics.value})
            </p>
            <button
              type="button"
              id="block-reset-Dynamics"
              onClick={resetDynamicsOverride}
              disabled={isDynamicsInherited}
              className="rounded border border-border/70 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear override
            </button>
          </div>
        </div>

        <div
          id="block-audio-truth-card"
          data-truth-tone={blockAudioTruth.tone}
          className={cn("mt-4 rounded-lg border p-3", audioTruthTone.panel)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                Inherited Audio Truth
              </h3>
              <p className="text-xs text-muted-foreground">
                {blockAudioTruth.summary}
              </p>
            </div>
            <span
              id="block-audio-truth-badge"
              data-truth-tone={blockAudioTruth.tone}
              className={cn(
                "rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                audioTruthTone.badge
              )}
            >
              {blockAudioTruth.badge}
            </span>
          </div>

          <div className="mt-3 grid gap-2">
            <div className={cn("flex items-center justify-between gap-3 rounded-md border px-3 py-2", audioTruthTone.row)}>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium text-foreground">Volume</span>
                <span className="text-[11px] text-muted-foreground">
                  {blockAudioTruth.sourceLabel}
                </span>
              </div>
              <span
                id="block-audio-volume-value"
                className={cn("font-mono text-[11px]", audioTruthTone.value)}
              >
                {blockAudioTruth.volumeValue}
              </span>
            </div>

            <div className={cn("flex items-center justify-between gap-3 rounded-md border px-3 py-2", audioTruthTone.row)}>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium text-foreground">Pan</span>
                <span className="text-[11px] text-muted-foreground">
                  {blockAudioTruth.sourceLabel}
                </span>
              </div>
              <span
                id="block-audio-pan-value"
                className={cn("font-mono text-[11px]", audioTruthTone.value)}
              >
                {blockAudioTruth.panValue}
              </span>
            </div>
          </div>

          <p className={cn("mt-3 text-sm", audioTruthTone.footer)}>
            {blockAudioTruth.footer}
          </p>
        </div>

        <div
          id="block-chord-truth-card"
          data-truth-tone={blockChordTruth.tone}
          className={cn("mt-4 rounded-lg border p-3", chordTruthTone.panel)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                Chord Scope Truth
              </h3>
              <p className="text-xs text-muted-foreground">
                {blockChordTruth.summary}
              </p>
            </div>
            <span
              id="block-chord-truth-badge"
              data-truth-tone={blockChordTruth.tone}
              className={cn(
                "rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                chordTruthTone.badge
              )}
            >
              {blockChordTruth.badge}
            </span>
          </div>

          <div className="mt-3 grid gap-2">
            {blockChordTruth.rows.map((row) => (
              <div
                key={row.label}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md border px-3 py-2",
                  chordTruthTone.row
                )}
              >
                <span className="text-[11px] font-medium text-foreground">{row.label}</span>
                <span className={cn("font-mono text-[11px]", chordTruthTone.value)}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <p className={cn("mt-3 text-sm", chordTruthTone.footer)}>
            {blockChordTruth.footer}
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
        title="Delete Block"
        body={`Remove this ${label} block from bars ${resolvedStartBar}\u2013${resolvedEndBar}.`}
        consequence="This permanently deletes the block from the arrangement. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
