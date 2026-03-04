# Execution Queue — Groove Complexity + Feel Rename + Reactive Sliders

> Execution queue — 5 tasks, estimated ~2 hours total

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
5. Run both checks in the task's **Verify** section:
   - **Compilation:** must pass before proceeding
   - **Behavioral:** must be manually confirmed or tested; do not skip
5b. Run the full test suite: `npx vitest run`
    If tests you did not introduce are now failing, **stop and report** which
    tests broke and why before touching the checkbox.
6. Edit this file: change `[ ]` to `[x]` on that task's line.
7. Commit all changes (code + this file) together with message: `T{n}: {title}`
8. Return to step 2.

9. When no unchecked tasks remain, perform the **Completion Check** and
   **Intent Trace** sections.

If a task says **BLOCKED**, skip it and move to the next unblocked one.
If all remaining tasks are **BLOCKED** or done, stop and report.

---

## Context

**Already implemented (do not re-implement):**

- **Style sliders** — Energy, Groove, Swing %, Dynamics in `StyleControlsSection.tsx`. All call `updateProject()` which sets the value in the Zustand store + `markDirty()`.
- **Style cascade** — `style-cascade.ts` resolves project → section → block inheritance. Groove/swingPct are section-level only (no block override).
- **Drum pattern generation** — `drum-patterns.ts` has `applyEnergy()` (note removal + velocity), `applyGroove()` (micro-timing humanization), `applyDynamics()` (velocity range), `applySwing()` (shuffle), `buildDrumMidi()` (composites all transforms).
- **Audio engine** — `engine.ts` `loadArrangement()` cancels all Tone.js events then reschedules from block `midiData`. The `useAudio` hook watches `[blocks, stems, sections, project]` and reloads the engine when any change.
- **Generation** — `useGenerate.ts` builds a `GenerationRequest` from project params, calls `generate()` which creates sections/stems/blocks/chords with midiData, then `setArrangement()` updates stores.
- **DB mapping** — `useProject.ts` uses automatic `snakeToCamel`/`camelToSnake` transforms. Adding a `feel` field to TS types auto-maps to a `feel` column in Supabase.

**Key facts:**

- `groove` currently means **humanization** (timing looseness, 0-100). It will be **repurposed** to mean **complexity** (pattern busyness, 0-100).
- A new field `feel` will hold the old humanization concept.
- `applyEnergy()` currently mixes two concerns: note removal (density) AND velocity scaling (intensity). The density logic must move to the new `applyGroove()` complexity function, and `applyEnergy()` becomes intensity-only (velocity scaling).
- Sliders currently don't affect playback — MIDI is only generated on explicit "Generate" click. T5 bridges this gap.
- DB `groove` column exists with data. A SQL migration adds `feel` column, copies `groove` → `feel`, and resets `groove` to 50.
- The Supabase SQL must be pasted manually into the SQL Editor (no CLI).

---

## Delegation Strategy

**File overlap map:**

| Source file | Edited by tasks |
|---|---|
| `src/types/project.ts` | T1 |
| `src/store/project-store.ts` | T1 |
| `src/lib/style-cascade.ts` | T1 |
| `src/lib/genre-config.ts` | T1 |
| `src/hooks/useProject.ts` | T1 |
| `src/hooks/useGenerate.ts` | T2, T5 |
| `src/lib/midi-generator.ts` | T2 |
| `src/lib/drum-patterns.ts` | T2, T3 |
| `src/components/left-panel/StyleControlsSection.tsx` | T4 |
| `src/components/left-panel/SectionContext.tsx` | T4 |
| `src/hooks/useAudio.ts` | T5 |

**Batch assignments:**

| Batch | Tasks | Agent prompt |
|---|---|---|
| 1 | T1-T5 | "Read specs/groove-complexity-feel-rename.md. Execute all tasks." |

Single agent, all 5 tasks sequential. Overlap between T2→T3 (drum-patterns.ts) and T2→T5 (useGenerate.ts) requires sequential execution.

---

## Task Queue

---

### [x] T1 — Add `feel` field to types, store, cascade, and config

