import { useState } from "react"
import { cn } from "@/lib/utils"
import { SequencerBlock, type Instrument } from "@/components/sequencer-block"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const BAR_W = 40
const TOTAL_BARS = 40
const GRID_W = TOTAL_BARS * BAR_W // 1600px

const SECTION_H = 28
const RULER_H = 24
const LANE_H = 56
const CHORD_H = 32

const INSTRUMENTS: { id: Instrument; color: string; label: string }[] = [
  { id: "drums", color: "#06b6d4", label: "DRUMS" },
  { id: "bass", color: "#34d399", label: "BASS" },
  { id: "piano", color: "#fbbf24", label: "PIANO" },
  { id: "guitar", color: "#a78bfa", label: "GUITAR" },
  { id: "strings", color: "#14b8a6", label: "STRINGS" },
]

const SECTIONS = [
  { name: "Intro", bars: 8 },
  { name: "Verse", bars: 16 },
  { name: "Chorus", bars: 16 },
]

/* Block placement data: [startBar (1-indexed), endBar (inclusive)] */
const BLOCK_DATA: Record<Instrument, { start: number; end: number; style: string }[]> = {
  drums: [{ start: 1, end: 40, style: "Jazz brush swing" }],
  bass: [
    { start: 1, end: 8, style: "Walking bass" },
    { start: 9, end: 24, style: "Fingerstyle groove" },
    { start: 25, end: 40, style: "Bowed sustain" },
  ],
  piano: [
    { start: 1, end: 19, style: "Rhodes chord stab" },
    { start: 21, end: 40, style: "Comping pattern" },
  ],
  guitar: [
    { start: 9, end: 16, style: "Clean arpeggio" },
    { start: 25, end: 32, style: "Muted strum" },
  ],
  strings: [{ start: 17, end: 40, style: "Legato sustain" }],
}

const CHORDS = [
  { bar: 1, name: "Cmaj7" },
  { bar: 5, name: "Am7" },
  { bar: 9, name: "Dm7" },
  { bar: 13, name: "G7" },
  { bar: 17, name: "Cmaj7" },
  { bar: 21, name: "Am7" },
  { bar: 25, name: "Dm7" },
  { bar: 29, name: "G7" },
  { bar: 33, name: "Cmaj7" },
  { bar: 37, name: "Am7" },
]

