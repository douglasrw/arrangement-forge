import { useState } from "react"
import { cn } from "@/lib/utils"
import { ChordPalette } from "./ChordPalette"
import { useProjectStore } from "@/store/project-store"
import { useGenerate } from "@/hooks/useGenerate"
import { useUiStore } from "@/store/ui-store"

const INPUT_TABS = ["Text", "Upload", "Image"] as const
type InputTab = (typeof INPUT_TABS)[number]

export function InputSection() {
  const [activeTab, setActiveTab] = useState<InputTab>("Text")

  const { project, updateProject } = useProjectStore()
  const { runGeneration } = useGenerate()
  const { generationState } = useUiStore()

  const chordChartRaw = project?.chordChartRaw ?? ""
  const generationHints = project?.generationHints ?? ""
  const isGenerating = generationState === "generating"

  return (
    <div className="flex flex-col gap-3">
      {/* Tab switcher row */}
      <div className="flex gap-1 rounded-md bg-secondary p-0.5">
        {INPUT_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 rounded-[5px] px-2 py-1.5 text-xs font-medium transition-colors",
              activeTab === tab
                ? "bg-[#0891b2] text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Chord Palette (Text tab) */}
      {activeTab === "Text" && <ChordPalette />}

      {/* Upload tab placeholder */}
      {activeTab === "Upload" && (
        <p className="rounded-md border border-border bg-secondary/50 px-3 py-4 text-center text-xs text-muted-foreground">
          File upload — Coming soon
        </p>
      )}

      {/* Image tab placeholder */}
      {activeTab === "Image" && (
        <p className="rounded-md border border-border bg-secondary/50 px-3 py-4 text-center text-xs text-muted-foreground">
          Image OCR — Coming soon
        </p>
      )}

      {/* Chord chart raw text field (hidden textarea for store sync) */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="chord-chart-raw-input"
          className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
        >
          Chord Chart
        </label>
        <textarea
          id="chord-chart-raw-input"
          value={chordChartRaw}
          onChange={(e) => updateProject({ chordChartRaw: e.target.value })}
          rows={3}
          placeholder="e.g. Cmaj7 | Am7 | Dm7 | G7"
          className={cn(
            "w-full resize-none rounded-md border border-border bg-secondary px-3 py-2",
            "font-mono text-xs leading-relaxed text-foreground",
            "placeholder:text-muted-foreground",
            "focus:border-[#0891b2] focus:outline-none focus:ring-1 focus:ring-[#0891b2]/50"
          )}
        />
      </div>

      {/* Description / generation hints field */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="description-input"
          className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
        >
          Description
        </label>
        <textarea
          id="description-input"
          value={generationHints}
          onChange={(e) => updateProject({ generationHints: e.target.value })}
          rows={2}
          placeholder="Jazz waltz, medium tempo, brushes on snare, walking bass..."
          className={cn(
            "w-full resize-none rounded-md border border-border bg-secondary px-3 py-2",
            "text-xs leading-relaxed text-foreground",
            "placeholder:text-muted-foreground",
            "focus:border-[#0891b2] focus:outline-none focus:ring-1 focus:ring-[#0891b2]/50"
          )}
        />
      </div>

      {/* Generate button */}
      <button
        type="button"
        onClick={() => void runGeneration(false)}
        disabled={isGenerating || !chordChartRaw.trim()}
        className={cn(
          "w-full rounded-xl py-2.5 text-sm font-semibold transition-colors",
          isGenerating || !chordChartRaw.trim()
            ? "cursor-not-allowed bg-[#27272a] text-muted-foreground"
            : "bg-[#14b8a6] text-[#09090b] shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:bg-[#2dd4bf]"
        )}
      >
        {isGenerating ? "Generating..." : "Generate"}
      </button>
    </div>
  )
}
