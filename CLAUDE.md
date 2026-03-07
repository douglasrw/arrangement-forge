# Arrangement Forge

**Authority order:** CLAUDE.md > ARCHITECTURE.md > DESIGN_SYSTEM.md > specs/

## Repo Locations
- **Local (macOS):** `/Users/dwalseth/data/projects/arrangement-forge`
- **Server (myserver):** `/data/projects/arrangement-forge`

## Quick Reference

| Task | Command |
|------|---------|
| Dev server | `npm run dev` (port 5173, access via MacBook tunnel) |
| Build check | `npm run build` |
| Unit tests | `npx vitest run` |
| Type check | `npx tsc --noEmit` |

## Agent Required Reading

| # | Document | Purpose |
|---|----------|---------|
| 1 | `CLAUDE.md` | Constraints, guardrails |
| 2 | `ARCHITECTURE.md` | Data model, project structure, API contracts, code conventions |
| 3 | `DESIGN_SYSTEM.md` | Visual design tokens, component patterns |
| 4 | Assigned spec in `specs/` | Task-specific requirements |

For UI tasks, also read: `src/styles/globals.css`

## Musts

- Read ARCHITECTURE.md before starting any task
- Use types from `src/types/` -- never inline shared type definitions
- Use `formatChord()` from `src/lib/chords.ts` for all chord display
- Use `resolveStyle()` from `src/lib/style-cascade.ts` for all cascade resolution
- Use `GENRE_SUBSTYLES` and `GENRE_SLIDERS` from `src/lib/genre-config.ts` for genre/style config
- Push undo entries via `undoStore` for all destructive mutations
- Call `markDirty()` on all data changes that need persistence
- Handle pre-gen and post-gen states (check `uiStore.generationState`)
- Use `ConfirmDialog` from `src/components/shared/ConfirmDialog.tsx` for destructive actions
- Use the Supabase JS client for all database operations -- no custom REST endpoints
- Verify UI tasks with Playwright visual assertions (screenshots + DOM checks), not just build
- Stop after one failed UI fix iteration -- get screenshot, write Playwright assertions, fresh context
- Give every `<input>` and `<textarea>` a unique `id` and a corresponding `<label htmlFor={id}>`
- Include `SET search_path = public` in Supabase `SECURITY DEFINER` functions; use fully qualified table names
- Run accessibility tests (`npx playwright test tests/accessibility.spec.ts`) before shipping UI changes

## Must-Nots

- Do not add dependencies not listed in ARCHITECTURE.md without escalating
- Do not create files not listed in the task's "Creates" section without escalating
- Do not store Tone.js objects or DOM refs in Zustand stores (use module-scoped vars or React refs)
- Do not implement actual AI/LLM responses -- placeholder/stub only for MVP
- Do not add emoji to the UI unless the spec explicitly says so
- Do not create README.md or documentation files

## Preferences

- Prefer `interface` over `type` for object shapes
- Prefer early return over nested if/else
- Prefer Tailwind utility classes over inline styles
- Prefer computed/derived values over duplicated state
- Keep components under 200 lines; functions under 50 lines

## Escalation Triggers

- Dependency not in ARCHITECTURE.md
- File not in task's "Creates" section
- Conflicting task requirements
- Store action would break invariants (overlapping blocks, gaps, duplicate sort orders)
- Audio engine needs unsupported Tone.js features
- Modifying a file owned by another task

## Reference (load on demand)

| Topic | Location |
|-------|----------|
| Credentials | `~/.secrets.env`, prefix `AF`. Variables: `SUPABASE_AF_URL`, `SUPABASE_AF_ANON_KEY`, `SUPABASE_AF_SERVICE_ROLE`, `SUPABASE_AF_DB_PASSWORD`, `AF_TEST_EMAIL`, `AF_TEST_PASSWORD` |
| Dev access | Vite on `0.0.0.0:5173`, MacBook via tunnel. Supabase creds in `.env.local`. |
| Testing | Vitest (unit, colocated `{name}.test.ts`). Playwright (UI verification, not full e2e). |
| Git workflow | One commit per task. Format: `T{ID}: {title}` or `feat:`/`fix:`/`chore:`/`refactor:`. Never commit `node_modules/`, `.env.local`, `dist/`. |
| psql migrations | `source ~/.secrets.env && PGPASSWORD=$SUPABASE_AF_DB_PASSWORD psql -h db.docuovyxdejyhawbmiqm.supabase.co -U postgres -d postgres -c "SQL"` |
