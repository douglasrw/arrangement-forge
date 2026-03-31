# Editor Route Readiness Truth

Status date: 2026-03-31

Status: landed on `main`; reverified on current `main` at `34fea3b9`

Purpose: preserve the current editor route contract and its landing proof in
one repo-local place so future work does not have to reconstruct it from
`App.tsx`, `EditorPage.tsx`, and scattered tests.

## Route Contract

- `/project` is the editor fallback route.
- `/project/:id` is the requested project route.
- During authentication bootstrap, protected editor destinations stay reserved
  instead of flashing login or protected content.
- After authentication, the editor must keep route state explicit while the
  requested project is loading, missing, malformed, unavailable, or ready.
- If the active editor route includes a query string or hash fragment, the
  editor readiness surface keeps that exact route visible instead of collapsing
  it to pathname-only truth.

## Operator-Facing Truth

`src/App.tsx` owns protected-route recovery truth:

- `/project` stays reserved as the fallback editor route during auth bootstrap.
- `/project/:id` stays reserved during auth bootstrap, with `/project` kept as
  the fallback if the operator needs to choose a different project after
  recovery.

`src/pages/EditorPage.tsx` owns route readiness truth after the guard opens:

- `project-selection` keeps `/project` parked with no active project and points
  the operator back to the library.
- `project-id` keeps the current route explicit while a project is loading.
- `project-id` preserves any active query or hash on the current route while
  readiness is still resolving and after the route is ready.
- Missing, malformed, and load-failure states explain why the route cannot
  open and point back to the library.
- Ready state keeps the active route explicit and reminds the operator that
  `/project` remains the fallback route if they leave the current project.

## Proof

Current focused proofs for this slice:

- `pnpm exec vitest run src/App.test.tsx src/pages/EditorPage.test.tsx`
- `pnpm exec tsc --noEmit`

## Tracked Landing

- `c2b9ba11ac89eea868e1f75f569dd44b9162aa4f`:
  `commitpath_c40ed88d: promote editor route readiness truth slice`
- `214a6764b93e1dd59918c9627fa8ae3d6d0260d5`:
  `commitpath_c40ed88d Add exact fallback route truth regressions`
- `34fea3b9e5c9624646a5ce7b96caba4333ca989b`:
  `commitpath_c40ed88d Refresh editor route readiness truth evidence`
- The landing made current route, fallback route, and route readiness explicit
  across auth bootstrap, route loading, malformed-route handling, missing or
  unavailable project states, and ready-state recovery.
- The current `main` head still preserves that contract, and the focused route
  proofs passed again on 2026-03-31 without additional product changes to the
  route surface.

The tests cover:

- auth bootstrap reservation for `/project` and `/project/:id`
- guarded routing of `/project` into the editor surface
- loading, missing-project, malformed-route, fallback, and ready-state truth in
  `EditorPage`

## Deep Home

- `src/App.tsx`
- `src/pages/EditorPage.tsx`
- `src/App.test.tsx`
- `src/pages/EditorPage.test.tsx`
