# UI/UX Scout Report -- 2026-03-04

## Component Inventory

| Component | File | Lines | State Handling | Accessibility | Theme Compliance |
|-----------|------|-------|----------------|---------------|------------------|
| AppShell | `src/components/layout/AppShell.tsx` | 71 | Auto-save timer, selection sync | No issues | Hardcoded `bg-[#09090b]` (line 45) instead of `bg-background` |
| TopBar | `src/components/layout/TopBar.tsx` | 358 | Editable name, BPM, dropdown menu | Good: sr-only labels, role="radiogroup", aria-labels on buttons | Mostly tokens; 2 hardcoded hex (`#0891b2`, `#4ade80`, `#fbbf24` lines 222, 246, 267) |
| StatusBar | `src/components/layout/StatusBar.tsx` | 53 | Status prop only (not wired to uiStore) | None needed | **Heavy hardcoding**: 7 hardcoded hex values (lines 10-11, 17-18, 34, 41, 45, 50) |
| LeftPanel | `src/components/left-panel/LeftPanel.tsx` | 151 | Context mode switching | Collapse button has no aria-label | Uses theme tokens well |
| InputSection | `src/components/left-panel/InputSection.tsx` | 127 | Tab switching, generation wiring | Labels present on textareas | Hardcoded `#0891b2`, `#14b8a6`, `#27272a`, `#09090b` (lines 37, 75, 119-121) |
| ChordPalette | `src/components/left-panel/ChordPalette.tsx` | 502 | Complex: progression building, builder mode, manual mode | Labels on inputs; aria-label on remove buttons | Heavy hardcoding: `#06b6d4`, `#0891b2`, `#71717a` (lines 68, 175-176, 230-231, 339-340) |
| StyleControlsSection | `src/components/left-panel/StyleControlsSection.tsx` | 158 | Genre/sub-style wired to projectStore | Labels on selects and sliders | Hardcoded `#0891b2` (lines 128-129); mixed token/hex usage |
| SectionContext | `src/components/left-panel/SectionContext.tsx` | 323 | Name editing, bar count, style overrides | Labels on name input, genre/substyle selects | **Heavy hardcoding**: `#71717a`, `#3f3f46`, `#27272a`, `#f4f4f5`, `#0891b2`, `#a1a1aa`, `#52525b` throughout |
| BlockContext | `src/components/left-panel/BlockContext.tsx` | 327 | Volume/pan sliders, chord override toggle | Labels present but `htmlFor` mismatched (no matching `id` on range inputs) | **Heavy hardcoding**: `#06b6d4`, `#34d399`, `#fbbf24`, `#a78bfa`, `#14b8a6`, `#3f3f46`, `#71717a`, `#a1a1aa`, `#e4e4e7`, `#f4f4f5` |
| AiAssistantSection | `src/components/left-panel/AiAssistantSection.tsx` | 149 | Chat messages (hardcoded initial data) | Label on input field | Hardcoded `#0891b2` (lines 19-24, 93, 104, 140) |
| ArrangementView | `src/components/arrangement/ArrangementView.tsx` | 431 | ResizeObserver layout, selection, playhead | No aria-labels on blocks or section headers | **Heaviest hardcoding**: 31 hardcoded hex values |
| ChordLane | `src/components/arrangement/ChordLane.tsx` | 78 | Derives from projectStore | Tooltips on chords | Uses DaisyUI tokens (`base-content`, `base-200`, `base-300`) -- **WRONG THEME**: should use forge tokens not wireframe/DaisyUI base-* |
| SequencerBlock | `src/components/sequencer-block.tsx` | 75 | Selection state styling | Has `focus-visible` ring | Inline styles for all colors (instrument palette); acceptable for dynamic values |
| TransportBar | `src/components/transport/TransportBar.tsx` | 246 | Play/pause, BPM edit, loop, metronome | Good: aria-labels on all buttons, aria-pressed on toggles | **Heavy hardcoding**: `#3f3f46`, `#27272a`, `#71717a`, `#a1a1aa`, `#e4e4e7`, `#14b8a6`, `#5eead4`, `#52525b`, `#0891b2`, `#09090b` |
| Scrubber | `src/components/transport/Scrubber.tsx` | 22 | Value/max props | Missing label and id | Uses DaisyUI classes (`range range-primary`) |
| MixerDrawer | `src/components/mixer/MixerDrawer.tsx` | 390 | Channel state, drum sub-mix, audio engine wiring | Good: role="slider", aria-valuenow/min/max, keyboard support on faders, labels on drum sub-mix | **Heavy hardcoding**: `#06b6d4`, `#34d399`, `#fbbf24`, `#a78bfa`, `#14b8a6`, `#3f3f46`, `#27272a`, etc. |
| ConfirmDialog | `src/components/shared/ConfirmDialog.tsx` | 122 | Open/close, Escape key | Good: role="dialog", aria-modal, aria-labelledby/describedby | Hardcoded hex values but acceptable for a modal overlay |
| ScopeBadge | `src/components/shared/ScopeBadge.tsx` | 42 | None (stateless) | None needed | Hardcoded hex values for scope colors |
| ProjectCard | `src/components/library/ProjectCard.tsx` | 91 | None (stateless) | `aria-label="More options"` on ellipsis | Uses `zinc-*` Tailwind palette -- inconsistent with forge theme tokens |
| LoginPage | `src/pages/LoginPage.tsx` | 145 | Form state, loading, error | **Missing `id` on email and password inputs; labels use DaisyUI `label-text` but no `htmlFor`** | Uses DaisyUI base-* tokens (wireframe era) |
| LibraryPage | `src/pages/LibraryPage.tsx` | 230 | Projects list, search, sort, delete confirm | Good: labels on search/sort | Uses forge theme tokens (bg-card, text-foreground) |
| SettingsPage | `src/pages/SettingsPage.tsx` | 188 | Profile form | **Missing `id` on display name input; radio buttons missing `id`/`htmlFor`** | Uses DaisyUI base-* tokens (wireframe era) |
| EditorPage | `src/pages/EditorPage.tsx` | 15 | Loads project on mount | N/A | N/A |

