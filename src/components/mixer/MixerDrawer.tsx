import { useState, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"
import { X, ChevronDown, ChevronUp } from "lucide-react"
import { useAudio } from "@/hooks/useAudio"
import { getProjectArrangementTruth, type ProjectArrangementTruthStatus, useProjectStore } from "@/store/project-store"
import { useUiStore } from "@/store/ui-store"
import type { DrumKitLike, DrumKitSelectionTruth } from "@/audio/drum-kit"
import type { PlaybackTruth, Stem, SystemStatus } from "@/types"

/* ------------------------------------------------------------------ */
/*  Instrument palette (matches sequencer-block.tsx)                   */
/* ------------------------------------------------------------------ */
const INSTRUMENTS = [
  { key: "drums", label: "DRUMS", color: "var(--instrument-drums)" },
  { key: "bass", label: "BASS", color: "var(--instrument-bass)" },
  { key: "piano", label: "PIANO", color: "var(--instrument-piano)" },
  { key: "guitar", label: "GUITAR", color: "var(--instrument-guitar)" },
  { key: "strings", label: "STRINGS", color: "var(--instrument-strings)" },
] as const

type InstrumentKey = (typeof INSTRUMENTS)[number]["key"]

interface ChannelState {
  volume: number // 0-100
  pan: number // -100 (L) to 100 (R)
  muted: boolean
  solo: boolean
  available: boolean
}

interface MixerReadinessTruth {
  status: "ready" | "waiting" | "blocked"
  badge: "Ready" | "Waiting" | "Blocked"
  detailLabel: string | null
  message: string | null
  tone: "ready" | "waiting" | "blocked" | "error"
}

interface DrumSubMixTruth {
  status: "ready" | "loading" | "error" | "unavailable"
  badge: string | null
  message: string | null
}

interface LaneTruth {
  badge: string | null
  detail: string | null
  tone: "default" | "error"
}

interface LaneSelectionTruth {
  badge: string
  detail: string
  state: "default" | "selected"
}

const UNITY_SLIDER_VALUE = 80
const MAX_SLIDER_VALUE = 100
const PAN_SLIDER_VALUE = 100
const DEFAULT_GROUP_LEVEL = 50
const DEFAULT_STEM_GAIN = 0.8

function volumeToDb(v: number): string {
  if (v === 0) return "-inf"
  const db = 20 * Math.log10(v / UNITY_SLIDER_VALUE)
  return `${db >= 0 ? "+" : ""}${Math.round(db)} dB`
}

function gainToSliderValue(gain: number): number {
  return Math.max(0, Math.min(MAX_SLIDER_VALUE, Math.round(gain * UNITY_SLIDER_VALUE)))
}

function sliderValueToGain(value: number): number {
  return value / UNITY_SLIDER_VALUE
}

function panToSliderValue(pan: number): number {
  return Math.max(-PAN_SLIDER_VALUE, Math.min(PAN_SLIDER_VALUE, Math.round(pan * PAN_SLIDER_VALUE)))
}

function sliderValueToPan(value: number): number {
  return Math.max(-1, Math.min(1, value / PAN_SLIDER_VALUE))
}

function formatPanValue(value: number): string {
  if (value === 0) return "C"
  return `${value < 0 ? "L" : "R"}${Math.abs(value)}`
}

function toChannelState(stem?: Stem): ChannelState {
  if (!stem) {
    return {
      volume: 0,
      pan: 0,
      muted: false,
      solo: false,
      available: false,
    }
  }

  return {
    volume: gainToSliderValue(stem.volume),
    pan: panToSliderValue(stem.pan),
    muted: stem.isMuted,
    solo: stem.isSolo,
    available: true,
  }
}

function getMixerReadinessTruth({
  arrangementTruthStatus,
  stemsCount,
  playbackTruth,
}: {
  arrangementTruthStatus: ProjectArrangementTruthStatus
  stemsCount: number
  playbackTruth: PlaybackTruth
}): MixerReadinessTruth {
  if (arrangementTruthStatus === "missing") {
    return {
      status: "blocked",
      badge: "Blocked",
      detailLabel: "No arrangement",
      message: "Generate or import an arrangement to enable mixer controls.",
      tone: "blocked",
    }
  }

  if (arrangementTruthStatus === "persisted-only") {
    return {
      status: "blocked",
      badge: "Blocked",
      detailLabel: "Reload arrangement",
      message: "A saved arrangement snapshot exists, but its rows are not loaded in this session. Use Reload saved snapshot in the top bar to enable mixer controls.",
      tone: "blocked",
    }
  }

  if (stemsCount === 0) {
    return {
      status: "blocked",
      badge: "Blocked",
      detailLabel: "No channels",
      message: "No mixer channels are loaded for this arrangement yet.",
      tone: "blocked",
    }
  }

  if (playbackTruth.status === "unavailable") {
    const playbackFailureTone = playbackTruth.reason === "engine-start-failed"
      || playbackTruth.reason === "arrangement-load-failed"
      || playbackTruth.reason === "instrument-update-failed"

    return {
      status: "blocked",
      badge: "Blocked",
      detailLabel: playbackTruth.summary,
      message: `${playbackTruth.detail} ${playbackTruth.nextStep}`.trim(),
      tone: playbackFailureTone ? "error" : "blocked",
    }
  }

  if (playbackTruth.status === "loading") {
    return {
      status: "waiting",
      badge: "Waiting",
      detailLabel: playbackTruth.summary,
      message: `${playbackTruth.detail} ${playbackTruth.nextStep}`.trim(),
      tone: "waiting",
    }
  }

  return {
    status: "ready",
    badge: "Ready",
    detailLabel: null,
    message: null,
    tone: "ready",
  }
}

function getDrumSubMixTruth({
  drumKit,
  systemStatus,
  errorMessage,
}: {
  drumKit: DrumKitLike | null
  systemStatus: SystemStatus
  errorMessage: string | null
}): DrumSubMixTruth {
  if (systemStatus === "loading-samples") {
    return {
      status: "loading",
      badge: "Kit loading",
      message: "Drum sub-mix loading. Drum group controls will unlock when samples are ready.",
    }
  }

  if (systemStatus === "error") {
    return {
      status: "error",
      badge: "Kit error",
      message: `Drum sub-mix unavailable: ${errorMessage ?? "Instrument samples could not be loaded."}`,
    }
  }

  if (drumKit) {
    return {
      status: "ready",
      badge: null,
      message: null,
    }
  }

  return {
    status: "unavailable",
    badge: "Kit unavailable",
    message: "Drum sub-mix unavailable right now.",
  }
}

function getLaneTruth({
  stem,
  instrumentLabel,
  arrangementTruthStatus,
  isDrums,
  drumSubMixTruth,
}: {
  stem?: Stem
  instrumentLabel: string
  arrangementTruthStatus: ProjectArrangementTruthStatus
  isDrums: boolean
  drumSubMixTruth: DrumSubMixTruth
}): LaneTruth {
  if (!stem) {
    if (arrangementTruthStatus === "persisted-only") {
      return {
        badge: "Reload arrangement",
        detail: `Use Reload saved snapshot in the top bar to enable ${instrumentLabel.toLowerCase()}.`,
        tone: "default",
      }
    }

    if (arrangementTruthStatus !== "missing") {
      return {
        badge: "No stem",
        detail: `No ${instrumentLabel.toLowerCase()} stem is loaded for this arrangement.`,
        tone: "default",
      }
    }

    return {
      badge: "No arrangement",
      detail: `Generate or import an arrangement to enable ${instrumentLabel.toLowerCase()}.`,
      tone: "default",
    }
  }

  if (isDrums && drumSubMixTruth.badge) {
    return {
      badge: drumSubMixTruth.badge,
      detail: drumSubMixTruth.message,
      tone: drumSubMixTruth.status === "error" ? "error" : "default",
    }
  }

  return {
    badge: null,
    detail: null,
    tone: "default",
  }
}

function getLaneSelectionTruth(stem: Stem): LaneSelectionTruth {
  const volume = gainToSliderValue(stem.volume)
  const defaultVolume = stem.volume === DEFAULT_STEM_GAIN
  const defaultPan = stem.pan === 0
  const defaultMute = !stem.isMuted
  const defaultSolo = !stem.isSolo

  if (defaultVolume && defaultPan && defaultMute && defaultSolo) {
    return {
      badge: "Default mix",
      detail: "Default gain, centered pan, mute off, solo off.",
      state: "default",
    }
  }

  const details = [
    stem.isMuted ? "Mute on" : "Mute off",
    stem.isSolo ? "Solo on" : "Solo off",
    defaultVolume ? "Default gain" : `${volumeToDb(volume)} gain`,
    defaultPan ? "Centered pan" : `Pan ${formatPanValue(panToSliderValue(stem.pan))}`,
  ]

  return {
    badge: "Current mix",
    detail: details.join(", "),
    state: "selected",
  }
}

/* ------------------------------------------------------------------ */
/*  Vertical Fader                                                     */
/* ------------------------------------------------------------------ */
function VerticalFader({
  value,
  onChange,
  thumbColor,
  ariaLabel,
  disabled = false,
}: {
  value: number
  onChange: (v: number) => void
  thumbColor: string
  ariaLabel: string
  disabled?: boolean
}) {
  const trackHeight = 80
  const thumbSize = 12
  const fillHeight = (value / 100) * trackHeight

  const handleInteraction = useCallback(
    (clientY: number, rect: DOMRect) => {
      if (disabled) return
      const relativeY = rect.bottom - clientY
      const clamped = Math.max(0, Math.min(100, (relativeY / trackHeight) * 100))
      onChange(Math.round(clamped))
    },
    [disabled, onChange]
  )

  return (
    <div
      className={cn(
        "relative mx-auto flex items-end justify-center",
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      )}
      style={{ width: thumbSize + 8, height: trackHeight }}
      onMouseDown={(e) => {
        if (disabled) return

        const rect = e.currentTarget.getBoundingClientRect()
        handleInteraction(e.clientY, rect)

        const handleMove = (ev: MouseEvent) => handleInteraction(ev.clientY, rect)
        const handleUp = () => {
          window.removeEventListener("mousemove", handleMove)
          window.removeEventListener("mouseup", handleUp)
        }
        window.addEventListener("mousemove", handleMove)
        window.addEventListener("mouseup", handleUp)
      }}
      role="slider"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return
        if (e.key === "ArrowUp") onChange(Math.min(100, value + 2))
        if (e.key === "ArrowDown") onChange(Math.max(0, value - 2))
      }}
    >
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full bg-input"
        style={{ width: 4, height: trackHeight }}
      />

      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
        style={{
          width: 4,
          height: fillHeight,
          background: `linear-gradient(to top, ${thumbColor}88, ${thumbColor})`,
        }}
      />

      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{
          width: thumbSize,
          height: thumbSize,
          bottom: fillHeight - thumbSize / 2,
          backgroundColor: thumbColor,
          boxShadow: `0 0 6px ${thumbColor}80`,
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Level Meter (L/R bars for Master)                                  */
/* ------------------------------------------------------------------ */
function LevelMeter({ fill }: { fill: number }) {
  return (
    <div className="flex items-end gap-1" style={{ height: 80 }}>
      {[fill, fill - 5].map((f, i) => {
        const h = Math.max(0, Math.min(100, f))
        return (
          <div
            key={i}
            className="relative w-1 overflow-hidden rounded-full bg-secondary"
            style={{ height: 80 }}
          >
            <div
              className="absolute inset-x-0 bottom-0 rounded-full"
              style={{
                height: `${h}%`,
                background:
                  "linear-gradient(to top, var(--meter-green), var(--meter-yellow) 70%, var(--meter-red) 95%)",
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Drum Sub-Mix Strip                                                 */
/* ------------------------------------------------------------------ */
const DRUM_GROUPS = [
  { name: "kick", label: "Kick" },
  { name: "snare", label: "Snare" },
  { name: "hihat", label: "Hi-Hat" },
  { name: "cymbals", label: "Cymbals" },
  { name: "toms", label: "Toms" },
]

function DrumSubMix({
  drumKit,
  truth,
  selectionTruth,
  interactionLocked = false,
}: {
  drumKit: DrumKitLike | null
  truth: DrumSubMixTruth
  selectionTruth: DrumKitSelectionTruth | null
  interactionLocked?: boolean
}) {
  const [levels, setLevels] = useState<Record<string, number>>({
    kick: DEFAULT_GROUP_LEVEL,
    snare: DEFAULT_GROUP_LEVEL,
    hihat: DEFAULT_GROUP_LEVEL,
    cymbals: DEFAULT_GROUP_LEVEL,
    toms: DEFAULT_GROUP_LEVEL,
  })

  useEffect(() => {
    if (!drumKit) return

    setLevels(
      Object.fromEntries(
        DRUM_GROUPS.map((group) => [
          group.name,
          Math.max(0, Math.min(100, Math.round(drumKit.getVoiceGroupGain(group.name) * 50))),
        ])
      )
    )
  }, [drumKit])

  const handleChange = useCallback(
    (groupName: string, value: number) => {
      if (!drumKit || interactionLocked) return
      setLevels((prev) => ({ ...prev, [groupName]: value }))
      drumKit.setVoiceGroupGain(groupName, value / DEFAULT_GROUP_LEVEL)
    },
    [drumKit, interactionLocked]
  )

  return (
    <div className="px-4 pb-2 pt-1">
      {selectionTruth && (
        <div className="pb-2">
          <div className="flex items-center gap-2">
            <span
              data-drum-kit-selection-state={selectionTruth.selectionSource}
              title={selectionTruth.detail}
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em]",
                selectionTruth.selectionSource === "default"
                  ? "bg-card text-muted-foreground"
                  : "bg-primary/15 text-primary"
              )}
            >
              {selectionTruth.summary}
            </span>
            <span className="text-[10px] font-medium text-foreground">
              {selectionTruth.kitLabel}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {selectionTruth.detail}
          </p>
        </div>
      )}
      {truth.message && (
        <p
          className={cn(
            "pb-2 text-[10px] uppercase tracking-wider",
            truth.status === "error" ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {truth.message}
        </p>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {DRUM_GROUPS.map((group) => (
          <div key={group.name} className="flex items-center gap-2" style={{ minWidth: 140 }}>
            <label
              htmlFor={`drum-sub-${group.name}`}
              className="w-14 text-right text-[10px] font-medium text-muted-foreground"
            >
              {group.label}
            </label>
            <input
              id={`drum-sub-${group.name}`}
              type="range"
              min={0}
              max={100}
              value={levels[group.name]}
              disabled={!drumKit || interactionLocked}
              onChange={(e) => handleChange(group.name, Number(e.target.value))}
              className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-input accent-primary disabled:cursor-not-allowed disabled:opacity-40 [&::-webkit-slider-thumb]:size-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
            />
            <span className="w-8 text-right font-mono text-[9px] text-zinc-600">
              {drumKit ? levels[group.name] : truth.status === "loading" ? "..." : "--"}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Mixer Drawer                                                       */
/* ------------------------------------------------------------------ */
export function MixerDrawer() {
  const open = useUiStore((s) => s.mixerExpanded)
  const toggleMixer = useUiStore((s) => s.toggleMixer)
  const systemStatus = useUiStore((s) => s.systemStatus)
  const errorMessage = useUiStore((s) => s.errorMessage)
  const project = useProjectStore((s) => s.project)
  const stems = useProjectStore((s) => s.stems)
  const sections = useProjectStore((s) => s.sections)
  const blocks = useProjectStore((s) => s.blocks)
  const chords = useProjectStore((s) => s.chords)
  const updateStem = useProjectStore((s) => s.updateStem)
  const centerStemPan = useProjectStore((s) => s.centerStemPan)
  const [drumSubOpen, setDrumSubOpen] = useState(false)
  const {
    engine,
    transportState,
    audioConfig,
    playbackTruth,
    setMasterVolume,
  } = useAudio()

  const drumKit = engine.getDrumKit()
  const drumKitSelectionTruth = drumKit?.getSelectionTruth() ?? null
  const drumSubMixTruth = getDrumSubMixTruth({ drumKit, systemStatus, errorMessage })
  const arrangementTruth = getProjectArrangementTruth({
    project,
    stems,
    sections,
    blocks,
    chords,
  })
  const isPlaying = transportState.playbackState === "playing"
  const stemByInstrument = new Map(stems.map((stem) => [stem.instrument, stem]))
  const masterVolume = gainToSliderValue(audioConfig.masterVolume)
  const mixerReadiness = getMixerReadinessTruth({
    arrangementTruthStatus: arrangementTruth.status,
    stemsCount: stems.length,
    playbackTruth,
  })
  const mixerReady = mixerReadiness.status === "ready"

  useEffect(() => {
    if (!stemByInstrument.has("drums")) {
      setDrumSubOpen(false)
    }
  }, [stemByInstrument])

  function updateChannel(
    key: InstrumentKey | "master",
    field: keyof Omit<ChannelState, "available">,
    value: boolean | number
  ) {
    if (key === "master") {
      if (field === "volume") {
        setMasterVolume(sliderValueToGain(value as number))
      }
      return
    }

    const stem = stemByInstrument.get(key)
    if (!stem) return

    if (field === "volume") {
      updateStem(stem.id, { volume: sliderValueToGain(value as number) })
      return
    }

    if (field === "pan") {
      updateStem(stem.id, { pan: sliderValueToPan(value as number) })
      return
    }

    if (field === "muted") {
      updateStem(stem.id, { isMuted: value as boolean })
      return
    }

    updateStem(stem.id, { isSolo: value as boolean })
  }

  return (
    <div className="shrink-0 border-t-2 border-border bg-secondary">
      <button
        type="button"
        onClick={toggleMixer}
        className="flex w-full items-center justify-between gap-3 px-4 py-2"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            Mixer
          </span>
          <span
            data-mixer-readiness={mixerReadiness.status}
            className={cn(
              "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em]",
              mixerReadiness.status === "ready"
                ? "bg-emerald-500/10 text-emerald-300"
                : mixerReadiness.status === "waiting"
                  ? "bg-amber-500/10 text-amber-300"
                  : "bg-rose-500/10 text-rose-300"
            )}
          >
            {mixerReadiness.badge}
          </span>
          {mixerReadiness.detailLabel && (
            <span
              data-mixer-readiness-detail={mixerReadiness.tone}
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em]",
                mixerReadiness.tone === "waiting"
                  ? "bg-amber-500/10 text-amber-200"
                  : mixerReadiness.tone === "error"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-card text-muted-foreground"
              )}
            >
              {mixerReadiness.detailLabel}
            </span>
          )}
        </div>
        {open ? (
          <X className="size-3.5 text-zinc-500" />
        ) : (
          <div className="h-1 w-8 rounded-full bg-zinc-600" />
        )}
      </button>

      {open && (
        <div>
          {mixerReadiness.message && (
            <div
              className={cn(
                "mx-2 mb-2 rounded-md border px-3 py-2 text-[11px]",
                mixerReadiness.tone === "error"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : mixerReadiness.status === "waiting"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                    : mixerReadiness.status === "blocked"
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                      : "border-border bg-card/80 text-muted-foreground"
              )}
            >
              {mixerReadiness.message}
            </div>
          )}

          <div className="flex h-[206px] px-2">
            {INSTRUMENTS.map((inst) => {
              const stem = stemByInstrument.get(inst.key)
              const ch = toChannelState(stem)
              const isDrums = inst.key === "drums"
              const laneTruth = getLaneTruth({
                stem,
                instrumentLabel: inst.label,
                arrangementTruthStatus: arrangementTruth.status,
                isDrums,
                drumSubMixTruth,
              })
              const laneSelectionTruth = stem ? getLaneSelectionTruth(stem) : null
              return (
                <div
                  key={inst.key}
                  className="flex flex-1 flex-col items-center gap-1.5 border-r border-secondary pt-1"
                  style={{
                    borderTopWidth: 2,
                    borderTopColor: inst.color,
                    borderTopStyle: "solid",
                  }}
                >
                  <div className="flex flex-col items-center gap-1">
                    {isDrums ? (
                      <button
                        type="button"
                        onClick={() => setDrumSubOpen((v) => !v)}
                        disabled={!ch.available}
                        className="flex items-center gap-0.5 text-[10px] font-semibold uppercase disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ color: inst.color, letterSpacing: "0.1em" }}
                      >
                        {inst.label}
                        {drumSubOpen ? (
                          <ChevronUp className="size-2.5" />
                        ) : (
                          <ChevronDown className="size-2.5" />
                        )}
                      </button>
                    ) : (
                      <span
                        className={cn(
                          "text-[10px] font-semibold uppercase",
                          !ch.available && "opacity-40"
                        )}
                        style={{ color: inst.color, letterSpacing: "0.1em" }}
                      >
                        {inst.label}
                      </span>
                    )}
                    {laneTruth.badge && (
                      <span
                        title={laneTruth.detail ?? undefined}
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.18em]",
                          laneTruth.tone === "error"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-card text-muted-foreground"
                        )}
                      >
                        {laneTruth.badge}
                      </span>
                    )}
                    {laneSelectionTruth && (
                      <span
                        data-mixer-selection-state={laneSelectionTruth.state}
                        title={laneSelectionTruth.detail}
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.18em]",
                          laneSelectionTruth.state === "selected"
                            ? "bg-primary/15 text-primary"
                            : "bg-card text-muted-foreground"
                        )}
                      >
                        {laneSelectionTruth.badge}
                      </span>
                    )}
                    {isDrums && drumKitSelectionTruth && (
                      <span
                        data-drum-kit-selection-state={drumKitSelectionTruth.selectionSource}
                        title={drumKitSelectionTruth.detail}
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.18em]",
                          drumKitSelectionTruth.selectionSource === "default"
                            ? "bg-card text-muted-foreground"
                            : "bg-primary/15 text-primary"
                        )}
                      >
                        {drumKitSelectionTruth.summary}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label={`Toggle ${inst.label} mute`}
                      aria-pressed={ch.muted}
                      disabled={!mixerReady || !ch.available}
                      onClick={() => updateChannel(inst.key, "muted", !ch.muted)}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                        ch.muted
                          ? "bg-warning/80 text-card"
                          : "bg-input text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      aria-label={`Toggle ${inst.label} solo`}
                      aria-pressed={ch.solo}
                      disabled={!mixerReady || !ch.available}
                      onClick={() => updateChannel(inst.key, "solo", !ch.solo)}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                        ch.solo
                          ? "bg-instrument-strings/80 text-card"
                          : "bg-input text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      S
                    </button>
                  </div>

                  <VerticalFader
                    value={ch.volume}
                    onChange={(v) => updateChannel(inst.key, "volume", v)}
                    thumbColor={inst.color}
                    ariaLabel={`${inst.label} volume fader`}
                    disabled={!mixerReady || !ch.available}
                  />

                  <span className="font-mono text-[10px] text-zinc-500">
                    {!ch.available ? "--" : ch.muted ? "-inf" : volumeToDb(ch.volume)}
                  </span>

                  <div
                    className={cn(
                      "flex w-full items-center gap-1 px-2",
                      !ch.available && "opacity-40"
                    )}
                  >
                    <span className="text-[9px] font-medium uppercase text-zinc-500">L</span>
                    <input
                      type="range"
                      min={-PAN_SLIDER_VALUE}
                      max={PAN_SLIDER_VALUE}
                      step={1}
                      value={ch.pan}
                      disabled={!mixerReady || !ch.available}
                      onChange={(e) => updateChannel(inst.key, "pan", Number(e.target.value))}
                      aria-label={`${inst.label} pan`}
                      className="h-1 w-full cursor-pointer appearance-none rounded-full bg-input disabled:cursor-not-allowed disabled:opacity-60"
                      style={{ accentColor: inst.color }}
                    />
                    <span className="text-[9px] font-medium uppercase text-zinc-500">R</span>
                  </div>

                  <div className="flex w-full items-center justify-between px-2">
                    <span
                      aria-label={`${inst.label} pan value`}
                      className={cn(
                        "font-mono text-[9px] text-zinc-500",
                        !ch.available && "opacity-40"
                      )}
                    >
                      {ch.available ? formatPanValue(ch.pan) : "--"}
                    </span>
                    <button
                      type="button"
                      aria-label={`Center ${inst.label} pan`}
                      disabled={!mixerReady || !stem || ch.pan === 0}
                      onClick={() => {
                        if (stem) {
                          centerStemPan(stem.id)
                        }
                      }}
                      className="rounded border border-border/70 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-zinc-500 transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      C
                    </button>
                  </div>
                </div>
              )
            })}

            <div
              className="flex flex-[1.3] flex-col items-center gap-1.5 rounded-r-md bg-secondary/60 pt-1"
              style={{ borderTop: "2px solid var(--muted-foreground)" }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Master
              </span>

              <div className="h-[22px]" />

              <div className="flex items-end gap-2">
                <LevelMeter fill={isPlaying ? masterVolume * 0.9 : 0} />
                <VerticalFader
                  value={masterVolume}
                  onChange={(v) => updateChannel("master", "volume", v)}
                  thumbColor="var(--master-thumb)"
                  ariaLabel="Master volume fader"
                  disabled={!mixerReady}
                />
              </div>

              <span className="font-mono text-[10px] text-muted-foreground">
                {volumeToDb(masterVolume)}
              </span>
            </div>
          </div>

          {drumSubOpen && (
            <div className="border-t border-secondary bg-card">
              <div className="flex items-center gap-2 px-4 pt-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Drum Kit Mix
                </span>
                <div className="flex-1 border-t border-secondary" />
                <button
                  type="button"
                  onClick={() => setDrumSubOpen(false)}
                  className="text-zinc-600 hover:text-zinc-500"
                  aria-label="Close drum sub-mix"
                >
                  <X className="size-3" />
                </button>
              </div>
                <DrumSubMix
                  drumKit={drumKit}
                  truth={drumSubMixTruth}
                  selectionTruth={drumKitSelectionTruth}
                  interactionLocked={!mixerReady}
                />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
