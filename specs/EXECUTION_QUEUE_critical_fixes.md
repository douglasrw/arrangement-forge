# Execution Queue -- Critical Bug Fixes

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
7. Commit all changes (code + this file) together with message: `fix: T{n}: {title}`
8. Return to step 2.

9. When no unchecked tasks remain, perform the **Completion Check** and
   **Intent Trace** sections:
   - Run the full test suite one final time.
   - For each structural intent trace claim (`- [ ]`), read the referenced
     code and confirm it does what the claim says. Check the box.
   - For each behavioral demo step, execute it and confirm the expected
     outcome. Check the box.
   - Commit the checked intent trace with message: `intent-trace: verified`
   - Only then is the queue complete. Proceed to the **Archive** section.

If a task says **BLOCKED**, skip it and move to the next unblocked one.
If all remaining tasks are **BLOCKED** or done, stop and report.

---

## Context

**Already implemented (do not re-implement):**

- Zustand stores: `project-store.ts`, `ui-store.ts`, `selection-store.ts`, `undo-store.ts`, `auth-store.ts` -- all store actions exist and work.
- `useAuth` hook (`src/hooks/useAuth.ts`) -- provides `signOut()` which calls `supabase.auth.signOut()`, clears auth store, and redirects to `/login`.
- `useProject` hook (`src/hooks/useProject.ts`) -- provides `saveProject()` for Supabase persistence.
- `ConfirmDialog` (`src/components/shared/ConfirmDialog.tsx`) -- reusable confirmation modal with `open`, `onClose`, `onConfirm`, `title`, `body`, `confirmLabel`, `variant` props.
- `useKeyboardShortcuts` (`src/hooks/useKeyboardShortcuts.ts`) -- M key calls `uiStore.toggleMixer()`.
- `uiStore` has: `mixerExpanded` (boolean), `toggleMixer()`, `unsavedChanges`, `systemStatus`, `generationState`, `markDirty()`, `markSaved()`.
- `projectStore` has: `removeSection(sectionId)`, `deleteBlock(blockId)`, `duplicateBlock(blockId)`.

**Key facts the agent needs:**

- CLAUDE.md requires `ConfirmDialog` for all destructive actions. No browser `confirm()`/`alert()`.
- CLAUDE.md requires every `<input>` and `<textarea>` to have a unique `id` and a corresponding `<label htmlFor={id}>`.
- StatusBar currently takes a `status` prop of type `AppStatus = "saved" | "generating" | "error"`. It may need to be extended to include "unsaved" state.
- `useAuth()` is a hook -- it can only be called inside a React component, not at the module level.
- `uiStore.systemStatus` type is `'ready' | 'generating' | 'loading-samples' | 'saving' | 'error' | 'offline'`. This is more granular than StatusBar's `AppStatus` type. The mapping will need adjustment.

---

## Delegation Strategy

**File overlap map:**

| Source file | Edited by tasks |
|---|---|
| `src/components/layout/TopBar.tsx` | T1 |
| `src/components/left-panel/SectionContext.tsx` | T2 |
| `src/components/left-panel/BlockContext.tsx` | T2 |
| `src/components/mixer/MixerDrawer.tsx` | T3 |
| `src/components/layout/StatusBar.tsx` | T4 |
| `src/components/layout/AppShell.tsx` | T4 |
| `src/pages/LoginPage.tsx` | T5 |
| `src/pages/SettingsPage.tsx` | T5 |
| `src/hooks/useMobile.ts` | T6 (delete) |

No file overlaps between tasks. All 6 tasks are independent.

**Batch assignments:**

| Batch | Tasks | Mode | Agent prompt |
|---|---|---|---|
| 1 | T1-T6 | sequential | "Read `specs/EXECUTION_QUEUE_critical_fixes.md`. Execute all tasks T1-T6." |

6 tasks, all small, no file overlaps, single agent batch. The final task executes the Intent Trace.

