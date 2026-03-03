import { useState, useCallback, useRef, useEffect, useMemo, Fragment } from "react"
import { cn } from "@/lib/utils"
import { X, Plus, ArrowRight } from "lucide-react"
import { degreeToNote } from "@/lib/chords"

/* ------------------------------------------------------------------ */
/*  Root notes and qualities for custom chord builder                  */
/* ------------------------------------------------------------------ */

const ROOT_NOTES = [
  "C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
] as const
type RootNote = (typeof ROOT_NOTES)[number]

const QUALITIES = [
  "maj", "min", "7", "maj7", "min7", "dim", "aug", "sus2", "sus4", "add9",
] as const
type Quality = (typeof QUALITIES)[number]

/* ------------------------------------------------------------------ */
/*  Diatonic triads from key                                           */
/* ------------------------------------------------------------------ */

const DIATONIC_DEGREES = [
  { degree: "I", suffix: "", label: "I" },
  { degree: "ii", suffix: "m", label: "ii" },
  { degree: "iii", suffix: "m", label: "iii" },
  { degree: "IV", suffix: "", label: "IV" },
  { degree: "V", suffix: "", label: "V" },
  { degree: "vi", suffix: "m", label: "vi" },
  { degree: "vii", suffix: "dim", label: "vii\u00B0" },
] as const

interface DiatonicChord {
  numeral: string
  name: string
}

function diatonicChordsForKey(key: string): DiatonicChord[] {
  return DIATONIC_DEGREES.map((d) => ({
    numeral: d.label,
    name: degreeToNote(d.degree, key) + d.suffix,
  }))
}

/* ------------------------------------------------------------------ */
/*  Time-signature helpers                                             */
/* ------------------------------------------------------------------ */

function parseTimeSig(timeSig: string): number {
  const parts = timeSig.split("/")
  return parseInt(parts[0], 10) || 4
}

/** How many chord cells per row, based on time signature numerator */
function chordsPerRow(beatsPerBar: number): number {
  if (beatsPerBar <= 2) return 8    // 2/4 → 8 (4 bars)
  if (beatsPerBar <= 4) return 8    // 3/4 → 6, 4/4 → 8
  return beatsPerBar * 2            // 6/8 → 12, etc.
}

// 3/4 is special: 6 per row not 8
function getChordsPerRow(beatsPerBar: number): number {
  if (beatsPerBar === 3) return 6
  return chordsPerRow(beatsPerBar)
}

const TEAL = "#06b6d4"

/* ------------------------------------------------------------------ */
/*  ChordPalette                                                       */
/* ------------------------------------------------------------------ */

interface ChordPaletteProps {
  className?: string
  initialChords?: string[]
  onChordsChange?: (chordText: string) => void
  projectKey?: string
  timeSignature?: string
}

