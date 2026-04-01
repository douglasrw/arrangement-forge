# Chord Parser Failure Truth

Status date: 2026-04-01

Status: landed on local `main`; reverified again on 2026-04-01 with the
focused parser, input-surface, generation-block, and type-check proofs passing
against the then-current verified local `main` head `620ec466`, no remaining
bounded product delta visible in this family beyond keeping this repo-local
truth artifact aligned with the latest verified state, and the current
portfolio dispatch still points at an already-landed promotion instead of a
fresh product delta

Purpose: preserve the current chord parser failure contract and its landing
proof in one repo-local place so future work does not have to reconstruct it
from `src/lib/chord-chart-parser.ts`, `src/components/left-panel/InputSection.tsx`,
`src/components/left-panel/AiAssistantSection.tsx`,
`src/components/left-panel/left-panel-readiness.ts`, `src/hooks/useGenerate.ts`,
and scattered tests.

## Parser Contract

- Invalid chord tokens become explicit parser issues instead of silent neutral
  fallback.
- Repeat markers at the start of a chart remain visible as blocked bars instead
  of pretending a previous chord exists.
- Repeat markers that follow `N.C.` or rest bars remain explicit parser issues
  instead of inheriting no-chord bars as if they were repeatable chord truth.
- Repeat markers that follow an unresolved bar produce their own explicit issue
  instead of inheriting a broken bar state.
- Plain text section labels like `Verse:` and `Chorus 2:` are treated as
  section headers instead of being miscounted as invalid chord bars.
- Header-only charts stay blocked until at least one playable chord bar is
  present, instead of reading as ready just because the text looks structured.
- Charts made only of `N.C.` and other no-chord markers stay blocked until at
  least one playable chord bar is present, instead of reading as ready because
  they tokenized cleanly.
- Unresolved bars still fall back to `N.C.` for generation, but the parser
  preserves why each bar was blocked.
- Parser issue line numbers stay aligned with the original chart text even when
  blank lines appear before a broken bar, so the surfaced repair target does
  not drift away from what the operator sees in the editor.
- The input surface summarizes both the current blocked state and the next
  repair step without requiring archaeology outside the chord chart panel.
- Blocked parse states now report how many bars are already ready alongside the
  flagged blocked bars, so the operator can see both current progress and the
  exact repair target in one sentence instead of inferring the still-usable bar
  count separately.
- Generation now fails with an explicit parse-block repair message instead of
  crashing through a missing-truth assumption when unresolved bars are still
  present.

## Operator-Facing Truth

`src/lib/chord-chart-parser.ts` owns the direct parser truth:

- `parseChordChart` returns structured `issues` alongside generated chord
  entries and warning copy.
- `repeat_without_previous` keeps first-bar repeat markers explicit.
- `repeat_without_playable_chord` keeps repeat markers after `N.C.` and rest
  bars explicit instead of inheriting non-playable bars as repeatable chord
  truth.
- `repeat_without_resolved_chord` keeps repeat markers after invalid bars
  explicit instead of copying broken state forward.
- `invalid_token` keeps unrecognized chord bars explicit even though generation
  still receives an `N.C.` placeholder for that bar.
- Unbracketed section headers now follow the same acceptance path as imported
  chord charts, so direct text entry does not shift bar numbers or surface a
  false parse blocker just because the label was written as `Verse:`.
- Header-only charts now surface explicit blocked truth with a concrete next
  step instead of quietly reading as parse-ready with zero playable bars.
- No-chord-only charts like `N.C. | - | nc` now surface the same blocked truth
  and repair step instead of quietly reading as parse-ready because every token
  mapped to a neutral bar.
- Blank lines no longer compress parser issue locations onto earlier line
  numbers, so highlighted repairs still point at the exact line the operator
  needs to fix in the raw chart.

`src/components/left-panel/InputSection.tsx` owns the input-surface truth:

- the parse banner names when the chart needs attention
- the input readiness banner now reuses parser `truth.title` and
  `truth.currentState`, so blocked bars stay explicit in the first status
  surface instead of being compressed into generic readiness copy
- the same readiness banner now also carries parser `truth.summary`,
  `truth.nextStep`, flagged chart locations, and hidden overflow count, so the
  first blocked status surface stays aligned with the full parser truth instead
  of stopping at only the blocked-state sentence
- the blocked-state sentence now says Generate stays blocked until the chart is
  fixed, so the first surfaced message carries both the parser state and the
  action gate without requiring separate inference
