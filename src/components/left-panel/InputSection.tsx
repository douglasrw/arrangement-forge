import { useState, type ChangeEvent } from "react"
import { cn } from "@/lib/utils"
import { parseChordInput } from "@/lib/chords"
import { ChordPalette } from "./ChordPalette"
import { useProjectStore } from "@/store/project-store"
import { useGenerate } from "@/hooks/useGenerate"
import { useUiStore } from "@/store/ui-store"

const INPUT_TABS = ["Chord", "Text", "Upload"] as const
type InputTab = (typeof INPUT_TABS)[number]
type UploadFeedbackTone = "neutral" | "success" | "error"
type ImportedChordChartUpload = {
  chordChartRaw: string
  generationHints: string
}

const DEFAULT_UPLOAD_FEEDBACK = "Accepted format: plain-text chord chart (.txt)."
const SECTION_HEADER_RE = /^(verse|chorus|bridge|intro|outro|tag|interlude|pre-chorus|prechorus)(\s+\d+)?\s*:?\s*$/i
const HINT_BLOCK_RE = /^(description|notes|hints)\s*:\s*(.*)$/i

function isSupportedChordChartFile(file: File) {
  return file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt")
}

function normalizeImportedChordChart(text: string) {
  return text.replace(/\r\n?/g, "\n")
}

function isSectionHeaderLine(line: string) {
  return /^\[.*\]$/.test(line) || SECTION_HEADER_RE.test(line)
}

function normalizeSectionHeader(line: string) {
  const trimmed = line.trim()

  if (/^\[.*\]$/.test(trimmed)) {
    return trimmed
  }

  return SECTION_HEADER_RE.test(trimmed)
    ? `[${trimmed.replace(/:\s*$/, "")}]`
    : trimmed
}

function isChordToken(token: string, key: string) {
  const trimmed = token.trim()

  if (!trimmed) {
    return false
  }

  return trimmed === "%" || trimmed === "/" || trimmed === "-" || trimmed.toLowerCase() === "nc" ||
    trimmed.toLowerCase() === "n.c." || parseChordInput(trimmed, key) !== null
}

function isChordChartLine(line: string, key: string) {
  const trimmed = line.trim()

  if (!trimmed) {
    return false
  }

  if (isSectionHeaderLine(trimmed)) {
    return true
  }

  const segments = trimmed.includes("|") ? trimmed.split("|") : [trimmed]
  let sawChordToken = false

  for (const segment of segments) {
    const tokens = segment
      .trim()
      .split(/\s+/)
      .filter(Boolean)

    if (tokens.length === 0) {
      continue
    }

    sawChordToken = true

    if (tokens.some((token) => !isChordToken(token, key))) {
      return false
    }
  }

  return sawChordToken
}

function trimEmptyChartLines(lines: string[]) {
  const nextLines = [...lines]

  while (nextLines[0] === "") {
    nextLines.shift()
  }

  while (nextLines.at(-1) === "") {
    nextLines.pop()
  }

  return nextLines
}

function parseImportedChordChartUpload(text: string, key: string): ImportedChordChartUpload {
  const chartLines: string[] = []
  const hintLines: string[] = []
  const normalizedLines = normalizeImportedChordChart(text).split("\n")

  let inHintBlock = false

  for (const rawLine of normalizedLines) {
    const trimmed = rawLine.trim()

    if (!trimmed) {
      if (chartLines.at(-1) !== "") {
        chartLines.push("")
      }
      inHintBlock = false
      continue
    }

    const hintMatch = trimmed.match(HINT_BLOCK_RE)
    if (hintMatch) {
      inHintBlock = true
      if (hintMatch[2]) {
        hintLines.push(hintMatch[2].trim())
      }
      continue
    }

    if (inHintBlock && !isChordChartLine(trimmed, key)) {
      hintLines.push(trimmed)
      continue
    }

    inHintBlock = false

    if (isChordChartLine(trimmed, key)) {
      chartLines.push(normalizeSectionHeader(trimmed))
      continue
    }

    hintLines.push(trimmed)
  }

  return {
    chordChartRaw: trimEmptyChartLines(chartLines).join("\n"),
    generationHints: hintLines.join("\n"),
  }
}

function formatImportedNotesFeedback(
  fileName: string,
  generationHints: string,
  existingGenerationHints: string
) {
  const noteCount = generationHints
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length

  if (noteCount === 0) {
    if (existingGenerationHints.trim()) {
      return `Imported ${fileName} into the current chord chart. Existing Description was kept.`
    }

    return `Imported ${fileName} into the current chord chart.`
  }

  return `Imported ${fileName} and updated Description with ${noteCount} note ${noteCount === 1 ? "line" : "lines"}.`
}

export function InputSection() {
  const [activeTab, setActiveTab] = useState<InputTab>("Chord")
  const [isImporting, setIsImporting] = useState(false)
  const [uploadFeedback, setUploadFeedback] = useState<{
    tone: UploadFeedbackTone
    message: string
  }>({
    tone: "neutral",
    message: DEFAULT_UPLOAD_FEEDBACK,
  })

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

    if (!isSupportedChordChartFile(file)) {
      setUploadFeedback({
        tone: "error",
        message: "Unsupported file type. Upload a plain-text chord chart file (.txt).",
      })
      return
    }

    setIsImporting(true)

    try {
      const existingGenerationHints = project?.generationHints ?? ""
      const importedUpload = parseImportedChordChartUpload(await file.text(), project?.key ?? "C")

      if (!importedUpload.chordChartRaw.trim()) {
        setUploadFeedback({
          tone: "error",
          message: "No chord chart was found in that file. Current chord chart was left unchanged.",
        })
        return
      }

      updateProject({
        chordChartRaw: importedUpload.chordChartRaw,
        ...(importedUpload.generationHints
          ? { generationHints: importedUpload.generationHints }
          : {}),
      })
      setUploadFeedback({
        tone: "success",
        message: formatImportedNotesFeedback(
          file.name,
          importedUpload.generationHints,
          existingGenerationHints
        ),
      })
    } catch (error) {
      console.error("Failed to import chord chart file", error)
      setUploadFeedback({
        tone: "error",
        message: "Could not read that file. Current chord chart was left unchanged.",
      })
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
              Choose a plain-text file to replace the current chord chart. Note lines are copied into Description when they do not read like chord bars. If the file has no note lines, the current Description stays unchanged.
            </p>
          </div>

          <input
            id="upload-chord-chart-input"
            type="file"
            accept=".txt,text/*"
            onChange={(event) => void handleUploadChange(event)}
            disabled={!hasProject || isImporting}
            className={cn(
              "block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground",
              "file:mr-3 file:rounded-sm file:border-0 file:bg-primary file:px-3 file:py-1.5",
              "file:text-xs file:font-medium file:text-primary-foreground",
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          />

          <p
            className={cn(
              "text-xs",
              isImporting
                ? "text-muted-foreground"
                : uploadFeedback.tone === "error"
                  ? "text-destructive"
                  : uploadFeedback.tone === "success"
                    ? "text-foreground"
                    : "text-muted-foreground"
            )}
          >
            {isImporting ? "Importing chord chart..." : uploadFeedback.message}
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
