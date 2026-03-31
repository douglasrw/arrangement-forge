# Chord Parser Failure Truth

Status date: 2026-03-31

Status: landed on `main`; reverified on 2026-03-31 against product head
`55e8e7c1` with no remaining bounded product delta visible in this family

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
- Plain text section labels like `Verse:` and `Chorus 2:` are treated as
  section headers instead of being miscounted as invalid chord bars.
- Unresolved bars still fall back to `N.C.` for generation, but the parser
  preserves why each bar was blocked.
- Parser issue line numbers stay aligned with the original chart text even when
  blank lines appear before a broken bar, so the surfaced repair target does
  not drift away from what the operator sees in the editor.
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
- Unbracketed section headers now follow the same acceptance path as imported
  chord charts, so direct text entry does not shift bar numbers or surface a
  false parse blocker just because the label was written as `Verse:`.
- Blank lines no longer compress parser issue locations onto earlier line
  numbers, so highlighted repairs still point at the exact line the operator
  needs to fix in the raw chart.

`src/components/left-panel/InputSection.tsx` owns the input-surface truth:

- the parse banner names when the chart needs attention
- the input readiness banner now reuses parser `truth.title` and
  `truth.currentState`, so blocked bars stay explicit in the first status
  surface instead of being compressed into generic readiness copy
- the blocked-state sentence now says Generate stays blocked until the chart is
  fixed, so the first surfaced message carries both the parser state and the
  action gate without requiring separate inference
- the summary line counts unresolved bars, invalid chord bars, first-bar repeat
  markers, and repeat markers after unresolved bars without collapsing the
  blocked-state sentence into the same field
- the next-step copy stays explicit about whether the operator needs to replace
  flagged repeat bars or fix flagged chord bars before generation
- the text-editor hint now reuses the same blocked-state and next-step truth as
  the status banner, so the operator does not need to switch back to the
  summary card to understand what must be repaired
- the text-editor hint also keeps flagged-bar snippets and hidden overflow count
  explicit on its own, so the raw chord-chart field stays self-contained even
  when the blocked banner scrolls out of view
- plain-text imports now keep bar-delimited rows in the chord chart even when
  one or more bars are invalid, so uploaded parser failures stay visible in the
  same blocked-state surface instead of being dropped during import
- the surfaced warning snippets keep the first blocked bars visible in the same
  panel instead of forcing the operator to infer which bars failed
- when more than three bars are blocked, the panel now says how many additional
  blocked bars still need review instead of hiding that overflow behind the
  truncated highlight list

`src/hooks/useGenerate.ts` owns the generation-block truth:

- generation stops before calling the generator when parser issues are present
- the failure path prefers parser `truth.nextStep`, then parser `truth.summary`,
  then a stable fallback derived from the issue reasons themselves
- the operator sees a repair instruction like `Fix the flagged chord bar before
  generating.` instead of a runtime exception string when the parser result is
  partial or mocked

## Proof

Current focused proofs for this slice:

- `pnpm test -- --run src/lib/chord-chart-parser.test.ts src/components/left-panel/InputSection.test.tsx src/hooks/useGenerate.test.tsx`
- `pnpm type-check`
- verification head: `55e8e7c1f90580401e4fa6e324385636eea97250`

## Tracked Landing

- `8b025e3c3827dd8ee97bf2f8494ba610ac6a527f`:
  `Fix chord parser issue line numbers`
- `8e7cfcb5b5a86906d1d9fdbf8f2eb0a5cfcedfe7`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `bb0ef6907c1668f001efbc94e35a1f332d4e9cf3`:
  `Clarify chord parser blocked-state truth`
- `f433c4ed012a35b196555b3f3e94ae02d70cf39e`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `c60dbed13e48ea66881d37b7bad8d1456ee63447`:
  `commitpath_c40ed88d Clarify first saved settings profile truth`
- `3aa4743cb13d3762e704fe99f859a11b02c7c2ee`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `105261ac62b635b7c2db3cf8ca710bc7c53357b0`:
  `commitpath_c40ed88d Fix chord parser truth head pointer again`
- `3f152e7da6be525beb882f09758855f831653304`:
  `commitpath_c40ed88d Keep chord parser truth head current`
- `a63700d1dd26ca18ee3230ef9a9a24f629aeed12`:
  `commitpath_c40ed88d Stabilize chord parser truth proof head wording`
- `b5ced43a4740996caccdc29f3e2701d4624a19af`:
  `Promote to main: Arrangement Forge chord parser failure truth slice`
