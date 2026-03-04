import { cn } from "@/lib/utils"

export type AppStatus = "saved" | "unsaved" | "saving" | "generating" | "error"

const STATUS_CONFIG: Record<
  AppStatus,
  { dot: string; label: string }
> = {
  saved: {
    dot: "bg-[#22c55e]",
    label: "Saved",
  },
  unsaved: {
    dot: "bg-[#fbbf24]",
    label: "Unsaved changes",
  },
  saving: {
    dot: "bg-[#3b82f6] animate-pulse",
    label: "Saving\u2026",
  },
  generating: {
    dot: "bg-[#fbbf24] animate-pulse",
    label: "Generating\u2026",
  },
  error: {
    dot: "bg-[#ef4444]",
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
        "flex h-6 shrink-0 items-center border-t border-[#27272a] bg-[#18181b]/80 px-4",
        className
      )}
    >
      {/* Left: status indicator */}
      <div className="flex items-center gap-1.5">
        <span className={cn("size-1.5 rounded-full", cfg.dot)} />
        <span className="text-xs text-[#71717a]">{cfg.label}</span>
      </div>

      {/* Center: branding */}
      <span className="flex-1 text-center text-[10px] text-[#52525b]">
        Arrangement Forge
      </span>

      {/* Right: version */}
      <span className="text-[10px] text-[#52525b]">v0.1.0</span>
    </div>
  )
}