---

## Interaction Gaps

### 1. No right-click context menu on sections or blocks
- **File**: `src/components/arrangement/ArrangementView.tsx`
- **Impact**: Users must navigate to the left panel inspector to access actions like Delete, Duplicate, Split, or style override. A context menu on right-click would dramatically improve workflow speed.

### 2. No drag-to-reorder sections
- **File**: `src/components/arrangement/ArrangementView.tsx` (lines 211-249)
- **Impact**: Section headers are clickable for selection but there is no drag handle or drag-drop reordering. The `reorderSections()` store method exists (project-store.ts line 129) but is never wired to UI.

### 3. No drag-to-reorder blocks or drag-to-resize blocks
- **File**: `src/components/arrangement/ArrangementView.tsx` (lines 336-370)
- **Impact**: Blocks cannot be moved between sections or resized by dragging edges. Split is available via keyboard shortcut only.

### 4. No multi-select for blocks
- **File**: `src/store/selection-store.ts`
- **Impact**: `selectionStore` only tracks a single `blockId`. Users cannot Shift+click or Cmd+click to select multiple blocks for batch operations (delete, style change, etc.).

### 5. "Delete Section" and "Delete Block" buttons are not wired
- **File**: `src/components/left-panel/SectionContext.tsx` (line 315) -- `<button>Delete Section</button>` has no `onClick`
- **File**: `src/components/left-panel/BlockContext.tsx` (line 319-322) -- `<button>Delete Block</button>` has no `onClick`, and `<button>Duplicate Block</button>` (line 312-316) also has no `onClick`
- **Impact**: Users see action buttons that do nothing. Destructive actions only work via keyboard shortcut (Delete/Backspace for blocks, none for sections).

### 6. "Sign out" in TopBar does not actually sign out
- **File**: `src/components/layout/TopBar.tsx` (lines 342-349)
- **Impact**: The "Sign out" button calls `saveProject()` and closes the menu, but does not call `signOut()` from `useAuth`. The user stays logged in.

### 7. Settings gear button does nothing
- **File**: `src/components/layout/TopBar.tsx` (lines 313-319)
- **Impact**: The Settings gear icon button has no `onClick` handler. It should navigate to `/settings`.

### 8. Loop and Metronome toggles are cosmetic only
- **File**: `src/components/transport/TransportBar.tsx` (lines 53-54, 208-237)
- **Impact**: `loopActive` and `metronomeActive` are local `useState` booleans not connected to the audio engine. Toggling them changes the UI appearance but has no effect on playback.