- the summary line counts unresolved bars, invalid chord bars, first-bar repeat
  markers, and repeat markers after unresolved bars without collapsing the
  blocked-state sentence into the same field
- the next-step copy stays explicit about whether the operator needs to replace
  flagged repeat bars or fix flagged chord bars before generation
- first-bar repeat failures now keep the narrower recovery step `Replace bar 1
  with explicit chords before using repeat markers.` instead of implying a
  missing prior bar could be repaired in place
- the text-editor hint now reuses the same blocked-state and next-step truth as
  the status banner, so the operator does not need to switch back to the
  summary card to understand what must be repaired
- the text-editor hint also keeps flagged-bar snippets and hidden overflow count
  explicit on its own, so the raw chord-chart field stays self-contained even
  when the blocked banner scrolls out of view
- plain-text imports now keep bar-delimited rows in the chord chart even when
  one or more bars are invalid, so uploaded parser failures stay visible in the
  same blocked-state surface instead of being dropped during import
- blocked upload feedback now reuses the same parser `truth.title`,
  `truth.currentState`, and `truth.nextStep`, so file-import failures name the
  same blocked family as the main parser surface instead of collapsing back
  into generic success or generic blocked copy
- blocked upload feedback now also reuses parser `truth.summary`, so the upload
  surface keeps why the chart is blocked explicit instead of surfacing only the
  blocked state and repair step
- blocked upload feedback now also surfaces the same line-aware flagged chart
  locations as the text editor hint, so imported parser failures still point at
  the exact row and bar that need repair without requiring a second lookup in
  the raw chord chart field
- blocked upload feedback for no-chord-only imports stays locked to the same
  `Chord chart needs chord bars` contract, blocked-state sentence, and repair
  step as the in-editor parse surface, so uploads like `N.C. | - | nc` do not
  drift back toward generic import success copy
- the surfaced warning snippets keep the first blocked bars visible in the same
  panel instead of forcing the operator to infer which bars failed
- when more than three bars are blocked, the panel now says how many additional
  blocked bars still need review instead of hiding that overflow behind the
  truncated highlight list

`src/components/left-panel/left-panel-readiness.ts` and
`src/components/left-panel/AiAssistantSection.tsx` own the assistant-readiness
truth:

- assistant requests stay blocked when parser issues remain, even if a project
  and chord chart are already present
- the assistant composer state names the same blocked chord-fix requirement
  before the operator can send a prompt, instead of leaving the disabled send
  state to imply why assistant generation is unavailable
- the empty-state and placeholder copy keep the same repair step visible in the
  assistant surface, so the operator does not have to infer that chord parse
  blockers also gate assistant-driven generation

`src/hooks/useGenerate.ts` owns the generation-block truth:

- generation stops before calling the generator when parser issues are present
- the failure path prefers parser `truth.nextStep`, then parser `truth.summary`,
  then a stable fallback derived from the issue reasons themselves
- the surfaced generation failure message now preserves parser
  `truth.currentState`, `truth.summary`, flagged chart locations, and hidden
  overflow count when they exist, so setup-scoped failures mirror the same
  repair targets already shown in the chord-chart panel
- the operator sees a repair instruction like `Fix the flagged chord bar before
  generating.` instead of a runtime exception string when the parser result is
  partial or mocked

## Proof

Current focused proofs for this slice:

- `pnpm exec vitest run src/lib/chord-chart-parser.test.ts`
- `pnpm exec vitest run src/components/left-panel/InputSection.test.tsx`
- `pnpm exec vitest run src/hooks/useGenerate.test.tsx`
- `pnpm exec vitest run src/lib/chord-chart-parser.test.ts src/components/left-panel/InputSection.test.tsx src/hooks/useGenerate.test.tsx`
- `pnpm exec tsc --noEmit`
- the current proof set still matches the same bounded parser, input-surface,
  and generation-block contract after the 2026-04-01 recheck against the
  then-current verified local `main` head `620ec466`
- the dispatch context at
  `/data/projects/converge-canonical/docs/_local/runtime/closeout_bridge/closeout-bridge-arrangement-forge-20260331234753.dispatch-context`
  still recommends `Promote to main: Arrangement Forge chord parser failure truth slice`
  even though the promoted product commit already exists in local history as
  `e922baaa`; this refresh records that stale-dispatch finding instead of
  claiming a new product landing
- this artifact proves the verified local `main` worktree state at that head;
  it does not claim any fresh product promotion happened during this refresh

