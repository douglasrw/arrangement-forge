# Execution Queue -- Theme Token Migration

**For coding agents:** Read the protocol below, then find the first unchecked
task, execute it completely, check the box, commit, and move to the next.
Do not skip tasks. Do not work on more than one task at a time.

---

## Agent Protocol

1. Read this file top to bottom.
2. Find the first task where the checkbox is `[ ]` (unchecked).
3. Read that task's full spec -- it is self-contained. You do not need to read
   any other plan document.
4. Implement exactly as specified. Do not modify files not listed in the task.
   Do not refactor adjacent code.
5. Run both checks in the task's **Verify** section:
   - **Compilation:** must pass before proceeding
   - **Behavioral:** must be manually confirmed or tested; do not skip
5b. Run the full test suite: `npx vitest run`
    If tests you did not introduce are now failing, **stop and report** which
    tests broke and why before touching the checkbox.
6. Edit this file: change `[ ]` to `[x]` on that task's line.
7. Commit all changes (code + this file) together with message: `T{n}: {title}`
8. Return to step 2.

9. When no unchecked tasks remain, perform the **Completion Check** and
   **Intent Trace** sections:
   - Run the full test suite one final time.
   - For each structural intent trace claim (`- [ ]`), read the referenced
     code and confirm it does what the claim says. Check the box.
   - For each behavioral demo step, execute it and confirm the expected
     outcome. Check the box.
   - Before executing behavioral demos, validate each step against the Litmus
     Test above. If any step uses `import`, `python -c`, direct database queries,
     or cannot be followed by a non-programmer, STOP and report the violation
     instead of executing it. Do not rubber-stamp weak verification.
   - Commit the checked intent trace with message: `intent-trace: verified`
   - Only then is the queue complete. Proceed to the **Archive** section.

If a task says **BLOCKED**, skip it and move to the next unblocked one.
If all remaining tasks are **BLOCKED** or done, stop and report.

**If you are executing a batch** (e.g., "Execute ONLY T6-T10"), skip step 9 --
only the final batch performs the Completion Check and Intent Trace.

---

## Context

**What this is:**

195 hardcoded hex color values are scattered across 16 component files. These violate the CLAUDE.md must: "Must use the `forge` theme color tokens (DaisyUI semantic classes like `bg-base-100`, `text-primary`, `btn-primary`) -- never hardcode hex colors in components." This queue replaces every theme-related hex literal with the corresponding CSS variable / Tailwind semantic class from the forge theme.

**Already implemented (do not re-implement):**

- The forge theme CSS custom properties -- `src/styles/globals.css` (lines 26-48) defines `:root` variables: `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--destructive-foreground`, `--border`, `--input`, `--ring`, `--sidebar`
- Tailwind theme mapping -- `src/styles/globals.css` (lines 3-24) maps CSS vars to `--color-*` so Tailwind classes like `bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`, `bg-ring`, `text-ring` work.

**Key facts the agent needs:**

- **This is a purely cosmetic refactor.** The app must look IDENTICAL before and after every task. No visual changes whatsoever.
- **Instrument palette colors are intentionally NOT theme tokens.** `#06b6d4` (drums), `#34d399` (bass), `#fbbf24` (piano), `#a78bfa` (guitar), `#14b8a6` (strings) -- these are the instrument color palette and MUST stay as hardcoded hex. Do NOT convert them.
- **Some hex values in inline `style={}` for dynamic computations must stay.** For example, `VerticalFader` in MixerDrawer uses `thumbColor` prop as a dynamic style -- leave these.
- **Scrollbar styles in globals.css use hex.** Leave `globals.css` scrollbar hex values as-is (they are in CSS, not components).

**Forge theme token mapping (verified against globals.css `:root`):**

