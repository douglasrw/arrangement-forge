import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { X, ChevronDown, ChevronUp } from "lucide-react"
import { useAudio } from "@/hooks/useAudio"
import { useUiStore } from "@/store/ui-store"
import type { DrumKitLike } from "@/audio/drum-kit"

/* ------------------------------------------------------------------ */
/*  Instrument palette (matches sequencer-block.tsx)                   */
/* ------------------------------------------------------------------ */
const INSTRUMENTS = [
  { key: "drums", label: "DRUMS", color: "var(--instrument-drums)", defaultDb: -3 },
  { key: "bass", label: "BASS", color: "var(--instrument-bass)", defaultDb: -2 },
  { key: "piano", label: "PIANO", color: "var(--instrument-piano)", defaultDb: -5 },
  { key: "guitar", label: "GUITAR", color: "var(--instrument-guitar)", defaultDb: -4 },
  { key: "strings", label: "STRINGS", color: "var(--instrument-strings)", defaultDb: -6 },
] as const

type InstrumentKey = (typeof INSTRUMENTS)[number]["key"]

interface ChannelState {
  volume: number // 0-100
  muted: boolean
  solo: boolean
}

const DEFAULT_CHANNELS: Record<InstrumentKey | "master", ChannelState> = {
  drums: { volume: 75, muted: false, solo: false },
  bass: { volume: 78, muted: false, solo: false },
  piano: { volume: 65, muted: false, solo: false },
  guitar: { volume: 70, muted: false, solo: false },
  strings: { volume: 60, muted: false, solo: false },
  master: { volume: 80, muted: false, solo: false },
}

function volumeToDb(v: number): string {
  if (v === 0) return "-inf"
  const db = 20 * Math.log10(v / 80)
  return `${db >= 0 ? "+" : ""}${Math.round(db)} dB`
}

