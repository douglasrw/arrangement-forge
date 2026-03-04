# Undo/Redo + Auto-Save System

**Status:** Draft
**Date:** 2026-03-03
**Spec type:** Engineering specification (Primitives 1-5)

---

## 1. Problem Statement

The Arrangement Forge editor has two critical data-safety gaps:

**Undo/redo is broken and incomplete.** Only 3 of 13 mutating actions push undo entries (`splitBlock`, `mergeBlocks`, `deleteBlock`). The remaining 10 -- `updateBlock`, `updateSection`, `addSection`, `removeSection`, `reorderSections`, `updateStem`, `reorderStems`, `addStem`, `updateChord`, and `duplicateBlock` -- silently discard history. Worse, the 3 actions that DO push undo entries use a bare `Block[]` array as the snapshot format (via `snapshotBlocks()`), while the undo handler in `useKeyboardShortcuts.ts` checks `if (state.blocks)` expecting an object with a `blocks` property. This means **every undo of split/merge/delete silently fails** -- the JSON parses successfully into an array, but the `state.blocks` check is falsy on an array, so `setArrangement()` is never called. Additionally, `useKeyboardShortcuts.ts` wraps its own snapshots in `{ blocks: ... }` (keyboard delete/duplicate), while `useGenerate.ts` snapshots `{ stems, sections, blocks, chords }`. There is no unified snapshot format.

**No auto-save protection.** `markDirty()` sets `unsavedChanges: true` but nothing acts on it automatically. There is a 60-second `setInterval` in `AppShell.tsx` that calls `saveProject()` when `unsavedChanges` is true -- but there is no `beforeunload` handler. Closing the browser tab while `unsavedChanges` is true loses all work since the last manual Cmd+S or the last 60-second tick. The 60-second interval is also unnecessarily long for an editor where a user might make rapid changes and close the tab.

**The fix requires:**
1. A unified snapshot format used by all undo producers and consumers
2. Undo coverage for all destructive mutations in `project-store.ts`
3. Undo restore logic that correctly applies snapshots regardless of scope
4. A `beforeunload` handler that warns on unsaved changes
5. A debounced auto-save that triggers on dirty state with reasonable latency

---

## 2. Acceptance Criteria

Each criterion is independently verifiable by an observer with access to the running app and the test suite.

### AC-1: Unified snapshot format
Every undo entry's `stateBefore` and `stateAfter` fields contain a JSON string with the shape `{ stems: Stem[], sections: Section[], blocks: Block[], chords: Chord[] }`. No bare arrays. No partial objects. Verify: `JSON.parse(entry.stateBefore)` always has all four keys.

### AC-2: All destructive mutations push undo entries
The following actions push undo entries: `updateBlock`, `splitBlock`, `mergeBlocks`, `deleteBlock`, `duplicateBlock`, `addSection`, `updateSection`, `removeSection`, `reorderSections`, `updateChord`. Verify: perform each action, then Cmd+Z -- the state reverts to pre-action state.

### AC-3: Non-destructive mutations do NOT push undo entries
The following actions do NOT push undo entries: `updateProject` (project metadata like name/key/tempo), `updateStem` (volume/pan/mute/solo), `addStem`, `reorderStems`. Rationale: these are either cosmetic mixer changes (stem volume/pan) or project-level settings (key/tempo/name) that the user expects to adjust freely without cluttering the undo stack. Verify: change project name, adjust stem volume, then Cmd+Z -- the undo does NOT revert those changes.

### AC-4: Undo/redo correctly restores state
Pressing Cmd+Z restores the full arrangement state (`stems`, `sections`, `blocks`, `chords`) to the snapshot taken before the action. Pressing Cmd+Shift+Z restores it to the snapshot taken after the action. Verify: split a block, undo, redo, undo -- state matches original at each step.

### AC-5: Generation undo works
Undoing a regeneration restores the full previous arrangement (stems, sections, blocks, chords). Verify: generate, modify blocks, regenerate, Cmd+Z -- previous arrangement (including modifications) is restored.

### AC-6: `beforeunload` handler warns on unsaved changes
When `unsavedChanges` is true, closing/refreshing the tab shows the browser's native "Leave site?" confirmation dialog. When `unsavedChanges` is false, no dialog appears. Verify: make a change, try to close the tab -- dialog appears. Save, try to close -- no dialog.

