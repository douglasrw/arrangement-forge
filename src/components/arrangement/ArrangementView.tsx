import { cn } from "@/lib/utils"
import { ChordLane, CHORD_LANE_HEIGHT, type ChordLaneTruth } from "@/components/arrangement/ChordLane"
import { SequencerBlock, INSTRUMENT_COLORS } from "@/components/sequencer-block"
import { getProjectStoreReadiness, useProjectStore } from "@/store/project-store"
import { useSelectionStore } from "@/store/selection-store"
import { useUiStore } from "@/store/ui-store"
import { useAudio } from "@/hooks/useAudio"
import { useGenerate } from "@/hooks/useGenerate"
import { useShallow } from "zustand/react/shallow"
import { useRef, useState, useEffect, useCallback } from "react"
import type { Instrument } from "@/components/sequencer-block"
import type { Block, Section, Stem } from "@/types"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const BAR_W = 40

const SECTION_H = 44
const RULER_H = 24
const CHORD_H = CHORD_LANE_HEIGHT
const MIN_LANE_H = 56
const BORDER_PX = 8 // lane border-b (5×1px) + chord border-t (1px) + rounding
const FIXED_H = SECTION_H + RULER_H + CHORD_H + BORDER_PX
const ARRANGEMENT_LANE_ORDER: Instrument[] = ["drums", "bass", "piano", "guitar", "strings"]
const ARRANGEMENT_LANE_LABELS: Record<Instrument, string> = {
  drums: "DRUMS",
  bass: "BASS",
  piano: "PIANO",
  guitar: "GUITAR",
  strings: "STRINGS",
}

