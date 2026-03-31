# Editor Route Readiness Truth

Status date: 2026-03-31

Purpose: preserve the current editor route contract in one repo-local place so
future work does not have to reconstruct it from `App.tsx`, `EditorPage.tsx`,
and scattered tests.

## Route Contract

- `/project` is the editor fallback route.
- `/project/:id` is the requested project route.
- During authentication bootstrap, protected editor destinations stay reserved
  instead of flashing login or protected content.
- After authentication, the editor must keep route state explicit while the
  requested project is loading, missing, malformed, unavailable, or ready.

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
- Missing, malformed, and load-failure states explain why the route cannot
  open and point back to the library.
- Ready state keeps the active route explicit and reminds the operator that
  `/project` remains the fallback route if they leave the current project.

## Proof

Current focused proofs for this slice:

- `pnpm exec vitest run src/App.test.tsx src/pages/EditorPage.test.tsx`
- `pnpm exec tsc --noEmit`

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
