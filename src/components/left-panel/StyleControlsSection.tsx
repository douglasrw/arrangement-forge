import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useProjectStore } from "@/store/project-store"
import { GENRE_SUBSTYLES } from "@/lib/genre-config"

function getDisplayValue(label: string, value: number): string {
  if (label === "Swing %") return `${value}%`
  if (label === "Dynamics") {
    if (value <= 20) return "pp"
    if (value <= 40) return "p"
    if (value <= 60) return "mp"
    if (value <= 80) return "f"
    return "ff"
  }
  if (label === "Groove") {
    if (value <= 20) return "Simple"
    if (value <= 40) return "Basic"
    if (value <= 60) return "Standard"
    if (value <= 80) return "Busy"
    return "Complex"
  }
  if (label === "Feel") {
    if (value <= 20) return "Tight"
    if (value <= 40) return "Steady"
    if (value <= 60) return "Natural"
    if (value <= 80) return "Loose"
    return "Sloppy"
  }
  // Energy (default)
  if (value <= 20) return "Low"
  if (value <= 40) return "Laid"
  if (value <= 60) return "Med"
  if (value <= 80) return "High"
  return "Max"
}

export function StyleControlsSection() {
  const { project, updateProject } = useProjectStore()

  const genre = project?.genre ?? "Jazz"
  const subStyle = project?.subStyle ?? ""
  const energy = project?.energy ?? 50
  const groove = project?.groove ?? 50
  const feel = project?.feel ?? 50
  const swingPct = project?.swingPct ?? 0
  const dynamics = project?.dynamics ?? 50

  const subStyleOptions = GENRE_SUBSTYLES[genre] ?? []

  const sliders = [
    { label: "Energy", value: energy, field: "energy", min: 0, max: 100 },
    { label: "Groove", value: groove, field: "groove", min: 0, max: 100 },
    { label: "Feel", value: feel, field: "feel", min: 0, max: 100 },
    { label: "Swing %", value: swingPct, field: "swingPct", min: 0, max: 100 },
    { label: "Dynamics", value: dynamics, field: "dynamics", min: 0, max: 100 },
  ]

  function handleSliderChange(field: string, newValue: number) {
    updateProject({ [field]: newValue })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Genre + Sub-style dropdowns */}
      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="genre-select" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Genre
          </label>
          <Select
            value={genre}
            onValueChange={(v) => updateProject({ genre: v, subStyle: (GENRE_SUBSTYLES[v] ?? [])[0] ?? "" })}
          >
            <SelectTrigger id="genre-select" className="h-8 w-full border-border bg-secondary text-xs text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(GENRE_SUBSTYLES).map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="substyle-select" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Sub-style
          </label>
          <Select
            value={subStyle}
            onValueChange={(v) => updateProject({ subStyle: v })}
          >
            <SelectTrigger id="substyle-select" className="h-8 w-full border-border bg-secondary text-xs text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {subStyleOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sliders */}
      <div className="flex flex-col gap-2.5">
        {sliders.map((slider) => (
          <div key={slider.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                {slider.label}
              </span>
              <span className="text-[11px] font-semibold text-foreground">
                {getDisplayValue(slider.label, slider.value)}
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
                onChange={(e) => handleSliderChange(slider.field, Number(e.target.value))}
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
