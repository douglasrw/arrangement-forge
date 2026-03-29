// @vitest-environment jsdom

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { Block, Project, Section, Stem } from "@/types"
import { useProjectStore } from "@/store/project-store"
import { useSelectionStore } from "@/store/selection-store"
import { ChordPalette } from "./ChordPalette"

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}

function makeProject(partial: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    userId: "user-1",
    name: "Palette Truth Demo",
    key: "C",
    tempo: 120,
    timeSignature: "4/4",
    genre: "Jazz",
    subStyle: "Swing",
    energy: 50,
    groove: 50,
    feel: 50,
    swingPct: null,
    dynamics: 50,
    generationHints: "",
    chordChartRaw: "Cmaj7 | Dm7 | G7 | Cmaj7",
    hasArrangement: true,
    generatedAt: "2026-03-29T00:00:00Z",
    generatedTempo: 120,
    createdAt: "2026-03-29T00:00:00Z",
    updatedAt: "2026-03-29T00:00:00Z",
    ...partial,
  }
}

function makeSection(partial: Partial<Section> = {}): Section {
  return {
    id: "section-1",
    projectId: "project-1",
    name: "Verse",
    sortOrder: 0,
    barCount: 8,
    startBar: 1,
    energyOverride: null,
    grooveOverride: null,
    feelOverride: null,
    swingPctOverride: null,
    dynamicsOverride: null,
    createdAt: "2026-03-29T00:00:00Z",
    ...partial,
  }
}

function makeStem(partial: Partial<Stem> = {}): Stem {
  return {
    id: "stem-1",
    projectId: "project-1",
    instrument: "piano",
    sortOrder: 0,
    volume: 0.8,
    pan: 0,
    isMuted: false,
    isSolo: false,
    createdAt: "2026-03-29T00:00:00Z",
    ...partial,
  }
}

function makeBlock(partial: Partial<Block> = {}): Block {
  return {
    id: "block-1",
    stemId: "stem-1",
    sectionId: "section-1",
    startBar: 3,
    endBar: 6,
    chordDegree: "I",
    chordQuality: "maj7",
    chordBassDegree: null,
    style: "jazz_comp",
    energyOverride: null,
    dynamicsOverride: null,
    midiData: [],
    createdAt: "2026-03-29T00:00:00Z",
    ...partial,
  }
}

function renderChordPalette({
  initialChords = ["Cmaj7", "Dm7", "G7", "Cmaj7"],
}: {
  initialChords?: string[]
} = {}) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(
      <ChordPalette
        initialChords={initialChords}
        projectKey="C"
        timeSignature="4/4"
      />
    )
  })

  return { container, root }
}

let mountedRoot: Root | null = null
let mountedContainer: HTMLDivElement | null = null

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true

  useProjectStore.setState({
    project: makeProject(),
    stems: [makeStem()],
    sections: [makeSection()],
    blocks: [makeBlock()],
    chords: [],
    chatMessages: [],
    drumOnlyUpdate: false,
    allInstrumentsUpdate: false,
  })

  useSelectionStore.setState({
    level: "song",
    sectionId: null,
    blockId: null,
    stemId: null,
  })
})

afterEach(() => {
  if (mountedRoot && mountedContainer) {
    act(() => {
      mountedRoot?.unmount()
    })
    mountedContainer.remove()
  }

  mountedRoot = null
  mountedContainer = null
  useSelectionStore.getState().clearSelection()
})

describe("ChordPalette selection truth", () => {
  it("shows ready song-level truth when the whole chart is in scope", () => {
    const mounted = renderChordPalette()
    mountedRoot = mounted.root
    mountedContainer = mounted.container

    expect(mounted.container.textContent).toContain("Song chart")
    expect(mounted.container.textContent).toContain(
      "You are editing the song chord chart the arrangement inherits today."
    )
    expect(mounted.container.textContent).toContain("Whole song")
    expect(mounted.container.textContent).toContain(
      "This palette is ready to add, remove, or replace chords for the full project."
    )
  })

  it("distinguishes an empty song chart from a normal ready state", () => {
    useProjectStore.setState({
      project: makeProject({ chordChartRaw: "" }),
    })

    const mounted = renderChordPalette({ initialChords: [] })
    mountedRoot = mounted.root
    mountedContainer = mounted.container

    expect(mounted.container.textContent).toContain("Empty chart")
    expect(mounted.container.textContent).toContain(
      "No song chord chart is loaded yet."
    )
    expect(mounted.container.textContent).toContain("Whole song")
    expect(mounted.container.textContent).toContain(
      "Add chords below to create the progression truth the arrangement will follow."
    )
  })

  it("shows unavailable block-scoped truth instead of implying a local override exists", () => {
    useSelectionStore.setState({
      level: "block",
      sectionId: null,
      blockId: "block-1",
      stemId: "stem-1",
    })

    const mounted = renderChordPalette({ initialChords: ["Cmaj7", "G7"] })
    mountedRoot = mounted.root
    mountedContainer = mounted.container

    expect(mounted.container.textContent).toContain("Block selected")
    expect(mounted.container.textContent).toContain(
      "The arrangement is currently focused on Bars 3-6, but block chord overrides are unavailable here today."
    )
    expect(mounted.container.textContent).toContain("Piano block")
    expect(mounted.container.textContent).toContain(
      "Changes below still update the song chord chart for the full project."
    )
  })
})
