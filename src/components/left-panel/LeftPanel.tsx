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
import type { Instrument } from "@/components/sequencer-block"

interface PanelSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
}

function PanelSection({
  title,
  defaultOpen = true,
  children,
  className,
}: PanelSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-lg border border-border bg-card",
          className
        )}
      >
        {/* Section header */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-secondary/50"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
              {title}
            </span>
            <ChevronDown
              className={cn(
                "size-3.5 text-muted-foreground transition-transform duration-200",
                !open && "-rotate-90"
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border px-4 pb-4 pt-3">
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

  return (
    <aside
      className={cn(
        "flex h-full w-[280px] shrink-0 flex-col bg-sidebar",
        className
      )}
    >
      {/* Panel body */}
      <div className="flex flex-1 flex-col overflow-y-auto">
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
          <div className="flex flex-1 flex-col gap-2 p-2">
            <PanelSection title="Input">
              <InputSection />
            </PanelSection>

            <PanelSection title="Style Controls">
              <StyleControlsSection />
            </PanelSection>

            <PanelSection title="AI Assistant" className="flex-1">
              <AiAssistantSection />
            </PanelSection>
          </div>
        )}
      </div>

      {/* Collapse trigger at bottom */}
      <button
        type="button"
        onClick={onCollapse}
        className="flex items-center gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        <span>{isInspector ? "Close inspector" : "Collapse"}</span>
      </button>
    </aside>
  )
}
