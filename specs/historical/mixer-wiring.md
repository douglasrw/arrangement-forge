> **ARCHIVED — STALE (2026-03-04)**
> This spec was written before the Salamander drum sample integration and DrumSubMix feature.
> Stale assumptions:
> - Signal chain now includes a Panner node (Sampler -> Gain -> Panner -> Master), not mentioned in spec
> - DrumSubMix sub-component exists in MixerDrawer and must be preserved — spec doesn't account for it
> - DrumKitLike type replaces pure Tone.Sampler in engine maps
> - Line number references throughout are stale
>
> A replacement spec accounting for the current signal chain and DrumSubMix is needed.

---

# Mixer/Audio Store Wiring Specification

**Status:** Ready for implementation
**Date:** 2026-03-03
**Discipline:** Specification Engineering (Primitive 4: Decomposition)
**Estimated effort:** 4-6 hours across 4 subtasks

---

## 1. Problem Statement

The MixerDrawer component (`src/components/mixer/MixerDrawer.tsx`) and the BlockContext volume/pan controls (`src/components/left-panel/BlockContext.tsx`) are completely disconnected from both the project store and the audio engine. All mixer state lives in local `useState` hooks, meaning:

- Moving a fader does nothing to playback audio. The engine's `setVolume()`, `setPan()`, `setMute()`, `setSolo()` methods are never called from any UI.
- Mixer state is lost on component unmount or page refresh. The `Stem` entities in `useProjectStore` (which have `volume`, `pan`, `isMuted`, `isSolo` fields and are persisted to Supabase) are never read or written by the mixer.
- The `applyMuteState()` method in `engine.ts` has a volume-restoration bug: when all stems are un-soloed, it reads `gain.gain.value` to restore volume, but that value was set to 0 by the solo logic, so it falls back to 0.8 instead of the stem's actual stored volume.
- The master volume fader in MixerDrawer does not call `engine.setMasterVolume()`.
- BlockContext has volume and pan sliders (`useState(0)`) that affect nothing.

The result is that the mixer is a non-functional visual mockup. Users see faders but hear no change.

### Starting state

| Component | Current behavior | Expected behavior |
|---|---|---|
| MixerDrawer faders | Local `useState`, no side effects | Read from `projectStore.stems`, write to store + engine |
| MixerDrawer M/S buttons | Local `useState`, no side effects | Read from `projectStore.stems`, write to store + engine |
| MixerDrawer master fader | Local `useState`, no side effects | Write to engine `setMasterVolume()` |
| BlockContext volume/pan | `useState(0)`, no side effects | Read stem from store by selected block's stemId, write to store + engine |
| `engine.applyMuteState()` | Reads `gain.gain.value` (which may be 0 from solo logic) | Reads stored volume from a private Map, never from the live gain node |
| `engine.loadArrangement()` | Sets gain from `stem.volume` but doesn't store it for later reference | Stores each stem's volume in a private Map for mute/solo restoration |

### Key files

| File | Role | Change scope |
|---|---|---|
| `src/audio/engine.ts` | Audio engine with control methods | Fix `applyMuteState`, add volume tracking Map |
| `src/components/mixer/MixerDrawer.tsx` | Full mixer UI | Rewrite from local state to store + engine |
| `src/components/left-panel/BlockContext.tsx` | Block inspector panel | Wire volume/pan sliders to store + engine |
| `src/hooks/useAudio.ts` | React hook wrapping AudioEngine singleton | Add convenience wrappers for mixer controls |
| `src/store/project-store.ts` | Zustand store with `updateStem` action | No changes needed (action already exists and calls `markDirty()`) |
| `src/types/index.ts` | Type barrel | No changes needed (Stem type already has all fields) |

---

## 2. Acceptance Criteria

Each criterion is independently verifiable by an observer without asking questions.

