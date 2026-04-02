# Auth Store Error Truth

Status date: 2026-04-02

Status: landed on `main`; reverified on 2026-04-02 against current product
head `942d6b08` with no remaining bounded product delta visible in this family

Purpose: preserve the current auth-store failure and recovery contract in one
repo-local place so future work does not have to reconstruct it from
`src/store/auth-store.ts`, `src/hooks/useAuth.ts`, and scattered tests.

## Auth Store Error Contract

- Auth bootstrap keeps `checking-session`, `authenticated`, and signed-out
  failure states distinct instead of collapsing failures into neutral copy.
- Signed-out auth failures keep the blocking reason explicit, so the operator
  can tell whether the missing step is signing in, confirming email, restoring
  a missing profile, retrying profile load, or retrying session restore.
- Incomplete authenticated state stays blocked until both `user` and `profile`
  are present, rather than presenting a half-restored session as usable.
- Trailing Supabase `SIGNED_OUT` replays do not flatten more specific bootstrap
  failure truth back to generic signed-out copy.

## Operator-Facing Truth

`src/store/auth-store.ts` owns auth failure classification:

- `getAuthGateTruth` keeps pending, granted, and blocked access states separate
  while naming the current blocked reason and next step.
- Signed-out reasons map to distinct recovery truth, including `confirm-email`,
  `complete-profile`, `retry-profile-load`, and `retry-session`, instead of a
  single generic auth failure message.
- `getAuthTruth` extends the same shared surface with `status` so consumers do
  not have to compose separate auth primitives by hand.
- `selectAuthStoreTruthSlice` exposes one named surface with `user`, `profile`,
  and `authTruth` while keeping persisted store state focused on raw auth data.

`src/hooks/useAuth.ts` owns auth failure preservation across transitions:

- bootstrap starts in `checking-session` and only opens the authenticated path
  after the profile row loads successfully
- missing-profile and profile-load-failed outcomes land as blocked signed-out
  truth instead of silent null session state
- session lookup failures preserve a distinct retry-session recovery path
- explicit bootstrap failure reasons survive trailing `SIGNED_OUT` events, so
  later auth callbacks do not erase the more specific failure state
- sign-out failure preserves the authenticated truth surface instead of
  clearing the store before Supabase confirms sign-out

## Proof

Current focused proofs for this slice:

- `pnpm exec vitest run src/store/auth-store.test.ts src/hooks/useAuth.test.ts`
- `pnpm run type-check`
- verification head: `942d6b08c4c315019cc05560310b6dc387018758`

## Tracked Landing

- `942d6b08c4c315019cc05560310b6dc387018758`:
  `Promote auth trailing sign-out truth helper`
- `17736a7365066d317bc8ec2ca26ec0bcc77dd9d0`:
  `commitpath_c40ed88d Preserve bootstrap auth truth replays`
- `35b3837b0b7d5afcb80130f2f041e5cdb17c6398`:
  `commitpath_c40ed88d Preserve bootstrap auth failure truth`
- `a6700f97de63d15578bcaf232c80c78e9bc0cd9f`:
  `commitpath_c40ed88d Block incomplete authenticated state`
- `3e52bb1ec6fe4f22ea5a62e639304b8b1c7e9440`:
  `commitpath_c40ed88d Preserve auth truth on sign-out failure`
- The current `main` head at `942d6b08` still preserves the auth-store error
  contract and its focused proofs, so this bounded landing refreshes local
  evidence instead of claiming a new product behavior change.
- The auth surface keeps bootstrap pending, signed-out failure reasons, and
  authenticated truth explicit from one shared contract instead of forcing
  archaeology through separate hook and store state.
- The focused auth proofs passed again on 2026-04-02 against product head
  `942d6b08`, so this local artifact matches the live product surface instead
  of a stale earlier verification point.
- After the 2026-04-02 recheck, this family appears exhausted until auth
  bootstrap, profile hydration, or sign-out behavior changes again.

The tests cover:

- pending bootstrap truth during session lookup
- blocked signed-out recovery truth for missing profile, profile load failure,
  session lookup failure, email confirmation required, and generic no-session
  states
- incomplete authenticated state staying blocked until both user and profile
  exist
- trailing sign-out replay preservation for bootstrap failure truth
- sign-out success and sign-out failure behavior in the auth hook

## Deep Home

- `src/store/auth-store.ts`
- `src/hooks/useAuth.ts`
- `src/store/auth-store.test.ts`
- `src/hooks/useAuth.test.ts`
