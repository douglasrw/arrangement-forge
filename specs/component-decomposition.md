# Spec: Component Decomposition

**Status:** Draft
**Date:** 2026-03-07
**Origin:** CLAUDE.md preference "Keep components under 200 lines"

---

## 1. Problem Statement

Seven components in `src/components/` exceed the 200-line limit declared in CLAUDE.md preferences. The largest is ArrangementView at 468 lines -- over 2x the limit. These files are hard to review, hard to test in isolation, and create merge conflicts when multiple tasks touch the same component.

| Component | Lines | Over by |
|-----------|-------|---------|
| `arrangement/ArrangementView.tsx` | 468 | 268 |
| `left-panel/ChordPalette.tsx` | 461 | 261 |
| `left-panel/BlockContext.tsx` | 400 | 200 |
| `mixer/MixerDrawer.tsx` | 392 | 192 |
| `layout/TopBar.tsx` | 357 | 157 |
| `left-panel/SectionContext.tsx` | 346 | 146 |
| `transport/TransportBar.tsx` | 246 | 46 |

There is no automated enforcement of the 200-line limit, so violations accumulate silently.

---

## 2. Acceptance Criteria

1. **Every `.tsx` file in `src/components/` is under 200 lines.** Verify: `find src/components -name '*.tsx' -exec wc -l {} + | awk '$1 > 200'` returns zero results.

2. **All extracted sub-components live in the same directory as their parent.** Verify: no new directories created.

3. **Identical render output before and after.** Verify: Playwright screenshots of the editor page match before/after at pixel level; `npm run build` exits 0; `npx vitest run` exits 0.

4. **No new dependencies added.** Verify: `package.json` diff shows zero dependency changes.

5. **Pre-commit check enforces the 200-line limit going forward.** Verify: creating a 201-line `.tsx` file in `src/components/` and staging it causes the pre-commit hook to fail.

6. **ARCHITECTURE.md project tree lists all new files.** Verify: diff tree listing against filesystem, zero mismatches for `src/components/`.

---

## 3. Constraint Architecture

### Musts
- Must be a pure refactor: extract, move, re-export. No behavior changes.
- Must keep every extracted component in the same directory as its parent file.
- Must preserve all existing imports from external consumers (re-export from parent if needed).
- Must preserve all `aria-label`, `id`, `htmlFor`, and accessibility attributes exactly.
- Must run `npm run build`, `npx vitest run`, and `npm run test:ui:accessibility` after each task.

### Must-nots
- Must not add any new dependencies.
- Must not change any component's rendered HTML structure, CSS classes, or behavior.
- Must not move existing files to different directories.
- Must not create barrel/index re-exports (per ARCHITECTURE.md: "No barrel re-exports except types/index.ts").
- Must not extract sub-components that are only used once and have fewer than 15 lines -- inline is fine for tiny fragments.

### Preferences
- Prefer extracting self-contained visual sections first (toolbar, panel section, grid row).
- Prefer extractions that are semantically distinct (a "ChordBuilder" is a concept; a "div wrapper" is not).
- Prefer named exports for all extracted components.
- Prefer keeping constants and helper functions in the same file as the component that uses them, unless shared.
- Prefer extracting private sub-components (already function-scoped in the file) before splitting interleaved logic.

### Escalation Triggers
- If an extraction would require passing more than 6 props, reconsider the boundary.
- If two components in different directories share extracted helpers (e.g., `InstrumentSlider` appears in both `BlockContext` and `MixerDrawer`), escalate to decide canonical location.

---

## 4. Decomposition

### T1: Extract TransportBar sub-components

**Rationale:** Smallest oversize component (246 lines), zero cross-dependencies with other tasks. Good warm-up.

**Extractions:**

| New file | What moves | Approx lines |
|----------|-----------|--------------|
| `transport/MetronomeIcon.tsx` | `MetronomeIcon` function (lines 17-34) | ~25 |
| `transport/PlaybackControls.tsx` | The playback pill group (stop, play/pause, skip buttons) -- extracted from the left section of TransportBar's JSX + `handlePlayPause`, `handleStop` | ~70 |
| `transport/PositionDisplay.tsx` | The center pill group (bar/beat counter, BPM editor, time sig display) + `editingBpm`/`bpmDraft` state + `commitBpm` | ~80 |
| `transport/TransportToggles.tsx` | The right pill group (loop, metronome, elapsed time) + `loopActive`/`metronomeActive` state | ~50 |

The parent `TransportBar.tsx` becomes a layout shell (~50 lines) composing the three pill groups.

