# Fix Settings Page Styling

**Priority:** P1 — layout broken
**Status:** OPEN (previous spec existed but page still renders unstyled)

## Problem Statement

The Settings page is visually broken. The Playwright audit (March 2026) captured these specific defects:

1. **"Display Name" label runs into value** — reads as "Display Nametest" with no spacing
2. **"Chord Display Mode" label runs into description** — reads as "Chord Display ModeHow chords appear..."
3. **"Default Genre" label runs into description** — reads as "Default GenrePre-selected when..."
4. **NO card containers** around setting groups — everything floats on the same flat background
5. **NO spacing between sections** — settings run together vertically
6. **"Coming Soon" section** has no visual separation from active settings
7. **Disabled dropdowns** have no visible disabled state (no opacity change, no cursor change)
8. **"Save Settings" button** has NO background — just floating text
9. **Overall:** raw unstyled form dump, identical to browser-default rendering

## Root Cause

The component uses DaisyUI classes (`bg-base-100`, `bg-base-200`, `border-base-300`, `btn`, `input`, `select`, `radio`, `form-control`, `label-text`, `divider`, `alert`, `loading`) that resolve to nothing since DaisyUI was removed.

## Acceptance Criteria

### 1. Page layout
- [ ] Page background: `bg-background min-h-screen`
- [ ] Content centered with max-width: `max-w-2xl mx-auto px-4 py-8`
- [ ] Page heading: `text-xl font-semibold text-foreground mb-6`

### 2. Setting group cards
- [ ] Each settings group wrapped in a card: `bg-card border border-border rounded-lg p-6`
- [ ] `gap-6` between cards (major section gap per DESIGN_SYSTEM.md)
- [ ] "Coming Soon" card visually distinct: add `opacity-60` to the card

### 3. Form field layout (label + value spacing)
- [ ] Each form field uses `flex flex-col gap-1.5` (label above, input below, 6px gap)
- [ ] `gap-4` between form fields within a card
- [ ] Labels: `text-sm font-medium text-foreground`
- [ ] Helper text / descriptions: `text-xs text-muted-foreground` below the label, before the input

### 4. Input fields
- [ ] Text inputs: `w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring`
- [ ] Border (#3f3f46) visible against card background (#18181b)

### 5. Select dropdowns
- [ ] Styled selects: `rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring`
- [ ] Disabled state: add `opacity-50 cursor-not-allowed` (per DESIGN_SYSTEM.md Disabled pattern)

### 6. Radio buttons
- [ ] Replace `radio radio-primary radio-sm` with `h-4 w-4 accent-primary`
- [ ] Radio group has clear label association

### 7. Section dividers
- [ ] Replace `divider` with: `h-px bg-border my-4` (per DESIGN_SYSTEM.md Horizontal rule)
- [ ] Text dividers use flex pattern: `flex items-center gap-3 text-xs text-muted-foreground` with `h-px bg-border flex-1` on each side

### 8. Buttons
- [ ] "Save Settings" button: `rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50`
- [ ] Back/navigation button: Ghost variant — `text-foreground hover:bg-secondary rounded-md px-4 py-2 text-sm font-medium transition-colors`

### 9. Error alert
- [ ] `rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive`

### 10. Loading spinner
- [ ] Replace `loading loading-spinner` with CSS spinner: `h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin`

### 11. All form elements labeled
- [ ] Every `<input>`, `<select>`, and `<textarea>` has a unique `id` and corresponding `<label htmlFor={id}>`

## Design Reference

- **DESIGN_SYSTEM.md** sections: Color Tokens, Cards, Inputs, Buttons (Primary, Ghost), Select/Dropdown, Dividers, Alerts, Typography (Labels), Spacing, Interactive States (Disabled)

## Constraints

- Must use forge theme tokens only — no DaisyUI classes, no hardcoded hex colors
- Must preserve all functional behavior (save, error display, chord mode toggle, genre select)
- Must keep all `id` attributes and `htmlFor` associations on form elements

## Files to Modify

- `/data/projects/arrangement-forge/src/pages/SettingsPage.tsx`

## Visual Verification

Agent must take a Playwright screenshot of `http://localhost:5173/settings` before and after changes. The after screenshot must show:
- Setting groups in distinct card containers with visible borders
- Clear spacing between labels and their values (no text run-together)
- Input fields and selects with visible borders
- "Save Settings" button with cyan primary background
- "Coming Soon" section visually de-emphasized
