# Per-Instrument Style Controls

**Status:** Draft
**Date:** 2026-03-05
**Type:** Feature Spec

---

## Problem Statement

**What:** Per-instrument style controls (pattern type dropdown + instrument-specific parameters) that appear in the left sidebar when a stem lane or block is selected.

**Why:** Musicians need to customize each instrument's pattern independently. Currently, the MIDI generator assigns a single style per instrument based solely on the project-level genre (via `GENRE_STYLES` in `midi-generator.ts`). There is no UI to view or change an instrument's style after generation. The `Block.style` field already stores the pattern ID, but it is invisible to the user and cannot be edited.

**Who:** Solo practice musicians who want to say "make the bass walk here instead of slap" or "switch drums to brushes for this section."

---

## Research Findings

### What already exists

1. **Block.style field** (`src/types/project.ts:74`) — Every block already stores a `style: string` that holds the pattern ID (e.g., `'walking'`, `'jazz_comp'`, `'rock_straight'`). This field is set at generation time by `getStyle()` in `midi-generator.ts` and never changed after.

2. **Pattern libraries per instrument** — Each instrument has a dedicated pattern file with a registry of available styles:

   | Instrument | File | Available Patterns | Fallback |
   |---|---|---|---|
   | Drums | `drum-patterns.ts` | `rock_straight`, `jazz_swing`, `funk_pocket`, `blues_shuffle`, `country_shuffle`, `gospel_drive`, `rnb_groove`, `bossa_nova`, `pop_four_on_floor`, `latin_jazz`, `fusion_straight`, `salsa_cascara`, `samba` (13 total) | `rock_straight` |
   | Bass | `bass-patterns.ts` | `walking`, `slap`, `pick`, `fingerstyle` (4 total) | `fingerstyle` |
   | Piano | `piano-patterns.ts` | `jazz_comp`, `block_chords`, `arpeggiated` (3 total) | `block_chords` |
   | Guitar | `guitar-patterns.ts` | `power_chords`, `fingerpick_arpeggios`, `rhythm_strum`, `muted_funk` (4 total) | `rhythm_strum` |
   | Strings | `strings-patterns.ts` | `sustained_pad`, `tremolo` (2 total, selected by energy threshold, not by style string) | energy-based |

3. **GENRE_STYLES map** (`midi-generator.ts:95-159`) — Maps genre to default style per instrument. Used only at generation time.

4. **GENRE_DRUM_PATTERNS** (`genre-config.ts:42-86`) — Maps genre+substyle to drum pattern ID. More granular than GENRE_STYLES for drums.

5. **Style cascade** (`style-cascade.ts`) — Resolves `energy`, `groove`, `feel`, `swingPct`, `dynamics` through project -> section -> block hierarchy. Does NOT resolve instrument styles — those are flat on `Block.style`.

6. **BlockContext component** (`left-panel/BlockContext.tsx`) — Shows when a block is selected. Currently displays: instrument name, bar range, volume slider, pan slider, chord override toggle, duplicate/delete actions. **No style selector exists.**

7. **SectionContext component** (`left-panel/SectionContext.tsx`) — Shows when a section is selected. Has style override toggle with genre/substyle dropdowns and energy/groove/feel/swing/dynamics sliders. **No per-instrument style controls.**

8. **Selection store** (`selection-store.ts`) — Tracks `level` (song/section/block), `sectionId`, `blockId`, `stemId`. When a block is selected, both `blockId` and `stemId` are set, so we always know which instrument context to show.

9. **LeftPanel** (`left-panel/LeftPanel.tsx`) — Routes between `default`, `section`, and `block` context modes. The `PanelContext` type already carries `instrument` and `styleName` for block mode.

### What does NOT exist yet

- No UI to change `Block.style` after generation
- No per-stem style at the section level (only per-block)
- No human-readable labels for pattern IDs (e.g., `jazz_comp` displays as `jazz_comp`, not "Jazz Comping")
- No concept of "instrument style override" at section level — the cascade only covers numeric sliders
- Strings has no style string mechanism — it uses energy threshold internally

### What the architecture already documents but is unimplemented

ARCHITECTURE.md (line 121-132) lists style values per instrument:
- Drums: `jazz_brush_swing`, `funk_pocket`, `half_time_feel`, `rock_straight`, etc.
- Bass: `walking`, `pedal_tone`, `slap`, `fingerstyle`, `pick`, etc.
- Piano: `jazz_comp`, `block_chords`, `stride`, `arpeggiated`, `pad`, etc.
- Guitar: `fingerpick_arpeggios`, `rhythm_strum`, `muted_funk`, `power_chords`, etc.
- Strings: `sustained_pad`, `tremolo`, `pizzicato`, `arco_melody`, etc.

Some of these (e.g., `pedal_tone`, `stride`, `pad`, `pizzicato`, `arco_melody`, `half_time_feel`) are documented but not yet implemented as patterns.

---

## Acceptance Criteria

