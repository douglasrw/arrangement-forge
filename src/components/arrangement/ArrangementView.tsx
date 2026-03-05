import { cn } from "@/lib/utils"
import { SequencerBlock, INSTRUMENT_COLORS } from "@/components/sequencer-block"
import { useProjectStore } from "@/store/project-store"
import { useSelectionStore } from "@/store/selection-store"
import { useUiStore } from "@/store/ui-store"
import { useAudio } from "@/hooks/useAudio"
import { useGenerate } from "@/hooks/useGenerate"
import { formatChord } from "@/lib/chords"
import { useShallow } from "zustand/react/shallow"
import { useRef, useState, useEffect, useCallback } from "react"
import type { Instrument } from "@/components/sequencer-block"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const BAR_W = 40

const SECTION_H = 44
const RULER_H = 24
const CHORD_H = 32
const MIN_LANE_H = 56
const BORDER_PX = 8 // lane border-b (5×1px) + chord border-t (1px) + rounding
const FIXED_H = SECTION_H + RULER_H + CHORD_H + BORDER_PX

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */
function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background">
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

/* ------------------------------------------------------------------ */
/*  Arrangement View (main export)                                     */
/* ------------------------------------------------------------------ */
interface ArrangementViewProps {
  onBlockSelect?: (info: {
    instrument: Instrument
    styleName: string
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
  const { sections, blocks, stems, chords, project } = useProjectStore(
    useShallow((s) => ({
      sections: s.sections,
      blocks: s.blocks,
      stems: s.stems,
      chords: s.chords,
      project: s.project,
    }))
  )
  const { generationState, chordDisplayMode } = useUiStore()
  const { sectionId: selectedSectionId, blockId: selectedBlockId, selectSection, selectBlock, selectSong } = useSelectionStore()
  const { transportState, seek } = useAudio()
  const { runGeneration } = useGenerate()
  const key = project?.key ?? "C"
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
    const stemCount = stems.length || 5
    const perLane = Math.floor(available / stemCount)
    setLaneH(Math.max(MIN_LANE_H, perLane))

    const scrollEl = scrollRef.current
    if (scrollEl) setScrollableW(scrollEl.clientWidth)
  }, [stems.length])

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
    return <EmptyState onGenerate={() => void runGeneration(false)} />
  }

  /* Sort sections by sortOrder */
  const sortedSections = [...sections].sort((a, b) => a.sortOrder - b.sortOrder)

  /* Compute total bars and effective bar width (expand to fill viewport) */
  const totalBars = sortedSections.reduce((sum, s) => sum + s.barCount, 0)
  const effectiveBarW = totalBars > 0 && scrollableW > 0
    ? Math.max(BAR_W, Math.floor(scrollableW / totalBars))
    : BAR_W
  const GRID_W = totalBars * effectiveBarW

  /* Build instrument config from stems */
  const INSTRUMENT_CONFIG = stems
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((stem) => ({
      id: stem.id,
      instrument: stem.instrument,
      color: INSTRUMENT_COLORS[stem.instrument] ?? "var(--muted-foreground)",
      label: stem.instrument.toUpperCase(),
    }))

  /* Playhead position from audio engine — clamp to song bounds */
  const playheadBar = Math.max(1, Math.min(transportState.currentBar, totalBars || 1))

  return (
    <div ref={containerRef} className="flex flex-1 min-h-0 overflow-hidden bg-background">
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
        />
        {/* Instrument rows — fixed height, matches grid lanes */}
        {INSTRUMENT_CONFIG.map((inst, i) => {
          const isEven = i % 2 === 1
          return (
            <div
              key={inst.id}
              className="flex shrink-0 items-center gap-1.5 border-b border-secondary px-2"
              style={{
                height: laneH,
                backgroundColor: isEven ? "color-mix(in srgb, var(--background) 60%, transparent)" : "var(--card)",
              }}
            >
              <div
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: inst.color }}
              />
              <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                {inst.label}
              </span>
            </div>
          )
        })}
        {/* Chord row */}
        <div
          className="flex shrink-0 items-center gap-1.5 border-b border-secondary border-t border-t-border/50 px-2"
          style={{ height: CHORD_H, backgroundColor: "var(--card)" }}
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-600">
            CHORDS
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
            className="flex shrink-0 cursor-pointer bg-card/80"
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
          </div>

          {/* == Stem lane rows (fixed height) == */}
          {INSTRUMENT_CONFIG.map((inst, laneIdx) => {
            const isEven = laneIdx % 2 === 1
            const laneBlocks = blocks.filter((b) => b.stemId === inst.id)

            return (
              <div
                key={inst.id}
                className="relative shrink-0 border-b border-secondary"
                style={{
                  height: laneH,
                  backgroundColor: isEven
                    ? "color-mix(in srgb, var(--background) 60%, transparent)"
                    : "var(--card)",
                }}
              >
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
                {laneBlocks.map((block) => {
                  const left = (block.startBar - 1) * effectiveBarW
                  const width = (block.endBar - block.startBar + 1) * effectiveBarW
                  const isSelected = block.id === selectedBlockId
                  return (
                    <div
                      key={block.id}
                      className="absolute top-1 bottom-1"
                      style={{ left, width }}
                    >
                      <SequencerBlock
                        instrument={inst.instrument}
                        styleName={block.style ?? "Default"}
                        state={isSelected ? "selected" : "default"}
                        dimmed={hasAnyBlockSelected && !isSelected}
                        onClick={() => {
                          const isDeselecting = block.id === selectedBlockId
                          if (isDeselecting) {
                            selectSong()
                            onBlockSelect?.(null)
                          } else {
                            selectBlock(block.id, inst.id)
                            onBlockSelect?.({
                              instrument: inst.instrument,
                              styleName: block.style ?? "Default",
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
              </div>
            )
          })}

          {/* == Chord lane == */}
          <div
            className="relative shrink-0 border-t border-border/50"
            style={{
              height: CHORD_H,
              backgroundColor: "var(--surface-sunken)",
            }}
          >
            {/* Vertical ticks at each chord */}
            {chords.map((chord) => {
              const displayText = formatChord(chord, key, chordDisplayMode)
              return (
                <div
                  key={`${chord.id}-${chord.barNumber}`}
                  className="absolute top-0 flex h-full flex-col items-start"
                  style={{ left: (chord.barNumber - 1) * effectiveBarW }}
                >
                  <div className="h-2 w-px bg-zinc-600" />
                  <span className="mt-0.5 pl-1 font-mono text-[10px] text-muted-foreground">
                    {displayText}
                  </span>
                </div>
              )
            })}
          </div>

          {/* == Playhead (spans full height as overlay) == */}
          <div
            className="pointer-events-none absolute inset-y-0 z-20"
            style={{
              left: (playheadBar - 1) * effectiveBarW,
            }}
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
        </div>
      </div>
    </div>
  )
}