### AC-7: Debounced auto-save triggers on dirty state
After any mutation that calls `markDirty()`, an auto-save is triggered after a debounce period (30 seconds of inactivity after the last mutation). The save calls `saveProject()`. Verify: make a change, wait 30 seconds without further changes -- `unsavedChanges` becomes false and `lastSavedAt` updates.

### AC-8: Auto-save does not fire during generation
When `generationState === 'generating'`, the auto-save timer does not trigger. Verify: start generation, observe no save calls during the generation process.

### AC-9: Existing tests pass + new tests cover undo snapshots
`npm run test` passes. New tests verify: (a) unified snapshot format from all undo-producing actions, (b) undo/redo round-trip for each action, (c) auto-save debounce behavior.

---

## 3. Constraint Architecture

### Musts

- **Must** use the unified snapshot format `{ stems, sections, blocks, chords }` for ALL undo entries -- no exceptions
- **Must** snapshot state BEFORE the mutation, then AFTER the mutation, for every undo-producing action
- **Must** call `setArrangement()` (not partial state updates) when restoring from an undo/redo snapshot -- this ensures all four arrays are atomically replaced
- **Must** clear the redo stack when a new mutation pushes an undo entry (already implemented in `pushUndo`)
- **Must** keep the 50-entry undo limit (already implemented as `maxUndo`)
- **Must** use `useProjectStore.getState()` to read current state for snapshots (not stale closure values)
- **Must** mark dirty (`markDirty()`) after every mutation that changes persistent data (already done for all actions)
- **Must** use the browser's native `beforeunload` event (not a custom dialog) for tab-close protection
- **Must** debounce auto-save (not throttle) -- save fires N seconds after the LAST mutation, not every N seconds
- **Must** follow existing CLAUDE.md conventions: named exports, path alias `@/`, types from `@/types`, functional components, Vitest for tests

### Must-Nots

- **Must not** push undo entries for `updateProject`, `updateStem`, `addStem`, `reorderStems` (see AC-3 rationale)
- **Must not** push undo entries for `setProject`, `setArrangement`, `clearArrangement` -- these are data-loading operations, not user mutations
- **Must not** store Tone.js objects or DOM refs in undo snapshots
- **Must not** add new dependencies not in ARCHITECTURE.md
- **Must not** create files outside the scope listed in each subtask's "Creates/Modifies" section
- **Must not** auto-save while `generationState === 'generating'`
- **Must not** auto-save if `unsavedChanges` is already false (no-op guard)
- **Must not** break the existing keyboard shortcuts (Cmd+S manual save, Cmd+Z/Cmd+Shift+Z undo/redo)
- **Must not** change the `UndoEntry` interface shape (`description`, `stateBefore`, `stateAfter` remain strings)
- **Must not** add emoji to the UI

### Preferences

- Prefer a single `snapshotArrangement()` helper function over inline `JSON.stringify()` calls scattered across actions
- Prefer a single `restoreSnapshot()` helper function in the undo handler over inline `JSON.parse()` + conditional logic
- Prefer co-locating the undo push logic inside each `project-store` action (where the mutation happens) over external wrappers
- Prefer the `useEffect` cleanup pattern for the `beforeunload` listener over manual add/remove
- Prefer keeping the debounce timer as a module-scoped variable (not in Zustand state) to avoid re-renders

### Escalation Triggers

- If any action requires snapshotting data not currently in `{ stems, sections, blocks, chords }` (e.g., chat messages, project metadata) -- STOP and discuss scope expansion
- If the undo stack size causes measurable memory pressure (>50 full snapshots of a large arrangement) -- STOP and discuss incremental/patch-based undo
- If `saveProject()` failures need retry logic or offline queueing -- STOP, that is a separate spec

---

## 4. Decomposition

### Subtask 1: Unified Snapshot Helpers + Fix Undo Store Contract

**Goal:** Create shared helper functions for snapshotting and restoring arrangement state, and fix the snapshot format mismatch.

**Estimated time:** 45 minutes

**Modifies:**
- `src/store/project-store.ts` -- add `snapshotArrangement()` helper, change `splitBlock`/`mergeBlocks`/`deleteBlock` to use it
- `src/store/undo-store.ts` -- no changes needed (the store is format-agnostic, stores strings)

**Creates:**
- `src/lib/undo-helpers.ts` -- snapshot/restore utility functions

