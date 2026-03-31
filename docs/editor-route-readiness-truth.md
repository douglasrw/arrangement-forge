# Editor Route Readiness Truth

Status date: 2026-03-31

Status: landed on `main`; reverified on 2026-03-31 after the shared route-truth helper landed, and no remaining product delta is visible in this family beyond this evidence refresh

Purpose: preserve the current editor route contract and its landing proof in
one repo-local place so future work does not have to reconstruct it from
`src/lib/editor-route-truth.ts`, `App.tsx`, `EditorPage.tsx`, and scattered
tests.

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

`src/lib/editor-route-truth.ts` now owns the shared route-truth copy and
labels used by both auth bootstrap and editor-route shells:

- `getProtectedRouteTruth` keeps `/project`, `/project/:id`, `/library`, and
  `/settings` recovery copy explicit, including exact route preservation for
  query strings and hash fragments.
- `getEditorRouteTruth` keeps the editor fallback route, requested project
  route, malformed route, missing-project route, load-failure route, and ready
  route on one shared truth surface.
- The helper keeps route mode labels aligned across auth bootstrap, parked
  fallback, loading, blocked, and ready states so future copy changes do not
  drift between `App.tsx` and `EditorPage.tsx`.

`src/App.tsx` owns protected-route recovery rendering and routing:

- `/project` stays reserved as the fallback editor route during auth bootstrap.
- `/project/:id` stays reserved during auth bootstrap, with `/project` kept as
  the fallback if the operator needs to choose a different project after
  recovery.
- Auth bootstrap readiness and route-truth copy keep exact reserved route paths
  visible instead of collapsing them into generic protected-route labels.
- Auth bootstrap also names the protected route mode directly so the operator
  can tell whether Arrangement Forge is holding an editor fallback route or a
  requested project route before the guard opens.

`src/pages/EditorPage.tsx` owns route readiness rendering after the guard
opens:

- `project-selection` keeps `/project` parked with no active project and points
  the operator back to the library.
- `project-id` keeps the current route explicit while a project is loading.
- `project-id` preserves any active query or hash on the current route while
  readiness is still resolving and after the route is ready.
- Route shells and the ready banner name route mode directly so requested
  project routes, the editor fallback route, and the active project route do
  not have to be inferred from surrounding copy.
- Missing, malformed, and load-failure states explain why the route cannot
  open and point back to the library.
- Ready state keeps the active route explicit and reminds the operator that
  `/project` remains the fallback route if they leave the current project.
- Ready state names route readiness directly instead of forcing the operator to
  infer that the current route is already open in this workspace.
- Ready state also keeps the current state and next step on separate explicit
  lines instead of collapsing them into one sentence.

## Proof

Current focused proofs for this slice:

- `pnpm exec vitest run src/lib/editor-route-truth.test.ts src/App.test.tsx src/pages/EditorPage.test.tsx`
- `pnpm run type-check`

## Tracked Landing

- `c2b9ba11ac89eea868e1f75f569dd44b9162aa4f`:
  `commitpath_c40ed88d: promote editor route readiness truth slice`
- `214a6764b93e1dd59918c9627fa8ae3d6d0260d5`:
  `commitpath_c40ed88d Add exact fallback route truth regressions`
- `8b9593e1f868f29b8f05c3764797ef65e9097965`:
  `commitpath_c40ed88d Refresh editor route readiness truth evidence`
- `34fea3b93c03cd9f6cff8007d3f7c2a326772682`:
  `commitpath_c40ed88d Reverify editor route readiness truth docs`
- `577493b594a29bf0424880078a3432c5516e514b`:
  `commitpath_c40ed88d Refresh editor route readiness truth evidence`
- `275075180accbe898a99ac65a1e6b364344e7a01`:
  `Unify editor route readiness truth`
- `8f6113464380dcb39d7a3e5e2631f95fa1a99d0d`:
  `commitpath_c40ed88d Keep login recovery route truth specific`
