# Fix Editor Polish Issues

**Priority:** P2 — functional but needs visual polish
**Status:** OPEN

## Problem Statement

The editor views (top bar, left panel, center, bottom bar) are functional and mostly well-styled, but the Playwright visual audit (March 2026) identified three specific polish issues:

### 1. Slider value labels clipped (Left Panel)
The style control sliders in the left panel (Energy, Groove, Feel, etc.) have their right-edge value labels clipped. "Standard" renders as "Standar", "Natural" renders as "Natur". The text is being cut off by overflow hidden or insufficient container width.

### 2. Generate button lacks visual weight (Left Panel)
The "Generate" button at the top of the left panel appears as just an outline — it does not draw the eye as the primary call-to-action. It should use the Primary button style with a solid cyan background to signal that it is the main action.

### 3. A/I tab indicators unclear (Top Bar)
The "A" (Arrangement) and "I" (Input) tab indicators in the top bar lack a clear active/inactive state. The currently active tab should be visually distinct from the inactive one using the forge theme tab pattern.

## Acceptance Criteria

### 1. Slider value labels — no clipping
- [ ] All slider value labels render fully: "Standard", "Natural", "Straight", etc. — no truncation
- [ ] Fix: ensure the value label container has sufficient width or uses `whitespace-nowrap` with `overflow-visible`
- [ ] If the issue is a fixed-width container, widen it or switch to `min-w-fit` / `shrink-0`
- [ ] Test with the longest expected value label to confirm no clipping

### 2. Generate button — primary visual weight
- [ ] Generate button uses Primary button style: `bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors`
- [ ] Button is visually prominent — solid cyan background, not an outline
- [ ] Disabled state (if applicable): `opacity-50 cursor-not-allowed`
- [ ] If the button has an icon, ensure `gap-2` between icon and text

### 3. A/I tab indicators — clear active state
- [ ] Active tab: `bg-primary text-primary-foreground rounded-md px-4 py-1.5 text-sm font-medium` (per DESIGN_SYSTEM.md Tabs)
- [ ] Inactive tab: `text-muted-foreground hover:text-foreground rounded-md px-4 py-1.5 text-sm`
- [ ] Container: `flex gap-1 bg-secondary rounded-lg p-1`
- [ ] Active tab is visually distinct at a glance — no ambiguity about which view is selected

## Design Reference

- **DESIGN_SYSTEM.md** sections: Buttons (Primary), Tabs, Typography
- **Spacing:** Standard button padding `px-4 py-2`, tab padding `px-4 py-1.5`

## Constraints

- Must use forge theme tokens only — no hardcoded hex colors
- Must not change functional behavior — only visual styling
- Must preserve all keyboard shortcuts and click handlers

## Files to Modify

- `/data/projects/arrangement-forge/src/components/left-panel/StyleControlsSection.tsx` (slider labels, generate button)
- `/data/projects/arrangement-forge/src/components/layout/TopBar.tsx` (A/I tab indicators)

## Visual Verification

Agent must take Playwright screenshots of the editor view before and after changes. The after screenshots must show:
- All slider value labels fully visible (no clipping)
- Generate button with solid cyan background
- Clear active/inactive distinction on A/I tabs
