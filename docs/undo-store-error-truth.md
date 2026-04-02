# Undo Store Error Truth

Status date: 2026-04-02

Status: landed on `main`; reverified on 2026-04-02 against current product
head `e0ad14d4` with no remaining bounded product delta visible in this family

Purpose: preserve the current undo-stack failure and recovery contract in one
repo-local place so future work does not have to reconstruct it from
`src/store/undo-store.ts`, `src/lib/undo-helpers.ts`, and scattered UI tests.

## Undo Store Error Contract

- Undo and redo history keep `waiting`, `blocked`, `paused`, and `available`
  as distinct named states instead of collapsing unreadable boundaries into
  generic idle history.
- Broken restore snapshots stay visible as blocked undo or redo boundaries, so
  the operator can tell that history still exists even when the latest
  boundary cannot be restored.
- When a blocked undo boundary traps older restorable history behind it, the
  current state and next step keep that trapped history explicit instead of
  implying the older stack disappeared.
- Operator-facing surfaces keep the same blocked and waiting history truth
  visible through labels, tooltips, and next-step guidance instead of hiding
  undo-stack failures in console-only state.

## Operator-Facing Truth

`src/lib/undo-helpers.ts` owns undo-stack failure classification:

- `createUndoBoundaryTruth` returns `blocked` when the latest undo or redo
  snapshot cannot be parsed instead of advertising the boundary as available.
- Blocked history keeps the failed capture target explicit, such as
  `before Broken action` or `after Broken redo`, so the failure is tied to a
  named boundary instead of anonymous stack state.
- When older restorable undo history is trapped behind a blocked latest
  boundary, helper truth keeps both the trapped-history read and the repair
  next step explicit.
- `createUndoHistoryTruth` keeps waiting history explicit before any restorable
  boundary exists and prefers the actionable boundary when one side is blocked
  while the other side is still available or paused.

`src/store/undo-store.ts` owns undo-store execution behavior:

- `undo` and `redo` leave the stacks unchanged when the current boundary truth
  is not `available`, so unreadable restore snapshots do not consume history.
- `canUndo`, `canRedo`, `getUndoDescription`, and `getRedoDescription` stop
  advertising blocked boundaries as available actions.
- `getHistoryTruth` preserves the same blocked, waiting, and paused truth the
  helpers compute, so surfaces read one shared contract instead of inferring
  error state separately.

UI surfaces preserve the same undo-store error truth:

- `src/components/layout/StatusBar.tsx` renders blocked undo history with the
  current failure read and repair guidance instead of implying history is
  simply idle.
- `src/components/transport/TransportBar.tsx` keeps blocked and waiting undo
  boundaries visible but disabled, so the transport surface shows why Undo or
  Redo cannot run yet.

## Proof

Current focused proofs for this slice:

- `pnpm exec vitest run src/store/undo-store.test.ts src/lib/undo-helpers.test.ts src/components/layout/StatusBar.test.tsx src/components/transport/TransportBar.test.tsx`
- `pnpm run type-check`
- verification head: `e0ad14d4329ecf16bfbeaf355cc1d6b7d2dd845f`

## Tracked Landing

- `809ae3f5818f7133ab29f0776405240a07d73f7f`:
  `Name blocked and paused undo boundaries`
- `178ba0f35f8877907f314352e359d9257f516e12`:
  `Surface trapped undo history behind blocked boundaries`
- `e3bbae35e4ce564906e80728c92fa98e3fb7a922`:
  `Make undo boundary tooltips first-class truth`
- `e0ad14d4329ecf16bfbeaf355cc1d6b7d2dd845f`:
  `Expose undo stack waiting truth`
- The current `main` head at `e0ad14d4` still preserves the undo-store error
  contract and its focused proofs, so this bounded landing refreshes local
  evidence instead of claiming a new product behavior change.
- The focused undo-store error proofs passed again on 2026-04-02 against
  product head `e0ad14d4`, so this local artifact matches the live product
  surface instead of stale earlier verification.
- After the 2026-04-02 recheck, this family appears exhausted until undo-stack
  storage, restore parsing, or history-surface rendering changes again.

The tests cover:

- blocked undo and redo boundary truth when the latest restore snapshot cannot
  be read
- trapped-history guidance when a blocked undo boundary hides older restorable
  history behind it
- waiting history truth before the first undo boundary exists
- status-bar rendering of blocked undo history and trapped-history next-step
  guidance
- transport-surface rendering of blocked and waiting undo history labels and
  tooltips

## Deep Home

- `src/store/undo-store.ts`
- `src/lib/undo-helpers.ts`
- `src/store/undo-store.test.ts`
- `src/lib/undo-helpers.test.ts`
- `src/components/layout/StatusBar.test.tsx`
- `src/components/transport/TransportBar.test.tsx`
