import { cn } from "@/lib/utils"

type Scope = "song" | "section" | "block"

const SCOPE_STYLES: Record<Scope, { bg: string; text: string; label: string }> = {
  song: {
    bg: "bg-input/60",
    text: "text-muted-foreground",
    label: "Song",
  },
  section: {
    bg: "bg-instrument-strings/10",
    text: "text-playhead",
    label: "Section",
  },
  block: {
    bg: "bg-scope-section/10",
    text: "text-warning",
    label: "Block",
  },
}

interface ScopeBadgeProps {
  scope: Scope
  className?: string
}

export function ScopeBadge({ scope, className }: ScopeBadgeProps) {
  const s = SCOPE_STYLES[scope]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        s.bg,
        s.text,
        className
      )}
    >
      {s.label}
    </span>
  )
}
