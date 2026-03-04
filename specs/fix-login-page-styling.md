# Fix Login Page Styling

## Problem Statement
The login page renders with broken/missing styling. The component uses DaisyUI classes (`bg-base-100`, `bg-base-200`, `card`, `card-body`, `tabs`, `tabs-boxed`, `tab`, `tab-active`, `input`, `input-bordered`, `btn`, `btn-primary`, `btn-outline`, `form-control`, `label`, `label-text`, `alert`, `alert-error`, `divider`, `loading`) that no longer resolve — DaisyUI was removed from the project. All interactive elements (tabs, inputs, buttons) lack visible borders, spacing, and interactive states. The page is functional but looks unfinished.

## Before Screenshot
`/tmp/screenshot-before.png` — captured March 2026, identical rendering on VPS Playwright and MacBook Chrome.

## Acceptance Criteria

### 1. Card container
- Replace `bg-base-100` on outer div with `bg-background`
- Replace `bg-base-200` on card div with `bg-card`
- Remove `card` and `card-body` DaisyUI classes
- Add `border border-border rounded-lg p-6` to the card div for a visible border and padding
- Add `shadow-xl` (already present, keep it)

### 2. Subtitle text
- Replace `text-base-content/50` with `text-muted-foreground`

### 3. Sign In / Sign Up tabs
- Replace `tabs tabs-boxed bg-base-300` container with `flex gap-2 bg-secondary rounded-lg p-1`
- Replace `tab flex-1` on each button with `flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors`
- Active tab state: `bg-primary text-primary-foreground` (instead of `tab-active`)
- Inactive tab state: `text-muted-foreground hover:text-foreground`
- This fixes the "jammed together" issue by introducing proper flex layout with gap

### 4. Form labels
- Replace `label py-0` with just a plain element (no DaisyUI `label` class)
- Replace `label-text text-xs text-base-content/70` with `text-xs text-muted-foreground`
- Remove the inner `<span>` wrapper — make `<label>` the direct text container
- Remove `form-control gap-1` and replace with `flex flex-col gap-1.5`
- This fixes the "labels overlap inputs" issue by removing DaisyUI's `label` positioning

### 5. Input fields
- Replace `input input-bordered input-sm` with `w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring`
- This gives inputs a visible `border-input` border (#3f3f46) against the card background (#18181b)

### 6. Error alert
- Replace `alert alert-error py-2 text-sm` with `rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive`

### 7. Submit button (Sign In / Create Account)
- Replace `btn btn-primary btn-sm` with `w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50`
- Loading spinner: replace `loading loading-spinner loading-xs` with an inline SVG spinner or simple text "..." (DaisyUI `loading` class no longer works)

### 8. "or" divider
- Replace `divider text-xs text-base-content/40 my-0` with a manual flex divider:
  ```
  flex items-center gap-3 text-xs text-muted-foreground
  ```
  With `<div className="flex-1 h-px bg-border" />` on each side of the "or" text

### 9. Google OAuth button
- Replace `btn btn-outline btn-sm gap-2` with `w-full flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors disabled:opacity-50`

### 10. Overall card spacing
- Replace `gap-6` (from `card-body gap-6`) with `flex flex-col gap-6` on the inner container (since `card-body` flex behavior is gone)

## Constraints
- Must use forge theme tokens only (`bg-card`, `border-border`, `bg-primary`, `text-foreground`, `text-muted-foreground`, `bg-secondary`, `border-input`, `ring-ring`, `bg-background`, `text-primary-foreground`, `text-destructive`, `bg-destructive`)
- Must not use DaisyUI classes (all must be removed)
- Must not hardcode hex colors
- All inputs must retain their `id` + `<label htmlFor>` pairing (existing CLAUDE.md rule)
- Single file change

## Files to Modify
- `/data/projects/arrangement-forge/src/pages/LoginPage.tsx`

## Visual Verification
Agent must take `/screenshot before` and `/screenshot after` per the Visual Verification Protocol.
