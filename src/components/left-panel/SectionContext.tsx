import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useProjectStore } from "@/store/project-store"
import { useSelectionStore } from "@/store/selection-store"

/* ------------------------------------------------------------------ */
/*  Reusable slider — same pattern as StyleControlsSection             */
/* ------------------------------------------------------------------ */
interface SliderDef {
  label: string
  value: number
  display: string
  min: number
  max: number
}

const INITIAL_SLIDERS: SliderDef[] = [
  { label: "Energy", value: 45, display: "Med", min: 0, max: 100 },
  { label: "Groove", value: 50, display: "Standard", min: 0, max: 100 },
  { label: "Feel", value: 50, display: "Natural", min: 0, max: 100 },
  { label: "Swing %", value: 65, display: "65%", min: 0, max: 100 },
  { label: "Dynamics", value: 30, display: "p", min: 0, max: 100 },
]

function getDisplayValue(label: string, value: number): string {
  if (label === "Swing %") return `${value}%`
  if (label === "Dynamics") {
    if (value <= 20) return "pp"
    if (value <= 40) return "p"
    if (value <= 60) return "mp"
    if (value <= 80) return "f"
    return "ff"
  }
  if (label === "Groove") {
    if (value <= 20) return "Simple"
    if (value <= 40) return "Basic"
    if (value <= 60) return "Standard"
    if (value <= 80) return "Busy"
    return "Complex"
  }
  if (label === "Feel") {
    if (value <= 20) return "Tight"
    if (value <= 40) return "Steady"
    if (value <= 60) return "Natural"
    if (value <= 80) return "Loose"
    return "Sloppy"
  }
  // Energy (default)
  if (value <= 20) return "Low"
  if (value <= 40) return "Laid"
  if (value <= 60) return "Med"
  if (value <= 80) return "High"
  return "Max"
}

/* ------------------------------------------------------------------ */
/*  SectionContext                                                      */
/* ------------------------------------------------------------------ */
interface SectionContextProps {
  sectionName?: string
  sectionBars?: number
  onClose?: () => void
}

