# UI Overhaul v1 — Arrangement Forge

## 1. Problem Statement

Arrangement Forge has a functional MVP — auth, library, editor, generation, transport, mixer — but the arrangement editor has critical layout and interaction deficiencies that make it unusable for its target user (a solo musician practicing with backing tracks).

**Starting state:** A working React app at `localhost:5173` with Supabase auth, 5-stem block sequencer, left panel with Input/Style/AI sections, transport bar, and mixer drawer. Generation produces blocks that render in the arrangement grid.

**What's wrong:**
1. The arrangement grid occupies ~380px of vertical space with ~400px of black void below it. Stem lanes are cramped at 56px while empty space dominates.
2. Clicking blocks and sections does not visibly switch the left panel to the inspector view (BlockContext/SectionContext). The core "click to inspect" workflow is broken or invisible.
3. Top bar metadata (Key, BPM, Time Sig) are static read-only chips — users can't change project parameters from the top bar.
4. No right-click context menus, no zoom controls, no split tool, no undo/redo buttons, no chord display toggle — all of which exist in the stores/specs but have no UI.
5. Transport and mixer are visible pre-generation, showing dead controls.
6. Library page uses different theme colors than the editor (visual mismatch on navigation).

**Target state:** An arrangement editor where: stem lanes dynamically fill available space, clicking blocks/sections switches the left panel to the appropriate inspector, the top bar has interactive parameter controls, and pre-gen vs post-gen states are visually distinct.

---

## 2. Acceptance Criteria

Each criterion is independently verifiable by a screenshot comparison or DOM inspection.

**AC-1: Stem lanes fill available space.** After generation, the 5 stem lanes + chord lane + section headers + bar ruler collectively fill from the top of the arrangement area to the transport bar. Zero visible black void between the bottom of the chord lane and the transport bar. Each lane is at least 80px tall at 1440×900 viewport with mixer collapsed.

**AC-2: Block selection triggers left panel inspector.** Clicking any block in a stem lane replaces the left panel content (Input/Style/AI) with the BlockContext inspector showing: instrument badge, bar range, volume slider, pan slider, chord override toggle, duplicate button, delete button, and a "Back" button to return to default view.

**AC-3: Section selection triggers left panel inspector.** Clicking any section header replaces the left panel content with the SectionContext inspector showing: section name (editable), bar count (+/- buttons), style override toggle with genre/substyle/sliders, and a "Back" button.

**AC-4: Escape returns to song context.** Pressing Escape with any block or section selected clears the selection and returns the left panel to the default (Input/Style/AI) view.

**AC-5: Pre-gen state hides post-gen chrome.** Before generation: transport bar, mixer drawer, arrangement toolbar are not rendered. Only the empty state message ("Ready to generate") and the left panel are visible.

**AC-6: Section headers show bar count.** Each section header is at least 40px tall and shows two lines: section name (bold) and "N bars" (muted).

**AC-7: Top bar Key is an interactive dropdown.** Clicking the Key chip opens a select with all 12 keys. Selecting a key updates `project.key` and all chord displays.

**AC-8: Top bar BPM is click-to-edit.** Clicking the BPM chip reveals a number input. Enter commits, Escape cancels. Range 40–240.

**AC-9: Chord display toggle exists.** A segmented control [A | I] in the top bar toggles `chordDisplayMode` between 'letter' and 'roman'. All chord displays in the arrangement, chord lane, and inspector update immediately.

**AC-10: Bar ruler shows every bar number.** Every bar in the ruler row displays its number (not just every 4th bar).

**AC-11: Library page uses forge theme.** Library page background, text, card, and button colors match the editor's forge dark theme (no DaisyUI default colors).

---

## 3. Constraint Architecture

### Musts
- Must use existing Zustand stores (`project-store`, `selection-store`, `ui-store`, `undo-store`) — do not create new stores
- Must use existing `BlockContext.tsx` and `SectionContext.tsx` components — they already have the inspector UI, they just need to be wired correctly
- Must use `formatChord()` from `src/lib/chords.ts` for all chord display
- Must use the forge theme color tokens from `src/styles/globals.css` — never hardcode hex colors that aren't from the theme
- Must preserve all existing keyboard shortcuts from `useKeyboardShortcuts`
- Must call `markDirty()` on all data mutations
- Must push undo entries for destructive operations (block delete, section delete, key change post-gen)