function formatArrangementStyleLabel(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

function getArrangementPlayheadTruth({
  playbackReadiness,
  isPlaying,
  summary,
  detail,
  nextStep,
  currentBar,
  currentBeat,
  totalBars,
}: {
  playbackReadiness: "ready" | "loading" | "unavailable"
  isPlaying: boolean
  summary: string
  detail: string
  nextStep: string
  currentBar: number
  currentBeat: number
  totalBars: number
}) {
  if (playbackReadiness !== "ready" || totalBars === 0) {
    const readinessState = playbackReadiness === "loading" ? "waiting" : "blocked"
    const readinessLabel = readinessState === "waiting" ? "Waiting" : "Blocked"

    return {
      state: readinessState,
      readinessLabel,
      badgeLabel: summary,
      statusText: detail,
      title: `${detail} ${nextStep}`.trim(),
      playheadBar: 1,
      playheadBeat: 1,
      showOverlay: false,
    }
  }

  const playheadBar = Math.max(1, Math.min(currentBar, totalBars || 1))
  const playheadBeat = Math.max(1, currentBeat)
  const badgeLabel = isPlaying ? "Playing" : "Idle"

  return {
    state: isPlaying ? "active" as const : "idle" as const,
    readinessLabel: "Ready",
    badgeLabel,
    statusText: `Bar ${playheadBar} Beat ${playheadBeat}`,
    title: `${badgeLabel} at bar ${playheadBar} beat ${playheadBeat}`,
    playheadBar,
    playheadBeat,
    showOverlay: true,
  }
}

function getArrangementLaneTruth(instrument: Instrument, hasStem: boolean, blockCount: number) {
  const instrumentLabel = ARRANGEMENT_LANE_LABELS[instrument]
  const lowerLabel = instrumentLabel.toLowerCase()

  if (!hasStem) {
    return {
      state: "unavailable" as const,
      badge: "Unavailable",
      message: `No ${lowerLabel} stem loaded yet.`,
    }
  }

  if (blockCount === 0) {
    return {
      state: "empty" as const,
      badge: "Empty lane",
      message: `No ${lowerLabel} blocks loaded yet.`,
    }
  }

  return {
    state: "ready" as const,
    badge: null,
    message: null,
  }
}

type ArrangementFailureKind = "generation" | "system"

function getArrangementFailureTruth(
  errorMessage: string | null,
  kind: ArrangementFailureKind = "generation",
) {
  const normalizedMessage = errorMessage
    ?.trim()
    .replace(/^error:\s*/i, "")
    .replace(kind === "generation" ? /^generation failed:\s*/i : /^arrangement blocked:\s*/i, "")
    .trim()

  if (!normalizedMessage) {
    if (kind === "generation") {
      return {
        summary: "Generation failed",
        detail: "Arrangement Forge could not build the arrangement from the current project inputs.",
        nextStep: "Review the current input blockers, then generate again.",
        actionLabel: "Generate again",
      }
    }

    return {
      summary: "Arrangement blocked",
      detail: "Arrangement Forge hit a system error while loading or updating this arrangement surface.",
      nextStep: "Resolve the current system error, then return to the arrangement.",
      actionLabel: null,
    }
  }

  const [detailSegment, nextStepSegment] = normalizedMessage.split(/\s+Next step:\s+/i, 2)
  const detail = detailSegment?.trim() || normalizedMessage
  const nextStep = nextStepSegment?.trim()

  if (kind === "generation") {
    return {
      summary: "Generation failed",
      detail,
      nextStep: nextStep
        ? `Next step: ${nextStep}`
        : "Next step: Review the current input blockers, then generate again.",
      actionLabel: "Generate again",
    }
  }

  return {
    summary: "Arrangement blocked",
    detail,
    nextStep: nextStep
      ? `Next step: ${nextStep}`
      : "Next step: Resolve the current system error, then return to the arrangement.",
    actionLabel: null,
  }
}

function isGenerationFailure(errorMessage: string | null) {
  return /^generation failed:/i.test(errorMessage?.trim() ?? "")
}

function getChordLaneTruth({
  projectReadiness,
  generationFailure,
  totalBars,
  chordCount,
}: {
  projectReadiness: ReturnType<typeof getProjectStoreReadiness>
  generationFailure: ReturnType<typeof getArrangementFailureTruth> | null
  totalBars: number
  chordCount: number
}): ChordLaneTruth {
  if (projectReadiness.status === "blocked") {
    const detail = [projectReadiness.currentState, projectReadiness.detail]
      .filter(Boolean)
      .join(" ")
    const visibleDetail = [detail, projectReadiness.nextStep].filter(Boolean).join(" ")

    return {
      state: "blocked",
      badge: "Blocked",
      detail: visibleDetail,
      title: visibleDetail,
    }
  }

  if (projectReadiness.status === "waiting") {
    return {
      state: "waiting",
      badge: "Waiting",
      detail: projectReadiness.currentState,
      title: `${projectReadiness.currentState} ${projectReadiness.nextStep}`.trim(),
    }
  }

  if (generationFailure) {
    const detail = [generationFailure.detail, generationFailure.nextStep].filter(Boolean).join(" ")

    return {
      state: "blocked",
      badge: "Failed",
      detail,
      title: detail,
    }
  }

  if (totalBars === 0) {
    const detail = "Chord lane is waiting for the first arrangement section before chord bars can render."

    return {
      state: "waiting",
      badge: "Waiting",
      detail,
      title: `${detail} Add or load arrangement sections to make the chord lane ready.`.trim(),
    }
  }

  if (chordCount === 0) {
    const detail = "Chord lane is waiting for chord bars to load for this arrangement."

    return {
      state: "waiting",
      badge: "Waiting",
      detail,
      title: `${detail} Load or generate the chord chart to make the chord lane ready.`.trim(),
    }
  }

  return {
    state: "ready",
    badge: "Ready",
    detail: "Chord bars are loaded for this arrangement.",
    title: "Chord bars are loaded for this arrangement.",
  }
}

function getArrangementSelectionTruth({
  selectedSection,
  selectedBlock,
  selectedLaneLabel,
}: {
  selectedSection: { name: string; barCount: number } | null
  selectedBlock: { instrument: Instrument; styleName: string | null; startBar: number; endBar: number } | null
  selectedLaneLabel: string | null
}) {
  if (selectedBlock && selectedLaneLabel) {
    const normalizedStyle = selectedBlock.styleName?.trim()
    const detail = normalizedStyle
      ? `${formatArrangementStyleLabel(normalizedStyle)} covers bars ${selectedBlock.startBar}-${selectedBlock.endBar}.`
      : `Pattern missing for bars ${selectedBlock.startBar}-${selectedBlock.endBar}. Choose a pattern in Block Inspector to make this block playable.`

    return {
      state: "selected" as const,
      summary: `${selectedLaneLabel} selected`,
      detail,
    }
  }

  if (selectedSection) {
    return {
      state: "inherited" as const,
      summary: `${selectedSection.name} selected`,
      detail: `${selectedSection.barCount} bar${selectedSection.barCount !== 1 ? "s" : ""} in focus. Blocks inside this section inherit the active scope until you pick a block.`,
    }
  }

  return {
    state: "default" as const,
    summary: "Song default",
    detail: "No section or block is selected. Lane headers target the first loaded block in each lane.",
  }
}

function getChordLaneSelectionTruth({
  selectionLevel,
  selectedSection,
  selectedBlock,
  selectedStem,
}: {
  selectionLevel: ReturnType<typeof useSelectionStore.getState>["level"]
  selectedSection: Section | null
  selectedBlock: Block | null
  selectedStem: Stem | null
}) {
  if (selectionLevel === "section") {
    if (!selectedSection) {
      return {
        state: "blocked" as const,
        summary: "Selection missing",
        detail:
          "The current arrangement selection no longer resolves, so the chord lane is falling back to the whole-song chart until you clear or replace it.",
      }
    }

    return {
      state: "selected" as const,
      summary: `${selectedSection.name} selected`,
      detail: `${selectedSection.name} is selected in the arrangement, but the chord lane still shows the whole-song chart this section inherits today.`,
    }
  }

  if (selectionLevel === "block") {
    if (!selectedBlock) {
      return {
        state: "blocked" as const,
        summary: "Selection missing",
        detail:
          "The current arrangement selection no longer resolves, so the chord lane is falling back to the whole-song chart until you clear or replace it.",
      }
    }

    const stemLabel = selectedStem
      ? ARRANGEMENT_LANE_LABELS[selectedStem.instrument]
      : "Block"
    const barLabel =
      selectedBlock.startBar === selectedBlock.endBar
        ? `bar ${selectedBlock.startBar}`
        : `bars ${selectedBlock.startBar}-${selectedBlock.endBar}`

    return {
      state: "selected" as const,
      summary: `${stemLabel} ${barLabel} selected`,
      detail: `${stemLabel} ${barLabel} is selected in the arrangement, but the chord lane still shows the whole-song chart that block inherits today.`,
    }
  }

  return {
    state: "default" as const,
    summary: "Song default",
    detail: "No section or block is selected. The chord lane is showing the whole-song chart every arrangement lane inherits.",
  }
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */
function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-4 bg-background"
      data-testid="arrangement-empty-state"
    >
      {/* Waveform icon */}
      <svg
        viewBox="0 0 64 40"
        fill="none"
        className="size-16 text-border"
      >
        <rect x="4" y="14" width="3" height="12" rx="1.5" fill="currentColor" />
        <rect x="10" y="8" width="3" height="24" rx="1.5" fill="currentColor" />
        <rect x="16" y="4" width="3" height="32" rx="1.5" fill="currentColor" />
        <rect x="22" y="10" width="3" height="20" rx="1.5" fill="currentColor" />
        <rect x="28" y="2" width="3" height="36" rx="1.5" fill="currentColor" />
        <rect x="34" y="8" width="3" height="24" rx="1.5" fill="currentColor" />
        <rect x="40" y="12" width="3" height="16" rx="1.5" fill="currentColor" />
        <rect x="46" y="6" width="3" height="28" rx="1.5" fill="currentColor" />
        <rect x="52" y="10" width="3" height="20" rx="1.5" fill="currentColor" />
        <rect x="58" y="14" width="3" height="12" rx="1.5" fill="currentColor" />
      </svg>
      <h2 className="text-lg font-medium text-zinc-300">
        Ready to generate
      </h2>
      <p className="text-sm text-zinc-500">
        Configure your input and click generate to begin
      </p>
      <button
        type="button"
        onClick={onGenerate}
        className="mt-2 rounded-xl bg-instrument-strings px-8 py-3 text-sm font-semibold text-background shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-colors hover:bg-playhead"
      >
        Generate
      </button>
    </div>
  )
}

