# Code Health Scout Report -- 2026-03-04

## Build Status

| Check | Result |
|-------|--------|
| `npm run build` | PASS (no errors; 1 warning: chunk > 500 kB -- 974.63 kB after minification) |
| `npx tsc --noEmit` | PASS (zero type errors) |
| `npx vitest run` | PASS (14 test files, 221 tests, 0 failures, 1.50s) |

**Build warning:** The main JS chunk is 974.63 kB (276.84 kB gzipped). Vite recommends code-splitting via dynamic `import()` or `manualChunks`. Not blocking, but worth addressing before production.

---

## Test Coverage

### Summary

| Category | Source Files | Test Files | Coverage % |
|----------|-------------|------------|------------|
| src/lib/ | 12 | 10 | 83% |
| src/store/ | 5 | 3 | 60% |
| src/hooks/ | 6 | 0 | 0% |
| src/audio/ | 7 | 0 | 0% |
| src/components/ | 22 | 0 | 0% |
| src/pages/ | 4 | 0 | 0% |
| **Total** | **56** | **13** | **23%** |

### Untested src/lib/ files
- `src/lib/supabase.ts` -- thin wrapper, low priority
- `src/lib/utils.ts` -- single `cn()` utility, low priority

### Untested src/store/ files
- `src/store/selection-store.ts` -- has navigation logic (`selectNextBlock`, `selectPrevBlock`, `selectBlockAbove`, `selectBlockBelow`) that should be tested
- `src/store/auth-store.ts` -- simple setters, low priority

### Untested hooks (all 6)
- `useAuth.ts` (78 lines), `useProject.ts` (275 lines), `useGenerate.ts` (318 lines), `useAudio.ts` (123 lines), `useKeyboardShortcuts.ts` (146 lines), `useMobile.ts` (19 lines)
- **`useGenerate.ts` is the highest-risk untested file** -- it contains the entire generation flow (318 lines) with complex block/section/stem mapping.

### Untested audio (all 7)
- `engine.ts` (332 lines), `instruments.ts`, `transport.ts`, `metronome.ts`, `sampled-drum-kit.ts` (251 lines), `sampler-cache.ts` (114 lines), `drum-kit.ts`
- These depend on Tone.js/Web Audio API and would need mocking, but `engine.ts` and `sampled-drum-kit.ts` contain significant logic.

---

## CLAUDE.md Compliance Issues

### Hardcoded Hex Colors (195 occurrences across 16 files)

**Rule:** "Must use the `forge` theme color tokens (DaisyUI semantic classes like `bg-base-100`, `text-primary`, `btn-primary`) -- never hardcode hex colors in components."

This is the single largest compliance violation. 195 hardcoded hex color references exist across every component directory. The most affected files:

| File | Count |
|------|-------|
| `src/components/arrangement/ArrangementView.tsx` | 31 |
| `src/components/mixer/MixerDrawer.tsx` | 30 |
| `src/components/left-panel/SectionContext.tsx` | 24 |
| `src/components/left-panel/BlockContext.tsx` | 21 |
| `src/components/transport/TransportBar.tsx` | 21 |
| `src/components/left-panel/ChordPalette.tsx` | 13 |
| `src/components/shared/ConfirmDialog.tsx` | 8 |
| `src/components/left-panel/AiAssistantSection.tsx` | 8 |
| `src/components/layout/StatusBar.tsx` | 7 |
| `src/components/sequencer-block.tsx` | 7 |
| `src/components/shared/ScopeBadge.tsx` | 6 |
| `src/components/library/ProjectCard.tsx` | 6 |
| `src/components/left-panel/InputSection.tsx` | 5 |
| `src/components/layout/TopBar.tsx` | 4 |
| `src/components/left-panel/StyleControlsSection.tsx` | 3 |
| `src/components/layout/AppShell.tsx` | 1 |

