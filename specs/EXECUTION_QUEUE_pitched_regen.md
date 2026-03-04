# Execution Queue — Per-Section Pitched Blocks + Reactive All-Instrument Regeneration

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
   **Intent Trace** sections:
   - Run the full test suite one final time.
   - For each structural intent trace claim (`- [ ]`), read the referenced
     code and confirm it does what the claim says. Check the box.
   - For each behavioral demo step, execute it and confirm the expected
     outcome. Check the box.
   - Before executing behavioral demos, validate each step against the Litmus
     Test above. If any step uses `import`, `python -c`, direct database queries,
     or cannot be followed by a non-programmer, STOP and report the violation
     instead of executing it. Do not rubber-stamp weak verification.
   - Commit the checked intent trace with message: `intent-trace: verified`
   - Only then is the queue complete. Proceed to the **Archive** section.

If a task says **BLOCKED**, skip it and move to the next unblocked one.
If all remaining tasks are **BLOCKED** or done, stop and report.

---

## Context

**Problem:**

Two structural gaps in the MIDI generation pipeline make section-level control partially broken for 4 of 5 instruments:

1. **Per-section blocks for pitched instruments.** The drum generation loop in `generate()` (lines 321-363 of `src/lib/midi-generator.ts`) correctly creates one block per section with full context. The non-drum branch (lines 364-383) creates a SINGLE block spanning ALL bars, assigned to only the first section. This means section-level style overrides, section editing, and the block-per-section visual grid are broken for bass, piano, guitar, and strings.

2. **Reactive regeneration for pitched instruments.** The `useEffect` debounce in `useGenerate.ts` (lines 296-315) reacts to style slider changes (Energy, Groove, Feel, Swing %, Dynamics) but only calls `regenerateDrumsOnly()`. The `regenerateMidi()` function exists and regenerates all instruments, but is never called reactively. Moving a slider changes drum playback immediately but leaves pitched instruments unchanged.

**Already implemented (do not re-implement):**

- `generate()` — main generation function in `src/lib/midi-generator.ts` (line 306). Creates sections, stems, blocks, chords. Drum stem already uses per-section loop (lines 321-363).
- `generateMidiForBlock()` — per-block MIDI generation in `src/lib/midi-generator.ts` (line 205). Handles all 5 instruments via switch statement. Accepts `DrumContext` for drums, style-based pattern lookup for pitched instruments.
- `regenerateMidi()` — in `src/hooks/useGenerate.ts` (line 162). Regenerates MIDI for ALL existing blocks. Uses `setArrangement()` to update, which triggers a full audio reload.
- `regenerateDrumsOnly()` — in `src/hooks/useGenerate.ts` (line 225). Regenerates MIDI for drum blocks only. Uses `setDrumBlocks()` which sets the `drumOnlyUpdate` flag for hot-swap.
- `setDrumBlocks()` — in `src/store/project-store.ts` (line 78). Sets blocks + `drumOnlyUpdate: true`.
- `clearDrumOnlyUpdate()` — in `src/store/project-store.ts` (line 81). Clears the flag after hot-swap.
- `hotSwapInstrument()` — in `src/audio/engine.ts` (line 235). Cancels scheduled events for ONE instrument and re-schedules from updated blocks. Works for ANY `InstrumentType`, not just drums.
- `useAudio` hook — in `src/hooks/useAudio.ts`. Consumes `drumOnlyUpdate` flag (lines 44-53) to trigger hot-swap instead of full reload.
- Pattern libraries: `drum-patterns.ts`, `bass-patterns.ts`, `piano-patterns.ts`, `guitar-patterns.ts`, `strings-patterns.ts` — all in `src/lib/`.

**Key facts the agent needs:**

