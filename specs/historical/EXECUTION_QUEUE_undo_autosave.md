# Execution Queue — Undo/Redo Fix + Auto-Save

**Status:** Ready for execution
**Date:** 2026-03-04
**Origin:** Updated from `specs/historical/undo-autosave.md` (five-primitives spec, 2026-03-03)

**For coding agents:** Read the protocol below, then find the first unchecked
task, execute it completely, check the box, commit, and move to the next.
Do not skip tasks. Do not work on more than one task at a time.

---

## Agent Protocol

1. Read this file top to bottom.
2. Find the first task where the checkbox is `[ ]` (unchecked).
3. Read that task's full spec -- it is self-contained. You do not need to read
   any other plan document.
4. Implement exactly as specified. Do not modify files not listed in the task.
   Do not refactor adjacent code.
5. Run both checks in the task's **Verify** section:
   - **Compilation:** must pass before proceeding
   - **Behavioral:** must be manually confirmed or tested; do not skip
5b. Run the full test suite: `npx vitest run`
    If tests you did not introduce are now failing, **stop and report** which
    tests broke and why before touching the checkbox.
6. Edit this file: change `[ ]` to `[x]` on that task's line.
7. Commit all changes (code + this file) together with message: `T{n}: {title}`
8. Return to step 2.

9. When no unchecked tasks remain, perform the **Completion Check** and
   **Intent Trace** sections:
   - Run the full test suite one final time.
   - For each structural intent trace claim (`- [ ]`), read the referenced
     code and confirm it does what the claim says. Check the box.
   - For each behavioral demo step, execute it and confirm the expected
     outcome. Check the box.
   - Before executing behavioral demos, validate each step against the Litmus
     Test above. If any step uses `import`, `python -c`, direct database queries,
     or cannot be followed by a non-programmer, STOP and report the violation
     instead of executing it. Do not rubber-stamp weak verification.
   - Commit the checked intent trace with message: `intent-trace: verified`
   - Only then is the queue complete. Proceed to the **Archive** section.

If a task says **BLOCKED**, skip it and move to the next unblocked one.
If all remaining tasks are **BLOCKED** or done, stop and report.

---

## Context

**Problem summary:** The editor has two critical data-safety gaps: (1) undo/redo is broken -- only 3 of 15 mutating actions push undo entries, and those 3 use a bare `Block[]` snapshot format that the undo handler cannot parse (it checks `if (state.blocks)` which is falsy on an array); (2) there is no `beforeunload` guard, so closing the tab loses unsaved work. The existing 60-second `setInterval` auto-save in `AppShell.tsx` is also suboptimal (not debounced, no generation guard).

**Already implemented (do not re-implement):**

- **Undo store** -- `src/store/undo-store.ts` -- stores `UndoEntry` objects with `{ description, stateBefore, stateAfter }` as strings. Has `pushUndo`, `undo`, `redo`, `canUndo`, `canRedo`. Format-agnostic (stores strings). 50-entry max. Clears redo stack on new push. No changes needed to this file.
- **Project store** -- `src/store/project-store.ts` -- has `setArrangement()` which atomically sets `{ stems, sections, blocks, chords }`. Has a `snapshotBlocks()` helper that returns `JSON.stringify(blocks)` (the broken bare-array format). Three actions (`splitBlock`, `mergeBlocks`, `deleteBlock`) push undo entries using `snapshotBlocks()`.
- **Keyboard shortcuts** -- `src/hooks/useKeyboardShortcuts.ts` -- handles Cmd+Z/Cmd+Shift+Z. Parses `entry.stateBefore` and checks `if (state.blocks)` before calling `setArrangement()`. Also pushes its OWN undo entries for keyboard Delete and Duplicate (creating double-undo bugs).
- **Generation flow** -- `src/hooks/useGenerate.ts` -- `runGeneration()` snapshots with `JSON.stringify({ stems, sections, blocks, chords })` on regeneration. Uses a fragile two-step push approach (pushes with empty `stateAfter`, then pushes again to "update" it). Also has `regenerateMidi()` and `regenerateDrumsOnly()` for reactive slider updates.
- **AppShell** -- `src/components/layout/AppShell.tsx` -- has a 60-second `setInterval` auto-save. No `beforeunload` handler.
- **UI store** -- `src/store/ui-store.ts` -- has `unsavedChanges`, `markDirty()`, `markSaved()`, `generationState`.

**Key facts the agent needs:**