Most common hardcoded colors:
- `#71717a` (zinc-500) -- used for muted text throughout
- `#27272a` (zinc-800) -- used for borders/backgrounds
- `#0891b2` (cyan-600) -- used as accent/focus color
- `#e4e4e7` (zinc-200) -- used for foreground text
- `#a1a1aa` (zinc-400) -- used for secondary text
- `#f4f4f5` (zinc-100) -- used for bright text
- `#3f3f46` (zinc-700) -- used for borders
- `#18181b` (zinc-900) -- used for panel backgrounds

These should be mapped to DaisyUI semantic tokens (`text-base-content`, `bg-base-200`, `border-base-300`, `text-primary`, etc.) or custom theme CSS variables.

### Unlabeled Form Inputs (7 violations)

**Rule:** "Must give every `<input>` and `<textarea>` a unique `id` attribute and a corresponding `<label htmlFor={id}>`. No unlabeled form fields."

| File | Line | Element | Issue |
|------|------|---------|-------|
| `src/pages/LoginPage.tsx` | 81 | `<input type="email">` | No `id`, label has no `htmlFor` |
| `src/pages/LoginPage.tsx` | 96 | `<input type="password">` | No `id`, label has no `htmlFor` |
| `src/pages/SettingsPage.tsx` | 77 | `<input type="text">` (display name) | No `id`, label has no `htmlFor` |
| `src/pages/SettingsPage.tsx` | 94 | `<input type="radio">` (letter names) | No `id`, label wraps but no explicit `htmlFor` |
| `src/pages/SettingsPage.tsx` | 104 | `<input type="radio">` (roman numerals) | No `id`, label wraps but no explicit `htmlFor` |
| `src/components/transport/Scrubber.tsx` | 11 | `<input type="range">` | No `id`, no label at all |
| `src/components/transport/TransportBar.tsx` | 164 | `<input type="number">` (BPM) | Has `id="bpm-input"` but no corresponding `<label htmlFor>` |

Note: The `<input type="range">` in `BlockContext.tsx` (line 69) also lacks an `id`, but it is part of the `InstrumentSlider` sub-component whose parent provides a `<label htmlFor>` for the slider group -- this is borderline and the `id` should be passed through.

### `require()` Usage in Selection Store

`src/store/selection-store.ts` lines 53, 67, 85 use CommonJS `require()` for lazy imports:
```typescript
const { useProjectStore } = require('./project-store') as typeof import('./project-store');
```
This works but is unconventional in an ES module codebase. The same file already imports `useProjectStore` at the top (line 3) via a static ESM import. The three `require()` calls are redundant -- they should use the already-imported `useProjectStore` directly. The static import at line 3 already breaks any potential circular dependency concern.

### No Other Violations Found
- No CSS-in-JS usage
- No browser `confirm()`/`alert()`/`prompt()` usage
- No barrel re-exports outside `types/index.ts`
- No default exports in non-page files (pages and App.tsx correctly use default exports)
- No Tone.js objects or DOM refs stored in Zustand stores
- `ConfirmDialog` is correctly used for project deletion in `LibraryPage.tsx`
- No `user_id` sent from client in Supabase inserts

---

## Code Quality Issues

### Files Over 200 Lines

**Preference:** "Keep components under 200 lines -- extract sub-components if larger."

| File | Lines | Notes |
|------|-------|-------|
| `src/components/left-panel/ChordPalette.tsx` | 502 | By far the largest component. Should be split into sub-components (manual mode, visual mode, chord grid, etc.) |
| `src/components/arrangement/ArrangementView.tsx` | 431 | Complex but central. Could extract section rendering, stem lane logic |
| `src/components/mixer/MixerDrawer.tsx` | 390 | Drum sub-mixer + channel strips could be extracted |
| `src/components/layout/TopBar.tsx` | 358 | Logo, project name, params bar, etc. could each be sub-components |
| `src/components/left-panel/BlockContext.tsx` | 327 | InstrumentSlider is already extracted inline; could split further |
| `src/components/left-panel/SectionContext.tsx` | 323 | Section name, style overrides, slider group could be extracted |
| `src/components/transport/TransportBar.tsx` | 246 | Moderate, but playback controls vs display could be split |
| `src/pages/LibraryPage.tsx` | 230 | ProjectCard is already separate; toast logic adds length |
| `src/hooks/useGenerate.ts` | 318 | Not a component, but very long hook with 3 major functions |
| `src/hooks/useProject.ts` | 275 | Large hook with CRUD + Supabase sync |
| `src/audio/engine.ts` | 332 | Core audio class, complex but appropriately sized for its responsibility |
| `src/audio/sampled-drum-kit.ts` | 251 | Drum sample mapping |
| `src/lib/drum-patterns.ts` | 1026 | The largest file. Pattern data + generation logic. Data tables are inherently large. |