### Must-Nots
- Must not change the Supabase schema or API contracts
- Must not add new npm dependencies
- Must not modify store action signatures (other callers may depend on them)
- Must not break the existing generation flow (`useGenerate` hook)
- Must not add CSS-in-JS — Tailwind utilities + DaisyUI classes only
- Must not add default exports to non-page files
- Must not use browser `confirm()` / `alert()` — use `ConfirmDialog`

### Preferences
- Prefer refactoring `ArrangementView.tsx` from absolute positioning to flexbox for the lane layout — this makes dynamic height natural
- Prefer animating panel transitions (left panel switching from default → inspector) with a subtle fade or slide
- Prefer showing a brief flash/highlight on controls that change when the user switches context (helps orientation)
- Keep each component under 200 lines — extract sub-components if a file grows beyond that

### Escalation Triggers
- If `ArrangementView.tsx` exceeds 500 lines after refactoring, extract lane rendering into a `StemLane.tsx` component
- If the top bar exceeds 250 lines after adding interactive controls, extract parameter controls into a `ParamsBar.tsx` component
- If any acceptance criterion conflicts with an existing feature, stop and ask

---

## 4. Decomposition

Seven independently executable, testable tasks. Each produces a verifiable outcome.

### Task A: Dynamic stem lane height (AC-1, AC-6)
**Input:** Current `ArrangementView.tsx` with `LANE_H = 56` and absolute positioning.
**Output:** Lanes use flex layout, filling available vertical space. Section headers at 44px with two-line content.
**Files:** `src/components/arrangement/ArrangementView.tsx`
**Test:** At 1440×900 viewport with mixer collapsed, each lane ≥ 80px. No black void below chord lane.
**Estimated scope:** ~150 lines changed in ArrangementView.tsx. The outer layout shifts from absolute-positioned rows to a flex column. Each lane gets `flex-1` with a min-height. Block positioning within lanes stays absolute but uses the computed lane height instead of `LANE_H`.

### Task B: Left panel context switching (AC-2, AC-3, AC-4)
**Input:** `AppShell.tsx` has `panelContext` state and `onBlockSelect`/`onSectionSelect` callbacks. `LeftPanel.tsx` conditionally renders `BlockContext`/`SectionContext`. `BlockContext.tsx` and `SectionContext.tsx` exist with full inspector UI.
**Output:** Clicking a block visibly switches the left panel to BlockContext. Clicking a section switches to SectionContext. Escape clears selection and returns to default. The transition is visually obvious.
**Files:** `src/components/layout/AppShell.tsx`, `src/components/left-panel/LeftPanel.tsx`, `src/components/arrangement/ArrangementView.tsx`, `src/components/left-panel/BlockContext.tsx`, `src/components/left-panel/SectionContext.tsx`
**Test:** Click a drums block → left panel shows "DRUMS" badge, bar range, volume/pan sliders, delete button. Click "Back" → returns to Input/Style/AI. Click a section header → left panel shows section name input and style overrides.
**Debug hint:** If the panel doesn't switch, check that `onBlockSelect` in ArrangementView is passing the correct shape to `setPanelContext` in AppShell, and that `LeftPanel` is rendering `BlockContext` when `context.mode === 'block'`. The existing code is close — the issue is likely a mismatch between what `onBlockSelect` sends and what `LeftPanel` expects.

### Task C: Hide pre-gen chrome (AC-5)
**Input:** `AppShell.tsx` renders TransportBar and MixerDrawer unconditionally.
**Output:** Transport, mixer, and arrangement toolbar only render when `generationState === 'complete'`.
**Files:** `src/components/layout/AppShell.tsx`
**Test:** Load a project that hasn't been generated → only left panel and "Ready to generate" empty state visible. Click Generate → transport and mixer appear.
**Estimated scope:** ~5 lines changed. Wrap components in conditional render.

### Task D: Interactive top bar controls (AC-7, AC-8, AC-9)
**Input:** `TopBar.tsx` shows static metadata chips: `Key of C`, `♩ 120 bpm`, `Country`, `4/4`.
**Output:** Key is a dropdown select. BPM is click-to-edit. Chord display toggle [A | I] added. Genre and time sig stay as display chips for now.
**Files:** `src/components/layout/TopBar.tsx`
**Test:** Click Key chip → dropdown opens with 12 keys → select Bb → chord displays update. Click BPM → input appears → type 140 → Enter → BPM updates. Click [I] → all chords switch to Roman numerals.

