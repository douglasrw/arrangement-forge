import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface SliderRow {
  label: string
  value: number
  display: string
  min: number
  max: number
}

const INITIAL_SLIDERS: SliderRow[] = [
  { label: "Energy", value: 45, display: "Med", min: 0, max: 100 },
  { label: "Groove", value: 35, display: "Laid", min: 0, max: 100 },
  { label: "Swing %", value: 65, display: "65%", min: 0, max: 100 },
  { label: "Dynamics", value: 30, display: "p", min: 0, max: 100 },
]

function getDisplayValue(label: string, value: number): string {
  if (label === "Swing %") return `${value}%`
  if (label === "Dynamics") {
    if (value <= 20) return "pp"
    if (value <= 40) return "p"
    if (value <= 60) return "mp"
    if (value <= 80) return "f"
    return "ff"
  }
  if (value <= 20) return "Low"
  if (value <= 40) return "Laid"
  if (value <= 60) return "Med"
  if (value <= 80) return "High"
  return "Max"
}

export function StyleControlsSection() {
  const [sliders, setSliders] = useState(INITIAL_SLIDERS)

  function handleSliderChange(index: number, newValue: number) {
    setSliders((prev) =>
      prev.map((s, i) =>
        i === index
          ? { ...s, value: newValue, display: getDisplayValue(s.label, newValue) }
          : s
      )
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Genre + Sub-style dropdowns */}
      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="genre-select" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Genre
          </label>
          <Select defaultValue="jazz">
            <SelectTrigger id="genre-select" className="h-8 w-full border-border bg-secondary text-xs text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jazz">Jazz</SelectItem>
              <SelectItem value="rock">Rock</SelectItem>
              <SelectItem value="pop">Pop</SelectItem>
              <SelectItem value="electronic">Electronic</SelectItem>
              <SelectItem value="classical">Classical</SelectItem>
              <SelectItem value="rnb">R&B</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="substyle-select" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Sub-style
          </label>
          <Select defaultValue="swing">
            <SelectTrigger id="substyle-select" className="h-8 w-full border-border bg-secondary text-xs text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="swing">Swing</SelectItem>
              <SelectItem value="bebop">Bebop</SelectItem>
              <SelectItem value="bossa">Bossa Nova</SelectItem>
              <SelectItem value="fusion">Fusion</SelectItem>
              <SelectItem value="smooth">Smooth</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sliders */}
      <div className="flex flex-col gap-2.5">
        {sliders.map((slider, i) => (
          <div key={slider.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                {slider.label}
              </span>
              <span className="text-[11px] font-semibold text-foreground">
                {slider.display}
              </span>
            </div>
            {/* Custom slider with teal accent fill */}
            <div className="group relative h-1.5 w-full cursor-pointer rounded-full bg-secondary">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${slider.value}%`,
                  background: "#0891b2",
                }}
              />
              <input
                type="range"
                id={`slider-${slider.label}`}
                min={slider.min}
                max={slider.max}
                value={slider.value}
                onChange={(e) => handleSliderChange(i, Number(e.target.value))}
                className={cn(
                  "absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent",
                  "[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3",
                  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
                  "[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#0891b2]",
                  "[&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-sm",
                  "[&::-webkit-slider-thumb]:opacity-0 [&::-webkit-slider-thumb]:transition-opacity",
                  "group-hover:[&::-webkit-slider-thumb]:opacity-100",
                  "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3",
                  "[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full",
                  "[&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-[#0891b2]",
                  "[&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:shadow-sm"
                )}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