- The `snapshotBlocks()` function in `project-store.ts` produces bare `Block[]` JSON. The undo handler in `useKeyboardShortcuts.ts` checks `if (state.blocks)` -- this is falsy for arrays. So ALL existing undo entries silently fail to restore.
- Keyboard Delete handler pushes its own undo entry AND `deleteBlock()` in the store pushes one too -- resulting in TWO undo entries per delete. Same for keyboard Duplicate (though `duplicateBlock()` currently does NOT push, so Duplicate only has the keyboard-side entry). After this fix, all undo pushes will be in the store actions only, and the keyboard handler will just call the store action.
- `setDrumBlocks` and `clearDrumOnlyUpdate` are reactive drum style actions (added for slider-driven drum regeneration). They are NON-UNDO operations -- they respond to slider changes every 300ms via `regenerateDrumsOnly()`.
- `regenerateMidi()` and `regenerateDrumsOnly()` are reactive MIDI regeneration functions. NON-UNDO operations.
- `regenerateDrumsOnly()` calls `setDrumBlocks()` which does NOT call `markDirty()` directly -- instead `regenerateDrumsOnly()` calls `useUiStore.getState().markDirty()` itself. This fires every 300ms during slider drags. The 30-second auto-save debounce handles this correctly (fires 30s after the last `markDirty()`).
- No `@testing-library/react` is installed. Hook tests must extract testable logic into plain functions.
- All types must come from `@/types` -- never inline shared type definitions.
- Named exports only. Path alias `@/` for all `src/` imports.
- Test files colocated as `{name}.test.ts`.

---

## Delegation Strategy

**Queue size:** 5 tasks -- single agent batch.

**File overlap map:**

| Source file | Edited by tasks |
|---|---|
| `src/lib/undo-helpers.ts` (new) | T1 |
| `src/lib/undo-helpers.test.ts` (new) | T1 |
| `src/store/project-store.ts` | T1, T2 |
| `src/store/project-store.test.ts` | T2, T5 |
| `src/hooks/useKeyboardShortcuts.ts` | T3 |
| `src/hooks/useGenerate.ts` | T3 |
| `src/hooks/useAutoSave.ts` (new) | T4 |
| `src/hooks/useAutoSave.test.ts` (new) | T4 |
| `src/components/layout/AppShell.tsx` | T4 |

**Batch assignments:**

| Batch | Tasks | Agent prompt |
|---|---|---|
| 1 | T1-T5 | "Read `specs/EXECUTION_QUEUE_undo_autosave.md`. Execute all tasks T1-T5." |

All 5 tasks are sequential (each depends on the previous). Single agent, single batch.

---

## Task Queue

---

### [x] T1 -- Unified Snapshot Helpers + Fix Existing Undo Push Format

**Files:** `src/lib/undo-helpers.ts` (new), `src/lib/undo-helpers.test.ts` (new), `src/store/project-store.ts` (modify)
**Depends on:** none
**Tests:** `src/lib/undo-helpers.test.ts` (new file)

**Background:**

The project store has a `snapshotBlocks()` function that produces `JSON.stringify(blocks)` -- a bare `Block[]` array. Three actions (`splitBlock`, `mergeBlocks`, `deleteBlock`) use this to push undo entries. The undo handler in `useKeyboardShortcuts.ts` checks `if (state.blocks)` which is falsy for arrays, so every undo silently fails. This task creates a unified snapshot format and migrates the 3 existing undo-producing actions to use it.

**What to build:**

**Step 1 -- Read `src/store/project-store.ts` first.**

Confirm the file has:
- A `snapshotBlocks()` function that returns `JSON.stringify(blocks)`
- `splitBlock`, `mergeBlocks`, `deleteBlock` actions that call `snapshotBlocks()` and `pushUndo()`
- `setArrangement()` that accepts `{ stems, sections, blocks, chords }`

**Step 2 -- Create `src/lib/undo-helpers.ts`.**

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

**Step 3 -- Update `src/store/project-store.ts`.**

- Remove the `snapshotBlocks()` function entirely.
- Add import: `import { snapshotArrangement } from '@/lib/undo-helpers';`
- Update `splitBlock`: replace `snapshotBlocks(blocks)` calls with `snapshotArrangement(get())` for `before` (captured BEFORE the `set()` call) and `snapshotArrangement(get())` for `after` (captured AFTER the `set()` call). Note: `set()` is synchronous in Zustand, so `get()` after `set()` returns the new state.
- Apply the same pattern to `mergeBlocks` and `deleteBlock`.

The pattern for each action:
```typescript
splitBlock: (blockId, atBar) => {
  // ... validation ...
  const before = snapshotArrangement(get());
  // ... mutation logic (set() call) ...
  const after = snapshotArrangement(get());
  useUndoStore.getState().pushUndo(`Split block at bar ${atBar}`, before, after);
  useUiStore.getState().markDirty();
},
```

**Step 4 -- Create tests in `src/lib/undo-helpers.test.ts`.**