**AC-1: Mixer faders control audio engine volume.**
When a user drags a stem fader in MixerDrawer, the audio output volume for that stem changes in real time during playback. The `engine.setVolume()` method is called with the stem's `InstrumentType` and a value in the 0.0-1.0 range.

**AC-2: Mixer M/S buttons control audio engine mute/solo.**
When a user clicks M (mute) on a stem, that stem goes silent. When a user clicks S (solo), only soloed stems are audible. Multiple solos = only soloed stems play. Un-soloing all stems restores each stem to its pre-solo volume (not 0.8 or any hardcoded default).

**AC-3: Mixer state persists across refresh.**
When the user changes a fader position, closes the mixer, and reopens it, the fader reflects the stored value from `projectStore.stems`. When the page is refreshed and the project is reloaded from Supabase, stem volume/pan/mute/solo state is restored.

**AC-4: Mixer state writes to project store.**
Every mixer interaction (volume, pan, mute, solo) calls `projectStore.updateStem()` with the stem's ID and the changed field(s). This triggers `markDirty()` which enables auto-save.

**AC-5: Master volume fader controls engine master gain.**
Dragging the master fader calls `engine.setMasterVolume()` with a value in 0.0-1.0. The master volume is NOT persisted to the project store (it is a session-level control, not a per-stem property).

**AC-6: BlockContext volume/pan sliders control the parent stem.**
When a block is selected and the user adjusts volume or pan in BlockContext, the change applies to the block's parent stem (looked up via `block.stemId` -> `stems.find(s => s.id === block.stemId)`). The change routes through `projectStore.updateStem()` and `engine.setVolume()`/`engine.setPan()`.

**AC-7: applyMuteState restores correct volumes.**
After un-soloing all stems, each stem's gain is restored to the volume stored in `projectStore.stems[i].volume`, not a hardcoded fallback. The engine maintains a private `stemVolumes` Map that is authoritative for volume restoration.

**AC-8: No new dependencies.**
This work uses only libraries already in package.json. No new npm packages.

---

## 3. Constraint Architecture

### Musts

- **Must** use `useProjectStore.getState().updateStem(stemId, partial)` for all stem mutations. This is the existing action that calls `markDirty()`.
- **Must** use `useAudio()` hook (or the engine singleton it exposes) to call engine control methods. Do not import `AudioEngine` directly in components.
- **Must** use the `Stem` type from `@/types` which already defines `volume: number` (0.0-1.0), `pan: number` (-1.0 to 1.0), `isMuted: boolean`, `isSolo: boolean`.
- **Must** give every new `<input>` and `<textarea>` a unique `id` attribute and a corresponding `<label htmlFor={id}>`.
- **Must** use DaisyUI semantic color classes (`bg-base-100`, `text-primary`) from the `forge` theme where new styling is added. Existing hardcoded hex colors in MixerDrawer may be preserved for this task (a separate theme compliance pass can unify them later).
- **Must** keep the MixerDrawer's existing visual layout and UX (vertical faders, M/S buttons, master channel with level meter). This task changes the data flow, not the visual design.
- **Must** convert between MixerDrawer's 0-100 display scale and the Stem type's 0.0-1.0 storage scale at the component boundary. The engine and store use 0.0-1.0. The UI displays 0-100.

### Must-nots