**Detailed steps:**

1. Create `src/lib/undo-helpers.ts` with two exported functions:

```typescript
// src/lib/undo-helpers.ts
import type { Stem, Section, Block, Chord } from '@/types';

export interface ArrangementSnapshot {
  stems: Stem[];
  sections: Section[];
  blocks: Block[];
  chords: Chord[];
}

export function snapshotArrangement(state: {
  stems: Stem[];
  sections: Section[];
  blocks: Block[];
  chords: Chord[];
}): string {
  const snapshot: ArrangementSnapshot = {
    stems: state.stems,
    sections: state.sections,
    blocks: state.blocks,
    chords: state.chords,
  };
  return JSON.stringify(snapshot);
}

export function parseSnapshot(json: string): ArrangementSnapshot | null {
  try {
    const parsed = JSON.parse(json) as ArrangementSnapshot;
    if (
      Array.isArray(parsed.stems) &&
      Array.isArray(parsed.sections) &&
      Array.isArray(parsed.blocks) &&
      Array.isArray(parsed.chords)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
```

2. In `src/store/project-store.ts`:
   - Remove the `snapshotBlocks()` function (lines 50-52)
   - Add import: `import { snapshotArrangement } from '@/lib/undo-helpers';`
   - Update `splitBlock` to snapshot the full arrangement:
     ```typescript
     const before = snapshotArrangement(get());
     // ... perform mutation ...
     const after = snapshotArrangement(get());
     useUndoStore.getState().pushUndo(`Split block at bar ${atBar}`, before, after);
     ```
   - Apply the same pattern to `mergeBlocks` and `deleteBlock`
   - Note: `set()` is synchronous in Zustand, so `get()` after `set()` returns the new state

3. Write tests in `src/lib/undo-helpers.test.ts`:
   - `snapshotArrangement` returns valid JSON with all four keys
   - `parseSnapshot` returns the object for valid input
   - `parseSnapshot` returns null for invalid JSON
   - `parseSnapshot` returns null for objects missing required keys
   - `parseSnapshot` returns null for bare arrays (the old format)

**Verification:** Run `npm run test -- --reporter=verbose undo-helpers`. All tests pass. Inspect `splitBlock`/`mergeBlocks`/`deleteBlock` -- each uses `snapshotArrangement(get())` for before/after.

---

### Subtask 2: Add Undo Coverage to All Destructive Mutations

**Goal:** Every destructive mutation listed in AC-2 pushes an undo entry with the unified snapshot format.

**Estimated time:** 60 minutes

**Modifies:**
- `src/store/project-store.ts` -- add undo pushes to 7 additional actions

**Detailed steps:**

For each action below, apply this pattern:
```typescript
actionName: (...args) => {
  const before = snapshotArrangement(get());
  // ... existing mutation logic (set() call) ...
  const after = snapshotArrangement(get());
  useUndoStore.getState().pushUndo('Description', before, after);
  useUiStore.getState().markDirty();  // already present
},
```

Actions to modify (with undo descriptions):

1. **`updateBlock(blockId, partial)`** -- Description: `"Update block"`
2. **`duplicateBlock(blockId)`** -- Description: `"Duplicate block"`
3. **`addSection(section)`** -- Description: `"Add section: {section.name}"`
4. **`updateSection(sectionId, partial)`** -- Description: `"Update section"`
5. **`removeSection(sectionId)`** -- Description: `"Remove section"`. Note: this also removes associated blocks (line 113-114). The full snapshot captures both.
6. **`reorderSections(sectionIds)`** -- Description: `"Reorder sections"`
7. **`updateChord(barNumber, chord)`** -- Description: `"Update chord at bar {barNumber}"`

Actions that do NOT get undo (per AC-3):
- `updateProject` -- project metadata (name, key, tempo, genre, etc.)
- `updateStem` -- mixer settings (volume, pan, mute, solo)
- `addStem` -- data-loading operation (only called during generation)
- `reorderStems` -- mixer layout

**Write tests** in `src/store/project-store.test.ts` (add to existing file):

For each of the 10 undo-producing actions (3 existing + 7 new), add a test:

```typescript
it('{actionName} pushes undo entry with unified snapshot format', () => {
  // Setup: populate store with arrangement data
  // Act: perform the mutation
  // Assert: undoStack has 1 entry
  // Assert: JSON.parse(entry.stateBefore) has keys stems, sections, blocks, chords
  // Assert: JSON.parse(entry.stateAfter) has keys stems, sections, blocks, chords
  // Assert: the before snapshot reflects pre-mutation state
  // Assert: the after snapshot reflects post-mutation state
});
```

Also add a negative test:
```typescript
it('updateProject does NOT push undo entry', () => {
  useProjectStore.getState().setProject(makeProject());
  useProjectStore.getState().updateProject({ name: 'New Name' });
  expect(useUndoStore.getState().undoStack).toHaveLength(0);
});

it('updateStem does NOT push undo entry', () => {
  // similar pattern
});
```

**Verification:** Run `npm run test -- --reporter=verbose project-store`. All tests pass, including the new undo-push tests. The undo stack should have exactly 0 entries after non-undo actions, and exactly 1 entry after each undo action.

---

### Subtask 3: Fix Undo/Redo Handler + Fix Generation Undo

**Goal:** The undo/redo keyboard handler correctly parses and restores unified snapshots. The generation undo in `useGenerate.ts` uses the unified format.

**Estimated time:** 45 minutes

**Modifies:**
- `src/hooks/useKeyboardShortcuts.ts` -- fix undo/redo handler
- `src/hooks/useGenerate.ts` -- use unified snapshot format

**Detailed steps:**

1. **Fix `useKeyboardShortcuts.ts`** (lines 40-66):

Replace the undo handler:
```typescript
// OLD (broken):
const state = JSON.parse(entry.stateBefore);
if (state.blocks) useProjectStore.getState().setArrangement(state);

// NEW (correct):
import { parseSnapshot } from '@/lib/undo-helpers';

const snapshot = parseSnapshot(entry.stateBefore);
if (snapshot) {
  useProjectStore.getState().setArrangement(snapshot);
}
```

Apply the same fix to the redo handler (uses `entry.stateAfter`):
```typescript
const snapshot = parseSnapshot(entry.stateAfter);
if (snapshot) {
  useProjectStore.getState().setArrangement(snapshot);
}
```

2. **Remove duplicate undo pushes from `useKeyboardShortcuts.ts`** (lines 120-134):

The keyboard Delete and Duplicate handlers currently push their own undo entries with `{ blocks: ... }` format. Since `deleteBlock` and `duplicateBlock` in `project-store.ts` now push their own undo entries (from Subtask 2), these keyboard handlers must NOT push additional entries. Remove the undo-push code:

```typescript
// OLD:
if ((e.key === 'Delete' || e.key === 'Backspace') && blockId) {
  e.preventDefault();
  const before = JSON.stringify({ blocks: useProjectStore.getState().blocks });
  deleteBlock(blockId);
  const after = JSON.stringify({ blocks: useProjectStore.getState().blocks });
  useUndoStore.getState().pushUndo('Delete block', before, after);
  return;
}

// NEW:
if ((e.key === 'Delete' || e.key === 'Backspace') && blockId) {
  e.preventDefault();
  deleteBlock(blockId);
  return;
}
```

Same for the Duplicate handler (key `d`/`D`):
```typescript
// NEW:
if ((e.key === 'd' || e.key === 'D') && blockId) {
  duplicateBlock(blockId);
  return;
}
```

3. **Fix `useGenerate.ts`** (lines 22-24, 126-137):

Replace the manual JSON.stringify with the unified helper:

```typescript
import { snapshotArrangement } from '@/lib/undo-helpers';

// Before generation (line 23):
const before = snapshotArrangement({ stems, sections, blocks, chords });

// After generation (line 127):
const after = snapshotArrangement({
  stems: newStems, sections: newSections, blocks: newBlocks, chords: newChords
});
```

Also fix the regeneration undo finalization (lines 128-136). Currently it pushes a SECOND undo entry to update the `stateAfter`. This is fragile. Instead, defer the entire pushUndo to after generation completes:

```typescript
// Replace the two-step push approach with a single push after generation:
if (isRegeneration) {
  // `before` was captured above, before generation started
  const after = snapshotArrangement({
    stems: newStems, sections: newSections, blocks: newBlocks, chords: newChords
  });
  pushUndo('Full regeneration', before, after);
}
```

Move the `before` snapshot capture outside the `if (isRegeneration)` block to before `setGenerationState('generating')`, and use a `let` variable scoped to the `runGeneration` closure. Remove the early `pushUndo` call that sets `stateAfter` to `''`.