- `20a911b91876cb49628cdbdfbce6ee8952895777`:
  `commitpath_c40ed88d Refresh editor route readiness truth evidence`
- `dc4eecfa34890ff951f7e0964746f82ddb1cf31e`:
  `commitpath_c40ed88d Refresh editor route readiness truth evidence`
- `64d9dea29305457ba2b2d84f9a0fb8a99b37d78d`:
  `commitpath_c40ed88d Refresh editor route readiness truth evidence`
- `1af43b5d36f8bfe7390ed45f24a20925e631c1e4`:
  `commitpath_c40ed88d Promote editor ready route truth`
- `90ca495f6a66e347e03d192a80ac3e5206f170a9`:
  `commitpath_c40ed88d Refresh editor route readiness truth docs`
- `d1c0adacdcde9a86b39ffb528d5ea31b90fc9d51`:
  `commitpath_c40ed88d Refresh editor route readiness truth evidence`
- `873b0939c6c7963e30d9fe4ac13696f98c42a6c1`:
  `commitpath_c40ed88d Tighten auth route readiness truth`
- `123977acdce6a135ed90bf55c233c9be417ec998`:
  `commitpath_c40ed88d Refresh editor route readiness truth evidence`
- `64f5e914b127376d1d6cbef4c9199f7efc6f958a`:
  `commitpath_c40ed88d Refresh editor route readiness truth evidence`
- `23080b02c37d771987e503b5aa1bd9a70ea06b3a`:
  `commitpath_c40ed88d: clarify editor route next steps`
- `53d36f581b623aab85dddc67ecf14cee43d56e4f`:
  `commitpath_c40ed88d Refresh editor route readiness truth evidence`
- `1b7ce2d35a6a4882f85e9e7c15743cb578aa23d8`:
  `Make editor route mode explicit`
- `f35da82223e34ebd46300da785120a1fdc123bf5`:
  `test: cover requested editor route wiring commitpath_c40ed88d`
- `838158710846ff70c59bdb512eff9544c06b2d86`:
  `commitpath_c40ed88d Refresh editor route readiness truth evidence`
- `a5d62f7b046717e84d1f4514601bbe949c18b347`:
  pre-refresh verification head for the latest 2026-03-31 route-truth evidence check
- The landing made current route, fallback route, and route readiness explicit
  across auth bootstrap, route loading, malformed-route handling, missing or
  unavailable project states, and ready-state recovery.
- The current `main` head at `83815871` still preserves that contract. After
  the last doc-only evidence refresh at `53d36f58`, commit `1b7ce2d3` added
  explicit route-mode copy across the auth bootstrap loading gate, editor route
  shells, and ready banner without changing the fallback route contract.
- Commit `f35da822` tightened the guarded router proof so `/project/:id`
  remains wired into the editor surface as the requested project route instead
  of regressing toward a detached or mislabeled path.
- Commit `27507518` moved route-truth copy into `src/lib/editor-route-truth.ts`
  so `App.tsx` and `EditorPage.tsx` share one explicit route-truth source
  instead of drifting independently.
- Commit `8f611346` kept login recovery copy specific while preserving the same
  protected-route truth helper contract.
- The focused route proofs passed again on 2026-03-31 from pre-refresh head
  `8f611346` before this doc-only evidence refresh updated the local artifact.
- After the 2026-03-31 recheck, this family appears exhausted until a new
  editor-route behavior changes the contract or the proof surface.

The tests cover:

- shared route-truth helper behavior for auth recovery, parked fallback routes,
  and malformed project-id routes
- auth bootstrap reservation for `/project` and `/project/:id`
- guarded routing of `/project` into the editor surface
- loading, missing-project, malformed-route, fallback, and ready-state truth in
  `EditorPage`

## Deep Home

- `src/App.tsx`
- `src/pages/EditorPage.tsx`
- `src/lib/editor-route-truth.ts`
- `src/App.test.tsx`
- `src/pages/EditorPage.test.tsx`
- `src/lib/editor-route-truth.test.ts`
