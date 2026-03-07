# Spec: Converge Default-Loaded Files

**Status:** Draft
**Date:** 2026-03-07
**Origin:** Convergence audit against wi-system-v2 conventions

---

## 1. Problem Statement

The four files every agent reads before starting work (CLAUDE.md, ARCHITECTURE.md, DESIGN_SYSTEM.md, globals.css) total 1,108 lines and contain significant rot:

- **CLAUDE.md (232 lines)** is 7x larger than the equivalent in wi-system-v2 (34 lines). It inlines everything instead of using "load on demand" references. Massive redundancy with ARCHITECTURE.md (tech stack, conventions) and DESIGN_SYSTEM.md (anti-patterns, theme tokens). Documents pre-commit checks that enforce themselves. Still references the T01-T26 task system (completed).

- **ARCHITECTURE.md (412 lines)** has a stale project structure tree. 15+ files listed that don't exist, 10+ files that exist but aren't listed. Tech stack still says "DaisyUI 4" (removed). Lists `README.md` (doesn't exist, prohibited by CLAUDE.md). Missing entire instrument pattern library, audio subsystem files, UI components directory.

- **DESIGN_SYSTEM.md (312 lines)** has wrong hex values in quality checklist (`#0a0a0f` / `#111118` vs actual `#09090b` / `#18181b`). Missing 20+ tokens now in globals.css (status, scope, playhead, instrument, warning, meter, surface). Golden screenshots section is empty. Anti-patterns section is a near-copy of CLAUDE.md must-nots.

- **specs/** contains 10+ completed fix specs that are no longer actionable.

Every agent that reads these files starts with a stale, contradictory, bloated mental model. The redundancy means fixes in one file don't propagate to duplicates.

---

## 2. Acceptance Criteria

1. **CLAUDE.md under 80 lines.** Authority order + rules + musts/must-nots + load-on-demand reference table. No inlined tech stack, no inlined conventions, no inlined enforcement docs, no credentials. An independent observer can count lines and verify.

2. **ARCHITECTURE.md project structure matches reality.** Every file listed exists. Every `.ts`/`.tsx` file in `src/` appears in the tree. No references to DaisyUI. Verify by diffing the tree against `find src/ -name '*.ts' -o -name '*.tsx' | sort`.

3. **DESIGN_SYSTEM.md color tokens match globals.css.** Every CSS custom property in `:root` has a corresponding row in the token table. Hex values match exactly. Verify by extracting hex values from both files and diffing.

4. **Zero redundancy across the three docs.** Each fact lives in exactly one file. CLAUDE.md does not repeat ARCHITECTURE.md conventions. DESIGN_SYSTEM.md does not repeat CLAUDE.md must-nots. Verify by grepping for key phrases across files.

5. **Stale specs archived.** `specs/` contains only actionable specs. Completed specs move to `specs/historical/`.

---

## 3. Constraint Architecture

### Musts
- Must preserve every existing must/must-not rule (content, not location)
- Must preserve the "load on demand" pattern from wi-system-v2 (detail lives in reference docs, CLAUDE.md is a routing table)
- Must keep CLAUDE.md, ARCHITECTURE.md, DESIGN_SYSTEM.md as the three default-loaded files (don't create new ones)
- Must declare authority order at top of CLAUDE.md (like wi-system-v2)
- Must run `npm run build` and `npx vitest run` after changes to verify nothing references stale paths

### Must-nots
- Must not delete any rule — only relocate to the single authoritative file
- Must not change globals.css (source of truth for tokens)
- Must not change any source code files
- Must not add new dependencies

### Preferences
- Prefer ARCHITECTURE.md for "what exists" (structure, tech stack, data model, API contracts)
- Prefer CLAUDE.md for "what to do" (rules, constraints, workflow, escalation)
- Prefer DESIGN_SYSTEM.md for "how it looks" (tokens, components, patterns, quality gates)
- Prefer reference tables over prose paragraphs
- Prefer linking to a section in another file over duplicating content

### Escalation Triggers
- If a must/must-not rule has no clear single home, ask before placing it
- If ARCHITECTURE.md project structure divergence is too large to manually reconcile, generate it from filesystem

---

## 4. Decomposition

### T1: Slim CLAUDE.md (the big win)

**Input:** Current 232-line CLAUDE.md + wi-system-v2 CLAUDE.md as template
**Output:** ~80-line CLAUDE.md with authority order, lean rules, load-on-demand table

Actions:
- Add authority order: `CLAUDE.md > ARCHITECTURE.md > DESIGN_SYSTEM.md > specs/`
- Keep: Repo locations, quick reference commands, musts, must-nots, escalation triggers
- Remove from CLAUDE.md (already in ARCHITECTURE.md): Tech stack table, code conventions section, key conventions
- Remove from CLAUDE.md (already in DESIGN_SYSTEM.md): Theme token references, anti-patterns
- Remove from CLAUDE.md (self-enforcing): Pre-commit checks section (the hooks enforce themselves — documenting them in CLAUDE.md is redundant)
- Move to ARCHITECTURE.md: Testing section, preferences that are really conventions
- Move to load-on-demand table: Git workflow, credentials, dev access, agent required reading list
- Collapse "Musts" and "Must-nots" into a single compact constraints section
- Remove T01-T26 task references
- Remove global protocol section (already in global CLAUDE.md)

**Verify:** `wc -l CLAUDE.md` < 80

### T2: Fix ARCHITECTURE.md project structure

**Input:** Current ARCHITECTURE.md + actual filesystem
**Output:** ARCHITECTURE.md with accurate project tree, no DaisyUI references

Actions:
- Generate actual file tree from `find src/ -name '*.ts' -o -name '*.tsx' | sort` and replace the project structure section
- Remove DaisyUI from tech stack, replace with "Tailwind CSS 4 (custom `forge` dark theme via CSS custom properties)"
- Remove `README.md` from project structure
- Add missing files: instrument pattern files, audio subsystem files, UI components, library components
- Remove files that don't exist: SongContext, SectionHeaders, BarRuler, StemLane, EmptyState, ChannelStrip, MasterStrip
- Update renamed files: Block.tsx -> sequencer-block.tsx, StyleControls -> StyleControlsSection, etc.
- Absorb any conventions removed from CLAUDE.md T1 that belong here

**Verify:** Script that diffs tree listing against filesystem. Zero mismatches.

### T3: Fix DESIGN_SYSTEM.md token table + deduplicate

**Input:** Current DESIGN_SYSTEM.md + globals.css as source of truth
**Output:** DESIGN_SYSTEM.md with complete, accurate token table. No duplicated must-nots.

Actions:
- Rebuild color token table from globals.css `:root` block — all 35+ tokens, not just the original 18
- Fix quality checklist hex values: `#0a0a0f` -> `#09090b`, `#111118` -> `#18181b`
- Remove anti-patterns section (these are CLAUDE.md must-nots, not design system content)
- Add note: "For constraints and prohibited patterns, see CLAUDE.md"
- Update golden screenshots section (either populate or remove the pending placeholders)

**Verify:** Script that extracts CSS vars from globals.css and token names from DESIGN_SYSTEM.md, diffs them.

### T4: Archive stale specs

**Input:** `specs/` directory with 10+ completed specs
**Output:** Only actionable specs in `specs/`, rest in `specs/historical/`

Actions:
- Move all `fix-*.md` specs to `specs/historical/` (all completed)
- Move `instrument-style-controls.md` to `specs/historical/` (completed)
- Move `shadcn-audit.md` to `specs/historical/` (completed)
- Keep `specs/research/` as-is

**Verify:** Each remaining spec in `specs/` has an open action item.

---

## 5. Evaluation Design

| Test | Input | Expected Output |
|------|-------|-----------------|
| CLAUDE.md size | `wc -l CLAUDE.md` | < 80 lines |
| No DaisyUI refs | `grep -ri daisyui CLAUDE.md ARCHITECTURE.md` | Zero matches |
| Project tree accuracy | `diff <(grep '\.tsx\|\.ts' ARCHITECTURE.md \| sort) <(find src/ -name '*.ts' -o -name '*.tsx' \| sort)` | Zero diff |
| Token completeness | Count CSS vars in globals.css `:root` vs rows in DESIGN_SYSTEM.md token table | Equal count, matching hex values |
| No cross-file duplication | `grep -c "DaisyUI\|hardcoded hex\|CSS-in-JS\|confirm()" DESIGN_SYSTEM.md` | Zero (anti-patterns only in CLAUDE.md) |
| Build still passes | `npm run build` | Exit 0 |
| Tests still pass | `npx vitest run` | Exit 0 |
| Stale specs archived | `ls specs/*.md` | Only actionable specs |
| Authority order declared | `head -3 CLAUDE.md` | Contains authority order line |
| Load-on-demand table | `grep "load on demand" CLAUDE.md` | Present |