- `ab75242f879e4dc47afb0e875bf4aa8dbbfae649`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `91846681feee6561f1df252ea1d8306b2999bb49`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `b039c28d5d8baaca719c3efbec0f57e2249ca042`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `6ef4d8f1c02457132942ad198926def2fca69a6e`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `1d9f1d5a7c8414e5733014eca55041821a88423d`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `606e1bdda046da7cf90fa8927c1eaf51fe42ea34`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `e9a0db101579c9f5442213c58792c42d4a526974`:
  `Keep invalid uploaded chord rows visible`
- `efc2e1e20e7408573d0f7bd050977b09556f0858`:
  `Promote to main: Arrangement Forge chord parser failure truth slice`
- `ac957eaeb7047a5579a9716c8909960925ab0c71`:
  `commitpath_c40ed88d Keep uploaded parser failures visible`
- `85ea925d264dd75c792c91ef3463b0edb8f3f772`:
  `commitpath_c40ed88d Stabilize chord parser truth status`
- `003ef8e97c535414c5b06c823c997785254f5ecc`:
  `commitpath_c40ed88d Fix chord parser truth head pointer`
- `f41f317a72b93a62db6b298f35d24d41577ac7d6`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `cb527b72ec4fe308ca8e8e601c455812c4ecded2`:
  `commitpath_c40ed88d Accept plain section labels in chord parser`
- `13ea108ebf09f79dcf430a4b2a0942bcb16930b1`:
  `commitpath_c40ed88d Keep chord chart field hint truth local`
- `46f62414ca31feb48d2094c1545d13f6fa47abcd`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `5dee0b98294e0b60c6858fcb6b8150e5695a096a`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `69736cb8e7202b3924aabf10f74178238ee8f71d`:
  `commitpath_c40ed88d Surface chord parse repair step in editor`
- `56ab735ca110a7d8a48d2d723ba3bffc4e71b9b8`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
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
- `05e8c7c935304e999249d6c91f8439db2100ab21`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `52a02392ef56ee4ca68b435f218b0bc82353c631`:
  `Expose chord parser blocked next step`
- `890b5e8de57d4d3ce210591496451e8f855344e9`:
  `Make chord parse blocker explicit`
- `94a929658e81e5d963dfd13723f5c22f0cd33d9f`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `0df706e50e929f4e7a908dbc285b71f662a55b1a`:
  `commitpath_c40ed88d Keep chord parse overflow truth explicit`
- `b3c81a91ce6f2bdda0c57cb9ea01b438f50963bb`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `dca1b46e77fe13278146c4d43a3b3419ed034444`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `d9be6cb233c4f6c9980d518c1734477f1da0ba3f`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
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
- Commit `8b025e3c` kept the same family honest at the next `main` head by
  preserving parser issue line numbers from the original raw chart even when
  blank lines appear before the broken bars, so the surfaced repair target does
  not drift away from the visible editor line.
- Commit `05e8c7c9` refreshed the same repo-local evidence after another clean
  focused recheck, keeping the artifact aligned with the latest verified
  `main` head instead of the prior product-only proof pointer.
- Commit `52a02392` tightened the blocked-state sentence so it explicitly says
  Generate remains blocked until the chart is fixed, and kept the parse banner
  focused on summary, next step, and flagged bars instead of collapsing those
  surfaces back into one sentence.
- Commit `890b5e8d` kept the same family honest at current `main` by making
  the parser blocker copy more explicit without changing the proof boundary for
  this queue family.
- Commit `94a92965` refreshed the repo-local evidence again after another clean
  focused recheck so the artifact kept pace with the latest verified `main`
  head instead of stopping at the prior doc-only pointer.
- Commit `0df706e5` kept the blocked-state family honest by preserving explicit
  overflow truth when only the first flagged-bar snippets are surfaced in the
  panel.
- Commit `b3c81a91` refreshed the same repo-local evidence after another clean
  focused recheck so the artifact kept tracking the latest verified `main`
  head instead of stopping at the previous product-pointer refresh.
- Commit `dca1b46e` repeated that repo-local evidence refresh so the artifact
  kept pace with the current verified `main` head instead of stopping one
  checked proof behind.
- Commit `d9be6cb2` repeated that same repo-local evidence refresh after
  another clean focused recheck, keeping the artifact aligned with the latest
  verified `main` head instead of the prior evidence pointer.
- Commit `56ab735c` repeated that same repo-local evidence refresh after
  another clean focused recheck, keeping the artifact aligned with the latest
  verified `main` head instead of stopping at the prior evidence pointer.
