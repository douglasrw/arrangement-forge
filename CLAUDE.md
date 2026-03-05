# Arrangement Forge

## Repo Locations
- **Local (macOS):** `/Users/dwalseth/data/projects/arrangement-forge`
- **Server (myserver):** `/data/projects/arrangement-forge`

---

## Project Overview

Arrangement Forge is an AI-powered SaaS for musicians to create professional backing tracks. The MVP targets solo practice: musician + laptop + backing track. The core paradigm is a bar-level block sequencer (not a piano-roll or DAW). See [ARCHITECTURE.md](ARCHITECTURE.md) for the full technical specification.

## Quick Reference

| Task | Command |
|------|---------|
| Dev server | `npm run dev` (port 5173, access via MacBook tunnel) |
| Build check | `npm run build` |
| Unit tests | `npx vitest run` |
| Type check | `npx tsc --noEmit` |

## Agent Required Reading

Every implementation agent must read these documents before starting work:

| # | Document | Purpose |
|---|----------|---------|
| 1 | `CLAUDE.md` (this file) | Constraints, conventions, guardrails |
| 2 | `ARCHITECTURE.md` | Data model, project structure, API contracts, audio engine |
| 3 | `DESIGN_SYSTEM.md` | Visual design tokens, component patterns, golden screenshots |
| 4 | Assigned spec in `specs/` | Specific requirements, files to create, dependencies |

For UI tasks, also read: `src/styles/globals.css` (theme token definitions)

## Global Protocols

Global rules from `~/.claude/CLAUDE.md` apply to ALL projects and override project-local conventions where they conflict:

- **Dispatcher Protocol:** Main thread is a dispatcher, not a worker. Substantive work (multi-file edits, test runs, builds) runs in background agents. Only trivial single-tool actions stay inline.
- **Spec & Planning Rules:** Never use `EnterPlanMode` for specs. Use `/engineering-coach` planning mode. Multi-task specs (3+) use `~/.claude/templates/execution-queue.md`.
- **Context Hygiene:** Commit early and often. Write decisions to files immediately. After compaction, auto-recover via `TaskList`, `docs/plans/DISPATCH_LEDGER.md`, and `git branch -a | grep spec/`.
- **Playwright on this server:** `source ~/.secrets.env && PATH="/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH" npx tsx <script>`
- **MacBook bridge, screenshots, file transfer, port forwarding:** See global `~/.claude/CLAUDE.md`.

---

## Tech Stack Quick Reference

| Layer | Tech | Version |
|---|---|---|
| Frontend | React + TypeScript + Vite | React 19 |
| Styling | Tailwind CSS v4 (custom `forge` dark theme via CSS custom properties) | Tailwind 4 |
| Audio | Tone.js + Web Audio API | |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) | |
| Deployment | Vercel (frontend), Supabase (backend) | |
| Package manager | npm | |
| Testing | Vitest (unit), Playwright (e2e) | |
| Linting | ESLint | |

---

## Code Conventions

- **File naming:** kebab-case for files, PascalCase for React components, camelCase for functions/variables
- **No barrel re-exports** except `types/index.ts`. Import directly from the source file.
- **Types barrel:** Import shared types via `import { Project } from '@/types'`
- **Path alias:** Use `@/` for all `src/` imports (e.g., `@/lib/chords`, `@/store/project-store`)
- **DB field mapping:** Database uses snake_case, TypeScript uses camelCase. Transform in the `useProject` hook at the boundary.
- **All timestamps:** ISO 8601 strings
- **All UUIDs:** `string` type
- **Bar numbering:** 1-indexed throughout. Bar 1 is the first bar.
- **Chord storage:** Roman numerals internally. Letter names computed at display time from key + degree.
- **Block spans:** `start_bar` and `end_bar` are inclusive.
- **Null = inherited:** Any `_override` field that is `null` means "inherit from parent level."
- Use the `forge` theme's CSS custom property classes (`bg-background`, `bg-primary`, `text-foreground`, `bg-card`, `border-border`, etc.) defined in `src/styles/globals.css`
- Reference design system (`src/styles/globals.css` theme tokens) for all visual styling decisions
- No custom CSS framework — only Tailwind utilities + forge theme tokens
- Zustand for global state, React `useState` for component-local UI only
- No prop drilling beyond 2 levels — use stores
- Functional components only, no class components
- Named exports for all files. Default exports only for page/route components in `src/pages/`.