**Files:** `src/types/project.ts`, `src/store/project-store.ts`, `src/lib/style-cascade.ts`, `src/lib/genre-config.ts`, `src/hooks/useProject.ts`, `src/lib/style-cascade.test.ts`, `src/store/project-store.test.ts`, `src/lib/genre-config.test.ts`
**Depends on:** none
**Tests:** update existing test files

**Background:**

The `groove` field exists everywhere and currently means "humanization." We are adding a new `feel` field to hold the humanization concept, freeing `groove` to mean "complexity." This task adds the `feel` field to the data layer. The `groove` field stays but its semantic meaning changes in later tasks (no code change here — just adding `feel` alongside it).

**What to build:**

**Step 1 — Read all files first.** Confirm the structures match what the spec describes. Stop if they differ.

**Step 2 — Update types (`src/types/project.ts`).**

Add `feel: number; // 0-100 humanization (timing looseness)` to `Project` interface (after `groove`).
Add `feelOverride: number | null;` to `Section` interface (after `grooveOverride`).
Add `feel: number;` to `GenerationRequest` interface (after `groove`).
Update the comment on `groove` in Project to say `// 0-100 complexity (pattern busyness)`.

**Step 3 — Update style cascade (`src/lib/style-cascade.ts`).**

Add `'feel'` to the `CascadeField` union type.
Add a `feelOverride` handling clause in `resolveStyle()` (same pattern as `grooveOverride` — section-level only, falls through to project).
Update `isInherited()` to treat `feel` the same as `groove` — cannot be overridden at block level.

**Step 4 — Update genre config (`src/lib/genre-config.ts`).**

Add `feel: boolean;` to `GenreSliderConfig` interface.
Add `feel: true` to every genre entry in `GENRE_SLIDERS`.

**Step 5 — Update store defaults (`src/store/project-store.ts`).**

If there's a default project object or any place that initializes `grooveOverride`, add `feelOverride: null` next to it.

**Step 6 — Update DB insert (`src/hooks/useProject.ts`).**

In `createProject()`, add `feel: 50` to the insert object (after `groove: 50`).

**Step 7 — Update tests.**

- `style-cascade.test.ts`: Add `feel` tests mirroring the existing groove cascade tests. Add `feelOverride: null` to the test section fixture.
- `project-store.test.ts`: Add `feel: 50` and `feelOverride: null` to test fixtures.
- `genre-config.test.ts`: Add `feel: true` to the Jazz genre assertion.

**Step 8 — SQL migration (document only, do NOT execute).**

Create a file `sql/add-feel-column.sql` with:
```sql
-- Add feel column (humanization, was previously called groove)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS feel integer NOT NULL DEFAULT 50;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS feel_override integer;

-- Migrate existing data: copy old groove (humanization) values into feel
UPDATE projects SET feel = groove;

-- Reset groove to 50 (it now means complexity; 50 = medium)
UPDATE projects SET groove = 50;
UPDATE sections SET groove_override = NULL;
```

Add a comment at the top: `-- Run manually in Supabase SQL Editor before deploying T1+`

**Verify:**

Compilation:
```
npx vitest run src/lib/style-cascade.test.ts src/store/project-store.test.ts src/lib/genre-config.test.ts && npm run build
```

Behavioral:
```
Grep for "feel" in src/types/project.ts — should appear in Project, Section, and GenerationRequest.
Grep for "feelOverride" in src/lib/style-cascade.ts — should appear in resolveStyle and isInherited.
```

---

### [x] T2 — Wire `feel` through generation pipeline + rename humanization function

**Files:** `src/lib/midi-generator.ts`, `src/lib/drum-patterns.ts`, `src/hooks/useGenerate.ts`, `src/lib/drum-patterns.test.ts`, `src/lib/midi-generator.test.ts`
**Depends on:** T1
**Tests:** update existing test files

**Background:**

The generation pipeline passes `groove` from the project through `DrumContext` → `BuildDrumMidiParams` → `applyGroove()`. All of this currently handles humanization. This task adds `feel` to the pipeline for humanization and renames the humanization function from `applyGroove` to `applyFeel`. The `groove` field in the pipeline will be used for complexity in T3.