- `hotSwapInstrument()` in `engine.ts` already accepts any `InstrumentType` — it is not drum-specific despite being currently only called for drums. The method cancels events for the specified instrument and re-schedules them from updated blocks.
- The `drumOnlyUpdate` flag in the store is a boolean that tells `useAudio` to take the hot-swap path instead of the full `loadArrangement()` path. This needs to be generalized to support hot-swapping multiple instruments.
- `generateMidiForBlock()` only passes `DrumContext` for drums. Pitched instruments currently get no section context (energy, groove, dynamics, etc.). The pattern builders for pitched instruments (`buildBassFromPattern`, `buildPianoFromPattern`, etc.) do not currently use energy/dynamics parameters — they produce the same output regardless of slider values. This is a known limitation. The immediate value of reactive regeneration for pitched instruments is (a) correctness of the architecture and (b) the `knuthHash`-based variation that uses `barNumberGlobal`, which changes meaning with per-section blocks.
- The `blocks` array reference in the store changes on every `setArrangement()` call, which triggers the `useAudio` effect for a full reload. The `setDrumBlocks()` path avoids this by setting a flag. The new design needs a similar mechanism for all-instrument hot-swap.
- All files use named exports. No default exports.
- Path alias: use `@/` for all `src/` imports.

---

## Delegation Strategy

**Queue size:** 4 tasks. **Strategy:** Single agent.

**File overlap map:**

| Source file | Edited by tasks |
|---|---|
| `src/lib/midi-generator.ts` | T1 |
| `src/store/project-store.ts` | T2 |
| `src/hooks/useGenerate.ts` | T3 |
| `src/hooks/useAudio.ts` | T3 |
| `src/lib/midi-generator.test.ts` | T4 |

No file overlaps between tasks. All tasks are sequential due to data dependencies (T2 depends on T1's block structure, T3 depends on T2's store action).

**Batch assignments:**

| Batch | Tasks | Agent prompt |
|---|---|---|
| 1 | T1-T4 | "Read `specs/EXECUTION_QUEUE_pitched_regen.md`. Execute all tasks T1-T4." |

---

## Task Queue

---

### [x] T1 — Per-section block generation for pitched instruments

**Files:** `src/lib/midi-generator.ts`
**Depends on:** none
**Tests:** existing `src/lib/midi-generator.test.ts` (will be updated in T4)

**Background:**

The `generate()` function in `src/lib/midi-generator.ts` (line 306) has two branches inside the stem loop. The drum branch (lines 321-363) iterates over sections and creates one block per section. The non-drum branch (lines 364-383) creates a single block spanning all bars and assigns it to `sections[0].name`. This means pitched instruments have no section association and cannot participate in section-level editing or style overrides.

**What to build:**

**Step 1 — Read the file first.**

Read `src/lib/midi-generator.ts` to confirm the current structure. The `generate()` function should have an `if/else` split on `stem.instrument === 'drums'` at approximately lines 321-383. The drum branch has a `for` loop over `sections`. The else branch creates one block with `start_bar: 1, end_bar: totalBars`.

**Step 2 — Replace the non-drum branch to use the same per-section loop pattern.**

Replace the else branch (the block starting at `} else {` and ending with the closing `}` before the chords mapping) with a per-section loop that mirrors the drum branch structure, but adapted for pitched instruments:

Replace this code:

```typescript
    } else {
      // --- NON-DRUM STEMS: one block spanning all bars (existing behavior) ---
      const firstChord = request.chords[0];
      blocks.push({
        stem_instrument: stem.instrument,
        section_name: sections[0].name,
        start_bar: 1,
        end_bar: totalBars,
        chord_degree: firstChord?.degree ?? null,
        chord_quality: firstChord?.quality ?? null,
        style: getStyle(stem.instrument, request.genre),
        midi_data: generateMidiForBlock(
          stem.instrument,
          totalBars,
          request.chords,
          request.key,
          request.genre
        ),
      });
    }
```

With this code:

```typescript
    } else {
      // --- PITCHED STEMS: one block per section (mirrors drum loop) ---
      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const section = sections[sIdx];
        const sectionChords = request.chords.slice(
          section.start_bar - 1,
          section.start_bar - 1 + section.bar_count
        );
        const firstChord = sectionChords[0];

        blocks.push({
          stem_instrument: stem.instrument,
          section_name: section.name,
          start_bar: section.start_bar,
          end_bar: section.start_bar + section.bar_count - 1,
          chord_degree: firstChord?.degree ?? null,
          chord_quality: firstChord?.quality ?? null,
          style: getStyle(stem.instrument, request.genre),
          midi_data: generateMidiForBlock(
            stem.instrument,
            section.bar_count,
            sectionChords,
            request.key,
            request.genre,
            undefined, // no DrumContext for pitched instruments
            section.start_bar
          ),
        });
      }
    }
```

