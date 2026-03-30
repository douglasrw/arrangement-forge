import { ArrowUp } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useGenerate } from "@/hooks/useGenerate"
import { getGenerationFailureDetail, isGenerationFailureContent } from "@/lib/assistant-chat"
import { useProjectStore } from "@/store/project-store"
import { useUiStore } from "@/store/ui-store"
import { cn } from "@/lib/utils"
import type { AiChatMessage } from "@/types"
import { getAiAssistantReadinessTruth } from "./left-panel-readiness"

const SCOPE_STYLES: Record<AiChatMessage["scope"], string> = {
  setup: "bg-secondary text-muted-foreground",
  song: "bg-input/60 text-muted-foreground",
  section: "bg-instrument-strings/10 text-playhead",
  block: "bg-scope-section/10 text-warning",
}

const SCOPE_LABELS: Record<AiChatMessage["scope"], string> = {
  setup: "Setup",
  song: "Song",
  section: "Section",
  block: "Block",
}

function getScopeLabel(message: AiChatMessage) {
  const label = SCOPE_LABELS[message.scope]
  return message.scopeTarget ? `${label}: ${message.scopeTarget}` : label
}

function isFailureMessage(message: AiChatMessage) {
  return message.role === "assistant" && isGenerationFailureContent(message.content)
}

export function AiAssistantSection() {
  const [input, setInput] = useState("")
  const project = useProjectStore((state) => state.project)
  const chatMessages = useProjectStore((state) => state.chatMessages)
  const generationState = useUiStore((state) => state.generationState)
  const { runGeneration } = useGenerate()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: chatMessages.length > 0 ? "smooth" : "auto",
    })
  }, [chatMessages.length])

  const trimmedInput = input.trim()
  const hasChordChart = Boolean(project?.chordChartRaw.trim())
  const isGenerating = generationState === "generating"
  const canSend = Boolean(project && hasChordChart && trimmedInput && !isGenerating)
  const assistantReadiness = getAiAssistantReadinessTruth({
    hasProject: Boolean(project),
    hasChordChart,
    generationState,
  })
  const composerStatus = assistantReadiness.status === "ready"
    ? null
    : {
        title: assistantReadiness.title,
        detail: assistantReadiness.detail,
        tone: assistantReadiness.status === "blocked" ? "blocked" : "active",
      }

  function handleSend() {
    if (!canSend) return
    void runGeneration({ assistantPrompt: trimmedInput })
    setInput("")
  }

  const emptyStateCopy = !project
    ? "Load a project to use the assistant."
    : !hasChordChart
      ? "Add a chord chart before asking the assistant to generate or revise the arrangement."
      : isGenerating
        ? "Generating from your latest request..."
        : "Assistant history is empty. Ask for a generation or revision and the result will be tracked here."

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-hidden">
      <ScrollArea className="min-h-0 flex-1 pr-1">
        <div className="flex flex-col gap-2.5 py-1">
          {chatMessages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-secondary/30 px-3 py-4 text-xs leading-relaxed text-muted-foreground">
              {emptyStateCopy}
            </div>
          ) : (
            chatMessages.map((message) => {
              const failureMessage = isFailureMessage(message)

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex flex-col gap-1",
                    message.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                      SCOPE_STYLES[message.scope]
                    )}
                  >
                    {getScopeLabel(message)}
                  </span>
                  <div
                    data-testid={failureMessage ? "ai-assistant-failure-bubble" : undefined}
                    className={cn(
                      "max-w-[90%] rounded-lg border px-3 py-2 text-xs leading-relaxed",
                      message.role === "user"
                        ? "border-ring/20 bg-ring/15 text-foreground"
                        : failureMessage
                          ? "border-warning/40 bg-warning/10 text-foreground"
                          : "border-border bg-card text-card-foreground"
                    )}
                  >
                    {failureMessage ? (
                      <>
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-warning">
                          Generation failed
                        </div>
                        <div>{getGenerationFailureDetail(message.content)}</div>
                      </>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="flex items-center gap-2 rounded-md border border-border bg-secondary px-2.5 py-1.5">
        <label htmlFor="ai-input" className="sr-only">Ask the AI assistant</label>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {composerStatus ? (
            <div
              data-testid="ai-assistant-composer-state"
              role="status"
              aria-live={composerStatus.tone === "active" ? "polite" : undefined}
              className={cn(
                "flex items-start gap-2 rounded-md border px-2 py-1.5 text-[11px] leading-relaxed",
                composerStatus.tone === "active"
                  ? "border-ring/30 bg-ring/10 text-foreground"
                  : "border-warning/30 bg-warning/10 text-foreground"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1 size-1.5 shrink-0 rounded-full",
                  composerStatus.tone === "active" ? "bg-ring" : "bg-warning"
                )}
              />
              <div className="min-w-0">
                <div className="font-medium">{composerStatus.title}</div>
                <div className="text-muted-foreground">{composerStatus.detail}</div>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <input
              id="ai-input"
              data-testid="ai-assistant-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!project || isGenerating}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={
                !project
                  ? "Load a project to use the assistant..."
                  : !hasChordChart
                    ? "Add a chord chart first..."
                    : isGenerating
                      ? "Generating..."
                      : "Describe the arrangement change you want..."
              }
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="button"
              data-testid="ai-assistant-send"
              onClick={handleSend}
              aria-label="Send assistant prompt"
              disabled={!canSend}
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-md transition-colors",
                canSend
                  ? "bg-ring text-foreground hover:bg-ring/80"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              <ArrowUp className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
