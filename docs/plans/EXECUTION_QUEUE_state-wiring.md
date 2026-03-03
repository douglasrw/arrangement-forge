# Execution Queue — Phase 2: Wire Zustand State into v0 Components

**For coding agents:** Read the protocol below, then find the first unchecked
task, execute it completely, check the box, commit, and move to the next.
Do not skip tasks. Do not work on more than one task at a time.

---

## Agent Protocol

1. Read this file top to bottom.
2. Find the first task where the checkbox is `[ ]` (unchecked).
3. Read that task's full spec — it is self-contained. You do not need to read
   any other plan document.
4. Implement exactly as specified. Do not modify files not listed in the task.
   Do not refactor adjacent code.
5. Run the verify command in the task's **Verify** section. Fix until green.
5b. Run the full build: `npm run build`
    If the build was previously passing and now fails, **stop and report** what
    broke before touching the checkbox.
6. Edit this file: change `[ ]` to `[x]` on that task's line.
7. Commit all changes (code + this file) with message: `Phase2-T{n}: {title}`
8. Return to step 2.

If a task says **BLOCKED**, skip it and move to the next unblocked one.
If all remaining tasks are **BLOCKED** or done, stop and report.

---

## Context

**What just happened (Phase 1):**
All visual components were replaced with v0/shadcn versions. The app now uses
a zinc-based dark theme with shadcn CSS variables. Build passes. Components
render with hardcoded demo data and component-local useState.

**What Phase 2 does:**
Replace hardcoded demo data and component-local state with reads/writes to
the existing Zustand stores. Components should behave identically visually
but now reflect real project state.

**Existing stores (do not modify their interfaces):**

| Store | File | Key state |
|---|---|---|
| projectStore | `src/store/project-store.ts` | project, sections, blocks, stems, chords, updateProject, markDirty |
| selectionStore | `src/store/selection-store.ts` | level, sectionId, blockId, selectSong, selectSection, selectBlock |
| uiStore | `src/store/ui-store.ts` | generationState, unsavedChanges, chordDisplayMode |
| audioStore (via useAudio hook) | `src/hooks/useAudio.ts` | transportState.playbackState, currentBar, currentBeat, play, pause, stop |

**Existing hooks (do not modify):**

- `src/hooks/useGenerate.ts` — exports `useGenerate()` → `{ runGeneration }`
- `src/hooks/useProject.ts` — exports `useProject()` → `{ saveProject, loadProject }`
- `src/hooks/useAudio.ts` — exports `useAudio()` → `{ transportState, play, pause, stop, seek }`

**Already implemented (do not re-implement):**

- `src/lib/chords.ts` — `formatChord()`, `degreeToNote()`, `parseChordInput()`
- `src/lib/description-parser.ts` — `parseDescription()`
- `src/lib/genre-config.ts` — `GENRE_SUBSTYLES`, `GENRE_SLIDERS`
- All audio engine logic in `src/audio/`

**Key facts:**

- `project.key` is a string like `"C"`, `"Bb"`, `"F#"`
- `project.chordChartRaw` is the pipe-separated chord chart text
- `project.generationHints` is a free-text style description
- `sections` is an array sorted by `sortOrder`; each has `id`, `name`, `barCount`, `startBar`
- `blocks` is an array; each has `id`, `stemId`, `startBar`, `endBar`, `sectionId`
- `stems` is an array of 5: drums, bass, piano, guitar, strings
- The existing `useShallow` from `zustand/react/shallow` is used for multi-field selects
- Bar width in the arrangement grid: `BAR_W = 40` (px per bar, already in ArrangementView)
- Instrument color map is already defined in `sequencer-block.tsx` — import from there
- `generationState` values: `'idle'` | `'generating'` | `'complete'`

---

## Task Queue

---

### [ ] T1 — Remove dead component files

**Files:** Delete only — no new code.

**Background:**
Phase 1 replaced components but left the old files in place. They are now
unreferenced dead code that adds noise. Remove them.

**What to delete:**

```
src/components/left-panel/SongContext.tsx      (replaced by InputSection + StyleControlsSection)
src/components/left-panel/StyleControls.tsx    (replaced by StyleControlsSection)
src/components/left-panel/AiAssistant.tsx      (replaced by AiAssistantSection)
src/components/arrangement/StemLane.tsx        (replaced by self-contained ArrangementView)
src/components/arrangement/SectionHeaders.tsx  (replaced by self-contained ArrangementView)
src/components/arrangement/BarRuler.tsx        (replaced by self-contained ArrangementView — if exists)
src/components/arrangement/EmptyState.tsx      (replaced by self-contained ArrangementView — if exists)
src/components/arrangement/ArrangementToolbar.tsx (replaced — if exists)
src/components/arrangement/Block.tsx           (replaced by sequencer-block.tsx)
src/components/mixer/ChannelStrip.tsx          (replaced by self-contained MixerDrawer)
src/components/mixer/MasterStrip.tsx           (replaced by self-contained MixerDrawer)
```