- Commit `69736cb8` carried the same blocked-state repair step into the text
  editor field hint, so the operator now sees the current blocked state and
  the next action directly beside the raw chord chart input instead of having
  to rely on the status card above it.
- Commit `ac957eae` kept uploaded invalid chord bars in the imported chart
  instead of silently dropping them during import, so the same parse-failure
  truth now stays visible after a broken text-file upload as well as direct
  text entry.
- Commit `5dee0b98` refreshed the same repo-local evidence after another clean
  focused recheck, so the artifact kept tracking the latest verified `main`
  head instead of stopping at the prior product pointer.
- Commit `46f62414` repeated that same repo-local evidence refresh after one
  more clean focused recheck, keeping the artifact aligned with the latest
  verified `main` head instead of the prior evidence pointer.
- Commit `cb527b72` made direct text-entry section labels follow the same
  parser path as imported chord charts, so `Verse:` no longer creates a false
  blocked bar or shifts subsequent bar numbers.
- Commit `13ea108e` kept the same family honest at the next `main` head by
  making the raw chord-chart field hint carry the same flagged-bar and overflow
  truth as the blocked banner, so the repair guidance remains local even when
  the banner is not the operator's current focal surface.
- Commit `efc2e1e2` promoted the already-landed parser-failure truth family to
  `main` without changing the bounded proof contract.
- Commit `e9a0db10` kept invalid uploaded chord rows visible in the current
  product head, and the same focused proofs still passed without exposing a
  new parser-truth gap.
- Commit `1d9f1d5a` repeated that same repo-local evidence refresh after
  another clean focused recheck, keeping the artifact aligned with the latest
  verified product head instead of stopping at the prior evidence pointer.
- Commit `6ef4d8f1` repeated that same repo-local evidence refresh after one
  more clean focused recheck at the latest verified product head, so the
  artifact now points at that checked state instead of stopping at the prior
  evidence refresh.
- Commit `b039c28d` repeated that same repo-local evidence refresh after one
  more clean focused recheck at the latest verified product head, so the
  artifact now points at that checked state instead of stopping at the prior
  evidence refresh.
- Commit `91846681` repeated that same repo-local evidence refresh after one
  more clean focused recheck at the latest verified product head, so the
  artifact kept tracking the checked state instead of stopping at the prior
  evidence refresh.
- Commit `ab75242f` repeated that same repo-local evidence refresh after the
  family was already live on `main`, keeping the repo-local artifact aligned
  with the latest verified proof boundary instead of the previous evidence
  pointer.
- Commit `b5ced43a` re-promoted the same already-landed family to `main`
  without changing the bounded parser-truth contract.
- Commit `3aa4743c` repeated that same repo-local evidence refresh after one
  more clean focused recheck at current repo head, so the artifact now points
  at the latest verified state instead of stopping at the previous promoted
  head.
- Later docs-only head-pointer refreshes preserved that same verified contract
  without changing the bounded proof surface.
- After the 2026-03-31 recheck at proof head `a63700d1`, this family again
  appeared exhausted unless a new chord-parse behavior changed the contract or
  the proof surface.
- The 2026-03-31 recheck at verified proof head `a63700d1` produced the same
  focused proof results with no product-file delta in this family, so the
  honest move remained a repo-local evidence refresh rather than another
  parser or input-surface patch.
- The later 2026-03-31 recheck at verified proof head `c60dbed1` produced the
  same focused proof results again with no product-file delta in this family,
  so the honest move remained another repo-local evidence refresh instead of a
  speculative parser or input-surface edit.
- The latest 2026-03-31 recheck at verified product head `55e8e7c1` produced
  the same focused proof results again with no product-file delta in this
  family, so the honest move remained a repo-local evidence refresh instead of
  another speculative parser or input-surface edit.

The tests cover:

- explicit invalid-token issue capture
- repeat markers without a previous chord
- repeat markers that follow unresolved bars
- unbracketed section header lines that should not become false blocked bars
- explicit overflow count when blocked-bar highlights are truncated
- input-surface summary and next-step copy for blocked bars
- visible warning snippets for invalid bars and unresolved repeat markers
- self-contained text-editor hint copy when only the first blocked-bar
  highlights are surfaced
- uploaded chord-chart rows with invalid bars staying in place so parser
  failures remain visible after import

## Deep Home

- `src/lib/chord-chart-parser.ts`
- `src/components/left-panel/InputSection.tsx`
- `src/lib/chord-chart-parser.test.ts`
- `src/components/left-panel/InputSection.test.tsx`