## Current Verification Snapshot

- Verified local `main` head on 2026-04-01: `620ec466`
- Current bounded proof commands:
  - `pnpm test -- --run src/lib/chord-chart-parser.test.ts src/components/left-panel/InputSection.test.tsx`
  - `pnpm run type-check`
- Current result:
  - focused parser and input-surface proofs passed
  - type-check passed
  - no fresh product delta in the parser/input family was visible after the
    current verification pass, so this refresh stays an artifact-truth update
    rather than claiming another product promotion

## Tracked Landing

- `4f0b5715346d281f991a8c97fce43703e06c40ac`:
  `commitpath_c40ed88d Refresh chord parser truth evidence`
- `60b64de3442401631f520ffd1937948c199112e3`:
  `commitpath_c40ed88d Refresh chord parser truth evidence`
- `c1588453d13ec20d4bc98bc95926f760f32f1a2f`:
  `commitpath_c40ed88d Refresh chord parser truth evidence`
- `e922baaac5415d1b99895a0ae3389f510c244383`:
  `Promote to main: Arrangement Forge chord parser failure truth slice`
- `7f4b396d94f408e78458cd4524f84ab332d7479e`:
  `commitpath_c40ed88d Refresh chord parser truth evidence`
- `5abd387ca50a8427478963d2ea5fa60bf7305f57`:
  `commitpath_c40ed88d Clarify chord parser truth refresh landing`
- `b9f16220a7f80ebea79fe9fc61c3a5a76a9daf38`:
  `commitpath_c40ed88d Refresh chord parser truth evidence`
- `50bddb21272d8949e302a6437de76db6802c2c2f`:
  `commitpath_c40ed88d Refresh chord parser truth evidence`
- `a9c1c37df3bf8d8e32f5ac272f182ce551d3e905`:
  `commitpath_c40ed88d Refresh chord parser truth evidence`
- `f2cf8ee8530a8ad3fe5b49086844219f5db78eb7`:
  `commitpath_c40ed88d Refresh chord parser truth evidence`
- `767e385005d0d2d164cb15a0972db85a5c0630cf`:
  `commitpath_c40ed88d Refresh chord parser truth head evidence`
- `e75b500db7d8d8656378b3409e1d53ba34e5d634`:
  `commitpath_c40ed88d Clarify chord parser truth proof boundary`
- `b0507a1d003b3d0b3653b34126cb208fcdb035a2`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `b4cb7ed9112a21c16627878c435ae2c1779f01cc`:
  `commitpath_c40ed88d Refresh chord parser truth evidence`
- `3a6155799ee2ce8521b8dca08f9c85e4d57c181f`:
  `commitpath_c40ed88d Refresh chord parser truth evidence`
- `592280246c14cdc6036e7298e0838e5b96375816`:
  `commitpath_c40ed88d Refresh chord parser truth evidence`
- `a060f2b069598a1fb647e43b477532bf77cff6b5`:
  `commitpath_c40ed88d Refresh chord parser truth evidence`
- `2db22da31c9b98080f81ef8f1fd7df75e8eae4d7`:
  `commitpath_c40ed88d Refresh chord parser truth evidence`
- `808ce22e2c1cb91568b584dca34b67fbc4b85323`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `cbe367650e58fe4584fb35da32103ff71c6b82d8`:
  `commitpath_c40ed88d Keep repeat-after-rest parser truth blocked`
- `889233623b9b0eba1d3b86afdcf4c56fcb1f1bf4`:
  `commitpath_c40ed88d: propagate chord parse blocker truth into readiness`
- `3f1cffb247dafb619a01ff36faa5ff705215c9bf`:
  `Make chord parser blockers report ready bar counts`
- `ae87f616fe49f048530276896d3909dfe7331960`:
  `commitpath_c40ed88d Surface upload blocked title truth`
- `95816f20ffca96034f6c73e04ef44c11fefacf2b`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `f280d7d7db09ee3018bf429163f22d195d5e5998`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `fffb1c64ceb02eebe9f6769780da2b07c04fa462`:
  `commitpath_c40ed88d Lock no-chord upload blocked truth`
- `63b905c3fc0b4fad9cf259366d5d35db095dfd58`:
  `commitpath_c40ed88d Clarify no-chord chart truth`
- `dd7179bc1631c33fd69373a8f77354539c4f3a29`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `1df2c047463e996ee0602661fd247519598728ed`:
  `commitpath_c40ed88d Surface blocked upload truth`