### AC-1: Style dropdown in BlockContext
When a block is selected, the BlockContext panel shows a "Pattern" dropdown between the instrument header and the volume slider. The dropdown lists all available patterns for that block's instrument, with the current `Block.style` value selected.

### AC-2: Changing a block's style updates the store
Selecting a different pattern from the dropdown calls `updateBlock(blockId, { style: newStyle })`, which:
- Pushes an undo entry (already handled by `updateBlock`)
- Calls `markDirty()` (already handled by `updateBlock`)
- Updates the block's style in the project store

### AC-3: Style change is cosmetic only for MVP
Changing the style does NOT re-trigger MIDI generation. The `midi_data` on the block remains unchanged. The dropdown is purely a metadata annotation for now. A future "re-generate block" action will use the updated style to produce new MIDI.

### AC-4: Human-readable pattern labels
Pattern IDs are displayed with human-readable labels (e.g., `walking` -> "Walking Bass", `jazz_comp` -> "Jazz Comping"). A label map is defined in a new config constant `INSTRUMENT_STYLE_LABELS`.

### AC-5: Instrument-appropriate options
Each instrument's dropdown only shows patterns that exist in its pattern registry. The available patterns per instrument:

| Instrument | Options (id -> label) |
|---|---|
| Drums | `rock_straight` -> "Rock Straight", `jazz_swing` -> "Jazz Swing", `funk_pocket` -> "Funk Pocket", `blues_shuffle` -> "Blues Shuffle", `country_shuffle` -> "Country Shuffle", `gospel_drive` -> "Gospel Drive", `rnb_groove` -> "R&B Groove", `bossa_nova` -> "Bossa Nova", `pop_four_on_floor` -> "Four on Floor", `latin_jazz` -> "Latin Jazz", `fusion_straight` -> "Fusion Straight", `salsa_cascara` -> "Salsa Cascara", `samba` -> "Samba" |
| Bass | `walking` -> "Walking", `slap` -> "Slap", `pick` -> "Pick", `fingerstyle` -> "Fingerstyle" |
| Piano | `jazz_comp` -> "Jazz Comping", `block_chords` -> "Block Chords", `arpeggiated` -> "Arpeggiated" |
| Guitar | `power_chords` -> "Power Chords", `fingerpick_arpeggios` -> "Fingerpick Arpeggios", `rhythm_strum` -> "Rhythm Strum", `muted_funk` -> "Muted Funk" |
| Strings | `sustained_pad` -> "Sustained Pad", `tremolo` -> "Tremolo" |

### AC-6: Section-level instrument style override (deferred)
Per-instrument style override at the section level is OUT OF SCOPE for this task. The section would need a stem-keyed style map (5 nullable fields or a JSONB column), which is a larger data model change. Document this as a follow-up.

### AC-7: Style indicator on blocks in arrangement view (stretch)
Optionally, the block rectangles in the arrangement grid could show a small style label or icon. This is a stretch goal — not required for the initial implementation.

---

## Data Model Changes

### No database schema changes required

The `blocks.style` column already exists as `text` and stores the pattern ID. The UI just needs to read and write it.

### No TypeScript type changes required

`Block.style` is already typed as `string` in `src/types/project.ts:74`.

### New config constant needed

A new constant `INSTRUMENT_STYLE_OPTIONS` in `src/lib/genre-config.ts` that maps each `InstrumentType` to an array of `{ id: string; label: string }` objects.

```typescript
export interface StyleOption {
  id: string;
  label: string;
}

export const INSTRUMENT_STYLE_OPTIONS: Record<InstrumentType, StyleOption[]> = {
  drums: [
    { id: 'rock_straight', label: 'Rock Straight' },
    { id: 'jazz_swing', label: 'Jazz Swing' },
    { id: 'funk_pocket', label: 'Funk Pocket' },
    { id: 'blues_shuffle', label: 'Blues Shuffle' },
    { id: 'country_shuffle', label: 'Country Shuffle' },
    { id: 'gospel_drive', label: 'Gospel Drive' },
    { id: 'rnb_groove', label: 'R&B Groove' },
    { id: 'bossa_nova', label: 'Bossa Nova' },
    { id: 'pop_four_on_floor', label: 'Four on Floor' },
    { id: 'latin_jazz', label: 'Latin Jazz' },
    { id: 'fusion_straight', label: 'Fusion Straight' },
    { id: 'salsa_cascara', label: 'Salsa Cascara' },
    { id: 'samba', label: 'Samba' },
  ],
  bass: [
    { id: 'walking', label: 'Walking' },
    { id: 'slap', label: 'Slap' },
    { id: 'pick', label: 'Pick' },
    { id: 'fingerstyle', label: 'Fingerstyle' },
  ],
  piano: [
    { id: 'jazz_comp', label: 'Jazz Comping' },
    { id: 'block_chords', label: 'Block Chords' },
    { id: 'arpeggiated', label: 'Arpeggiated' },
  ],
  guitar: [
    { id: 'power_chords', label: 'Power Chords' },
    { id: 'fingerpick_arpeggios', label: 'Fingerpick Arpeggios' },
    { id: 'rhythm_strum', label: 'Rhythm Strum' },
    { id: 'muted_funk', label: 'Muted Funk' },
  ],
  strings: [
    { id: 'sustained_pad', label: 'Sustained Pad' },
    { id: 'tremolo', label: 'Tremolo' },
  ],
};
```

