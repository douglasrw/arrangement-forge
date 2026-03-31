# Chord Parser Failure Truth

Status date: 2026-03-31

Status: landed on `main`; reverified on 2026-03-31 at head `8d593e03` after
the chord parser failure truth slice landed, and no remaining product delta is
visible in this family beyond this evidence refresh

Purpose: preserve the current chord parser failure contract and its landing
proof in one repo-local place so future work does not have to reconstruct it
from `src/lib/chord-chart-parser.ts`, `src/components/left-panel/InputSection.tsx`,
and scattered tests.

## Parser Contract

- Invalid chord tokens become explicit parser issues instead of silent neutral
  fallback.
- Repeat markers at the start of a chart remain visible as blocked bars instead
  of pretending a previous chord exists.
- Repeat markers that follow an unresolved bar produce their own explicit issue
  instead of inheriting a broken bar state.
- Unresolved bars still fall back to `N.C.` for generation, but the parser
  preserves why each bar was blocked.
- The input surface summarizes both the current blocked state and the next
  repair step without requiring archaeology outside the chord chart panel.

## Operator-Facing Truth

`src/lib/chord-chart-parser.ts` owns the direct parser truth:

- `parseChordChart` returns structured `issues` alongside generated chord
  entries and warning copy.
- `repeat_without_previous` keeps first-bar repeat markers explicit.
- `repeat_without_resolved_chord` keeps repeat markers after invalid bars
  explicit instead of copying broken state forward.
- `invalid_token` keeps unrecognized chord bars explicit even though generation
  still receives an `N.C.` placeholder for that bar.

`src/components/left-panel/InputSection.tsx` owns the input-surface truth:

- the parse banner names when the chart needs attention
- the summary counts unresolved bars, invalid chord bars, first-bar repeat
  markers, and repeat markers after unresolved bars
- the next-step copy stays explicit about whether the operator needs to replace
  flagged repeat bars or fix flagged chord bars before generation
- the surfaced warning snippets keep the first blocked bars visible in the same
  panel instead of forcing the operator to infer which bars failed

## Proof

Current focused proofs for this slice:

- `pnpm test -- --run src/lib/chord-chart-parser.test.ts src/components/left-panel/InputSection.test.tsx`
- `pnpm run type-check`
- verification head: `8d593e034064f8c38cca4f7ffdf5f9d0c69d6bc9`

## Tracked Landing

- `9150d7d071c7c28c4f6d8e85817e5154ce5d9720`:
  `commitpath_c40ed88d Surface chord parser failure truth`
- `fa7037078126d1837bf87c5554576cab0bfa5679`:
  `commitpath_c40ed88d Surface chord parser failure truth`
- The current `main` head at `8d593e03` still preserves the chord parser
  failure truth contract, and the focused parser/input proofs passed again on
  2026-03-31 before this doc-only evidence refresh updated the repo-local
  artifact.
- Commit `9150d7d0` introduced explicit issue tracking and input-surface copy
  for invalid bars, first-bar repeat markers, and repeat markers that follow
  unresolved bars.
- Commit `fa703707` tightened the same family so repeated unresolved `%` bars
  stay visible as explicit parser failures instead of silently inheriting an
  already-bad bar state.
- After the 2026-03-31 recheck, this family appears exhausted until a new
  chord-parse behavior changes the contract or the proof surface.

The tests cover:

- explicit invalid-token issue capture
- repeat markers without a previous chord
- repeat markers that follow unresolved bars
- input-surface summary and next-step copy for blocked bars
- visible warning snippets for invalid bars and unresolved repeat markers

## Deep Home

- `src/lib/chord-chart-parser.ts`
- `src/components/left-panel/InputSection.tsx`
- `src/lib/chord-chart-parser.test.ts`
- `src/components/left-panel/InputSection.test.tsx`
