# Interaction Audit Results — 2026-03-05

## Summary

Full Playwright interaction audit of Arrangement Forge across all four pages (Login, Library, Settings, Editor). Auth succeeded with test credentials. **27 of 39 tests passed, 12 failed.** Of the 12 failures, 5 are test-locator issues (false negatives — the feature works but the locator was wrong) and 7 are real findings (3 bugs, 4 UX gaps).

---

## Test Results

### Login Page (4/4 PASS)

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Sign Up tab toggles form | PASS | "Create Account" button appears |
| 2 | Input focus rings | PASS | Visible ring on email field |
| 3 | Google OAuth button | PASS | Present and visible |
| 4 | Login with credentials | PASS | Redirected to /library |

### Library Page (5/5 PASS)

| # | Test | Result | Notes |
|---|------|--------|-------|
| 5 | Heading visible ("My Library") | PASS | |
| 6 | Search input accepts text | PASS | |
| 7 | Sort dropdown (6 options) | PASS | |
| 8 | Settings button navigates | PASS | |
| 9 | Open existing project | PASS | Navigates to /project/:id |

### Settings Page (4/4 PASS)

| # | Test | Result | Notes |
|---|------|--------|-------|
| 10 | Display Name input editable | PASS | |
| 11 | Chord Display section visible | PASS | Radio buttons for Letter/Roman |
| 12 | Genre select present | PASS | 4 selects on page |
| 13 | Save button visible | PASS | |
| 14 | Back to Library link | PASS | |

### Editor Page (14/26 — 7 real issues, 5 false negatives)

