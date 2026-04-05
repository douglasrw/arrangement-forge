import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  getTransportReadinessTruth,
  getTransportSelectionTruth,
} from "@/audio/transport"
import {
  Square,
  Play,
  Pause,
  Repeat,
  Redo2,
  SkipBack,
  SkipForward,
  Undo2,
} from "lucide-react"
import { useAudio } from "@/hooks/useAudio"
import { Scrubber, type ScrubberState } from "@/components/transport/Scrubber"
import { getProjectArrangementTruth, useProjectStore } from "@/store/project-store"
import { useUiStore } from "@/store/ui-store"
import { useUndoStore } from "@/store/undo-store"

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

function formatClock(seconds: number) {
  const safeSeconds = Math.max(0, seconds)
  const mins = Math.floor(safeSeconds / 60)
  const secs = Math.floor(safeSeconds % 60)
  return `${mins}:${String(secs).padStart(2, "0")}`
}

function buildPlayheadTruth({
  transportReady,
  isPlaying,
  timelineStatusLabel,
  currentBar,
  currentBeat,
  elapsedSeconds,
  totalSeconds,
  totalBars,
}: {
  transportReady: boolean
  isPlaying: boolean
  timelineStatusLabel: string
  currentBar: number
  currentBeat: number
  elapsedSeconds: number
  totalSeconds: number
  totalBars: number
}): {
  state: ScrubberState
  summaryLabel: string
  positionLabel: string
  valueText: string
} {
  if (!transportReady) {
    return {
      state: "unavailable",
      summaryLabel: "Unavailable",
      positionLabel: timelineStatusLabel,
      valueText: timelineStatusLabel,
    }
  }

  const playheadBar = Math.max(1, Math.min(currentBar, totalBars || 1))
  const playheadBeat = Math.max(1, currentBeat)
  const hasPosition = elapsedSeconds > 0 || playheadBar > 1 || playheadBeat > 1
  const summaryLabel = isPlaying ? "Playing" : "Idle"
  const positionLabel = hasPosition
    ? `Bar ${playheadBar} Beat ${playheadBeat}`
    : "At start"

  return {
    state: isPlaying ? "active" : "idle",
    summaryLabel,
    positionLabel,
    valueText: `${summaryLabel} ${hasPosition ? `at bar ${playheadBar} beat ${playheadBeat}` : "at start"}, ${formatClock(elapsedSeconds)} of ${formatClock(totalSeconds)}`,
  }
}

function getHistoryButtonClassName(status: "empty" | "available" | "blocked" | "paused") {
  if (status === "available") {
    return "bg-secondary text-zinc-200 hover:bg-border"
  }

  if (status === "blocked") {
    return "cursor-not-allowed text-rose-300/80"
  }

  if (status === "paused") {
    return "cursor-not-allowed text-amber-300/80"
  }

  return "cursor-not-allowed text-zinc-700"
}