function FailureState({
  errorMessage,
  onGenerate,
}: {
  errorMessage: string | null
  onGenerate: () => void
}) {
  const failureKind = isGenerationFailure(errorMessage) ? "generation" : "system"
  const failureTruth = getArrangementFailureTruth(errorMessage, failureKind)

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-4 bg-background px-6 text-center"
      data-testid="arrangement-failure-state"
    >
      <div className="flex size-16 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive">
        <svg viewBox="0 0 24 24" fill="none" className="size-8" aria-hidden="true">
          <path
            d="M12 8v5m0 3h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-medium text-zinc-100">
          {failureTruth.summary}
        </h2>
        <p className="max-w-2xl text-sm text-zinc-300">
          {failureTruth.detail}
        </p>
        <p className="max-w-2xl text-sm text-zinc-500">
          {failureTruth.nextStep}
        </p>
      </div>
      {failureTruth.actionLabel ? (
        <button
          type="button"
          onClick={onGenerate}
          className="mt-2 rounded-xl border border-destructive/30 bg-destructive/10 px-8 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:bg-destructive/20"
        >
          {failureTruth.actionLabel}
        </button>
      ) : null}
    </div>
  )
}

function ArrangementFailureBanner({
  errorMessage,
  onGenerate,
}: {
  errorMessage: string | null
  onGenerate: () => void
}) {
  const failureKind = isGenerationFailure(errorMessage) ? "generation" : "system"
  const failureTruth = getArrangementFailureTruth(errorMessage, failureKind)

  return (
    <div
      className="absolute left-24 right-4 top-3 z-30 rounded-2xl border border-destructive/30 bg-background/95 p-4 shadow-[0_18px_48px_rgba(0,0,0,0.45)] backdrop-blur"
      data-testid="arrangement-failure-banner"
      role="status"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-destructive">
            <span>{failureTruth.summary}</span>
          </div>
          <p className="max-w-3xl text-sm text-zinc-200">
            {failureTruth.detail}
          </p>
          <p className="max-w-3xl text-sm text-zinc-400">
            {failureTruth.nextStep}
          </p>
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
            Previous arrangement remains loaded below for reference.
          </p>
        </div>
        {failureTruth.actionLabel ? (
          <button
            type="button"
            onClick={onGenerate}
            className="shrink-0 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:bg-destructive/20"
          >
            {failureTruth.actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Arrangement View (main export)                                     */
/* ------------------------------------------------------------------ */
interface ArrangementViewProps {
  onBlockSelect?: (info: {
    instrument: Instrument
    styleName: string | null
    startBar: number
    endBar: number
  } | null) => void
  onSectionSelect?: (info: {
    sectionName: string
    sectionBars: number
  } | null) => void
}

export function ArrangementView({
  onBlockSelect,
  onSectionSelect,
}: ArrangementViewProps) {
  const {
    project,
    projectLoadStatus,
    projectLoadTargetId,
    projectLoadMessage,
    projectLoadFailureTarget,
    sections,
    blocks,
    stems,
    chords,
  } = useProjectStore(
    useShallow((s) => ({
      project: s.project,
      projectLoadStatus: s.projectLoadStatus,
      projectLoadTargetId: s.projectLoadTargetId,
      projectLoadMessage: s.projectLoadMessage,
      projectLoadFailureTarget: s.projectLoadFailureTarget,
      sections: s.sections,
      blocks: s.blocks,
      stems: s.stems,
      chords: s.chords,
    }))
  )
  const { generationState, systemStatus, errorMessage } = useUiStore(
    useShallow((s) => ({
      generationState: s.generationState,
      systemStatus: s.systemStatus,
      errorMessage: s.errorMessage,
    }))
  )
  const {
    level: selectionLevel,
    sectionId: selectedSectionId,
    blockId: selectedBlockId,
    selectSection,
    selectBlock,
    selectSong,
  } = useSelectionStore()
  const { transportState, playbackReadiness, playbackTruth, seek } = useAudio()
  const { runGeneration } = useGenerate()
  const hasAnyBlockSelected = selectedBlockId !== null

  /* Measure container height → compute dynamic lane height */
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [laneH, setLaneH] = useState(MIN_LANE_H)
  const [scrollableW, setScrollableW] = useState(0)

  const recalcLayout = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const available = el.clientHeight - FIXED_H
    const stemCount = ARRANGEMENT_LANE_ORDER.length
    const perLane = Math.floor(available / stemCount)
    setLaneH(Math.max(MIN_LANE_H, perLane))

    const scrollEl = scrollRef.current
    if (scrollEl) setScrollableW(scrollEl.clientWidth)
  }, [])

  useEffect(() => {
    recalcLayout()
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(recalcLayout)
    ro.observe(el)
    return () => ro.disconnect()
  }, [recalcLayout])

  /* Clamp scroll position when content shrinks (e.g. section deleted) */
  const totalBarsForClamp = sections.reduce((sum, s) => sum + s.barCount, 0)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    if (maxScroll >= 0 && el.scrollLeft > maxScroll) {
      el.scrollLeft = Math.max(0, maxScroll)
    }
  }, [totalBarsForClamp])

  if (generationState !== "complete") {
    if (systemStatus === "error") {
      return (
        <FailureState
          errorMessage={errorMessage}
          onGenerate={() => void runGeneration()}
        />
      )
    }

    return <EmptyState onGenerate={() => void runGeneration()} />
  }

  /* Sort sections by sortOrder */
  const sortedSections = [...sections].sort((a, b) => a.sortOrder - b.sortOrder)
  const projectReadiness = getProjectStoreReadiness({
    project,
    projectLoadStatus,
    projectLoadTargetId,
    projectLoadMessage,
    projectLoadFailureTarget,
  })
  const totalBars = sortedSections.reduce((sum, s) => sum + s.barCount, 0)
  const generationFailure =
    systemStatus === "error" && isGenerationFailure(errorMessage)
      ? getArrangementFailureTruth(errorMessage)
      : null
  const chordLaneTruth = getChordLaneTruth({
    projectReadiness,
    generationFailure,
    totalBars,
    chordCount: chords.length,
  })
  const arrangementLanes = ARRANGEMENT_LANE_ORDER.map((instrument) => {
    const stem = stems.find((candidate) => candidate.instrument === instrument)
    const laneBlocks = stem
      ? blocks
        .filter((block) => block.stemId === stem.id)
        .sort((a, b) => a.startBar - b.startBar)
      : []
    const truth = getArrangementLaneTruth(instrument, Boolean(stem), laneBlocks.length)

    return {
      id: stem?.id ?? `missing-${instrument}`,
      stemId: stem?.id ?? null,
      instrument,
      label: ARRANGEMENT_LANE_LABELS[instrument],
      color: INSTRUMENT_COLORS[instrument] ?? "var(--muted-foreground)",
      laneBlocks,
      ...truth,
    }
  })
  const selectedSection = selectedSectionId
    ? sortedSections.find((section) => section.id === selectedSectionId) ?? null
    : null
  const selectedBlock = selectedBlockId
    ? blocks.find((block) => block.id === selectedBlockId) ?? null
    : null
  const selectedStem = selectedBlock
    ? stems.find((stem) => stem.id === selectedBlock.stemId) ?? null
    : null
  const selectedLane = selectedBlock
    ? arrangementLanes.find((lane) => lane.laneBlocks.some((block) => block.id === selectedBlock.id)) ?? null
    : null
  const arrangementSelectionTruth = getArrangementSelectionTruth({
    selectedSection: selectedSection
      ? { name: selectedSection.name, barCount: selectedSection.barCount }
      : null,
    selectedBlock: selectedBlock
      ? {
        instrument: selectedLane?.instrument ?? "drums",
        styleName: selectedBlock.style ?? null,
        startBar: selectedBlock.startBar,
        endBar: selectedBlock.endBar,
      }
      : null,
    selectedLaneLabel: selectedLane?.label ?? null,
  })
  const chordLaneSelectionTruth = getChordLaneSelectionTruth({
    selectionLevel,
    selectedSection,
    selectedBlock,
    selectedStem,
  })

  /* Compute total bars and effective bar width (expand to fill viewport) */
  const effectiveBarW = totalBars > 0 && scrollableW > 0
    ? Math.max(BAR_W, Math.floor(scrollableW / totalBars))
    : BAR_W
  const GRID_W = totalBars * effectiveBarW

  const arrangementPlayheadTruth = getArrangementPlayheadTruth({
    playbackReadiness,
    isPlaying: transportState.playbackState === "playing",
    summary: playbackTruth.summary,
    detail: playbackTruth.detail,
    nextStep: playbackTruth.nextStep,
    currentBar: transportState.currentBar,
    currentBeat: transportState.currentBeat,
    totalBars,
  })
  const showArrangementFailureBanner = generationState === "complete" && systemStatus === "error"

  return (
    <div
      ref={containerRef}
      className="relative flex flex-1 min-h-0 overflow-hidden bg-background"
      data-testid="arrangement-view"
    >
      {showArrangementFailureBanner ? (
        <ArrangementFailureBanner
          errorMessage={errorMessage}
          onGenerate={() => void runGeneration()}
        />
      ) : null}

      {/* ---- Left gutter (non-scrolling, content-sized) ---- */}
      <div className="flex w-20 shrink-0 flex-col border-r border-secondary bg-background">
        {/* Section header spacer */}
        <div
          className="shrink-0 border-b border-secondary bg-card"
          style={{ height: SECTION_H }}
        />
        {/* Ruler spacer */}
        <div
          className="shrink-0 border-b border-secondary bg-card/80"
          style={{ height: RULER_H }}
        >
          <div
            className={cn(
              "flex h-full items-center px-2 text-[10px] font-medium uppercase tracking-[0.14em]",
              arrangementSelectionTruth.state === "selected"
                ? "text-zinc-100"
                : arrangementSelectionTruth.state === "inherited"
                  ? "text-sky-200"
                  : "text-muted-foreground",
            )}
            data-testid="arrangement-selection-truth"
            data-arrangement-selection-state={arrangementSelectionTruth.state}
            title={arrangementSelectionTruth.detail}
          >
            <span className="truncate">
              {arrangementSelectionTruth.summary}
            </span>
          </div>
        </div>
        {/* Instrument rows — fixed height, matches grid lanes */}
        {arrangementLanes.map((lane, i) => {
          const isEven = i % 2 === 1
          const isSelected = lane.stemId !== null && selectedBlockId !== null && lane.laneBlocks.some((block) => block.id === selectedBlockId)
          const isInteractive = lane.state === "ready"
          return (
            <button
              type="button"
              key={lane.id}
              className={cn(
                "flex shrink-0 items-center justify-between gap-2 border-b border-secondary px-2 transition-colors",
                isInteractive
                  ? "cursor-pointer hover:bg-secondary/60"
                  : "cursor-default",
                isSelected ? "border-l-4 bg-secondary" : "border-l-2"
              )}
              style={{
                height: laneH,
                borderLeftColor: lane.color,
                ...(!isSelected && {
                  backgroundColor:
                    lane.state === "ready"
                      ? isEven
                        ? "color-mix(in srgb, var(--background) 60%, transparent)"
                        : "var(--card)"
                      : "color-mix(in srgb, var(--surface-sunken) 82%, var(--background))",
                }),
              }}
              data-lane-instrument={lane.instrument}
              data-lane-state={lane.state}
              aria-label={lane.state === "ready" ? `${lane.label} lane` : `${lane.label} lane ${lane.state}`}
              disabled={!isInteractive}
              onClick={() => {
                if (lane.stemId && lane.laneBlocks.length > 0) {
                  selectBlock(lane.laneBlocks[0].id, lane.stemId)
                  onBlockSelect?.({
                    instrument: lane.instrument,
                    styleName: lane.laneBlocks[0].style?.trim() ? lane.laneBlocks[0].style : null,
                    startBar: lane.laneBlocks[0].startBar,
                    endBar: lane.laneBlocks[0].endBar,
                  })
                }
              }}
            >
              <span
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider",
                  isSelected
                    ? "text-foreground"
                    : lane.state === "ready"
                      ? "text-muted-foreground"
                      : "text-muted-foreground/80"
                )}
              >
                {lane.label}
              </span>
              {lane.badge ? (
                <span
                  className={cn(
                    "rounded-full border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em]",
                    lane.state === "empty"
                      ? "border-warning/30 bg-warning/10 text-warning"
                      : "border-border/70 bg-secondary/50 text-muted-foreground"
                  )}
                >
                  {lane.badge}
                </span>
              ) : null}
            </button>
          )
        })}
        {/* Chord row */}
        <div
          className="flex shrink-0 items-center gap-1.5 border-b border-secondary border-t border-t-border/50 px-2"
          style={{ height: CHORD_H, backgroundColor: "var(--card)" }}
          data-chord-lane-readiness={chordLaneTruth.state}
          title={chordLaneTruth.title}
        >
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            CHORDS
          </span>
          <span
            className={cn(
              "rounded-full border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em]",
              chordLaneTruth.state === "ready"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : chordLaneTruth.state === "blocked"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-warning/30 bg-warning/10 text-warning"
            )}
          >
            {chordLaneTruth.badge}
          </span>
          <span
            className={cn(
              "truncate rounded-full border px-1.5 py-0.5 text-[8px] font-semibold tracking-[0.08em]",
              chordLaneSelectionTruth.state === "selected"
                ? "border-sky-400/30 bg-sky-500/10 text-sky-200"
                : chordLaneSelectionTruth.state === "blocked"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-border/70 bg-secondary/70 text-muted-foreground"
            )}
            data-testid="chord-lane-selection-truth"
            data-chord-lane-selection-state={chordLaneSelectionTruth.state}
            title={chordLaneSelectionTruth.detail}
          >
            {chordLaneSelectionTruth.summary}
          </span>
        </div>
      </div>

      {/* ---- Scrollable grid ---- */}
      <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
        {/* Fixed-height content column */}
        <div className="relative flex flex-col" style={{ width: GRID_W }}>

          {/* == Section headers row == */}
          <div
            className="flex shrink-0"
            style={{ height: SECTION_H }}
          >
            {sortedSections.map((sec) => {
              const w = sec.barCount * effectiveBarW
              const isActive = sec.id === selectedSectionId
              return (
                <button
                  type="button"
                  key={sec.id}
                  onClick={() => {
                    const isDeselecting = sec.id === selectedSectionId
                    if (isDeselecting) {
                      selectSong()
                      onBlockSelect?.(null)
                      onSectionSelect?.(null)
                    } else {
                      selectSection(sec.id)
                      onSectionSelect?.({
                        sectionName: sec.name,
                        sectionBars: sec.barCount,
                      })
                    }
                  }}
                  className={cn(
                    "flex flex-col justify-center border-l-2 border-r border-r-border/50 pl-2 text-left transition-colors",
                    isActive
                      ? "border-l-ring bg-ring/10 text-zinc-100"
                      : "border-l-zinc-600 bg-secondary/40 text-zinc-300 hover:bg-secondary/60"
                  )}
                  style={{ width: w, height: SECTION_H }}
                >
                  <span className="text-xs font-semibold leading-tight truncate">
                    {sec.name}
                  </span>
                  <span className="text-[10px] leading-tight text-zinc-500">
                    {sec.barCount} bar{sec.barCount !== 1 ? "s" : ""}
                  </span>
                </button>
              )
            })}
          </div>

          {/* == Bar ruler row == */}
          <div
            className="relative flex shrink-0 cursor-pointer bg-card/80"
            style={{ height: RULER_H }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0)
              const clickedBar = Math.max(1, Math.min(totalBars, Math.floor(x / effectiveBarW) + 1))
              seek(clickedBar)
            }}
          >
            {Array.from({ length: totalBars }).map((_, i) => {
              const barNum = i + 1
              const isMajor = (barNum - 1) % 4 === 0
              return (
                <div
                  key={barNum}
                  className="relative border-r"
                  style={{
                    width: effectiveBarW,
                    height: RULER_H,
                    borderColor: isMajor
                      ? "rgba(82,82,91,0.6)"
                      : "rgba(63,63,70,0.25)",
                  }}
                >
                  {/* Tick mark */}
                  <div
                    className="absolute bottom-0 left-0 w-px"
                    style={{
                      height: isMajor ? 10 : 5,
                      backgroundColor: isMajor
                        ? "var(--muted-foreground)"
                        : "color-mix(in srgb, var(--border) 40%, transparent)",
                    }}
                  />
                  {/* Bar number — show every bar */}
                  <span
                    className={cn(
                      "absolute left-1 top-0.5 font-mono text-[10px]",
                      isMajor ? "font-semibold text-zinc-500" : "text-zinc-600"
                    )}
                  >
                    {barNum}
                  </span>
                </div>
              )
            })}
            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "max-w-[24rem] rounded-full border px-2 py-0.5 text-[10px] font-medium",
                    arrangementSelectionTruth.state === "selected"
                      ? "border-zinc-100/15 bg-zinc-100/10 text-zinc-100"
                      : arrangementSelectionTruth.state === "inherited"
                        ? "border-sky-400/30 bg-sky-500/10 text-sky-200"
                        : "border-border/70 bg-secondary/70 text-muted-foreground"
                  )}
                >
                  <span className="font-semibold uppercase tracking-[0.16em]">
                    {arrangementSelectionTruth.summary}
                  </span>
                  <span className="ml-2 text-[9px] opacity-80">
                    {arrangementSelectionTruth.detail}
                  </span>
                </div>
                <div
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
                    arrangementPlayheadTruth.state === "active"
                      ? "border-playhead/40 bg-playhead/10 text-playhead-light"
                      : arrangementPlayheadTruth.state === "idle"
                        ? "border-sky-400/40 bg-sky-500/10 text-sky-300"
                        : "border-border/70 bg-secondary/70 text-muted-foreground"
                  )}
                  data-arrangement-playhead-state={arrangementPlayheadTruth.state}
                  data-arrangement-readiness={arrangementPlayheadTruth.readinessLabel.toLowerCase()}
                  title={arrangementPlayheadTruth.title}
                >
                  <span>{arrangementPlayheadTruth.readinessLabel}</span>
                  <span className="opacity-40" aria-hidden="true">/</span>
                  <span>{arrangementPlayheadTruth.badgeLabel}</span>
                  <span className="text-[9px] normal-case tracking-normal opacity-80">
                    {arrangementPlayheadTruth.statusText}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* == Stem lane rows (fixed height) == */}
          {arrangementLanes.map((lane, laneIdx) => {
            const isEven = laneIdx % 2 === 1

            return (
              <div
                key={lane.id}
                className="relative shrink-0 border-b border-secondary"
                style={{
                  height: laneH,
                  backgroundColor: isEven
                    ? "color-mix(in srgb, var(--background) 60%, transparent)"
                    : "var(--card)",
                }}
                data-lane-instrument={lane.instrument}
                data-lane-state={lane.state}
              >
                {lane.state === "ready" ? (
                  <>
                    {/* Vertical grid lines */}
                    {Array.from({ length: totalBars }).map((_, i) => {
                      const barNum = i + 1
                      const isMajor = (barNum - 1) % 4 === 0
                      return (
                        <div
                          key={barNum}
                          className="absolute top-0 h-full w-px"
                          style={{
                            left: i * effectiveBarW,
                            backgroundColor: isMajor
                              ? "rgba(63,63,70,0.3)"
                              : "rgba(39,39,42,0.3)",
                          }}
                        />
                      )
                    })}

                    {/* Blocks */}
                    {lane.laneBlocks.map((block) => {
                      const left = (block.startBar - 1) * effectiveBarW
                      const width = (block.endBar - block.startBar + 1) * effectiveBarW
                      const isSelected = block.id === selectedBlockId
                      const isLaneDefault =
                        selectedBlockId === null &&
                        selectedSectionId === null &&
                        lane.laneBlocks[0]?.id === block.id
                      const isInheritedFromSection =
                        selectedBlockId === null &&
                        selectedSectionId !== null &&
                        block.sectionId === selectedSectionId
                      const selectionLabel = isSelected
                        ? "Selected"
                        : isInheritedFromSection
                          ? "Inherited"
                          : isLaneDefault
                            ? "Lane default"
                            : undefined
                      const selectionState = isSelected
                        ? "selected"
                        : isInheritedFromSection
                          ? "inherited"
                          : "default"
                      return (
                        <div
                          key={block.id}
                          className="absolute top-1 bottom-1"
                          style={{ left, width }}
                        >
                          <SequencerBlock
                            instrument={lane.instrument}
                            styleName={block.style ?? undefined}
                            state={isSelected ? "selected" : "default"}
                            selectionLabel={selectionLabel}
                            selectionState={selectionState}
                            dimmed={hasAnyBlockSelected && !isSelected}
                            aria-label={`${lane.instrument} block, bars ${block.startBar}-${block.endBar}`}
                            onClick={() => {
                              const isDeselecting = block.id === selectedBlockId
                              if (isDeselecting) {
                                selectSong()
                                onBlockSelect?.(null)
                              } else if (lane.stemId) {
                                selectBlock(block.id, lane.stemId)
                                onBlockSelect?.({
                                  instrument: lane.instrument,
                                  styleName: block.style?.trim() ? block.style : null,
                                  startBar: block.startBar,
                                  endBar: block.endBar,
                                })
                              }
                            }}
                            className="h-full w-full !min-w-0"
                          />
                        </div>
                      )
                    })}
                  </>
                ) : (
                  <div className="absolute inset-2 flex items-center justify-center">
                    <div
                      className={cn(
                        "inline-flex max-w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs",
                        lane.state === "empty"
                          ? "border-warning/30 bg-warning/10 text-warning"
                          : "border-border/70 bg-secondary/40 text-muted-foreground"
                      )}
                      role="status"
                      title={lane.message ?? undefined}
                    >
                      <span className="font-semibold uppercase tracking-[0.16em]">
                        {lane.badge}
                      </span>
                      <span className="truncate">
                        {lane.message}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* == Chord lane == */}
          <ChordLane barWidth={effectiveBarW} truth={chordLaneTruth} />

          {/* == Playhead (spans full height as overlay) == */}
          {arrangementPlayheadTruth.showOverlay ? (
            <div
              className="pointer-events-none absolute inset-y-0 z-20"
              style={{
                left: (arrangementPlayheadTruth.playheadBar - 1) * effectiveBarW,
              }}
              data-arrangement-playhead-line={arrangementPlayheadTruth.state}
              aria-label={arrangementPlayheadTruth.title}
            >
              {/* Triangle handle */}
              <div
                className="absolute -left-[5px] top-0"
                style={{ width: 0, height: 0 }}
              >
                <svg width="12" height="8" viewBox="0 0 12 8">
                  <polygon
                    points="0,0 12,0 6,8"
                    fill="var(--playhead)"
                    fillOpacity={0.9}
                  />
                </svg>
              </div>
              {/* Line */}
              <div
                className="absolute left-[5px] top-0 h-full w-[2px] bg-playhead/80"
                style={{ marginLeft: -1 }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
