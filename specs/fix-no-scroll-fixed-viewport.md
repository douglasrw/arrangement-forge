# Fix: No-Scroll Fixed Viewport Layout

**Priority:** P1
**Status:** Ready
**Date:** 2026-03-05

---

## Problem Statement

The app currently allows the page body to scroll vertically. The left sidebar's three collapsible sections (Input, Style Controls, AI Assistant) stack vertically inside a single `overflow-y-auto` container. When all three are expanded, their combined height exceeds the viewport, causing the `overflow-y-auto` on the LeftPanel body to scroll internally. While the outer AppShell already has `h-screen overflow-hidden`, the left panel's internal scroll feels wrong for a DAW/sequencer. Professional DAWs (Ableton, Logic, FL Studio) use a fixed-viewport layout where every zone fills exactly its allocation with no scrolling except within designated scroll regions (e.g., horizontal arrangement scroll).

The core issue: the three left panel sections are independent `Collapsible` components that can all be open simultaneously, stacking their full content height. There is no accordion behavior to ensure only one section is expanded at a time, and the expanded section does not stretch to fill available space.

---

## Architecture

### Current Layout (What Exists)

```
AppShell (h-screen overflow-hidden flex flex-col)
  TopBar (flex-shrink-0)
  Middle row (flex flex-1 min-h-0)
    LeftPanel (w-[320px] h-full flex flex-col)
      Panel body (flex-1 overflow-y-auto)        <-- scrolls when sections are tall
        PanelSection "Input" (Collapsible, independent open state)
        PanelSection "Style Controls" (Collapsible, independent open state)
        PanelSection "AI Assistant" (Collapsible, flex-1 className)
      Collapse button (border-t, fixed at bottom)
    Center column (flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden)
      ArrangementView (flex-1 min-h-0 overflow-hidden)
      MixerDrawer
      TransportBar
  StatusBar (flex-shrink-0)
```

### Target Layout (What We Want)

```
AppShell (h-screen overflow-hidden flex flex-col)      -- NO CHANGE
  TopBar (flex-shrink-0)                                -- NO CHANGE
  Middle row (flex flex-1 min-h-0)                      -- NO CHANGE
    LeftPanel (w-[320px] h-full flex flex-col overflow-hidden)
      Panel body (flex-1 flex flex-col overflow-hidden min-h-0)   <-- NO scroll on container
        [default mode] Accordion sections:
          Section header "Input" (shrink-0, clickable)
          Section header "Style Controls" (shrink-0, clickable)
          Section header "AI Assistant" (shrink-0, clickable)
          -- Only ONE section body is visible at a time --
          Expanded section body (flex-1 min-h-0 overflow-y-auto)  <-- scroll ONLY here
        [inspector mode] SectionContext / BlockContext              -- NO CHANGE
      Collapse button (shrink-0, border-t)               -- NO CHANGE
    Center column                                         -- NO CHANGE
      ArrangementView                                     -- NO CHANGE
      MixerDrawer                                         -- NO CHANGE
      TransportBar                                        -- NO CHANGE
  StatusBar (flex-shrink-0)                               -- NO CHANGE
```

### Key Design Decisions

1. **Accordion behavior:** Only one section expanded at a time. Clicking a collapsed section header expands it and collapses the others. Clicking an already-expanded section header collapses it (all collapsed state is valid).

2. **State management:** Move the active section state from local `useState` in `PanelSection` to a single `expandedSection` state in `LeftPanel`. The `PanelSection` component becomes a controlled component receiving `isOpen` and `onToggle` props.

3. **Default expanded section:** `"input"` pre-generation (most used for setup), `"style"` post-generation (most used for tweaking). Derive from `uiStore.generationState`.

4. **Expanded section fills available space:** The expanded section's content wrapper gets `flex-1 min-h-0 overflow-y-auto` so it stretches to fill all space not occupied by collapsed headers and the collapse button. Internal scrolling happens only within this wrapper.

5. **Radix Collapsible stays:** Keep using `@radix-ui/react-collapsible` for the open/close animation. Just wire `open` prop from parent instead of local state.

6. **No ui-store changes needed.** The accordion state is purely local to the left panel in default mode. No need to persist which section is expanded across routes or sessions.

7. **Inspector modes unaffected.** When `context.mode` is `"section"` or `"block"`, the panel shows `SectionContext`/`BlockContext` directly -- no accordion. This path is unchanged.

---

## Acceptance Criteria

- [ ] The page never scrolls vertically under any circumstance (html, body, and AppShell all `overflow: hidden`)
- [ ] Left panel sections use accordion behavior: only one section expanded at a time
- [ ] Clicking a collapsed section header expands it and collapses others
- [ ] Clicking an already-expanded section header collapses it (all-collapsed is valid)
- [ ] The expanded section body stretches to fill all available vertical space between the collapsed headers and the collapse button
- [ ] The expanded section body scrolls internally (`overflow-y-auto`) if its content exceeds available height
- [ ] Collapsed sections show only their header bar (no content visible)
- [ ] Default expanded section is "Input" when `generationState !== 'complete'`, "Style Controls" when `generationState === 'complete'`
- [ ] Inspector modes (section context, block context) are unaffected -- they fill the panel body as before
- [ ] Center area continues to scroll horizontally for the arrangement grid
- [ ] Center area never scrolls vertically
- [ ] TransportBar and StatusBar remain pinned to the bottom of the viewport
- [ ] MixerDrawer continues to expand/collapse without causing page scroll
- [ ] No visual regressions in any left panel section content (Input, Style Controls, AI Assistant)
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes

---