**What to build:**

**Step 1 — Read all files first.**

**Step 2 — Update `src/lib/drum-patterns.ts`.**

a. Rename the export function `applyGroove` → `applyFeel`. Same logic, same signature, just renamed. Update the JSDoc comment: `"Add deterministic micro-timing offsets for humanization. feel=0: perfectly quantized, feel=50: subtle (~8ms), feel=100: loose (~20ms)"`.

b. In `BuildDrumMidiParams` interface (~line 899): add `feel: number;`. Keep `groove: number;` (will be used for complexity in T3).

c. In `buildDrumMidi()` (~line 968): change `hits = applyGroove(hits, params.groove, params.barNumberGlobal)` to `hits = applyFeel(hits, params.feel, params.barNumberGlobal)`.

**Step 3 — Update `src/lib/midi-generator.ts`.**

a. In `DrumContext` interface (~line 20): add `feel: number;`. Keep `groove: number;`.

b. In `generate()`, where `DrumContext` is built (~line 336 and ~line 359): add `feel: request.feel ?? 50` alongside the existing `groove`.

c. In `generateMidiForBlock()`, where `buildDrumMidi` params are built: pass `feel: drumContext.feel` (and `groove: drumContext.groove` stays).

**Step 4 — Update `src/hooks/useGenerate.ts`.**

In the `GenerationRequest` construction (~line 42): add `feel: project.feel ?? 50,` after the `groove:` line.

**Step 5 — Update tests.**

- `drum-patterns.test.ts`: Rename all `applyGroove` references to `applyFeel`. Add `feel: 50` (or `feel: 0` where groove was 0) to all `BuildDrumMidiParams` / `makeParams` test fixtures. The `groove` field stays in fixtures (will be used for complexity).
- `midi-generator.test.ts`: Add `feel: 50` to test request fixtures.

**Verify:**

Compilation:
```
npx vitest run src/lib/drum-patterns.test.ts src/lib/midi-generator.test.ts && npm run build
```

Behavioral:
```
In drum-patterns.test.ts, the applyFeel tests should pass identically to how applyGroove tests passed before (same logic, just renamed).
Grep src/lib/drum-patterns.ts for "applyGroove" — should return 0 hits.
Grep src/lib/drum-patterns.ts for "applyFeel" — should return the function definition + usage in buildDrumMidi.
```

---

### [x] T3 — Implement groove complexity algorithm + refactor energy to intensity-only

**Files:** `src/lib/drum-patterns.ts`, `src/lib/drum-patterns.test.ts`
**Depends on:** T2
**Tests:** `src/lib/drum-patterns.test.ts` (new tests + update existing)

**Background:**

`applyEnergy()` currently mixes two concerns: note removal (density) and velocity scaling (intensity). This task separates them: a new `applyGroove()` handles density (note addition/removal based on complexity), and `applyEnergy()` becomes intensity-only (velocity scaling). This is the core algorithmic work of the spec.

**What to build:**

**Step 1 — Read `src/lib/drum-patterns.ts` fully.** Understand the current `applyEnergy()` function (lines 780-825) and the `buildDrumMidi()` pipeline order (lines 957-968).

**Step 2 — Refactor `applyEnergy()` to intensity-only.**

Replace the current implementation with pure velocity scaling:
```typescript
export function applyEnergy(pattern: DrumHit[], energy: number): DrumHit[] {
  // Pure intensity: how hard the drummer hits
  // Low: softer (85% velocity), Mid: no change, High: louder (110% velocity)
  if (energy <= 33) {
    return pattern.map((h) => ({
      ...h,
      velocity: Math.round(h.velocity * 0.85),
    }));
  }
  if (energy >= 67) {
    return pattern.map((h) => ({
      ...h,
      velocity: Math.min(110, Math.round(h.velocity * 1.1)),
    }));
  }
  return pattern.map((h) => ({ ...h }));
}
```

No note filtering, no syncopated kick addition — that moves to `applyGroove`.