### 9. StatusBar is not wired to application state
- **File**: `src/components/layout/StatusBar.tsx` (line 28)
- **Impact**: StatusBar takes a `status` prop defaulting to `"saved"`, but `AppShell` does not pass the actual `systemStatus` from `uiStore`. The status bar always shows "Saved".

### 10. Zoom controls have no visual effect
- **File**: `src/hooks/useKeyboardShortcuts.ts` (lines 69-88)
- **Impact**: `zoomIn`, `zoomOut`, and `zoomFitAll` store methods update `zoomIndex` in `uiStore`, but `ArrangementView` does not read `zoomIndex`. Bar width is computed from container width, ignoring zoom state.

### 11. Tool mode (select/split) has no visual indicator or behavior
- **File**: `src/hooks/useKeyboardShortcuts.ts` (lines 116-117)
- **Impact**: Pressing `V` sets `toolMode` to `select` and `S` sets it to `split`, but no component reads `toolMode` to change cursor or block click behavior. Split mode has no effect.

### 12. AI Assistant is a stub with hardcoded messages
- **File**: `src/components/left-panel/AiAssistantSection.tsx` (lines 27-51)
- **Impact**: Initial messages are hardcoded dummy data. User messages are appended to local state but receive no AI response. Acceptable for MVP but should show a clear "AI responses coming soon" indicator.

### 13. "More options" on ProjectCard has no menu
- **File**: `src/components/library/ProjectCard.tsx` (lines 82-87)
- **Impact**: The triple-dot ellipsis has `aria-label="More options"` but is a `<span>` not a `<button>`, and has no click handler. It's purely visual.

---

## Polish Issues

### Hardcoded hex colors vs theme tokens
**196 hardcoded hex color occurrences** across 16 component files. The forge theme defines CSS custom properties in `globals.css` (lines 26-48) and Tailwind maps them to semantic classes like `bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`, etc. However, the majority of components use raw hex values instead:

- `#09090b` should be `bg-background` (used in AppShell, ArrangementView, InputSection, TransportBar)
- `#18181b` should be `bg-card` (ArrangementView, TransportBar, MixerDrawer, ConfirmDialog)
- `#27272a` should be `bg-secondary` or `bg-muted` (throughout)
- `#3f3f46` should be `border-border` or `bg-input` (throughout)
- `#a1a1aa` should be `text-muted-foreground` (throughout)
- `#f4f4f5` is close to `text-foreground` (`#fafafa`)
- `#71717a` is darker than `text-muted-foreground` -- not mapped to any token
- `#52525b` is used for secondary borders and text -- not mapped to any token

### Theme inconsistency between pages
- **LoginPage** and **SettingsPage** use DaisyUI classes (`bg-base-100`, `bg-base-200`, `border-base-300`, `text-base-content`, `input input-bordered`, `btn btn-primary`) which are from the wireframe/DaisyUI theme system.
- **ChordLane** also uses `base-content`, `base-200`, `base-300` classes.
- The rest of the editor uses the custom forge CSS variable system (`bg-card`, `text-foreground`, `border-border`).
- These two systems will visually conflict if DaisyUI's theme is not perfectly aligned with the forge CSS variables.

### Missing empty states
- **BlockContext**: No empty state when `liveBlock` is null and fallback props are used -- the inspector shows potentially stale data.
- **SectionContext**: No "section not found" state if `sectionId` from selection store doesn't match any section.

### Visual inconsistencies
1. **Font size inconsistency in labels**: `text-[10px]` in BlockContext/SectionContext vs `text-[11px]` in StyleControlsSection. Both are "label" text for sliders.
2. **Slider thumb opacity**: StyleControlsSection sliders (line 144) hide thumb until hover (`opacity-0 → group-hover:opacity-100`). BlockContext sliders always show the thumb. Inconsistent UX.
3. **Border radius inconsistency**: InputSection "Generate" button uses `rounded-xl`, TransportBar play button uses `rounded-lg`, TopBar buttons use `rounded-md` and `rounded-lg` interchangeably.
4. **StatusBar height** (24px, `h-6`) vs **TransportBar height** (48px, `h-12`): Proportionally fine, but the status bar could be integrated into the transport bar to save vertical space.
5. **ProjectCard** uses `zinc-*` Tailwind colors instead of the forge theme tokens, creating a subtle color mismatch on the library page.