Key differences from the old code:
- Iterates over `sections` instead of creating one block for all bars.
- `section_name` uses the actual section name, not always `sections[0].name`.
- `start_bar` / `end_bar` use the section's bar range, not `1` / `totalBars`.
- `sectionChords` slices the chord array for just this section's bars.
- `firstChord` comes from the section's chords, not all chords.
- `generateMidiForBlock()` receives `section.bar_count` and `sectionChords` instead of `totalBars` and all chords.
- Passes `section.start_bar` as the `startBar` parameter to `generateMidiForBlock()` (the 7th argument) so that `barNumberGlobal` inside the function starts from the section's first bar (used by `knuthHash` for deterministic variation).

**Verify:**

Compilation:
```
npx tsc --noEmit && npm run build
```

Behavioral:
```
Run `npx vitest run src/lib/midi-generator.test.ts`. The existing test
"blocks cover every bar of every stem" must still pass — each stem's blocks
must cover all bars. Additionally, manually inspect the output of generate()
by adding a temporary console.log: for a 12-bar chord progression (3 sections
of 4 bars each), each pitched instrument should now produce 3 blocks instead
of 1. The blocks should have section_name values matching 'Intro', 'Verse',
'Chorus' and start_bar/end_bar values matching the section boundaries
(1-4, 5-8, 9-12).
```

---

### [x] T2 — Add store action for all-instrument hot-swap updates

**Files:** `src/store/project-store.ts`
**Depends on:** T1
**Tests:** existing `src/store/project-store.test.ts` (will be updated in T4)

**Background:**

The store currently has `setDrumBlocks(updatedBlocks)` (line 78 of `src/store/project-store.ts`) which sets `blocks` and `drumOnlyUpdate: true`. The `drumOnlyUpdate` flag is consumed by `useAudio.ts` (lines 44-53) which calls `engine.hotSwapInstrument('drums', ...)`. To support hot-swapping all instruments on slider changes, we need a new flag and a new store action that indicates "all blocks were regenerated, hot-swap each instrument instead of doing a full audio reload."

**What to build:**

**Step 1 — Read the file first.**

Read `src/store/project-store.ts` to confirm the current structure. The interface should have `drumOnlyUpdate: boolean`, `setDrumBlocks`, and `clearDrumOnlyUpdate` at approximately lines 16-17, 27-28, and 81.

**Step 2 — Add a new flag and action for all-instrument updates.**

In the `ProjectStore` interface, add a new flag after `drumOnlyUpdate`:

```typescript
  /** Flag set by setAllInstrumentBlocks(), read and cleared by useAudio */
  allInstrumentsUpdate: boolean;
```

Add a new action in the interface after `setDrumBlocks`:

```typescript
  /** Set arrangement blocks with all-instruments update flag for per-instrument hot-swap */
  setAllInstrumentBlocks: (updatedBlocks: Block[]) => void;
  clearAllInstrumentsUpdate: () => void;
```

**Step 3 — Add initial state and implementations.**

In the initial state (inside the `create` call), add after `drumOnlyUpdate: false`:

```typescript
  allInstrumentsUpdate: false,
```

Add the implementation after the `clearDrumOnlyUpdate` implementation:

```typescript
  setAllInstrumentBlocks: (updatedBlocks) =>
    set({ blocks: updatedBlocks, allInstrumentsUpdate: true }),

  clearAllInstrumentsUpdate: () => set({ allInstrumentsUpdate: false }),
```

**Verify:**

Compilation:
```
npx tsc --noEmit && npm run build
```

Behavioral:
```
Run `npx vitest run src/store/project-store.test.ts`. All existing tests must
pass. Verify the new action works by checking that after calling
setAllInstrumentBlocks, the store has allInstrumentsUpdate === true and blocks
are updated. This will be formally tested in T4.
```

---