| Hex Value | CSS Variable | Tailwind Class (bg-) | Tailwind Class (text-) | Tailwind Class (border-) | Notes |
|-----------|-------------|---------------------|----------------------|------------------------|-------|
| `#09090b` | `--background` | `bg-background` | `text-background` | `border-background` | Darkest background |
| `#0a0a0c` | -- | `bg-background` | -- | -- | Close enough to `--background` (#09090b), use `bg-background` |
| `#fafafa` | `--foreground` | `bg-foreground` | `text-foreground` | -- | Brightest foreground |
| `#18181b` | `--card` | `bg-card` | -- | -- | Card / panel background |
| `#27272a` | `--secondary` / `--muted` / `--accent` | `bg-secondary` | -- | `border-secondary` | Secondary surface / muted bg. Also equals `--muted` and `--accent` |
| `#3f3f46` | `--border` / `--input` | `bg-input` | -- | `border-border` | Border color, input bg |
| `#a1a1aa` | `--muted-foreground` | -- | `text-muted-foreground` | -- | Muted text |
| `#0891b2` | `--ring` | `bg-ring` | `text-ring` | `border-ring` | Focus ring, accent interactions |
| `#06b6d4` | `--primary` | `bg-primary` | `text-primary` | `border-primary` | Primary accent. **BUT also instrument color (drums).** Only convert when used as a theme accent, NOT when used as instrument color. |
| `#ef4444` | `--destructive` | `bg-destructive` | `text-destructive` | `border-destructive` | Destructive / error red |

**Colors NOT in the forge theme that appear in components (approximate mapping):**

| Hex Value | Zinc Shade | Best Mapping | Notes |
|-----------|-----------|-------------|-------|
| `#f4f4f5` | zinc-100 | `text-foreground` | Close to `--foreground` (#fafafa). Use `text-foreground`. |
| `#e4e4e7` | zinc-200 | `text-foreground` | Close to `--foreground` (#fafafa). Use `text-foreground`. |
| `#d4d4d8` | zinc-300 | `text-foreground` | Close to `--foreground` (#fafafa). Use `text-foreground`. |
| `#52525b` | zinc-600 | `text-muted-foreground` with opacity, OR use directly | Between `--border` (#3f3f46) and `--muted-foreground` (#a1a1aa). No exact token. Use `text-muted-foreground/60` for text, `border-border` for borders, `bg-input` for backgrounds. |
| `#71717a` | zinc-500 | `text-muted-foreground` with opacity | Between border and muted-foreground. Use `text-muted-foreground/70` for text contexts. |
| `#111113` | -- | `bg-sidebar` | Equals `--sidebar` (#111113). Use `bg-sidebar`. |
| `#1a1a1f` | -- | `bg-card` | Close to `--card` (#18181b). Use `bg-card`. |
| `#141416` | -- | `bg-sidebar` | Close to `--sidebar` (#111113). Use `bg-sidebar`. |

**Decision on zinc shades without exact tokens:**

For `#71717a` (zinc-500) and `#52525b` (zinc-600), there are no exact theme tokens. The options are:

1. Add new CSS custom properties to `globals.css` (e.g., `--muted-foreground-dim`)
2. Use opacity modifiers on existing tokens (e.g., `text-muted-foreground/70`)
3. Keep as hardcoded Tailwind zinc classes (e.g., `text-zinc-500`, `text-zinc-600`)

**We choose option 3: use Tailwind zinc palette classes.** Rationale: These are structural gray shades that sit between existing tokens. Using `text-zinc-500` is more readable than `text-muted-foreground/70`, doesn't bloat the theme with rarely-needed intermediate tokens, and still removes the raw hex. The zinc palette IS the forge theme's gray scale (all tokens are zinc shades), so `text-zinc-500` is theme-coherent. When applied as backgrounds, use `bg-zinc-600` or `bg-zinc-700` as appropriate.

**Similarly for near-foreground shades:**

- `#f4f4f5` (zinc-100) -> `text-zinc-100` (or `text-foreground` when used as primary readable text)
- `#e4e4e7` (zinc-200) -> `text-zinc-200` (or `text-foreground` when used as primary readable text)
- `#d4d4d8` (zinc-300) -> `text-zinc-300`

**Accent/feature colors that are NOT theme grays and NOT instrument palette:**

| Hex Value | Usage | Mapping |
|-----------|-------|---------|
| `#14b8a6` | teal-500, "active" accent (play button, generate button, active toggles, solo) | Keep as `#14b8a6` -- this is a feature accent not covered by any theme token. It's intentionally distinct from `--primary` (#06b6d4). |
| `#2dd4bf` | teal-300, playhead color, hover state of generate button | Keep as `#2dd4bf` -- playhead accent color. |
| `#5eead4` | teal-200, active toggle text | Keep as `#5eead4` -- active state highlight. |
| `#22d3ee` | cyan-400, hover state of override link | Keep as `text-primary` (close to `--primary`). |
| `#22c55e` | green-500, "saved" status dot | Keep as `#22c55e` -- semantic status color. |
| `#4ade80` | green-400, saved indicator | Keep as `#4ade80` -- semantic status color. |
| `#fbbf24` | amber-400, warning/unsaved dot | Keep as `#fbbf24` -- semantic status color / instrument color (piano). |
| `#f59e0b` | amber-500, mute active state | Keep as `#f59e0b` -- semantic UI state. |
| `#f87171` | red-400, destructive text | Keep as `#f87171` -- semantic destructive text variant. |

**Summary of what to convert vs. what to leave:**

CONVERT (theme grays + `--ring`/`--primary` when used as theme accent):
- `#09090b`, `#0a0a0c` -> `bg-background`, `text-background`
- `#18181b` -> `bg-card`, `text-card`
- `#27272a` -> `bg-secondary`, `border-secondary`
- `#3f3f46` -> `bg-input`, `border-border`
- `#a1a1aa` -> `text-muted-foreground`
- `#0891b2` -> `text-ring`, `bg-ring`, `border-ring`, `focus:border-ring`, `focus:ring-ring`
- `#71717a` -> `text-zinc-500`
- `#52525b` -> `text-zinc-600`, `bg-zinc-600`
- `#f4f4f5` -> `text-zinc-100`
- `#e4e4e7` -> `text-zinc-200`
- `#d4d4d8` -> `text-zinc-300`
- `#ef4444` -> `bg-destructive`, `text-destructive`, `border-destructive` (when used as theme destructive)
- `#111113` -> `bg-sidebar`

LEAVE AS-IS (instrument palette, feature accents, status colors, dynamic styles):
- `#06b6d4`, `#34d399`, `#fbbf24`, `#a78bfa`, `#14b8a6` in INSTRUMENT_COLORS / INSTRUMENTS arrays
- `#14b8a6` (active accent), `#2dd4bf` (playhead), `#5eead4` (active text)
- `#22c55e`, `#4ade80` (status green), `#fbbf24` (status amber), `#f59e0b` (mute amber)
- `#f87171` (destructive text variant)
- Dynamic inline styles using instrument `color` prop
- `rgba()` values used for opacity variants (convert the hex portion where possible)
- SVG `fill` attributes for the playhead triangle
- LoginPage Google logo SVG `fill` colors (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`)

---

## Delegation Strategy

**File overlap map:** _(which tasks edit the same source files)_

| Source file | Edited by tasks |
|---|---|
| `src/components/layout/AppShell.tsx` | T1 |
| `src/components/layout/TopBar.tsx` | T1 |
| `src/components/layout/StatusBar.tsx` | T1 |
| `src/components/arrangement/ArrangementView.tsx` | T2 |
| `src/components/sequencer-block.tsx` | T2 |
| `src/components/left-panel/SectionContext.tsx` | T3 |
| `src/components/left-panel/BlockContext.tsx` | T3 |
| `src/components/left-panel/StyleControlsSection.tsx` | T3 |
| `src/components/left-panel/InputSection.tsx` | T3 |
| `src/components/mixer/MixerDrawer.tsx` | T4 |
| `src/components/transport/TransportBar.tsx` | T4 |
| `src/components/shared/ConfirmDialog.tsx` | T5 |
| `src/components/shared/ScopeBadge.tsx` | T5 |
| `src/components/library/ProjectCard.tsx` | T5 |
| `src/components/left-panel/ChordPalette.tsx` | T5 |
| `src/components/left-panel/AiAssistantSection.tsx` | T5 |

No file overlaps between tasks -- each file is edited by exactly one task.

**Batch assignments:**

| Batch | Tasks | Mode | Agent prompt |
|---|---|---|---|
| 1 | T1-T5 | sequential | "Read `specs/EXECUTION_QUEUE_theme_token_migration.md`. Execute ALL tasks T1-T5. After T5, perform the Completion Check and Intent Trace." |

5 tasks, no file overlaps, single sequential agent is the correct strategy. All tasks are simple find-and-replace refactors on distinct files.

---

## Task Queue

---

### [x] T1 -- Layout components: AppShell, TopBar, StatusBar

**Files:** `src/components/layout/AppShell.tsx`, `src/components/layout/TopBar.tsx`, `src/components/layout/StatusBar.tsx`
**Depends on:** none
**Tests:** none (existing tests must still pass)

**Background:**

These three layout shell components have 12 hardcoded hex values total. AppShell has 1, TopBar has 4, StatusBar has 7. All are zinc-gray theme values that map directly to forge tokens.

**What to build:**

**Step 1 -- Read all three files first.**

Before writing any code, read `src/components/layout/AppShell.tsx`, `src/components/layout/TopBar.tsx`, and `src/components/layout/StatusBar.tsx` to confirm the current structure matches what the spec expects. If the structure differs significantly, stop and report before proceeding.

**Step 2 -- AppShell.tsx (1 change).**

| Line | Old | New | Rationale |
|------|-----|-----|-----------|
| 45 | `bg-[#09090b]` | `bg-background` | `--background` = `#09090b` |

**Step 3 -- TopBar.tsx (4 changes).**

| Line | Old | New | Rationale |
|------|-----|-----|-----------|
| 221 | `bg-[#0891b2]/10` | `bg-ring/10` | `--ring` = `#0891b2` |
| 222 | `text-[#06b6d4]` | `text-primary` | `--primary` = `#06b6d4`. This is the AF monogram, not instrument color. |
| 246 | `focus:border-[#0891b2]` | `focus:border-ring` | `--ring` = `#0891b2` |
| 267 | `bg-[#4ade80]` : `bg-[#fbbf24]` | LEAVE AS-IS | Status indicator colors -- semantic, not theme tokens. |

So TopBar has 3 actual changes (line 267 is left as-is).

**Step 4 -- StatusBar.tsx (7 changes).**

| Line | Old | New | Rationale |
|------|-----|-----|-----------|
| 10 | `bg-[#22c55e]` | LEAVE AS-IS | Semantic status green |
| 14 | `bg-[#fbbf24]` | LEAVE AS-IS | Semantic status amber |
| 18 | `bg-[#ef4444]` | `bg-destructive` | `--destructive` = `#ef4444` |
| 34 | `border-[#27272a]` | `border-secondary` | `--secondary` = `#27272a` |
| 34 | `bg-[#18181b]/80` | `bg-card/80` | `--card` = `#18181b` |
| 41 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 45 | `text-[#52525b]` | `text-zinc-600` | zinc-600 |
| 50 | `text-[#52525b]` | `text-zinc-600` | zinc-600 |

Total actual changes: AppShell=1, TopBar=3, StatusBar=5 = **9 changes**.

**Verify:**

Compilation:
```
npm run build
```

Behavioral:
```
Open the app at http://localhost:5173 in a browser.
Look at the top bar: AF monogram should be teal on dark background, save indicator dot should be green (saved) or amber (unsaved).
Look at the status bar at the bottom: "Saved" label, "Arrangement Forge" center text, "v0.1.0" right text should all be visible in subtle gray tones, identical to before.
The overall page background should be the same near-black (#09090b) color.
All text should be the same shade and contrast as before the migration.
```

---

### [x] T2 -- Arrangement components: ArrangementView, SequencerBlock

**Files:** `src/components/arrangement/ArrangementView.tsx`, `src/components/sequencer-block.tsx`
**Depends on:** none
**Tests:** none (existing tests must still pass)

**Background:**

ArrangementView has the most hardcoded hex values (31) of any file. SequencerBlock has 7, but most are instrument palette colors (leave as-is) and dynamic background computations (leave as-is). Many ArrangementView values are in inline `style={}` attributes, which need different treatment than className replacements.

**What to build:**

**Step 1 -- Read both files first.**

Read `src/components/arrangement/ArrangementView.tsx` and `src/components/sequencer-block.tsx` to confirm structure.

**Step 2 -- SequencerBlock.tsx changes.**

The INSTRUMENT_COLORS record (lines 7-13) must stay as-is -- these are instrument palette colors.

| Line | Old | New | Rationale |
|------|-----|-----|-----------|
| 7-13 | INSTRUMENT_COLORS record | LEAVE AS-IS | Instrument palette |
| 47 | `#141416` (inline style string) | LEAVE AS-IS | Part of dynamic gradient computation with instrument `color` variable |
| 48 | `#111113` (inline style string) | LEAVE AS-IS | Part of dynamic gradient computation with instrument `color` variable |

**No changes to SequencerBlock.** All hex values are either instrument palette or dynamic gradient computations that must stay as literal hex for the template string interpolation.

**Step 3 -- ArrangementView.tsx EmptyState changes (lines 27-62).**

| Line | Old | New | Rationale |
|------|-----|-----|-----------|
| 29 | `bg-[#0a0a0c]` | `bg-background` | ~= `--background` (#09090b) |
| 34 | `text-[#3f3f46]` | `text-border` | `--border` = `#3f3f46` (icon color) |
| 47 | `text-[#d4d4d8]` | `text-zinc-300` | zinc-300 |
| 50 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 56 | `bg-[#14b8a6]` | LEAVE AS-IS | Active accent teal |
| 56 | `text-[#09090b]` | `text-background` | `--background` = `#09090b`, used as dark text on teal button |
| 56 | `hover:bg-[#2dd4bf]` | LEAVE AS-IS | Teal hover accent |

**Step 4 -- ArrangementView.tsx main grid gutter changes (lines 147-198).**

| Line | Old | New | Rationale |
|------|-----|-----|-----------|
| 147 | `"#a1a1aa"` (fallback in JS expression) | LEAVE AS-IS | This is a JS fallback string for `INSTRUMENT_COLORS[stem.instrument] ?? "#a1a1aa"`. Changing to a CSS var in a JS expression doesn't work. Leave as-is. |
| 155 | `bg-[#0a0a0c]` | `bg-background` | ~= `--background` |
| 157 | `border-[#27272a]` | `border-secondary` | `--secondary` = `#27272a` |
| 157 | `bg-[#0a0a0c]` | `bg-background` | ~= `--background` |
| 160 | `border-[#27272a]` | `border-secondary` | `--secondary` = `#27272a` |
| 160 | `bg-[#18181b]` | `bg-card` | `--card` = `#18181b` |
| 165 | `border-[#27272a]` | `border-secondary` | `--secondary` = `#27272a` |
| 165 | `bg-[#18181b]/80` | `bg-card/80` | `--card` = `#18181b` |
| 174 | `border-[#27272a]` | `border-secondary` | `--secondary` = `#27272a` |
| 177 | `"#18181b"` (inline style) | LEAVE AS-IS | Inline `style={{ backgroundColor }}` in JS -- cannot use Tailwind class in style attribute. Would require restructuring. Leave for now. |
| 177 | `"rgba(9,9,11,0.6)"` (inline style) | LEAVE AS-IS | Same reason as above. |
| 184 | `text-[#a1a1aa]` | `text-muted-foreground` | `--muted-foreground` = `#a1a1aa` |
| 192 | `border-[#27272a]` (appears twice) | `border-secondary` | `--secondary` = `#27272a` |
| 192 | `border-t-[#3f3f46]/50` | `border-t-border/50` | `--border` = `#3f3f46` |
| 193 | `backgroundColor: "#18181b"` (inline style) | LEAVE AS-IS | Inline style object |
| 195 | `text-[#52525b]` | `text-zinc-600` | zinc-600 |

**Step 5 -- ArrangementView.tsx section headers (lines 230-250).**

| Line | Old | New | Rationale |
|------|-----|-----|-----------|
| 233 | `border-r-[#3f3f46]/50` | `border-r-border/50` | `--border` = `#3f3f46` |
| 235 | `border-l-[#0891b2]` | `border-l-ring` | `--ring` = `#0891b2` |
| 235 | `bg-[#0891b2]/10` | `bg-ring/10` | `--ring` = `#0891b2` |
| 235 | `text-[#f4f4f5]` | `text-zinc-100` | zinc-100 |
| 236 | `border-l-[#52525b]` | `border-l-zinc-600` | zinc-600 |
| 236 | `bg-[#27272a]/40` | `bg-secondary/40` | `--secondary` = `#27272a` |
| 236 | `text-[#d4d4d8]` | `text-zinc-300` | zinc-300 |
| 236 | `hover:bg-[#27272a]/60` | `hover:bg-secondary/60` | `--secondary` = `#27272a` |
| 243 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |

**Step 6 -- ArrangementView.tsx ruler + stem lanes + chord lane (lines 253-400).**

| Line | Old | New | Rationale |
|------|-----|-----|-----------|
| 253 | `bg-[#18181b]/80` | `bg-card/80` | `--card` = `#18181b` |
| 283 | `"#52525b"` (inline style) | LEAVE AS-IS | Inline `style={{ backgroundColor }}` |
| 291 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 291 | `text-[#52525b]` | `text-zinc-600` | zinc-600 |
| 309 | `border-[#27272a]` | `border-secondary` | `--secondary` = `#27272a` |
| 314 | `"#18181b"` (inline style) | LEAVE AS-IS | Inline style |
| 377 | `border-[#3f3f46]/50` | `border-border/50` | `--border` = `#3f3f46` |
| 380 | `backgroundColor: "#0a0a0c"` (inline style) | LEAVE AS-IS | Inline style |
| 392 | `bg-[#52525b]` | `bg-zinc-600` | zinc-600 |
| 393 | `text-[#a1a1aa]` | `text-muted-foreground` | `--muted-foreground` = `#a1a1aa` |
| 416 | `fill="#2dd4bf"` (SVG attr) | LEAVE AS-IS | Playhead color, feature accent |
| 423 | `bg-[#2dd4bf]/80` | LEAVE AS-IS | Playhead color, feature accent |

**Verify:**

Compilation:
```
npm run build
```

Behavioral:
```
Open the app at http://localhost:5173 in a browser. Ensure the arrangement has been generated (click Generate if needed).
Verify the arrangement grid:
- Left gutter: instrument labels (DRUMS, BASS, etc.) should be in muted gray, with colored dots.
- Section headers: "Intro", "Verse", etc. should be visible. Click a section -- it should highlight with teal left border.
- Bar ruler: bar numbers should be visible in alternating gray tones.
- Stem lanes: alternating dark backgrounds, blocks with instrument-colored borders.
- Chord lane: chord names in muted gray below the stems.
- Playhead: teal vertical line with triangle should be visible.
Everything must look identical to before the migration.
```

---

### [ ] T3 -- Inspector/context components: SectionContext, BlockContext, StyleControlsSection, InputSection

**Files:** `src/components/left-panel/SectionContext.tsx`, `src/components/left-panel/BlockContext.tsx`, `src/components/left-panel/StyleControlsSection.tsx`, `src/components/left-panel/InputSection.tsx`
**Depends on:** none
**Tests:** none (existing tests must still pass)

**Background:**

These four left-panel components have 24 + 21 + 3 + 5 = 53 hardcoded hex values. Most are zinc grays for labels, inputs, borders, and backgrounds. BlockContext also has INSTRUMENT_COLORS which must stay.

**What to build:**

**Step 1 -- Read all four files first.**

Read each file to confirm the current structure matches what the spec expects.

**Step 2 -- SectionContext.tsx (24 instances, ~18 changes after exclusions).**

| Line | Old | New | Rationale |
|------|-----|-----|-----------|
| 136 | `bg-[#27272a]` | `bg-secondary` | `--secondary` = `#27272a` |
| 137 | `stroke="#a1a1aa"` (SVG attr) | LEAVE AS-IS | SVG inline attribute, cannot use Tailwind. Would need restructuring. Leave. |
| 145 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 159 | `border-[#3f3f46]` | `border-border` | `--border` = `#3f3f46` |
| 159 | `bg-[#27272a]` | `bg-secondary` | `--secondary` = `#27272a` |
| 160 | `text-[#f4f4f5]` | `text-zinc-100` | zinc-100 |
| 161 | `focus:border-[#0891b2]/50` | `focus:border-ring/50` | `--ring` = `#0891b2` |
| 161 | `focus:ring-[#0891b2]/30` | `focus:ring-ring/30` | `--ring` = `#0891b2` |
| 166 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 173 | `bg-[#3f3f46]` | `bg-input` | `--input` = `#3f3f46` |
| 173 | `text-[#a1a1aa]` | `text-muted-foreground` | `--muted-foreground` = `#a1a1aa` |
| 173 | `hover:bg-[#52525b]` | `hover:bg-zinc-600` | zinc-600 |
| 173 | `hover:text-[#f4f4f5]` | `hover:text-zinc-100` | zinc-100 |
| 177 | `text-[#f4f4f5]` | `text-zinc-100` | zinc-100 |
| 183 | `bg-[#3f3f46]` | `bg-input` | `--input` = `#3f3f46` |
| 183 | `text-[#a1a1aa]` | `text-muted-foreground` | `--muted-foreground` = `#a1a1aa` |
| 183 | `hover:bg-[#52525b]` | `hover:bg-zinc-600` | zinc-600 |
| 183 | `hover:text-[#f4f4f5]` | `hover:text-zinc-100` | zinc-100 |
| 190 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 196 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 202 | `text-[#0891b2]` | `text-ring` | `--ring` = `#0891b2` |
| 202 | `hover:text-[#22d3ee]` | `hover:text-primary` | Close to `--primary` (#06b6d4), acceptable hover brightening. |
| 215 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 232 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 236 | `border-[#3f3f46]` | `border-border` | `--border` = `#3f3f46` |
| 236 | `bg-[#27272a]` | `bg-secondary` | `--secondary` = `#27272a` |
| 248 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 252 | `border-[#3f3f46]` | `border-border` | `--border` = `#3f3f46` |
| 252 | `bg-[#27272a]` | `bg-secondary` | `--secondary` = `#27272a` |
| 269 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 276 | `bg-[#27272a]` | `bg-secondary` | `--secondary` = `#27272a` |
| 281 | `background: "#0891b2"` (inline style) | LEAVE AS-IS | Inline style for slider fill -- cannot use Tailwind class. |
| 297 | `border-[#0891b2]` | `border-ring` | `--ring` = `#0891b2` |
| 303 | `border-[#0891b2]` | `border-ring` | `--ring` = `#0891b2` |
| 316 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |

**Step 3 -- BlockContext.tsx (21 instances, changes only for theme grays).**

| Line | Old | New | Rationale |
|------|-----|-----|-----------|
| 11-15 | INSTRUMENT_COLORS record | LEAVE AS-IS | Instrument palette |
| 52 | `bg-[#3f3f46]` | `bg-input` | `--input` = `#3f3f46` |
| 101 | `text-[#a1a1aa]` | `text-muted-foreground` | `--muted-foreground` = `#a1a1aa` |
| 108 | `text-[#52525b]` | `text-zinc-600` | zinc-600 |
| 108 | `hover:text-[#d4d4d8]` | `hover:text-zinc-300` | zinc-300 |
| 148 | `bg-[#0891b2]` | `bg-ring` | `--ring` = `#0891b2` |
| 148 | `bg-[#3f3f46]` | `bg-input` | `--input` = `#3f3f46` |
| 153 | `bg-[#f4f4f5]` | `bg-zinc-100` | zinc-100 |
| 244 | `text-[#e4e4e7]` | `text-zinc-200` | zinc-200 |
| 246 | `text-[#a1a1aa]` | `text-muted-foreground` | `--muted-foreground` = `#a1a1aa` |
| 251 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 267 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 285 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 294 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 304 | `border-[#3f3f46]` | `border-border` | `--border` = `#3f3f46` |
| 304 | `bg-[#27272a]` | `bg-secondary` | `--secondary` = `#27272a` |
| 305 | `text-[#f4f4f5]` | `text-zinc-100` | zinc-100 |
| 306 | `focus:border-[#0891b2]/50` | `focus:border-ring/50` | `--ring` = `#0891b2` |
| 306 | `focus:ring-[#0891b2]/30` | `focus:ring-ring/30` | `--ring` = `#0891b2` |
| 314 | `bg-[#3f3f46]` | `bg-input` | `--input` = `#3f3f46` |
| 314 | `text-[#d4d4d8]` | `text-zinc-300` | zinc-300 |
| 314 | `hover:bg-[#52525b]` | `hover:bg-zinc-600` | zinc-600 |
| 314 | `hover:text-[#f4f4f5]` | `hover:text-zinc-100` | zinc-100 |
| 320 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |

**Step 4 -- StyleControlsSection.tsx (3 instances).**

| Line | Old | New | Rationale |
|------|-----|-----|-----------|
| 128 | `background: "#0891b2"` (inline style) | LEAVE AS-IS | Inline style for slider fill |
| 142 | `border-[#0891b2]` | `border-ring` | `--ring` = `#0891b2` |
| 148 | `border-[#0891b2]` | `border-ring` | `--ring` = `#0891b2` |

**Step 5 -- InputSection.tsx (5 instances).**

| Line | Old | New | Rationale |
|------|-----|-----|-----------|
| 36 | `bg-[#0891b2]` | `bg-ring` | `--ring` = `#0891b2` |
| 75 | `focus:border-[#0891b2]` | `focus:border-ring` | `--ring` = `#0891b2` |
| 75 | `focus:ring-[#0891b2]/50` | `focus:ring-ring/50` | `--ring` = `#0891b2` |
| 106 | `focus:border-[#0891b2]` | `focus:border-ring` | `--ring` = `#0891b2` |
| 106 | `focus:ring-[#0891b2]/50` | `focus:ring-ring/50` | `--ring` = `#0891b2` |
| 119 | `bg-[#27272a]` | `bg-secondary` | `--secondary` = `#27272a` |
| 120 | `bg-[#14b8a6]` | LEAVE AS-IS | Active accent teal |
| 120 | `text-[#09090b]` | `text-background` | `--background` = `#09090b`, dark text on teal button |
| 120 | `hover:bg-[#2dd4bf]` | LEAVE AS-IS | Teal hover accent |

**Verify:**

Compilation:
```
npm run build
```

Behavioral:
```
Open the app at http://localhost:5173 in a browser.
1. Click a section header in the arrangement to open SectionContext. Verify:
   - "Section Inspector" header with icon badge, section name input field.
   - All labels ("Section Name", "Length", "Style") in muted gray.
   - +/- buttons for bar count with correct gray styling.
   - "Override" link in teal, "Inherits from song" in muted gray.
   - Genre/Sub-style dropdowns with gray borders and backgrounds.
   - Sliders with teal fill bars.
   - "Delete Section" link in muted gray.
2. Click a block in the arrangement to open BlockContext. Verify:
   - Instrument-colored dot + name + bar range displayed.
   - Volume and Pan sliders with instrument-colored fill.
   - Chord toggle switch (teal when on, gray when off).
   - "Duplicate Block" button in gray, "Delete Block" in muted gray.
3. Look at StyleControlsSection (below the input section in the left panel default view). Verify:
   - Genre and Sub-style dropdowns have correct styling.
   - All 5 sliders (Energy, Groove, Feel, Swing %, Dynamics) show teal fills.
   - Slider thumb borders should be teal.
4. Look at InputSection. Verify:
   - Tab switcher with teal active tab.
   - Text inputs with teal focus rings.
   - Generate button teal (or disabled gray).
All must look identical to before the migration.
```

---

### [ ] T4 -- Mixer + Transport: MixerDrawer, TransportBar

**Files:** `src/components/mixer/MixerDrawer.tsx`, `src/components/transport/TransportBar.tsx`
**Depends on:** none
**Tests:** none (existing tests must still pass)

**Background:**

MixerDrawer has 30 hex instances and TransportBar has 21. Both have instrument palette colors that must stay. MixerDrawer has dynamic thumb colors and gradient computations that must stay.

**What to build:**

**Step 1 -- Read both files first.**

Read `src/components/mixer/MixerDrawer.tsx` and `src/components/transport/TransportBar.tsx`.

**Step 2 -- MixerDrawer.tsx changes.**

| Line | Old | New | Rationale |
|------|-----|-----|-----------|
| 11-15 | INSTRUMENTS array colors | LEAVE AS-IS | Instrument palette |
| 94 | `bg-[#3f3f46]` | `bg-input` | `--input` = `#3f3f46` |
| 130 | `bg-[#27272a]` | `bg-secondary` | `--secondary` = `#27272a` |
| 135 | `"linear-gradient(to top, #14b8a6, #fbbf24 70%, #ef4444 95%)"` (inline style) | LEAVE AS-IS | Level meter gradient, feature-specific visualization |
| 182 | `text-[#a1a1aa]` | `text-muted-foreground` | `--muted-foreground` = `#a1a1aa` |
| 193 | `bg-[#3f3f46]` | `bg-input` | `--input` = `#3f3f46` |
| 193 | `accent-[#06b6d4]` | `accent-primary` | `--primary` = `#06b6d4`. This is the drum sub-mix slider accent, used as theme accent not instrument-specific. |
| 193 | `[&::-webkit-slider-thumb]:bg-[#06b6d4]` | `[&::-webkit-slider-thumb]:bg-primary` | Same as above |
| 195 | `text-[#52525b]` | `text-zinc-600` | zinc-600 |
| 237 | `border-[#3f3f46]/50` | `border-border/50` | `--border` = `#3f3f46` |
| 237 | `bg-[#18181b]` | `bg-card` | `--card` = `#18181b` |
| 244 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 248 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 250 | `bg-[#52525b]` | `bg-zinc-600` | zinc-600 |
| 266 | `border-[#27272a]` | `border-secondary` | `--secondary` = `#27272a` |
| 301 | `bg-[#f59e0b]/80` | LEAVE AS-IS | Mute active amber |
| 301 | `text-[#18181b]` | `text-card` | `--card` = `#18181b`, dark text on amber bg |
| 302 | `bg-[#3f3f46]` | `bg-input` | `--input` = `#3f3f46` |
| 302 | `text-[#a1a1aa]` | `text-muted-foreground` | `--muted-foreground` = `#a1a1aa` |
| 302 | `hover:bg-[#52525b]` | `hover:bg-zinc-600` | zinc-600 |
| 313 | `bg-[#14b8a6]/80` | LEAVE AS-IS | Solo active teal |
| 313 | `text-[#18181b]` | `text-card` | `--card` = `#18181b`, dark text on teal bg |
| 314 | `bg-[#3f3f46]` | `bg-input` | `--input` = `#3f3f46` |
| 314 | `text-[#a1a1aa]` | `text-muted-foreground` | `--muted-foreground` = `#a1a1aa` |
| 314 | `hover:bg-[#52525b]` | `hover:bg-zinc-600` | zinc-600 |
| 329 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 338 | `bg-[#27272a]/60` | `bg-secondary/60` | `--secondary` = `#27272a` |
| 339 | `borderTop: "2px solid #71717a"` (inline style) | LEAVE AS-IS | Inline style |
| 342 | `text-[#a1a1aa]` | `text-muted-foreground` | `--muted-foreground` = `#a1a1aa` |
| 355 | `thumbColor="#e4e4e7"` (JSX prop) | LEAVE AS-IS | Dynamic prop passed to VerticalFader, used in inline styles |
| 360 | `text-[#a1a1aa]` | `text-muted-foreground` | `--muted-foreground` = `#a1a1aa` |
| 368 | `border-[#27272a]` | `border-secondary` | `--secondary` = `#27272a` |
| 368 | `bg-[#1a1a1f]` | `bg-card` | ~= `--card` (#18181b) |
| 370 | `text-[#06b6d4]` | `text-primary` | `--primary` = `#06b6d4`. "Drum Kit Mix" label -- theme accent not instrument color. |
| 373 | `border-[#27272a]` | `border-secondary` | `--secondary` = `#27272a` |
| 377 | `text-[#52525b]` | `text-zinc-600` | zinc-600 |
| 377 | `hover:text-[#71717a]` | `hover:text-zinc-500` | zinc-500 |

**Step 3 -- TransportBar.tsx changes.**

| Line | Old | New | Rationale |
|------|-----|-----|-----------|
| 93 | `border-[#3f3f46]/50` | `border-border/50` | `--border` = `#3f3f46` |
| 93 | `bg-[#18181b]/95` | `bg-card/95` | `--card` = `#18181b` |
| 95 | `bg-[#27272a]` | `bg-secondary` | `--secondary` = `#27272a` |
| 100 | `text-[#a1a1aa]` | `text-muted-foreground` | `--muted-foreground` = `#a1a1aa` |
| 100 | `hover:text-[#f4f4f5]` | `hover:text-zinc-100` | zinc-100 |
| 110 | `text-[#a1a1aa]` | `text-muted-foreground` | `--muted-foreground` = `#a1a1aa` |
| 110 | `hover:text-[#f4f4f5]` | `hover:text-zinc-100` | zinc-100 |
| 123 | `bg-[#14b8a6]` | LEAVE AS-IS | Active accent teal |
| 123 | `text-[#09090b]` | `text-background` | `--background` = `#09090b` |
| 124 | `bg-[#3f3f46]` | `bg-input` | `--input` = `#3f3f46` |
| 124 | `text-[#e4e4e7]` | `text-zinc-200` | zinc-200 |
| 124 | `hover:bg-[#52525b]` | `hover:bg-zinc-600` | zinc-600 |
| 142 | `text-[#a1a1aa]` | `text-muted-foreground` | `--muted-foreground` = `#a1a1aa` |
| 142 | `hover:text-[#f4f4f5]` | `hover:text-zinc-100` | zinc-100 |
| 152 | `bg-[#27272a]` | `bg-secondary` | `--secondary` = `#27272a` |
| 153 | `text-[#e4e4e7]` | `text-zinc-200` | zinc-200 |
| 154 | `text-[#52525b]` | `text-zinc-600` | zinc-600 |
| 155 | `text-[#e4e4e7]` | `text-zinc-200` | zinc-200 |
| 160 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 181 | `bg-[#27272a]` | `bg-secondary` | `--secondary` = `#27272a` |
| 181 | `text-[#e4e4e7]` | `text-zinc-200` | zinc-200 |
| 182 | `focus:border-[#0891b2]` | `focus:border-ring` | `--ring` = `#0891b2` |
| 194 | `text-[#e4e4e7]` | `text-zinc-200` | zinc-200 |
| 194 | `hover:bg-[#27272a]` | `hover:bg-secondary` | `--secondary` = `#27272a` |
| 202 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 214 | `bg-[#14b8a6]/15` | LEAVE AS-IS | Active accent teal |
| 214 | `text-[#5eead4]` | LEAVE AS-IS | Active toggle text |
| 215 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 215 | `hover:text-[#a1a1aa]` | `hover:text-muted-foreground` | `--muted-foreground` = `#a1a1aa` |
| 230 | `bg-[#14b8a6]/15` | LEAVE AS-IS | Active accent teal |
| 230 | `text-[#5eead4]` | LEAVE AS-IS | Active toggle text |
| 231 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |
| 231 | `hover:text-[#a1a1aa]` | `hover:text-muted-foreground` | `--muted-foreground` = `#a1a1aa` |
| 240 | `text-[#71717a]` | `text-zinc-500` | zinc-500 |

**Verify:**

Compilation:
```
npm run build
```

Behavioral:
```
Open the app at http://localhost:5173 in a browser.
1. Look at the mixer drawer (bottom of the editor, above transport):
   - "Mixer" header in muted gray with X/collapse icon.
   - Instrument channel strips with colored top borders (teal, green, amber, purple, teal).
   - M/S buttons: gray when inactive, amber/teal when active.
   - Vertical faders with instrument-colored thumbs.
   - dB readouts in muted gray.
   - Master channel with "MASTER" label, level meters, fader.
   - If drum sub-mix is open: "Drum Kit Mix" label in teal, sub-mix sliders.
2. Look at the transport bar (bottom):
   - Playback button group in dark pill shape (skip, stop, play/pause, skip).
   - Play button teal when playing, gray when stopped.
   - Bar|Beat counter in white text on dark background.
   - BPM display, time signature.
   - Loop and Metronome toggles (gray inactive, teal active).
   - Elapsed time in muted gray.
All must look identical to before the migration.
```

---

### [ ] T5 -- Shared components + Pages + ChordPalette + AiAssistant

**Files:** `src/components/shared/ConfirmDialog.tsx`, `src/components/shared/ScopeBadge.tsx`, `src/components/library/ProjectCard.tsx`, `src/components/left-panel/ChordPalette.tsx`, `src/components/left-panel/AiAssistantSection.tsx`
**Depends on:** none
**Tests:** none (existing tests must still pass)

**Background:**

These remaining 5 files have 8 + 6 + 6 + 13 + 8 = 41 hardcoded hex values. ConfirmDialog uses destructive/warning semantic colors. ScopeBadge uses scope-specific accent colors. ProjectCard uses zinc Tailwind classes (which are already better than raw hex, but some raw hex remains). ChordPalette uses `#06b6d4` extensively as the TEAL accent constant. AiAssistantSection has instrument-related scope colors.

**What to build:**

**Step 1 -- Read all five files first.**

Read each file to confirm the current structure matches what the spec expects.

**Step 2 -- ConfirmDialog.tsx (8 instances).**

| Line | Old | New | Rationale |
|------|-----|-----|-----------|
| 42 | `bg-[#09090b]/80` | `bg-background/80` | `--background` = `#09090b` |
| 51 | `border-[#3f3f46]/50` | `border-border/50` | `--border` = `#3f3f46` |
| 51 | `bg-[#18181b]` | `bg-card` | `--card` = `#18181b` |
| 60 | `text-[#fbbf24]` | LEAVE AS-IS | Warning icon color, semantic amber |
| 84 | `text-[#f4f4f5]` | `text-zinc-100` | zinc-100 |
| 92 | `text-[#a1a1aa]` | `text-muted-foreground` | `--muted-foreground` = `#a1a1aa` |
| 102 | `bg-[#3f3f46]` | `bg-input` | `--input` = `#3f3f46` |
| 102 | `text-[#e4e4e7]` | `text-zinc-200` | zinc-200 |
| 102 | `hover:bg-[#52525b]` | `hover:bg-zinc-600` | zinc-600 |
| 112 | `border-[#ef4444]/30 bg-[#ef4444]/10 text-[#f87171] hover:bg-[#ef4444]/20` | `border-destructive/30 bg-destructive/10 text-[#f87171] hover:bg-destructive/20` | `--destructive` = `#ef4444`. Leave `#f87171` (red-400) as-is -- it's a lighter variant not in the theme. |
| 113 | `border-[#fbbf24]/30 bg-[#fbbf24]/10 text-[#fbbf24] hover:bg-[#fbbf24]/20` | LEAVE AS-IS | Warning variant -- `#fbbf24` is a semantic warning amber, not a theme token. |

**Step 3 -- ScopeBadge.tsx (6 instances).**

| Line | Old | New | Rationale |
|------|-----|-----|-----------|
| 7 | `bg-[#3f3f46]/60` | `bg-input/60` | `--input` = `#3f3f46` |
| 8 | `text-[#a1a1aa]` | `text-muted-foreground` | `--muted-foreground` = `#a1a1aa` |
| 12 | `bg-[#14b8a6]/10` | LEAVE AS-IS | Section scope accent teal |
| 13 | `text-[#2dd4bf]` | LEAVE AS-IS | Section scope accent teal |
| 17 | `bg-[#f59e0b]/10` | LEAVE AS-IS | Block scope accent amber |
| 18 | `text-[#fbbf24]` | LEAVE AS-IS | Block scope accent amber |

**Step 4 -- ProjectCard.tsx (6 instances).**

ProjectCard uses Tailwind `zinc-*` classes which are already better than raw hex. But it has 2 raw hex values.

| Line | Old | New | Rationale |
|------|-----|-----|-----------|
| 4-8 | INSTRUMENT_COLORS array | LEAVE AS-IS | Instrument palette |
| 50 | `bg-[#0891b2]/10` | `bg-ring/10` | `--ring` = `#0891b2` |
| 50 | `text-[#06b6d4]` | `text-primary` | `--primary` = `#06b6d4`. Genre badge color, not instrument color. |

Note: The `zinc-*` Tailwind classes on this component (zinc-700, zinc-800, zinc-100, etc.) are already acceptable -- they use the Tailwind palette directly, not raw hex. They could be migrated to semantic tokens for full theme flexibility, but that is a separate concern and out of scope for this hex-removal task. Leave them.

**Step 5 -- ChordPalette.tsx (13 instances).**

| Line | Old | New | Rationale |
|------|-----|-----|-----------|
| 68 | `const TEAL = "#06b6d4"` | LEAVE AS-IS | Used in JS template strings for box-shadow. Equals `--primary` but is used as a JS constant for inline style computation. Cannot be a CSS class. |
| 175 | `focus:border-[#0891b2]` | `focus:border-ring` | `--ring` = `#0891b2` |
| 175 | `focus:ring-[#0891b2]/50` | `focus:ring-ring/50` | `--ring` = `#0891b2` |
| 176 | `#27272a33` (inside bg-[linear-gradient]) | LEAVE AS-IS | Part of a Tailwind arbitrary value linear-gradient. Cannot use CSS var here. |
| 182 | `text-[#0891b2]` | `text-ring` | `--ring` = `#0891b2` |
| 182 | `hover:text-[#06b6d4]` | `hover:text-primary` | `--primary` = `#06b6d4` |
| 222 | `bg-[#71717a]` | `bg-zinc-500` | zinc-500, barline indicator |
| 230 | `border-[#06b6d4]/60` | `border-primary/60` | `--primary` = `#06b6d4` |
| 230 | `ring-[#06b6d4]/40` | `ring-primary/40` | `--primary` = `#06b6d4` |
| 247 | `bg-[#3f3f46]` | `bg-input` | `--input` = `#3f3f46` |
| 247 | `hover:bg-[#52525b]` | `hover:bg-zinc-600` | zinc-600 |
| 287 | `focus:border-[#0891b2]` | `focus:border-ring` | `--ring` = `#0891b2` |
| 339 | `border-[#06b6d4] bg-[#06b6d4]` | `border-primary bg-primary` | `--primary` = `#06b6d4` |
| 367 | `border-[#06b6d4] bg-[#06b6d4]` | `border-primary bg-primary` | `--primary` = `#06b6d4` |
| 391 | `border-[#06b6d4]/30 bg-[#06b6d4]/10 text-[#06b6d4] hover:bg-[#06b6d4]/20` | `border-primary/30 bg-primary/10 text-primary hover:bg-primary/20` | `--primary` = `#06b6d4` |
| 441 | `hover:text-[#0891b2]` | `hover:text-ring` | `--ring` = `#0891b2` |
| 480 | `border-[#06b6d4]` | `border-primary` | `--primary` = `#06b6d4` |
| 480 | `bg-[#06b6d4]/15` | `bg-primary/15` | `--primary` = `#06b6d4` |
| 487 | `text-[#06b6d4]` | `text-primary` | `--primary` = `#06b6d4` |

**Step 6 -- AiAssistantSection.tsx (8 instances).**

| Line | Old | New | Rationale |
|------|-----|-----|-----------|
| 19-24 | SCOPE_COLORS record | LEAVE AS-IS | Scope colors used in inline styles for dynamic badge rendering. The values are instrument-related + primary accent. Cannot use CSS classes in inline styles. |
| 104 | `bg-[#0891b2]/15` | `bg-ring/15` | `--ring` = `#0891b2` |
| 104 | `border-[#0891b2]/20` | `border-ring/20` | `--ring` = `#0891b2` |
| 140 | `bg-[#0891b2]` | `bg-ring` | `--ring` = `#0891b2` |
| 140 | `hover:bg-[#0891b2]/80` | `hover:bg-ring/80` | `--ring` = `#0891b2` |

**Verify:**

Compilation:
```
npm run build
```

Behavioral:
```
Open the app at http://localhost:5173 in a browser.
1. ConfirmDialog: Navigate to the Library page, click the delete button on a project card to trigger the ConfirmDialog. Verify:
   - Dark overlay with blur behind.
   - White card with warning icon in amber, title in near-white, body text in muted gray.
   - Cancel button gray, Delete button with red border/text.
   - Escape key closes the dialog.
2. ScopeBadge: Open the left panel AI Assistant section. Scope badges appear next to messages. Verify they have correct colored backgrounds and text.
3. ProjectCard: Navigate to the Library page. Verify project cards show:
   - Genre badge with teal background tint and primary text color.
   - Instrument density bars in correct instrument colors.
4. ChordPalette: In the left panel Chord tab, verify:
   - Diatonic chord buttons flash teal when clicked.
   - Custom chord builder root/quality buttons highlight in teal when selected.
   - "Add" button has teal border and text.
   - Chord cells in the progression grid have appropriate border highlighting for recently added chords.
   - Focus rings on inputs are teal.
5. AiAssistantSection: In the left panel AI tab, verify:
   - User message bubbles have teal-tinted background with teal border.
   - Send button is teal when input has text, gray when empty.
All must look identical to before the migration.
```

---

## Completion Check

When all boxes are checked, run the full suite one final time:

```
npx vitest run
```

All tests must pass. Then perform the fresh eyes review:

**Fresh eyes review (one pass only).** Re-read every file you modified with
fresh eyes. Look for: leftover hardcoded hex values that should have been converted, broken Tailwind class names (typos like `bg-backgrond`), missing imports, classes that don't exist in the theme, opacity modifiers that don't work as expected. "Look both ways down one-way streets." Report any findings and fix them before proceeding. Do NOT run this review a second time.

Then perform the behavioral smoke test:

**Smoke test:**
1. Open the app at http://localhost:5173. Navigate through Library -> click a project -> Editor page. Verify the editor loads with correct dark theme, no visual glitches, no white flashes, no missing colors.
2. Click Generate (or use an existing project with generated content). Click through arrangement sections, blocks, inspect the left panel contexts. Toggle the mixer open/closed. Play/pause transport. All UI elements must be styled correctly with no visual difference from before the migration.
3. Open the browser DevTools Console. There should be no CSS-related warnings or errors.

## Intent Trace

After all tasks pass, verify the *system-level behavior* matches the original intent.

**Original intent:** Eliminate all hardcoded hex color values from React components, replacing them with the forge theme's CSS custom property tokens (via Tailwind semantic classes), so that the theme can be changed by modifying only `globals.css` without touching any component files.

### Structural (code wiring)

For each claim in the original intent, point to the line of code that makes it true:

- [ ] No `#09090b` hex literals remain in any component file's className or class string -> Verify with: `grep -rn "#09090b" src/components/ src/pages/` returns zero className matches (inline style and JS fallback matches are acceptable)
- [ ] No `#18181b` hex literals remain in component classNames -> Verify with: `grep -rn "#18181b" src/components/` shows only inline `style={}` occurrences, not className
- [ ] No `#27272a` hex literals remain in component classNames -> Verify with: `grep -rn "#27272a" src/components/` shows only inline `style={}` or linear-gradient occurrences
- [ ] No `#3f3f46` hex literals remain in component classNames -> Verify with: `grep -rn "#3f3f46" src/components/` shows zero className matches
- [ ] No `#a1a1aa` hex literals remain in component classNames -> Verify with: `grep -rn "#a1a1aa" src/components/` shows only JS fallback / SVG stroke occurrences
- [ ] No `#0891b2` hex literals remain in component classNames -> Verify with: `grep -rn "#0891b2" src/components/` shows only inline `style={}` occurrences
- [ ] `src/styles/globals.css` `:root` block is unchanged -> The theme definition was not modified during this migration

### Behavioral (end-to-end demo)

**Demo scenario:** A skeptical observer verifies the app looks identical after migration.

- [ ] Step: Open the app in a browser at http://localhost:5173. Navigate to the Library page.
  - Expect: Project cards display with correct dark theme. Genre badges are teal. Instrument density bars have correct colors.
- [ ] Step: Click a project to open the Editor. Look at the full editor layout (arrangement grid, mixer, transport bar, left panel).
  - Expect: All UI elements have the same dark theme styling as before the migration. No white backgrounds, no missing colors, no broken borders. The arrangement grid has properly colored section headers, stem lanes, and chord lane.
- [ ] Step: Click a section header, then a block. Inspect the left panel contexts (SectionContext, BlockContext).
  - Expect: Labels, inputs, sliders, buttons all styled correctly. Teal accents on toggle switches, focus rings, and override links. Instrument-colored elements (dots, sliders) still use their distinct colors.
- [ ] Step: Open the ConfirmDialog by attempting to delete a project from the Library page.
  - Expect: Dark overlay, card with warning icon, gray cancel button, red delete button -- all identical to before.

Theme Token Migration is complete when all tests pass AND both intent trace checks pass.

## Archive

When this queue is fully complete (all task boxes checked, all intent trace boxes
checked, all tests green), move this file to the `historical/` subdirectory:

```bash
mv specs/EXECUTION_QUEUE_theme_token_migration.md specs/historical/
git add -A specs/ && git commit -m "chore: archive completed execution queue theme_token_migration"
```