---

## Task Queue

---

### [x] T1 -- Fix Sign Out button (calls saveProject instead of signOut)

**Files:** `src/components/layout/TopBar.tsx`
**Depends on:** none

**Background:**

`TopBar.tsx` (line 170) renders a user avatar dropdown menu. The "Sign out" button at line 342-351 currently calls `saveProject()` (from `useProject`) and closes the menu, but never calls `signOut()`. The `useAuth` hook at `src/hooks/useAuth.ts` exports a `signOut()` function that calls `supabase.auth.signOut()`, clears the auth store, and redirects to `/login`. The component currently imports `useProject` but not `useAuth`.

**What to build:**

**Step 1 -- Read `src/components/layout/TopBar.tsx` first.**

Confirm the Sign Out button at approximately line 342-351 calls `void saveProject()` and `setMenuOpen(false)`.

**Step 2 -- Add the `useAuth` import.**

Add this import at the top of the file, alongside the existing imports:

```tsx
import { useAuth } from "@/hooks/useAuth"
```

**Step 3 -- Call `useAuth` inside the `TopBar` component.**

Inside the `TopBar()` function body (near line 173 where `useProject` is called), add:

```tsx
const { signOut } = useAuth()
```

**Step 4 -- Replace the Sign Out button handler.**

Change the Sign Out button's `onClick` from:

```tsx
onClick={() => {
  void saveProject()
  setMenuOpen(false)
}}
```

to:

```tsx
onClick={() => {
  setMenuOpen(false)
  void signOut()
}}
```

Note: `signOut()` handles the redirect to `/login` internally, so no navigation is needed.

**Verify:**

Compilation:
```
npx tsc --noEmit && npm run build
```

Behavioral:
```
Open the app in the browser at http://localhost:5173. Log in if needed. Click the
user avatar (DW circle) in the top-right corner. Click "Sign out". You should be
redirected to the /login page. The user menu should close and the session should
be cleared.
```

---

### [x] T2 -- Wire Delete Section, Delete Block, and Duplicate Block buttons

**Files:** `src/components/left-panel/SectionContext.tsx`, `src/components/left-panel/BlockContext.tsx`
**Depends on:** none

**Background:**

`SectionContext.tsx` has a "Delete Section" button at line 314-319 with no `onClick` handler. `BlockContext.tsx` has a "Duplicate Block" button at line 312-317 and a "Delete Block" button at line 318-323, both with no `onClick` handlers. The `projectStore` already has `removeSection(sectionId)`, `deleteBlock(blockId)`, and `duplicateBlock(blockId)` actions. Per CLAUDE.md, destructive actions (Delete Section, Delete Block) must use `ConfirmDialog`. Duplicate is not destructive and does not need confirmation. Both delete actions should push undo entries.

**What to build:**

**Step 1 -- Read both files first.**

Read `src/components/left-panel/SectionContext.tsx` and `src/components/left-panel/BlockContext.tsx` to confirm the button locations and current imports.

**Step 2 -- Wire Delete Section in SectionContext.tsx.**

2a. Add `ConfirmDialog` import and `useUndoStore` import:

```tsx
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { useUndoStore } from "@/store/undo-store"
```

2b. Inside the `SectionContext` component, add destructured store actions. The component already imports `useProjectStore` and destructures `sections` and `updateSection`. Add `removeSection` to the destructuring:

```tsx
const { sections, updateSection, removeSection, blocks } = useProjectStore()
```

Also add undo:

```tsx
const { pushUndo } = useUndoStore()
```

2c. Add local state for the confirm dialog:

```tsx
const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
```

2d. Add a handler function:

```tsx
function handleDeleteSection() {
  if (!liveSection) return
  const before = JSON.stringify({ sections, blocks })
  removeSection(liveSection.id)
  const after = JSON.stringify({
    sections: sections.filter((s) => s.id !== liveSection.id),
    blocks: blocks.filter((b) => b.sectionId !== liveSection.id),
  })
  pushUndo("Delete section", before, after)
  setConfirmDeleteOpen(false)
  onClose?.()
}
```