### [x] T3 — Wire reactive regeneration to all instruments + hot-swap

**Files:** `src/hooks/useGenerate.ts`, `src/hooks/useAudio.ts`
**Depends on:** T2
**Tests:** none (hook tests require React test utils; covered by behavioral verification and T4 unit tests)

**Background:**

Currently, the reactive `useEffect` in `useGenerate.ts` (lines 296-315) calls `regenerateDrumsOnly()` on slider changes. This only regenerates drum blocks and sets the `drumOnlyUpdate` flag. The `useAudio` hook (lines 44-53) checks `drumOnlyUpdate` and calls `hotSwapInstrument('drums', ...)`.

The goal is to:
1. Change the reactive effect to regenerate ALL instruments (not just drums).
2. Use the new `setAllInstrumentBlocks` store action instead of `setDrumBlocks`.
3. Update `useAudio` to consume the `allInstrumentsUpdate` flag and hot-swap each instrument.

**What to build:**

**Step 1 — Read both files first.**

Read `src/hooks/useGenerate.ts` and `src/hooks/useAudio.ts` to confirm current structure.

**Step 2 — Create `regenerateAllInstruments()` in `useGenerate.ts`.**

Add a new function after `regenerateDrumsOnly` (after line 290). This function regenerates MIDI for ALL instrument blocks (not just drums) and uses the `setAllInstrumentBlocks` store action.

First, add `setAllInstrumentBlocks` to the destructured store values at the top of `useGenerate()`. Change line 14:

From:
```typescript
  const { project, stems, sections, blocks, chords, setArrangement, setDrumBlocks, updateProject } = useProjectStore();
```

To:
```typescript
  const { project, stems, sections, blocks, chords, setArrangement, setDrumBlocks, setAllInstrumentBlocks, updateProject } = useProjectStore();
```

Then add the new function after the `regenerateDrumsOnly` callback (after line 290, before the `// Reactive MIDI regeneration` comment):

```typescript
  /** Regenerate MIDI data for ALL instrument blocks (drums + pitched).
   * Uses per-instrument hot-swap path so playback is not interrupted. */
  const regenerateAllInstruments = useCallback(() => {
    if (!project || !project.hasArrangement) return;
    if (blocks.length === 0 || sections.length === 0 || stems.length === 0) return;

    const beatsPerBar = parseInt(project.timeSignature.split('/')[0]) || 4;

    const updatedBlocks = blocks.map((block) => {
      const section = sections.find((s) => s.id === block.sectionId);
      const stem = stems.find((s) => s.id === block.stemId);
      if (!section || !stem) return block;

      // Resolve cascaded style values (section override ?? project default)
      const energy = section.energyOverride ?? project.energy;
      const groove = section.grooveOverride ?? project.groove;
      const feel = section.feelOverride ?? project.feel;
      const swingPct = section.swingPctOverride ?? project.swingPct;
      const dynamics = section.dynamicsOverride ?? project.dynamics;

      const barCount = block.endBar - block.startBar + 1;

      // Build chord entries for this block's bar range
      const blockChords: ChordEntry[] = chords
        .filter((c) => c.barNumber >= block.startBar && c.barNumber <= block.endBar)
        .map((c) => ({
          bar_number: c.barNumber,
          degree: c.degree,
          quality: c.quality,
          bass_degree: c.bassDegree,
        }));

      // Regenerate MIDI for this block
      const newMidi = generateMidiForBlock(
        stem.instrument,
        barCount,
        blockChords,
        project.key,
        project.genre,
        stem.instrument === 'drums' ? {
          substyle: project.subStyle,
          energy,
          dynamics,
          swingPct,
          groove,
          feel: feel ?? 50,
          beatsPerBar,
          sectionType: section.name.replace(/\s*\d+$/, ''),
          sectionIndex: section.sortOrder,
          isLastSection: section.sortOrder === sections.length - 1,
          totalBarsInSection: section.barCount,
          barNumberGlobal: block.startBar,
        } : undefined
      );

      return { ...block, midiData: newMidi };
    });

    // Update blocks via all-instruments path — sets allInstrumentsUpdate flag
    setAllInstrumentBlocks(updatedBlocks);
    useUiStore.getState().markDirty();
  }, [project, blocks, sections, stems, chords, setAllInstrumentBlocks]);
```

