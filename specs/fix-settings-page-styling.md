# Fix Settings Page Styling

## Problem Statement

The entire Settings page (`src/pages/SettingsPage.tsx`) uses DaisyUI classes that were removed from the project. Since DaisyUI is no longer installed, these classes resolve to nothing, producing an unstyled page with raw browser-default form elements, no background color distinction, missing borders, and broken layout structure. The screenshot shows labels and values smashed together with no visual separation, unstyled radio buttons, unstyled select dropdowns, and an unstyled "Save Settings" button.

## Screenshot Reference

`/tmp/audit-settings.png`

## Specific DaisyUI Classes Found

- `bg-base-100`, `bg-base-200`, `border-base-300` -- background/border colors (resolve to nothing)
- `btn btn-sm btn-ghost`, `btn btn-primary` -- button styles (resolve to nothing)
- `text-base-content`, `text-base-content/50`, `text-base-content/30`, `text-base-content/40` -- text colors
- `input input-bordered` -- input styling
- `select select-bordered` -- select styling
- `radio radio-primary radio-sm` -- radio button styling
- `form-control` -- form group layout
- `label-text`, `label-text-alt` -- label typography
- `divider` -- section divider
- `alert alert-error` -- error message styling
- `loading loading-spinner loading-sm` -- loading spinner

## Acceptance Criteria

1. Replace `bg-base-100` with `bg-background`
2. Replace `bg-base-200` with `bg-card`
3. Replace `border-base-300` with `border-border`
4. Replace `text-base-content` with `text-foreground`; `text-base-content/50` with `text-muted-foreground`; `text-base-content/30` and `/40` with `text-muted-foreground/50`
5. Replace `btn btn-sm btn-ghost` with `rounded px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors`
6. Replace `btn btn-primary` with `rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50`
7. Replace `input input-bordered` with `w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring`
8. Replace `select select-bordered` with `rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring`
9. Replace `radio radio-primary radio-sm` with `h-4 w-4 accent-primary`
10. Replace `form-control gap-2` with `flex flex-col gap-2`
11. Replace `label-text font-medium` with `text-sm font-medium text-foreground`
12. Replace `label-text-alt text-base-content/40` with `text-xs text-muted-foreground`
13. Replace `divider text-xs text-base-content/30` with a custom divider: `flex items-center gap-3 text-xs text-muted-foreground/50` with `<div className="flex-1 h-px bg-border" />` on each side (same pattern as LoginPage)
14. Replace `alert alert-error` with `rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive`
15. Replace `loading loading-spinner loading-sm` with a simple text ellipsis or a CSS-only spinner using forge tokens
16. All visual elements must use forge theme tokens only -- no DaisyUI classes, no hardcoded hex colors
17. The page must visually match the dark theme established by LoginPage and LibraryPage

## Constraints

- Must use forge theme tokens only (CSS custom property classes from `src/styles/globals.css`)
- Must not use DaisyUI classes (DaisyUI has been removed)
- Must not hardcode hex colors in components
- Must preserve all functional behavior (save, error display, chord mode toggle, genre select)
- Must keep all `id` attributes and `htmlFor` associations on form elements

## Files to Modify

- `/data/projects/arrangement-forge/src/pages/SettingsPage.tsx`

## Visual Verification

Agent must take before and after screenshots of the settings page at `http://localhost:5173/settings`.
