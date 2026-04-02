# Drum Pattern Fallback Truth

Status date: 2026-04-02

Status: landed on `main`; reverified on 2026-04-02 against current product
head `52fb85c7` with the focused drum-pattern proof and type-check both
passing, no remaining bounded product delta visible in this family, and the
current portfolio dispatch still pointing at an already-landed promotion rather
than a fresh deep-home change

Purpose: preserve the current drum-pattern fallback contract in one repo-local
place so future work does not have to reconstruct it from
`src/lib/drum-patterns.ts`, `src/lib/genre-config.ts`, and the focused drum
tests.

## Fallback Contract

- Unknown drum pattern overrides resolve to one explicit fallback pattern
  instead of silently returning a pattern with no trace of what happened.
- `DEFAULT_DRUM_PATTERN_ID` remains `rock_straight`.
- `resolveDrumPattern` returns the requested pattern id, the resolved pattern
  id, whether fallback happened, and the final pattern object.
- `buildDrumMidi` now routes override selection through `resolveDrumPattern`
  instead of hiding fallback inside an internal helper.
- Missing override ids still produce the same playable drum notes as the
  canonical default pattern for the same bar inputs.

## Operator-Facing Truth

`src/lib/drum-patterns.ts` owns the fallback-resolution truth:

- `DEFAULT_DRUM_PATTERN_ID` keeps the canonical fallback target explicit.
- `DrumPatternResolution` gives callers one inspectable shape for requested id,
  resolved id, fallback use, and resolved pattern.
- `resolveDrumPattern` makes the fallback path visible without changing the
  playable default behavior.
- `buildDrumMidi` keeps generation stable by consuming the resolved pattern
  directly after the explicit fallback step.

`src/audio/drum-kit.ts` stays adjacent to, but does not currently own, the
fallback decision:

- it still defines the GM note-to-voice map used after pattern resolution
- the current fallback truth family did not require any drum-kit surface change

`src/lib/drum-patterns.test.ts` keeps the proof boundary explicit:

- unknown pattern overrides report `usedFallback: true`
- the resolved pattern id matches `DEFAULT_DRUM_PATTERN_ID`
- the generated notes for a missing override match the canonical default
  pattern output for the same bar inputs

## Proof

Current focused proofs for this slice:

- `pnpm test -- --run src/lib/drum-patterns.test.ts`
- `pnpm type-check`
- verification head: `52fb85c7090ac36e7989028c0ffd02e609854f05`
- the dispatch context at
  `/data/projects/converge-canonical/docs/_local/runtime/closeout_bridge/closeout-bridge-arrangement-forge-20260402005737.dispatch-context`
  still recommends `Promote to main: Arrangement Forge drum pattern fallback truth slice`
  even though the promoted product commit already exists on `main`; this
  artifact records that verified state instead of claiming a new product
  promotion happened during the refresh

## Tracked Landing

- `52fb85c7090ac36e7989028c0ffd02e609854f05`:
  `Make drum pattern fallback resolution explicit`
- The 2026-04-02 landing made the fallback path inspectable by exporting one
  explicit default pattern id and one explicit resolution helper instead of
  leaving missing override handling buried in a private helper.
- The focused proof passed again on 2026-04-02 against product head
  `52fb85c7`, so this repo-local artifact now captures the verified current
  contract instead of leaving the family to commit archaeology.
- After the 2026-04-02 recheck, this family appears exhausted until drum
  pattern selection, override handling, or drum fallback behavior changes.

The tests cover:

- valid pattern resolution without fallback
- missing override ids that must fall back to `rock_straight`
- note-output equivalence between the missing override path and the canonical
  default pattern path

## Deep Home

- `src/lib/drum-patterns.ts`
- `src/lib/drum-patterns.test.ts`
- `src/audio/drum-kit.ts`
