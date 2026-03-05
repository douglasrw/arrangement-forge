import { cn } from "@/lib/utils"

export type AppStatus = "saved" | "unsaved" | "saving" | "generating" | "error"

const STATUS_CONFIG: Record<
  AppStatus,
  { dot: string; label: string }
> = {
  saved: {
    dot: "bg-status-ready",
    label: "Saved",
  },
  unsaved: {
    dot: "bg-status-unsaved",
    label: "Unsaved changes",
  },
  saving: {
    dot: "bg-status-saving animate-pulse",
    label: "Saving\u2026",
  },
  generating: {
    dot: "bg-status-unsaved animate-pulse",
    label: "Generating\u2026",
  },
  error: {
    dot: "bg-destructive",
    label: "Error",
  },
}

interface StatusBarProps {
  status?: AppStatus
  className?: string
}

export function StatusBar({ status = "saved", className }: StatusBarProps) {
  const cfg = STATUS_CONFIG[status]

  return (
    <div
      className={cn(
        "flex h-6 shrink-0 items-center border-t border-muted-foreground/20 bg-muted/30 px-4",
        className
      )}
    >
      {/* Left: status indicator */}
      <div className="flex items-center gap-1.5">
        <span className={cn("size-1.5 rounded-full", cfg.dot)} />
        <span className="text-xs text-zinc-500">{cfg.label}</span>
      </div>

      {/* Center: branding */}
      <span className="flex-1 text-center text-[10px] text-zinc-600">
        Arrangement Forge
      </span>

      {/* Right: version */}
      <span className="text-[10px] text-zinc-600">v0.1.0</span>
    </div>
  )
}
