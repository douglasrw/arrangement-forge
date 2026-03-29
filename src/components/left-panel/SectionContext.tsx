import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useProjectStore } from "@/store/project-store"
import { useSelectionStore } from "@/store/selection-store"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"

function getEnergyDisplayValue(value: number): string {
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
  const { project, sections, updateSection, removeSection } = useProjectStore()
  const { sectionId, selectSong } = useSelectionStore()

  /* Derive live section from store using sectionId */
  const liveSection = sections.find((s) => s.id === sectionId)
  const currentName = liveSection?.name ?? sectionName
  const currentBars = liveSection?.barCount ?? sectionBars
  const projectEnergy = project?.energy ?? 50
  const effectiveEnergy = liveSection?.energyOverride ?? projectEnergy
  const isEnergyInherited = liveSection?.energyOverride == null
  const hasHiddenStyleOverrides = liveSection
    ? [
        liveSection.grooveOverride,
        liveSection.feelOverride,
        liveSection.swingPctOverride,
        liveSection.dynamicsOverride,
      ].some((value) => value !== null)
    : false

  /* Local draft for the name input */
  const [nameDraft, setNameDraft] = useState(currentName)

  /* Sync draft when the live section changes from outside */
  useEffect(() => {
    setNameDraft(currentName)
  }, [currentName])

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

  function updateEnergyOverride(value: number) {
    if (!liveSection) return
    updateSection(liveSection.id, { energyOverride: value })
  }

  function resetEnergyOverride() {
    if (!liveSection || liveSection.energyOverride == null) return
    updateSection(liveSection.id, { energyOverride: null })
  }

  /* Confirm dialog for delete section */
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  function handleDeleteSection() {
    if (!liveSection) return
    selectSong()          // clear selection synchronously before mutation
    removeSection(liveSection.id)
    setConfirmDeleteOpen(false)
    onClose?.()
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
          <div className="flex size-6 items-center justify-center rounded bg-secondary">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Section Inspector
          </span>
        </div>

        {/* Section name */}
        <label htmlFor="section-name-input" className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
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
            "mt-1.5 w-full rounded-lg border border-border bg-secondary px-3 py-1.5",
            "text-sm font-medium text-zinc-100",
            "focus:border-ring/50 focus:outline-none focus:ring-1 focus:ring-ring/30"
          )}
        />

        {/* Length */}
        <label className="mt-4 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
          Length
        </label>
        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => adjustBars(-4)}
            className="flex size-7 items-center justify-center rounded-lg bg-input text-sm font-medium text-muted-foreground transition-colors hover:bg-zinc-600 hover:text-zinc-100"
          >
            {'\u2212'}
          </button>
          <span className="min-w-16 text-center font-mono text-sm text-zinc-100">
            {currentBars} bars
          </span>
          <button
            type="button"
            onClick={() => adjustBars(4)}
            className="flex size-7 items-center justify-center rounded-lg bg-input text-sm font-medium text-muted-foreground transition-colors hover:bg-zinc-600 hover:text-zinc-100"
          >
            +
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-border/70 bg-secondary/30 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                Section Energy Override
              </h3>
              <p className="text-xs text-muted-foreground">
                {isEnergyInherited
                  ? "This section is inheriting the project energy default."
                  : "This section is carrying its own saved energy override."}
              </p>
            </div>
            <span className="rounded border border-border/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {isEnergyInherited ? "Project" : "Section"}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <label
              htmlFor="section-slider-Energy"
              className="text-[11px] font-medium text-muted-foreground"
            >
              Energy
            </label>
            <span className="min-w-[4rem] shrink-0 text-right text-[11px] font-semibold text-foreground">
              {getEnergyDisplayValue(effectiveEnergy)} ({effectiveEnergy})
            </span>
          </div>

          <div className="group relative mt-2 h-1.5 w-full rounded-full bg-secondary">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-ring"
              style={{ width: `${effectiveEnergy}%` }}
            />
            <input
              type="range"
              id="section-slider-Energy"
              aria-label="Section energy override"
              min={0}
              max={100}
              value={effectiveEnergy}
              disabled={!liveSection}
              onChange={(e) => updateEnergyOverride(Number(e.target.value))}
              className={cn(
                "absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent",
                "disabled:cursor-not-allowed disabled:opacity-40",
                "[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3",
                "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
                "[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-ring",
                "[&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-sm",
                "[&::-webkit-slider-thumb]:opacity-0 [&::-webkit-slider-thumb]:transition-opacity",
                "group-hover:[&::-webkit-slider-thumb]:opacity-100",
                "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3",
                "[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full",
                "[&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-ring",
                "[&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:shadow-sm"
              )}
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Project default: {getEnergyDisplayValue(projectEnergy)} ({projectEnergy})
            </p>
            <button
              type="button"
              onClick={resetEnergyOverride}
              disabled={!liveSection || isEnergyInherited}
              className="rounded border border-border/70 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:text-muted-foreground"
            >
              Use project default
            </button>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-border/70 bg-secondary/20 p-3">
          <h3 className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            More Overrides Unavailable
          </h3>
          <p className="mt-2 text-sm text-foreground">
            Groove, feel, swing, and dynamics are not editable per section here yet.
          </p>
          {hasHiddenStyleOverrides && (
            <p className="mt-2 text-xs text-muted-foreground">
              This section still carries saved override data for fields that remain hidden in this inspector.
            </p>
          )}
        </div>

        {/* Delete Section */}
        <button
          type="button"
          onClick={() => setConfirmDeleteOpen(true)}
          className="mt-6 text-xs text-zinc-500 transition-colors hover:text-red-400"
        >
          Delete Section
        </button>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteSection}
        title="Delete Section?"
        body={`This will permanently delete "${currentName}" and all its blocks. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