## Files to Modify

### 1. `src/components/left-panel/LeftPanel.tsx` (PRIMARY)

**Changes:**
- Add `expandedSection` state: `type AccordionSection = 'input' | 'style' | 'ai' | null`
- Initialize based on `generationState` from `useUiStore`
- Refactor `PanelSection` to accept `isOpen: boolean` and `onToggle: () => void` instead of managing its own `useState`
- Remove `defaultOpen` prop from `PanelSection`
- Change the panel body container from `overflow-y-auto` to `overflow-hidden`
- In default mode, render all three section headers always visible (`shrink-0`), with only the expanded section's content visible and receiving `flex-1 min-h-0 overflow-y-auto`
- Wire accordion toggle: clicking a section either expands it (collapsing others) or collapses it if already open

**Layout structure for default mode:**
```tsx
<div className="flex flex-1 flex-col overflow-hidden min-h-0 p-2 gap-2">
  {/* Input section */}
  <PanelSection title="Input" isOpen={expanded === 'input'} onToggle={() => toggle('input')}
    className={expanded === 'input' ? 'flex-1 min-h-0' : ''}>
    <InputSection />
  </PanelSection>

  {/* Style Controls section */}
  <PanelSection title="Style Controls" isOpen={expanded === 'style'} onToggle={() => toggle('style')}
    className={expanded === 'style' ? 'flex-1 min-h-0' : ''}>
    <StyleControlsSection />
  </PanelSection>

  {/* AI Assistant section */}
  <PanelSection title="AI Assistant" isOpen={expanded === 'ai'} onToggle={() => toggle('ai')}
    className={expanded === 'ai' ? 'flex-1 min-h-0' : ''}>
    <AiAssistantSection />
  </PanelSection>
</div>
```

### 2. `src/components/left-panel/AiAssistantSection.tsx` (MINOR)

**Changes:**
- Remove the hardcoded `style={{ maxHeight: 260 }}` on the `ScrollArea`. The accordion layout now controls the available height externally. The `ScrollArea` should use `flex-1 min-h-0` to fill whatever space the accordion gives it.
- Ensure the component's root div uses `flex-1 flex flex-col min-h-0 overflow-hidden` to participate in the flex layout.

### 3. `src/components/left-panel/InputSection.tsx` (MINOR, MAYBE)

**Changes:**
- Ensure the root container can participate in flex layout. Currently `flex flex-col gap-3` which should be fine. May need `overflow-y-auto` if the chord palette content is very tall. Verify after accordion is wired up.

### 4. `src/components/left-panel/StyleControlsSection.tsx` (MINOR, MAYBE)

**Changes:**
- Same as InputSection -- verify content fits or scrolls within the accordion-allocated space.

---

## Migration Notes

### LeftPanel.tsx -- Detailed Changes

1. **Import `useUiStore`** (already used indirectly via props, but need `generationState` for default section)
2. **Replace `PanelSection` internal state** with controlled props:
   - Remove: `const [open, setOpen] = useState(defaultOpen)`
   - Add props: `isOpen: boolean`, `onToggle: () => void`
   - Pass to `Collapsible`: `open={isOpen}` `onOpenChange={() => onToggle()}`
3. **Add `CollapsibleContent` flex behavior:**
   - When open, the content wrapper needs `flex-1 min-h-0 overflow-y-auto`
   - The `PanelSection` root div needs conditional `flex-1 min-h-0` when open to stretch
   - Use `flex flex-col` on the PanelSection root so content can flex
4. **Replace panel body `overflow-y-auto` with `overflow-hidden`** on the default mode container
5. **Add accordion state and toggle logic:**
   ```tsx
   type AccordionSection = 'input' | 'style' | 'ai' | null
   const generationState = useUiStore((s) => s.generationState)
   const defaultSection: AccordionSection = generationState === 'complete' ? 'style' : 'input'
   const [expanded, setExpanded] = useState<AccordionSection>(defaultSection)
   const toggle = (section: AccordionSection) => {
     setExpanded((prev) => prev === section ? null : section)
   }
   ```

### AiAssistantSection.tsx -- Detailed Changes

1. **Remove `style={{ maxHeight: 260 }}`** from the `ScrollArea`
2. **Ensure `ScrollArea` uses `className="flex-1 min-h-0"`** so it fills available space dynamically

### No Changes Required

- `AppShell.tsx` -- already has correct `h-screen overflow-hidden` layout
- `globals.css` -- already has `html, body { height: 100%; overflow: hidden; }`
- `ArrangementView.tsx` -- already uses `flex-1 min-h-0 overflow-hidden` with horizontal-only scroll
- `TransportBar.tsx` -- already `shrink-0` in the flex column
- `MixerDrawer.tsx` -- already manages its own expand/collapse
- `StatusBar.tsx` -- already `shrink-0` at the bottom of AppShell
- `ui-store.ts` -- no new state needed; accordion state is local to LeftPanel
- `SectionContext.tsx`, `BlockContext.tsx` -- inspector modes bypass the accordion entirely

---

## Risks

- **Collapsible animation height:** Radix `CollapsibleContent` animates between 0 and auto height. When the content wrapper also has `flex-1`, the animation target height comes from the flex layout rather than intrinsic content height. Test that the open/close animation still works smoothly. If not, may need to disable animation (`forceMount` + CSS transition) or use a fixed-duration CSS transition on `max-height`.
- **ChordPalette height:** The ChordPalette in InputSection can be quite tall (grid of chord buttons). Verify it scrolls properly within the accordion-allocated space. May need `overflow-y-auto` on InputSection's root.