```typescript
import { describe, it, expect } from 'vitest';
import { snapshotArrangement, parseSnapshot } from './undo-helpers';

describe('snapshotArrangement', () => {
  it('returns valid JSON with all four keys', () => {
    const result = snapshotArrangement({
      stems: [{ id: 'st1' }] as any[],
      sections: [{ id: 's1' }] as any[],
      blocks: [{ id: 'b1' }] as any[],
      chords: [{ id: 'c1' }] as any[],
    });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('stems');
    expect(parsed).toHaveProperty('sections');
    expect(parsed).toHaveProperty('blocks');
    expect(parsed).toHaveProperty('chords');
  });
});

describe('parseSnapshot', () => {
  it('returns the object for valid input', () => {
    const json = JSON.stringify({
      stems: [], sections: [], blocks: [], chords: [],
    });
    const result = parseSnapshot(json);
    expect(result).not.toBeNull();
    expect(result!.stems).toEqual([]);
  });

  it('returns null for invalid JSON', () => {
    expect(parseSnapshot('not json')).toBeNull();
  });

  it('returns null for objects missing required keys', () => {
    expect(parseSnapshot(JSON.stringify({ stems: [] }))).toBeNull();
  });

  it('returns null for bare arrays (the old broken format)', () => {
    expect(parseSnapshot(JSON.stringify([{ id: 'b1' }]))).toBeNull();
  });
});
```

**Verify:**

Compilation:
```
npm run build
```

Behavioral:
```
npx vitest run src/lib/undo-helpers.test.ts --reporter=verbose
```
All 5 tests pass. Inspect `splitBlock`, `mergeBlocks`, `deleteBlock` in `project-store.ts` -- each uses `snapshotArrangement(get())` for before/after, not `snapshotBlocks()`. The `snapshotBlocks` function no longer exists in the file.

---

### [x] T2 -- Add Undo Coverage to All Destructive Mutations

**Files:** `src/store/project-store.ts` (modify), `src/store/project-store.test.ts` (modify)
**Depends on:** T1
**Tests:** `src/store/project-store.test.ts` (add to existing file)

**Background:**

After T1, only 3 actions (`splitBlock`, `mergeBlocks`, `deleteBlock`) push undo entries. Seven more destructive actions need undo coverage: `updateBlock`, `duplicateBlock`, `addSection`, `updateSection`, `removeSection`, `reorderSections`, `updateChord`. Additionally, several non-undo actions need to be explicitly documented as intentionally excluded.

**What to build:**

**Step 1 -- Read `src/store/project-store.ts` first.**

Confirm T1 changes are applied: `snapshotArrangement` is imported, `snapshotBlocks` is removed, `splitBlock`/`mergeBlocks`/`deleteBlock` use the new snapshot format.

**Step 2 -- Add undo pushes to 7 actions.**

For each action below, wrap the mutation with before/after snapshots:

```typescript
actionName: (...args) => {
  const before = snapshotArrangement(get());
  // ... existing mutation logic (set() call) ...
  const after = snapshotArrangement(get());
  useUndoStore.getState().pushUndo('Description', before, after);
  useUiStore.getState().markDirty();  // already present -- keep in place
},
```

Actions to modify (with undo descriptions):

1. **`updateBlock(blockId, partial)`** -- `"Update block"`
2. **`duplicateBlock(blockId)`** -- `"Duplicate block"`
3. **`addSection(section)`** -- `"Add section: ${section.name}"`
4. **`updateSection(sectionId, partial)`** -- `"Update section"`
5. **`removeSection(sectionId)`** -- `"Remove section"` (note: this also removes associated blocks via the filter in the `set()` call -- the full snapshot captures both)
6. **`reorderSections(sectionIds)`** -- `"Reorder sections"`
7. **`updateChord(barNumber, chord)`** -- `"Update chord at bar ${barNumber}"`

**Actions that do NOT get undo (per design):**

- `updateProject` -- project metadata (name, key, tempo, genre). Cosmetic.
- `updateStem` -- mixer settings (volume, pan, mute, solo). Cosmetic.
- `addStem` -- data-loading operation (only called during generation).
- `reorderStems` -- mixer layout. Cosmetic.
- `setDrumBlocks` -- reactive drum slider response (fires every 300ms). Not a discrete user action.
- `clearDrumOnlyUpdate` -- internal flag clear. Not a user action.
- `setProject`, `setArrangement`, `clearArrangement` -- data-loading operations, not user mutations.
- `addChatMessage` -- chat history, not arrangement data.

**Step 3 -- Add undo tests to `src/store/project-store.test.ts`.**

Import `useUndoStore` at the top. In `beforeEach`, also reset the undo store:
```typescript
import { useUndoStore } from './undo-store';

// In beforeEach, add:
useUndoStore.setState({ undoStack: [], redoStack: [] });
```

Add a new `describe('undo push coverage')` block with these tests:

For each of the 10 undo-producing actions (3 from T1 + 7 new), add a test:
```typescript
it('{actionName} pushes undo entry with unified snapshot format', () => {
  // Setup: populate store with arrangement data using setArrangement + setProject
  // Act: perform the mutation
  // Assert: undoStack has 1 entry
  // Assert: JSON.parse(entry.stateBefore) has keys stems, sections, blocks, chords
  // Assert: JSON.parse(entry.stateAfter) has keys stems, sections, blocks, chords
});
```