2e. Add `onClick` to the Delete Section button (currently at line 314-319):

Change:
```tsx
<button
  type="button"
  className="mt-6 text-xs text-[#71717a] transition-colors hover:text-red-400"
>
  Delete Section
</button>
```

To:
```tsx
<button
  type="button"
  onClick={() => setConfirmDeleteOpen(true)}
  className="mt-6 text-xs text-[#71717a] transition-colors hover:text-red-400"
>
  Delete Section
</button>
```

2f. Add the `ConfirmDialog` just before the closing `</div>` of the component's root element (before the final `</div>` at line ~321):

```tsx
<ConfirmDialog
  open={confirmDeleteOpen}
  onClose={() => setConfirmDeleteOpen(false)}
  onConfirm={handleDeleteSection}
  title="Delete Section?"
  body={`This will permanently delete "${currentName}" and all its blocks. This cannot be undone.`}
  confirmLabel="Delete"
  variant="danger"
/>
```

**Step 3 -- Wire Delete Block and Duplicate Block in BlockContext.tsx.**

3a. Add imports:

```tsx
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { useUndoStore } from "@/store/undo-store"
```

3b. Expand the destructured values from `useProjectStore`. Currently (line 180):

```tsx
const { blocks } = useProjectStore()
```

Change to:

```tsx
const { blocks, deleteBlock, duplicateBlock } = useProjectStore()
```

Also add:

```tsx
const { pushUndo } = useUndoStore()
```

3c. Add local state for the confirm dialog:

```tsx
const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
```

3d. Add handler functions:

```tsx
function handleDeleteBlock() {
  if (!blockId) return
  // deleteBlock in project-store already pushes an undo entry,
  // so we don't need to push another one here.
  deleteBlock(blockId)
  setConfirmDeleteOpen(false)
  onClose?.()
}

function handleDuplicateBlock() {
  if (!blockId) return
  const before = JSON.stringify({ blocks })
  duplicateBlock(blockId)
  const after = JSON.stringify({ blocks: useProjectStore.getState().blocks })
  pushUndo("Duplicate block", before, after)
}
```

3e. Wire the Duplicate Block button (currently at line 312-317). Change:

```tsx
<button
  type="button"
  className="mt-4 w-full rounded-lg bg-[#3f3f46] py-1.5 text-xs font-medium text-[#d4d4d8] transition-colors hover:bg-[#52525b] hover:text-[#f4f4f5]"
>
  Duplicate Block
</button>
```

To:

```tsx
<button
  type="button"
  onClick={handleDuplicateBlock}
  className="mt-4 w-full rounded-lg bg-[#3f3f46] py-1.5 text-xs font-medium text-[#d4d4d8] transition-colors hover:bg-[#52525b] hover:text-[#f4f4f5]"
>
  Duplicate Block
</button>
```

3f. Wire the Delete Block button (currently at line 318-323). Change:

```tsx
<button
  type="button"
  className="mt-2 text-xs text-[#71717a] transition-colors hover:text-red-400"
>
  Delete Block
</button>
```

To:

```tsx
<button
  type="button"
  onClick={() => setConfirmDeleteOpen(true)}
  className="mt-2 text-xs text-[#71717a] transition-colors hover:text-red-400"
>
  Delete Block
</button>
```

3g. Add the `ConfirmDialog` just before the closing `</div>` of the component's root element:

```tsx
<ConfirmDialog
  open={confirmDeleteOpen}
  onClose={() => setConfirmDeleteOpen(false)}
  onConfirm={handleDeleteBlock}
  title="Delete Block?"
  body={`This will permanently delete this ${label} block (bars ${resolvedStartBar}–${resolvedEndBar}). This cannot be undone.`}
  confirmLabel="Delete"
  variant="danger"
/>
```