**Creates:** `src/components/transport/MetronomeIcon.tsx`, `src/components/transport/PlaybackControls.tsx`, `src/components/transport/PositionDisplay.tsx`, `src/components/transport/TransportToggles.tsx`
**Modifies:** `src/components/transport/TransportBar.tsx`

**Acceptance:**
- `wc -l src/components/transport/*.tsx` -- all files under 200 lines
- `npm run build` exits 0
- `npx vitest run` exits 0

---

### T2: Extract TopBar sub-components

**Rationale:** Self-contained sub-components already exist as private functions (`KeyDropdown`, `BpmEditor`, `ChordDisplayToggle`). Pure lift-and-shift.

**Extractions:**

| New file | What moves | Approx lines |
|----------|-----------|--------------|
| `layout/KeyDropdown.tsx` | `KeyDropdown` function (lines 12-46) | ~40 |
| `layout/BpmEditor.tsx` | `BpmEditor` function (lines 51-116) | ~70 |
| `layout/ChordDisplayToggle.tsx` | `ChordDisplayToggle` function (lines 121-164) | ~50 |
| `layout/UserMenu.tsx` | The user avatar button + dropdown menu JSX + `menuOpen`/`menuRef` state (lines 321-353 of TopBar) + outside-click effect | ~70 |

The parent `TopBar.tsx` becomes a layout shell (~100 lines) importing and composing these four sub-components.

**Creates:** `src/components/layout/KeyDropdown.tsx`, `src/components/layout/BpmEditor.tsx`, `src/components/layout/ChordDisplayToggle.tsx`, `src/components/layout/UserMenu.tsx`
**Modifies:** `src/components/layout/TopBar.tsx`

**Acceptance:**
- `wc -l src/components/layout/*.tsx` -- all files under 200 lines
- `npm run build` exits 0
- `npx vitest run` exits 0

---

### T3: Extract SectionContext sub-components

**Rationale:** No cross-dependencies with other tasks. Contains a reusable slider pattern and `getDisplayValue` helper.

**Extractions:**

| New file | What moves | Approx lines |
|----------|-----------|--------------|
| `left-panel/SectionStyleOverrides.tsx` | The style override toggle, genre/sub-style selects, and slider group (lines 201-323) + `isOverriding`/`sliders` state + `handleSliderChange` + `getDisplayValue` + `INITIAL_SLIDERS` + `SliderDef` | ~160 |
| `left-panel/SectionHeader.tsx` | The section badge + name input + length controls (lines 136-199) + `nameDraft` state + `commitName` + `adjustBars` | ~80 |

The parent `SectionContext.tsx` becomes ~110 lines: store wiring, back button, composing `SectionHeader` + `SectionStyleOverrides` + delete button + `ConfirmDialog`.

**Creates:** `src/components/left-panel/SectionStyleOverrides.tsx`, `src/components/left-panel/SectionHeader.tsx`
**Modifies:** `src/components/left-panel/SectionContext.tsx`

**Acceptance:**
- `wc -l src/components/left-panel/SectionContext.tsx src/components/left-panel/SectionStyleOverrides.tsx src/components/left-panel/SectionHeader.tsx` -- all under 200 lines
- `npm run build` exits 0
- `npx vitest run` exits 0

---

### T4: Extract BlockContext sub-components

**Rationale:** Contains two reusable private components (`InstrumentSlider`, `ToggleSwitch`) that are good extraction candidates. `InstrumentSlider` is also used conceptually in MixerDrawer (T6), but that uses its own `VerticalFader` so no shared dependency.

**Extractions:**

| New file | What moves | Approx lines |
|----------|-----------|--------------|
| `left-panel/InstrumentSlider.tsx` | `InstrumentSlider` function + `mix()` helper (lines 29-143) | ~120 |
| `left-panel/ToggleSwitch.tsx` | `ToggleSwitch` function (lines 148-175) | ~30 |

The parent `BlockContext.tsx` drops to ~195 lines after extracting these two sub-components. Constants (`INSTRUMENT_COLORS`, `INSTRUMENT_LABELS`) stay in BlockContext since they are small and local.

Note: If the parent is still borderline after extraction, also extract the chord override section (lines 344-370) into `left-panel/BlockChordOverride.tsx` (~40 lines), bringing the parent to ~155 lines.

**Creates:** `src/components/left-panel/InstrumentSlider.tsx`, `src/components/left-panel/ToggleSwitch.tsx`
**Modifies:** `src/components/left-panel/BlockContext.tsx`

**Acceptance:**
- `wc -l src/components/left-panel/BlockContext.tsx src/components/left-panel/InstrumentSlider.tsx src/components/left-panel/ToggleSwitch.tsx` -- all under 200 lines
- `npm run build` exits 0
- `npx vitest run` exits 0