Also add negative tests:
```typescript
it('updateProject does NOT push undo entry', () => {
  useProjectStore.getState().setProject(makeProject());
  useUndoStore.setState({ undoStack: [], redoStack: [] });
  useProjectStore.getState().updateProject({ name: 'New Name' });
  expect(useUndoStore.getState().undoStack).toHaveLength(0);
});

it('updateStem does NOT push undo entry', () => {
  useProjectStore.getState().setArrangement({
    stems: [makeStem()], sections: [], blocks: [], chords: [],
  });
  useUndoStore.setState({ undoStack: [], redoStack: [] });
  useProjectStore.getState().updateStem('st1', { volume: 0.5 });
  expect(useUndoStore.getState().undoStack).toHaveLength(0);
});

it('setDrumBlocks does NOT push undo entry', () => {
  useProjectStore.getState().setArrangement({
    stems: [makeStem()], sections: [], blocks: [makeBlock()], chords: [],
  });
  useUndoStore.setState({ undoStack: [], redoStack: [] });
  useProjectStore.getState().setDrumBlocks([makeBlock()]);
  expect(useUndoStore.getState().undoStack).toHaveLength(0);
});
```

**Verify:**

Compilation:
```
npm run build
```

Behavioral:
```
npx vitest run src/store/project-store.test.ts --reporter=verbose
```
All existing tests still pass. New undo-push tests all pass. The undo stack has exactly 0 entries after non-undo actions and exactly 1 entry after each undo action. Every `stateBefore` and `stateAfter` parses to an object with all four keys (`stems`, `sections`, `blocks`, `chords`).

---

### [x] T3 -- Fix Undo/Redo Handler + Fix Generation Undo + Remove Double-Undo Bugs

**Files:** `src/hooks/useKeyboardShortcuts.ts` (modify), `src/hooks/useGenerate.ts` (modify)
**Depends on:** T2
**Tests:** none (behavioral verification only -- these are React hooks without `@testing-library/react`)

**Background:**

The undo/redo handler in `useKeyboardShortcuts.ts` parses snapshots and checks `if (state.blocks)` -- which is falsy for the old bare-array format and truthy for the new unified format. With T1/T2 complete, the new format is used, but the handler code should use `parseSnapshot()` for defensive parsing. Additionally, the keyboard Delete and Duplicate handlers push their own undo entries, creating double-undo bugs (Delete pushes TWO entries: one from `deleteBlock()` in the store, one from the keyboard handler). The generation undo in `useGenerate.ts` uses a fragile two-step push approach that must be simplified.

**What to build:**

**Step 1 -- Read both files first.**

Read `src/hooks/useKeyboardShortcuts.ts` and `src/hooks/useGenerate.ts`. Confirm:
- `useKeyboardShortcuts.ts`: undo handler parses `entry.stateBefore` with `JSON.parse` and checks `if (state.blocks)`. Keyboard Delete and Duplicate handlers each push their own undo entries.
- `useGenerate.ts`: `runGeneration()` with `isRegeneration` pushes undo with empty `stateAfter`, then later pushes again to "update" it.

**Step 2 -- Fix undo/redo handler in `useKeyboardShortcuts.ts`.**

Add import at the top:
```typescript
import { parseSnapshot } from '@/lib/undo-helpers';
```

Replace the Cmd+Z handler block (the `if (isMod(e) && !e.shiftKey && e.key === 'z')` block):
```typescript
// Cmd+Z -- undo
if (isMod(e) && !e.shiftKey && e.key === 'z') {
  e.preventDefault();
  if (canUndo() && generationState !== 'generating') {
    const entry = undo();
    if (entry) {
      const snapshot = parseSnapshot(entry.stateBefore);
      if (snapshot) {
        useProjectStore.getState().setArrangement(snapshot);
      }
    }
  }
  return;
}
```

Replace the Cmd+Shift+Z handler block:
```typescript
// Cmd+Shift+Z -- redo
if (isMod(e) && e.shiftKey && e.key === 'z') {
  e.preventDefault();
  if (canRedo() && generationState !== 'generating') {
    const entry = redo();
    if (entry) {
      const snapshot = parseSnapshot(entry.stateAfter);
      if (snapshot) {
        useProjectStore.getState().setArrangement(snapshot);
      }
    }
  }
  return;
}
```

**Step 3 -- Remove double-undo pushes from keyboard handlers.**

Replace the keyboard Delete handler (the `if ((e.key === 'Delete' || e.key === 'Backspace') && blockId)` block):
```typescript
if ((e.key === 'Delete' || e.key === 'Backspace') && blockId) {
  e.preventDefault();
  deleteBlock(blockId);
  return;
}
```

