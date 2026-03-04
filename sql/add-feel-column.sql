-- Run manually in Supabase SQL Editor before deploying T1+

-- Add feel column (humanization, was previously called groove)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS feel integer NOT NULL DEFAULT 50;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS feel_override integer;

-- Migrate existing data: copy old groove (humanization) values into feel
UPDATE projects SET feel = groove;

-- Reset groove to 50 (it now means complexity; 50 = medium)
UPDATE projects SET groove = 50;
UPDATE sections SET groove_override = NULL;