export function ChordPalette({
  className,
  initialChords,
  onChordsChange,
  projectKey = "C",
  timeSignature = "4/4",
}: ChordPaletteProps) {
  const [chords, setChords] = useState<string[]>(initialChords ?? [])
  const [recentlyAdded, setRecentlyAdded] = useState<number | null>(null)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [builderRoot, setBuilderRoot] = useState<RootNote | null>(null)
  const [builderQuality, setBuilderQuality] = useState<Quality | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualText, setManualText] = useState("")
  const glowTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialRender = useRef(true)
  const onChordsChangeRef = useRef(onChordsChange)
  onChordsChangeRef.current = onChordsChange

  const beatsPerBar = parseTimeSig(timeSignature)
  const perRow = getChordsPerRow(beatsPerBar)
  const diatonicChords = useMemo(() => diatonicChordsForKey(projectKey), [projectKey])

  /* Sync chord changes back to parent */
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }
    onChordsChangeRef.current?.(chords.join(" | "))
  }, [chords])

  const addChord = useCallback((name: string) => {
    setChords((prev) => {
      const next = [...prev, name]
      setRecentlyAdded(next.length - 1)
      return next
    })
    if (glowTimeout.current) clearTimeout(glowTimeout.current)
    glowTimeout.current = setTimeout(() => setRecentlyAdded(null), 600)
  }, [])

  const removeChord = useCallback((index: number) => {
    setChords((prev) => prev.filter((_, i) => i !== index))
    setRecentlyAdded(null)
  }, [])

  const clearAll = useCallback(() => {
    setChords([])
    setRecentlyAdded(null)
  }, [])

  const builderPreview =
    builderRoot && builderQuality ? `${builderRoot}${builderQuality}` : null

  const handleAddFromBuilder = useCallback(() => {
    if (builderPreview) {
      addChord(builderPreview)
      setBuilderRoot(null)
      setBuilderQuality(null)
    }
  }, [builderPreview, addChord])

  /* Sync manual text when switching modes */
  useEffect(() => {
    if (manualMode) setManualText(chords.join(" | "))
  }, [manualMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const applyManualText = useCallback(() => {
    const parsed = manualText.split("|").map((s) => s.trim()).filter(Boolean)
    setChords(parsed)
    setManualMode(false)
  }, [manualText])

  /* ---- Manual textarea mode ---- */

  if (manualMode) {
    return (
      <div className={cn("rounded-xl border border-border/50 bg-card p-4", className)}>
        <label htmlFor="chord-manual-input" className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Chord Chart
        </label>
        <textarea
          id="chord-manual-input"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          rows={3}
          className={cn(
            "w-full resize-none rounded-md border border-border bg-secondary px-3 py-2",
            "font-mono text-xs leading-relaxed text-foreground",
            "placeholder:text-muted-foreground",
            "focus:border-[#0891b2] focus:outline-none focus:ring-1 focus:ring-[#0891b2]/50",
            "bg-[length:100%_1.5rem] bg-[linear-gradient(to_bottom,transparent_calc(1.5rem-1px),#27272a33_calc(1.5rem-1px))]"
          )}
        />
        <button
          type="button"
          onClick={applyManualText}
          className="mt-2 text-[11px] font-medium text-[#0891b2] transition-colors hover:text-[#06b6d4]"
        >
          Apply &amp; switch to palette
        </button>
      </div>
    )
  }

  /* ---- Visual palette mode ---- */

  /* Split chords into rows for the grid display */
  const rows: string[][] = []
  for (let i = 0; i < chords.length; i += perRow) {
    rows.push(chords.slice(i, i + perRow))
  }

  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border border-border/50 bg-card p-4", className)}>

      {/* Row 1: Progression grid */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Progression
        </label>

        {chords.length === 0 ? (
          <p className="py-2 text-center text-[11px] text-muted-foreground/60">
            Click chords below to build your progression
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {rows.map((row, rowIdx) => (
              <div key={rowIdx} className="flex items-stretch gap-0">
                {row.map((chord, colIdx) => {
                  const globalIdx = rowIdx * perRow + colIdx
                  const isBarline = colIdx > 0 && colIdx % beatsPerBar === 0
                  return (
                    <Fragment key={globalIdx}>
                      {/* Barline indicator */}
                      {isBarline && (
                        <div className="mx-0.5 w-px shrink-0 self-stretch bg-[#52525b]" />
                      )}
                      {/* Chord cell — equal width */}
                      <div
                        className={cn(
                          "group relative flex min-w-0 flex-1 items-center justify-center rounded-md border px-1 py-1.5 transition-all duration-300",
                          "bg-secondary text-foreground",
                          recentlyAdded === globalIdx
                            ? "border-[#06b6d4]/60 ring-1 ring-[#06b6d4]/40"
                            : "border-border/50"
                        )}
                        style={
                          recentlyAdded === globalIdx
                            ? { boxShadow: `0 0 6px 1px ${TEAL}22` }
                            : undefined
                        }
                      >
                        <span className="truncate font-mono text-[10px] font-medium">
                          {chord}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeChord(globalIdx)}
                          className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-[#3f3f46] text-muted-foreground opacity-0 transition-opacity hover:bg-[#52525b] hover:text-foreground group-hover:opacity-100"
                          aria-label={`Remove ${chord}`}
                        >
                          <X className="size-2" />
                        </button>
                      </div>
                    </Fragment>
                  )
                })}
                {/* Fill remaining cells in partial rows for alignment */}
                {row.length < perRow && Array.from({ length: perRow - row.length }).map((_, i) => {
                  const fillColIdx = row.length + i
                  const isBarline = fillColIdx > 0 && fillColIdx % beatsPerBar === 0
                  return (
                    <Fragment key={`empty-${i}`}>
                      {isBarline && (
                        <div className="mx-0.5 w-px shrink-0 self-stretch bg-transparent" />
                      )}
                      <div className="flex-1" />
                    </Fragment>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Row 2: Diatonic quick-add (derived from project key) */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Key of {projectKey}
        </span>
        <div className="grid grid-cols-7 gap-1">
          {diatonicChords.map((dc) => (
            <DiatonicButton
              key={dc.numeral}
              numeral={dc.numeral}
              name={dc.name}
              onAdd={() => addChord(dc.name)}
            />
          ))}
        </div>
      </div>

      {/* Row 3: Custom chord builder (collapsed by default) */}
      {!builderOpen ? (
        <button
          type="button"
          onClick={() => setBuilderOpen(true)}
          className="flex items-center gap-1 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="size-3.5" />
          <span>Custom chord</span>
        </button>
      ) : (
        <div
          className="flex flex-col gap-2.5 rounded-lg border border-border/50 bg-secondary/50 p-3 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          {/* Step 1 — Root */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Root
            </label>
            <div className="-mx-0.5 flex overflow-x-auto px-0.5 pb-0.5" style={{ scrollbarWidth: "none" }}>
              <div className="flex gap-1">
                {ROOT_NOTES.map((note) => (
                  <button
                    key={note}
                    type="button"
                    onClick={() =>
                      setBuilderRoot((prev) => (prev === note ? null : note))
                    }
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md border text-[11px] font-medium transition-all",
                      builderRoot === note
                        ? "border-[#06b6d4] bg-[#06b6d4] text-foreground shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                        : "border-border bg-secondary text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                    )}
                  >
                    {note}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Step 2 — Quality */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Quality
            </label>
            <div className="-mx-0.5 flex overflow-x-auto px-0.5 pb-0.5" style={{ scrollbarWidth: "none" }}>
              <div className="flex gap-1">
                {QUALITIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() =>
                      setBuilderQuality((prev) => (prev === q ? null : q))
                    }
                    className={cn(
                      "shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium transition-all",
                      builderQuality === q
                        ? "border-[#06b6d4] bg-[#06b6d4] text-foreground shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                        : "border-border bg-secondary text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview + action row */}
          <div className="flex items-center gap-2">
            {builderPreview ? (
              <>
                <span className="text-xs text-muted-foreground">Adding:</span>
                <span className="font-mono text-xs font-medium text-foreground">
                  {builderPreview}
                </span>
                <button
                  type="button"
                  onClick={handleAddFromBuilder}
                  className={cn(
                    "ml-auto inline-flex items-center gap-1 rounded-md border px-4 py-1.5 text-[11px] font-medium transition-colors",
                    "border-[#06b6d4]/30 bg-[#06b6d4]/10 text-[#06b6d4] hover:bg-[#06b6d4]/20"
                  )}
                >
                  Add
                  <ArrowRight className="size-3" />
                </button>
              </>
            ) : (
              <>
                <span className="text-xs text-muted-foreground">
                  {builderRoot ? `${builderRoot}...` : "Select root & quality"}
                </span>
                <button
                  type="button"
                  disabled
                  className="ml-auto inline-flex items-center gap-1 rounded-md px-4 py-1.5 text-[11px] font-medium text-muted-foreground/50"
                >
                  Add
                  <ArrowRight className="size-3" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setBuilderOpen(false)
                setBuilderRoot(null)
                setBuilderQuality(null)
              }}
              className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={clearAll}
          className="text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Clear all
        </button>
        <button
          type="button"
          onClick={() => setManualMode(true)}
          className="text-[10px] text-muted-foreground transition-colors hover:text-[#0891b2]"
        >
          Type manually
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Diatonic button with teal glow                                     */
/* ------------------------------------------------------------------ */

function DiatonicButton({
  numeral,
  name,
  onAdd,
}: {
  numeral: string
  name: string
  onAdd: () => void
}) {
  const [flash, setFlash] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClick = () => {
    onAdd()
    setFlash(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setFlash(false), 400)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex flex-col items-center rounded-lg border px-1 py-1.5 transition-all duration-200",
        flash
          ? "border-[#06b6d4] bg-[#06b6d4]/15 shadow-[0_0_8px_1px_rgba(6,182,212,0.25)]"
          : "border-border bg-secondary hover:border-muted-foreground/30 hover:bg-secondary/80"
      )}
    >
      <span
        className={cn(
          "text-[9px] font-semibold leading-none transition-colors",
          flash ? "text-[#06b6d4]" : "text-muted-foreground"
        )}
      >
        {numeral}
      </span>
      <span
        className={cn(
          "mt-0.5 truncate text-[10px] font-medium leading-none transition-colors",
          flash ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {name}
      </span>
    </button>
  )
}