Replace the keyboard Duplicate handler (the `if ((e.key === 'd' || e.key === 'D') && blockId)` block):
```typescript
if ((e.key === 'd' || e.key === 'D') && blockId) {
  duplicateBlock(blockId);
  return;
}
```

The undo entries are now pushed by the store actions themselves (from T2). No double-undo.

**Step 4 -- Remove unused `pushUndo` import from `useKeyboardShortcuts.ts`.**

The `pushUndo` function is no longer called directly in this file. However, `undo`, `redo`, `canUndo`, `canRedo` are still used. Remove the `pushUndo` usage: since `useUndoStore` is destructured as `{ undo, redo, canUndo, canRedo }`, just ensure `pushUndo` is NOT in that destructuring. If `useUndoStore` is only used for those four, the import of `useUndoStore` can stay but `pushUndo` should not appear.

Also: since the keyboard handlers no longer snapshot manually, the inline `JSON.stringify({ blocks: ... })` calls are gone. No dead code should remain.

**Step 5 -- Fix generation undo in `useGenerate.ts`.**

Add import at the top:
```typescript
import { snapshotArrangement } from '@/lib/undo-helpers';
```

Refactor `runGeneration()` to use a single deferred undo push instead of the two-step approach:

1. Move the `before` snapshot capture BEFORE the `if (isRegeneration)` check but still inside `runGeneration()`. Use a `let` variable:
```typescript
const runGeneration = useCallback(async (isRegeneration = false) => {
  if (!project) return;

  // Capture pre-generation state for undo (only used if isRegeneration)
  const before = isRegeneration
    ? snapshotArrangement({ stems, sections, blocks, chords })
    : null;

  setGenerationState('generating');
  // ... rest of generation logic ...
```

2. Remove the early `pushUndo('Full regeneration', before, '')` call that currently happens before generation starts.

3. After `setArrangement()` and `updateProject()`, replace the fragile "find last entry and update" logic with a single clean push:
```typescript
// After setArrangement and updateProject:
if (isRegeneration && before) {
  const after = snapshotArrangement({
    stems: newStems, sections: newSections, blocks: newBlocks, chords: newChords,
  });
  pushUndo('Full regeneration', before, after);
}
```

4. Remove the entire old finalization block that searches the undo stack for an entry with empty `stateAfter`.

**Verify:**

Compilation:
```
npm run build
```

Behavioral:
```
npx vitest run --reporter=verbose
```
All existing tests pass. Manually verify (if possible in the running app):
- Keyboard Delete on a selected block: Cmd+Z restores the block. Undo stack has exactly 1 entry (not 2).
- Keyboard Duplicate (D key) on a selected block: Cmd+Z removes the duplicate. Undo stack has exactly 1 entry.
- The undo/redo handler uses `parseSnapshot()` -- check that the import of `parseSnapshot` is present in `useKeyboardShortcuts.ts`.

---

### [x] T4 -- Auto-Save with Debounce + beforeunload Guard

**Files:** `src/hooks/useAutoSave.ts` (new), `src/hooks/useAutoSave.test.ts` (new), `src/components/layout/AppShell.tsx` (modify)
**Depends on:** T1 (uses `useUiStore` patterns; independent of T2/T3 but sequenced after for context)
**Tests:** `src/hooks/useAutoSave.test.ts` (new file)

**Background:**

`AppShell.tsx` has a 60-second `setInterval` that calls `saveProject()` when `unsavedChanges` is true. There is no `beforeunload` handler, so closing the tab loses unsaved work. This task replaces the interval with a debounced auto-save hook and adds tab-close protection. Note: `regenerateDrumsOnly()` fires `markDirty()` every 300ms during slider drags. The 30-second debounce handles this correctly -- it fires 30s after the LAST `markDirty()` call when `unsavedChanges` transitions from false to true.

**Implementation note on debounce behavior:** The `unsavedChanges` boolean does not re-toggle on every `markDirty()` call -- if it is already `true`, the Zustand state does not change, and a `useEffect` watching it does not re-fire. This means the debounce timer starts on the FIRST mutation after a save (when `unsavedChanges` goes from `false` to `true`), and subsequent mutations do NOT reset it. This is acceptable for MVP: data is saved within 30 seconds of the first unsaved change.

**What to build:**

**Step 1 -- Read `src/components/layout/AppShell.tsx` first.**

Confirm:
- There is a `useEffect` with `setInterval(() => { if (unsavedChanges) saveProject() }, 60_000)`
- `unsavedChanges` is destructured from `useUiStore()`
- `saveProject` comes from `useProject()`
- Both are only used in the setInterval (not elsewhere in the JSX)

**Step 2 -- Create `src/hooks/useAutoSave.ts`.**