---

## MixerDrawer Deep Dive

**File**: `/data/projects/arrangement-forge/src/components/mixer/MixerDrawer.tsx` (390 lines)

### Strengths
- **Audio engine integration**: Properly wires volume, mute, and solo to `engine.setVolume()`, `engine.setMute()`, `engine.setSolo()` (lines 222-228).
- **Vertical faders**: Custom-built with mouse drag interaction and keyboard support (ArrowUp/ArrowDown). Proper `role="slider"` and ARIA attributes (lines 82-87).
- **Drum sub-mix**: Innovative feature -- collapsible per-voice-group sliders (Kick, Snare, Hi-Hat, Cymbals, Toms) that control `drumKit.setVoiceGroupGain()` (lines 156-201).
- **Level meters**: Visual LR meters on master channel that respond to playback state (lines 124-143, 351).
- **Labels**: All drum sub-mix sliders have proper `htmlFor` and `id` attributes (lines 181-187).

### Issues
1. **Channel state is local, not persistent** (line 210): `useState(DEFAULT_CHANNELS)` means mixer settings reset on component remount or page reload. Should sync with `projectStore` stem volume/pan/mute/solo fields.
2. **No pan control**: The channel strips show Volume, Mute, and Solo, but no pan knob/slider. The `Stem` type has a `pan` field (`-1.0` to `1.0`) and `BlockContext` has a pan slider, but the mixer -- where pan belongs most naturally -- omits it.
3. **Missing mixer toggle button/label**: The toggle header (lines 239-251) uses `<button>` wrapping "Mixer" text and an X/bar icon. The button has no `aria-label` or `aria-expanded`.
4. **Mute/Solo buttons lack aria-labels**: The M/S buttons (lines 295-318) have no `aria-label`. Screen readers would announce "M" and "S" with no context.
5. **Level meter is not real**: `LevelMeter` fill is computed as `channels.master.volume * 0.9` when playing (line 351) -- it's a static representation of the volume knob, not actual audio levels. This is misleading: it looks like a VU meter but doesn't meter real audio.
6. **Hardcoded colors throughout**: 30 hex color literals. Instrument colors are acceptable (dynamic theming per instrument), but structural colors like `#18181b`, `#27272a`, `#3f3f46` should use tokens.
7. **No keyboard navigation between strips**: Tab can reach faders (they have `tabIndex={0}`), but there's no logical tab order grouping or skip navigation between channel strips.
8. **Drawer open state is local** (line 208): `useState(true)` means the mixer is always open on mount, and its state isn't preserved across route changes. Should read from `uiStore.mixerExpanded`.
9. **`toggleMixer()` from keyboard shortcut (`M` key) does not control this drawer**: `useKeyboardShortcuts.ts` calls `uiStore.toggleMixer()`, but `MixerDrawer` uses local `open` state. They're disconnected.

---

## TODO/FIXME/HACK Audit

| Marker | File | Line | Content |
|--------|------|------|---------|
| TODO | `src/components/left-panel/BlockContext.tsx` | 198 | `// TODO: wire when Block type gets a chordOverride field` |

Only 1 TODO found in component code. However, several areas have implicit "unwired" behavior that should arguably be marked as TODOs (see Interaction Gaps section).

---

## Accessibility Issues

### Critical

1. **LoginPage inputs missing `id` and `htmlFor`**: The email and password inputs (`src/pages/LoginPage.tsx` lines 81-104) have no `id` attributes. Their parent `<label>` elements use DaisyUI's `label-text` class but no `htmlFor`. This violates the CLAUDE.md must: "Must give every `<input>` and `<textarea>` a unique `id` attribute and a corresponding `<label htmlFor={id}>`."

2. **SettingsPage inputs missing `id` and `htmlFor`**: The display name input (`src/pages/SettingsPage.tsx` line 77) has no `id`. Radio buttons for chord display mode (lines 94, 104) have no `id`. Genre select (line 122) has no `id`. All `<label>` elements lack `htmlFor`.

3. **Scrubber input missing `id` and label**: `src/components/transport/Scrubber.tsx` line 11 -- the range input has no `id` and no associated `<label>`.

### Moderate