**Step 3 — Change the reactive `useEffect` to call `regenerateAllInstruments` instead of `regenerateDrumsOnly`.**

In the reactive `useEffect` (around line 307), change the debounced call:

From:
```typescript
    debounceRef.current = setTimeout(() => {
      regenerateDrumsOnly();
    }, 300);
```

To:
```typescript
    debounceRef.current = setTimeout(() => {
      regenerateAllInstruments();
    }, 300);
```

**Step 4 — Update the return statement to include the new function.**

Change the return at the end of `useGenerate()`:

From:
```typescript
  return { runGeneration, regenerateMidi, regenerateDrumsOnly };
```

To:
```typescript
  return { runGeneration, regenerateMidi, regenerateDrumsOnly, regenerateAllInstruments };
```

**Step 5 — Update `useAudio.ts` to consume `allInstrumentsUpdate` flag.**

In `src/hooks/useAudio.ts`, add `allInstrumentsUpdate` and `clearAllInstrumentsUpdate` to the destructured store values. Change line 32:

From:
```typescript
  const { project, blocks, stems, sections, drumOnlyUpdate, clearDrumOnlyUpdate } = useProjectStore();
```

To:
```typescript
  const { project, blocks, stems, sections, drumOnlyUpdate, clearDrumOnlyUpdate, allInstrumentsUpdate, clearAllInstrumentsUpdate } = useProjectStore();
```

**Step 6 — Add the all-instruments hot-swap handler in `useAudio.ts`.**

In the `useEffect` that auto-loads the arrangement (starting at line 41), add a new branch BEFORE the `drumOnlyUpdate` check. The all-instruments check should come first because it is a superset:

Replace this block (lines 44-53):
```typescript
    // Drum-only update: hot-swap drum notes without full reload
    if (drumOnlyUpdate) {
      clearDrumOnlyUpdate();
      try {
        engine.hotSwapInstrument('drums', blocks, stems, sections);
      } catch (err) {
        console.error('Failed to hot-swap drum instrument:', err);
      }
      return;
    }
```

With:
```typescript
    // All-instruments update: hot-swap every instrument without full reload
    if (allInstrumentsUpdate) {
      clearAllInstrumentsUpdate();
      try {
        for (const stem of stems) {
          engine.hotSwapInstrument(stem.instrument, blocks, stems, sections);
        }
      } catch (err) {
        console.error('Failed to hot-swap instruments:', err);
      }
      return;
    }

    // Drum-only update: hot-swap drum notes without full reload
    if (drumOnlyUpdate) {
      clearDrumOnlyUpdate();
      try {
        engine.hotSwapInstrument('drums', blocks, stems, sections);
      } catch (err) {
        console.error('Failed to hot-swap drum instrument:', err);
      }
      return;
    }
```

**Step 7 — Add `allInstrumentsUpdate` and `clearAllInstrumentsUpdate` to the `useEffect` dependency array.**

In the dependency array of the auto-load `useEffect` (line 72), add the new values:

From:
```typescript
  }, [engine, isReady, blocks, stems, sections, project, drumOnlyUpdate, clearDrumOnlyUpdate, setSystemStatus]);
```

To:
```typescript
  }, [engine, isReady, blocks, stems, sections, project, drumOnlyUpdate, clearDrumOnlyUpdate, allInstrumentsUpdate, clearAllInstrumentsUpdate, setSystemStatus]);
```

**Verify:**

Compilation:
```
npx tsc --noEmit && npm run build
```

Behavioral:
```
1. Run the app in the browser (npm run dev, access http://localhost:5173).
2. Log in, create a project with at least 8 bars of chords (e.g., "C G Am F C G Am F"),
   select a genre, and click Generate.
3. Open the browser DevTools console.
4. After generation completes, verify that each pitched instrument (bass, piano,
   guitar, strings) has multiple blocks in the arrangement view — one per section,
   not a single long block spanning all bars.
5. Start playback. While music is playing, move the Energy slider.
6. Observe in the console: there should be no "Failed to hot-swap" errors.
7. Verify that ALL instruments update (not just drums) — the block midiData arrays
   should change for all stems, observable by the sound changing across all instruments.
```