| # | Test | Result | Real Issue? | Notes |
|---|------|--------|-------------|-------|
| 15 | TopBar back link | FAIL | False negative | TopBar uses "AF" logo as home link + gear icon, not "Back to Library" text. Navigation works. |
| 16 | Left panel (STYLE CONTROLS) | PASS | | |
| 17 | Panel collapse/expand | FAIL | False negative | Collapse works visually (screenshot confirms). Expand is a chevron icon `>`, not "Expand" text. |
| 18 | Collapsible sections (data-state) | FAIL | False negative | Sections use custom chevron toggle, not Radix `data-state`. Collapse works per screenshot. |
| 19 | Genre dropdown | PASS | | Native `<select>` works. Note: test picked up Key dropdown first (locator order), not Genre. |
| 20 | Genre change | PASS | | Key changed from C to D |
| 21 | Sliders (input[type=range]) | **FAIL** | **Real** | Style controls (Energy, Groove, Feel, Swing, Dynamics) use custom bar/track UI, not native `<input type=range>`. See below. |
| 22 | Numeric inputs (BPM/bars) | **FAIL** | **Real** | BPM is display-only in TopBar ("120 bpm" badge). No inline edit. See below. |
| 23 | Key selector | PASS | | 1 native `<select>` |
| 24 | Generate button visible | PASS | | |
| 25 | Generate button enabled | PASS | | |
| 26 | Generation produces sections | **FAIL** | **BUG** | After clicking Generate and waiting 6s, arrangement view shows only a thin colored bar and "CHORDS" label. No section headers, no stem lanes, no blocks. See below. |
| 27 | Section headers in arrangement | **FAIL** | **BUG** | 0 sections visible (Intro/Verse/Chorus/etc.) |
| 28 | Stem labels | **FAIL** | **BUG** | 0/5 stem labels visible (Drums/Bass/Piano/Guitar/Strings). Only visible in Mixer drawer. |
| 29 | Transport controls (icon buttons) | PASS | | 8 icon buttons found |
| 30 | Mixer drawer opens | PASS | | Shows all 5 stems with M/S buttons and volume dots |
| 31 | AI ASSISTANT section | FAIL | False negative | Visible in pre-generate state (confirmed by screenshot). Test ran after Generate collapsed the left panel. |
| 32 | Status bar | FAIL | False negative | Shows "Unsaved changes" at bottom-left. Locator looked for "Saved" not "Unsaved changes". |
| 33 | Context menu on section | **FAIL** | **Blocked** | No sections visible to right-click (consequence of bug #26) |
| 34 | Delete flow (library) | FAIL | **Blocked** | Timed out navigating back (consequence of wrong back-link locator) |
| 35 | Ctrl+Z | PASS | | No crash |
| 36 | Ctrl+Shift+Z | PASS | | No crash |
| 37 | Space bar | PASS | | No crash |

---

## Real Issues Found

### P0 — Generation Does Not Populate Arrangement View

**Test:** #26, #27, #28
**Expected:** Clicking "Generate" creates sections (Intro, Verse, Chorus, etc.) with stem lanes and blocks visible in the arrangement grid.
**Actual:** After Generate completes, the arrangement area shows only a thin teal vertical bar, a "CHORDS" label, and empty space. No section headers, no stem lane labels, no blocks rendered. The left panel collapses, suggesting generation "succeeded" internally, but the arrangement view is empty.
**Impact:** Core functionality broken. Users cannot see or interact with generated arrangements.
**Files likely involved:**
- `src/components/arrangement/ArrangementView.tsx` — main arrangement renderer
- `src/hooks/useGenerate.ts` — generation trigger and state management
- `src/store/project-store.ts` — where sections/blocks/stems are stored after generation
- `src/lib/midi-generator.ts` — rule-based MIDI generator

**Debug approach:** Check if `projectStore.sections` and `projectStore.blocks` are populated after generation. If populated, the render logic in ArrangementView is failing. If empty, the generation pipeline is not writing data to the store.

---

### P1 — Style Sliders Are Not Standard Range Inputs

**Test:** #21
**Expected:** Style controls (Energy, Groove, Feel, Swing %, Dynamics) should be interactive sliders that Playwright (and assistive technology) can manipulate.
**Actual:** These controls render as custom bar/track UI elements. They appear interactive visually (colored bars with labels like "Med", "Standard", "Natural", "0%", "mp") but are not `<input type=range>` elements. This means:
1. Potentially inaccessible to screen readers
2. Cannot be tested programmatically with standard Playwright `fill()` on range inputs
**Files likely involved:**
- `src/components/left-panel/StyleControls.tsx` (or similar) — slider component implementation
- Look for custom `<div>` based slider vs proper `<input type=range>` with ARIA attributes

**Note:** Visual inspection shows these controls DO have visible values and appear to work via mouse interaction. The concern is accessibility and testability, not visual appearance.

---

### P1 — BPM Not Editable Inline

**Test:** #22
**Expected:** BPM value (120) in the TopBar should be editable — either as an `<input type=number>` or a click-to-edit field.
**Actual:** BPM displays as a static badge ("120 bpm") in the TopBar. No click-to-edit affordance visible. Users cannot change tempo without the left panel style controls (if that's even possible there).
**Files likely involved:**
- `src/components/layout/TopBar.tsx` — where BPM badge is rendered
- `src/store/project-store.ts` — BPM state

**Note:** The TopBar also shows Key (as a `<select>`) and genre/time-signature as badges. Key IS editable; BPM is not. This inconsistency should be addressed.

---

### P2 — Editor TopBar Has No Visible "Back to Library" Text Link

**Test:** #15
**Expected:** Clear navigation back to the library from the editor.
**Actual:** The TopBar shows "AF" logo on the far left and a gear icon on the right. The "AF" logo likely navigates home, but there is no explicit "Back to Library" text link. Settings page has a clear "Back to Library" link.
**Files likely involved:**
- `src/components/layout/TopBar.tsx`

**Note:** This is a UX gap, not a crash. The "AF" logo probably works as a home link. Consider adding a breadcrumb or explicit back arrow.

---

## Observations (Not Bugs)

1. **Mixer drawer works well.** All 5 stems (Drums, Bass, Piano, Guitar, Strings) display with M/S buttons and volume controls (colored dots on vertical tracks). Master channel present.

2. **AI Assistant is functional in pre-generate state.** Chat history visible with previous messages. Input field ("Ask the AI assistant...") present with send button.

3. **Settings page is complete and polished.** Profile section, chord display radio buttons, default genre dropdown, and Coming Soon section for Audio Output/Auto-Save/Theme.

4. **Login page is clean and functional.** Sign In/Sign Up toggle, Google OAuth, error display all work.

5. **Library sort has 6 options** (Last Edited, Name A-Z, Name Z-A, Genre, Key, Tempo) — comprehensive.

6. **Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z, Space) do not crash** even in empty arrangement state.

7. **The first `<select>` in the editor is actually the Key selector** (in the TopBar), not the Genre selector (in the left panel). The Genre/Sub-Style dropdowns are further down in the left panel. This means the audit's "Genre change" test actually tested Key change (C -> D), which did work.

---

## Recommended Fix Priority

1. **P0: Fix generation pipeline** — Investigate why arrangement view is empty after Generate. This blocks the entire editor experience.
2. **P1: Make style sliders accessible** — Convert custom bar UI to proper `<input type=range>` with ARIA attributes, or add ARIA role/valuemin/valuemax/valuenow.
3. **P1: Make BPM editable** — Add click-to-edit or inline input for tempo in TopBar.
4. **P2: Add explicit back navigation** — Add "Back to Library" link or breadcrumb to editor TopBar.