/* ------------------------------------------------------------------ */
/*  Vertical Fader                                                     */
/* ------------------------------------------------------------------ */
function VerticalFader({
  value,
  onChange,
  thumbColor,
}: {
  value: number
  onChange: (v: number) => void
  thumbColor: string
}) {
  const trackHeight = 80
  const thumbSize = 12
  const fillHeight = (value / 100) * trackHeight

  const handleInteraction = useCallback(
    (clientY: number, rect: DOMRect) => {
      const relativeY = rect.bottom - clientY
      const clamped = Math.max(0, Math.min(100, (relativeY / trackHeight) * 100))
      onChange(Math.round(clamped))
    },
    [onChange]
  )

  return (
    <div
      className="relative mx-auto flex cursor-pointer items-end justify-center"
      style={{ width: thumbSize + 8, height: trackHeight }}
      onMouseDown={(e) => {
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
      aria-label="Volume fader"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") onChange(Math.min(100, value + 2))
        if (e.key === "ArrowDown") onChange(Math.max(0, value - 2))
      }}
    >
      {/* Track */}
      <div className="absolute left-1/2 -translate-x-1/2 rounded-full bg-input" style={{ width: 4, height: trackHeight }} />

      {/* Fill */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
        style={{
          width: 4,
          height: fillHeight,
          background: `linear-gradient(to top, ${thumbColor}88, ${thumbColor})`,
        }}
      />

      {/* Thumb */}
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
          <div key={i} className="relative w-1 overflow-hidden rounded-full bg-secondary" style={{ height: 80 }}>
            <div
              className="absolute inset-x-0 bottom-0 rounded-full"
              style={{
                height: `${h}%`,
                background: "linear-gradient(to top, var(--meter-green), var(--meter-yellow) 70%, var(--meter-red) 95%)",
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

function DrumSubMix({ drumKit }: { drumKit: DrumKitLike | null }) {
  // Local state for sub-mix levels (0-100, maps to gain 0-3)
  const [levels, setLevels] = useState<Record<string, number>>({
    kick: 50,
    snare: 50,
    hihat: 50,
    cymbals: 50,
    toms: 50,
  })

  const handleChange = useCallback(
    (groupName: string, value: number) => {
      setLevels((prev) => ({ ...prev, [groupName]: value }))
      // Map 0-100 slider to 0-3 gain range (50 = 1.0 = unity)
      const gain = (value / 50) * 1.0
      drumKit?.setVoiceGroupGain(groupName, gain)
    },
    [drumKit]
  )

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-2 pt-1">
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
            onChange={(e) => handleChange(group.name, Number(e.target.value))}
            className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-input accent-primary [&::-webkit-slider-thumb]:size-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
          />
          <span className="w-6 text-right font-mono text-[9px] text-zinc-600">
            {levels[group.name]}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Mixer Drawer                                                       */
/* ------------------------------------------------------------------ */
export function MixerDrawer() {
  const open = useUiStore((s) => s.mixerExpanded)
  const toggleMixer = useUiStore((s) => s.toggleMixer)
  const [drumSubOpen, setDrumSubOpen] = useState(false)
  const [channels, setChannels] = useState(DEFAULT_CHANNELS)
  const { engine, transportState } = useAudio()

  const drumKit = engine.getDrumKit()
  const isPlaying = transportState.playbackState === "playing"

  const updateChannel = useCallback(
    (key: InstrumentKey | "master", field: keyof ChannelState, value: boolean | number) => {
      setChannels((prev) => {
        const next = { ...prev, [key]: { ...prev[key], [field]: value } }

        // Wire through to audio engine
        if (key === "master") {
          if (field === "volume") engine.setMasterVolume((value as number) / 80)
        } else {
          if (field === "muted") engine.setMute(key, value as boolean)
          if (field === "solo") engine.setSolo(key, value as boolean)
          if (field === "volume") engine.setVolume(key, (value as number) / 80)
        }

        return next
      })
    },
    [engine]
  )

  return (
    <div className="shrink-0 border-t border-border bg-card">
      {/* Header strip — always visible, acts as toggle */}
      <button
        type="button"
        onClick={toggleMixer}
        className="flex w-full items-center justify-between px-4 py-1.5"
      >
        <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          Mixer
        </span>
        {open ? (
          <X className="size-3.5 text-zinc-500" />
        ) : (
          <div className="h-1 w-8 rounded-full bg-zinc-600" />
        )}
      </button>

      {open && (
        <div>

          {/* Channel strip row */}
          <div className="flex h-[160px] px-2">
            {/* Instrument channels */}
            {INSTRUMENTS.map((inst) => {
              const ch = channels[inst.key]
              const isDrums = inst.key === "drums"
              return (
                <div
                  key={inst.key}
                  className="flex flex-1 flex-col items-center gap-1.5 border-r border-secondary pt-1"
                  style={{ borderTopWidth: 2, borderTopColor: inst.color, borderTopStyle: "solid" }}
                >
                  {/* Name — drums label is clickable to toggle sub-mix */}
                  {isDrums ? (
                    <button
                      type="button"
                      onClick={() => setDrumSubOpen((v) => !v)}
                      className="flex items-center gap-0.5 text-[10px] font-semibold uppercase"
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
                      className="text-[10px] font-semibold uppercase"
                      style={{ color: inst.color, letterSpacing: "0.1em" }}
                    >
                      {inst.label}
                    </span>
                  )}

                  {/* M/S buttons */}
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => updateChannel(inst.key, "muted", !ch.muted)}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors",
                        ch.muted
                          ? "bg-warning/80 text-card"
                          : "bg-input text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      onClick={() => updateChannel(inst.key, "solo", !ch.solo)}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors",
                        ch.solo
                          ? "bg-instrument-strings/80 text-card"
                          : "bg-input text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      S
                    </button>
                  </div>

                  {/* Fader */}
                  <VerticalFader
                    value={ch.volume}
                    onChange={(v) => updateChannel(inst.key, "volume", v)}
                    thumbColor={inst.color}
                  />

                  {/* dB readout */}
                  <span className="font-mono text-[10px] text-zinc-500">
                    {ch.muted ? "-inf" : volumeToDb(ch.volume)}
                  </span>
                </div>
              )
            })}

            {/* Master channel */}
            <div
              className="flex flex-[1.3] flex-col items-center gap-1.5 rounded-r-md bg-secondary/60 pt-1"
              style={{ borderTop: "2px solid var(--muted-foreground)" }}
            >
              {/* Label */}
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Master
              </span>

              {/* No M/S — spacer */}
              <div className="h-[22px]" />

              {/* Fader + level meters side by side */}
              <div className="flex items-end gap-2">
                <LevelMeter fill={isPlaying ? channels.master.volume * 0.9 : 0} />
                <VerticalFader
                  value={channels.master.volume}
                  onChange={(v) => updateChannel("master", "volume", v)}
                  thumbColor="var(--master-thumb)"
                />
              </div>

              {/* dB readout */}
              <span className="font-mono text-[10px] text-muted-foreground">
                {volumeToDb(channels.master.volume)}
              </span>
            </div>
          </div>

          {/* Drum sub-mix strip — collapsible below main mixer */}
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
              <DrumSubMix drumKit={drumKit} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