### Store action already exists

`useProjectStore.updateBlock(blockId, { style: newStyle })` already works. It pushes undo and marks dirty. No new store actions needed.

---

## UI Components

### Modified: `src/components/left-panel/BlockContext.tsx`

Add a "Pattern" section between the instrument header and the Volume slider:

```
[Back to panels]
─────────────────
  ● Piano
  Bars 5 - 12

  PATTERN            <-- NEW
  [Jazz Comping  ▾]  <-- NEW dropdown

  VOLUME
  ────────────○── 0 dB

  PAN
  ────○──────── C

  CHORDS
  ...
```

Implementation:
1. Import `INSTRUMENT_STYLE_OPTIONS` from `@/lib/genre-config`
2. Import `InstrumentType` from `@/types`
3. Look up `liveBlock?.style` to get the current style
4. Look up `INSTRUMENT_STYLE_OPTIONS[instrument]` to get available options
5. Render a `<Select>` (from `@/components/ui/select`) with the options
6. On change, call `updateBlock(blockId, { style: newValue })`

The `instrument` prop is already available as `BlockContextProps.instrument`. It needs to be mapped from `Instrument` (the component-local type) to `InstrumentType` (the canonical type) -- but they are identical string unions, so no conversion needed.

### New: None

No new component files are needed. The dropdown uses the existing `Select` component from `@/components/ui/select`.

### Not modified

- `LeftPanel.tsx` — No changes needed. It already passes `instrument` and `styleName` to `BlockContext`.
- `SectionContext.tsx` — No changes for this task (section-level instrument styles are deferred).
- `StyleControlsSection.tsx` — No changes. This handles project-level genre/substyle/sliders, which is orthogonal.
- `ArrangementView.tsx` — No changes unless implementing the stretch goal (style label on block rectangles).

---

## Constraints

- Must use forge theme tokens (`bg-secondary`, `border-border`, `text-foreground`, etc.) -- never hardcode hex
- Must use `INSTRUMENT_STYLE_OPTIONS` from `genre-config.ts` (new constant) for all pattern listings
- Must use `updateBlock()` from project-store for style changes (gets undo + markDirty for free)
- Style changes are cosmetic only for MVP -- no MIDI re-generation
- Must work with the existing 5 hardcoded stems
- Must use the existing `Select` component from `@/components/ui/select`
- Every `<select>`/`<input>` must have a unique `id` and corresponding `<label htmlFor={id}>`
- No new dependencies

---

## Files to Create/Modify

| File | Action | Changes |
|---|---|---|
| `src/lib/genre-config.ts` | Modify | Add `StyleOption` interface, `INSTRUMENT_STYLE_OPTIONS` constant |
| `src/components/left-panel/BlockContext.tsx` | Modify | Add pattern dropdown `<Select>` between header and volume slider |
| `src/lib/genre-config.test.ts` | Modify (or create) | Add tests verifying `INSTRUMENT_STYLE_OPTIONS` keys match `InstrumentType` and all IDs are non-empty strings |

---

## Visual Verification

After implementation, verify with Playwright:

1. **Block selection shows pattern dropdown:** Click a block in the arrangement view, confirm the BlockContext panel appears with a "Pattern" dropdown showing the correct current style.
2. **Dropdown options are instrument-specific:** Open the dropdown for a drums block -- should see 13 drum patterns. Open for a bass block -- should see 4 bass patterns.
3. **Style change persists:** Select a different style, click away, click back on the same block -- the new style should still be selected.
4. **Undo works:** Change a style, press Ctrl+Z -- the original style should be restored.

---

## Future Work (out of scope)

1. **Section-level instrument style overrides** — Add a per-stem style map to sections so you can say "all bass blocks in the Chorus should be slap." This requires either 5 nullable columns (`drums_style_override`, `bass_style_override`, etc.) or a JSONB column on sections.
2. **Re-generate on style change** — When the user changes a block's style, re-run the MIDI generator for that block using the new style. Requires exposing per-block generation (currently generation is whole-arrangement only).
3. **Style suggestions based on genre** — Highlight or sort patterns that are typical for the current genre (using `GENRE_STYLES` map) vs. patterns from other genres.
4. **Additional patterns** — Add the patterns documented in ARCHITECTURE.md but not yet implemented: `pedal_tone`, `stride`, `pad`, `pizzicato`, `arco_melody`, `half_time_feel`.
5. **Strings style field** — Strings currently ignores `Block.style` and uses an energy threshold. Wire it to respect the style field like other instruments.
