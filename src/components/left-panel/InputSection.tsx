import { useState } from "react"
import { cn } from "@/lib/utils"
import { ChordPalette } from "./ChordPalette"
import { useProjectStore } from "@/store/project-store"
import { useGenerate } from "@/hooks/useGenerate"
import { useUiStore } from "@/store/ui-store"

const INPUT_TABS = ["Chord", "Text", "Upload"] as const
type InputTab = (typeof INPUT_TABS)[number]

export function InputSection() {
  const [activeTab, setActiveTab] = useState<InputTab>("Chord")

  const { project, updateProject } = useProjectStore()
  const { runGeneration } = useGenerate()
  const { generationState } = useUiStore()

  const chordChartRaw = project?.chordChartRaw ?? ""
  const generationHints = project?.generationHints ?? ""
  const projectKey = project?.key ?? "C"
  const timeSignature = project?.timeSignature ?? "4/4"
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
                ? "bg-ring text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Chord Palette (Chord tab) */}
      {activeTab === "Chord" && (
        <ChordPalette
          initialChords={chordChartRaw ? chordChartRaw.split(/[|\n]/).map(s => s.trim()).filter(Boolean) : []}
          onChordsChange={(text) => updateProject({ chordChartRaw: text })}
          projectKey={projectKey}
          timeSignature={timeSignature}
          onTimeSignatureChange={(ts) => updateProject({ timeSignature: ts })}
        />
      )}

      {/* Text tab — raw chord chart textarea */}
      {activeTab === "Text" && (
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
            rows={4}
            placeholder={"[Verse]\nCmaj7 | Dm7 | G7 | Cmaj7\n\n[Chorus]\nF | G | Am | C"}
            className={cn(
              "w-full resize-none rounded-md border border-border bg-secondary px-3 py-2",
              "font-mono text-xs leading-relaxed text-foreground",
              "placeholder:text-muted-foreground",
              "focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50"
            )}
          />
        </div>
      )}

      {/* Upload tab placeholder */}
      {activeTab === "Upload" && (
        <p className="rounded-md border border-border bg-secondary/50 px-3 py-4 text-center text-xs text-muted-foreground">
          File upload — Coming soon
        </p>
      )}

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
            "focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50"
          )}
        />
      </div>

      {/* Generate button */}
      <button
        type="button"
        onClick={() => void runGeneration(false)}
        disabled={isGenerating || !chordChartRaw.trim()}
        className={cn(
          "w-full rounded-md px-4 py-2 text-sm font-medium transition-colors",
          isGenerating || !chordChartRaw.trim()
            ? "cursor-not-allowed opacity-50 bg-primary text-primary-foreground"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {isGenerating ? "Generating..." : "Generate"}
      </button>
    </div>
  )
}
