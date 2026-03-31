# Chord Parser Failure Truth

Status date: 2026-03-31

Status: landed on `main`; reverified on 2026-03-31 at product head `58283c48`
after the latest explicit-truth follow-up landed, and no remaining product
delta is visible in this family beyond this evidence refresh

Purpose: preserve the current chord parser failure contract and its landing
proof in one repo-local place so future work does not have to reconstruct it
from `src/lib/chord-chart-parser.ts`, `src/components/left-panel/InputSection.tsx`,
`src/hooks/useGenerate.ts`, and scattered tests.

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
- Generation now fails with an explicit parse-block repair message instead of
  crashing through a missing-truth assumption when unresolved bars are still
  present.

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
- the input readiness banner now reuses parser `truth.title` and
  `truth.currentState`, so blocked bars stay explicit in the first status
  surface instead of being compressed into generic readiness copy
- the summary line counts unresolved bars, invalid chord bars, first-bar repeat
  markers, and repeat markers after unresolved bars without collapsing the
  blocked-state sentence into the same field
- the next-step copy stays explicit about whether the operator needs to replace
  flagged repeat bars or fix flagged chord bars before generation
- the surfaced warning snippets keep the first blocked bars visible in the same
  panel instead of forcing the operator to infer which bars failed

`src/hooks/useGenerate.ts` owns the generation-block truth:

- generation stops before calling the generator when parser issues are present
- the failure path prefers parser `truth.nextStep`, then parser `truth.summary`,
  then a stable fallback derived from the issue reasons themselves
- the operator sees a repair instruction like `Fix the flagged chord bar before
  generating.` instead of a runtime exception string when the parser result is
  partial or mocked

## Proof

Current focused proofs for this slice:

- `pnpm exec vitest run src/lib/chord-chart-parser.test.ts src/components/left-panel/InputSection.test.tsx`
- `pnpm exec vitest run src/hooks/useGenerate.test.tsx`
- `pnpm run type-check`
- verification head: `58283c488a53e10e64933a3f8475e14885aeca9c`

## Tracked Landing

- `9150d7d071c7c28c4f6d8e85817e5154ce5d9720`:
  `commitpath_c40ed88d Surface chord parser failure truth`
- `fa7037078126d1837bf87c5554576cab0bfa5679`:
  `commitpath_c40ed88d Surface chord parser failure truth`
- `f2349877baf58f5d902cce598755c60387ce0bfe`:
  `Block generation on chord parse issues`
- `5a101df77260409c7729d0b5746f97d5a84cc15e`:
  `commitpath_c40ed88d Harden chord parse block truth in generation`
- `f25a195792e2ff7438c5ae23866e8343843ea392`:
  `commitpath_c40ed88d Refresh chord parser failure truth docs`
- `c18e9f62cbf2b1f43ca88f77cab4956c9539d7fd`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `e19c8fcc886d8b53e6caac4e5f4a56b0e8fc555f`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `b018e30205d4a54522dc09ae12ab7e23cc8b6a25`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `58283c488a53e10e64933a3f8475e14885aeca9c`:
  `commitpath_c40ed88d: make chord parse truth explicit`
- The current product head at `58283c48` still preserves the chord parser
  failure truth contract, and the focused parser/input/generation/type-check
  proofs passed again on 2026-03-31 before this follow-up doc-only evidence
  refresh updated the repo-local artifact.
- Commit `9150d7d0` introduced explicit issue tracking and input-surface copy
  for invalid bars, first-bar repeat markers, and repeat markers that follow
  unresolved bars.
- Commit `fa703707` tightened the same family so repeated unresolved `%` bars
  stay visible as explicit parser failures instead of silently inheriting an
  already-bad bar state.
- Commit `f2349877` made generation stop when parse issues remain instead of
  proceeding with blocked input.
- Commit `5a101df7` hardened that same generation-block path so it still emits
  the intended repair instruction even when the parser result is partial.
- Commit `f25a1957` refreshed the repo-local truth artifact so future review
  does not have to reconstruct the current proof boundary from commit
  archaeology.
- Commit `c18e9f62` refreshed the same repo-local evidence after another clean
  focused recheck at the current product head.
- Commit `e19c8fcc` repeated that doc-only evidence refresh so the repo-local
  artifact kept tracking the verified `main` head instead of a stale proof
  pointer.
- Commit `b018e302` repeated that same doc-only evidence refresh after one more
  clean recheck, so the repo-local artifact now points at the latest verified
  `main` head instead of stopping one evidence refresh behind.
- Commit `58283c48` split parser truth into separate `currentState` and
  `summary` fields, then reused the explicit blocked-state copy in the input
  readiness banner so the first surfaced message keeps the blocked bars visible
  without overloading the summary sentence.
- After the 2026-03-31 recheck, this family appears exhausted until a new
  chord-parse behavior changes the contract or the proof surface.

The tests cover:

- explicit invalid-token issue capture
- repeat markers without a previous chord
- repeat markers that follow unresolved bars
- input-surface summary and next-step copy for blocked bars
- generation-block repair copy when unresolved parser issues remain
- visible warning snippets for invalid bars and unresolved repeat markers

## Deep Home

- `src/lib/chord-chart-parser.ts`
- `src/components/left-panel/InputSection.tsx`
- `src/hooks/useGenerate.ts`
- `src/lib/chord-chart-parser.test.ts`
- `src/components/left-panel/InputSection.test.tsx`
- `src/hooks/useGenerate.test.tsx`