---

### T5: Extract ChordPalette sub-components

**Rationale:** Three distinct visual modes (manual textarea, progression grid, chord builder). Each is self-contained.

**Extractions:**

| New file | What moves | Approx lines |
|----------|-----------|--------------|
| `left-panel/ChordManualInput.tsx` | The manual textarea mode branch (lines 150-178) + `manualText` state + `applyManualText` | ~45 |
| `left-panel/ChordBuilder.tsx` | The custom chord builder section (lines 274-393) -- root note grid, quality grid, preview/action row + `builderOpen`/`builderRoot`/`builderQuality` state + `handleAddFromBuilder` + `ROOT_NOTES`/`QUALITIES` constants | ~140 |
| `left-panel/DiatonicButton.tsx` | `DiatonicButton` function (lines 413-461) | ~55 |
| `left-panel/ProgressionGrid.tsx` | The progression grid display (lines 191-239) -- rows rendering with remove buttons | ~60 |

The parent `ChordPalette.tsx` becomes ~120 lines: state orchestration, diatonic row, composing `ProgressionGrid` + `ChordBuilder` + `DiatonicButton` row + bottom row. `ChordManualInput` is used as an early return branch.

**Creates:** `src/components/left-panel/ChordManualInput.tsx`, `src/components/left-panel/ChordBuilder.tsx`, `src/components/left-panel/DiatonicButton.tsx`, `src/components/left-panel/ProgressionGrid.tsx`
**Modifies:** `src/components/left-panel/ChordPalette.tsx`

**Acceptance:**
- `wc -l src/components/left-panel/ChordPalette.tsx src/components/left-panel/ChordManualInput.tsx src/components/left-panel/ChordBuilder.tsx src/components/left-panel/DiatonicButton.tsx src/components/left-panel/ProgressionGrid.tsx` -- all under 200 lines
- `npm run build` exits 0
- `npx vitest run` exits 0

---

### T6: Extract MixerDrawer sub-components

**Rationale:** Four clear private components already scoped as functions. Pure lift-and-shift.

**Extractions:**

| New file | What moves | Approx lines |
|----------|-----------|--------------|
| `mixer/VerticalFader.tsx` | `VerticalFader` function (lines 45-120) | ~80 |
| `mixer/LevelMeter.tsx` | `LevelMeter` function (lines 125-144) | ~25 |
| `mixer/DrumSubMix.tsx` | `DrumSubMix` function + `DRUM_GROUPS` constant (lines 149-203) | ~60 |
| `mixer/ChannelStrip.tsx` | The per-instrument channel strip JSX (lines 262-336) extracted into its own component with props for channel state, instrument config, mute/solo/volume handlers, and drum sub-mix toggle | ~80 |

The parent `MixerDrawer.tsx` becomes ~110 lines: state management, `updateChannel`, header toggle, composing channel strips + master + drum sub-mix.

Constants (`INSTRUMENTS`, `DEFAULT_CHANNELS`, `volumeToDb`, types) stay in `MixerDrawer.tsx` or move to a shared constants location if needed.

**Creates:** `src/components/mixer/VerticalFader.tsx`, `src/components/mixer/LevelMeter.tsx`, `src/components/mixer/DrumSubMix.tsx`, `src/components/mixer/ChannelStrip.tsx`
**Modifies:** `src/components/mixer/MixerDrawer.tsx`

**Acceptance:**
- `wc -l src/components/mixer/*.tsx` -- all files under 200 lines
- `npm run build` exits 0
- `npx vitest run` exits 0

---

### T7: Extract ArrangementView sub-components

**Rationale:** Largest file (468 lines), saved for last because it is the most complex and touches the most stores. Depends on no other task but benefits from patterns established in T1-T6.

**Extractions:**

| New file | What moves | Approx lines |
|----------|-----------|--------------|
| `arrangement/EmptyState.tsx` | `EmptyState` function (lines 28-63) | ~40 |
| `arrangement/SectionHeaders.tsx` | The section headers row JSX (lines 243-285) -- maps sortedSections to clickable header buttons | ~55 |
| `arrangement/BarRuler.tsx` | The bar ruler row JSX (lines 288-335) -- click-to-seek ruler with tick marks and bar numbers | ~55 |
| `arrangement/StemLane.tsx` | A single stem lane row (lines 338-410) -- vertical grid lines + positioned SequencerBlocks. Receives instrument config, blocks, layout dimensions, selection state, and callbacks as props | ~80 |
| `arrangement/InstrumentGutter.tsx` | The left gutter column (lines 170-235) -- instrument labels + chord label. Receives instrument config, lane height, selection state, and click handlers | ~75 |
| `arrangement/Playhead.tsx` | The playhead overlay (lines 438-463) -- triangle handle + vertical line | ~30 |