Only delete files that exist. Do not delete files that are still imported.
Before deleting each file, grep for its import to confirm it's unreferenced:
`grep -r "from.*[FileName]" src/` — if any results, skip that file.

**Verify:**
```
npm run build
```
Build must still pass.

---

### [ ] T2 — Wire TopBar to projectStore + uiStore

**Files:** `src/components/layout/TopBar.tsx`

**Background:**
TopBar currently uses local useState for project name and save status.
It needs to read/write the real project name and show actual unsaved state.

**What to build:**

Replace local state with store reads. Read the current TopBar.tsx first to
understand its state variables, then make targeted replacements.

**Step 1 — Replace local state:**

```tsx
// Remove these local state declarations:
// const [projectName, setProjectName] = useState("My Jazz Arrangement")
// const [saved, setSaved] = useState(true)
// Remove the setTimeout auto-save simulation

// Add store reads at top of component:
import { useProjectStore } from '@/store/project-store'
import { useUiStore } from '@/store/ui-store'
import { useProject } from '@/hooks/useProject'

const { project, updateProject } = useProjectStore()
const { unsavedChanges } = useUiStore()
const { saveProject } = useProject()
const projectName = project?.name ?? 'Untitled Project'
```

**Step 2 — Replace name commit:**

```tsx
// The commitName function becomes:
function commitName(newName: string) {
  setIsEditing(false)
  const name = newName.trim() || 'Untitled Project'
  updateProject({ name })
}
// Update the input's onChange to track a local draft only (for the input field),
// and on blur/enter call commitName with the draft value.
```

**Step 3 — Replace save dot:**

```tsx
// Replace: saved ? "bg-[#4ade80]" : "bg-[#fbbf24]"
// With: !unsavedChanges ? "bg-[#4ade80]" : "bg-[#fbbf24]"

// Replace tooltip text:
// "All changes saved" when !unsavedChanges
// "Unsaved changes" when unsavedChanges
```

**Step 4 — Wire metadata chips to real project data:**

```tsx
// Replace the hardcoded META_CHIPS constant with a computed value:
const key = project?.key ?? 'C'
const tempo = project?.tempo ?? 120
const genre = project?.genre ?? 'Jazz'
const timeSig = project?.timeSignature ?? '4/4'
const metaChips = [`Key of ${key}`, `♩ ${tempo} bpm`, genre, timeSig]
```

**Verify:**
```
npm run build
```

---

### [ ] T3 — Wire TransportBar to useAudio + projectStore

**Files:** `src/components/transport/TransportBar.tsx`

**Background:**
TransportBar has a simulated interval-based playback counter. It needs to
drive the real audio engine and reflect actual playback position.

**What to build:**

**Step 1 — Replace simulated state with audio hook:**

```tsx
// Remove: useState for isPlaying, bar, beat, elapsed, intervalRef
// Remove: the useEffect interval simulation
// Remove: handleStop and handlePlayPause local implementations

import { useAudio } from '@/hooks/useAudio'
import { useProjectStore } from '@/store/project-store'

const { transportState, play, pause, stop } = useAudio()
const { project } = useProjectStore()

const isPlaying = transportState.playbackState === 'playing'
const bar = transportState.currentBar
const beat = transportState.currentBeat
// Compute elapsed from bar/beat and tempo:
const bpm = project?.tempo ?? 120
const elapsed = ((bar - 1) * 4 + (beat - 1)) * (60 / bpm)
```

**Step 2 — Replace control handlers:**

```tsx
function handleStop() { stop() }
function handlePlayPause() {
  if (isPlaying) pause()
  else play()
}
```

**Step 3 — Wire BPM to project:**

```tsx
// Replace local bpm useState with:
const { updateProject } = useProjectStore()
const bpm = project?.tempo ?? 120

// In commitBpm:
function commitBpm() {
  const val = Math.min(280, Math.max(40, parseInt(bpmDraft) || 120))
  setBpmDraft(String(val))
  setEditingBpm(false)
  updateProject({ tempo: val })
}
// Keep local bpmDraft useState for the editing input draft only
```

**Step 4 — Wire time signature display:**

