import { cn } from "@/lib/utils"

type Scope = "song" | "section" | "block"
type ScopeTone = "default" | "missing"

const SCOPE_STYLES: Record<Scope, { bg: string; text: string; label: string }> = {
  song: {
    bg: "bg-input/60",
    text: "text-muted-foreground",
    label: "Song Scope",
  },
  section: {
    bg: "bg-instrument-strings/10",
    text: "text-playhead",
    label: "Section Scope",
  },
  block: {
    bg: "bg-scope-section/10",
    text: "text-warning",
    label: "Block Scope",
  },
}

interface ScopeBadgeProps {
  scope: Scope
  tone?: ScopeTone
  className?: string
}

export function ScopeBadge({
  scope,
  tone = "default",
  className,
}: ScopeBadgeProps) {
  const s = SCOPE_STYLES[scope]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        tone === "default"
          ? [s.bg, s.text]
          : "border border-warning/30 bg-warning/10 text-warning",
        className
      )}
    >
      {s.label}
    </span>
  )
}