**Verify:**

Compilation:
```
npx tsc --noEmit && npm run build
```

Behavioral:
```
Open the app at http://localhost:5173. Generate an arrangement if none exists.

1. Click a block in the arrangement view. The left panel should show the Block
   Inspector. Click "Duplicate Block". A new block with the same instrument
   should appear.

2. Click a block again. Click "Delete Block". A confirmation dialog should appear
   with "Delete Block?" title. Click "Delete" to confirm. The block should be
   removed from the arrangement.

3. Click a section header in the arrangement view. The left panel should show the
   Section Inspector. Click "Delete Section". A confirmation dialog should appear.
   Click "Delete" to confirm. The section and all its blocks should be removed.
```

---

### [x] T3 -- Connect MixerDrawer to uiStore.mixerExpanded

**Files:** `src/components/mixer/MixerDrawer.tsx`
**Depends on:** none

**Background:**

`MixerDrawer.tsx` (line 208) uses `useState(true)` for its open/close state. The keyboard shortcut `M` (in `useKeyboardShortcuts.ts` line 118) calls `uiStore.toggleMixer()`, which toggles `uiStore.mixerExpanded`. But `MixerDrawer` never reads `mixerExpanded` from the store -- it uses its own local `open` state. This means pressing `M` has no visible effect.

**What to build:**

**Step 1 -- Read `src/components/mixer/MixerDrawer.tsx` first.**

Confirm line 208 has `const [open, setOpen] = useState(true)` and line 241 has `onClick={() => setOpen(!open)}`.

**Step 2 -- Import `useUiStore`.**

Add this import at the top of the file:

```tsx
import { useUiStore } from "@/store/ui-store"
```

**Step 3 -- Replace local state with store state.**

Remove this line (currently line 208):

```tsx
const [open, setOpen] = useState(true)
```

Replace with:

```tsx
const open = useUiStore((s) => s.mixerExpanded)
const toggleMixer = useUiStore((s) => s.toggleMixer)
```

**Step 4 -- Update the toggle button handler.**

Change the header button's `onClick` (currently line 241):

From:
```tsx
onClick={() => setOpen(!open)}
```

To:
```tsx
onClick={toggleMixer}
```

**Step 5 -- Clean up unused import.**

Check if `useState` is still used elsewhere in the component. It is used on lines 209 and 210 (`drumSubOpen` and `channels`), so `useState` must remain in the import.

**Verify:**

Compilation:
```
npx tsc --noEmit && npm run build
```

Behavioral:
```
Open the app at http://localhost:5173. Make sure no input field is focused (click
on the arrangement area).

1. Press the M key on the keyboard. The mixer drawer at the bottom should toggle
   open or closed. Press M again -- it should toggle back.

2. Click the "Mixer" header text / X button in the mixer drawer. It should also
   toggle the mixer. Press M after -- the state should remain synchronized
   (pressing M toggles whatever the current state is).
```

---

### [ ] T4 -- Wire StatusBar to actual system status

**Files:** `src/components/layout/StatusBar.tsx`, `src/components/layout/AppShell.tsx`
**Depends on:** none

**Background:**

`StatusBar.tsx` takes a `status` prop of type `AppStatus = "saved" | "generating" | "error"` and defaults to `"saved"`. `AppShell.tsx` renders `<StatusBar />` on line 68 without passing any props, so the status bar always shows "Saved" with a green dot. The `uiStore` tracks `unsavedChanges` (boolean), `generationState` (`'idle' | 'generating' | 'error'`), and `systemStatus` (`'ready' | 'generating' | 'loading-samples' | 'saving' | 'error' | 'offline'`). We need to derive the correct status and pass it to StatusBar.

**What to build:**

**Step 1 -- Read both files first.**

Read `src/components/layout/StatusBar.tsx` and `src/components/layout/AppShell.tsx` to confirm the current state.

