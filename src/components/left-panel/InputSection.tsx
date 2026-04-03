import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { cn } from "@/lib/utils"
import { parseChordInput } from "@/lib/chords"
import { parseChordChart } from "@/lib/chord-chart-parser"
import { ChordPalette } from "./ChordPalette"
import { getInputReadinessTruth } from "./left-panel-readiness"
import { useProjectStore } from "@/store/project-store"
import { useGenerate } from "@/hooks/useGenerate"
import { useUiStore } from "@/store/ui-store"

const INPUT_TABS = ["Chord", "Text", "Upload"] as const
type InputTab = (typeof INPUT_TABS)[number]
type UploadFeedbackTone = "neutral" | "success" | "blocked" | "error"
type InputTabSelectionTone = "default" | "selected"
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

function looksLikeLooseChordToken(token: string) {
  const trimmed = token.trim()

  if (!trimmed) {
    return false
  }

  if (trimmed === "%" || trimmed === "/" || trimmed === "-" || trimmed.toLowerCase() === "nc" ||
    trimmed.toLowerCase() === "n.c.") {
    return true
  }

  return /^[A-G](?:#|b)?(?:maj|min|m|dim|aug|sus|add|M)?[0-9a-zA-Z#b/+()-]*$/.test(trimmed) ||
    /^[ivIV]+[0-9a-zA-Z#b/+()-]*$/.test(trimmed) ||
    (/[^A-Za-z]/.test(trimmed) && /^[A-Za-z0-9#b/+()%?.-]{1,16}$/.test(trimmed))
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

function isBarDelimitedChordChartLine(line: string) {
  return line.includes("|")
}

function isLooselyChordChartLine(line: string, key: string) {
  const trimmed = line.trim()

  if (!trimmed) {
    return false
  }

  if (isSectionHeaderLine(trimmed)) {
    return true
  }

  const segments = trimmed.includes("|") ? trimmed.split("|") : [trimmed]
  let sawChordLikeToken = false

  for (const segment of segments) {
    const tokens = segment
      .trim()
      .split(/\s+/)
      .filter(Boolean)

    if (tokens.length === 0) {
      continue
    }

    for (const token of tokens) {
      if (isChordToken(token, key)) {
        sawChordLikeToken = true
        continue
      }

      if (!looksLikeLooseChordToken(token)) {
        return false
      }

      sawChordLikeToken = true
    }
  }

  return sawChordLikeToken
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

function getLineSelectionRange(text: string, lineNumber: number) {
  if (lineNumber < 1) {
    return null
  }

  let lineStart = 0
  let currentLine = 1

  while (currentLine < lineNumber) {
    const nextLineBreak = text.indexOf("\n", lineStart)

    if (nextLineBreak === -1) {
      return null
    }

    lineStart = nextLineBreak + 1
    currentLine += 1
  }

  const nextLineBreak = text.indexOf("\n", lineStart)

  return {
    start: lineStart,
    end: nextLineBreak === -1 ? text.length : nextLineBreak,
  }
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

    if (inHintBlock && !isChordChartLine(trimmed, key) && !isLooselyChordChartLine(trimmed, key)) {
      hintLines.push(trimmed)
      continue
    }

    inHintBlock = false

    // Keep likely chord rows in the chart even when some bars are invalid so
    // the parser can surface blocked-state truth instead of silently dropping them.
    if (isChordChartLine(trimmed, key) || isBarDelimitedChordChartLine(trimmed) || isLooselyChordChartLine(trimmed, key)) {
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

function formatImportedChordChartFeedback(
  fileName: string,
  generationHints: string,
  existingGenerationHints: string,
  parseTruth: ReturnType<typeof parseChordChart>["truth"]
) {
  const baseMessage = formatImportedNotesFeedback(fileName, generationHints, existingGenerationHints)

  if (parseTruth.state !== "blocked") {
    return baseMessage
  }

  return [
    baseMessage,
    `Chart is blocked: ${parseTruth.title}. ${parseTruth.currentState}`,
    parseTruth.summary ? `Why it is blocked: ${parseTruth.summary}` : null,
    parseTruth.nextStep ? `Next step: ${parseTruth.nextStep}` : null,
    parseTruth.issueHighlights.length
      ? `Flagged chart locations: ${parseTruth.issueHighlights.join(" ")}`
      : null,
    parseTruth.remainingIssueCount > 0
      ? `${parseTruth.remainingIssueCount} more flagged ${parseTruth.remainingIssueCount === 1 ? "bar needs" : "bars need"} review in the chord chart before generation.`
      : null,
  ].filter(Boolean).join(" ")
}

function getGenerateGateMessage(args: {
  hasProject: boolean
  hasChordChart: boolean
  isImporting: boolean
  isGenerating: boolean
  parseTruth: ReturnType<typeof parseChordChart>["truth"] | null
}) {
  const { hasProject, hasChordChart, isImporting, isGenerating, parseTruth } = args

  if (!hasProject) {
    return "Generate stays unavailable until a project is loaded."
  }

  if (isImporting) {
    return "Generate unlocks after the current chord-chart import finishes."
  }

  if (isGenerating) {
    return "Generate is already running for the current arrangement."
  }

  if (!hasChordChart) {
    return "Generate unlocks after the chord chart includes at least one bar."
  }

  if (parseTruth?.state === "blocked") {
    return parseTruth.nextStep
      ? `Generate is blocked. Next step: ${parseTruth.nextStep}`
      : `Generate is blocked. ${parseTruth.currentState}`
  }

  return null
}

function getInputTabSelectionTruth(args: {
  activeTab: InputTab
  hasChordChart: boolean
  hasParseBlockers: boolean
  reviewLineNumber: number | null
}) {
  const { activeTab, hasChordChart, hasParseBlockers, reviewLineNumber } = args

  if (activeTab === "Text") {
    return {
      badge: "Text selected",
      summary: hasParseBlockers
        ? "Text is active so the raw chord chart truth and any blocked rows can be reviewed directly."
        : "Text is active so the raw chord chart and Description can be edited directly.",
      selectionLabel: "Current selection",
      selectionValue: "Text editor",
      footer: reviewLineNumber !== null
        ? `The blocked chart row at line ${reviewLineNumber} is focused here for direct review.`
        : "Use this tab when you need line-aware chord chart edits or note updates.",
      tone: "selected" as InputTabSelectionTone,
    }
  }

  if (activeTab === "Upload") {
    return {
      badge: "Upload selected",
      summary: "Upload is active so the next plain-text file import will replace the current chord chart.",
      selectionLabel: "Current selection",
      selectionValue: "File import",
      footer: hasChordChart
        ? "Description lines are preserved unless the imported file includes new note text."
        : "Import a plain-text chart here to create the first chord chart for this project.",
      tone: "selected" as InputTabSelectionTone,
    }
  }

  return {
    badge: "Default tab",
    summary: "Chord is active because Input opens on the song chord chart by default.",
    selectionLabel: "Current selection",
    selectionValue: hasChordChart ? "Chord palette" : "Chord palette (empty chart)",
    footer: hasParseBlockers
      ? "Use Text to inspect the blocked chart rows directly or Upload to replace the chart from file."
      : "Use Text for line-by-line chart edits or Upload to replace the chart from file.",
    tone: "default" as InputTabSelectionTone,
  }
}

export function InputSection() {
  const [activeTab, setActiveTab] = useState<InputTab>("Chord")
  const [isImporting, setIsImporting] = useState(false)
  const [shouldFocusChordChartEditor, setShouldFocusChordChartEditor] = useState(false)
  const [reviewLineNumber, setReviewLineNumber] = useState<number | null>(null)
  const [activeReviewLineNumber, setActiveReviewLineNumber] = useState<number | null>(null)
  const [uploadFeedback, setUploadFeedback] = useState<{
    tone: UploadFeedbackTone
    message: string
  }>({
    tone: "neutral",
    message: DEFAULT_UPLOAD_FEEDBACK,
  })
  const chordChartEditorRef = useRef<HTMLTextAreaElement | null>(null)

  const { project, updateProject } = useProjectStore()
  const { runGeneration } = useGenerate()
  const { generationState } = useUiStore()

  const hasProject = project !== null
  const chordChartRaw = project?.chordChartRaw ?? ""
  const generationHints = project?.generationHints ?? ""
  const projectKey = project?.key ?? "C"
  const timeSignature = project?.timeSignature ?? "4/4"
  const hasChordChart = Boolean(chordChartRaw.trim())
  const parseResult = hasProject && hasChordChart
    ? parseChordChart(chordChartRaw, projectKey)
    : null
  const hasParseBlockers = parseResult?.truth.state === "blocked"
  const isGenerating = generationState === "generating"
  const inputReadiness = getInputReadinessTruth({
    hasProject,
    hasChordChart,
    hasParseIssues: hasParseBlockers,
    parseTruth: parseResult?.truth ?? null,
    generationState,
    isImporting,
  })
  const uploadBlocked = !hasProject || isGenerating || isImporting
  const canGenerate = hasProject && hasChordChart && !hasParseBlockers && !isGenerating && !isImporting
  const uploadStatusMessage = !hasProject
    ? "Load a project to enable chord chart imports."
    : isGenerating
      ? "Import is paused while the current arrangement is generating."
      : isImporting
        ? "Importing chord chart..."
        : uploadFeedback.message
  const parseTruth = parseResult?.truth ?? null
  const firstBlockedIssue = parseResult?.issues[0] ?? null
  const chordChartFieldHintId = "chord-chart-raw-input-hint"
  const inputReadinessTitle = hasParseBlockers
    ? parseTruth?.title ?? inputReadiness.title
    : inputReadiness.title
  const inputReadinessDetail = inputReadiness.detail
  const parseFeedbackHighlights = hasParseBlockers && parseTruth?.issueHighlights.length
    ? `Flagged chart locations: ${parseTruth.issueHighlights.join(" ")}`
    : null
  const parseFeedbackBlockedTokens = hasParseBlockers && parseTruth?.blockedTokenLabels.length
    ? `Blocked tokens: ${parseTruth.blockedTokenLabels.join("; ")}.`
    : null
  const parseFeedbackOverflow = hasParseBlockers && (parseTruth?.remainingIssueCount ?? 0) > 0
    ? `${parseTruth?.remainingIssueCount} more flagged ${parseTruth?.remainingIssueCount === 1 ? "bar needs" : "bars need"} review in the chord chart before generation.`
    : null
  const chordChartEditorHint = hasParseBlockers && parseTruth
    ? [
      parseTruth.currentState,
      parseTruth.summary,
      parseTruth.nextStep ? `Next step: ${parseTruth.nextStep}` : "Fix the flagged chord bars before generating.",
      parseFeedbackBlockedTokens,
      parseFeedbackHighlights,
      parseFeedbackOverflow,
    ].filter(Boolean).join(" ")
    : "Use one bar per token or pipe-separated bar, and bracket section labels like [Verse] when needed."
  const generateGateMessage = !canGenerate
    ? getGenerateGateMessage({
      hasProject,
      hasChordChart,
      isImporting,
      isGenerating,
      parseTruth,
    })
    : null
  const reviewBlockedChartLabel = firstBlockedIssue
    ? `Review chord chart text at line ${firstBlockedIssue.lineNumber}`
    : "Review chord chart text"
  const inputTabSelectionTruth = getInputTabSelectionTruth({
    activeTab,
    hasChordChart,
    hasParseBlockers,
    reviewLineNumber: activeTab === "Text" ? activeReviewLineNumber : null,
  })

  useEffect(() => {
    if (!shouldFocusChordChartEditor || activeTab !== "Text") {
      return
    }

    const chordChartEditor = chordChartEditorRef.current

    chordChartEditor?.focus()

    if (reviewLineNumber !== null && chordChartEditor) {
      const selectionRange = getLineSelectionRange(chordChartRaw, reviewLineNumber)

      if (selectionRange) {
        chordChartEditor.setSelectionRange(selectionRange.start, selectionRange.end)
      }
    }

    setShouldFocusChordChartEditor(false)
    setReviewLineNumber(null)
  }, [activeTab, chordChartRaw, reviewLineNumber, shouldFocusChordChartEditor])

  function handleReviewBlockedChart() {
    const nextReviewLineNumber = firstBlockedIssue?.lineNumber ?? null

    setReviewLineNumber(nextReviewLineNumber)
    setActiveReviewLineNumber(nextReviewLineNumber)
    setShouldFocusChordChartEditor(true)
    setActiveTab("Text")
  }

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
      const importedParseTruth = parseChordChart(importedUpload.chordChartRaw, project?.key ?? "C").truth
      setUploadFeedback({
        tone: importedParseTruth.state === "blocked" ? "blocked" : "success",
        message: formatImportedChordChartFeedback(
          file.name,
          importedUpload.generationHints,
          existingGenerationHints,
          importedParseTruth
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
      <div
        data-input-readiness={inputReadiness.state}
        role="status"
        aria-live="polite"
        className={cn(
          "flex items-start gap-2 rounded-md border px-3 py-2 text-xs leading-relaxed",
          inputReadiness.state === "ready"
            ? "border-emerald-500/30 bg-emerald-500/10 text-foreground"
            : inputReadiness.state === "empty"
              ? "border-border bg-secondary/40 text-foreground"
              : inputReadiness.state === "blocked"
                ? "border-destructive/30 bg-destructive/10 text-foreground"
                : "border-amber-500/30 bg-amber-500/10 text-foreground"
        )}
      >
        <span
          className={cn(
            "mt-1 size-1.5 shrink-0 rounded-full",
            inputReadiness.state === "ready"
              ? "bg-emerald-300"
              : inputReadiness.state === "empty"
                ? "bg-muted-foreground"
                : inputReadiness.state === "blocked"
                  ? "bg-destructive"
                  : "bg-amber-300"
          )}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                inputReadiness.state === "ready"
                  ? "bg-emerald-500/10 text-emerald-300"
                  : inputReadiness.state === "empty"
                    ? "bg-card text-muted-foreground"
                    : inputReadiness.state === "blocked"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-amber-500/10 text-amber-300"
              )}
            >
              {inputReadiness.badge}
            </span>
            <span className="font-medium text-foreground">{inputReadinessTitle}</span>
          </div>
          <p className="mt-1 text-muted-foreground">{inputReadinessDetail}</p>
        </div>
      </div>

      {hasParseBlockers && (
        <div
          data-chord-chart-parse-state="blocked"
          role="status"
          aria-live="polite"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-foreground"
        >
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-destructive">
              Blocked
            </span>
            <span className="font-medium text-foreground">{parseTruth?.title ?? inputReadiness.title}</span>
          </div>
          {parseTruth?.currentState && (
            <p className="mt-1 text-muted-foreground">{parseTruth.currentState}</p>
          )}
          {parseTruth?.summary && (
            <p className="mt-1 text-muted-foreground">{parseTruth.summary}</p>
          )}
          {parseTruth?.nextStep && (
            <p className="mt-1 text-muted-foreground">Next step: {parseTruth.nextStep}</p>
          )}
          {parseFeedbackBlockedTokens && (
            <p className="mt-1 text-muted-foreground">{parseFeedbackBlockedTokens}</p>
          )}
          {parseFeedbackHighlights && (
            <p className="mt-1 text-muted-foreground">{parseFeedbackHighlights}</p>
          )}
          {parseFeedbackOverflow && (
            <p className="mt-1 text-muted-foreground">{parseFeedbackOverflow}</p>
          )}
          {activeTab !== "Text" && (
            <button
              type="button"
              onClick={handleReviewBlockedChart}
              className="mt-2 inline-flex rounded-md border border-destructive/40 px-2 py-1 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/10 focus:outline-none focus:ring-1 focus:ring-destructive/40"
            >
              {reviewBlockedChartLabel}
            </button>
          )}
        </div>
      )}

      <div
        data-input-tab-selection-state={inputTabSelectionTruth.tone}
        className={cn(
          "rounded-md border px-3 py-2 text-xs leading-relaxed",
          inputTabSelectionTruth.tone === "default"
            ? "border-border bg-secondary/40 text-foreground"
            : "border-sky-500/30 bg-sky-500/10 text-foreground"
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
              inputTabSelectionTruth.tone === "default"
                ? "bg-card text-muted-foreground"
                : "bg-sky-500/10 text-sky-200"
            )}
          >
            {inputTabSelectionTruth.badge}
          </span>
          <span className="font-medium text-foreground">{inputTabSelectionTruth.summary}</span>
        </div>
        <p className="mt-1 text-muted-foreground">
          <span className="font-medium text-foreground">{inputTabSelectionTruth.selectionLabel}: </span>
          {inputTabSelectionTruth.selectionValue}
        </p>
        <p className="mt-1 text-muted-foreground">{inputTabSelectionTruth.footer}</p>
      </div>

      {/* Tab switcher row */}
      <div className="flex gap-1 rounded-md bg-secondary p-0.5">
        {INPUT_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            aria-pressed={activeTab === tab}
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
              ref={chordChartEditorRef}
              id="chord-chart-raw-input"
              value={chordChartRaw}
              onChange={(e) => updateProject({ chordChartRaw: e.target.value })}
              rows={4}
              placeholder={"[Verse]\nCmaj7 | Dm7 | G7 | Cmaj7\n\n[Chorus]\nF | G | Am | C"}
              aria-invalid={hasParseBlockers}
              aria-describedby={chordChartFieldHintId}
              className={cn(
                "w-full resize-none rounded-md bg-secondary px-3 py-2",
                "font-mono text-xs leading-relaxed text-foreground",
                "placeholder:text-muted-foreground",
                hasParseBlockers ? "border border-destructive/60" : "border border-border",
                "focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50"
              )}
            />
            <p
              id={chordChartFieldHintId}
              data-chord-chart-editor-state={hasParseBlockers ? "blocked" : "ready"}
              className={cn(
                "text-xs leading-relaxed",
                hasParseBlockers ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {chordChartEditorHint}
            </p>
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
        <div
          data-upload-readiness={uploadBlocked ? "blocked" : "ready"}
          className={cn(
            "flex flex-col gap-3 rounded-md border p-3",
            uploadBlocked
              ? "border-amber-500/30 bg-amber-500/10"
              : "border-border bg-secondary/50"
          )}
        >
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
            disabled={uploadBlocked}
            className={cn(
              "block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground",
              "file:mr-3 file:rounded-sm file:border-0 file:bg-primary file:px-3 file:py-1.5",
              "file:text-xs file:font-medium file:text-primary-foreground",
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          />

          <p
            data-upload-feedback-tone={uploadFeedback.tone}
            className={cn(
              "text-xs",
              uploadBlocked && !isImporting
                ? "text-amber-200"
                : isImporting
                ? "text-muted-foreground"
                : uploadFeedback.tone === "error"
                  ? "text-destructive"
                  : uploadFeedback.tone === "blocked"
                    ? "text-destructive"
                  : uploadFeedback.tone === "success"
                    ? "text-foreground"
                    : "text-muted-foreground"
            )}
          >
            {uploadStatusMessage}
          </p>
        </div>
      )}

      {/* Generate button */}
      <button
        type="button"
        onClick={() => void runGeneration()}
        disabled={!canGenerate}
        className={cn(
          "w-full rounded-md px-4 py-2 text-sm font-medium transition-colors",
          !canGenerate
            ? "cursor-not-allowed opacity-50 bg-primary text-primary-foreground"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {isImporting ? "Importing..." : isGenerating ? "Generating..." : "Generate"}
      </button>

      {generateGateMessage && (
        <p
          data-generate-gate-state={hasParseBlockers ? "blocked" : "waiting"}
          className={cn(
            "text-xs leading-relaxed",
            hasParseBlockers ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {generateGateMessage}
        </p>
      )}
    </div>
  )
}