### Task E: Bar ruler every-bar numbers (AC-10)
**Input:** Bar ruler in ArrangementView shows numbers only every 4 bars (`isMajor` check).
**Output:** Every bar shows its number. Major bars (every 4) are slightly bolder/larger.
**Files:** `src/components/arrangement/ArrangementView.tsx` — bar ruler render section
**Test:** A 16-bar arrangement shows numbers 1 through 16, all visible. Numbers at bars 1, 5, 9, 13 are slightly bolder.
**Estimated scope:** ~10 lines changed. Remove the `isMajor &&` guard on the number render, add conditional styling.

### Task F: Library page forge theme (AC-11)
**Input:** `LibraryPage.tsx` uses DaisyUI default classes (`bg-base-100`, `bg-base-200`, `btn-primary`).
**Output:** Library page uses forge theme variables (`bg-[#09090b]`, `bg-card`, `text-foreground`, `border-border`, etc.) matching the editor.
**Files:** `src/pages/LibraryPage.tsx`
**Test:** Navigate from Library to Editor and back — no visible theme flash or color mismatch.

### Task G: Block selection visual polish (AC-2 visual component)
**Input:** `sequencer-block.tsx` has `state: 'default' | 'hover' | 'selected'` with subtle border changes.
**Output:** Selected blocks have a 2px solid border in instrument color, brighter background, and a subtle glow. Unselected blocks dim slightly when any block is selected (focused vs unfocused contrast).
**Files:** `src/components/sequencer-block.tsx`
**Test:** Click a piano block → block has amber border + glow. Other blocks are slightly dimmed. Click away → all blocks return to default.

### Dependency order
```
C (trivial, do first)
  → A (layout, independent)
  → E (ruler, independent)
  → F (library, independent)
  → B (context switching — easier to verify once A makes lanes taller)
  → D (top bar controls, independent)
  → G (visual polish, do last)
```

Tasks A, C, E, F are independent and can be done in parallel.
Task B should follow A (taller lanes make selection testing easier).
Task G should be last (polish after functionality works).

---

## 5. Evaluation Design

### Test Case 1: Layout fills viewport
1. Open a generated project at 1440×900
2. Mixer collapsed
3. **Expected:** No black void visible between chord lane and transport bar. Each stem lane ≥ 80px tall.
4. Resize to 1024×768 → lanes shrink but remain ≥ 40px each. No overflow.

### Test Case 2: Block click → inspector → back
1. Click the drums block in bar 1
2. **Expected:** Left panel shows BlockContext with "DRUMS" badge, "Bars 1–8", volume slider, delete button.
3. Click "Back" button
4. **Expected:** Left panel shows Input / Style Controls / AI Assistant sections.

### Test Case 3: Section click → inspector → escape
1. Click the "Intro" section header
2. **Expected:** Left panel shows SectionContext with "Intro" name input, bar count, style overrides.
3. Press Escape
4. **Expected:** Section deselected, left panel returns to default.

### Test Case 4: Pre-gen state is clean
1. Create a new project (or load one that hasn't been generated)
2. **Expected:** Transport bar not visible. Mixer not visible. Only "Ready to generate" empty state + left panel.

### Test Case 5: Key dropdown transposes chords
1. Project is in Key of C, chord lane shows "Cmaj7", "Am7", "Dm7", etc.
2. Open Key dropdown in top bar, select "D"
3. **Expected:** Chord lane updates to "Dmaj7", "Bm7", "Em7", etc. (transposed up a whole step).

### Test Case 6: Chord display toggle
1. Chords showing letter names (Cmaj7, Dm7, G7)
2. Click [I] toggle in top bar
3. **Expected:** All chords switch to Roman numerals (Imaj7, ii7, V7).

### Test Case 7: Library theme consistency
1. Open Library page
2. **Expected:** Background is `#09090b` (near-black), text is light, cards use `bg-card` (#18181b). No white or light gray backgrounds.

---

## Intent Trace

**Structural:** The user's intent ("musician can edit an arrangement by clicking blocks and sections") surfaces at these code points:
- `ArrangementView.tsx` click handlers → `selectionStore.selectBlock()` → `AppShell.setPanelContext({mode:'block'})` → `LeftPanel` renders `BlockContext`
- Every link in this chain must work for the intent to be realized.

**Behavioral demo scenario:** A musician opens their project. The arrangement fills the screen. They click the piano block at bar 5 — the left panel instantly shows the piano inspector with chord "Dm7" and style "jazz_comp". They change the style to "block_chords", click Back, then click the Chorus section header. The left panel shows section properties. They increase the bar count from 8 to 12. They press Escape to return to song view. The entire flow takes under 10 seconds and requires zero prior knowledge of the UI.