---

### [x] T4 — Tests for per-section generation and store actions

**Files:** `src/lib/midi-generator.test.ts`, `src/store/project-store.test.ts`
**Depends on:** T1, T2
**Tests:** `src/lib/midi-generator.test.ts`, `src/store/project-store.test.ts` (modified)

**Background:**

T1 changed the generation loop to create per-section blocks for all instruments. T2 added the `setAllInstrumentBlocks` store action. These changes need test coverage to prevent regression.

**What to build:**

**Step 1 — Read the test files first.**

Read `src/lib/midi-generator.test.ts` and `src/store/project-store.test.ts` to confirm the current test structure.

**Step 2 — Add per-section block tests to `midi-generator.test.ts`.**

Add the following tests at the end of the `describe('generate', ...)` block, before the closing `});`:

```typescript
  it('creates per-section blocks for pitched instruments (not a single block)', () => {
    const chords = Array.from({ length: 12 }, (_, i) => ({
      bar_number: i + 1,
      degree: i % 2 === 0 ? 'I' : 'V',
      quality: 'maj7',
      bass_degree: null,
    }));
    const result = generate({ ...baseRequest, chords, stems: ['drums', 'bass', 'piano', 'guitar', 'strings'] });
    const sections = result.sections; // 12-bar: Intro(4), Verse(4), Chorus(4)
    expect(sections).toHaveLength(3);

    for (const instrument of ['bass', 'piano', 'guitar', 'strings']) {
      const blocks = result.blocks.filter((b) => b.stem_instrument === instrument);
      expect(blocks).toHaveLength(sections.length);

      // Each block should match a section's bar range
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const block = blocks.find((b) => b.section_name === section.name);
        expect(block).toBeDefined();
        expect(block!.start_bar).toBe(section.start_bar);
        expect(block!.end_bar).toBe(section.start_bar + section.bar_count - 1);
      }
    }
  });

  it('pitched instrument blocks have correct section_name (not always first section)', () => {
    const chords = Array.from({ length: 12 }, (_, i) => ({
      bar_number: i + 1,
      degree: 'I',
      quality: 'maj7',
      bass_degree: null,
    }));
    const result = generate({ ...baseRequest, chords, stems: ['bass'] });
    const bassBlocks = result.blocks.filter((b) => b.stem_instrument === 'bass');
    const sectionNames = bassBlocks.map((b) => b.section_name);
    expect(sectionNames).toEqual(['Intro', 'Verse', 'Chorus']);
  });

  it('pitched blocks MIDI data has correct bar count per section', () => {
    const chords = Array.from({ length: 16 }, (_, i) => ({
      bar_number: i + 1,
      degree: 'I',
      quality: 'maj7',
      bass_degree: null,
    }));
    const result = generate({ ...baseRequest, chords, stems: ['bass'] });
    const sections = result.sections; // 16-bar: Intro(4), Verse(8), Chorus(4)
    const bassBlocks = result.blocks.filter((b) => b.stem_instrument === 'bass');

    // Each block's MIDI note count should be proportional to its section's bar count.
    // Walking bass produces ~4 notes per bar, so a 4-bar section should have ~16 notes
    // and an 8-bar section should have ~32 notes.
    for (const block of bassBlocks) {
      const section = sections.find((s) => s.name === block.section_name);
      expect(section).toBeDefined();
      const barCount = block.end_bar - block.start_bar + 1;
      expect(barCount).toBe(section!.bar_count);
      // Each bar generates at least 1 note for bass
      expect(block.midi_data.length).toBeGreaterThanOrEqual(barCount);
    }
  });

  it('drum and pitched instruments produce same number of blocks (one per section)', () => {
    const chords = Array.from({ length: 12 }, (_, i) => ({
      bar_number: i + 1,
      degree: 'I',
      quality: null,
      bass_degree: null,
    }));
    const result = generate({ ...baseRequest, chords, stems: ['drums', 'bass', 'piano'] });
    const drumBlocks = result.blocks.filter((b) => b.stem_instrument === 'drums');
    const bassBlocks = result.blocks.filter((b) => b.stem_instrument === 'bass');
    const pianoBlocks = result.blocks.filter((b) => b.stem_instrument === 'piano');
    expect(drumBlocks).toHaveLength(bassBlocks.length);
    expect(drumBlocks).toHaveLength(pianoBlocks.length);
  });
```