**Step 2 -- Extend StatusBar's `AppStatus` type.**

In `StatusBar.tsx`, change the type and config to add an "unsaved" state:

Change:
```tsx
export type AppStatus = "saved" | "generating" | "error"

const STATUS_CONFIG: Record<
  AppStatus,
  { dot: string; label: string }
> = {
  saved: {
    dot: "bg-[#22c55e]",
    label: "Saved",
  },
  generating: {
    dot: "bg-[#fbbf24] animate-pulse",
    label: "Generating\u2026",
  },
  error: {
    dot: "bg-[#ef4444]",
    label: "Error",
  },
}
```

To:
```tsx
export type AppStatus = "saved" | "unsaved" | "saving" | "generating" | "error"

const STATUS_CONFIG: Record<
  AppStatus,
  { dot: string; label: string }
> = {
  saved: {
    dot: "bg-[#22c55e]",
    label: "Saved",
  },
  unsaved: {
    dot: "bg-[#fbbf24]",
    label: "Unsaved changes",
  },
  saving: {
    dot: "bg-[#3b82f6] animate-pulse",
    label: "Saving\u2026",
  },
  generating: {
    dot: "bg-[#fbbf24] animate-pulse",
    label: "Generating\u2026",
  },
  error: {
    dot: "bg-[#ef4444]",
    label: "Error",
  },
}
```

**Step 3 -- Wire AppShell to pass the derived status.**

In `AppShell.tsx`, the component already imports `useUiStore` (line 11) and destructures `unsavedChanges` (line 25). Add more state reads.

Change the destructuring at line 25:

From:
```tsx
const { unsavedChanges } = useUiStore();
```

To:
```tsx
const { unsavedChanges, generationState, systemStatus } = useUiStore();
```

Then, add a derived status computation before the return statement (e.g., after the auto-save `useEffect`):

```tsx
/* Derive StatusBar status from uiStore */
const derivedStatus: import("./StatusBar").AppStatus =
  systemStatus === 'error' ? 'error' :
  generationState === 'generating' ? 'generating' :
  systemStatus === 'saving' ? 'saving' :
  unsavedChanges ? 'unsaved' :
  'saved';
```

**Step 4 -- Pass the derived status to StatusBar.**

Change:
```tsx
<StatusBar />
```

To:
```tsx
<StatusBar status={derivedStatus} />
```

**Verify:**

Compilation:
```
npx tsc --noEmit && npm run build
```

Behavioral:
```
Open the app at http://localhost:5173 and open a project.

1. Without making any changes, the status bar at the bottom-left should show a
   green dot and "Saved".

2. Edit the project name in the top bar (click the name, type a new name, press
   Enter). The status bar should change to a yellow dot and "Unsaved changes".

3. Press Cmd+S (or Ctrl+S) to save. After the save completes, the status bar
   should return to a green dot and "Saved".

4. If you have a generated arrangement, click the "Generate" button. While
   generating, the status bar should show a pulsing yellow dot and
   "Generating...".
```

---

### [ ] T5 -- Fix unlabeled form inputs (accessibility)

**Files:** `src/pages/LoginPage.tsx`, `src/pages/SettingsPage.tsx`
**Depends on:** none

**Background:**

CLAUDE.md requires: "Must give every `<input>` and `<textarea>` a unique `id` attribute and a corresponding `<label htmlFor={id}>`. No unlabeled form fields." Both LoginPage and SettingsPage have inputs that violate this rule. LoginPage has email and password inputs without `id` attributes, and their labels lack `htmlFor`. SettingsPage has a display name input, two radio buttons, and a select element all without `id` attributes and with labels lacking `htmlFor`.

**What to build:**

**Step 1 -- Read both files first.**

Read `src/pages/LoginPage.tsx` and `src/pages/SettingsPage.tsx` to confirm the current state of form elements.

**Step 2 -- Fix LoginPage.tsx inputs.**

