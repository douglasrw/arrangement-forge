import { cn } from "@/lib/utils"

const INSTRUMENT_COLORS = [
  "var(--instrument-drums)",
  "var(--instrument-bass)",
  "var(--instrument-piano)",
  "var(--instrument-guitar)",
  "var(--instrument-strings)",
]

export interface ProjectData {
  id: string
  name: string
  genre: string
  key: string
  tempo: number
  lastEdited: string
  sections: number
  bars: number
  /** 5 values 0-1 representing density per stem */
  stemDensity: number[]
}

interface ProjectCardProps {
  project: ProjectData
  onClick?: () => void
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full flex-col rounded-2xl border border-zinc-700/40 bg-zinc-800/50 p-5 text-left",
        "cursor-pointer transition-all duration-200",
        "hover:border-zinc-600 hover:bg-zinc-800/80"
      )}
    >
      {/* Row 1: name + date */}
      <div className="flex w-full items-start justify-between">
        <span className="text-sm font-semibold text-zinc-100 leading-snug">
          {project.name}
        </span>
        <span className="shrink-0 text-xs text-zinc-500">{project.lastEdited}</span>
      </div>

      {/* Row 2: badges */}
      <div className="mt-2 flex gap-1.5">
        <span className="rounded-md bg-ring/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          {project.genre}
        </span>
        <span className="rounded-md bg-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
          {project.key}
        </span>
        <span className="rounded-md bg-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
          {"♩ "}{project.tempo}
        </span>
      </div>

      {/* Row 3: mini stem barcode */}
      <div className="mt-3 flex flex-col gap-px overflow-hidden rounded-md">
        {project.stemDensity.map((density, i) => (
          <div key={i} className="h-[3px] w-full bg-zinc-900">
            <div
              className="h-full rounded-r-sm transition-all duration-300"
              style={{
                width: `${Math.max(density * 100, 8)}%`,
                backgroundColor: INSTRUMENT_COLORS[i],
                opacity: 0.35 + density * 0.65,
              }}
            />
          </div>
        ))}
      </div>

      {/* Row 4: stats + menu */}
      <div className="mt-3 flex w-full items-center justify-between">
        <span className="text-xs text-zinc-500">
          {project.sections} sections &middot; {project.bars} bars
        </span>
        <span
          className="text-zinc-600 transition-colors group-hover:text-zinc-300"
          aria-label="More options"
        >
          &middot;&middot;&middot;
        </span>
      </div>
    </button>
  )
}
