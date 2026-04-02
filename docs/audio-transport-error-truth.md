# Audio Transport Error Truth

Status date: 2026-04-02

Status: landed on `main`; reverified on 2026-04-02 against current product
head `52795765` with no remaining bounded product delta visible in this family

Purpose: preserve the current audio transport failure and recovery contract in
one repo-local place so future work does not have to reconstruct it from
`src/audio/transport.ts`, `src/components/transport/TransportBar.tsx`, and
scattered tests.

## Transport Error Contract

- Transport readiness keeps `ready`, `waiting`, `blocked`, and `error` as
  distinct named states instead of collapsing playback failures into neutral
  loading or unavailable copy.
- Missing timeline truth stays separate from audio-engine failure truth, so the
  operator can tell whether playback is blocked by arrangement state or by an
  actual audio load failure.
- Persisted-only arrangement state keeps the reload action explicit instead of
  presenting the transport as generically unavailable.
- Audio load failures keep retry intent explicit through the transport action
  instead of forcing the operator to infer whether pressing play will retry.

## Operator-Facing Truth

`src/audio/transport.ts` owns transport readiness classification:

- `getTransportReadinessTruth` maps ready playback to a `ready` badge instead
  of reusing generic summary copy.
- Timeline absence maps to `blocked` with `No timeline` or `Reload arrangement`
  detail so missing-arrangement and persisted-only states stay distinct.
- `retry-play` maps to `error` so audio load failures keep a first-class
  failure state on the transport surface.
- Audio states that still need setup, such as `load-and-play`, remain `waiting`
  instead of being mistaken for a hard failure.

`src/components/transport/TransportBar.tsx` owns transport-surface rendering:

- The transport badge now shows `Error` when audio fails to load, while
  keeping the failure detail and next step visible in the guidance surface.
- The play button switches to `Retry audio` on transport failures so the next
  honest move is visible directly from the control surface.
- The live status announcement combines readiness state, failure summary, and
  next-step guidance into one message so screen-reader output matches the
  visible transport truth.
- Loop, metronome, scrubber, and skip controls stay disabled during transport
  failure so the surface does not imply playback is already usable.

## Proof

Current focused proofs for this slice:

- `pnpm exec vitest run src/audio/transport.test.ts src/components/transport/TransportBar.test.tsx`
- `pnpm run type-check`
- verification head: `527957658e68ccb9bef20d12eeed2bb529a2a3c4`

## Tracked Landing

- `e17cfe941f561f6bd4bbabf8f7a28dc27a3f07f8`:
  `Promote audio transport readiness truth states`
- `3f66f6d2a3157ec9c986ff0c75d55fe9277276f7`:
  `Promote transport readiness truth`
- `0d847ae54e8d1dc5f2e7f55bd0c53b4a6f06c59a`:
  `Announce transport readiness as one live status`
- `527957658e68ccb9bef20d12eeed2bb529a2a3c4`:
  `Promote to main: Arrangement Forge audio transport error truth slice`
- The current `main` head at `52795765` still preserves the transport error
  contract and its focused proofs, so this bounded landing refreshes local
  evidence instead of claiming a new product change.
- The transport surface now keeps timeline-missing, waiting-for-load,
  persisted-only reload, and audio-load-failed states distinct on the visible
  controls.
- The focused transport proofs passed again on 2026-04-02 against product head
  `52795765`, so this local artifact matches the live product surface instead
  of a stale earlier verification point.
- After the 2026-04-02 recheck, this family appears exhausted until a new
  transport or playback behavior changes the contract or proof surface.

The tests cover:

- transport readiness helper classification for ready, waiting, blocked,
  persisted-only reload, and error states
- transport-bar guidance for waiting and error states
- retry-action labeling and disabled control truth during audio failure
- live status announcement of transport error summary plus next-step guidance

## Deep Home

- `src/audio/transport.ts`
- `src/components/transport/TransportBar.tsx`
- `src/audio/transport.test.ts`
- `src/components/transport/TransportBar.test.tsx`
