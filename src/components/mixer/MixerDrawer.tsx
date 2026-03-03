import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Instrument palette (matches sequencer-block.tsx)                   */
/* ------------------------------------------------------------------ */
const INSTRUMENTS = [
  { key: "drums", label: "DRUMS", color: "#06b6d4", defaultDb: -3 },
  { key: "bass", label: "BASS", color: "#34d399", defaultDb: -2 },
  { key: "piano", label: "PIANO", color: "#fbbf24", defaultDb: -5 },
  { key: "guitar", label: "GUITAR", color: "#a78bfa", defaultDb: -4 },
  { key: "strings", label: "STRINGS", color: "#14b8a6", defaultDb: -6 },
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
      <div className="absolute left-1/2 -translate-x-1/2 rounded-full bg-[#3f3f46]" style={{ width: 4, height: trackHeight }} />

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
          <div key={i} className="relative w-1 overflow-hidden rounded-full bg-[#27272a]" style={{ height: 80 }}>
            <div
              className="absolute inset-x-0 bottom-0 rounded-full"
              style={{
                height: `${h}%`,
                background: "linear-gradient(to top, #14b8a6, #fbbf24 70%, #ef4444 95%)",
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Mixer Drawer                                                       */
/* ------------------------------------------------------------------ */
export function MixerDrawer() {
  const [open, setOpen] = useState(false)
  const [channels, setChannels] = useState(DEFAULT_CHANNELS)

  const updateChannel = useCallback(
    (key: InstrumentKey | "master", field: keyof ChannelState, value: boolean | number) => {
      setChannels((prev) => ({
        ...prev,
        [key]: { ...prev[key], [field]: value },
      }))
    },
    []
  )

  return (
    <>
      {/* Toggle button — sits in the transport bar area */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "fixed bottom-14 right-4 z-40 rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5",
            "text-xs font-medium text-[#a1a1aa] transition-colors hover:border-[#3f3f46] hover:text-[#e4e4e7]"
          )}
        >
          Mixer
        </button>
      )}

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-12 z-50 transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="border-t border-[#3f3f46]/50 bg-[#18181b]" style={{ height: 220 }}>
          {/* Drag handle */}
          <div className="flex justify-center py-2">
            <div className="h-1 w-8 rounded-full bg-[#52525b]" />
          </div>

          {/* Header strip */}
          <div className="flex items-center justify-between px-4 pb-2">
            <span className="text-xs font-medium uppercase tracking-widest text-[#71717a]">
              Mixer
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex size-6 items-center justify-center rounded text-[#71717a] transition-colors hover:text-[#e4e4e7]"
              aria-label="Close mixer"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Channel strip row */}
          <div className="flex h-[160px] px-2">
            {/* Instrument channels */}
            {INSTRUMENTS.map((inst) => {
              const ch = channels[inst.key]
              return (
                <div
                  key={inst.key}
                  className="flex flex-1 flex-col items-center gap-1.5 border-r border-[#27272a] pt-1"
                  style={{ borderTopWidth: 2, borderTopColor: inst.color, borderTopStyle: "solid" }}
                >
                  {/* Name */}
                  <span
                    className="text-[10px] font-semibold uppercase"
                    style={{ color: inst.color, letterSpacing: "0.1em" }}
                  >
                    {inst.label}
                  </span>

                  {/* M/S buttons */}
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => updateChannel(inst.key, "muted", !ch.muted)}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors",
                        ch.muted
                          ? "bg-[#f59e0b]/80 text-[#18181b]"
                          : "bg-[#3f3f46] text-[#a1a1aa] hover:bg-[#52525b]"
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
                          ? "bg-[#14b8a6]/80 text-[#18181b]"
                          : "bg-[#3f3f46] text-[#a1a1aa] hover:bg-[#52525b]"
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
                  <span className="font-mono text-[10px] text-[#71717a]">
                    {ch.muted ? "-inf" : volumeToDb(ch.volume)}
                  </span>
                </div>
              )
            })}

            {/* Master channel */}
            <div
              className="flex flex-[1.3] flex-col items-center gap-1.5 rounded-r-md bg-[#27272a]/60 pt-1"
              style={{ borderTop: "2px solid #71717a" }}
            >
              {/* Label */}
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#a1a1aa]">
                Master
              </span>

              {/* No M/S — spacer */}
              <div className="h-[22px]" />

              {/* Fader + level meters side by side */}
              <div className="flex items-end gap-2">
                <LevelMeter fill={channels.master.volume * 0.9} />
                <VerticalFader
                  value={channels.master.volume}
                  onChange={(v) => updateChannel("master", "volume", v)}
                  thumbColor="#e4e4e7"
                />
              </div>

              {/* dB readout */}
              <span className="font-mono text-[10px] text-[#a1a1aa]">
                {volumeToDb(channels.master.volume)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
