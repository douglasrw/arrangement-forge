import { useState } from "react"
import { cn } from "@/lib/utils"
import { ChordPalette } from "./ChordPalette"

const INPUT_TABS = ["Text", "Upload", "Image"] as const
type InputTab = (typeof INPUT_TABS)[number]

export function InputSection() {
  const [activeTab, setActiveTab] = useState<InputTab>("Text")

  return (
    <div className="flex flex-col gap-3">
      {/* Tab switcher row */}
      <div className="flex gap-1 rounded-md bg-secondary p-0.5">
        {INPUT_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 rounded-[5px] px-2 py-1.5 text-xs font-medium transition-colors",
              activeTab === tab
                ? "bg-[#0891b2] text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Chord Palette */}
      <ChordPalette />

      {/* Description field */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="description-input" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Description
        </label>
        <textarea
          id="description-input"
          defaultValue="Jazz waltz, medium tempo, brushes on snare, walking bass with occasional fills."
          rows={2}
          className={cn(
            "w-full resize-none rounded-md border border-border bg-secondary px-3 py-2",
            "text-xs leading-relaxed text-foreground",
            "placeholder:text-muted-foreground",
            "focus:border-[#0891b2] focus:outline-none focus:ring-1 focus:ring-[#0891b2]/50"
          )}
        />
      </div>
    </div>
  )
}
