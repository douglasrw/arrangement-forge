import type { ChordChartParseTruth } from "@/lib/chord-chart-parser"
import type { ProjectSelectionTruth } from "@/store/project-store"
import type { GenerationState, SystemStatus } from "@/types"

export type LeftPanelTruthTone = "ready" | "attention" | "neutral"

type LeftPanelReadinessInputs = {
  hasProject: boolean
  hasChordChart: boolean
  hasParseIssues?: boolean
  parseTruth?: ChordChartParseTruth | null
  generationState: GenerationState
  systemStatus?: SystemStatus
  errorMessage?: string | null
  isImporting?: boolean
}

export type InputReadinessState = "waiting" | "empty" | "blocked" | "ready"

export type InputReadinessTruth = {
  state: InputReadinessState
  badge: string
  title: string
  detail: string
}

export type AiAssistantReadinessTruth = {
  status: "blocked" | "waiting" | "ready"
  badge: string
  title: string
  detail: string
  tone: LeftPanelTruthTone
}

export type StyleControlsReadinessTruth = {
  badge: string
  title: string
  detail: string
  tone: LeftPanelTruthTone
}

export type LeftPanelSectionTruth = {
  badge: string
  title: string
  detail: string
  tone: LeftPanelTruthTone
}

export type LeftPanelShellState = "waiting" | "blocked" | "ready"

export type LeftPanelCoordinationTruth = {
  state: LeftPanelShellState
  badge: string
  title: string
  detail: string
  tone: LeftPanelTruthTone
  sections: {
    input: LeftPanelSectionTruth
    style: LeftPanelSectionTruth
    ai: LeftPanelSectionTruth
  }
}

export type LeftPanelShellSelectionTruth = {
  badge: string
  title: string
  scopeLabel: string
  scopeValue: string
  detail: string
  tone: LeftPanelTruthTone
}

function describeBlockedChordChart(parseTruth?: ChordChartParseTruth | null) {
  const currentState = parseTruth?.currentState?.trim()
  const summary = parseTruth?.summary?.trim()
  const nextStep = parseTruth?.nextStep?.trim()
  const blockedTokenLabels = parseTruth?.blockedTokenLabels?.filter(Boolean) ?? []
  const issueHighlights = parseTruth?.issueHighlights?.filter(Boolean) ?? []
  const remainingIssueCount = parseTruth?.remainingIssueCount ?? 0

  const truthDetails = [
    currentState,
    summary,
    nextStep ? `Next step: ${nextStep}` : null,
    blockedTokenLabels.length ? `Blocked tokens: ${blockedTokenLabels.join("; ")}.` : null,
    issueHighlights.length ? `Flagged chart locations: ${issueHighlights.join(" ")}` : null,
    remainingIssueCount > 0
      ? `${remainingIssueCount} more flagged ${remainingIssueCount === 1 ? "bar needs" : "bars need"} review in the chord chart before generation.`
      : null,
  ].filter(Boolean)

  if (truthDetails.length > 0) {
    return truthDetails.join(" ")
  }

  return "Fix the chord chart in Input before generating."
}

function describeAssistantFailure(errorMessage?: string | null) {
  const normalizedMessage = errorMessage
    ?.trim()
    .replace(/^error:\s*/i, "")
    .replace(/^generation failed:\s*/i, "")
    .trim()

  if (!normalizedMessage) {
    return "The assistant could not finish the last request. Next step: Review the current input blockers, then try again."
  }

  if (/next step:/i.test(normalizedMessage)) {
    return normalizedMessage
  }

  return `${normalizedMessage} Next step: Review the current input blockers, then try again.`
}

