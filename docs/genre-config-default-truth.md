# Genre Config Default Truth

Status date: 2026-04-01

Status: landed on `main`; reverified on 2026-04-01 against current product
head `0b485571` with no remaining bounded product delta visible in this family

Purpose: preserve the current genre-default contract in one repo-local place so
future work does not have to reconstruct it from `src/lib/genre-config.ts`,
`src/hooks/useProject.ts`, `src/pages/SettingsPage.tsx`, and scattered tests.

## Default Contract

- `DEFAULT_GENRE` remains `Jazz`.
- `normalizeGenrePreference` preserves supported saved genres and falls back to
  `Jazz` for missing or unsupported values.
- `getDefaultSubStyleForGenre` derives the first supported sub-style for the
  normalized genre and falls back to `Swing`.
- `getDefaultProjectStyle` returns one explicit `{ genre, subStyle }` pair for
  new-project creation instead of leaving downstream callers to infer the
  canonical default.
- Missing or unsupported saved profile genres do not create hidden invalid
  state for new projects; they normalize back to the canonical default path.

## Operator-Facing Truth

`src/lib/genre-config.ts` owns the canonical default path:

- `GENRES` stays derived from `GENRE_SUBSTYLES` so the supported saved-value
  list and the normalization helpers stay aligned.
- `DEFAULT_GENRE`, `normalizeGenrePreference`, `getDefaultSubStyleForGenre`,
  and `getDefaultProjectStyle` keep one shared source of truth for new-project
  defaults instead of duplicating fallback logic across callers.

`src/pages/SettingsPage.tsx` owns the saved-versus-next-save truth for default
genre on the settings surface:

- the page states when no saved default genre exists yet
- the page states what the first save will create for new projects
- the page keeps the currently saved default genre and the next pending saved
  value explicit when a local draft differs
- the page keeps default-genre copy aligned with the supported `GENRES` list
  instead of silently accepting unsupported persisted values

`src/pages/SettingsPage.test.tsx` keeps the failure boundary explicit:

- invalid persisted default genres remain visible as validation errors instead
  of being promoted into saved profile truth

## Proof

Current focused proofs for this slice:

- `pnpm exec vitest run src/lib/genre-config.test.ts src/pages/SettingsPage.test.tsx`
- `pnpm exec tsc --noEmit`
- verification head: `0b485571d7cefc1f6980fc000e5533ad64580be3`

## Tracked Landing

- `827be97096031f474613e1768295b7f35b9831d2`:
  `Promote to main: Arrangement Forge profile default genre creation slice`
- `6824b2c5fe750610d7423e8b8b73f2e2eb3ded1e`:
  `commitpath_c40ed88d: expose settings profile truth`
- `c60dbed13e48ea66881d37b7bad8d1456ee63447`:
  `commitpath_c40ed88d Clarify first saved settings profile truth`
- `099b6052709f9f750367b4c34c2feac66f21ed31`:
  `commitpath_c40ed88d Add invalid default genre settings regression`
- The genre-default helper landing at `827be970` gave new-project creation one
  canonical default path instead of forcing callers to re-derive fallback
  genre and sub-style decisions.
- The settings truth landing at `6824b2c5` made the saved default genre and the
  next pending saved value visible on the page instead of leaving that state to
  inference.
- The follow-up copy pass at `c60dbed1` made first-save behavior explicit when
  no saved default genre exists yet.
- The regression coverage at `099b6052` kept unsupported persisted genres from
  silently becoming saved truth after save.
- The focused proofs passed again on 2026-04-01 against product head
  `0b485571`, so this repo-local artifact now matches the current live
  contract instead of leaving the family undocumented.
- After the 2026-04-01 recheck, this family appears exhausted until genre
  defaults, saved-profile validation, or new-project creation behavior changes.

The tests cover:

- supported genres that should keep their saved preference intact
- missing or unsupported genres that should normalize back to `Jazz`
- derived default sub-style fallback for normalized genres
- settings truth copy for the currently saved default genre and next pending
  saved value
- invalid persisted default genre errors after save

## Deep Home

- `src/lib/genre-config.ts`
- `src/lib/genre-config.test.ts`
- `src/pages/SettingsPage.tsx`
- `src/pages/SettingsPage.test.tsx`