---

## Musts

These are absolute requirements. Every agent must follow all of them.

- **Must** read ARCHITECTURE.md before starting any task
- **Must** use types from `src/types/` — never inline type definitions for shared types
- **Must** use `formatChord()` from `src/lib/chords.ts` for ALL chord display
- **Must** use `resolveStyle()` from `src/lib/style-cascade.ts` for ALL cascade resolution
- **Must** use `GENRE_SUBSTYLES` and `GENRE_SLIDERS` from `src/lib/genre-config.ts` for genre/style configuration
- **Must** push undo entries via `undoStore` for all destructive mutations
- **Must** call `markDirty()` on all data changes that need persistence
- **Must** handle pre-gen and post-gen states (check `uiStore.generationState`)
- **Must** use `ConfirmDialog` from `src/components/shared/ConfirmDialog.tsx` for destructive actions
- **Must** use the Supabase JS client for all database operations — no custom REST endpoints
- **Must** use the `forge` theme color tokens (CSS custom property classes like `bg-background`, `bg-primary`, `text-foreground`, `bg-card`, `border-border`) — never hardcode hex colors in components
- **Must** verify UI tasks with Playwright visual assertions (screenshots + DOM checks), not just `npm run build`
- **Must not** iterate more than once on a UI fix without a screenshot. After one failure: STOP, get screenshot, write Playwright assertions, fresh context.
- **Must** give every `<input>` and `<textarea>` a unique `id` attribute and a corresponding `<label htmlFor={id}>`. No unlabeled form fields.
- **Must** include `SET search_path = public` in any Supabase `SECURITY DEFINER` function and use fully qualified table names (e.g., `public.profiles`). Without this, trigger functions fail silently.
- **Must** run accessibility tests (`npx playwright test tests/accessibility.spec.ts`) before shipping UI changes
- **Must not** use fixed pixel widths (`w-[Npx]`) with `shrink-0` in flex or grid children — causes overflow in variable-width containers. Use `flex-1`, CSS grid columns, or percentage widths.

---

## Must-Nots

These are hard prohibitions. Violating any of these requires stopping and escalating.

- **Must not** add dependencies not listed in ARCHITECTURE.md without escalating
- **Must not** create files not listed in the task's "Creates" section without escalating
- **Must not** write CSS-in-JS (styled-components, emotion, CSS modules, etc.)
- **Must not** use class components
- **Must not** use default exports for non-page files
- **Must not** add barrel re-exports to any file except `types/index.ts`
- **Must not** store Tone.js objects or DOM refs in Zustand stores (keep them in module-scoped variables or React refs)
- **Must not** use browser `confirm()`, `alert()`, or `prompt()` — use `ConfirmDialog` or custom UI
- **Must not** implement actual AI/LLM responses — placeholder/stub only for MVP
- **Must not** add emoji to the UI unless the specification explicitly says so
- **Must not** create README.md or documentation files
- **Must not** use DaisyUI classes — DaisyUI has been removed. Use Tailwind utilities + forge theme tokens from `src/styles/globals.css`.
- **Must not** send `user_id` from the client in Supabase inserts — use `DEFAULT auth.uid()` on the column so Postgres sets it from the JWT. Sending from client breaks RLS policies.

---

## Preferences

Soft rules. Follow these unless there's a clear reason not to.

- Prefer `interface` over `type` for object shapes
- Prefer named exports over default exports
- Prefer early return over nested if/else
- Prefer Tailwind utility classes over inline styles
- Prefer forge theme token classes (`bg-primary`, `text-muted-foreground`, `border-border`) over raw color values
- Prefer computed/derived values over duplicated state
- Keep components under 200 lines — extract sub-components if larger
- Keep functions under 50 lines

---

## Pre-Commit Checks (Automated Enforcement)

Binary CLAUDE.md rules are enforced by pre-commit hooks. Commits that violate these rules are **automatically blocked** — no bypass is possible (`--no-verify` is denied in `.claude/settings.json`).