### Functions Over 50 Lines

| File | Function | Lines | Priority |
|------|----------|-------|----------|
| `src/hooks/useGenerate.ts` | `useGenerate()` (entire hook) | 305 | High -- should extract `runGeneration`, `regenerateMidi`, `regenerateDrumsOnly` as standalone functions |
| `src/hooks/useProject.ts` | `useProject()` | 212 | Medium -- complex but well-structured |
| `src/hooks/useKeyboardShortcuts.ts` | `useKeyboardShortcuts()` | 124 | Low -- switch-case handler, hard to split meaningfully |
| `src/hooks/useAudio.ts` | `useAudio()` | 97 | Low |
| `src/lib/midi-generator.ts` | `generateMidiForBlock()` | 97 | Medium |
| `src/lib/midi-generator.ts` | `generate()` | 88 | Medium |
| `src/lib/midi-generator.ts` | `divideSections()` | 90 | Medium |
| `src/lib/drum-patterns.ts` | `buildDrumMidi()` | 92 | Medium -- main drum pattern builder |
| `src/store/project-store.ts` | store definition | 168 | Acceptable -- Zustand stores are monolithic by design |
| `src/store/selection-store.ts` | store definition | 78 | Acceptable |
| `src/lib/description-parser.ts` | `parseDescription()` | 77 | Low |
| `src/lib/chords.ts` | `parseChordInput()` | 68 | Low |

### Dead Code / Unused Imports

| File | Issue |
|------|-------|
| `src/hooks/useMobile.ts` | **Entirely unused.** Not imported by any file in the project. Safe to delete. |
| `src/components/sequencer-block.tsx` | Imported by 4 files but has an `Instrument` type export that duplicates `InstrumentType` from `src/types/project.ts`. The component itself also duplicates `INSTRUMENT_COLORS` -- verify if the component is actually rendered or just imported for the color map. |

### Console.log Statements

4 `console.error` calls found (all legitimate error handling):

| File | Line | Statement |
|------|------|-----------|
| `src/hooks/useGenerate.ts` | 148 | `console.error('Generation error:', err)` |
| `src/hooks/useProject.ts` | 68 | `console.error(error)` |
| `src/hooks/useAudio.ts` | 50 | `console.error('Failed to hot-swap drum instrument:', err)` |
| `src/hooks/useAudio.ts` | 64 | `console.error('Failed to load arrangement samples:', err)` |

These are appropriate error logging, not debug statements. No `console.log` or `console.debug` found.

---

## Store Health

### Prohibited Patterns
- **No Tone.js objects in stores** -- confirmed clean. All Tone.js objects are in `src/audio/engine.ts` (class instance) and `src/audio/sampler-cache.ts` (module-scoped).
- **No DOM refs in stores** -- confirmed clean.

### Undo Coverage
- `splitBlock`, `mergeBlocks`, `deleteBlock` correctly push undo entries
- `updateProject`, `updateStem`, `addStem`, `reorderStems`, `addSection`, `updateSection`, `removeSection`, `reorderSections`, `updateBlock`, `updateChord` call `markDirty()` but **do not push undo entries**
- `duplicateBlock` does not push undo entry (minor gap)
- **Assessment:** Only block-level structural mutations (split/merge/delete) push undo. Property changes (name, style overrides, volumes) are not undoable. This is a design choice but should be documented.

### ConfirmDialog Usage
- Project deletion in `LibraryPage.tsx` correctly uses `ConfirmDialog`
- Block deletion button in `BlockContext.tsx` (line 312-317) is a plain button with **no ConfirmDialog guard** -- this is a compliance gap (destructive action without confirmation)
- `clearArrangement` is defined in the store but not called from any component -- no compliance issue currently