```typescript
// useAutoSave.ts -- Debounced auto-save and tab-close protection.

import { useEffect, useRef } from 'react';
import { useUiStore } from '@/store/ui-store';
import { useProject } from '@/hooks/useProject';

const AUTO_SAVE_DELAY_MS = 30_000; // 30 seconds after first unsaved change

export function useAutoSave() {
  const unsavedChanges = useUiStore((s) => s.unsavedChanges);
  const generationState = useUiStore((s) => s.generationState);
  const { saveProject } = useProject();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save
  useEffect(() => {
    if (!unsavedChanges) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (generationState === 'generating') {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
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
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
}
```

**Step 3 -- Modify `src/components/layout/AppShell.tsx`.**

Add import:
```typescript
import { useAutoSave } from '@/hooks/useAutoSave';
```

Add the hook call right after `useKeyboardShortcuts()`:
```typescript
export function AppShell() {
  useKeyboardShortcuts();
  useAutoSave();
  // ...
```

Remove the `setInterval` auto-save `useEffect` entirely (the one with `setInterval(() => { if (unsavedChanges) saveProject() }, 60_000)` and its cleanup).

Remove the `unsavedChanges` destructuring from `useUiStore()` -- it is no longer used in AppShell. If the destructuring is `const { unsavedChanges } = useUiStore();`, remove it. If other values are destructured alongside it, remove only `unsavedChanges`.

Remove the `saveProject` destructuring from `useProject()` -- it is no longer used in AppShell. If `useProject()` is only used for `saveProject`, remove the entire `useProject()` import and call. If other values are destructured alongside it, remove only `saveProject`.

**Step 4 -- Create tests in `src/hooks/useAutoSave.test.ts`.**

Since `@testing-library/react` is not available, extract the debounce delay as a named export constant and test the `beforeunload` behavior and auto-save logic using store state manipulation and `vi.useFakeTimers()`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test the AUTO_SAVE_DELAY_MS export and beforeunload logic
// Since we can't test hooks directly without @testing-library/react,
// test the underlying store behavior that the hook depends on.

import { useUiStore } from '@/store/ui-store';

describe('auto-save prerequisites', () => {
  beforeEach(() => {
    useUiStore.setState({
      unsavedChanges: false,
      generationState: 'idle' as any,
    });
  });

  it('markDirty sets unsavedChanges to true', () => {
    useUiStore.getState().markDirty();
    expect(useUiStore.getState().unsavedChanges).toBe(true);
  });

  it('markSaved sets unsavedChanges to false', () => {
    useUiStore.getState().markDirty();
    useUiStore.getState().markSaved();
    expect(useUiStore.getState().unsavedChanges).toBe(false);
  });
});
```

**Verify:**

Compilation:
```
npm run build
```

Behavioral:
```
npx vitest run src/hooks/useAutoSave.test.ts --reporter=verbose
```
Tests pass. Confirm in `AppShell.tsx`:
- No `setInterval` auto-save remains.
- `useAutoSave()` is called.
- `unsavedChanges` is not destructured from `useUiStore()` (unless used elsewhere).
- `saveProject` from `useProject()` is not used in AppShell (unless used elsewhere).

---

### [x] T5 -- Integration Verification + Edge Case Tests

**Files:** `src/store/project-store.test.ts` (modify)
**Depends on:** T2, T3, T4
**Tests:** `src/store/project-store.test.ts` (add to existing file)

**Background:**

All undo producers and consumers are now using the unified snapshot format. This task adds round-trip integration tests that verify undo/redo works end-to-end through the store layer.

**What to build:**

**Step 1 -- Read `src/store/project-store.test.ts` first.**

Confirm T2 tests are present. Verify `useUndoStore` is imported and reset in `beforeEach`.

**Step 2 -- Add round-trip integration tests.**

Add a new `describe('undo/redo round-trip')` block:

```typescript
import { parseSnapshot } from '@/lib/undo-helpers';

