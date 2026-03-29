import { useState, type ChangeEvent } from "react"
import { cn } from "@/lib/utils"
import { ChordPalette } from "./ChordPalette"
import { useProjectStore } from "@/store/project-store"
import { useGenerate } from "@/hooks/useGenerate"
import { useUiStore } from "@/store/ui-store"

const INPUT_TABS = ["Chord", "Text", "Upload"] as const
type InputTab = (typeof INPUT_TABS)[number]

export function InputSection() {
  const [activeTab, setActiveTab] = useState<InputTab>("Chord")
  const [isImporting, setIsImporting] = useState(false)
  const [lastImportedFileName, setLastImportedFileName] = useState<string | null>(null)

  const { project, updateProject } = useProjectStore()
  const { runGeneration } = useGenerate()
  const { generationState } = useUiStore()

  const hasProject = project !== null
  const chordChartRaw = project?.chordChartRaw ?? ""
  const generationHints = project?.generationHints ?? ""
  const projectKey = project?.key ?? "C"
  const timeSignature = project?.timeSignature ?? "4/4"
  const isGenerating = generationState === "generating"

  async function handleUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ""

    if (!file || !hasProject) {
      return
    }

    setIsImporting(true)

    try {
      const importedChordChart = await file.text()
      updateProject({ chordChartRaw: importedChordChart })
      setLastImportedFileName(file.name)
    } catch (error) {
      console.error("Failed to import chord chart file", error)
    } finally {
      setIsImporting(false)
    }
  }

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

      {/* Text tab — raw chord chart textarea + description */}
      {activeTab === "Text" && (
        <div className="flex flex-col gap-3">
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
        </div>
      )}

      {/* Upload tab */}
      {activeTab === "Upload" && (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-secondary/50 p-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground">Import a chord chart text file</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Choose a plain-text file to replace the current chord chart in this project.
            </p>
          </div>

          <input
            id="upload-chord-chart-input"
            type="file"
            accept=".txt,text/plain"
            onChange={(event) => void handleUploadChange(event)}
            disabled={!hasProject || isImporting}
            className={cn(
              "block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground",
              "file:mr-3 file:rounded-sm file:border-0 file:bg-primary file:px-3 file:py-1.5",
              "file:text-xs file:font-medium file:text-primary-foreground",
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          />

          <p className="text-xs text-muted-foreground">
            {isImporting
              ? "Importing chord chart..."
              : lastImportedFileName
                ? `Last imported: ${lastImportedFileName}`
                : "Accepted format: plain-text chord chart (.txt)."}
          </p>
        </div>
      )}

      {/* Generate button */}
      <button
        type="button"
        onClick={() => void runGeneration()}
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
