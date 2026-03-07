# Fix Hardcoded Hex Colors Across Components

## Problem Statement

63 instances of hardcoded hex colors exist across 15 component files, violating the CLAUDE.md rule: "Must use forge theme tokens (CSS custom property classes like `bg-background`, `bg-primary`, `text-foreground`, `bg-card`, `border-border`) -- never hardcode hex colors in components." These hardcoded values also trigger the `no-hardcoded-colors` pre-commit check, meaning any developer touching these files for any reason will be blocked from committing.

The hardcoded colors fall into these categories:
- **Semantic status colors** (green for ready, yellow for unsaved/warning, blue for loading) -- should map to forge tokens or be defined as CSS custom properties
- **Instrument identity colors** (drums=cyan, bass=emerald, piano=amber, guitar=violet, strings=teal) -- should be defined as CSS custom properties in globals.css
- **Scope badge colors** (song=teal, section=amber, block=orange) -- should be CSS custom properties
- **Background/surface colors** duplicating theme tokens (`#18181b` = `var(--card)`, `#09090b` or `#0a0a0c` ~ `var(--background)`, `#52525b` ~ zinc-600)
- **Accent colors** (`#14b8a6` = teal-500, `#2dd4bf` = teal-300) used for playhead and generate button

## Screenshot Reference

- `/tmp/audit-editor-full.png` -- shows arrangement view, transport bar, left panel, all containing hardcoded colors
- `/tmp/audit-editor-left.png` -- left panel style controls, AI assistant with scope badges
- `/tmp/audit-editor-bottom.png` -- transport bar and status bar

## Affected Files (63 occurrences across 15 files)

| File | Count | Color Categories |
|------|-------|-----------------|
| `src/components/arrangement/ArrangementView.tsx` | 9 | Surface colors, playhead teal, instrument identity |
| `src/components/mixer/MixerDrawer.tsx` | 10 | Instrument colors, surface colors |
| `src/components/sequencer-block.tsx` | 7 | Instrument colors, surface colors |
| `src/components/left-panel/AiAssistantSection.tsx` | 6 | Scope badge colors, surface colors |
| `src/components/left-panel/BlockContext.tsx` | 5 | Instrument identity colors |
| `src/components/library/ProjectCard.tsx` | 5 | Status colors, surface colors |
| `src/components/layout/StatusBar.tsx` | 4 | Status indicator colors (ready=green, saving=blue, unsaved=yellow, error=yellow) |
| `src/components/shared/ScopeBadge.tsx` | 4 | Scope badge colors |
| `src/components/shared/ConfirmDialog.tsx` | 3 | Warning yellow, destructive red |
| `src/components/transport/TransportBar.tsx` | 3 | Active state teal |
| `src/components/left-panel/SectionContext.tsx` | 2 | Section identity colors |
| `src/components/left-panel/ChordPalette.tsx` | 2 | Chord colors |
| `src/components/layout/TopBar.tsx` | 1 | Unsaved indicator (green/yellow) |
| `src/components/left-panel/StyleControlsSection.tsx` | 1 | Accent color |
| `src/components/left-panel/InputSection.tsx` | 1 | Accent color |

## Acceptance Criteria

### Phase 1: Define semantic color tokens in globals.css

1. Add instrument identity colors as CSS custom properties in `:root` in `src/styles/globals.css`:
   ```css
   --color-instrument-drums: #06b6d4;
   --color-instrument-bass: #34d399;
   --color-instrument-piano: #fbbf24;
   --color-instrument-guitar: #a78bfa;
   --color-instrument-strings: #14b8a6;
   ```
2. Add status indicator colors:
   ```css
   --color-status-ready: #22c55e;
   --color-status-saving: #3b82f6;
   --color-status-unsaved: #fbbf24;
   --color-status-error: #fbbf24;
   ```
3. Add scope badge colors:
   ```css
   --color-scope-song: #0891b2;
   --color-scope-section: #f59e0b;
   --color-scope-block: #ea580c;
   ```
4. Add playhead/accent color:
   ```css
   --color-playhead: #2dd4bf;
   ```
5. Register all new custom properties in the `@theme inline` block so Tailwind can generate utility classes (e.g., `bg-instrument-drums`, `text-status-ready`, `bg-scope-song`)

### Phase 2: Replace hardcoded hex values in all 15 files

6. Replace every hardcoded hex color with the corresponding Tailwind utility class using the new CSS custom properties
7. Replace surface color literals that duplicate existing tokens:
   - `#18181b` -> `bg-card` (already defined as `var(--card)`)
   - `#09090b` / `#0a0a0c` -> `bg-background`
   - `#52525b` -> `bg-zinc-600` or a new `--color-surface-elevated` token
   - `rgba(9,9,11,0.6)` -> `bg-background/60`
8. All 63 occurrences must be eliminated -- no hardcoded hex values should remain in any `.tsx` file under `src/components/`

## Constraints

- Must use forge theme tokens or new CSS custom properties only
- Must not hardcode hex colors in component files
- Must define all new color tokens in `src/styles/globals.css` and register in the `@theme inline` block
- Must preserve the visual appearance -- the colors themselves do not change, only how they are referenced
- Must pass the `no-hardcoded-colors` pre-commit check after remediation
- This is a large change touching 15 files -- recommend splitting into sub-tasks by directory:
  - Batch A: `src/styles/globals.css` (token definitions)
  - Batch B: `src/components/layout/` + `src/components/shared/` (7 files)
  - Batch C: `src/components/arrangement/` + `src/components/transport/` (3 files)
  - Batch D: `src/components/left-panel/` (6 files)
  - Batch E: `src/components/mixer/` + `src/components/library/` + `src/components/sequencer-block.tsx` (3 files)

## Files to Modify

- `/data/projects/arrangement-forge/src/styles/globals.css` (add new tokens)
- All 15 component files listed in the table above

## Visual Verification

Agent must take before and after screenshots of the editor page to confirm visual appearance is unchanged.