- `007d0012babec55c445d097fd511a5df8708eb87`:
  `Preserve parse issue truth for all-invalid charts`
- `a50e4cf67e3f5cab9b187febade991c55692d567`:
  `commitpath_c40ed88d Block no-chord-only charts from generation`
- `b0ea4c1c7692735811474dc38057dba5f141e26c`:
  `Keep header-only chord charts blocked`
- `426bbfb783a536d9e4d8898d452db2b2de0efba1`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `8b025e3c3827dd8ee97bf2f8494ba610ac6a527f`:
  `Fix chord parser issue line numbers`
- `8e7cfcb5b5a86906d1d9fdbf8f2eb0a5cfcedfe7`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `bb0ef6907c1668f001efbc94e35a1f332d4e9cf3`:
  `Clarify chord parser blocked-state truth`
- `f433c4ed012a35b196555b3f3e94ae02d70cf39e`:
  `commitpath_c40ed88d Block assistant readiness on chord parse issues`
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
- `b97ac259d751c18c413d3222a2f668ee43ab6ab7`:
  `Promote to main: Arrangement Forge chord parser failure truth slice`
- `1f643de75a985bd95f0a008a2d907e8128d40ebb`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `3db73757d1a955ff8dceff03eacb396557c13eab`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `f5355a1ddc47c78ddcc3d8c40975c7bb945ce43c`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `b778baa4a8f71f4e57ec8b88d64041b1510c99cc`:
  `commitpath_c40ed88d Surface blocked import feedback truth`
- `6e70db04de4e570b8462286ac9412c77d86c4368`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `9ab1222d863736be05344934184fe5729737c129`:
  `commitpath_c40ed88d Clarify leading repeat recovery truth`
- `e7cbe50bbb583bf5489f0eac0cf220e1ad5ffef7`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `a350f32e14fb472bbf229529c6539845c7895780`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `f7ec7fa797530fdb01d685e34db031918591d5f8`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `f7fe60eeaee2847a7dbea87a4a48a23803869384`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `f353b811f5d2968dc5d98159a8396d6a1dd5e5b2`:
  `commitpath_c40ed88d Surface upload parser locations`
- `337372b4f9b72e31f4c076e179f93e1a194cadce`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `0dca5dd091a0e45304f95f7b2259e0c7bfd60234`:
  `commitpath_c40ed88d Refresh chord parser failure truth evidence`
- `89ea1676e2d0f5dbebccded26be5f17a39c3e915`:
  `commitpath_c40ed88d Clarify blocked upload parser summary`
- `d280a54aa352bee6f04793aea55623f8aec7d90e`:
  `Clarify chord parser recovery steps`
- `d7b6256dd28b86b16a43dc1f41f33e7e9cd14bab`:
  `commitpath_c40ed88d Keep chord chart hint reason local`
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
- Commit `9ab1222d` narrowed the first-bar repeat recovery step so the surface
  tells the operator to replace the leading repeat with an explicit chord
  before using repeat markers, instead of implying a nonexistent previous bar
  can be fixed.
- Commit `94a92965` refreshed the repo-local evidence again after another clean
  focused recheck so the artifact kept pace with the latest verified `main`
  head instead of stopping at the prior doc-only pointer.
- Commit `0df706e5` kept the blocked-state family honest by preserving explicit
  overflow truth when only the first flagged-bar snippets are surfaced in the
  panel.
- Commit `b3c81a91` refreshed the same repo-local evidence after another clean
  focused recheck so the artifact kept tracking the latest verified `main`
  head instead of stopping at the previous product-pointer refresh.
- Commit `f433c4ed` extended the same family into assistant readiness, keeping
  assistant generation blocked with explicit repair copy whenever chord parse
  issues remain instead of letting the disabled composer hide that dependency.
- Commit `dca1b46e` repeated that repo-local evidence refresh so the artifact
  kept pace with the current verified `main` head instead of stopping one
  checked proof behind.
- Commit `d9be6cb2` repeated that same repo-local evidence refresh after
  another clean focused recheck, keeping the artifact aligned with the latest
  verified product head instead of the prior evidence pointer.
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
- Commit `95816f20` repeated that same repo-local evidence refresh after
  another clean focused recheck, keeping the artifact aligned with the latest
  verified product head instead of the prior evidence pointer.