describe('undo/redo round-trip', () => {
  it('split then undo restores original blocks', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [makeBlock({ startBar: 1, endBar: 8 })], chords: [],
    });
    const originalBlocks = useProjectStore.getState().blocks;
    useProjectStore.getState().splitBlock('b1', 5);
    expect(useProjectStore.getState().blocks).toHaveLength(2);

    // Undo
    const entry = useUndoStore.getState().undo();
    expect(entry).not.toBeNull();
    const snapshot = parseSnapshot(entry!.stateBefore);
    expect(snapshot).not.toBeNull();
    useProjectStore.getState().setArrangement(snapshot!);
    expect(useProjectStore.getState().blocks).toHaveLength(1);
    expect(useProjectStore.getState().blocks[0].startBar).toBe(originalBlocks[0].startBar);
    expect(useProjectStore.getState().blocks[0].endBar).toBe(originalBlocks[0].endBar);
  });

  it('undo then redo restores post-action state', () => {
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [makeBlock({ startBar: 1, endBar: 8 })], chords: [],
    });
    useProjectStore.getState().splitBlock('b1', 5);
    const postSplitBlocks = [...useProjectStore.getState().blocks];

    // Undo
    const undoEntry = useUndoStore.getState().undo();
    const undoSnap = parseSnapshot(undoEntry!.stateBefore);
    useProjectStore.getState().setArrangement(undoSnap!);
    expect(useProjectStore.getState().blocks).toHaveLength(1);

    // Redo
    const redoEntry = useUndoStore.getState().redo();
    const redoSnap = parseSnapshot(redoEntry!.stateAfter);
    useProjectStore.getState().setArrangement(redoSnap!);
    expect(useProjectStore.getState().blocks).toHaveLength(2);
  });

  it('multiple actions then multiple undos restore in LIFO order', () => {
    useProjectStore.getState().setProject(makeProject());
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [makeBlock({ startBar: 1, endBar: 12 })],
      chords: [{ id: 'c1', projectId: 'p1', barNumber: 1, degree: 'I', quality: 'maj7', bassDegree: null }],
    });
    const s0Blocks = [...useProjectStore.getState().blocks];

    // Action A: split
    useProjectStore.getState().splitBlock('b1', 5);
    const s1Blocks = [...useProjectStore.getState().blocks];

    // Action B: update chord
    useProjectStore.getState().updateChord(1, { quality: 'min7' });

    // Action C: delete a block
    const blockToDelete = useProjectStore.getState().blocks[0];
    useProjectStore.getState().deleteBlock(blockToDelete.id);

    // Undo C
    const entryC = useUndoStore.getState().undo();
    useProjectStore.getState().setArrangement(parseSnapshot(entryC!.stateBefore)!);

    // Undo B
    const entryB = useUndoStore.getState().undo();
    useProjectStore.getState().setArrangement(parseSnapshot(entryB!.stateBefore)!);
    expect(useProjectStore.getState().chords[0].quality).toBe('maj7');

    // Undo A
    const entryA = useUndoStore.getState().undo();
    useProjectStore.getState().setArrangement(parseSnapshot(entryA!.stateBefore)!);
    expect(useProjectStore.getState().blocks).toHaveLength(1);
    expect(useProjectStore.getState().blocks[0].startBar).toBe(s0Blocks[0].startBar);
    expect(useProjectStore.getState().blocks[0].endBar).toBe(s0Blocks[0].endBar);
  });

  it('new action after undo clears redo stack', () => {
    useProjectStore.getState().setProject(makeProject());
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [makeBlock({ startBar: 1, endBar: 8 })], chords: [],
    });

    // Action A
    useProjectStore.getState().splitBlock('b1', 5);
    expect(useUndoStore.getState().undoStack).toHaveLength(1);

    // Undo A
    const entry = useUndoStore.getState().undo();
    useProjectStore.getState().setArrangement(parseSnapshot(entry!.stateBefore)!);
    expect(useUndoStore.getState().redoStack).toHaveLength(1);

    // Action B (new action after undo)
    useProjectStore.getState().updateBlock('b1', { style: 'rock_power' });
    expect(useUndoStore.getState().redoStack).toHaveLength(0);
    expect(useUndoStore.getState().undoStack).toHaveLength(1);
  });

  it('removeSection undo restores both section and its blocks', () => {
    useProjectStore.getState().setProject(makeProject());
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection({ id: 's1' })],
      blocks: [
        makeBlock({ id: 'b1', sectionId: 's1' }),
        makeBlock({ id: 'b2', sectionId: 's1', startBar: 9, endBar: 16 }),
      ],
      chords: [],
    });
    expect(useProjectStore.getState().sections).toHaveLength(1);
    expect(useProjectStore.getState().blocks).toHaveLength(2);

    useProjectStore.getState().removeSection('s1');
    expect(useProjectStore.getState().sections).toHaveLength(0);
    expect(useProjectStore.getState().blocks).toHaveLength(0);

    // Undo
    const entry = useUndoStore.getState().undo();
    useProjectStore.getState().setArrangement(parseSnapshot(entry!.stateBefore)!);
    expect(useProjectStore.getState().sections).toHaveLength(1);
    expect(useProjectStore.getState().blocks).toHaveLength(2);
  });

  it('updateChord undo restores original chord', () => {
    useProjectStore.getState().setProject(makeProject());
    useProjectStore.getState().setArrangement({
      stems: [makeStem()], sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [{ id: 'c1', projectId: 'p1', barNumber: 3, degree: 'I', quality: 'maj7', bassDegree: null }],
    });

    useProjectStore.getState().updateChord(3, { quality: 'min7' });
    expect(useProjectStore.getState().chords[0].quality).toBe('min7');

    // Undo
    const entry = useUndoStore.getState().undo();
    useProjectStore.getState().setArrangement(parseSnapshot(entry!.stateBefore)!);
    expect(useProjectStore.getState().chords[0].quality).toBe('maj7');
  });
});
```

**Step 3 -- Verify the full build and test suite.**

**Verify:**

Compilation:
```
npm run build
```

Behavioral:
```
npx vitest run --reporter=verbose
```
All tests green. Every round-trip test demonstrates that undo/redo correctly restores state through the unified snapshot format. The build compiles with no TypeScript errors.

---

## Completion Check

When all boxes are checked, run the full suite one final time:

```
npx vitest run
```

All tests must pass. Then perform the fresh eyes review:

**Fresh eyes review (one pass only).** Re-read every file you modified with
fresh eyes. Look for: schema mismatches, missing imports, dead code,
edge cases the tests don't cover. Report any findings and fix
them before proceeding. Do NOT run this review a second time.

Then perform the behavioral smoke test:

**Smoke test:**
1. Open the app in the browser at `http://localhost:5173`. Generate an arrangement. Split a block. Press Cmd+Z -- the split undoes. Press Cmd+Shift+Z -- the split re-applies. The undo stack has exactly 1 entry per action.
2. Make an edit (e.g., change a chord). Try to close the tab -- the browser shows a "Leave site?" dialog. Press "Stay". Save manually with Cmd+S. Try to close the tab again -- no dialog.
3. Keyboard Delete a selected block. Press Cmd+Z -- the block reappears. Verify only 1 undo entry was created (not 2).

