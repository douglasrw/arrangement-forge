# Fix Login Page Styling

**Priority:** P1 — visually broken
**Status:** OPEN (previous fix incomplete — page still renders as unstyled HTML)

## Problem Statement

The login page is visually broken. A previous remediation pass replaced some DaisyUI class names but the page still renders as if unstyled. The Playwright audit (March 2026) captured these specific defects:

1. **"Sign In" / "Sign Up" tabs** have NO spacing — they read as a single run "Sign InSign Up"
2. **"Email" label and placeholder** overlap — reads as "Emailyou@example.com"
3. **"Password" label and bullet dots** overlap — reads as "Password••••••••"
4. **Input fields** have NO visible borders or backgrounds — completely invisible against the card
5. **"Sign In" button** has NO background color — just floating text
6. **"or" divider** has NO horizontal lines — just the word "or" floating
7. **Google OAuth button** has NO background or border — just "G Continue with Google" floating
8. **Card container** has NO visible border or shadow — blends into the page background
9. **Overall:** the form looks like raw unstyled HTML, not a professional dark-themed app

## Root Cause Hypothesis

The previous spec prescribed correct class replacements, but either (a) the fix was never applied, (b) the classes were applied but globals.css token definitions are missing/broken for these utilities, or (c) Tailwind is not generating the utility classes for the forge tokens. The implementing agent must diagnose which case applies before making changes.

## Acceptance Criteria

### 0. Diagnosis
- [ ] Verify that `src/styles/globals.css` defines all required CSS custom properties (`--card`, `--border`, `--input`, `--primary`, `--primary-foreground`, `--muted-foreground`, `--background`, `--secondary`, `--ring`, `--destructive`)
- [ ] Verify that these properties are registered in the `@theme inline` block so Tailwind generates utility classes
- [ ] Inspect the current `LoginPage.tsx` to identify which DaisyUI classes remain and which forge classes were applied but aren't rendering
- [ ] Fix any globals.css or Tailwind config issues first — they affect ALL pages

### 1. Card container
- [ ] Card has visible border: `bg-card border border-border rounded-lg p-6 shadow-xl`
- [ ] Card is visually distinct from page background (`bg-card` #18181b against `bg-background` #09090b)
- [ ] Inner content has `flex flex-col gap-6` for vertical rhythm

### 2. Sign In / Sign Up tabs
- [ ] Tab container: `flex gap-2 bg-secondary rounded-lg p-1` (per DESIGN_SYSTEM.md Tabs section)
- [ ] Active tab: `bg-primary text-primary-foreground rounded-md px-4 py-1.5 text-sm font-medium`
- [ ] Inactive tab: `text-muted-foreground hover:text-foreground rounded-md px-4 py-1.5 text-sm`
- [ ] Visual gap between "Sign In" and "Sign Up" — must NOT read as one word

### 3. Form labels
- [ ] Labels use `text-xs text-muted-foreground` (per DESIGN_SYSTEM.md Labels)
- [ ] `gap-1.5` between label and input (per DESIGN_SYSTEM.md Form field gap)
- [ ] Labels do NOT overlap input text or placeholder — they are above, with clear separation

### 4. Input fields
- [ ] Inputs have visible borders: `w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring`
- [ ] Border (#3f3f46) is visible against card background (#18181b)
- [ ] Placeholder text is dimmer than label text (muted-foreground)

### 5. Error alert
- [ ] Error message: `rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive`

### 6. Submit button (Sign In / Create Account)
- [ ] Button has visible primary background: `w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50`
- [ ] Loading spinner uses CSS-only: `h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin` (NOT DaisyUI `loading` class)

### 7. "or" divider
- [ ] Horizontal lines visible on both sides of "or" text
- [ ] Pattern: flex container with `h-px bg-border flex-1` on each side, `text-xs text-muted-foreground px-3` for "or"

### 8. Google OAuth button
- [ ] Outline button style: `w-full flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors disabled:opacity-50`

### 9. All form elements labeled
- [ ] Every `<input>` has a unique `id` and corresponding `<label htmlFor={id}>`

## Design Reference

- **DESIGN_SYSTEM.md** sections: Color Tokens, Inputs, Buttons (Primary, Outline), Tabs, Dividers, Alerts, Cards
- **Layout:** Centered content pattern (`flex items-center justify-center min-h-screen`) with `bg-background` page background

## Constraints

- Must use forge theme tokens only — no DaisyUI classes, no hardcoded hex colors
- Single file change: `src/pages/LoginPage.tsx` (unless globals.css diagnosis reveals missing tokens)
- Must preserve all functional behavior (auth flow, error handling, tab switching)

## Files to Modify

- `/data/projects/arrangement-forge/src/pages/LoginPage.tsx`
- `/data/projects/arrangement-forge/src/styles/globals.css` (only if diagnosis reveals missing tokens)

## Visual Verification

Agent must take a Playwright screenshot of `http://localhost:5173/login` before and after changes. The after screenshot must show:
- Visible card with border against dark background
- Two distinct tab buttons with gap between them
- Input fields with visible borders
- Buttons with visible backgrounds
- Divider lines flanking "or"
