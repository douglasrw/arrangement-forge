# Fix: Scroll Reset After Section Delete

## Problem
When a user deletes a section via the selection inspector, the ArrangementView scrolls past the remaining content into empty space. The viewport should reset to show the remaining arrangement content, not blank space beyond the transport bar.

**User report:** "I deleted a section with the selection inspector and then I got scrolled down to no man's land."

## Root Cause
The delete flow (`SectionContext.handleDeleteSection` -> `projectStore.removeSection`) removes the section and its blocks from state, which causes `ArrangementView` to re-render with a smaller `GRID_W` (since `totalBars` decreases). However, the horizontal scroll container (`scrollRef` at `ArrangementView.tsx:202`) never clamps its `scrollLeft` to the new, shorter content width. If the user was scrolled rightward to view a later section, the `scrollLeft` value persists past the new content boundary, leaving the viewport over empty space.

Contributing factors:
1. **No scroll clamping on content resize.** The `ResizeObserver` in `ArrangementView` (lines 117-124) recalculates lane height and scrollable width, but never adjusts `scrollLeft`.
2. **Selection not cleared synchronously.** `removeSection` in `project-store.ts` (lines 135-144) does not clear the selection store. The selection is only cleared indirectly: `SectionContext` calls `onClose()`, which sets `panelContext` to `default` in `AppShell`, and then a `useEffect` (AppShell line 43-47) syncs the selection level back to `song` on the next render cycle. During that intermediate render, `selectedSectionId` still points at the deleted section.
3. **No post-deletion scroll-to-visible logic.** Neither the store action nor the UI component attempts to scroll to a valid position after the content shrinks.

## Acceptance Criteria
- [ ] After deleting a section, viewport scrolls to show remaining content (not empty space)
- [ ] If deleted section was the last one, scroll to top (leftmost position)
- [ ] If deleted section was in the middle, maintain approximate scroll position clamped to new content height
- [ ] No visual jump or flash during the scroll adjustment
- [ ] Selection is cleared after section deletion (synchronously, before re-render)

## Files to Modify
- **`src/components/arrangement/ArrangementView.tsx`** — Add a `useEffect` that clamps `scrollRef.scrollLeft` to `Math.min(scrollLeft, scrollWidth - clientWidth)` whenever `totalBars` changes. This is the primary fix.
- **`src/components/left-panel/SectionContext.tsx`** — Call `selectSong()` (from selection store) inside `handleDeleteSection` before `onClose()` so the selection is cleared synchronously with the deletion, not deferred to a parent `useEffect`.
- **`src/store/project-store.ts`** — (Optional) Clear selection inside `removeSection` action itself for defense-in-depth, since the deleted section ID should never linger in the selection store.

## Design Reference
- DESIGN_SYSTEM.md: Layout Patterns section

## Priority
P1 — breaks usability flow
