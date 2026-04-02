# Library Page Error Truth

Status date: 2026-04-02

Status: landed on `main`; reverified on 2026-04-02 against current product
head `bbc10496d1b486826cc893bd6ec9035cbe7b6b1c` with no remaining bounded
product delta visible in this family

Purpose: preserve the current library page failure and recovery contract in one
repo-local place so future work does not have to reconstruct it from
`src/pages/LibraryPage.tsx` and scattered tests.

## Library Page Error Contract

- The library page keeps `waiting`, `ready`, and `blocked` readiness states
  distinct instead of flattening failures into neutral empty-library copy.
- Initial load failure stays separate from offline recovery and action-failure
  truth, so the operator can tell whether the library never loaded, the route
  lost connectivity, or a later library action failed.
- The current blocking detail stays visible on the same surface as the
  readiness status, so the operator does not need archaeology outside the page
  to understand what failed.
- The next honest move stays explicit through retry actions and blocked-state
  copy instead of leaving recovery implied.

## Operator-Facing Truth

`src/pages/LibraryPage.tsx` owns library-route readiness and blocked-state
truth:

- `getLibraryReadinessState` keeps `waiting`, `ready`, and `blocked` states
  distinct while surfacing the current failure detail directly on the page.
- `getLibraryBlockedState` distinguishes offline recovery from generic library
  failures and names the current retry action honestly.
- The route keeps blocked library truth visible instead of falling through to
  `No projects yet.` when the library is unavailable.
- The same route shell keeps recovery explicit for both initial load failure
  and later library actions such as delete failures.

## Proof

Current focused proofs for this slice:

- `pnpm exec vitest run src/pages/LibraryPage.test.tsx`
- `pnpm run type-check`
- verification head: `bbc10496d1b486826cc893bd6ec9035cbe7b6b1c`

## Tracked Landing

- `bbc10496d1b486826cc893bd6ec9035cbe7b6b1c`:
  `Keep library offline truth visible`
- `dda1f7a0a3bc20ad2371bb7e80d081b88e41e093`:
  `Expose library readiness on the page surface`
- `2ba7c16668760a76669bbb41a7a4d460a7f80916`:
  `Fix library delete and error truth`
- The current `main` head at `bbc10496d1b486826cc893bd6ec9035cbe7b6b1c` still
  preserves the library error contract and its focused proof, so this bounded
  landing refreshes local evidence instead of claiming a new product behavior
  change.
- The landing keeps load failure, offline recovery, and action-failure truth
  explicit on the library page instead of collapsing those states into neutral
  empty-library copy.
- The focused library proof passed again on 2026-04-02 against product head
  `bbc10496d1b486826cc893bd6ec9035cbe7b6b1c`, so this local artifact matches
  the live product surface instead of a stale earlier verification point.
- After the 2026-04-02 recheck, this family appears exhausted until a new
  library readiness, recovery, or action-failure behavior changes again.

The tests cover:

- initial library load failure rendering as blocked truth instead of empty
  state
- offline library recovery copy and retry action visibility
- waiting readiness while the library route is still loading
- action-failure truth after delete persistence fails

## Deep Home

- `src/pages/LibraryPage.tsx`
- `src/pages/LibraryPage.test.tsx`