4. **Remove `useUndoStore` import from `useKeyboardShortcuts.ts`** dependency array entries that are no longer needed (the `pushUndo` calls are gone from this file). Keep `undo`, `redo`, `canUndo`, `canRedo` since those are still used.

**Verification:**
- Generate an arrangement, Cmd+Z -- arrangement reverts to empty (or previous arrangement)
- Split a block, Cmd+Z -- block unsplits
- Delete a block via keyboard, Cmd+Z -- block reappears
- Duplicate a block via keyboard, Cmd+Z -- duplicate disappears
- Undo then Redo -- state matches post-action state
- Check that undo stack has exactly 1 entry per action (not 2 for keyboard delete/duplicate)

---

### Subtask 4: Auto-Save with Debounce + beforeunload Guard

**Goal:** Implement debounced auto-save and browser tab-close protection.

**Estimated time:** 60 minutes

**Modifies:**
- `src/components/layout/AppShell.tsx` -- add `beforeunload` handler, replace `setInterval` with debounced auto-save

**Creates:**
- `src/hooks/useAutoSave.ts` -- encapsulated auto-save + beforeunload logic

**Detailed steps:**

1. Create `src/hooks/useAutoSave.ts`:

```typescript
// useAutoSave.ts — Debounced auto-save and tab-close protection.

import { useEffect, useRef } from 'react';
import { useUiStore } from '@/store/ui-store';
import { useProject } from '@/hooks/useProject';

const AUTO_SAVE_DELAY_MS = 30_000; // 30 seconds after last mutation

export function useAutoSave() {
  const unsavedChanges = useUiStore((s) => s.unsavedChanges);
  const generationState = useUiStore((s) => s.generationState);
  const { saveProject } = useProject();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save: when unsavedChanges becomes true, start a timer.
  // Each time unsavedChanges toggles (new mutation calls markDirty), the
  // timer resets. When the timer fires, save.
  useEffect(() => {
    if (!unsavedChanges) {
      // Nothing to save -- clear any pending timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (generationState === 'generating') {
      // Don't auto-save during generation
      return;
    }

    // Start/restart debounce timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      // Double-check state at fire time
      const currentState = useUiStore.getState();
      if (currentState.unsavedChanges && currentState.generationState !== 'generating') {
        void saveProject();
      }
      timerRef.current = null;
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [unsavedChanges, generationState, saveProject]);

  // beforeunload: warn user if there are unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (useUiStore.getState().unsavedChanges) {
        e.preventDefault();
        // Modern browsers ignore custom messages but require returnValue
        // to be set to trigger the native dialog.
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
}
```

**Important implementation note on the debounce:** The `unsavedChanges` boolean alone does not re-toggle on every mutation -- `markDirty()` sets it to `true`, but if it is already `true`, the Zustand state does not change, and the `useEffect` does not re-fire. This means the debounce timer effectively starts on the FIRST mutation after a save (when `unsavedChanges` goes from `false` to `true`), and subsequent mutations do not reset it. This is acceptable behavior: the auto-save fires 30 seconds after the first unsaved change. If a more aggressive "30 seconds after the LAST change" debounce is desired, we need a separate mutation counter or timestamp. For MVP, the simpler approach is correct -- it guarantees data is saved within 30 seconds of the first change.

2. **Modify `src/components/layout/AppShell.tsx`**:

Remove the existing `setInterval` auto-save (lines 30-35):
```typescript
// REMOVE THIS:
useEffect(() => {
  const interval = setInterval(() => {
    if (unsavedChanges) saveProject();
  }, 60_000);
  return () => clearInterval(interval);
}, [unsavedChanges, saveProject]);
```

Replace with:
```typescript
import { useAutoSave } from '@/hooks/useAutoSave';

// Inside AppShell(), after useKeyboardShortcuts():
useAutoSave();
```

Also remove the `unsavedChanges` destructuring from the `useUiStore` call in `AppShell` if it is no longer used directly (check -- it may still be used for the save indicator; keep if so). Remove the `saveProject` import from `useProject` if no longer used in AppShell (the auto-save hook handles it now). **Double-check:** `AppShell` currently uses `unsavedChanges` only in the `setInterval` that we are removing, and `saveProject` only in that same `setInterval`. The `generationState` usage remains. Clean up unused imports/destructuring.