## Intent Trace

After all tasks pass, verify the *system-level behavior* matches the original intent.

**Original intent:** Users should never lose work -- every destructive edit is undoable, and unsaved changes are protected by auto-save and tab-close warnings.

### Structural (code wiring)

- [x] Every destructive mutation in `project-store.ts` (`updateBlock`, `splitBlock`, `mergeBlocks`, `deleteBlock`, `duplicateBlock`, `addSection`, `updateSection`, `removeSection`, `reorderSections`, `updateChord`) calls `snapshotArrangement(get())` before and after mutation, then calls `pushUndo()` with both snapshots.
- [x] Non-undo operations (`updateProject`, `updateStem`, `addStem`, `reorderStems`, `setDrumBlocks`, `clearDrumOnlyUpdate`, `setProject`, `setArrangement`, `clearArrangement`) do NOT call `pushUndo()`.
- [x] `useKeyboardShortcuts.ts` undo handler calls `parseSnapshot(entry.stateBefore)` and passes the result to `setArrangement()`. No inline `JSON.parse` + `if (state.blocks)` remains.
- [x] `useKeyboardShortcuts.ts` keyboard Delete and Duplicate handlers call only `deleteBlock()`/`duplicateBlock()` -- no `pushUndo()` calls remain in this file.
- [x] `useGenerate.ts` `runGeneration()` with `isRegeneration` captures `before` snapshot via `snapshotArrangement()` before generation starts, then pushes a single `pushUndo()` after generation completes with the `after` snapshot. No two-step push. No empty `stateAfter`.
- [x] `useAutoSave.ts` registers a `beforeunload` event listener that calls `e.preventDefault()` when `unsavedChanges` is true.
- [x] `useAutoSave.ts` sets a 30-second debounce timer that calls `saveProject()` when `unsavedChanges` is true and `generationState` is not `'generating'`.
- [x] `AppShell.tsx` calls `useAutoSave()`. No `setInterval` auto-save remains.

### Behavioral (end-to-end demo)

**Demo scenario:** Rapid editing with undo, then tab-close protection.

- [ ] Step: Open the app. Generate an arrangement. Split a block by clicking the split tool and clicking on a block. Press Cmd+Z.
  - Expect: The split is undone. The block returns to its original bar range. One undo entry was consumed.
  - **Status: requires manual browser verification (dev server not running)**

- [ ] Step: Press Cmd+Shift+Z.
  - Expect: The split is re-applied. Two blocks appear at the split point.
  - **Status: requires manual browser verification**

- [ ] Step: Select a block. Press Delete. Press Cmd+Z.
  - Expect: The deleted block reappears. Exactly one undo entry was consumed (not two).
  - **Status: requires manual browser verification**

- [ ] Step: Make any edit (e.g., update a chord). Attempt to close the browser tab.
  - Expect: The browser shows a "Leave site?" native confirmation dialog.
  - **Status: requires manual browser verification**

- [ ] Step: Press "Stay" (or cancel). Press Cmd+S to save. Attempt to close the tab again.
  - Expect: No confirmation dialog -- the tab closes immediately.
  - **Status: requires manual browser verification**

Undo/Redo + Auto-Save is complete when all tests pass AND both intent trace checks pass.

## Archive

When this queue is fully complete (all task boxes checked, all intent trace boxes
checked, all tests green), move this file:

```bash
mv specs/EXECUTION_QUEUE_undo_autosave.md specs/historical/
git add -A specs/ && git commit -m "chore: archive completed execution queue undo-autosave"
```