### Selection Store Anomaly
`selection-store.ts` uses `require()` on lines 53, 67, 85 while also having a static import of the same module on line 3. The `require()` calls are redundant and should be removed in favor of the existing top-level import.

---

## Tech Debt Items (Prioritized)

### P1: Should fix before next feature

1. **Hardcoded hex colors (195 instances, 16 files)**
   Severity: High. Every component uses raw hex values instead of DaisyUI theme tokens. This makes theme changes impossible and violates a CLAUDE.md "must." The fix is systematic: map each hex to its semantic token equivalent and replace. Estimated effort: 2-3 hours.

2. **Unlabeled form inputs (7 instances)**
   Severity: High. Accessibility violation and CLAUDE.md "must." Quick fix -- add `id` attributes and `htmlFor` to corresponding labels. Estimated effort: 30 minutes.

3. **Missing test coverage for `selection-store.ts`**
   Severity: Medium-high. The navigation functions (`selectNextBlock`, `selectPrevBlock`, `selectBlockAbove`, `selectBlockBelow`) contain non-trivial logic with edge cases that should be covered. Estimated effort: 1 hour.

### P2: Should fix soon

4. **Block delete button lacks ConfirmDialog**
   `src/components/left-panel/BlockContext.tsx` line 312-322 -- the "Delete Block" button has no confirmation dialog, violating CLAUDE.md must for destructive actions.

5. **Component size violations (8 files over 200 lines)**
   `ChordPalette.tsx` (502), `ArrangementView.tsx` (431), `MixerDrawer.tsx` (390), `TopBar.tsx` (358) are the worst offenders. Extract sub-components to improve readability and maintainability.

6. **`require()` calls in `selection-store.ts`**
   Three unnecessary CommonJS `require()` calls alongside an existing ESM import of the same module. Replace with the already-imported reference.

7. **`useMobile.ts` is dead code**
   Entirely unused hook file. Should be deleted.

8. **Bundle size warning (974 kB)**
   Single chunk exceeds Vite's 500 kB recommendation. Implement code-splitting for the editor page vs. library/login pages via React.lazy + dynamic imports.

### P3: Nice to have

9. **Hook test coverage (0/6 hooks tested)**
   `useGenerate.ts` (318 lines) is the highest-risk untested code. Would require mocking Zustand stores but is feasible.

10. **Audio engine test coverage (0/7 files tested)**
    `engine.ts` (332 lines) and `sampled-drum-kit.ts` (251 lines) are complex. Would need Tone.js mocking.

11. **Undo coverage for property changes**
    Only structural mutations (split/merge/delete) push undo entries. Style/property changes are not undoable. Consider whether this is intentional or a gap.

12. **`sequencer-block.tsx` naming**
    File is in `src/components/` root, not in a subdirectory. It also exports a duplicate `Instrument` type and `INSTRUMENT_COLORS` constant that may overlap with centralized types.

---

## Recommendations

### Top 3 Most Impactful Fixes

1. **Replace hardcoded hex colors with theme tokens.**
   This is the highest-volume compliance violation (195 instances) and the one most likely to cause problems during any future theme iteration. Create a mapping table (e.g., `#71717a` -> `text-muted-foreground`, `#27272a` -> `bg-secondary`, `#0891b2` -> `text-primary`) and do a systematic sweep. This can be done file-by-file without breaking functionality.

2. **Add `id` + `htmlFor` to all form inputs.**
   Quick, low-risk fix that addresses a hard accessibility requirement. 7 inputs across 3 files. Can be done in under 30 minutes.

3. **Write tests for `selection-store.ts` and `useGenerate.ts`.**
   These are the two highest-risk untested files. `selection-store.ts` has block navigation logic with edge cases (first/last stem, no blocks). `useGenerate.ts` has the entire generation flow including UUID mapping, chord parsing, and store population. Adding tests here gives the best risk reduction per hour invested.