**Step 3 — Implement new `applyGroove()` for complexity.**

Add a new exported function (place it between `applyEnergy` and `applyFeel`):

```typescript
/** Adjust pattern density based on groove (complexity).
 * groove 0-30: simple backbone (kick-snare-hat only, no ghost notes, no 16ths)
 * groove 31-69: standard — pattern as written
 * groove 70-100: busy — add ghost notes, syncopated kick, 16th hats */
export function applyGroove(hits: DrumHit[], groove: number): DrumHit[] {
  if (groove <= 30) {
    // Strip to backbone: remove embellishments
    return hits.filter((h) => {
      // Remove 16th-note hi-hats (F#2 at 0.25 intervals not on 0.5)
      if (h.note === 'F#2') {
        const frac = h.time % 0.5;
        if (Math.abs(frac - 0.25) < 0.01) return false;
      }
      // Remove ghost notes (soft snare)
      if (h.note === 'D2' && h.velocity < 40) return false;
      // Remove open hi-hats
      if (h.note === 'A#2') return false;
      // Remove ride bell (A#3) — keep ride bow only
      if (h.note === 'A#3') return false;
      return true;
    });
  }

  if (groove >= 70) {
    // Busy: add embellishments
    const busy = hits.map((h) => ({ ...h }));

    // Add ghost snare on the "and" of beat 2 (time 1.5) if not present
    const hasGhost = busy.some(
      (h) => h.note === 'D2' && h.velocity < 40 && Math.abs(h.time - 1.5) < 0.1
    );
    if (!hasGhost) {
      busy.push({ note: 'D2', time: 1.5, duration: 0.125, velocity: 30 });
    }

    // Add syncopated kick on "and" of beat 3 (time 2.5) if not present
    const hasKickAndOf3 = busy.some(
      (h) => h.note === 'C2' && Math.abs(h.time - 2.5) < 0.1
    );
    if (!hasKickAndOf3) {
      busy.push({ note: 'C2', time: 2.5, duration: 0.25, velocity: 75 });
    }

    // At very high groove (85+), add 16th hi-hat fills in empty spots
    if (groove >= 85) {
      for (let beat = 0; beat < 4; beat++) {
        const sixteenthTime = beat + 0.25;
        const has16th = busy.some(
          (h) => h.note === 'F#2' && Math.abs(h.time - sixteenthTime) < 0.05
        );
        if (!has16th) {
          busy.push({ note: 'F#2', time: sixteenthTime, duration: 0.125, velocity: 40 });
        }
      }
    }

    return busy;
  }

  // Mid groove: pattern as written
  return hits.map((h) => ({ ...h }));
}
```

**Step 4 — Update `buildDrumMidi()` pipeline order.**

The transform pipeline (~lines 957-968) must become:

```typescript
  // Apply complexity (note density)
  hits = applyGroove(hits, params.groove);

  // Apply expression transforms
  hits = applyEnergy(hits, params.energy);
  hits = applyDynamics(hits, params.dynamics);

  // Apply swing to note times
  hits = hits.map((h) => ({
    ...h,
    time: applySwing(h.time, swingAmount, params.beatsPerBar),
  }));

  // Apply feel (humanization micro-timing)
  hits = applyFeel(hits, params.feel, params.barNumberGlobal);
```

Order rationale: density changes first (add/remove notes), then velocity transforms (energy, dynamics), then timing transforms (swing, feel). This prevents timing transforms from being applied to notes that get removed, or missing notes that get added.

**Step 5 — Update tests (`src/lib/drum-patterns.test.ts`).**

a. Update `applyEnergy` tests: remove expectations about note filtering. Low energy should return the SAME number of notes with reduced velocity. High energy should return the SAME number of notes with boosted velocity. No syncopated kick addition.

b. Add new `applyGroove` test section:
- `groove=0` → should strip ghost notes, 16th hats, open hats from a pattern containing them
- `groove=50` → should return same number of notes (mid groove = pattern as-is)
- `groove=100` → should add ghost snare and syncopated kick to a simple pattern
- `groove=85` → should add 16th hi-hat fills

