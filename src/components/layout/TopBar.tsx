import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Settings } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Metadata chips — read-only key/bpm/genre/time-sig                  */
/* ------------------------------------------------------------------ */
const META_CHIPS = ["Key of C", "\u2669 120 bpm", "Jazz", "4/4"]

/* ------------------------------------------------------------------ */
/*  TopBar                                                             */
/* ------------------------------------------------------------------ */
export function TopBar() {
  const [projectName, setProjectName] = useState("My Jazz Arrangement")
  const [isEditing, setIsEditing] = useState(false)
  const [saved, setSaved] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  /* Focus input when editing starts */
  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  /* Close menu on outside click */
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [menuOpen])

  function commitName() {
    setIsEditing(false)
    if (!projectName.trim()) setProjectName("Untitled Project")
    setSaved(false)
    /* Simulated auto-save */
    setTimeout(() => setSaved(true), 1500)
  }

  return (
    <header className="flex h-[52px] w-full shrink-0 items-center justify-between border-b border-border/50 bg-card px-4">
      {/* ---- LEFT: Monogram + editable name + save dot ---- */}
      <div className="flex items-center gap-3">
        {/* AF monogram */}
        <div className="flex size-7 items-center justify-center rounded-sm bg-[#0891b2]/10">
          <span className="text-[11px] font-bold leading-none text-[#06b6d4]">
            AF
          </span>
        </div>

        {/* Editable project name */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <input
              ref={inputRef}
              id="project-name-input"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName()
                if (e.key === "Escape") {
                  setIsEditing(false)
                }
              }}
              placeholder="Untitled Project"
              className="h-6 w-40 rounded-[5px] border border-border bg-secondary px-2 text-sm font-medium text-foreground outline-none focus:border-[#0891b2]"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-[5px] px-1 py-0.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              {projectName || "Untitled Project"}
            </button>
          )}

          {/* Save indicator dot */}
          <div className="group relative flex items-center">
            <div
              className={cn(
                "size-1.5 rounded-full transition-colors",
                saved ? "bg-[#4ade80]" : "bg-[#fbbf24]"
              )}
            />
            {/* Tooltip */}
            <div className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2.5 py-1.5 text-xs text-popover-foreground opacity-0 shadow-lg ring-1 ring-border transition-opacity group-hover:opacity-100">
              {saved ? "All changes saved" : "Unsaved changes"}
            </div>
          </div>
        </div>
      </div>

      {/* ---- CENTER: Metadata chips ---- */}
      <div className="hidden items-center gap-1.5 md:flex">
        {META_CHIPS.map((chip) => (
          <span
            key={chip}
            className="rounded-md border border-border/30 bg-secondary/50 px-2 py-0.5 text-xs text-muted-foreground"
          >
            {chip}
          </span>
        ))}
      </div>

      {/* ---- RIGHT: Export + Gear + Avatar ---- */}
      <div className="flex items-center gap-2">
        {/* Export button (disabled) */}
        <button
          type="button"
          disabled
          title="Coming soon"
          className="cursor-not-allowed rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-40"
        >
          Export
        </button>

        {/* Gear icon */}
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Settings"
        >
          <Settings className="size-4" />
        </button>

        {/* User avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            aria-label="User menu"
          >
            DW
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl">
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-secondary"
              >
                Settings
              </button>
              <div className="mx-2 my-1 h-px bg-border" />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-secondary"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