```tsx
// Replace hardcoded "4/4":
const timeSig = project?.timeSignature ?? '4/4'
// Use {timeSig} in JSX instead of "4/4"
```

**Verify:**
```
npm run build
```

---

### [ ] T4 — Wire ArrangementView to projectStore + selectionStore + uiStore

**Files:** `src/components/arrangement/ArrangementView.tsx`

**Background:**
ArrangementView renders from hardcoded SECTIONS, BLOCK_DATA, CHORDS constants.
It needs to render real data from stores. This is the largest wiring task.

**What to build:**

**Step 1 — Replace hardcoded constants with store reads:**

```tsx
import { useProjectStore } from '@/store/project-store'
import { useSelectionStore } from '@/store/selection-store'
import { useUiStore } from '@/store/ui-store'
import { useShallow } from 'zustand/react/shallow'

// Inside component:
const { sections, blocks, stems, chords } = useProjectStore(
  useShallow(s => ({ sections: s.sections, blocks: s.blocks, stems: s.stems, chords: s.chords }))
)
const { generationState } = useUiStore()
const { sectionId: selectedSectionId, blockId: selectedBlockId, selectSection, selectBlock, selectSong } = useSelectionStore()
```

**Step 2 — Replace generationState check:**

```tsx
// Replace: if (generationState !== "complete")
// With: if (generationState !== 'complete')
// (same logic, just confirming string matches store value)
```

**Step 3 — Replace SECTIONS with real sections:**

The sections from the store have: `id`, `name`, `barCount`, `startBar`, `sortOrder`.
The grid places each section starting at `startBar - 1` bars from left.

```tsx
// Replace SECTIONS.map(...) in section headers row with:
const sortedSections = [...sections].sort((a, b) => a.sortOrder - b.sortOrder)
// Each section width: section.barCount * BAR_W
// Each section isActive: section.id === selectedSectionId
// On click: call onSectionSelect?.({ sectionName: s.name, sectionBars: s.barCount })
//           AND selectSection(s.id)
// On deselect click: call onSectionSelect?.(null) AND selectSong()
```

**Step 4 — Compute total bars from real sections:**

```tsx
// Replace: const TOTAL_BARS = 40
const totalBars = sortedSections.reduce((sum, s) => sum + s.barCount, 0)
const GRID_W = totalBars * BAR_W
// Update all references to TOTAL_BARS → totalBars
```

**Step 5 — Replace INSTRUMENTS with stems from store:**

Stems from store have: `id`, `instrument` (one of: drums|bass|piano|guitar|strings).
The instrument color map is in `sequencer-block.tsx`:

```tsx
import { INSTRUMENT_COLORS } from '@/components/sequencer-block'
// (Export INSTRUMENT_COLORS from sequencer-block.tsx if not already exported —
//  it's the object mapping instrument name to hex color)

// Replace INSTRUMENTS array with:
const INSTRUMENT_CONFIG = stems.map(stem => ({
  id: stem.id,
  instrument: stem.instrument,
  color: INSTRUMENT_COLORS[stem.instrument] ?? '#a1a1aa',
  label: stem.instrument.toUpperCase(),
}))
```

**Step 6 — Replace BLOCK_DATA with real blocks:**

```tsx
// Replace the per-instrument block rendering with:
// For each stem lane, filter blocks by stemId:
const laneBlocks = blocks.filter(b => b.stemId === stem.id)
// Each block position:
// left = (block.startBar - 1) * BAR_W
// width = (block.endBar - block.startBar + 1) * BAR_W
// blockId = block.id (use block.id as the unique key)
// isSelected = block.id === selectedBlockId
// On click: call onBlockSelect?.({...}) AND selectBlock(block.id)
// On deselect: call onBlockSelect?.(null) AND selectSong()
```

For the SequencerBlock styleName prop, use `block.styleOverride ?? 'Default'`.

**Step 7 — Replace CHORDS with real chord data:**

```tsx
import { formatChord } from '@/lib/chords'
import { useUiStore } from '@/store/ui-store'

const { chordDisplayMode } = useUiStore()
const key = project?.key ?? 'C'

// Replace CHORDS array:
// Render chords from the chords array (ChordEntry[]):
// Each chord has: bar (1-indexed), degree, quality
// Display text: formatChord(chord, key, chordDisplayMode)
// Position: left = (chord.bar - 1) * BAR_W
```

**Step 8 — Remove PLAYHEAD_BAR constant:**

The playhead position is already handled in the existing `Playhead` component
inside the file (from Phase 1 or earlier). If a separate PLAYHEAD_BAR constant
remains, remove it.