c. Integration: `buildDrumMidi` with `groove=0` should produce fewer notes than `groove=100` for the same pattern.

**Verify:**

Compilation:
```
npx vitest run src/lib/drum-patterns.test.ts && npm run build
```

Behavioral:
```
Run: npx vitest run src/lib/drum-patterns.test.ts --reporter=verbose
All applyGroove tests pass. All applyEnergy tests pass (intensity-only). All buildDrumMidi integration tests pass.
```

---

### [x] T4 — Update UI: Feel and Groove slider labels + display values

**Files:** `src/components/left-panel/StyleControlsSection.tsx`, `src/components/left-panel/SectionContext.tsx`
**Depends on:** T1
**Tests:** none (UI visual)

**Background:**

The UI currently shows a "Groove" slider that controls humanization. This task renames it to "Feel" and ensures the "Groove" slider now drives the complexity parameter. Both sliders need appropriate display value labels.

**What to build:**

**Step 1 — Read both files first.**

**Step 2 — Update `StyleControlsSection.tsx`.**

a. Add `feel` state read: `const feel = project?.feel ?? 50`

b. Update the `sliders` array to 5 entries (order matters — this is the display order):
```typescript
const sliders = [
  { label: "Energy", value: energy, field: "energy", min: 0, max: 100 },
  { label: "Groove", value: groove, field: "groove", min: 0, max: 100 },
  { label: "Feel", value: feel, field: "feel", min: 0, max: 100 },
  { label: "Swing %", value: swingPct, field: "swingPct", min: 0, max: 100 },
  { label: "Dynamics", value: dynamics, field: "dynamics", min: 0, max: 100 },
]
```

c. Simplify `handleSliderChange` to use the `field` property:
```typescript
function handleSliderChange(field: string, newValue: number) {
  updateProject({ [field]: newValue })
}
```
And update the `onChange` call to pass `slider.field` instead of `slider.label`.

d. Update `getDisplayValue()` with label-specific display values:

- **Groove** (complexity): `"Simple"` (≤20), `"Basic"` (≤40), `"Standard"` (≤60), `"Busy"` (≤80), `"Complex"` (>80)
- **Feel** (humanization): `"Tight"` (≤20), `"Steady"` (≤40), `"Natural"` (≤60), `"Loose"` (≤80), `"Sloppy"` (>80)
- **Energy** (intensity): keep existing `"Low"/"Laid"/"Med"/"High"/"Max"`

**Step 3 — Update `SectionContext.tsx`.**

Find the "Groove" slider entry and rename to "Feel". Add a new "Groove" (complexity) slider entry. Ensure both read from the correct fields (the section context uses override values or inherited from project via the style cascade).

**Verify:**

Compilation:
```
npm run build
```

Behavioral:
```
Open the app in the browser. Navigate to an existing project.
- The Style Controls section should show 5 sliders: Energy, Groove, Feel, Swing %, Dynamics.
- Groove slider shows "Simple/Basic/Standard/Busy/Complex" labels.
- Feel slider shows "Tight/Steady/Natural/Loose/Sloppy" labels.
- Dragging each slider updates the display value text.
```

---

### [x] T5 — Reactive slider → playback: regenerate MIDI on style changes

**Files:** `src/hooks/useGenerate.ts`, `src/hooks/useAudio.ts`
**Depends on:** T2, T3, T4
**Tests:** none (runtime behavior)

**Background:**

Currently, dragging a style slider updates the Zustand store but does not regenerate MIDI or affect playback. MIDI is only generated when the user clicks "Generate." This task adds a reactive pipeline: style slider changes during playback trigger debounced MIDI regeneration, which updates blocks in the store, which causes the `useAudio` hook to reload the arrangement into the audio engine.

The existing `useAudio` hook already watches `blocks` in its dependency array and calls `engine.loadArrangement()` when blocks change. So the strategy is: regenerate block midiData → update store → existing effect handles the rest.

**What to build:**

**Step 1 — Read `src/hooks/useGenerate.ts` and `src/hooks/useAudio.ts` fully.**