**How it works:** `husky` runs `lint-staged` on every commit. Lint-staged passes staged `.ts/.tsx` files to `scripts/run-checks.sh`, which auto-discovers and runs every `.sh` script in `scripts/checks/`.

**Active checks:**

| Check | CLAUDE.md Rule |
|-------|---------------|
| `no-hardcoded-colors` | Must use forge theme tokens, never hardcode hex |
| `no-browser-dialogs` | Must not use `confirm()`/`alert()`/`prompt()` |
| `no-default-exports` | Named exports only (except `src/pages/`) |
| `no-css-in-js` | Must not use styled-components, emotion, CSS modules |
| `no-barrel-reexports` | No `export *` except `src/types/index.ts` |
| `no-class-components` | Functional components only |
| `no-wireframe-theme` | Must not use DaisyUI (removed) |
| `no-client-user-id` | Must not send user_id from client in Supabase inserts |
| `no-fixed-width-shrink` | Never use `w-[Npx]` with `shrink-0` in flex/grid children |

**Disabled (needs rewrite):** `no-unlabeled-inputs.sh.disabled` — single-line grep can't handle multi-line JSX props. Rule remains enforced as prose only.

**To add a new check:** Drop a `.sh` file in `scripts/checks/`. No config changes needed. The script receives staged file paths as `$@` and should exit non-zero to block the commit. **Always validate new checks against the real codebase** (`bash scripts/run-checks.sh src/**/*.tsx`) before committing — see the "Enforcement Without Validation" anti-pattern.

**Existing tech debt:** ~16 files have pre-existing hardcoded hex colors. Touching these files for any reason will trigger the color check. Fix the hex colors in your changes, or remediate the whole file.

---

## Testing

- **Unit tests** for all `src/lib/` functions — Vitest
- **Store tests** for all `src/store/` actions — Vitest
- **UI verification:** Playwright screenshots + DOM checks for visual tasks (not a full e2e suite — targeted assertions only)
- **Test file location:** colocated as `{name}.test.ts` next to the source file (e.g., `chords.test.ts` next to `chords.ts`)

---

## Escalation Triggers

Stop and ask when any of these occur:

- Task requires a dependency not listed in ARCHITECTURE.md
- Task needs to create files not listed in its "Creates" section
- Two tasks have conflicting requirements
- A store action would break invariants (overlapping blocks, gaps in sections, duplicate sort orders)
- Audio engine requires features Tone.js doesn't support
- Task requires modifying a file owned by another task (check the "Creates" section of other tasks)

---

## Development Access

- **Vite dev server:** `npm run dev` on the server, binds to `0.0.0.0:5173`. Accessible on MacBook at `localhost:5173` via persistent port forward.
- **Supabase:** Credentials in `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Hosted Supabase project — no local instance.
- **All other infra** (MacBook bridge, screenshots, file transfer, port forwarding): see global `~/.claude/CLAUDE.md`.

---

## Credentials

Project prefix: `AF` (in `~/.secrets.env`)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_AF_URL` | Supabase project URL |
| `SUPABASE_AF_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_AF_SERVICE_ROLE` | Supabase service role (admin) |
| `SUPABASE_AF_DB_PASSWORD` | Postgres DB password (for `psql` migrations) |
| `AF_TEST_EMAIL` | Playwright test user email |
| `AF_TEST_PASSWORD` | Playwright test user password |

For Playwright scripts: `source ~/.secrets.env` before running. Use `$AF_TEST_EMAIL` and `$AF_TEST_PASSWORD` for authentication.

For SQL migrations via `psql`:
```bash
source ~/.secrets.env
PGPASSWORD=$SUPABASE_AF_DB_PASSWORD psql -h db.docuovyxdejyhawbmiqm.supabase.co -U postgres -d postgres -c "SQL HERE"
```

**Note:** `SUPABASE_AF_DB_PASSWORD` must be added to `~/.secrets.env` before agents can run migrations directly. Until then, SQL must be run via the Supabase dashboard.

---

## Git Workflow

- One commit per task completion
- Commit message format (execution queues): `T{ID}: {task title}` (e.g., `T03: Zustand stores`)
- Commit message format (ad-hoc work): `feat:`, `fix:`, `chore:`, `refactor:` prefix + short description
- Never commit: `node_modules/`, `.env.local`, `dist/`
