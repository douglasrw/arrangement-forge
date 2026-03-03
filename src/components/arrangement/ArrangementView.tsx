import { cn } from "@/lib/utils"
import { SequencerBlock, INSTRUMENT_COLORS } from "@/components/sequencer-block"
import { useProjectStore } from "@/store/project-store"
import { useSelectionStore } from "@/store/selection-store"
import { useUiStore } from "@/store/ui-store"
import { useAudio } from "@/hooks/useAudio"
import { formatChord } from "@/lib/chords"
import { useShallow } from "zustand/react/shallow"
import type { Instrument } from "@/components/sequencer-block"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const BAR_W = 40

const SECTION_H = 44
const RULER_H = 24
const CHORD_H = 32
const MIN_LANE_H = 40

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */
function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-[#0a0a0c]">
      {/* Waveform icon */}
      <svg
        viewBox="0 0 64 40"
        fill="none"
        className="size-16 text-[#3f3f46]"
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
      <h2 className="text-lg font-medium text-[#d4d4d8]">
        Ready to generate
      </h2>
      <p className="text-sm text-[#71717a]">
        Configure your input and click generate to begin
      </p>
      <button
        type="button"
        onClick={onGenerate}
        className="mt-2 rounded-xl bg-[#14b8a6] px-8 py-3 text-sm font-semibold text-[#09090b] shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-colors hover:bg-[#2dd4bf]"
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
  const { generationState, chordDisplayMode, setGenerationState } = useUiStore()
  const { sectionId: selectedSectionId, blockId: selectedBlockId, selectSection, selectBlock, selectSong } = useSelectionStore()
  const { transportState } = useAudio()
  const key = project?.key ?? "C"
  const hasAnyBlockSelected = selectedBlockId !== null

  if (generationState !== "complete") {
    return <EmptyState onGenerate={() => setGenerationState("complete")} />
  }

  /* Sort sections by sortOrder */
  const sortedSections = [...sections].sort((a, b) => a.sortOrder - b.sortOrder)

  /* Compute total bars from real sections */
  const totalBars = sortedSections.reduce((sum, s) => sum + s.barCount, 0)
  const GRID_W = totalBars * BAR_W

  /* Build instrument config from stems */
  const INSTRUMENT_CONFIG = stems
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((stem) => ({
      id: stem.id,
      instrument: stem.instrument,
      color: INSTRUMENT_COLORS[stem.instrument] ?? "#a1a1aa",
      label: stem.instrument.toUpperCase(),
    }))

  /* Playhead position from audio engine */
  const playheadBar = transportState.currentBar

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0a0a0c]">
      {/* ---- Left gutter (non-scrolling) ---- */}
      <div className="flex w-20 shrink-0 flex-col border-r border-[#27272a] bg-[#18181b]">
        {/* Section header spacer */}
        <div
          className="shrink-0 border-b border-[#27272a] bg-[#18181b]"
          style={{ height: SECTION_H }}
        />
        {/* Ruler spacer */}
        <div
          className="shrink-0 border-b border-[#27272a] bg-[#18181b]/80"
          style={{ height: RULER_H }}
        />
        {/* Instrument rows — flex-1 to fill, matches grid lanes */}
        {INSTRUMENT_CONFIG.map((inst, i) => {
          const isEven = i % 2 === 1
          return (
            <div
              key={inst.id}
              className="flex flex-1 items-center gap-1.5 border-b border-[#27272a] px-2"
              style={{
                minHeight: MIN_LANE_H,
                backgroundColor: isEven ? "rgba(9,9,11,0.6)" : "#18181b",
              }}
            >
              <div
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: inst.color }}
              />
              <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#a1a1aa]">
                {inst.label}
              </span>
            </div>
          )
        })}
        {/* Chord row */}
        <div
          className="flex shrink-0 items-center gap-1.5 border-b border-[#27272a] border-t border-t-[#3f3f46]/50 px-2"
          style={{ height: CHORD_H, backgroundColor: "#18181b" }}
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#52525b]">
            CHORDS
          </span>
        </div>
      </div>

      {/* ---- Scrollable grid ---- */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        {/* Flex column fills height; each lane gets flex-1 */}
        <div className="relative flex h-full flex-col" style={{ width: GRID_W }}>

          {/* == Section headers row == */}
          <div
            className="flex shrink-0"
            style={{ height: SECTION_H }}
          >
            {sortedSections.map((sec) => {
              const w = sec.barCount * BAR_W
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
                      onBlockSelect?.(null)
                    }
                  }}
                  className={cn(
                    "flex flex-col justify-center border-l-2 border-r border-r-[#3f3f46]/50 pl-2 text-left transition-colors",
                    isActive
                      ? "border-l-[#0891b2] bg-[#0891b2]/10 text-[#f4f4f5]"
                      : "border-l-[#52525b] bg-[#27272a]/40 text-[#d4d4d8] hover:bg-[#27272a]/60"
                  )}
                  style={{ width: w, height: SECTION_H }}
                >
                  <span className="text-xs font-semibold leading-tight truncate">
                    {sec.name}
                  </span>
                  <span className="text-[10px] leading-tight text-[#71717a]">
                    {sec.barCount} bar{sec.barCount !== 1 ? "s" : ""}
                  </span>
                </button>
              )
            })}
          </div>

          {/* == Bar ruler row == */}
          <div
            className="flex shrink-0 bg-[#18181b]/80"
            style={{ height: RULER_H }}
          >
            {Array.from({ length: totalBars }).map((_, i) => {
              const barNum = i + 1
              const isMajor = (barNum - 1) % 4 === 0
              return (
                <div
                  key={barNum}
                  className="relative border-r"
                  style={{
                    width: BAR_W,
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
                        ? "#52525b"
                        : "rgba(63,63,70,0.4)",
                    }}
                  />
                  {/* Bar number — show every bar */}
                  <span
                    className={cn(
                      "absolute left-1 top-0.5 font-mono text-[10px]",
                      isMajor ? "font-semibold text-[#71717a]" : "text-[#52525b]"
                    )}
                  >
                    {barNum}
                  </span>
                </div>
              )
            })}
          </div>

          {/* == Stem lane rows (flex-1 each, fill remaining space) == */}
          {INSTRUMENT_CONFIG.map((inst, laneIdx) => {
            const isEven = laneIdx % 2 === 1
            const laneBlocks = blocks.filter((b) => b.stemId === inst.id)

            return (
              <div
                key={inst.id}
                className="relative flex-1 border-b border-[#27272a]"
                style={{
                  minHeight: MIN_LANE_H,
                  backgroundColor: isEven
                    ? "rgba(9,9,11,0.6)"
                    : "#18181b",
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
                        left: i * BAR_W,
                        backgroundColor: isMajor
                          ? "rgba(63,63,70,0.3)"
                          : "rgba(39,39,42,0.3)",
                      }}
                    />
                  )
                })}

                {/* Blocks */}
                {laneBlocks.map((block) => {
                  const left = (block.startBar - 1) * BAR_W
                  const width = (block.endBar - block.startBar + 1) * BAR_W
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
            className="relative shrink-0 border-t border-[#3f3f46]/50"
            style={{
              height: CHORD_H,
              backgroundColor: "#0a0a0c",
            }}
          >
            {/* Vertical ticks at each chord */}
            {chords.map((chord) => {
              const displayText = formatChord(chord, key, chordDisplayMode)
              return (
                <div
                  key={`${chord.id}-${chord.barNumber}`}
                  className="absolute top-0 flex h-full flex-col items-start"
                  style={{ left: (chord.barNumber - 1) * BAR_W }}
                >
                  <div className="h-2 w-px bg-[#52525b]" />
                  <span className="mt-0.5 pl-1 font-mono text-[10px] text-[#a1a1aa]">
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
              left: (playheadBar - 1) * BAR_W,
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
                  fill="#2dd4bf"
                  fillOpacity={0.9}
                />
              </svg>
            </div>
            {/* Line */}
            <div
              className="absolute left-[5px] top-0 h-full w-[2px] bg-[#2dd4bf]/80"
              style={{ marginLeft: -1 }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
