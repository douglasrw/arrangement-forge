import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  Square,
  Play,
  Pause,
  Circle,
  Repeat,
} from "lucide-react"

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
  const [isPlaying, setIsPlaying] = useState(false)
  const [loopActive, setLoopActive] = useState(false)
  const [metronomeActive, setMetronomeActive] = useState(false)

  /* BPM inline editing */
  const [bpm, setBpm] = useState(120)
  const [editingBpm, setEditingBpm] = useState(false)
  const [bpmDraft, setBpmDraft] = useState("120")
  const bpmInputRef = useRef<HTMLInputElement>(null)

  /* Simulated playback position */
  const [bar, setBar] = useState(1)
  const [beat, setBeat] = useState(1)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPlayback = useCallback(() => {
    setIsPlaying(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const handleStop = useCallback(() => {
    stopPlayback()
    setBar(1)
    setBeat(1)
    setElapsed(0)
  }, [stopPlayback])

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev)
  }, [])

  /* Tick forward when playing */
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setBeat((prev) => {
          if (prev >= 4) {
            setBar((b) => b + 1)
            return 1
          }
          return prev + 1
        })
        setElapsed((e) => e + 60 / bpm)
      }, (60 / bpm) * 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, bpm])

  /* Focus BPM input */
  useEffect(() => {
    if (editingBpm) bpmInputRef.current?.select()
  }, [editingBpm])

  function commitBpm() {
    const val = Math.min(280, Math.max(40, parseInt(bpmDraft) || 120))
    setBpm(val)
    setBpmDraft(String(val))
    setEditingBpm(false)
  }

  /* Format elapsed */
  const mins = Math.floor(elapsed / 60)
  const secs = Math.floor(elapsed % 60)
  const timeStr = `${mins}:${String(secs).padStart(2, "0")}`

  return (
    <footer className="flex h-12 w-full shrink-0 items-center justify-between border-t border-[#3f3f46]/50 bg-[#18181b]/95 px-4 backdrop-blur-sm">
      {/* ---- LEFT: Playback pill group ---- */}
      <div className="flex items-center gap-1 rounded-xl bg-[#27272a] p-1">
        {/* Stop */}
        <button
          type="button"
          onClick={handleStop}
          className="flex size-8 items-center justify-center rounded-lg text-[#a1a1aa] transition-colors hover:text-[#f4f4f5]"
          aria-label="Stop"
        >
          <Square className="size-3.5 fill-current" />
        </button>

        {/* Play / Pause */}
        <button
          type="button"
          onClick={handlePlayPause}
          className={cn(
            "flex size-9 items-center justify-center rounded-lg transition-all",
            isPlaying
              ? "bg-[#14b8a6] text-[#09090b] shadow-[0_0_12px_rgba(6,182,212,0.4)]"
              : "bg-[#3f3f46] text-[#e4e4e7] hover:bg-[#52525b]"
          )}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="size-4 fill-current" />
          ) : (
            <Play className="size-4 fill-current" />
          )}
        </button>

        {/* Record (disabled MVP) */}
        <button
          type="button"
          disabled
          className="flex size-8 items-center justify-center rounded-lg text-[#ef4444]/40"
          aria-label="Record (disabled)"
        >
          <Circle className="size-3.5 fill-current" />
        </button>
      </div>

      {/* ---- CENTER: Position + BPM + Time Sig ---- */}
      <div className="flex flex-1 items-center justify-center gap-3">
        {/* Bar | Beat counter */}
        <div className="flex items-center gap-0 rounded-lg bg-[#27272a] px-3 py-1 font-mono text-sm">
          <span className="text-[#e4e4e7]">{bar}</span>
          <span className="mx-1.5 text-[#52525b]">|</span>
          <span className="text-[#e4e4e7]">{beat}</span>
        </div>

        {/* BPM */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#71717a]" aria-hidden="true">
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
                "h-6 w-12 rounded-md border border-border bg-[#27272a] px-1.5 text-center font-mono text-sm text-[#e4e4e7] outline-none",
                "focus:border-[#0891b2]",
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
              className="rounded-md px-1 py-0.5 font-mono text-sm text-[#e4e4e7] transition-colors hover:bg-[#27272a]"
            >
              {bpm}
            </button>
          )}
        </div>

        {/* Time signature */}
        <span className="text-sm text-[#71717a]">4/4</span>
      </div>

      {/* ---- RIGHT: Loop, Metronome, Elapsed ---- */}
      <div className="flex items-center gap-1.5">
        {/* Loop toggle */}
        <button
          type="button"
          onClick={() => setLoopActive((v) => !v)}
          className={cn(
            "flex size-7 items-center justify-center rounded-md transition-colors",
            loopActive
              ? "bg-[#14b8a6]/15 text-[#5eead4]"
              : "text-[#71717a] hover:text-[#a1a1aa]"
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
              ? "bg-[#14b8a6]/15 text-[#5eead4]"
              : "text-[#71717a] hover:text-[#a1a1aa]"
          )}
          aria-label="Toggle metronome"
          aria-pressed={metronomeActive}
        >
          <MetronomeIcon className="size-3.5" />
        </button>

        {/* Elapsed time */}
        <span className="ml-1 min-w-[36px] text-right font-mono text-xs text-[#71717a]">
          {timeStr}
        </span>
      </div>
    </footer>
  )
}