**Step 2 — Add `regenerateMidi()` to `useGenerate.ts`.**

Add a new exported function alongside `runGeneration`:

```typescript
/** Regenerate MIDI data for all existing blocks using current style params.
 * Does NOT create new sections/stems/blocks — only updates midiData on existing blocks.
 * Used for reactive slider → playback updates. */
const regenerateMidi = useCallback(() => {
  if (!project || !project.hasArrangement) return;
  if (blocks.length === 0 || sections.length === 0 || stems.length === 0) return;

  const beatsPerBar = parseInt(project.timeSignature.split('/')[0]) || 4;

  const updatedBlocks = blocks.map((block) => {
    const section = sections.find((s) => s.id === block.sectionId);
    const stem = stems.find((s) => s.id === block.stemId);
    if (!section || !stem) return block;

    // Resolve cascaded style values
    const energy = section.energyOverride ?? project.energy;
    const groove = section.grooveOverride ?? project.groove;
    const feel = section.feelOverride ?? project.feel;
    const swingPct = section.swingPctOverride ?? project.swingPct;
    const dynamics = section.dynamicsOverride ?? project.dynamics;

    const barCount = block.endBar - block.startBar + 1;

    // Regenerate MIDI for this block
    const newMidi = generateMidiForBlock(
      stem.instrument,
      barCount,
      chords.filter((c) => c.barNumber >= block.startBar && c.barNumber <= block.endBar),
      project.key,
      project.genre,
      stem.instrument === 'drums' ? {
        substyle: project.subStyle,
        energy,
        dynamics,
        swingPct,
        groove,
        feel,
        beatsPerBar,
        sectionType: section.name,
        sectionIndex: section.sortOrder,
        isLastSection: section.sortOrder === sections.length - 1,
        totalBarsInSection: section.barCount,
        barNumberGlobal: block.startBar,
      } : undefined
    );

    return { ...block, midiData: newMidi };
  });

  // Update blocks in store — this triggers useAudio's loadArrangement effect
  setArrangement({ stems, sections, blocks: updatedBlocks, chords });
}, [project, blocks, sections, stems, chords, setArrangement]);
```

Note: `generateMidiForBlock` must be imported from `@/lib/midi-generator`. If it is not currently exported, add the export.

Return `regenerateMidi` from the hook alongside `runGeneration`.

**Step 3 — Add reactive effect in `useAudio.ts`.**

Add a new `useEffect` that watches the 5 style params and calls `regenerateMidi` with debounce:

```typescript
// Reactive MIDI regeneration on style slider changes
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  // Only react if arrangement exists and engine is ready
  if (!project?.hasArrangement || blocks.length === 0) return;

  // Skip the initial render (don't regenerate on page load)
  // Use a ref to track if this is a user-initiated slider change
  if (debounceRef.current !== undefined) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      regenerateMidi();
    }, 300);
  } else {
    // First render — just set the ref to null (not undefined) to start tracking
    debounceRef.current = null;
  }

  return () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };
}, [project?.energy, project?.groove, project?.feel, project?.swingPct, project?.dynamics]);
```

IMPORTANT: The `regenerateMidi` function comes from `useGenerate()`. The `useAudio` hook will need to accept it as a parameter or import the hook. The cleanest approach: have the component that uses `useAudio` (likely `AppShell.tsx` or `EditorPage.tsx`) also call `useGenerate()` and pass `regenerateMidi` down — OR put the reactive effect in a new hook `useReactiveSliders` that composes both.

The simplest approach: create the debounced effect in the component that already has access to both hooks. Read the existing component hierarchy to determine where `useGenerate()` and `useAudio()` are both available. Place the effect there.

Alternative simpler approach: put the effect directly in `useGenerate.ts` as a self-contained hook effect, since `useGenerate` already has access to all the store data it needs. The effect runs inside any component that calls `useGenerate()`.

**Step 4 — Verify no infinite loop.**

The reactive effect watches project style params. `regenerateMidi` calls `setArrangement` which updates `blocks`. The style param effect should NOT trigger on blocks changes (it watches only `project?.energy` etc.). Confirm the dependency arrays don't create a cycle.