export function getLeftPanelShellSelectionTruth(
  selectionTruth: ProjectSelectionTruth
): LeftPanelShellSelectionTruth {
  if (selectionTruth.selectionSource === "missing") {
    return {
      badge: "Fallback",
      title: "Whole-song fallback",
      scopeLabel: "Active scope",
      scopeValue: "Whole song default",
      detail: `${selectionTruth.currentState} ${selectionTruth.nextStep}`.trim(),
      tone: "attention",
    }
  }

  if (selectionTruth.selectionLevel === "section") {
    return {
      badge: "Selected",
      title: "Section selection active",
      scopeLabel: "Active scope",
      scopeValue: "Section selection",
      detail: `${selectionTruth.currentState} ${selectionTruth.nextStep}`.trim(),
      tone: "ready",
    }
  }

  if (selectionTruth.selectionLevel === "block") {
    return {
      badge: "Selected",
      title: "Block selection active",
      scopeLabel: "Active scope",
      scopeValue: "Block selection",
      detail: `${selectionTruth.currentState} ${selectionTruth.nextStep}`.trim(),
      tone: "ready",
    }
  }

  return {
    badge: "Default",
    title: "Whole-song default",
    scopeLabel: "Active scope",
    scopeValue: "Whole song default",
    detail: `${selectionTruth.currentState} ${selectionTruth.nextStep}`.trim(),
    tone: "neutral",
  }
}

export function getInputReadinessTruth({
  hasProject,
  hasChordChart,
  hasParseIssues = false,
  parseTruth,
  generationState,
  isImporting = false,
}: LeftPanelReadinessInputs): InputReadinessTruth {
  if (!hasProject) {
    return {
      state: "waiting",
      badge: "Waiting",
      title: "Project required",
      detail: "Load or create a project to enter chords, add notes, or import a plain-text chart.",
    }
  }

  if (isImporting) {
    return {
      state: "waiting",
      badge: "Waiting",
      title: "Import in progress",
      detail: "Arrangement Forge is reading the selected file before it updates the current chord chart.",
    }
  }

  if (generationState === "generating") {
    return {
      state: "waiting",
      badge: "Waiting",
      title: "Generation in progress",
      detail: "The current chord chart stays visible while imports pause until the latest arrangement pass finishes.",
    }
  }

  if (!hasChordChart) {
    return {
      state: "empty",
      badge: "Empty",
      title: "Chord chart needed",
      detail: "Enter chords, paste chart text, or import a plain-text file to enable generation.",
    }
  }

  if (hasParseIssues) {
    return {
      state: "blocked",
      badge: "Blocked",
      title: "Chord chart needs fixes",
      detail: describeBlockedChordChart(parseTruth),
    }
  }

  return {
    state: "ready",
    badge: "Ready",
    title: "Input is ready",
    detail: "Chord chart is present. Review Description if needed, then generate the arrangement.",
  }
}

export function getAiAssistantReadinessTruth({
  hasProject,
  hasChordChart,
  hasParseIssues = false,
  parseTruth,
  generationState,
  systemStatus,
  errorMessage,
  isImporting = false,
}: LeftPanelReadinessInputs): AiAssistantReadinessTruth {
  if (!hasProject) {
    return {
      status: "blocked",
      badge: "Blocked",
      title: "Project required",
      detail: "Load a project to enable assistant requests.",
      tone: "attention",
    }
  }

  if (!hasChordChart) {
    return {
      status: "blocked",
      badge: "Blocked",
      title: "Chord chart required",
      detail: "Add a chord chart in Input before asking the assistant to generate or revise the arrangement.",
      tone: "attention",
    }
  }

  if (hasParseIssues) {
    return {
      status: "blocked",
      badge: "Blocked",
      title: "Chord chart needs fixes",
      detail: `${describeBlockedChordChart(parseTruth)} Fix the chord chart in Input before asking the assistant to generate or revise the arrangement.`,
      tone: "attention",
    }
  }

  if (isImporting) {
    return {
      status: "waiting",
      badge: "Waiting",
      title: "Chord chart import in progress",
      detail: "The assistant unlocks after the imported chord chart finishes replacing the current song input.",
      tone: "neutral",
    }
  }

  if (systemStatus === "error") {
    return {
      status: "blocked",
      badge: "Failed",
      title: "Assistant request failed",
      detail: describeAssistantFailure(errorMessage),
      tone: "attention",
    }
  }

  if (generationState === "generating") {
    return {
      status: "waiting",
      badge: "Waiting",
      title: "Assistant is waiting",
      detail: "The current arrangement pass is still running, so new prompts unlock when it finishes.",
      tone: "neutral",
    }
  }

  return {
    status: "ready",
    badge: "Ready",
    title: "Assistant is ready",
    detail: "Ask for a generation or revision once the chord chart reflects the song you want.",
    tone: "ready",
  }
}

