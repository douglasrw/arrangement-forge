import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Settings } from "lucide-react"
import { useProjectStore } from "@/store/project-store"
import { useUiStore } from "@/store/ui-store"
import { useAuth } from "@/hooks/useAuth"
import { ALL_KEYS } from "@/lib/chords"

/* ------------------------------------------------------------------ */
/*  Key dropdown                                                       */
/* ------------------------------------------------------------------ */
function KeyDropdown({
  value,
  onChange,
}: {
  value: string
  onChange: (key: string) => void
}) {
  return (
    <div className="relative">
      <label htmlFor="topbar-key-select" className="sr-only">Key</label>
      <select
        id="topbar-key-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-8 cursor-pointer appearance-none rounded-md border border-border/30 bg-secondary/50",
          "pl-2 pr-6 text-xs text-muted-foreground",
          "focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        )}
      >
        {ALL_KEYS.map((k) => (
          <option key={k} value={k}>
            Key of {k}
          </option>
        ))}
      </select>
      {/* Custom dropdown arrow */}
      <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted-foreground">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  BPM click-to-edit                                                  */
/* ------------------------------------------------------------------ */
function BpmEditor({
  value,
  onChange,
}: {
  value: number
  onChange: (bpm: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(String(value))
  }, [value, editing])

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function commit(raw: string) {
    setEditing(false)
    const parsed = parseInt(raw, 10)
    if (!isNaN(parsed)) {
      const clamped = Math.min(300, Math.max(40, parsed))
      onChange(clamped)
    }
  }

  if (editing) {
    return (
      <>
        <label htmlFor="topbar-bpm-input" className="sr-only">BPM</label>
        <input
          ref={inputRef}
          id="topbar-bpm-input"
          type="number"
          min={40}
          max={300}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(draft)
            if (e.key === "Escape") setEditing(false)
          }}
          className={cn(
            "h-8 w-20 rounded-md border border-border/30 bg-secondary/50",
            "px-2 text-center font-mono text-xs text-muted-foreground",
            "focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          )}
        />
      </>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="h-8 flex items-center rounded-md border border-border/30 bg-secondary/50 px-2 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
      title="Click to edit BPM"
    >
      {'\u2669'} {value} bpm
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Chord display toggle [A | I]                                       */
/* ------------------------------------------------------------------ */
function ChordDisplayToggle({
  mode,
  onToggle,
}: {
  mode: "letter" | "roman"
  onToggle: () => void
}) {
  return (
    <div
      className="h-8 flex items-center gap-1 rounded-lg bg-secondary p-1"
      role="radiogroup"
      aria-label="Chord display mode"
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === "letter"}
        onClick={() => mode !== "letter" && onToggle()}
        className={cn(
          "rounded-md px-4 py-1 text-sm font-medium transition-colors",
          mode === "letter"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        A
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === "roman"}
        onClick={() => mode !== "roman" && onToggle()}
        className={cn(
          "rounded-md px-4 py-1 text-sm font-medium transition-colors",
          mode === "roman"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        I
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  TopBar                                                             */
/* ------------------------------------------------------------------ */
export function TopBar() {
  const { project, updateProject } = useProjectStore()
  const { unsavedChanges, chordDisplayMode, toggleChordDisplay } = useUiStore()
  const { signOut } = useAuth()

  const projectName = project?.name ?? "Untitled Project"
  const key = project?.key ?? "C"
  const tempo = project?.tempo ?? 120
  const genre = project?.genre ?? "Jazz"
  const timeSig = project?.timeSignature ?? "4/4"

  const [isEditing, setIsEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(projectName)
  const [menuOpen, setMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  /* Sync draft when project name changes externally */
  useEffect(() => {
    if (!isEditing) setNameDraft(projectName)
  }, [projectName, isEditing])

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

  function commitName(newName: string) {
    setIsEditing(false)
    const name = newName.trim() || "Untitled Project"
    setNameDraft(name)
    updateProject({ name })
  }

  return (
    <header className="flex h-[52px] w-full shrink-0 items-center justify-between border-b border-border/50 bg-card px-4">
      {/* ---- LEFT: Monogram + editable name + save dot ---- */}
      <div className="flex items-center gap-3">
        {/* AF monogram */}
        <div className="flex size-7 items-center justify-center rounded-sm bg-ring/10">
          <span className="text-[11px] font-bold leading-none text-primary">
            AF
          </span>
        </div>

        {/* Editable project name */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <label htmlFor="project-name-input" className="sr-only">Project name</label>
              <input
                ref={inputRef}
                id="project-name-input"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => commitName(nameDraft)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitName(nameDraft)
                  if (e.key === "Escape") {
                    setNameDraft(projectName)
                    setIsEditing(false)
                  }
                }}
                placeholder="Untitled Project"
                className="h-6 w-40 rounded-[5px] border border-border bg-secondary px-2 text-sm font-medium text-foreground outline-none focus:border-ring"
              />
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNameDraft(projectName)
                setIsEditing(true)
              }}
              className="rounded-[5px] px-1 py-0.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              {projectName}
            </button>
          )}

          {/* Save indicator dot */}
          <div className="group relative flex items-center">
            <div
              className={cn(
                "size-1.5 rounded-full transition-colors",
                !unsavedChanges ? "bg-status-ready" : "bg-status-unsaved"
              )}
            />
            {/* Tooltip */}
            <div className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2.5 py-1.5 text-xs text-popover-foreground opacity-0 shadow-lg ring-1 ring-border transition-opacity group-hover:opacity-100">
              {!unsavedChanges ? "All changes saved" : "Unsaved changes"}
            </div>
          </div>
        </div>
      </div>

      {/* ---- CENTER: Interactive metadata controls ---- */}
      <div className="hidden items-center gap-1.5 md:flex">
        <KeyDropdown
          value={key}
          onChange={(k) => updateProject({ key: k })}
        />
        <BpmEditor
          value={tempo}
          onChange={(bpm) => updateProject({ tempo: bpm })}
        />
        <span className="h-8 flex items-center rounded-md border border-border/30 bg-secondary/50 px-2 text-xs text-muted-foreground">
          {genre}
        </span>
        <span className="h-8 flex items-center rounded-md border border-border/30 bg-secondary/50 px-2 text-xs text-muted-foreground">
          {timeSig}
        </span>
        <ChordDisplayToggle
          mode={chordDisplayMode}
          onToggle={toggleChordDisplay}
        />
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
                onClick={() => {
                  setMenuOpen(false)
                  void signOut()
                }}
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