The parent `ArrangementView.tsx` becomes ~130 lines: store subscriptions, layout computation (`recalcLayout`, `effectiveBarW`, `INSTRUMENT_CONFIG`), and composing the sub-components.

**Creates:** `src/components/arrangement/EmptyState.tsx`, `src/components/arrangement/SectionHeaders.tsx`, `src/components/arrangement/BarRuler.tsx`, `src/components/arrangement/StemLane.tsx`, `src/components/arrangement/InstrumentGutter.tsx`, `src/components/arrangement/Playhead.tsx`
**Modifies:** `src/components/arrangement/ArrangementView.tsx`

**Acceptance:**
- `wc -l src/components/arrangement/*.tsx` -- all files under 200 lines
- `npm run build` exits 0
- `npx vitest run` exits 0

---

### T8: Add pre-commit check for component size

**Rationale:** Prevents future violations. Follows the existing `scripts/checks/*.sh` pattern.

**Creates:** `scripts/checks/check-component-size.sh`

**Script behavior:**
- Iterates over staged files passed as `$@`.
- Only checks files matching `src/components/**/*.tsx`.
- Skips `.test.tsx` files.
- Counts lines with `wc -l`.
- Fails with exit 1 if any file exceeds 200 lines, printing the filename and line count.
- Exits 0 if all files pass.

**Modifies:** `.husky/pre-commit` or `lint-staged` config (whichever is used) to include the new check.

**Acceptance:**
- Create a 201-line test file at `src/components/test-oversize.tsx`, stage it, run the check -- must fail.
- Create a 200-line test file at `src/components/test-ok.tsx`, stage it, run the check -- must pass.
- A file at `src/lib/big-file.tsx` (250 lines) must not be flagged (outside `src/components/`).
- Clean up test files after verification.

---

### T9: Update ARCHITECTURE.md project tree

**Rationale:** Must reflect all new files created in T1-T7. Run last so the tree is complete.

**Modifies:** `ARCHITECTURE.md` (project structure section only)

**Actions:**
- Add all new files under their respective `src/components/` subdirectories in the project tree.
- Verify the tree matches the filesystem: `diff <(grep -oP 'src/components/\S+\.tsx' ARCHITECTURE.md | sort) <(find src/components -name '*.tsx' | sed 's|^\./||' | sort)` returns zero diff.

**Acceptance:**
- The project tree diff against filesystem shows zero mismatches for `src/components/`.
- `npm run build` exits 0.

---

## 5. Evaluation Design

| Test | Input | Expected Output |
|------|-------|-----------------|
| No oversize components | `find src/components -name '*.tsx' -exec wc -l {} + \| awk '$1 > 200'` | Zero results |
| Build passes | `npm run build` | Exit 0 |
| Tests pass | `npx vitest run` | Exit 0 |
| Accessibility passes | `npm run test:ui:accessibility` | Exit 0 |
| No new dependencies | `git diff package.json` | Zero dependency changes |
| No new directories | `git diff --stat \| grep 'src/components'` | Only file additions within existing dirs |
| Pre-commit blocks oversize | Stage a 201-line `src/components/ui/test.tsx`, run check | Exit 1, prints filename |
| Pre-commit allows compliant | Stage a 150-line `src/components/ui/test.tsx`, run check | Exit 0 |
| Pre-commit ignores non-components | Stage a 300-line `src/lib/big.tsx`, run check | Exit 0 (not in scope) |
| ARCHITECTURE.md accurate | Diff tree listing vs filesystem for `src/components/` | Zero mismatches |
| ArrangementView under limit | `wc -l src/components/arrangement/ArrangementView.tsx` | Under 200 |
| ChordPalette under limit | `wc -l src/components/left-panel/ChordPalette.tsx` | Under 200 |
| BlockContext under limit | `wc -l src/components/left-panel/BlockContext.tsx` | Under 200 |
| MixerDrawer under limit | `wc -l src/components/mixer/MixerDrawer.tsx` | Under 200 |
| TopBar under limit | `wc -l src/components/layout/TopBar.tsx` | Under 200 |
| SectionContext under limit | `wc -l src/components/left-panel/SectionContext.tsx` | Under 200 |
| TransportBar under limit | `wc -l src/components/transport/TransportBar.tsx` | Under 200 |
| Pixel-identical screenshots | Playwright before/after screenshots of editor page | Match within tolerance |