export function SectionContext({
  sectionName = "Verse",
  sectionBars = 16,
  onClose,
}: SectionContextProps) {
  const { sections, updateSection } = useProjectStore()
  const { sectionId } = useSelectionStore()

  /* Derive live section from store using sectionId */
  const liveSection = sections.find((s) => s.id === sectionId)
  const currentName = liveSection?.name ?? sectionName
  const currentBars = liveSection?.barCount ?? sectionBars

  /* Local draft for the name input */
  const [nameDraft, setNameDraft] = useState(currentName)

  /* Sync draft when the live section changes from outside */
  useEffect(() => {
    setNameDraft(currentName)
  }, [currentName])

  /* Style override toggle — cosmetic only for MVP */
  const [isOverriding, setIsOverriding] = useState(false)
  const [sliders, setSliders] = useState(INITIAL_SLIDERS)

  function handleSliderChange(index: number, newValue: number) {
    setSliders((prev) =>
      prev.map((s, i) =>
        i === index
          ? { ...s, value: newValue, display: getDisplayValue(s.label, newValue) }
          : s
      )
    )
  }

  function commitName(newName: string) {
    const name = newName.trim() || "Untitled Section"
    setNameDraft(name)
    if (liveSection) {
      updateSection(liveSection.id, { name })
    }
  }

  function adjustBars(delta: number) {
    if (!liveSection) return
    const newBarCount = Math.min(64, Math.max(1, currentBars + delta))
    updateSection(liveSection.id, { barCount: newBarCount })
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Header with back button */}
      <button
        type="button"
        onClick={onClose}
        className="flex items-center gap-1.5 px-4 py-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        <span>Back to panels</span>
      </button>

      <div className="border-t border-border px-4 pb-4 pt-4">
        {/* Section badge */}
        <div className="mb-4 flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded bg-[#27272a]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Section Inspector
          </span>
        </div>

        {/* Section name */}
        <label htmlFor="section-name-input" className="text-[10px] font-medium uppercase tracking-widest text-[#71717a]">
          Section Name
        </label>
        <input
          id="section-name-input"
          type="text"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => commitName(nameDraft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitName(nameDraft)
            if (e.key === "Escape") setNameDraft(currentName)
          }}
          className={cn(
            "mt-1.5 w-full rounded-lg border border-[#3f3f46] bg-[#27272a] px-3 py-1.5",
            "text-sm font-medium text-[#f4f4f5]",
            "focus:border-[#0891b2]/50 focus:outline-none focus:ring-1 focus:ring-[#0891b2]/30"
          )}
        />

        {/* Length */}
        <label className="mt-4 block text-[10px] font-medium uppercase tracking-widest text-[#71717a]">
          Length
        </label>
        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => adjustBars(-4)}
            className="flex size-7 items-center justify-center rounded-lg bg-[#3f3f46] text-sm font-medium text-[#a1a1aa] transition-colors hover:bg-[#52525b] hover:text-[#f4f4f5]"
          >
            {'\u2212'}
          </button>
          <span className="min-w-16 text-center font-mono text-sm text-[#f4f4f5]">
            {currentBars} bars
          </span>
          <button
            type="button"
            onClick={() => adjustBars(4)}
            className="flex size-7 items-center justify-center rounded-lg bg-[#3f3f46] text-sm font-medium text-[#a1a1aa] transition-colors hover:bg-[#52525b] hover:text-[#f4f4f5]"
          >
            +
          </button>
        </div>

        {/* Style overrides — cosmetic only for MVP */}
        <label className="mt-4 block text-[10px] font-medium uppercase tracking-widest text-[#71717a]">
          Style
        </label>

        {!isOverriding ? (
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs italic text-[#71717a]">
              Inherits from song
            </span>
            <button
              type="button"
              onClick={() => setIsOverriding(true)}
              className="text-xs text-[#0891b2] transition-colors hover:text-[#22d3ee]"
            >
              Override
            </button>
          </div>
        ) : (
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              Section override
            </span>
            <button
              type="button"
              onClick={() => setIsOverriding(false)}
              className="text-xs text-[#71717a] transition-colors hover:text-foreground"
            >
              Clear
            </button>
          </div>
        )}

        {/* Inherited / overridden controls */}
        <div
          className={cn(
            "mt-3 flex flex-col gap-3 transition-opacity duration-200",
            !isOverriding && "pointer-events-none opacity-40"
          )}
        >
          {/* Genre / Sub-style */}
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="section-genre-select" className="text-[10px] font-medium uppercase tracking-widest text-[#71717a]">
                Genre
              </label>
              <Select defaultValue="jazz">
                <SelectTrigger id="section-genre-select" className="h-7 w-full border-[#3f3f46] bg-[#27272a] text-[11px] text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jazz">Jazz</SelectItem>
                  <SelectItem value="rock">Rock</SelectItem>
                  <SelectItem value="pop">Pop</SelectItem>
                  <SelectItem value="electronic">Electronic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="section-substyle-select" className="text-[10px] font-medium uppercase tracking-widest text-[#71717a]">
                Sub-style
              </label>
              <Select defaultValue="swing">
                <SelectTrigger id="section-substyle-select" className="h-7 w-full border-[#3f3f46] bg-[#27272a] text-[11px] text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="swing">Swing</SelectItem>
                  <SelectItem value="bebop">Bebop</SelectItem>
                  <SelectItem value="bossa">Bossa Nova</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sliders */}
          <div className="flex flex-col gap-2">
            {sliders.map((slider, i) => (
              <div key={slider.label} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-[#71717a]">
                    {slider.label}
                  </span>
                  <span className="text-[10px] font-semibold text-foreground">
                    {slider.display}
                  </span>
                </div>
                <div className="group relative h-1 w-full cursor-pointer rounded-full bg-[#27272a]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${slider.value}%`,
                      background: "#0891b2",
                    }}
                  />
                  <input
                    type="range"
                    id={`section-slider-${slider.label}`}
                    min={slider.min}
                    max={slider.max}
                    value={slider.value}
                    onChange={(e) =>
                      handleSliderChange(i, Number(e.target.value))
                    }
                    className={cn(
                      "absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent",
                      "[&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5",
                      "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
                      "[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#0891b2]",
                      "[&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-sm",
                      "[&::-webkit-slider-thumb]:opacity-0 [&::-webkit-slider-thumb]:transition-opacity",
                      "group-hover:[&::-webkit-slider-thumb]:opacity-100",
                      "[&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5",
                      "[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full",
                      "[&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-[#0891b2]",
                      "[&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:shadow-sm"
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delete Section */}
        <button
          type="button"
          className="mt-6 text-xs text-[#71717a] transition-colors hover:text-red-400"
        >
          Delete Section
        </button>
      </div>
    </div>
  )
}