2a. The email input (around line 81-89). Add `id="login-email"` to the input, and add `htmlFor="login-email"` to its label.

Change the email form-control block:
```tsx
<div className="form-control gap-1">
  <label className="label py-0">
    <span className="label-text text-xs text-base-content/70">Email</span>
  </label>
  <input
    type="email"
    className="input input-bordered input-sm"
```

To:
```tsx
<div className="form-control gap-1">
  <label className="label py-0" htmlFor="login-email">
    <span className="label-text text-xs text-base-content/70">Email</span>
  </label>
  <input
    id="login-email"
    type="email"
    className="input input-bordered input-sm"
```

2b. The password input (around line 92-105). Add `id="login-password"` to the input, and add `htmlFor="login-password"` to its label.

Change the password form-control block:
```tsx
<div className="form-control gap-1">
  <label className="label py-0">
    <span className="label-text text-xs text-base-content/70">Password</span>
  </label>
  <input
    type="password"
    className="input input-bordered input-sm"
```

To:
```tsx
<div className="form-control gap-1">
  <label className="label py-0" htmlFor="login-password">
    <span className="label-text text-xs text-base-content/70">Password</span>
  </label>
  <input
    id="login-password"
    type="password"
    className="input input-bordered input-sm"
```

**Step 3 -- Fix SettingsPage.tsx inputs.**

3a. The display name input (around line 77-83). Add `id="settings-display-name"` to the input, and add `htmlFor="settings-display-name"` to its label.

Change:
```tsx
<div className="form-control gap-2">
  <label className="label py-0">
    <span className="label-text font-medium">Display Name</span>
  </label>
  <input
    type="text"
    className="input input-bordered"
```

To:
```tsx
<div className="form-control gap-2">
  <label className="label py-0" htmlFor="settings-display-name">
    <span className="label-text font-medium">Display Name</span>
  </label>
  <input
    id="settings-display-name"
    type="text"
    className="input input-bordered"
```

3b. The "Letter names" radio button (around line 93-101). Add `id="settings-chord-letter"` to the radio input, and add `htmlFor="settings-chord-letter"` to its wrapping label.

Change:
```tsx
<label className="flex items-center gap-2 cursor-pointer">
  <input
    type="radio"
    className="radio radio-primary radio-sm"
    checked={chordMode === 'letter'}
    onChange={() => setChordMode('letter')}
  />
  <span className="text-sm">Letter names</span>
  <span className="text-xs text-base-content/40">(C, Dm7, G7)</span>
</label>
```

To:
```tsx
<label htmlFor="settings-chord-letter" className="flex items-center gap-2 cursor-pointer">
  <input
    id="settings-chord-letter"
    type="radio"
    className="radio radio-primary radio-sm"
    checked={chordMode === 'letter'}
    onChange={() => setChordMode('letter')}
  />
  <span className="text-sm">Letter names</span>
  <span className="text-xs text-base-content/40">(C, Dm7, G7)</span>
</label>
```

3c. The "Roman numerals" radio button (around line 103-111). Add `id="settings-chord-roman"` and `htmlFor="settings-chord-roman"`.

Change:
```tsx
<label className="flex items-center gap-2 cursor-pointer">
  <input
    type="radio"
    className="radio radio-primary radio-sm"
    checked={chordMode === 'roman'}
    onChange={() => setChordMode('roman')}
  />
  <span className="text-sm">Roman numerals</span>
  <span className="text-xs text-base-content/40">(I, ii7, V7)</span>
</label>
```

To:
```tsx
<label htmlFor="settings-chord-roman" className="flex items-center gap-2 cursor-pointer">
  <input
    id="settings-chord-roman"
    type="radio"
    className="radio radio-primary radio-sm"
    checked={chordMode === 'roman'}
    onChange={() => setChordMode('roman')}
  />
  <span className="text-sm">Roman numerals</span>
  <span className="text-xs text-base-content/40">(I, ii7, V7)</span>
</label>
```