/* ------------------------------------------------------------------ */
/*  Transport Bar                                                      */
/* ------------------------------------------------------------------ */
export function TransportBar() {
  const {
    transportState,
    audioConfig,
    playbackReadiness,
    playbackTruth,
    play,
    pause,
    stop,
    seek,
    seekToSeconds,
    setMetronomeEnabled,
    setLoopEnabled,
  } = useAudio()
  const generationState = useUiStore((state) => state.generationState)
  const undoStore = useUndoStore()
  const { project, stems, sections, blocks, chords, updateProject, setArrangement } =
    useProjectStore()

  const isPlaying = transportState.playbackState === "playing"
  const currentBar = transportState.currentBar
  const currentBeat = transportState.currentBeat
  const elapsedSeconds = transportState.elapsedSeconds
  const totalSeconds = transportState.totalSeconds

  const bpm = project?.tempo ?? 120
  const timeSig = project?.timeSignature ?? "4/4"
  const loopActive = audioConfig.loopEnabled
  const metronomeActive = audioConfig.metronomeEnabled
  const totalBars = sections.reduce((sum, section) => sum + section.barCount, 0)
  const undoBoundaryTruth = undoStore.getUndoBoundaryTruth(generationState)
  const redoBoundaryTruth = undoStore.getRedoBoundaryTruth(generationState)
  const arrangementTruth = getProjectArrangementTruth({
    project,
    stems,
    sections,
    blocks,
    chords,
  })
  const timelineAvailable = arrangementTruth.hasArrangementRows && totalBars > 0
  const playbackAction = playbackTruth.action
  const playbackReady = playbackReadiness === "ready"
  const playbackNeedsLoad = playbackAction === "load-and-play"
  const playbackLoading = playbackAction === "wait"
  const playbackUnavailable = playbackAction === "unavailable"
  const playbackRetryAvailable = playbackAction === "retry-play"
  const transportReady = timelineAvailable && playbackReady
  const transportNeedsLoad = timelineAvailable && playbackNeedsLoad
  const playbackActive = transportReady && isPlaying
  const loopPressed = loopActive
  const metronomePressed = metronomeActive
  const undoButtonDisabled = undoBoundaryTruth.status !== "available"
  const redoButtonDisabled = redoBoundaryTruth.status !== "available"
  const undoButtonTitle = undoBoundaryTruth.tooltip
  const redoButtonTitle = redoBoundaryTruth.tooltip
  const undoButtonLabel = undoBoundaryTruth.actionLabel ?? undoBoundaryTruth.statusLabel
  const redoButtonLabel = redoBoundaryTruth.actionLabel ?? redoBoundaryTruth.statusLabel
  const noTimelineGuidance = arrangementTruth.status === "persisted-only"
    ? "A saved arrangement snapshot exists, but its rows are not loaded in this session. Use Reload saved snapshot in the top bar to enable playback and transport controls."
    : "Generate or import an arrangement to enable playback and transport controls."
  const playButtonDisabled = !timelineAvailable || playbackUnavailable || playbackLoading
  const playButtonLabel = playbackActive
    ? "Pause"
    : !timelineAvailable
      ? "Play unavailable"
      : playbackLoading
      ? "Loading audio"
      : transportReady
        ? "Play"
        : playbackRetryAvailable
          ? "Retry audio"
        : transportNeedsLoad
          ? "Load and play"
          : "Play unavailable"
  const transportUnavailableTitle = !timelineAvailable
    ? noTimelineGuidance
    : transportReady
      ? undefined
      : `${playbackTruth.detail} ${playbackTruth.nextStep}`.trim()
  const transportGuidance = !timelineAvailable
    ? noTimelineGuidance
    : transportReady
      ? null
      : `${playbackTruth.detail} ${playbackTruth.nextStep}`.trim()
  const transportReadinessTruth = getTransportReadinessTruth({
    timelineAvailable,
    transportReady,
    playbackAction,
    playbackReason: playbackTruth.reason,
    playbackSummary: playbackTruth.summary,
  })
  const transportSelectionTruth = getTransportSelectionTruth({
    loopEnabled: loopActive,
    metronomeEnabled: metronomeActive,
  })
  const transportReadinessAnnouncement = transportGuidance
    ? `${transportReadinessTruth.summaryLabel}: ${transportReadinessTruth.detailLabel}. ${transportGuidance}`
    : `${transportReadinessTruth.summaryLabel}: ${transportReadinessTruth.detailLabel}.`
  const timelineStatusLabel = !timelineAvailable
    ? "No timeline"
    : playbackTruth.summary

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

  function handleUndo() {
    const transition = undoStore.undo(generationState)

    if (transition?.restoreSnapshot) {
      setArrangement(transition.restoreSnapshot)
    }
  }

  function handleRedo() {
    const transition = undoStore.redo(generationState)

    if (transition?.restoreSnapshot) {
      setArrangement(transition.restoreSnapshot)
    }
  }

  function commitBpm() {
    const val = Math.min(300, Math.max(40, parseInt(bpmDraft) || 120))
    setBpmDraft(String(val))
    setEditingBpm(false)
    updateProject({ tempo: val })
  }
  const scrubberMax = transportReady ? Math.max(totalSeconds, 0) : 0
  const playheadTruth = buildPlayheadTruth({
    transportReady,
    isPlaying,
    timelineStatusLabel,
    currentBar,
    currentBeat,
    elapsedSeconds,
    totalSeconds,
    totalBars,
  })

  return (
    <footer className="flex h-16 w-full shrink-0 items-center gap-4 border-t border-border bg-secondary px-4">
      {/* ---- LEFT: Playback pill group ---- */}
      <div className="flex h-12 min-w-[180px] items-center justify-center gap-1 rounded-xl border border-border bg-background px-4 py-2">
        {/* Skip to start */}
        <button
          type="button"
          onClick={() => seek(1)}
          disabled={!transportReady}
          title={transportUnavailableTitle}
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:text-zinc-700 disabled:hover:text-zinc-700"
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
          disabled={playButtonDisabled}
          title={transportUnavailableTitle}
          className={cn(
            "flex size-8 items-center justify-center rounded-full transition-all",
            playButtonDisabled
              ? "bg-zinc-800 text-zinc-600 shadow-none"
              : transportNeedsLoad
                ? "border border-border bg-background text-zinc-200 hover:bg-secondary"
                : playbackActive
                  ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          aria-label={playButtonLabel}
        >
          {playbackActive ? (
            <Pause className="size-4.5 fill-current" />
          ) : (
            <Play className="size-4.5 fill-current" />
          )}
        </button>

        {/* Skip to end */}
        <button
          type="button"
          onClick={() => {
            seek(Math.max(totalBars, 1))
          }}
          disabled={!transportReady}
          title={transportUnavailableTitle}
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:text-zinc-700 disabled:hover:text-zinc-700"
          aria-label="Skip to end"
        >
          <SkipForward className="size-4" />
        </button>
      </div>

      {/* ---- CENTER: Transport clock + scrubber ---- */}
      <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-xl border border-border bg-background px-4 py-2">
        <div className="flex shrink-0 items-center gap-2 rounded-lg bg-secondary px-3 py-1 font-mono text-xs">
          {transportReady ? (
            <>
              <span className="font-semibold text-zinc-200">
                {playheadTruth.summaryLabel}
              </span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-500">{playheadTruth.positionLabel}</span>
            </>
          ) : (
            <span className="font-semibold text-zinc-500">{timelineStatusLabel}</span>
          )}
        </div>
        {transportReady ? (
          <>
            <Scrubber
              value={elapsedSeconds}
              max={scrubberMax}
              disabled={false}
              state={playheadTruth.state}
              stateLabel={playheadTruth.summaryLabel}
              valueText={playheadTruth.valueText}
              onChange={seekToSeconds}
            />
            <span className="min-w-[88px] text-right font-mono text-xs text-zinc-500">
              {`${formatClock(elapsedSeconds)} / ${formatClock(totalSeconds)}`}
            </span>
          </>
        ) : (
          <div
            data-transport-guidance={!timelineAvailable ? "no-timeline" : playbackTruth.reason}
            className="flex min-w-0 flex-1 items-center rounded-full border border-border/70 bg-secondary/70 px-3 py-1 text-[11px] leading-tight text-zinc-400"
            title={transportGuidance ?? undefined}
            aria-live="polite"
          >
            <span className="max-h-8 overflow-hidden">
              {transportGuidance}
            </span>
          </div>
        )}
      </div>

      {/* ---- RIGHT: Tempo + toggles ---- */}
      <div className="flex h-12 min-w-[280px] items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-background">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={undoButtonDisabled}
              title={undoButtonTitle}
              onClick={handleUndo}
              className={cn(
                "flex size-7 items-center justify-center rounded-md transition-colors",
                getHistoryButtonClassName(undoBoundaryTruth.status)
              )}
              aria-label={undoButtonLabel}
            >
              <Undo2 className="size-3.5" />
            </button>

            <button
              type="button"
              disabled={redoButtonDisabled}
              title={redoButtonTitle}
              onClick={handleRedo}
              className={cn(
                "flex size-7 items-center justify-center rounded-md transition-colors",
                getHistoryButtonClassName(redoBoundaryTruth.status)
              )}
              aria-label={redoButtonLabel}
            >
              <Redo2 className="size-3.5" />
            </button>
          </div>

          <div
            data-testid="transport-history-truth"
            className="min-w-0 flex-1 text-[10px] leading-tight text-zinc-500"
          >
            <div className="truncate" title={undoButtonTitle}>
              {undoBoundaryTruth.statusLabel}
            </div>
            <div className="truncate" title={redoButtonTitle}>
              {redoBoundaryTruth.statusLabel}
            </div>
          </div>
        </div>

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

        <span className="text-sm text-zinc-500">{timeSig}</span>
        <div
          className="flex items-center gap-2"
          role="status"
          aria-live="polite"
          aria-label={transportReadinessAnnouncement}
        >
          <span
            data-transport-readiness-state={transportReadinessTruth.state}
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
              transportReadinessTruth.summaryClassName
            )}
            title={transportGuidance ?? undefined}
          >
            {transportReadinessTruth.summaryLabel}
          </span>
          <span
            className="max-w-[120px] truncate text-[11px] text-zinc-500"
            title={transportGuidance ?? transportReadinessTruth.detailLabel}
          >
            {transportReadinessTruth.detailLabel}
          </span>
        </div>
        <button
          type="button"
          disabled={!transportReady}
          title={transportUnavailableTitle}
          onClick={() => setLoopEnabled(!loopActive)}
          className={cn(
            "flex size-7 items-center justify-center rounded-md transition-colors",
            !transportReady
              ? loopPressed
                ? "cursor-not-allowed bg-instrument-strings/10 text-playhead-light/60"
                : "cursor-not-allowed text-zinc-700"
              : loopPressed
                ? "bg-instrument-strings/15 text-playhead-light"
                : "text-zinc-500 hover:text-muted-foreground"
          )}
          aria-label="Toggle loop"
          aria-pressed={loopPressed}
        >
          <Repeat className="size-3.5" />
        </button>

        <button
          type="button"
          disabled={!transportReady}
          title={transportUnavailableTitle}
          onClick={() => setMetronomeEnabled(!metronomeActive)}
          className={cn(
            "flex size-7 items-center justify-center rounded-md transition-colors",
            !transportReady
              ? metronomePressed
                ? "cursor-not-allowed bg-instrument-strings/10 text-playhead-light/60"
                : "cursor-not-allowed text-zinc-700"
              : metronomePressed
                ? "bg-instrument-strings/15 text-playhead-light"
                : "text-zinc-500 hover:text-muted-foreground"
          )}
          aria-label="Toggle metronome"
          aria-pressed={metronomePressed}
        >
          <MetronomeIcon className="size-3.5" />
        </button>
        <div
          data-testid="transport-selection-truth"
          className="max-w-[160px] text-[10px] leading-tight text-zinc-500"
          title={transportSelectionTruth.detailLabel}
        >
          {transportSelectionTruth.settings.map((setting) => (
            <div
              key={setting.key}
              data-transport-selection={setting.key}
              data-transport-selection-state={setting.state}
              className="truncate"
              title={setting.detailLabel}
            >
              {setting.summaryLabel}
            </div>
          ))}
        </div>
      </div>
    </footer>
  )
}