**Step 5 — Handle the `generateMidiForBlock` export.**

If `generateMidiForBlock` in `midi-generator.ts` is not exported, add `export` to its function declaration. It's currently a module-internal function — making it exportable is safe since it's a pure function with no side effects.

**Verify:**

Compilation:
```
npm run build
```

Behavioral:
```
1. Open the app in browser. Load a project with an existing arrangement.
2. Click Play to start playback.
3. While music is playing, drag the Energy slider from 50 to 100.
4. Within ~500ms, the drums should audibly get louder/harder (velocity boost).
5. Drag the Groove slider from 50 to 0 ("Simple").
6. The drum pattern should audibly simplify (fewer hi-hat hits, no ghost notes).
7. Drag the Groove slider to 100 ("Complex").
8. The drum pattern should get busier (ghost snares, syncopated kick).
9. Drag the Feel slider from 50 to 0 ("Tight").
10. The drums should sound more metronomic/quantized.
11. Drag Feel to 100 ("Sloppy").
12. The drums should sound looser (micro-timing variations).
13. Playback should not stop or restart during any slider change — it continues seamlessly (brief glitch during reload is acceptable).
```

---

## Completion Check

When all boxes are checked, run the full suite one final time:

```
npx vitest run && npm run build
```

All tests must pass. Then perform the behavioral smoke test:

**Smoke test:**
1. Open the app. Create a new project or load an existing one.
2. Set some inputs and click Generate. Arrangement appears.
3. Click Play. Music plays.
4. Drag the Groove slider to 0 — drums simplify audibly.
5. Drag Groove to 100 — drums get busy with ghost notes and syncopation.
6. Drag Feel to 0 — drums tighten up. Drag to 100 — drums loosen.
7. Drag Energy to 0 — drums get softer. Drag to 100 — drums hit harder.
8. All 5 sliders show appropriate display labels (Simple/Basic/Standard/Busy/Complex for Groove, Tight/Steady/Natural/Loose/Sloppy for Feel, etc.).

## Intent Trace

**Original intent:** Rename the humanization slider to "Feel", add a new "Groove" slider that controls pattern complexity/busyness, and make all style sliders affect playback in real-time.

### Structural (code wiring)

- [x] "Groove" in types means complexity → `src/types/project.ts` — `groove: number` comment says "complexity"
- [x] "Feel" in types means humanization → `src/types/project.ts` — `feel: number` comment says "humanization"
- [x] applyGroove does density → `src/lib/drum-patterns.ts:applyGroove` — filters/adds notes based on groove param
- [x] applyFeel does micro-timing → `src/lib/drum-patterns.ts:applyFeel` — adds timing offsets based on feel param
- [x] applyEnergy is intensity-only → `src/lib/drum-patterns.ts:applyEnergy` — only scales velocity, no note filtering
- [x] Pipeline order correct → `src/lib/drum-patterns.ts:buildDrumMidi` — groove→energy→dynamics→swing→feel
- [x] Sliders trigger reactive MIDI regen → debounced effect watches `project.energy/groove/feel/swingPct/dynamics`

### Behavioral (end-to-end demo)

- [ ] Step: Play an arrangement, drag Groove from 50 to 0. Expect: audibly simpler drum pattern (fewer notes).
- [ ] Step: Drag Groove from 0 to 100. Expect: audibly busier drum pattern (ghost notes, syncopated kick).
- [ ] Step: Drag Feel from 50 to 100. Expect: looser/sloppier timing (not tighter).
- [ ] Step: Drag Energy from 50 to 100. Expect: louder hits (not more notes).

Groove Complexity + Feel Rename + Reactive Sliders is complete when all tests pass AND both intent trace checks pass.

## Archive

When this queue is fully complete (all task boxes checked, all intent trace boxes
checked, all tests green), move this file:

```bash
mv specs/groove-complexity-feel-rename.md specs/historical/
git add specs/ && git commit -m "chore: archive completed groove-complexity spec"
```