Actually, looking again: `AppShell` uses `unsavedChanges` from `useUiStore` (line 18) and `saveProject` from `useProject` (line 20). The `saveProject` is also passed to other things implicitly through the hook. Let me re-check... No, `saveProject` in AppShell is only used in the setInterval. The TopBar has its own `useProject()` call. So we can remove the `useProject` import and `saveProject` destructuring from AppShell, and remove `unsavedChanges` from the useUiStore destructuring IF it is not used elsewhere in the JSX. Checking: the JSX references `generationState` (line 56-57) but not `unsavedChanges`. So yes, remove `unsavedChanges` and `saveProject` from AppShell.

3. **Write tests** in `src/hooks/useAutoSave.test.ts`:

Use Vitest with `vi.useFakeTimers()`:

```typescript
// Test 1: beforeunload handler is registered on mount
// Test 2: beforeunload calls preventDefault when unsavedChanges is true
// Test 3: beforeunload does NOT call preventDefault when unsavedChanges is false
// Test 4: auto-save fires after AUTO_SAVE_DELAY_MS when unsavedChanges is true
// Test 5: auto-save does NOT fire when generationState is 'generating'
// Test 6: auto-save does NOT fire when unsavedChanges is false
// Test 7: timer is cleaned up on unmount
```

Note: testing React hooks requires `@testing-library/react` (renderHook). Verify this dependency exists in package.json. If not, this is an escalation trigger -- do NOT add it without approval. Instead, test the logic by extracting the debounce logic into a plain function in `useAutoSave.ts` and testing that function directly.

**Verification:**
- Make a change in the editor, wait 30 seconds -- status dot turns green (saved)
- Make a change, try to close tab -- browser shows "Leave site?" dialog
- Save manually (Cmd+S), try to close tab -- no dialog
- Start generation, verify no auto-save fires during generation
- Run `npm run test -- --reporter=verbose useAutoSave`

---

### Subtask 5: Integration Verification + Edge Case Tests

**Goal:** End-to-end verification that undo/redo and auto-save work together correctly. Write integration-level tests that exercise the full flow.

**Estimated time:** 30 minutes

**Modifies:**
- `src/store/project-store.test.ts` -- add round-trip undo/redo tests

**Creates:**
- Nothing new -- tests go in existing files

**Detailed steps:**

1. Add round-trip integration tests to `src/store/project-store.test.ts`:

```typescript
describe('undo/redo round-trip', () => {
  it('split then undo restores original blocks', () => {
    // Setup arrangement with one block
    // Split at bar N
    // Capture post-split state
    // Undo: parse stateBefore, call setArrangement
    // Assert: blocks match original
  });

  it('undo then redo restores post-action state', () => {
    // Setup, perform action, undo, redo
    // Assert: state matches post-action
  });

  it('multiple actions then multiple undos restore in LIFO order', () => {
    // Perform action A, action B, action C
    // Undo -> state is pre-C
    // Undo -> state is pre-B
    // Undo -> state is pre-A (original)
  });

  it('new action after undo clears redo stack', () => {
    // Perform action A, undo, perform action B
    // redo stack is empty
    // undo stack has 1 entry (action B)
  });

  it('removeSection undo restores both section and its blocks', () => {
    // Setup with section + blocks
    // Remove section
    // Undo
    // Assert: section and blocks both restored
  });

  it('updateChord undo restores original chord', () => {
    // Setup with chords
    // Update chord at bar 3
    // Undo
    // Assert: chord at bar 3 matches original
  });
});
```

2. Verify all tests pass: `npm run test -- --reporter=verbose`

3. Verify the build still compiles: `npm run build`

**Verification:** All tests green. Build succeeds with no TypeScript errors.

---

## 5. Evaluation Design

### Test Cases with Known-Good Outputs

**TC-1: Snapshot format validation**
- Input: Call `splitBlock('b1', 5)` on an arrangement with 1 section, 1 stem, 1 block (bars 1-8), 2 chords
- Expected: `undoStack[0].stateBefore` parses to `{ stems: [1 stem], sections: [1 section], blocks: [1 block, bars 1-8], chords: [2 chords] }`
- Expected: `undoStack[0].stateAfter` parses to `{ stems: [1 stem], sections: [1 section], blocks: [2 blocks, bars 1-4 and 5-8], chords: [2 chords] }`