export function getStyleControlsReadinessTruth({
  hasProject,
  generationState,
}: LeftPanelReadinessInputs): StyleControlsReadinessTruth {
  if (!hasProject) {
    return {
      badge: "Waiting",
      title: "Project required",
      detail: "Load a project before changing song-wide style defaults.",
      tone: "attention",
    }
  }

  if (generationState === "generating") {
    return {
      badge: "Next pass",
      title: "Style edits steer the next run",
      detail: "The active generation is already locked, so any changes here apply after this pass finishes.",
      tone: "neutral",
    }
  }

  return {
    badge: "Ready",
    title: "Song defaults are ready",
    detail: "Genre, sub-style, and sliders shape the next generation pass before section or block overrides.",
    tone: "ready",
  }
}

function toInputSectionTruth(inputTruth: InputReadinessTruth): LeftPanelSectionTruth {
  const tone = inputTruth.state === "ready"
    ? "ready"
    : inputTruth.state === "empty"
      ? "neutral"
      : "attention"

  return {
    badge: inputTruth.badge,
    title: inputTruth.title,
    detail: inputTruth.detail,
    tone,
  }
}

export function getLeftPanelCoordinationTruth(
  inputs: LeftPanelReadinessInputs
): LeftPanelCoordinationTruth {
  const inputTruth = getInputReadinessTruth(inputs)
  const styleTruth = getStyleControlsReadinessTruth(inputs)
  const aiTruth = getAiAssistantReadinessTruth(inputs)

  if (!inputs.hasProject) {
    return {
      state: "waiting",
      badge: "Waiting",
      title: "Project context is still missing",
      detail: "Load or create a project to coordinate input, style defaults, and assistant requests from one panel.",
      tone: "attention",
      sections: {
        input: toInputSectionTruth(inputTruth),
        style: styleTruth,
        ai: aiTruth,
      },
    }
  }

  if (inputs.generationState === "generating") {
    return {
      state: "waiting",
      badge: "Waiting",
      title: "Arrangement generation is in progress",
      detail: "Input stays visible while the assistant waits and any style edits steer the next pass instead of this one.",
      tone: "neutral",
      sections: {
        input: toInputSectionTruth(inputTruth),
        style: styleTruth,
        ai: aiTruth,
      },
    }
  }

  if (inputs.isImporting) {
    return {
      state: "waiting",
      badge: "Waiting",
      title: "Chord chart import is in progress",
      detail: "Input is replacing the current chart from file, style defaults remain visible, and assistant requests unlock after the import finishes.",
      tone: "neutral",
      sections: {
        input: toInputSectionTruth(inputTruth),
        style: styleTruth,
        ai: aiTruth,
      },
    }
  }

  if (!inputs.hasChordChart) {
    return {
      state: "waiting",
      badge: "Waiting",
      title: "The chord chart unlocks the rest of the panel",
      detail: "Start in Input. A chord chart enables generation and assistant requests, while style defaults are already available for the next pass.",
      tone: "neutral",
      sections: {
        input: toInputSectionTruth(inputTruth),
        style: styleTruth,
        ai: aiTruth,
      },
    }
  }

  if (inputs.hasParseIssues) {
    return {
      state: "blocked",
      badge: "Blocked",
      title: "Chord chart fixes are blocking generation",
      detail: aiTruth.detail,
      tone: "attention",
      sections: {
        input: toInputSectionTruth(inputTruth),
        style: styleTruth,
        ai: aiTruth,
      },
    }
  }

  if (aiTruth.status === "blocked") {
    return {
      state: "blocked",
      badge: aiTruth.badge,
      title: aiTruth.title,
      detail: aiTruth.detail,
      tone: "attention",
      sections: {
        input: toInputSectionTruth(inputTruth),
        style: styleTruth,
        ai: aiTruth,
      },
    }
  }

  return {
    state: "ready",
    badge: "Ready",
    title: "The left panel is coordinated",
    detail: "Input is ready, style controls shape the next pass, and the assistant can request arrangement changes without hidden prerequisites.",
    tone: "ready",
    sections: {
      input: toInputSectionTruth(inputTruth),
      style: styleTruth,
      ai: aiTruth,
    },
  }
}
