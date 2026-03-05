import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  Square,
  Play,
  Pause,
  Repeat,
  SkipBack,
  SkipForward,
} from "lucide-react"
import { useAudio } from "@/hooks/useAudio"
import { useProjectStore } from "@/store/project-store"

/* ------------------------------------------------------------------ */
/*  Metronome icon (not available in lucide)                           */
/* ------------------------------------------------------------------ */
function MetronomeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2v4" />
      <path d="M6 20h12" />
      <path d="M8 20l2-14h4l2 14" />
      <path d="M12 6l5 8" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Transport Bar                                                      */
/* ------------------------------------------------------------------ */
export function TransportBar() {
  const { transportState, play, pause, stop, seek } = useAudio()
  const { project, sections, updateProject } = useProjectStore()

  const isPlaying = transportState.playbackState === "playing"
  const bar = transportState.currentBar
  const beat = transportState.currentBeat

  const bpm = project?.tempo ?? 120
  const timeSig = project?.timeSignature ?? "4/4"

  /* Compute elapsed from bar/beat and tempo */
  const elapsed = ((bar - 1) * 4 + (beat - 1)) * (60 / bpm)

  const [loopActive, setLoopActive] = useState(false)
  const [metronomeActive, setMetronomeActive] = useState(false)

  /* BPM inline editing — local draft only */
  const [editingBpm, setEditingBpm] = useState(false)
  const [bpmDraft, setBpmDraft] = useState(String(bpm))
  const bpmInputRef = useRef<HTMLInputElement>(null)

  /* Sync draft when project bpm changes externally */
  useEffect(() => {
    if (!editingBpm) setBpmDraft(String(bpm))
  }, [bpm, editingBpm])

  /* Focus BPM input */
  useEffect(() => {
    if (editingBpm) bpmInputRef.current?.select()
  }, [editingBpm])

  function handleStop() {
    stop()
  }

  function handlePlayPause() {
    if (isPlaying) pause()
    else void play()
  }

  function commitBpm() {
    const val = Math.min(300, Math.max(40, parseInt(bpmDraft) || 120))
    setBpmDraft(String(val))
    setEditingBpm(false)
    updateProject({ tempo: val })
  }

  /* Format elapsed */
  const mins = Math.floor(elapsed / 60)
  const secs = Math.floor(elapsed % 60)
  const timeStr = `${mins}:${String(secs).padStart(2, "0")}`

  return (
    <footer className="flex h-16 w-full shrink-0 items-center justify-center gap-6 border-t border-border bg-secondary px-4">
      {/* ---- LEFT: Playback pill group ---- */}
      <div className="flex h-12 min-w-[180px] items-center justify-center gap-1 rounded-xl border border-border bg-background px-4 py-2">
        {/* Skip to start */}
        <button
          type="button"
          onClick={() => seek(1)}
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Skip to start"
        >
          <SkipBack className="size-4" />
        </button>

        {/* Stop */}
        <button
          type="button"
          onClick={handleStop}
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Stop"
        >
          <Square className="size-4 fill-current" />
        </button>

        {/* Play / Pause */}
        <button
          type="button"
          onClick={handlePlayPause}
          className={cn(
            "flex size-8 items-center justify-center rounded-full transition-all",
            isPlaying
              ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(6,182,212,0.4)]"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="size-4.5 fill-current" />
          ) : (
            <Play className="size-4.5 fill-current" />
          )}
        </button>

        {/* Skip to end */}
        <button
          type="button"
          onClick={() => {
            const totalBars = sections.reduce((sum, s) => sum + s.barCount, 0)
            seek(totalBars)
          }}
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Skip to end"
        >
          <SkipForward className="size-4" />
        </button>
      </div>

      {/* ---- CENTER: Position + BPM + Time Sig ---- */}
      <div className="flex h-12 min-w-[180px] items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-2">
        {/* Bar | Beat counter */}
        <div className="flex items-center gap-0 rounded-lg bg-secondary px-3 py-1 font-mono text-sm">
          <span className="text-zinc-200">{bar}</span>
          <span className="mx-1.5 text-zinc-600">|</span>
          <span className="text-zinc-200">{beat}</span>
        </div>

        {/* BPM */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500" aria-hidden="true">
            {"♩"}
          </span>
          {editingBpm ? (
            <input
              ref={bpmInputRef}
              id="bpm-input"
              type="number"
              min={40}
              max={280}
              value={bpmDraft}
              onChange={(e) => setBpmDraft(e.target.value)}
              onBlur={commitBpm}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitBpm()
                if (e.key === "Escape") {
                  setBpmDraft(String(bpm))
                  setEditingBpm(false)
                }
              }}
              className={cn(
                "h-6 w-12 rounded-md border border-border bg-secondary px-1.5 text-center font-mono text-sm text-zinc-200 outline-none",
                "focus:border-ring",
                /* Hide spinner arrows */
                "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              )}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setBpmDraft(String(bpm))
                setEditingBpm(true)
              }}
              className="rounded-md px-1 py-0.5 font-mono text-sm text-zinc-200 transition-colors hover:bg-secondary hover:underline"
            >
              {bpm}
            </button>
          )}
        </div>

        {/* Time signature */}
        <span className="text-sm text-zinc-500">{timeSig}</span>
      </div>

      {/* ---- RIGHT: Loop, Metronome, Elapsed ---- */}
      <div className="flex h-12 min-w-[180px] items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2">
        {/* Loop toggle */}
        <button
          type="button"
          onClick={() => setLoopActive((v) => !v)}
          className={cn(
            "flex size-7 items-center justify-center rounded-md transition-colors",
            loopActive
              ? "bg-instrument-strings/15 text-playhead-light"
              : "text-zinc-500 hover:text-muted-foreground"
          )}
          aria-label="Toggle loop"
          aria-pressed={loopActive}
        >
          <Repeat className="size-3.5" />
        </button>

        {/* Metronome toggle */}
        <button
          type="button"
          onClick={() => setMetronomeActive((v) => !v)}
          className={cn(
            "flex size-7 items-center justify-center rounded-md transition-colors",
            metronomeActive
              ? "bg-instrument-strings/15 text-playhead-light"
              : "text-zinc-500 hover:text-muted-foreground"
          )}
          aria-label="Toggle metronome"
          aria-pressed={metronomeActive}
        >
          <MetronomeIcon className="size-3.5" />
        </button>

        {/* Elapsed time */}
        <span className="ml-1 min-w-[36px] text-right font-mono text-xs text-zinc-500">
          {timeStr}
        </span>
      </div>
    </footer>
  )
}