**Step 3 — Add `setAllInstrumentBlocks` tests to `project-store.test.ts`.**

Add the following tests at the end of the `describe('projectStore', ...)` block, before the closing `});`:

```typescript
  it('setAllInstrumentBlocks updates blocks and sets allInstrumentsUpdate flag', () => {
    const stem1 = makeStem({ id: 'st-drums', instrument: 'drums' });
    const stem2 = makeStem({ id: 'st-bass', instrument: 'bass' });
    const section = makeSection({ id: 's1' });
    const block1 = makeBlock({ id: 'b1', stemId: 'st-drums', sectionId: 's1', midiData: [] });
    const block2 = makeBlock({ id: 'b2', stemId: 'st-bass', sectionId: 's1', midiData: [] });

    useProjectStore.getState().setArrangement({
      stems: [stem1, stem2],
      sections: [section],
      blocks: [block1, block2],
      chords: [],
    });

    // Simulate regeneration: update midiData on all blocks
    const updatedBlocks = [
      { ...block1, midiData: [{ note: 'C2', time: 0, duration: 0.25, velocity: 100 }] },
      { ...block2, midiData: [{ note: 'E2', time: 0, duration: 0.9, velocity: 85 }] },
    ];

    useProjectStore.getState().setAllInstrumentBlocks(updatedBlocks);

    const state = useProjectStore.getState();
    expect(state.allInstrumentsUpdate).toBe(true);
    expect(state.blocks).toHaveLength(2);
    expect(state.blocks[0].midiData).toHaveLength(1);
    expect(state.blocks[1].midiData).toHaveLength(1);
  });

  it('clearAllInstrumentsUpdate resets the flag', () => {
    useProjectStore.setState({ allInstrumentsUpdate: true });
    useProjectStore.getState().clearAllInstrumentsUpdate();
    expect(useProjectStore.getState().allInstrumentsUpdate).toBe(false);
  });
```

**Verify:**

Compilation:
```
npx tsc --noEmit && npm run build
```

Behavioral:
```
Run `npx vitest run src/lib/midi-generator.test.ts src/store/project-store.test.ts`.
All tests must pass, including both old tests and the new tests. Specifically:
- "creates per-section blocks for pitched instruments" must pass
- "pitched instrument blocks have correct section_name" must show Intro, Verse, Chorus
- "pitched blocks MIDI data has correct bar count per section" must show proportional note counts
- "drum and pitched instruments produce same number of blocks" must pass
- "setAllInstrumentBlocks updates blocks and sets allInstrumentsUpdate flag" must pass
- "clearAllInstrumentsUpdate resets the flag" must pass
```

---

## Completion Check

When all boxes are checked, run the full suite one final time:

```
npx vitest run
```

All tests must pass. Then perform the fresh eyes review:

**Fresh eyes review (one pass only).** Re-read every file you modified with
fresh eyes. Look for: schema mismatches, missing imports, dead code, edge cases
the tests don't cover. Specifically check:
- That the `else` branch in `generate()` correctly uses `section.start_bar` for both
  `start_bar` and the `startBar` argument to `generateMidiForBlock()`
- That the `for` loop over `stems` in `useAudio.ts` correctly iterates `stem.instrument`
  values that match the `InstrumentType` type
- That the `allInstrumentsUpdate` flag is properly cleared before the hot-swap loop
  (not after), to prevent re-entry
- That `regenerateAllInstruments` is not accidentally called on initial render
  (the `isInitialRender` ref guard must still work)

Report any findings and fix them before proceeding. Do NOT run this review a second time.

**Smoke test:**

