import { useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronLeft } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { InputSection } from "./InputSection"
import { StyleControlsSection } from "./StyleControlsSection"
import { AiAssistantSection } from "./AiAssistantSection"
import { SectionContext } from "./SectionContext"
import { BlockContext } from "./BlockContext"
import {
  getLeftPanelCoordinationTruth,
  type LeftPanelTruthTone,
} from "./left-panel-readiness"
import { useProjectStore } from "@/store/project-store"
import { useUiStore } from "@/store/ui-store"
import type { Instrument } from "@/components/sequencer-block"

type AccordionSection = "input" | "style" | "ai" | null

interface PanelSectionProps {
  title: string
  badge: string
  summaryTitle: string
  detail: string
  tone: LeftPanelTruthTone
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  className?: string
}

function getTruthBadgeClassName(tone: LeftPanelTruthTone) {
  if (tone === "ready") {
    return "bg-emerald-500/10 text-emerald-300"
  }

  if (tone === "attention") {
    return "bg-amber-500/10 text-amber-300"
  }

  return "bg-card text-muted-foreground"
}

function getTruthContainerClassName(tone: LeftPanelTruthTone) {
  if (tone === "ready") {
    return "border-emerald-500/30 bg-emerald-500/10 text-foreground"
  }

  if (tone === "attention") {
    return "border-amber-500/30 bg-amber-500/10 text-foreground"
  }

  return "border-border bg-secondary/40 text-foreground"
}

function PanelSection({
  title,
  badge,
  summaryTitle,
  detail,
  tone,
  isOpen,
  onToggle,
  children,
  className,
}: PanelSectionProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={() => onToggle()}>
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-lg border border-border bg-card",
          isOpen ? "min-h-0" : "shrink-0",
          className
        )}
      >
        {/* Section header */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            data-left-panel-section={title.toLowerCase()}
            className="flex shrink-0 items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  {title}
                </span>
                <span
                  data-left-panel-section-status={badge.toLowerCase()}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                    getTruthBadgeClassName(tone)
                  )}
                >
                  {badge}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{summaryTitle}. </span>
                {detail}
              </p>
            </div>
            <div className="pt-0.5">
              <ChevronDown
                className={cn(
                  "size-3.5 text-muted-foreground transition-transform duration-200",
                  !isOpen && "-rotate-90"
                )}
              />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto border-t border-border px-4 pb-4 pt-3">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

/* ------------------------------------------------------------------ */
/*  Context mode types                                                 */
/* ------------------------------------------------------------------ */
export type PanelContext =
  | { mode: "default" }
  | { mode: "section"; sectionName: string; sectionBars: number }
  | {
      mode: "block"
      instrument: Instrument
      styleName: string
      startBar: number
      endBar: number
    }

interface LeftPanelProps {
  className?: string
  onCollapse?: () => void
  context?: PanelContext
  onContextClose?: () => void
}

export function LeftPanel({
  className,
  onCollapse,
  context = { mode: "default" },
  onContextClose,
}: LeftPanelProps) {
  const project = useProjectStore((s) => s.project)
  const isInspector = context.mode !== "default"
  const generationState = useUiStore((s) => s.generationState)
  const coordinationTruth = getLeftPanelCoordinationTruth({
    hasProject: Boolean(project),
    hasChordChart: Boolean(project?.chordChartRaw.trim()),
    generationState,
  })
  const defaultSection: AccordionSection =
    generationState === "complete" ? "style" : "input"
  const [expanded, setExpanded] = useState<AccordionSection>(defaultSection)

  const toggle = (section: AccordionSection) => {
    setExpanded((prev) => (prev === section ? null : section))
  }

  return (
    <aside
      className={cn(
        "flex h-full basis-80 min-w-[18rem] max-w-sm flex-col overflow-hidden bg-sidebar",
        className
      )}
    >
      {/* Panel body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {context.mode === "section" && (
          <SectionContext
            sectionName={context.sectionName}
            sectionBars={context.sectionBars}
            onClose={onContextClose}
          />
        )}

        {context.mode === "block" && (
          <BlockContext
            instrument={context.instrument}
            styleName={context.styleName}
            startBar={context.startBar}
            endBar={context.endBar}
            onClose={onContextClose}
          />
        )}

        {context.mode === "default" && (
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2">
            <div
              data-left-panel-coordination={coordinationTruth.badge.toLowerCase()}
              role="status"
              aria-live="polite"
              className={cn(
                "rounded-lg border px-3 py-2 text-xs leading-relaxed",
                getTruthContainerClassName(coordinationTruth.tone)
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                    getTruthBadgeClassName(coordinationTruth.tone)
                  )}
                >
                  {coordinationTruth.badge}
                </span>
                <span className="font-medium text-foreground">
                  {coordinationTruth.title}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">
                {coordinationTruth.detail}
              </p>
            </div>

            <PanelSection
              title="Input"
              badge={coordinationTruth.sections.input.badge}
              summaryTitle={coordinationTruth.sections.input.title}
              detail={coordinationTruth.sections.input.detail}
              tone={coordinationTruth.sections.input.tone}
              isOpen={expanded === "input"}
              onToggle={() => toggle("input")}
              className={expanded === "input" ? "flex-1 min-h-0" : ""}
            >
              <InputSection />
            </PanelSection>

            <PanelSection
              title="Style Controls"
              badge={coordinationTruth.sections.style.badge}
              summaryTitle={coordinationTruth.sections.style.title}
              detail={coordinationTruth.sections.style.detail}
              tone={coordinationTruth.sections.style.tone}
              isOpen={expanded === "style"}
              onToggle={() => toggle("style")}
              className={expanded === "style" ? "flex-1 min-h-0" : ""}
            >
              <StyleControlsSection />
            </PanelSection>

            <PanelSection
              title="AI Assistant"
              badge={coordinationTruth.sections.ai.badge}
              summaryTitle={coordinationTruth.sections.ai.title}
              detail={coordinationTruth.sections.ai.detail}
              tone={coordinationTruth.sections.ai.tone}
              isOpen={expanded === "ai"}
              onToggle={() => toggle("ai")}
              className={expanded === "ai" ? "flex-1 min-h-0" : ""}
            >
              <AiAssistantSection />
            </PanelSection>
          </div>
        )}
      </div>

      {/* Collapse trigger at bottom */}
      <button
        type="button"
        onClick={onCollapse}
        className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        <span>{isInspector ? "Close inspector" : "Collapse"}</span>
      </button>
    </aside>
  )
}