**Verify:**
```
npm run build
```

Note: If sections/blocks are empty (pre-generation), the grid should show the
empty state (generationState !== 'complete'). This is already handled by the
generationState check from Step 2.

---

### [ ] T5 — Wire InputSection to projectStore + useGenerate

**Files:** `src/components/left-panel/InputSection.tsx`

**Background:**
InputSection has a hardcoded textarea placeholder but no two-way binding to
project state. It needs to read/write `chordChartRaw` and `generationHints`,
and wire the Generate button to `runGeneration`.

**What to build:**

**Step 1 — Read file first.** Understand the current structure. Find where
the chord chart textarea and description textarea are rendered.

**Step 2 — Wire chord chart textarea:**

```tsx
import { useProjectStore } from '@/store/project-store'

const { project, updateProject } = useProjectStore()
const chordChartRaw = project?.chordChartRaw ?? ''
const generationHints = project?.generationHints ?? ''

// In the chord chart textarea:
// value={chordChartRaw}
// onChange={(e) => updateProject({ chordChartRaw: e.target.value })}
```

**Step 3 — Wire Generate button:**

```tsx
import { useGenerate } from '@/hooks/useGenerate'
import { useUiStore } from '@/store/ui-store'

const { runGeneration } = useGenerate()
const { generationState } = useUiStore()
const isGenerating = generationState === 'generating'

// Wire Generate button:
// onClick={() => runGeneration(false)}
// disabled={isGenerating || !chordChartRaw.trim()}
// Show "Generating..." text when isGenerating
```

**Step 4 — Wire generationHints textarea if present:**

```tsx
// value={generationHints}
// onChange={(e) => updateProject({ generationHints: e.target.value })}
```

**Verify:**
```
npm run build
```

---

### [ ] T6 — Wire StyleControlsSection to projectStore

**Files:** `src/components/left-panel/StyleControlsSection.tsx`

**Background:**
StyleControlsSection uses local useState for all slider values and genre
dropdowns. It needs to read from and write to project store fields.

**What to build:**

**Step 1 — Replace local slider state with project reads:**

```tsx
import { useProjectStore } from '@/store/project-store'
import { GENRE_SUBSTYLES, GENRE_SLIDERS } from '@/lib/genre-config'

const { project, updateProject } = useProjectStore()
const genre = project?.genre ?? 'Jazz'
const subStyle = project?.subStyle ?? ''
const energy = project?.energy ?? 50
const groove = project?.groove ?? 50
const swingPct = project?.swingPct ?? 0
const dynamics = project?.dynamics ?? 50
```

**Step 2 — Wire genre Select:**

```tsx
// Replace static genre list with GENRE_SUBSTYLES keys
// <Select value={genre} onValueChange={(v) => updateProject({ genre: v })}>
//   {Object.keys(GENRE_SUBSTYLES).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
// </Select>
```

**Step 3 — Wire subStyle Select:**

```tsx
// Sub-style options come from GENRE_SUBSTYLES[genre] ?? []
// <Select value={subStyle} onValueChange={(v) => updateProject({ subStyle: v })}>
//   {(GENRE_SUBSTYLES[genre] ?? []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
// </Select>
```

**Step 4 — Wire sliders:**

Each slider maps to a project field. Replace local slider onChange with:
```tsx
// Energy slider: onChange={(e) => updateProject({ energy: Number(e.target.value) })}
// Groove slider: onChange={(e) => updateProject({ groove: Number(e.target.value) })}
// Swing % slider: onChange={(e) => updateProject({ swingPct: Number(e.target.value) })}
// Dynamics slider: onChange={(e) => updateProject({ dynamics: Number(e.target.value) })}
// Remove the local sliders useState entirely
```

The display label computation (`getDisplayValue`) can stay — just call it with
the store values instead of local state values.

**Verify:**
```
npm run build
```

---

### [ ] T7 — Wire SectionContext to projectStore + selectionStore

**Files:** `src/components/left-panel/SectionContext.tsx`

**Background:**
SectionContext receives `sectionName` and `sectionBars` as props from LeftPanel.
It uses local state for edits. It needs to actually persist changes to the store.

**What to build:**

**Step 1 — The component already receives the right props from LeftPanel**
(sectionName, sectionBars, onClose). Keep the props interface.

**Step 2 — Wire name save to store:**

```tsx
import { useProjectStore } from '@/store/project-store'
import { useSelectionStore } from '@/store/selection-store'

const { sections, updateSection } = useProjectStore()
// (check if updateSection exists; if not, use the store's update pattern)
const { sectionId } = useSelectionStore()
```