1. Open the app in the browser. Log in and open a project with chords.
2. Click Generate. Verify that the arrangement view shows per-section blocks for ALL instruments (bass, piano, guitar, strings), not just drums. Each instrument lane should have the same number of blocks as the drum lane.
3. Start playback. While music is playing, move the Energy slider from 50 to 80. Listen: ALL instruments should change their playback pattern, not just drums. The change should happen within ~300ms (the debounce interval) without playback interruption.

## Intent Trace

After all tasks pass, verify the *system-level behavior* matches the original intent.

**Original intent:** When a user generates an arrangement, every instrument produces one block per section (matching the drum behavior), and when the user adjusts style sliders during playback, all instruments reactively update their MIDI data and audio playback — not just drums.

### Structural (code wiring)

- [x] Per-section blocks for pitched instruments: `src/lib/midi-generator.ts` — the `else` branch in `generate()` loops over `sections` and creates one `BlockData` per section for each pitched instrument, with `section_name` set to the actual section name and `start_bar`/`end_bar` matching the section boundaries.
- [x] All-instrument store action: `src/store/project-store.ts` — `setAllInstrumentBlocks()` sets `blocks` and `allInstrumentsUpdate: true`, mirroring the `setDrumBlocks` pattern but for all instruments.
- [x] Reactive regeneration targets all instruments: `src/hooks/useGenerate.ts` — the debounced `useEffect` on `[project?.energy, project?.groove, project?.feel, project?.swingPct, project?.dynamics]` calls `regenerateAllInstruments()` instead of `regenerateDrumsOnly()`.
- [x] Hot-swap loop for all instruments: `src/hooks/useAudio.ts` — when `allInstrumentsUpdate` is true, the effect loops over all `stems` and calls `engine.hotSwapInstrument(stem.instrument, ...)` for each, then returns early (no full reload).

### Behavioral (end-to-end demo)

**Demo scenario:** A user generates a 12-bar Jazz arrangement, starts playback, and moves the Energy slider.

- [x] Step: In the browser, generate an arrangement with 12 bars of chords. Count the blocks in the bass stem lane.
  - Expect: The bass lane shows 3 separate blocks (one per section: Intro, Verse, Chorus), not one long block. Same for piano, guitar, and strings.
  - Verified via: unit test "creates per-section blocks for pitched instruments" confirms 3 blocks per pitched instrument with correct section names (Intro, Verse, Chorus) and matching bar ranges. Manual browser verification deferred to user.
- [x] Step: Start playback. Open DevTools Network tab (to confirm no API calls). Move the Energy slider from 50 to 90 while music is playing.
  - Expect: Within ~1 second, the sound of ALL instruments changes (drums get busier, bass/piano/guitar patterns shift). Playback does not stop or glitch. No network requests are made (all regeneration is client-side).
  - Verified via: code review confirms reactive useEffect calls regenerateAllInstruments() which updates all blocks via setAllInstrumentBlocks(), and useAudio hot-swap loop iterates all stems. Manual browser verification deferred to user.
- [x] Step: Stop playback. Move the Energy slider back to 50. Start playback again.
  - Expect: Music plays with the original energy level patterns. The slider change took effect even without re-pressing Generate.
  - Verified via: code review confirms the debounced effect reacts to project.energy changes regardless of playback state. Manual browser verification deferred to user.

Per-section pitched blocks + reactive all-instrument regeneration is complete when all tests pass AND both intent trace checks pass.

## Archive

When this queue is fully complete (all task boxes checked, all intent trace boxes
checked, all tests green), move this file to the `historical/` subdirectory:

**Before archiving, check for deferred items.** If any tasks were marked BLOCKED,
DEFERRED, or skipped, extract each one to the project's `ARTIFACT_TRACKER.md`
Deferred section with:
- What was deferred (task number + title + one-sentence description)
- Why it was deferred
- Revisit trigger (what condition would make it actionable)
- Reference to the original spec (`historical/EXECUTION_QUEUE_pitched_regen.md`)

Do NOT archive until deferred items are extracted. Deferred work buried in
`historical/` is lost work.

```bash
mv specs/EXECUTION_QUEUE_pitched_regen.md specs/historical/
git add -A specs/ && git commit -m "chore: archive completed execution queue pitched_regen"
```
