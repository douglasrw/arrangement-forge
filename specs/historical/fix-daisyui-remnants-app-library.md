# Fix DaisyUI Remnants in App Shell and Library Page

## Problem Statement

After the DaisyUI removal, several files still reference DaisyUI utility classes that no longer resolve to any CSS. These are scattered across `App.tsx` (loading screen) and `LibraryPage.tsx` (loading spinners). Because DaisyUI is not installed, these classes are no-ops, meaning:

- The loading screen in `App.tsx` uses `bg-base-100` (no background applied) and `loading loading-spinner loading-lg` (no spinner animation -- user sees nothing while auth initializes)
- The LibraryPage uses `loading loading-spinner` classes in three places for the create button loading state and the initial project list loading state -- all invisible

Additionally, `ChordLane.tsx` uses `bg-base-200`, `border-base-300`, and `text-base-content` classes that produce no styling.

## Screenshot Reference

- `/tmp/audit-library.png` -- library page (loading states not visible but classes are present in code)
- `/tmp/audit-editor-full.png` -- ChordLane visible at bottom of editor

## Acceptance Criteria

### App.tsx (loading screen)
1. Replace `bg-base-100` with `bg-background` on line 12
2. Replace `loading loading-spinner loading-lg text-primary` with a CSS-only spinner or simple text indicator using forge tokens. Suggested: `<div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />`

### LibraryPage.tsx (three spinner instances)
3. Replace `<span className="loading loading-spinner loading-xs" />` (line 106, create button) with a small CSS spinner: `<span className="inline-block h-3 w-3 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />`
4. Replace `<span className="loading loading-spinner loading-lg text-primary" />` (line 146, loading state) with `<div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />`
5. Replace `<span className="loading loading-spinner loading-sm" />` (line 160, empty state create button) with the same small spinner as item 3

### ChordLane.tsx
6. Replace `bg-base-200/50` with `bg-secondary/50` on line 32
7. Replace `border-base-300` with `border-border` on lines 32 and 36
8. Replace `bg-base-200` with `bg-secondary` on line 36
9. Replace `text-base-content/30` with `text-muted-foreground/30` on line 38
10. Replace `border-base-content/15` with `border-foreground/15` on line 65
11. Replace `border-base-content/8` with `border-foreground/8` on line 65
12. Replace `text-base-content/50` with `text-muted-foreground` on line 69

## Constraints

- Must use forge theme tokens only
- Must not use DaisyUI classes
- Must not hardcode hex colors
- Spinners must be visible and animated using only Tailwind utilities (the `animate-spin` class is built into Tailwind)

## Files to Modify

- `/data/projects/arrangement-forge/src/App.tsx`
- `/data/projects/arrangement-forge/src/pages/LibraryPage.tsx`
- `/data/projects/arrangement-forge/src/components/arrangement/ChordLane.tsx`

## Visual Verification

Agent must take before and after screenshots of:
- The library page loading state
- The editor page showing the ChordLane at the bottom