When the user commits a name change (blur/enter on the name input):
```tsx
// Find section by sectionId and update its name
const section = sections.find(s => s.id === sectionId)
if (section) updateSection(section.id, { name: newName })
```

**Step 3 — Wire bar count +/- to store:**

```tsx
// On increment/decrement:
if (section) updateSection(section.id, { barCount: newBarCount })
```

**Step 4 — Keep local state for the isOverriding toggle** (cosmetic only for MVP).
Style override fields remain local-state-only for MVP per CLAUDE.md.

**Verify:**
```
npm run build
```

If `updateSection` doesn't exist on projectStore, check the store file for the
actual update method name (may be `updateSectionField` or similar) and use that.

---

### [ ] T8 — Wire BlockContext to projectStore + selectionStore

**Files:** `src/components/left-panel/BlockContext.tsx`

**Background:**
BlockContext receives instrument, styleName, startBar, endBar as props.
Volume/pan overrides are local-state-only in the MVP (cosmetic). The only
real persistence needed is the inline chord override toggle.

**What to build:**

**Step 1 — Keep props interface as-is.** The block data comes from LeftPanel
via AppShell's PanelContext, which is already wired.

**Step 2 — Volume/pan sliders:** Keep as local state for MVP. They're cosmetic.

**Step 3 — Inline chord override:**

When the chord override toggle is ON and the user types in the chord textarea,
that data should be stored. Check if `Block` type has a `chordOverride` field.
If yes, wire it:

```tsx
import { useProjectStore } from '@/store/project-store'
import { useSelectionStore } from '@/store/selection-store'

const { blocks, updateBlock } = useProjectStore()
const { blockId } = useSelectionStore()
const block = blocks.find(b => b.id === blockId)

// When chord override textarea changes:
// updateBlock(blockId, { chordOverride: newValue })
```

If `Block` type doesn't have a `chordOverride` field or `updateBlock` doesn't
exist, leave the chord override as local state only (add a `// TODO: wire` comment).

**Verify:**
```
npm run build
```

---

### [ ] T9 — Export INSTRUMENT_COLORS from sequencer-block.tsx

**Files:** `src/components/sequencer-block.tsx`

**Background:**
Task T4 needs to import INSTRUMENT_COLORS from sequencer-block.tsx. This task
ensures it's exported. Read the file first to see if it's already exported.

**What to build:**

Find the instrument color definitions in `src/components/sequencer-block.tsx`.
They are likely an object like:
```tsx
const INSTRUMENT_COLORS: Record<string, string> = {
  drums: "#06b6d4",
  bass: "#34d399",
  piano: "#fbbf24",
  guitar: "#a78bfa",
  strings: "#14b8a6",
}
```

If it's not already exported, change `const` to `export const`.

If it's defined differently (inline or per-component), extract it into a
named export.

**Verify:**
```
npm run build
```

---

## Completion Check

When all boxes are checked, run:
```
npm run build
```

All builds must pass. Then take a screenshot to verify the app renders correctly:
```bash
ssh macbook 'ls -t ~/Desktop/Screenshot*.png | head -1 | xargs -I{} cp {} /tmp/ss.png' && scp macbook:/tmp/ss.png /tmp/screenshot.png
```

## Intent Trace

**Original intent:** Musicians can input a chord chart, configure style, and see
a rendered arrangement grid that reflects real project data — not demo data.

### Structural (code wiring)

- [ ] Chord chart input → `project.chordChartRaw` → `InputSection.tsx`
- [ ] Style controls → `project.{genre,energy,groove,swingPct,dynamics}` → `StyleControlsSection.tsx`
- [ ] Arrangement grid sections → `projectStore.sections` → `ArrangementView.tsx`
- [ ] Arrangement grid blocks → `projectStore.blocks` → `ArrangementView.tsx`
- [ ] Transport controls → `useAudio().play/pause/stop` → `TransportBar.tsx`
- [ ] Project name → `project.name` → `TopBar.tsx`

### Behavioral (end-to-end demo)

**Demo scenario:** User loads a project with 2 sections and 8 blocks.
- Step: App loads
- Expect: ArrangementView shows real section names and block positions
- Step: User clicks Play
- Expect: TransportBar shows playback position ticking forward
- Step: User types a chord in InputSection
- Expect: chordChartRaw updates in project store

### Durable (survives compaction)

- [ ] Component state — source: Zustand stores (in-memory, persisted via Supabase on saveProject)
- [ ] Project data — source: Supabase DB via `useProject().loadProject()`
