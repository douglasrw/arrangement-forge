# Auth Store Gating Truth

Status date: 2026-03-31

Status: landed on `main`; reverified on 2026-03-31 with focused auth proofs and
no remaining product delta in this family beyond this evidence refresh

Purpose: preserve the current auth gating contract and its landing proof in one
repo-local place so future work does not have to reconstruct it from
`auth-store.ts`, `useAuth.ts`, and scattered tests.

## Auth Contract

- Auth state stays derivable from the raw store state instead of storing stale
  duplicated truth snapshots.
- The current auth state and the operator's next step stay named on one truth
  surface.
- Session bootstrap remains explicit while authentication is still checking.
- Signed-out states preserve the reason they are blocked and the recovery step
  the operator should take next.
- Incomplete authenticated state stays blocked until both `user` and `profile`
  are present.
- Trailing Supabase sign-out replays do not erase more specific bootstrap truth
  like `no-session` or `missing-profile`.

## Operator-Facing Truth

`src/store/auth-store.ts` owns the shared auth truth definitions:

- `getAuthGateTruth` derives access state, current state, next step, and signed
  out reason from raw auth store state.
- `getAuthTruth` extends that same truth surface with the current auth status so
  consumers do not have to combine separate primitives by hand.
- `selectAuthStoreTruthSlice` exposes one named surface with `user`, `profile`,
  and `authTruth` while keeping the persisted store focused on raw state.

`src/hooks/useAuth.ts` owns auth bootstrap and transition preservation:

- session bootstrap begins in `checking-session` and stays explicit until
  hydration finishes
- missing profile and profile-load failure states land as blocked signed-out
  truth instead of silent null state
- stale hydrations do not reopen the auth gate after sign-out
- explicit signed-out bootstrap reasons survive trailing `SIGNED_OUT` events

## Proof

Current focused proofs for this slice:

- `pnpm test -- --run src/store/auth-store.test.ts src/hooks/useAuth.test.ts`
- `pnpm run type-check`

## Tracked Landing

- `d239a4935d3dcd63273d2b44c0e1d5f5cd1a086f`:
  `Promote to main: Arrangement Forge auth store gating truth slice`
- `02f7037d23461cdf52c8064191d313c2b98d3d29`:
  `Promote auth gate truth into the auth store`
- `b1ca30e1bc4ad24800c723edaf71863c16233be6`:
  `Derive auth gate truth from auth state`
- `cf23ec2e7f0576ef84cadf7080737fd9715d286a`:
  `commitpath_c40ed88d Promote auth truth surface`
- `6c3e53d24aa7df1d390fe10d8b65ba143197db4d`:
  `Clarify auth hook truth surface`
- `34f99c0196cf40b05f8ee639febfe66859eb8f85`:
  `Tighten auth truth slice`
- `981e38317f7415c6a8fe949d0ff0e5ad0e7d2d51`:
  `Promote auth store gating truth slice`
- `3e52bb1ec6fe4f22ea5a62e639304b8b1c7e9440`:
  `commitpath_c40ed88d Preserve auth truth on sign-out failure`
- `ee19351b1eb2d5dcfe29061f1202d86d88a7a188`:
  `Clarify auth truth copy`
- `5907172699850ac3d65e74d0fa050697ff31a758`:
  `Promote auth store gating truth slice`
- `3e09e296c843ecab892fb4d78c179d1dccb368c4`:
  `commitpath_c40ed88d Add auth truth slice stability regression`
- `a7f7f94ca62268aa19176156418b176f4d5376af`:
  `commitpath_c40ed88d Simplify auth truth surface`
- `ce23176e0c3f4468588a8e7d504986b07badf77b`:
  `commitpath_c40ed88d Preserve no-session auth truth`
- `a6700f97de63d15578bcaf232c80c78e9bc0cd9f`:
  `commitpath_c40ed88d Block incomplete authenticated state`
- `35b3837b0b7d5afcb80130f2f041e5cdb17c6398`:
  `commitpath_c40ed88d Preserve bootstrap auth failure truth`
- The current `main` head still preserves the auth truth contract, and the
  focused auth proofs passed again on 2026-03-31 without additional product
  changes to the auth surfaces.
- After the 2026-03-31 recheck, this family appears exhausted until a new auth
  behavior changes the contract or the proof surface.

The tests cover:

- pending bootstrap truth
- explicit blocked recovery steps for signed-out reasons
- stable shared truth derivation between gate and status surfaces
- incomplete authenticated state staying blocked
- stale hydration and trailing sign-out replay protection

## Deep Home

- `src/store/auth-store.ts`
- `src/hooks/useAuth.ts`
- `src/store/auth-store.test.ts`
- `src/hooks/useAuth.test.ts`
