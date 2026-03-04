# Fix Transport Bar Styling

**Priority:** P2 — visual polish
**Status:** DONE (completed 2026-03-05)

## Problem Statement

The bottom zone of the editor (MixerDrawer, TransportBar, StatusBar) lacked visual definition. Transport controls, the MIXER label, and the status bar floated in open space with no clear container boundaries. Borders were using `border-border/50` (half-opacity) and backgrounds used partial opacity (`bg-card/80`, `bg-card/95`), making the separation between zones nearly invisible against the dark background.

## Changes Made

### 1. MixerDrawer (`src/components/mixer/MixerDrawer.tsx`)
- Changed `border-t border-border/50` to `border-t border-border` (full opacity zinc-700 border)

### 2. TransportBar (`src/components/transport/TransportBar.tsx`)
- Changed `border-t border-border/50` to `border-t border-border`
- Changed `bg-card/95` to `bg-card` (solid background, no partial opacity)
- Removed `backdrop-blur-sm` (unnecessary with solid background)

### 3. StatusBar (`src/components/layout/StatusBar.tsx`)
- Changed `border-t border-secondary` to `border-t border-border` (secondary was same color as muted bg, invisible)
- Changed `bg-card/80` to `bg-card` (solid background)

## Design System Alignment

All changes use forge theme tokens per `DESIGN_SYSTEM.md`:
- `border-border` = `--border` = `#3f3f46` (zinc-700)
- `bg-card` = `--card` = `#18181b` (dark zinc)
- No hardcoded hex colors, no opacity hacks

## Verification

Before/after Playwright screenshots confirmed:
- MIXER strip has visible top border
- Transport bar has visible top border separating it from mixer
- Status bar has visible top border separating it from transport
- Bottom zone reads as a defined area with consistent visual structure

## Commit

`b537eea6` — `fix: transport bar styling — borders, padding, visual structure`
