# Settings Profile Validation Truth

Status date: 2026-03-31

Status: landed on `main`; reverified on 2026-03-31 against current product
head `fa703707` with no remaining bounded product delta visible in this family

Purpose: preserve the current settings and persisted profile validation
contract in one repo-local place so future work does not have to reconstruct it
from `src/pages/SettingsPage.tsx`, `src/lib/profile.ts`, and scattered tests.

## Validation Contract

- Settings keeps editable profile preferences separate from unavailable settings
  so the current state does not have to be inferred from missing controls.
- The page distinguishes saved settings from pending local edits before save.
- Each editable profile field now states both the currently saved value and
  the next saved value that will land after pending local edits.
- Pending settings expose whether save is ready, active, or blocked before the
  operator tries to submit.
- A successful profile save is not treated as truth until the returned profile
  row validates cleanly.
- Persisted chord display mode accepts only `letter` or `roman`.
- Persisted default genre accepts only the supported `GENRES` list and
  normalizes blank or missing values to `null`.
- Required persisted profile fields stay validated instead of being silently
  coerced into saved truth.
- Save failures, missing returned rows, and invalid returned rows stay explicit
  on the settings surface so the operator can tell why saved truth did not
  advance.

## Operator-Facing Truth

`src/pages/SettingsPage.tsx` owns settings-state and save-result truth:

- the Settings State card separates saved, pending, and unavailable settings
  into one named surface
- unavailable settings show current fixed behavior instead of fake disabled
  controls
- the Profile card states that saved display names may be blank and are saved
  exactly as entered, so the operator does not have to infer display-name
  validation from a later failure
- save-caption and pending-state copy keep the next step explicit while edits
  are still local
- per-field helper copy now states the saved display name, chord display mode,
  and default genre alongside the next saved value when a local draft differs
- save readiness now states when sign-in blocks persistence, keeps the button
  disabled, and names the next step instead of silently no-oping on submit
- save failures and invalid returned profile rows stay visible instead of
  silently updating the auth store

`src/lib/profile.ts` owns persisted profile-row validation:

- `rowToProfile` validates required string fields before mapping into shared
  `Profile` state
- `parseChordDisplayMode` rejects unsupported persisted modes instead of
  inventing a saved setting
- `parseDefaultGenre` rejects unsupported persisted genres while normalizing
  blank and missing values to `null`
- `formatChordDisplayModeLabel` keeps saved-value copy aligned between the
  settings surface and validation helpers
- supported-values errors name the accepted modes and genres directly so the
  failure stays actionable

## Proof

Current focused proofs for this slice:

- `pnpm exec vitest run src/lib/profile.test.ts src/pages/SettingsPage.test.tsx`
- `pnpm exec tsc --noEmit`

## Tracked Landing

- `6824b2c5fe750610d7423e8b8b73f2e2eb3ded1e`:
  `commitpath_c40ed88d: expose settings profile truth`
- `7c18ba9ce471bf3bf350583a75170ded2905ac50`:
  `Promote settings profile validation truth`
- `dbc5b968a2884c82c50d02654fdad3866e44dca2`:
  `commitpath_c40ed88d Clarify saved display name profile truth`
- `be18e010438ee11e3b1a03cff666f9ed154c6adb`:
  `commitpath_c40ed88d Refresh settings profile validation truth evidence`
- `cde96b49ab0d092a144d9ce6e25f26afdbe5d8b9`:
  `commitpath_c40ed88d Refresh settings profile validation truth evidence`
- `5e7670fb697976ae731a1ade3d1120e9f5f85e9e`:
  `commitpath_c40ed88d Refresh settings profile validation truth evidence`
- `7c7511db6e87769d0394b534169c8d4595dd4053`:
  `commitpath_c40ed88d Refresh settings profile validation truth evidence`
- `169548e6644aa2f46aeb6d2576dabddf2f3ba0a7`:
  `commitpath_c40ed88d Refresh settings profile validation truth evidence`
- `7a3a5a509be3cb2687873e9d9381e71e821e23f0`:
  `commitpath_c40ed88d Refresh settings profile validation truth evidence`
- `0844ec4083a7c06e4e9ed9a3985c4343e0db520d`:
  `commitpath_c40ed88d Refresh settings profile validation truth evidence`
- `a3d7bad48f879811ea2c7ce4d4122bbea8e3bcf8`:
  `commitpath_c40ed88d Refresh settings profile validation truth evidence`
- `e7ef800e0ea3bbe42d5844cbd2c5d8436a65d325`:
  `commitpath_c40ed88d Surface blocked settings save truth`
- `8fb339322576bc7a785e1169a0ee338c0f48128b`:
  `commitpath_c40ed88d Refresh settings profile validation truth evidence`
- `c05a288eae09cdb564869f5b71aa4fdc001154cd`:
  `commitpath_c40ed88d Refresh settings profile validation truth evidence`
- `ef91b504f7e15c5b1a31fc35a62d03684640279f`:
  `commitpath_c40ed88d Refresh settings profile validation truth evidence`
- `099b6052709f9f750367b4c34c2feac66f21ed31`:
  `commitpath_c40ed88d Add invalid default genre settings regression`
- `b33cb608c838c8dc85184e63b458477363ae83b5`:
  `commitpath_c40ed88d Clarify settings profile validation truth`
- `ee982a8a62ebe8572092dd4f3b7729f4404133ee`:
  `commitpath_c40ed88d Cover settings save failure truth`
- `081ff22a0a08d8a62916270e0ac86628b37418fe`:
  `commitpath_c40ed88d Harden settings profile row validation truth`
- `5c4555a1d47ffcbb4ea602c5791c2f9fcfa8ee04`:
  `commitpath_c40ed88d Surface invalid saved profile settings truth`
- `2b80e28b19c8617fb0cae87e767272df9a42b32a`:
  `commitpath_c40ed88d Validate persisted settings profile truth`
- `4d1e0342d92ba2597f0fc0eecae0e3b0bdd16391`:
  `Add settings truth regression coverage`
- `9150d7d0b2debad01b2a450c45bfbbee29f5edda`:
  `commitpath_c40ed88d Surface chord parser failure truth`
- The landing made saved, pending, unavailable, blocked-save, invalid, and
  failed-save states explicit on the settings surface instead of relying on
  hidden surrounding context.
- The latest product head at `fa703707` still preserves that contract and
  keeps malformed chord-mode persistence explicit instead of letting parser
  failures blur saved-profile truth.
- The focused settings proofs passed again on 2026-03-31 against product head
  `fa703707`, so this repo-local artifact remains aligned with the live
  product surface instead of a stale earlier evidence point.
- The bounded product files in this family still match the earlier landing
  head `9150d7d0`, so this refresh updates canonical evidence instead of
  claiming a new product delta where none exists.
- After the 2026-03-31 recheck, this family appears exhausted until a new
  settings or persisted-profile behavior changes the contract or the proof
  surface.

The tests cover:

- settings draft reconciliation against saved profile state
- explicit separation of saved, pending, and unavailable settings truth
- field-level saved-versus-next-save truth for each editable profile setting
- pending edits that are blocked from save by signed-out auth truth
- invalid returned saved-profile rows after save
- supported chord mode and default genre validation errors
- malformed required persisted profile fields
- rejected saves and saves that return no persisted row

## Deep Home

- `src/pages/SettingsPage.tsx`
- `src/pages/SettingsPage.test.tsx`
- `src/lib/profile.ts`
- `src/lib/profile.test.ts`