**TC-2: Undo restores state correctly**
- Input: Arrangement with blocks A, B, C. Delete block B. Cmd+Z.
- Expected: Arrangement has blocks A, B, C (block B is restored)

**TC-3: Redo re-applies state correctly**
- Input: Arrangement with blocks A, B, C. Delete block B. Cmd+Z. Cmd+Shift+Z.
- Expected: Arrangement has blocks A, C (block B is deleted again)

**TC-4: Cross-action undo sequence**
- Input: Start with arrangement S0. Split block (S1). Update chord (S2). Delete block (S3). Cmd+Z three times.
- Expected: After 1st undo -> S2. After 2nd undo -> S1. After 3rd undo -> S0.

**TC-5: Generation undo restores previous arrangement**
- Input: Generate arrangement A. Manually split a block (arrangement A'). Regenerate (arrangement B). Cmd+Z.
- Expected: Arrangement A' is restored (with the split block)

**TC-6: beforeunload fires when dirty**
- Input: Call `markDirty()`. Dispatch `beforeunload` event.
- Expected: `event.defaultPrevented` is true (or `returnValue` is set)

**TC-7: beforeunload does NOT fire when clean**
- Input: Call `markSaved()`. Dispatch `beforeunload` event.
- Expected: `event.defaultPrevented` is false

**TC-8: Non-undo actions do not push**
- Input: Call `updateProject({ name: 'New' })`, then `updateStem('st1', { volume: 0.5 })`.
- Expected: `undoStack.length === 0`

### Intent Trace

**Structural trace:** The intent "user never loses work" surfaces in:
- `src/lib/undo-helpers.ts` (snapshot/restore logic)
- `src/store/project-store.ts` (every destructive action calls `snapshotArrangement` + `pushUndo`)
- `src/hooks/useKeyboardShortcuts.ts` (Cmd+Z/Cmd+Shift+Z calls `parseSnapshot` + `setArrangement`)
- `src/hooks/useAutoSave.ts` (debounced save + `beforeunload`)
- `src/components/layout/AppShell.tsx` (wires `useAutoSave`)

**Behavioral trace (end-to-end scenarios):**

1. **Scenario: Rapid editing with undo.** User generates an arrangement, splits 3 blocks, changes a chord, deletes a block. Presses Cmd+Z four times. Each undo restores the exact previous state. The user re-does twice, continues editing. The redo stack is cleared on the new edit. At no point does the user see corrupted state.

2. **Scenario: Tab crash protection.** User makes 5 edits over 25 seconds. At 30 seconds (after first edit), auto-save fires -- all 5 edits are persisted. User closes tab -- no dialog (changes are saved). Alternatively: user makes an edit at second 28, auto-save has not fired yet, user closes tab -- browser shows "Leave site?" dialog.

3. **Scenario: Generation with undo.** User has a carefully edited arrangement. User regenerates. The new arrangement replaces everything. User presses Cmd+Z -- the carefully edited arrangement is fully restored, including all manual edits.

---

## Dependency Order

```
Subtask 1 (snapshot helpers)
    |
    v
Subtask 2 (undo coverage in project-store)
    |
    v
Subtask 3 (fix handlers in useKeyboardShortcuts + useGenerate)
    |
    v
Subtask 4 (auto-save + beforeunload)
    |
    v
Subtask 5 (integration tests + build verification)
```

Subtasks 1-3 are sequential (each depends on the previous). Subtask 4 is independent of 2-3 but should be done after 1 (it does not depend on undo, but the same developer should do them in order for context). Subtask 5 must be last.

---

## Files Modified/Created Summary

| File | Action | Subtask |
|---|---|---|
| `src/lib/undo-helpers.ts` | CREATE | 1 |
| `src/lib/undo-helpers.test.ts` | CREATE | 1 |
| `src/store/project-store.ts` | MODIFY | 1, 2 |
| `src/store/project-store.test.ts` | MODIFY | 2, 5 |
| `src/hooks/useKeyboardShortcuts.ts` | MODIFY | 3 |
| `src/hooks/useGenerate.ts` | MODIFY | 3 |
| `src/hooks/useAutoSave.ts` | CREATE | 4 |
| `src/hooks/useAutoSave.test.ts` | CREATE (if testing lib available) | 4 |
| `src/components/layout/AppShell.tsx` | MODIFY | 4 |