- Commit `ae87f616` kept blocked upload feedback locked to the parser
  `truth.title`, so imported parse failures now surface the same named blocked
  state as the main chord-chart banner instead of drifting back to older copy.
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
- The later 2026-03-31 product commits `b0ea4c1c`, `a50e4cf6`, and
  `007d0012` tightened the same family by keeping header-only charts blocked,
  keeping no-chord-only charts blocked, and preserving parse-issue truth for
  all-invalid charts instead of collapsing them into the generic missing-bar
  path.
- The later 2026-03-31 product head `1df2c047` kept the same family honest by
  surfacing blocked upload truth with the same explicit parser state and next
  step on the import surface instead of falling back to more generic upload
  copy.
- The latest 2026-03-31 recheck at verified product head `1df2c047` produced
  the focused proof results above with no remaining bounded product-file delta
  in this family, so this family is exhausted again for now and the honest
  move was another repo-local evidence refresh instead of a speculative parser
  or input-surface edit.
- Commit `89ea1676` kept blocked upload feedback honest by surfacing parser
  `summary` beside the blocked state and next step, so file imports now say why
  the chart is blocked instead of only that generation is still gated.
- Commit `d280a54a` clarified parser recovery wording so invalid-token blockers
  say to fix or replace the flagged chord bars, while repeat-marker blockers
  still name the explicit-chord repair path they actually require.
- Commit `d7b6256d` kept the raw chord-chart field hint self-contained by
  carrying parser `summary` into that local surface, so the operator does not
  have to scroll back to the blocked banner to recover the reason a chart is
  still gated.
- Commit `0dca5dd0` refreshed the same repo-local evidence after those product
  changes landed, keeping the artifact aligned with the then-current verified
  proof boundary instead of stopping at `337372b4`.
- The latest 2026-03-31 recheck at verified repo head `1be8d8bd` produced the
  same focused proof results again with no remaining bounded product-file
  delta in this family, so the honest move remains to stop here unless a new
  parser-truth behavior changes the contract or proof surface.
- The latest 2026-03-31 recheck at verified repo head `2d3ca1b6` produced the
  same focused proof results again with no remaining bounded product-file
  delta in this family, so the honest move remained another repo-local
  evidence refresh instead of reopening the parser or input surfaces without a
  fresh product truth gap.
- The latest 2026-03-31 recheck at verified repo head `b778baa4` produced the
  same focused proof results again with no remaining bounded product-file
  delta in this family, so the honest move remained a repo-local evidence
  refresh instead of reopening the parser or input surfaces without a fresh
  product truth gap.
- The latest 2026-03-31 recheck at verified repo head `9ab1222d` produced the
  same focused proof results again with no remaining bounded product-file
  delta in this family, so the honest move remains another repo-local
  evidence refresh instead of reopening the parser or input surfaces without a
  fresh product truth gap.
- The latest 2026-03-31 recheck at verified repo head `1f643de7` produced the
  same focused proof results again with no remaining bounded product-file
  delta in this family, so the honest move remains another repo-local
  evidence refresh instead of reopening the parser or input surfaces without a
  fresh product truth gap.
- The latest 2026-03-31 recheck at verified repo head `f7fe60ee` produced the
  same focused proof results again with no remaining bounded product-file
  delta in this family, so the honest move remains to stop here unless a new
  parser-truth behavior changes the contract or proof surface.
- The latest 2026-03-31 recheck at verified local `main` head `767e3850`
  produced the same focused proof results again with no remaining bounded
  product-file delta in this family, so the honest move remained another
  repo-local evidence refresh instead of reopening the parser or input
  surfaces without a fresh product truth gap.
- The latest 2026-03-31 recheck at verified local `main` head `e922baaa`
  again produced the same focused proof results with no remaining bounded
  product-file delta in this family, so the honest move stayed a repo-local
  evidence refresh rather than reopening the parser, input surface, or
  generation gate without a fresh product truth gap.
- The latest 2026-04-01 recheck at verified local `main` head `2db22da3`
  again produced the same focused proof results with no remaining bounded
  product-file delta in this family, so the honest move stayed a repo-local
  evidence refresh rather than reopening the parser, input surface, or
  generation gate without a fresh product truth gap.

The tests cover:

- explicit invalid-token issue capture
- all-invalid charts staying on the parse-issue path instead of collapsing into
  generic missing-bar truth
- repeat markers without a previous chord
- repeat markers that follow unresolved bars
- unbracketed section header lines that should not become false blocked bars
- header-only charts staying blocked until a playable bar exists
- no-chord-only charts staying blocked until a playable bar exists
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
