-- Migration: Add feel column to projects and feel_override to sections
-- Fixes: Project creation fails because useProject.createProject() sends feel: 50
-- but the column doesn't exist in the database.
-- See: specs/fix-create-project-feel-column.md

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS feel integer DEFAULT 50;
ALTER TABLE public.sections ADD COLUMN IF NOT EXISTS feel_override integer DEFAULT NULL;