3d. The genre select (around line 122-131). Add `id="settings-genre"` to the select, and add `htmlFor="settings-genre"` to its label.

Change:
```tsx
<div className="form-control gap-2">
  <label className="label py-0">
    <span className="label-text font-medium">Default Genre</span>
    <span className="label-text-alt text-base-content/40">Pre-selected when creating a new project</span>
  </label>
  <select
    className="select select-bordered"
```

To:
```tsx
<div className="form-control gap-2">
  <label className="label py-0" htmlFor="settings-genre">
    <span className="label-text font-medium">Default Genre</span>
    <span className="label-text-alt text-base-content/40">Pre-selected when creating a new project</span>
  </label>
  <select
    id="settings-genre"
    className="select select-bordered"
```

**Verify:**

Compilation:
```
npx tsc --noEmit && npm run build
```

Behavioral:
```
1. Open http://localhost:5173/login. Click the "Email" label text. The email
   input should receive focus. Click the "Password" label text. The password
   input should receive focus.

2. Navigate to http://localhost:5173/settings (log in first if needed). Click the
   "Display Name" label text. The display name input should receive focus. Click
   the "Letter names" label text. The Letter names radio button should become
   selected. Click the "Roman numerals" label text. The Roman numerals radio
   should become selected. Click the "Default Genre" label text. The genre select
   should receive focus.
```

---

### [ ] T6 -- Delete dead code (useMobile.ts)

**Files:** `src/hooks/useMobile.ts` (delete)
**Depends on:** none

**Background:**

`src/hooks/useMobile.ts` exports a `useIsMobile` hook that is not imported by any file in the project. It is dead code and should be deleted. The file is 19 lines long and contains a media query breakpoint check that was never wired into any component.

**What to build:**

**Step 1 -- Verify the file is unused.**

Run a grep across the entire `src/` directory for any import or reference to `useMobile` or `useIsMobile`. Confirm zero results (excluding the file itself).

```bash
grep -r "useMobile\|useIsMobile" src/ --include="*.ts" --include="*.tsx" | grep -v "useMobile.ts"
```

This should return empty.

**Step 2 -- Delete the file.**

```bash
rm src/hooks/useMobile.ts
```

**Verify:**

Compilation:
```
npx tsc --noEmit && npm run build
```

Behavioral:
```
Confirm the file no longer exists:
ls src/hooks/useMobile.ts
This should return "No such file or directory".

The app should run normally at http://localhost:5173 with no errors in the
browser console related to missing imports.
```

---

## Completion Check

When all boxes are checked, run the full suite one final time:

```
npx vitest run
```

All tests must pass. Then perform the fresh eyes review:

**Fresh eyes review (one pass only).** Re-read every file you modified with
fresh eyes. Look for: schema mismatches, SQL WHERE gaps, missing imports,
dead code, edge cases the tests don't cover, security issues (XSS, injection,
SSRF). "Look both ways down one-way streets." Report any findings and fix
them before proceeding. Do NOT run this review a second time -- one pass is
high-value, repeated passes have near-zero yield.

Then perform the behavioral smoke test:

**Smoke test:**
1. Open the app, log in, open a project. Press M -- mixer toggles. Press M again -- mixer toggles back.
2. Edit the project name. Status bar shows "Unsaved changes" (yellow). Press Cmd+S. Status bar shows "Saved" (green).
3. Click a block, click "Delete Block" in the inspector. Confirm dialog appears. Confirm deletion. Block is removed.
4. Click the user avatar, click "Sign out". You are redirected to /login.

## Intent Trace

After all tasks pass, verify the *system-level behavior* matches the original intent.

**Original intent:** Fix 6 critical bugs where UI elements are broken, disconnected from state, or missing accessibility attributes -- so that buttons do what their labels say, the status bar reflects reality, form inputs are accessible, and dead code is removed.

### Structural (code wiring)

