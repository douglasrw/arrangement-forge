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
import { useUiStore } from "@/store/ui-store"
import type { Instrument } from "@/components/sequencer-block"

type AccordionSection = "input" | "style" | "ai" | null

interface PanelSectionProps {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  className?: string
}

function PanelSection({
  title,
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
            className="flex shrink-0 items-center justify-between px-4 py-3 text-left transition-colors hover:bg-secondary/50"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
              {title}
            </span>
            <ChevronDown
              className={cn(
                "size-3.5 text-muted-foreground transition-transform duration-200",
                !isOpen && "-rotate-90"
              )}
            />
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
  const isInspector = context.mode !== "default"
  const generationState = useUiStore((s) => s.generationState)
  const defaultSection: AccordionSection =
    generationState === "complete" ? "style" : "input"
  const [expanded, setExpanded] = useState<AccordionSection>(defaultSection)

  const toggle = (section: AccordionSection) => {
    setExpanded((prev) => (prev === section ? null : section))
  }

  return (
    <aside
      className={cn(
        "flex h-full w-[320px] shrink-0 flex-col overflow-hidden bg-sidebar",
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
            <PanelSection
              title="Input"
              isOpen={expanded === "input"}
              onToggle={() => toggle("input")}
              className={expanded === "input" ? "flex-1 min-h-0" : ""}
            >
              <InputSection />
            </PanelSection>

            <PanelSection
              title="Style Controls"
              isOpen={expanded === "style"}
              onToggle={() => toggle("style")}
              className={expanded === "style" ? "flex-1 min-h-0" : ""}
            >
              <StyleControlsSection />
            </PanelSection>

            <PanelSection
              title="AI Assistant"
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