const PLAYHEAD_BAR = 5

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
/*  Left gutter                                                        */
/* ------------------------------------------------------------------ */
function GutterRow({
  label,
  color,
  height,
  even,
}: {
  label: string
  color?: string
  height: number
  even?: boolean
}) {
  const isChord = label === "CHORDS"
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 border-b border-[#27272a] px-2",
        isChord ? "border-t border-t-[#3f3f46]/50" : ""
      )}
      style={{
        height,
        backgroundColor: even ? "rgba(9,9,11,0.6)" : "#18181b",
      }}
    >
      {color && (
        <div
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      <span
        className="text-[10px] font-medium uppercase tracking-[0.1em]"
        style={{ color: isChord ? "#52525b" : "#a1a1aa" }}
      >
        {label}
      </span>
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
  const [generationState, setGenerationState] = useState<
    "idle" | "complete"
  >("complete")
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)

  if (generationState !== "complete") {
    return <EmptyState onGenerate={() => setGenerationState("complete")} />
  }

  const totalHeight = SECTION_H + RULER_H + INSTRUMENTS.length * LANE_H + CHORD_H

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0a0a0c]">
      {/* ---- Left gutter (sticky) ---- */}
      <div className="flex w-20 shrink-0 flex-col border-r border-[#27272a] bg-[#18181b]">
        {/* Section header spacer */}
        <div
          className="border-b border-[#27272a] bg-[#18181b]"
          style={{ height: SECTION_H }}
        />
        {/* Ruler spacer */}
        <div
          className="border-b border-[#27272a] bg-[#18181b]/80"
          style={{ height: RULER_H }}
        />
        {/* Instrument rows */}
        {INSTRUMENTS.map((inst, i) => (
          <GutterRow
            key={inst.id}
            label={inst.label}
            color={inst.color}
            height={LANE_H}
            even={i % 2 === 1}
          />
        ))}
        {/* Chord row */}
        <GutterRow label="CHORDS" height={CHORD_H} />
      </div>

      {/* ---- Scrollable grid ---- */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="relative" style={{ width: GRID_W, height: totalHeight }}>

          {/* == Section headers row == */}
          <div
            className="absolute left-0 top-0 flex"
            style={{ height: SECTION_H, width: GRID_W }}
          >
            {SECTIONS.map((sec) => {
              const w = sec.bars * BAR_W
              const isActive = selectedSection === sec.name
              return (
                <button
                  type="button"
                  key={sec.name}
                  onClick={() => {
                    const isDeselecting = selectedSection === sec.name
                    setSelectedSection(isDeselecting ? null : sec.name)
                    setSelectedBlock(null)
                    onBlockSelect?.(null)
                    if (isDeselecting) {
                      onSectionSelect?.(null)
                    } else {
                      onSectionSelect?.({
                        sectionName: sec.name,
                        sectionBars: sec.bars,
                      })
                    }
                  }}
                  className={cn(
                    "flex items-center border-l-2 border-r border-r-[#3f3f46]/50 pl-2 text-left text-xs font-medium transition-colors",
                    isActive
                      ? "border-l-[#0891b2] bg-[#0891b2]/10 text-[#f4f4f5]"
                      : "border-l-[#52525b] bg-[#27272a]/40 text-[#d4d4d8] hover:bg-[#27272a]/60"
                  )}
                  style={{ width: w, height: SECTION_H }}
                >
                  {sec.name}
                </button>
              )
            })}
          </div>

          {/* == Bar ruler row == */}
          <div
            className="absolute left-0 flex bg-[#18181b]/80"
            style={{ top: SECTION_H, height: RULER_H, width: GRID_W }}
          >
            {Array.from({ length: TOTAL_BARS }).map((_, i) => {
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
                  {/* Number every 4 bars */}
                  {isMajor && (
                    <span className="absolute left-1 top-0.5 font-mono text-[10px] text-[#52525b]">
                      {barNum}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* == Stem lane rows == */}
          {INSTRUMENTS.map((inst, laneIdx) => {
            const top = SECTION_H + RULER_H + laneIdx * LANE_H
            const isEven = laneIdx % 2 === 1
            const blocks = BLOCK_DATA[inst.id]

            return (
              <div
                key={inst.id}
                className="absolute left-0 border-b border-[#27272a]"
                style={{
                  top,
                  height: LANE_H,
                  width: GRID_W,
                  backgroundColor: isEven
                    ? "rgba(9,9,11,0.6)"
                    : "#18181b",
                }}
              >
                {/* Vertical grid lines */}
                {Array.from({ length: TOTAL_BARS }).map((_, i) => {
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
                {blocks.map((block) => {
                  const blockId = `${inst.id}-${block.start}-${block.end}`
                  const left = (block.start - 1) * BAR_W
                  const width = (block.end - block.start + 1) * BAR_W
                  return (
                    <div
                      key={blockId}
                      className="absolute top-1 bottom-1"
                      style={{ left, width }}
                    >
                      <SequencerBlock
                        instrument={inst.id}
                        styleName={block.style}
                        state={selectedBlock === blockId ? "selected" : "default"}
                        onClick={() => {
                          const isDeselecting = selectedBlock === blockId
                          setSelectedBlock(isDeselecting ? null : blockId)
                          setSelectedSection(null)
                          if (isDeselecting) {
                            onBlockSelect?.(null)
                          } else {
                            onBlockSelect?.({
                              instrument: inst.id,
                              styleName: block.style,
                              startBar: block.start,
                              endBar: block.end,
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
            className="absolute left-0 border-t border-[#3f3f46]/50"
            style={{
              top: SECTION_H + RULER_H + INSTRUMENTS.length * LANE_H,
              height: CHORD_H,
              width: GRID_W,
              backgroundColor: "#0a0a0c",
            }}
          >
            {/* Vertical ticks at each chord */}
            {CHORDS.map((chord) => (
              <div
                key={`${chord.name}-${chord.bar}`}
                className="absolute top-0 flex h-full flex-col items-start"
                style={{ left: (chord.bar - 1) * BAR_W }}
              >
                <div className="h-2 w-px bg-[#52525b]" />
                <span className="mt-0.5 pl-1 font-mono text-[10px] text-[#a1a1aa]">
                  {chord.name}
                </span>
              </div>
            ))}
          </div>

          {/* == Playhead == */}
          <div
            className="pointer-events-none absolute top-0 z-20"
            style={{
              left: (PLAYHEAD_BAR - 1) * BAR_W,
              height: totalHeight,
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