- [ ] Sign Out button calls `signOut()` from `useAuth` -> `TopBar.tsx` Sign Out onClick handler
- [ ] Delete Section button opens `ConfirmDialog` and calls `removeSection()` on confirm -> `SectionContext.tsx` Delete Section onClick + ConfirmDialog
- [ ] Delete Block button opens `ConfirmDialog` and calls `deleteBlock()` on confirm -> `BlockContext.tsx` Delete Block onClick + ConfirmDialog
- [ ] Duplicate Block button calls `duplicateBlock()` -> `BlockContext.tsx` Duplicate Block onClick
- [ ] MixerDrawer reads `mixerExpanded` from `uiStore` (not local state) -> `MixerDrawer.tsx` `useUiStore` selector
- [ ] MixerDrawer toggle button calls `uiStore.toggleMixer()` -> `MixerDrawer.tsx` header button onClick
- [ ] StatusBar receives derived status from AppShell -> `AppShell.tsx` passes `status={derivedStatus}` to `<StatusBar>`
- [ ] StatusBar supports "unsaved" and "saving" states -> `StatusBar.tsx` `AppStatus` type and `STATUS_CONFIG`
- [ ] LoginPage email input has `id="login-email"` with matching `<label htmlFor>` -> `LoginPage.tsx`
- [ ] LoginPage password input has `id="login-password"` with matching `<label htmlFor>` -> `LoginPage.tsx`
- [ ] SettingsPage display name input has `id="settings-display-name"` with matching `<label htmlFor>` -> `SettingsPage.tsx`
- [ ] SettingsPage radio buttons have `id` and `htmlFor` -> `SettingsPage.tsx`
- [ ] SettingsPage genre select has `id="settings-genre"` with matching `<label htmlFor>` -> `SettingsPage.tsx`
- [ ] `src/hooks/useMobile.ts` no longer exists on disk -> file system check

### Behavioral (end-to-end demo)

**Demo scenario:** A skeptical observer follows these steps on the live app.

- [ ] Step: Click the user avatar in the top-right, then click "Sign out".
  - Expect: The browser navigates to `/login`. The user is logged out.

- [ ] Step: Log in. Open a project. Click a section header in the arrangement view. In the left panel Section Inspector, click "Delete Section".
  - Expect: A confirmation dialog appears with "Delete Section?" title and a red "Delete" button.

- [ ] Step: Click "Delete" in the dialog.
  - Expect: The section and its blocks disappear from the arrangement view.

- [ ] Step: Click a block in the arrangement view. In the left panel Block Inspector, click "Duplicate Block".
  - Expect: A new block appears in the arrangement (may overlap the original since it has the same bar range).

- [ ] Step: Click a block. Click "Delete Block" in the Block Inspector.
  - Expect: A confirmation dialog appears. Click "Delete". The block disappears.

- [ ] Step: Click on the arrangement area (no input focused). Press the M key.
  - Expect: The mixer drawer at the bottom toggles open or closed. Press M again to toggle back.

- [ ] Step: Edit the project name (click name in top bar, type new name, press Enter).
  - Expect: The status bar at the bottom-left changes from green "Saved" to yellow "Unsaved changes".

- [ ] Step: Press Cmd+S (or Ctrl+S).
  - Expect: The status bar returns to green "Saved" after the save completes.

- [ ] Step: Open `/login` page. Click the "Email" label text.
  - Expect: The email input field receives focus.

- [ ] Step: Open `/settings` page. Click the "Display Name" label text.
  - Expect: The display name input field receives focus.

Critical fixes queue is complete when all tests pass AND both intent trace sections are fully checked.

## Archive

When this queue is fully complete (all task boxes checked, all intent trace boxes
checked, all tests green), move this file to the `historical/` subdirectory:

```bash
mv specs/EXECUTION_QUEUE_critical_fixes.md specs/historical/
git add -A specs/ && git commit -m "chore: archive completed execution queue critical_fixes"
```
