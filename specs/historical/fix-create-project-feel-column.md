# Fix Project Creation: Missing `feel` Column

## Problem Statement

Project creation is completely broken. Clicking "+ New Project" on the library page silently fails because `useProject.createProject()` sends `feel: 50` in the insert payload, but the `projects` table in Supabase has no `feel` column. The Supabase API returns HTTP 400 with error `PGRST204: Could not find the 'feel' column of 'projects' in the schema cache`. No error is shown to the user -- the button simply does nothing.

This is the highest-priority bug because it blocks all new users from using the app at all.

## Screenshot Reference

`/tmp/audit-new-project.png` -- library still shows "0 projects" after clicking "+ New Project"

## Root Cause

1. The `feel` field exists in TypeScript types (`src/types/project.ts` line 24, line 118) and is used throughout the codebase (style cascade, MIDI generation, drum patterns, genre config).
2. The database migration (`supabase/migrations/001_initial_schema.sql`) never created a `feel` column on the `projects` table.
3. `src/hooks/useProject.ts` line 177 sends `feel: 50` in the insert payload, causing the 400 error.
4. Similarly, `saveProject()` will fail when saving any project that includes the `feel` field via `camelToSnake()`.

## Acceptance Criteria

1. A new Supabase migration adds the `feel` column to the `projects` table: `ALTER TABLE public.projects ADD COLUMN feel integer DEFAULT 50;`
2. Also add `feel_override` to `sections` table if missing (check `style-cascade.ts` line 43 references `section.feelOverride`): `ALTER TABLE public.sections ADD COLUMN feel_override integer DEFAULT NULL;`
3. After the migration, `createProject()` succeeds and navigates to `/project/:id`
4. `listProjects()` returns projects with the `feel` field populated
5. The style cascade for `feel` works end-to-end (project -> section override)

## Constraints

- Must run the migration against the live Supabase instance (ref: `docuovyxdejyhawbmiqm`)
- Must not break existing project data (use `DEFAULT 50` so existing rows get a value)
- Must verify with a Playwright test that "+ New Project" creates a project and navigates to the editor

## Files to Modify

- `supabase/migrations/002_add_feel_column.sql` (CREATE)
- No TypeScript changes needed -- the code already expects `feel` to exist

## Verification

1. Run the migration SQL against Supabase
2. Open the app, click "+ New Project", confirm navigation to `/project/:id`
3. Verify `listProjects` returns the new project