4. **BlockContext `htmlFor` mismatch**: Labels at lines 251 and 267 reference `"block-volume-slider"` and `"block-pan-slider"`, but the `InstrumentSlider` component's `<input type="range">` (line 69) has no `id` attribute. The `htmlFor` points to nothing.

5. **SectionContext sliders missing `id` association**: Slider labels at lines 267-271 (`Energy`, `Groove`, etc.) are `<span>` elements, not `<label>` elements with `htmlFor`. The range inputs (line 284) have `id` attributes (`section-slider-{label}`) but no corresponding `<label htmlFor>`.

6. **MixerDrawer toggle missing `aria-expanded`**: The mixer open/close button (line 239) should have `aria-expanded={open}` and `aria-label="Toggle mixer"`.

7. **MixerDrawer M/S buttons missing `aria-label`**: Mute buttons (line 296) should have `aria-label={ch.muted ? "Unmute drums" : "Mute drums"}`. Same for Solo buttons (line 308).

8. **MixerDrawer M/S buttons missing `aria-pressed`**: These are toggle buttons but lack `aria-pressed` state.

9. **LeftPanel collapse button missing `aria-label`**: Line 142 -- the collapse trigger button has text content but no `aria-label` for the collapsed state.

10. **ArrangementView section headers**: Section header buttons (lines 215-248) have no `aria-label` beyond their text content. When selected, there's no `aria-selected` or `aria-current` attribute.

11. **ConfirmDialog focus trap**: The dialog (ConfirmDialog.tsx) closes on Escape and backdrop click, but does not trap focus within the dialog. Tab can escape to elements behind the overlay.

### Minor

12. **ProjectCard "More options"**: `src/components/library/ProjectCard.tsx` line 82 -- uses `<span>` with `aria-label` but should be a `<button>` for keyboard accessibility.

---

## Recommended UI Improvements (Prioritized)

### Quick Wins (< 1 hour each)

1. **Wire the StatusBar to uiStore** -- Pass `systemStatus` from `uiStore` to `StatusBar` in `AppShell.tsx`. Currently always shows "Saved". (Files: `src/components/layout/AppShell.tsx` line 68, `src/components/layout/StatusBar.tsx`)

2. **Wire "Delete Section" button** -- Add `onClick` to the Delete Section button in SectionContext that calls `removeSection(liveSection.id)` with undo and a ConfirmDialog. (File: `src/components/left-panel/SectionContext.tsx` line 315)

3. **Wire "Delete Block" and "Duplicate Block" buttons** -- Add `onClick` handlers calling `deleteBlock()` and `duplicateBlock()` with undo. (File: `src/components/left-panel/BlockContext.tsx` lines 312-322)

4. **Fix "Sign out" to actually sign out** -- Import and call `signOut()` from `useAuth` instead of `saveProject()`. (File: `src/components/layout/TopBar.tsx` lines 342-349)

5. **Wire Settings gear button** -- Add `onClick={() => navigate('/settings')}`. (File: `src/components/layout/TopBar.tsx` line 314)

6. **Connect MixerDrawer to `uiStore.mixerExpanded`** -- Replace `useState(true)` with `useUiStore((s) => s.mixerExpanded)` so the `M` keyboard shortcut works. (File: `src/components/mixer/MixerDrawer.tsx` line 208)

7. **Add `id` and `htmlFor` to LoginPage inputs** -- Add `id="login-email"` and `id="login-password"` to the inputs, update labels with `htmlFor`. (File: `src/pages/LoginPage.tsx` lines 78-104)

8. **Add `id` and `htmlFor` to SettingsPage inputs** -- Add `id="settings-display-name"`, `id="settings-chord-letter"`, `id="settings-chord-roman"`, `id="settings-genre"`. (File: `src/pages/SettingsPage.tsx`)

9. **Add `aria-expanded` and `aria-label` to MixerDrawer toggle** -- `aria-expanded={open}` and `aria-label="Toggle mixer"` on the header button. (File: `src/components/mixer/MixerDrawer.tsx` line 239)

10. **Add `aria-label` and `aria-pressed` to M/S buttons** -- e.g., `aria-label="Mute drums"` and `aria-pressed={ch.muted}`. (File: `src/components/mixer/MixerDrawer.tsx` lines 296, 308)

