# Project Store Error Truth

Status date: 2026-04-02

Status: landed on `main`; reverified on 2026-04-02 against current product
head `4a777a0b` with no remaining bounded product delta visible in this family

Purpose: preserve the current project-store load failure and recovery contract
in one repo-local place so future work does not have to reconstruct it from
`src/store/project-store.ts`, `src/hooks/useProject.ts`, `src/pages/EditorPage.tsx`,
and scattered tests.

## Project Store Error Contract

- The project store keeps `ready`, `waiting`, and `blocked` as distinct named
  readiness states instead of collapsing failed loads into neutral copy.
- Missing-project truth stays separate from load-failure truth, so the
  operator can tell whether the requested project is gone or whether a specific
  project table failed during hydration.
- Load failures keep the failing target explicit, such as `project blocks`,
  instead of reporting only a generic project-load error.
- The next honest move stays visible in both store truth and route-shell truth,
  so the operator can retry after the failing load is fixed or return to the
  library without archaeology outside the surface.

## Operator-Facing Truth

`src/store/project-store.ts` owns project-store readiness classification:

- `getProjectStoreReadiness` keeps `ready`, `waiting`, and blocked states
  separate and names the current requested project directly.
- Missing projects map to blocked readiness with `missing-project` detail and a
  return-to-library next step.
- Load failures map to blocked readiness with `load-failure` detail and the
  exact failing target, such as `project blocks`.
- Store truth keeps `detail`, `blockedBy`, and `failureTarget` explicit so
  route and shell surfaces do not have to infer why hydration failed.

`src/hooks/useProject.ts` owns hydration failure capture:

- `loadProject` clears the previous project session before starting a fresh
  load so stale arrangement rows do not survive into a failed request.
- `ProjectLoadFailure` preserves the exact failing target from Supabase table
  fetches instead of flattening every failure into `project data`.
- Missing projects return `missing-project` with `Project not found` detail.
- Table failures return `error` with the specific failing target and surface
  the same detail into both store readiness and UI system status.

`src/pages/EditorPage.tsx` owns route-shell rendering when the editor cannot
open:

- Missing and failed project loads keep the current route visible while naming
  the project-store readiness as `blocked`.
- The shell shows the current store state and next step directly on the error
  surface instead of hiding them in a toast or console-only message.
- The back-to-library action stays visible on blocked routes so recovery is
  explicit from the same surface that reports the failure.

## Proof

Current focused proofs for this slice:

- `pnpm exec vitest run src/store/project-store.test.ts src/hooks/useProject.test.ts src/pages/EditorPage.test.tsx`
- `pnpm run type-check`
- verification head: `4a777a0bf22a0903695b5a90c32ee8f377a76c04`

## Tracked Landing

- `05fb9a665de61889a7942db90aa94a9f896760d3`:
  `commitpath_49d24abb Surface project store load failure truth`
- `4a777a0bf22a0903695b5a90c32ee8f377a76c04`:
  `Expose project load failure truth`
- The current `main` head at `4a777a0b` still preserves the project-store
  error contract and its focused proofs, so this bounded landing refreshes
  local evidence instead of claiming a new product change.
- The landing made missing-project and table-load-failure states explicit
  across store readiness, hook return values, and the editor route shell.
- The focused project-store proofs passed again on 2026-04-02 against product
  head `4a777a0b`, so this local artifact matches the live product surface
  instead of a stale earlier verification point.
- After the 2026-04-02 recheck, this family appears exhausted until a new
  project hydration or editor-route behavior changes the contract or proof
  surface.

The tests cover:

- project-store readiness truth for waiting, missing-project, load-failure,
  and ready states
- `loadProject` missing-project behavior, including store reset and explicit
  blocked readiness detail
- `loadProject` table-failure behavior, including `failureTarget` truth for
  `project blocks`
- editor-route blocked-state rendering for missing and failed project loads

## Deep Home

- `src/store/project-store.ts`
- `src/hooks/useProject.ts`
- `src/pages/EditorPage.tsx`
- `src/store/project-store.test.ts`
- `src/hooks/useProject.test.ts`
- `src/pages/EditorPage.test.tsx`