- **Must not** store Tone.js objects or DOM refs in Zustand stores. The engine singleton lives at module scope in `useAudio.ts`.
- **Must not** add new files not listed in this spec. All changes are to existing files.
- **Must not** modify the `Stem` interface in `src/types/project.ts`. It already has all needed fields.
- **Must not** add dependencies not in `package.json`.
- **Must not** change `engine.loadArrangement()` scheduling logic (the MIDI note scheduling loop). Only the mute/solo/volume control path changes.
- **Must not** remove the `VerticalFader` or `LevelMeter` sub-components from MixerDrawer. They are reused as-is.
- **Must not** add undo entries for mixer changes. Volume/pan/mute/solo are considered non-destructive (they don't alter the arrangement structure). `markDirty()` is sufficient.
- **Must not** create pan controls in MixerDrawer that don't exist today. The current mixer has volume faders + M/S buttons only. Pan is only in BlockContext. (Adding pan knobs to the mixer is a separate future task.)

### Preferences

- Prefer reading stem data via Zustand selector (`useProjectStore(s => s.stems)`) over `getState()` in render paths, so React re-renders on changes.
- Prefer debouncing rapid fader movements before writing to the store (e.g., 50ms debounce on `updateStem` calls during drag). This prevents flooding the store with dozens of updates per second. The engine call (`setVolume`) should be immediate (no debounce) for responsive audio.
- Prefer a `stemsByInstrument` lookup pattern (Map or object keyed by InstrumentType) over repeated `stems.find()` calls in render.

### Escalation triggers

- If `useAudio()` hook cannot be called from MixerDrawer (e.g., due to React context constraints), escalate before implementing a workaround.
- If the engine singleton is not initialized when a mixer control is changed (user hasn't clicked play yet), the engine call should be a no-op. Do not attempt to auto-initialize the engine from the mixer.
- If `updateStem` does not exist or has a different signature than `(stemId: string, partial: Partial<Stem>) => void`, stop and verify against the current store.

---

## 4. Decomposition

Four subtasks, each independently executable and testable. Execute in order (each builds on the previous).

---

### Subtask 1: Fix `applyMuteState` and add volume tracking in engine.ts

**Estimated time:** 30 minutes
**File:** `src/audio/engine.ts`

**Problem:** `applyMuteState()` reads `gain.gain.value` to determine what volume to restore when un-soloing. But the solo logic itself sets `gain.gain.value = 0` for non-soloed stems, so the "restore" reads 0 and falls back to 0.8. This is a data corruption bug.

**Changes:**

1. Add a private Map to track authoritative stem volumes:
   ```typescript
   private stemVolumes = new Map<InstrumentType, number>();
   ```

2. In `loadArrangement()`, after creating the gain node for each stem, store the volume:
   ```typescript
   // After: const gain = new Tone.Gain(stem.volume);
   this.stemVolumes.set(stem.instrument, stem.volume);
   ```

3. Also clear `stemVolumes` when clearing old signal chains at the top of `loadArrangement()`:
   ```typescript
   this.stemVolumes.clear();
   ```

4. In `setVolume()`, update the stored volume AND the gain node:
   ```typescript
   setVolume(instrument: InstrumentType, volume: number): void {
     this.stemVolumes.set(instrument, volume);
     const gain = this.channelGains.get(instrument);
     if (!gain) return;
     // Only set gain if not currently muted/soloed-off
     const anysoloed = Array.from(this.stemSoloed.values()).some(Boolean);
     const muted = this.stemMuted.get(instrument) ?? false;
     const soloed = this.stemSoloed.get(instrument) ?? false;
     if (anysoloed && !soloed) return; // stem is silenced by solo, don't touch gain
     if (muted) return; // stem is muted, don't touch gain
     gain.gain.value = volume;
   }
   ```

5. Rewrite `applyMuteState()` to use the stored volume map:
   ```typescript
   private applyMuteState(): void {
     const anySoloed = Array.from(this.stemSoloed.values()).some(Boolean);
     this.channelGains.forEach((gain, instrument) => {
       const muted = this.stemMuted.get(instrument) ?? false;
       const soloed = this.stemSoloed.get(instrument) ?? false;
       const storedVolume = this.stemVolumes.get(instrument) ?? 0.8;

       if (anySoloed) {
         // Solo mode: only soloed (and not muted) stems play
         gain.gain.value = (soloed && !muted) ? storedVolume : 0;
       } else {
         // Normal mode: muted stems silent, others at stored volume
         gain.gain.value = muted ? 0 : storedVolume;
       }
     });
   }
   ```

**Verification:** See Evaluation section, Test Cases 1-3.

---

### Subtask 2: Add mixer convenience methods to useAudio hook

**Estimated time:** 20 minutes
**File:** `src/hooks/useAudio.ts`

**Problem:** Components need stable, memoized callbacks for engine control methods. Calling `engine.setVolume()` directly from a component works but couples the component to the engine API and makes the calls harder to guard (e.g., checking `engine.isInitialized`).

**Changes:**

Add the following memoized callbacks to the `useAudio()` return object:

```typescript
const setStemVolume = useCallback(
  (instrument: InstrumentType, volume: number) => {
    if (engine.isInitialized) engine.setVolume(instrument, volume);
  },
  [engine]
);

const setStemPan = useCallback(
  (instrument: InstrumentType, pan: number) => {
    if (engine.isInitialized) engine.setPan(instrument, pan);
  },
  [engine]
);

const setStemMute = useCallback(
  (instrument: InstrumentType, muted: boolean) => {
    if (engine.isInitialized) engine.setMute(instrument, muted);
  },
  [engine]
);

const setStemSolo = useCallback(
  (instrument: InstrumentType, soloed: boolean) => {
    if (engine.isInitialized) engine.setSolo(instrument, soloed);
  },
  [engine]
);

const setMasterVolume = useCallback(
  (volume: number) => {
    if (engine.isInitialized) engine.setMasterVolume(volume);
  },
  [engine]
);
```

Add the `InstrumentType` import:
```typescript
import type { TransportState, InstrumentType } from '@/types';
```

Update the return object to include these five new callbacks:
```typescript
return {
  engine,
  transportState,
  isReady,
  play,
  pause,
  stop,
  seek,
  initEngine,
  loadArrangement: ...,
  setStemVolume,
  setStemPan,
  setStemMute,
  setStemSolo,
  setMasterVolume,
};
```

**Verification:** Compile check (`npm run build`). No runtime test needed -- these are thin wrappers.

---

### Subtask 3: Rewrite MixerDrawer from local state to store + engine

**Estimated time:** 1.5-2 hours
**File:** `src/components/mixer/MixerDrawer.tsx`

**Problem:** MixerDrawer uses `useState` for all channel state. It never reads from `projectStore.stems` and never calls engine methods.

**Changes:**

1. **Add imports:**
   ```typescript
   import { useProjectStore } from "@/store/project-store"
   import { useAudio } from "@/hooks/useAudio"
   import type { InstrumentType, Stem } from "@/types"
   ```

2. **Remove local state.** Delete the `ChannelState` interface, `DEFAULT_CHANNELS` constant, and the `channels`/`setChannels`/`updateChannel` state management. The `INSTRUMENTS` array is kept for display metadata (colors, labels, defaultDb).

3. **Read stems from store.** Inside `MixerDrawer()`:
   ```typescript
   const stems = useProjectStore((s) => s.stems)
   const updateStem = useProjectStore((s) => s.updateStem)
   const { setStemVolume, setStemPan, setStemMute, setStemSolo, setMasterVolume } = useAudio()
   ```

4. **Build a stem lookup by instrument.** The INSTRUMENTS array defines display order; the store's stems provide live data:
   ```typescript
   const stemByInstrument = new Map<string, Stem>()
   for (const stem of stems) {
     stemByInstrument.set(stem.instrument, stem)
   }
   ```

5. **Master volume is session-only.** Keep `useState` for master volume only (it has no store field):
   ```typescript
   const [masterVolume, setMasterVolumeLocal] = useState(80) // 0-100 display scale
   ```

6. **Wire instrument channels.** For each instrument in the INSTRUMENTS map:
   - Read `volume`, `isMuted`, `isSolo` from `stemByInstrument.get(inst.key)`
   - Convert volume: display = `Math.round(stem.volume * 100)`, storage = `displayValue / 100`
   - On fader change: call `updateStem(stem.id, { volume: v / 100 })` AND `setStemVolume(inst.key as InstrumentType, v / 100)`
   - On mute toggle: call `updateStem(stem.id, { isMuted: !stem.isMuted })` AND `setStemMute(inst.key as InstrumentType, !stem.isMuted)`
   - On solo toggle: call `updateStem(stem.id, { isSolo: !stem.isSolo })` AND `setStemSolo(inst.key as InstrumentType, !stem.isSolo)`

7. **Wire master volume.** On master fader change: call `setMasterVolumeLocal(v)` AND `setMasterVolume(v / 100)`.

8. **Handle missing stems gracefully.** If `stemByInstrument.get(inst.key)` returns undefined (arrangement not generated yet), render the channel strip in a disabled/dimmed state with default values. The faders should be non-interactive when no stems exist.

9. **Debounce store writes on fader drag.** Volume fader changes during a drag can fire 30+ times per second. Strategy:
   - Call `setStemVolume()` (engine) immediately on every change for responsive audio.
   - Debounce `updateStem()` (store) with a 50ms trailing debounce using a ref-based timer:
     ```typescript
     const debounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

     const debouncedUpdateStem = useCallback(
       (stemId: string, partial: Partial<Stem>) => {
         const existing = debounceRef.current.get(stemId)
         if (existing) clearTimeout(existing)
         debounceRef.current.set(
           stemId,
           setTimeout(() => {
             updateStem(stemId, partial)
             debounceRef.current.delete(stemId)
           }, 50)
         )
       },
       [updateStem]
     )
     ```
   - Mute/solo toggles are discrete (not continuous) so they call `updateStem` directly with no debounce.

10. **Preserve the open/close toggle.** Keep the `useState(false)` for `open` -- this is component-local UI state, not mixer channel state.

**Verification:** See Evaluation section, Test Cases 4-7.

---

### Subtask 4: Wire BlockContext volume/pan to stem store + engine

**Estimated time:** 45 minutes
**File:** `src/components/left-panel/BlockContext.tsx`

**Problem:** BlockContext has volume and pan sliders using `useState(0)` that do nothing.

**Changes:**

1. **Add imports:**
   ```typescript
   import { useAudio } from "@/hooks/useAudio"
   import type { InstrumentType } from "@/types"
   ```

2. **Look up the stem for the selected block.** The component already reads `liveBlock` from the store. Use it to find the parent stem:
   ```typescript
   const stems = useProjectStore((s) => s.stems)
   const updateStem = useProjectStore((s) => s.updateStem)
   const { setStemVolume, setStemPan } = useAudio()

   const parentStem = stems.find((s) => s.id === liveBlock?.stemId)
   ```

3. **Replace volume useState with store-derived value.** Remove `const [volume, setVolume] = useState(0)`. Instead:
   - Read: The volume slider value comes from `parentStem`. The slider uses dB scale (-24 to +6). The stem stores linear 0.0-1.0. Convert: `dB = 20 * Math.log10(linearVolume)` (clamped). For display, round to integer.
   - Write: On slider change, convert dB back to linear: `linear = Math.pow(10, dB / 20)` (clamped 0.0-1.0). Call `updateStem(parentStem.id, { volume: linear })` and `setStemVolume(parentStem.instrument, linear)`.
   - Reset: "Reset" button sets volume to the instrument's default (0.8 linear = approx -2 dB).

   Conversion helpers (define at module scope):
   ```typescript
   function linearToDb(v: number): number {
     if (v <= 0) return -Infinity
     return 20 * Math.log10(v)
   }

   function dbToLinear(db: number): number {
     return Math.min(1.0, Math.max(0, Math.pow(10, db / 20)))
   }
   ```

4. **Replace pan useState with store-derived value.** Remove `const [pan, setPan] = useState(0)`. Instead:
   - Read: The pan slider uses -100 to 100. The stem stores -1.0 to 1.0. Convert: `displayPan = Math.round(stem.pan * 100)`.
   - Write: On slider change, convert: `storedPan = displayValue / 100`. Call `updateStem(parentStem.id, { pan: storedPan })` and `setStemPan(parentStem.instrument, storedPan)`.
   - Reset: sets pan to 0.

5. **Handle no stem case.** If `parentStem` is undefined (no block selected or stems not loaded), render sliders in a disabled state at default values. Set `onChange` to no-op.

6. **Apply the same debounce pattern** as Subtask 3 for continuous slider drags: engine call immediate, store write debounced at 50ms.

**Verification:** See Evaluation section, Test Cases 8-9.

---

## 5. Evaluation Design

### Unit tests

Create/update these test files:

#### `src/audio/engine.test.ts` (new file -- tests for the applyMuteState fix)

These tests can run without Tone.js by mocking `Tone.Gain`. However, given the complexity of mocking Tone.js, it is acceptable to test this via the integration tests below instead. If unit tests are written, they should cover:

**Test Case 1: Volume restoration after un-solo**
```
Setup: Engine has stems [drums(vol=0.6), bass(vol=0.7), piano(vol=0.5)]
Action: Solo drums -> Un-solo drums
Expected: drums.gain = 0.6, bass.gain = 0.7, piano.gain = 0.5
```

**Test Case 2: Mute during solo**
```
Setup: Stems [drums(vol=0.6, solo), bass(vol=0.7), piano(vol=0.5)]
Action: Mute drums (while soloed)
Expected: drums.gain = 0 (muted overrides solo), bass.gain = 0, piano.gain = 0
```

**Test Case 3: setVolume while soloed-off**
```
Setup: Stems [drums(vol=0.6, solo), bass(vol=0.7)]
Action: setVolume(bass, 0.9)
Expected: bass.gain stays 0 (silenced by solo), but stemVolumes map stores 0.9
Action: Un-solo drums
Expected: bass.gain = 0.9 (restored from stemVolumes, not old gain value)
```

#### Store integration tests (verify via manual testing)

**Test Case 4: Fader changes write to store**
```
Setup: Open app, generate arrangement, open mixer
Action: Drag piano fader to ~50%
Verify: useProjectStore.getState().stems.find(s => s.instrument === 'piano').volume is approximately 0.5
```

**Test Case 5: Mute/solo writes to store**
```
Setup: Open mixer
Action: Click M on bass
Verify: useProjectStore.getState().stems.find(s => s.instrument === 'bass').isMuted === true
Action: Click M on bass again
Verify: isMuted === false
```

**Test Case 6: Mixer reads from store on reopen**
```
Setup: Open mixer, set piano to 40%, close mixer
Action: Reopen mixer
Verify: Piano fader is at 40% (not reset to default)
```

**Test Case 7: Mixer reads from store after page reload**
```
Setup: Set piano to 40%, wait for auto-save (or manually save)
Action: Reload page, open project, open mixer
Verify: Piano fader is at 40% (loaded from Supabase via projectStore)
```

**Test Case 8: BlockContext volume controls parent stem**
```
Setup: Generate arrangement, select a piano block
Action: In BlockContext, drag volume slider up
Verify: Piano stem volume changes in both the mixer (if open) AND audio output
```

**Test Case 9: BlockContext pan controls parent stem**
```
Setup: Select a guitar block
Action: In BlockContext, drag pan slider to L50
Verify: useProjectStore.getState().stems.find(s => s.instrument === 'guitar').pan is approximately -0.5
```

### Build verification

After all subtasks are complete:
```bash
npm run build    # Must succeed with zero errors
npm run lint     # Must pass (no new warnings)
npm test         # Existing tests must still pass
```

---

## 6. Intent Trace

### Structural trace

| Intent claim | Code location that makes it true |
|---|---|
| "Fader controls audio volume" | MixerDrawer `onChange` -> `setStemVolume()` -> `engine.setVolume()` -> `gain.gain.value = volume` |
| "State persists to DB" | MixerDrawer `onChange` -> `updateStem()` -> `markDirty()` -> auto-save interval -> `saveProject()` -> Supabase upsert |
| "State restored on load" | `loadProject()` -> Supabase select stems -> `setArrangement({stems})` -> MixerDrawer reads `useProjectStore(s => s.stems)` |
| "Solo restoration uses correct volume" | `engine.stemVolumes` Map set in `setVolume()` and `loadArrangement()` -> `applyMuteState()` reads from Map |
| "BlockContext controls parent stem" | BlockContext reads `parentStem = stems.find(s => s.id === liveBlock.stemId)` -> onChange -> `updateStem(parentStem.id, ...)` |

### Behavioral end-to-end scenario

**Scenario: "I can mix my backing track and it sounds right tomorrow."**

1. User generates an arrangement (5 stems created in store + DB).
2. User opens mixer, drags drums fader to 60%, solos bass, listens. Only bass plays.
3. User un-solos bass. All stems return to their stored volumes (drums at 60%, others at defaults).
4. User clicks a piano block in the arrangement. BlockContext shows piano volume matching the mixer's piano fader.
5. User adjusts piano volume in BlockContext. Mixer fader (if visible) updates to match.
6. User closes browser. Next day, opens same project. Mixer shows drums at 60%, piano at the adjusted level. Hitting play produces the same mix.

---

## 7. Implementation Notes

### Volume scale conventions

| Context | Scale | Example |
|---|---|---|
| `Stem.volume` (store/DB) | 0.0 - 1.0 linear | 0.8 = default |
| `engine.setVolume()` | 0.0 - 1.0 linear | Same as store |
| MixerDrawer fader display | 0 - 100 integer | 80 = default |
| MixerDrawer dB readout | Logarithmic dB string | "-2 dB" |
| BlockContext volume slider | -24 to +6 dB | 0 dB = 1.0 linear |
| BlockContext pan slider | -100 to 100 display | 0 = center |
| `Stem.pan` (store/DB) | -1.0 to 1.0 | 0.0 = center |

### Conversion formulas

```
MixerDrawer: display(0-100) = Math.round(stem.volume * 100)
MixerDrawer: store = display / 100
BlockContext: dB = 20 * Math.log10(stem.volume)  [clamp to -24..+6]
BlockContext: linear = Math.pow(10, dB / 20)       [clamp to 0..1]
BlockContext: panDisplay = Math.round(stem.pan * 100)
BlockContext: panStore = panDisplay / 100
```

### Existing code that must NOT change

- `VerticalFader` component internals (props interface is fine as-is)
- `LevelMeter` component
- `volumeToDb()` display helper in MixerDrawer
- `engine.loadArrangement()` MIDI scheduling loop (lines 173-199 in current engine.ts)
- `engine.play()`, `engine.pause()`, `engine.stop()`, `engine.seek()`
- The `useAudio()` auto-load effect (lines 41-61)
- `projectStore.updateStem()` implementation
- `InstrumentSlider` and `ToggleSwitch` sub-components in BlockContext

### Order of operations for each mixer interaction

```
User drags fader
  -> Immediate: engine.setVolume(instrument, newValue)     [audio responds instantly]
  -> Debounced (50ms): projectStore.updateStem(stemId, { volume: newValue })
     -> markDirty()                                          [flags for auto-save]
     -> React re-render via Zustand subscription              [fader stays at new pos]
```

```
User clicks M (mute)
  -> Immediate: projectStore.updateStem(stemId, { isMuted: !current })
  -> Immediate: engine.setMute(instrument, newMutedState)
     -> engine.applyMuteState()                               [gain adjusted]
```