11. **Fix BlockContext slider label mismatch** -- Add `id` prop to `InstrumentSlider` and pass it through to the `<input type="range">`. (File: `src/components/left-panel/BlockContext.tsx` lines 29-128)

### Medium Effort (1-4 hours each)

12. **Replace hardcoded hex colors with theme tokens across all components** -- Systematically replace `#09090b` with `bg-background`, `#18181b` with `bg-card`, `#27272a` with `bg-secondary`, `#3f3f46` with `border-border`, `#a1a1aa` with `text-muted-foreground`, etc. Add missing tokens for `#71717a` and `#52525b` to globals.css. (196 occurrences across 16 files)

13. **Unify LoginPage and SettingsPage to use forge theme tokens** -- Replace DaisyUI `base-*` classes with forge CSS variable classes (`bg-background`, `bg-card`, `text-foreground`, etc.). Also fix ChordLane.tsx which uses `base-content`, `base-200`, `base-300`. (Files: `src/pages/LoginPage.tsx`, `src/pages/SettingsPage.tsx`, `src/components/arrangement/ChordLane.tsx`)

14. **Add pan control to MixerDrawer channel strips** -- Add a horizontal pan knob or slider below the fader for each instrument channel. Wire to `engine.setPan()`. (File: `src/components/mixer/MixerDrawer.tsx`)

15. **Persist mixer channel state to projectStore** -- Sync `volume`, `pan`, `isMuted`, `isSolo` from the mixer's local state to `projectStore.updateStem()` so mixer settings persist. (Files: `src/components/mixer/MixerDrawer.tsx`, `src/store/project-store.ts`)

16. **Wire loop toggle to audio engine** -- Connect `loopActive` in TransportBar to `engine.setLoop()` or equivalent. (Files: `src/components/transport/TransportBar.tsx`, `src/audio/engine.ts`)

17. **Wire metronome toggle to audio engine** -- Connect `metronomeActive` in TransportBar to `engine.enableMetronome()`. (Files: `src/components/transport/TransportBar.tsx`, `src/audio/engine.ts`, `src/audio/metronome.ts`)

18. **Wire zoom to ArrangementView** -- Read `zoomIndex` and `ZOOM_STEPS` from `uiStore` and multiply `effectiveBarW` by the zoom factor. (Files: `src/components/arrangement/ArrangementView.tsx`, `src/store/ui-store.ts`)

19. **Add focus trap to ConfirmDialog** -- Trap Tab/Shift+Tab within the modal when open. Focus the cancel button on open, return focus on close. (File: `src/components/shared/ConfirmDialog.tsx`)

20. **Add "AI responses coming soon" indicator** -- When the user sends a message and receives no AI response, show a subtle placeholder message. (File: `src/components/left-panel/AiAssistantSection.tsx`)

### Larger Projects (need their own spec)

21. **Right-click context menu on blocks and sections** -- Create a `ContextMenu` component triggered by `onContextMenu` on block and section elements. Actions: Delete, Duplicate, Split, Merge, Set Style, Select Section. Requires a new shared component and wiring across ArrangementView, SectionHeaders, and SequencerBlock.

22. **Drag-to-reorder sections** -- Add drag handles on section headers with HTML5 drag-and-drop or a library like `dnd-kit`. Wire to `projectStore.reorderSections()`. Requires visual drag feedback (ghost element, drop indicators).

23. **Multi-select blocks** -- Extend `selectionStore` to support `selectedBlockIds: Set<string>`. Add Shift+click (range select) and Cmd+click (toggle select). Update ArrangementView, BlockContext, and keyboard shortcuts to handle multi-selection. Batch operations (delete all, style change all).

24. **Split tool mode cursor and click behavior** -- When `toolMode === 'split'`, show a crosshair cursor on blocks, and clicking a block calls `splitBlock(blockId, clickedBar)` at the bar the user clicked. Requires hit-testing the click position against bar grid.

25. **Real-time VU meters in mixer** -- Replace the fake level meter with actual audio analysis using `Tone.Meter` or `AnalyserNode`. Show per-channel and master peak/RMS meters that respond to live audio. Performance-sensitive; needs requestAnimationFrame rendering.

26. **Responsive/mobile layout** -- Currently deferred per ARCHITECTURE.md, but `useMobile.ts` hook exists and is unused. When ready: collapse left panel to a drawer, stack transport/mixer vertically, hide bar numbers on small screens.
