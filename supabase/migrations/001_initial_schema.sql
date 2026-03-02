-- Arrangement Forge — Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Apply via Supabase SQL Editor: https://supabase.com/dashboard/project/docuovyxdejyhawbmiqm/sql/new

-- ============================================================
-- TABLES
-- ============================================================

-- profiles: Extended user profile (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  chord_display_mode text NOT NULL DEFAULT 'letter' CHECK (chord_display_mode IN ('letter', 'roman')),
  default_genre text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- projects: Song/arrangement workspaces
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled Project',
  key text NOT NULL DEFAULT 'C',
  tempo integer NOT NULL DEFAULT 120 CHECK (tempo >= 40 AND tempo <= 240),
  time_signature text NOT NULL DEFAULT '4/4',
  genre text NOT NULL DEFAULT 'Jazz',
  sub_style text NOT NULL DEFAULT 'Swing',
  energy integer NOT NULL DEFAULT 50 CHECK (energy >= 0 AND energy <= 100),
  groove integer NOT NULL DEFAULT 50 CHECK (groove >= 0 AND groove <= 100),
  swing_pct integer CHECK (swing_pct IS NULL OR (swing_pct >= 50 AND swing_pct <= 80)),
  dynamics integer NOT NULL DEFAULT 50 CHECK (dynamics >= 0 AND dynamics <= 100),
  generation_hints text NOT NULL DEFAULT '',
  chord_chart_raw text NOT NULL DEFAULT '',
  has_arrangement boolean NOT NULL DEFAULT false,
  generated_at timestamptz,
  generated_tempo integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- stems: Instruments per project
CREATE TABLE IF NOT EXISTS stems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  instrument text NOT NULL CHECK (instrument IN ('drums', 'bass', 'piano', 'guitar', 'strings')),
  sort_order integer NOT NULL DEFAULT 0,
  volume float NOT NULL DEFAULT 0.8 CHECK (volume >= 0.0 AND volume <= 1.0),
  pan float NOT NULL DEFAULT 0.0 CHECK (pan >= -1.0 AND pan <= 1.0),
  is_muted boolean NOT NULL DEFAULT false,
  is_solo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- sections: Structural sections (Intro, Verse, Chorus, etc.)
CREATE TABLE IF NOT EXISTS sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  bar_count integer NOT NULL DEFAULT 4,
  start_bar integer NOT NULL DEFAULT 1,
  energy_override integer CHECK (energy_override IS NULL OR (energy_override >= 0 AND energy_override <= 100)),
  groove_override integer CHECK (groove_override IS NULL OR (groove_override >= 0 AND groove_override <= 100)),
  swing_pct_override integer CHECK (swing_pct_override IS NULL OR (swing_pct_override >= 50 AND swing_pct_override <= 80)),
  dynamics_override integer CHECK (dynamics_override IS NULL OR (dynamics_override >= 0 AND dynamics_override <= 100)),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- blocks: Bar-level editing units
CREATE TABLE IF NOT EXISTS blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stem_id uuid NOT NULL REFERENCES stems(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  start_bar integer NOT NULL,
  end_bar integer NOT NULL,
  chord_degree text,
  chord_quality text,
  chord_bass_degree text,
  style text NOT NULL DEFAULT '',
  energy_override integer CHECK (energy_override IS NULL OR (energy_override >= 0 AND energy_override <= 100)),
  dynamics_override integer CHECK (dynamics_override IS NULL OR (dynamics_override >= 0 AND dynamics_override <= 100)),
  midi_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- chords: Master chord lane (one chord per bar, shared across stems)
CREATE TABLE IF NOT EXISTS chords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  bar_number integer NOT NULL,
  degree text,
  quality text,
  bass_degree text,
  UNIQUE (project_id, bar_number)
);

-- ai_chat_messages: Persistent AI chat history
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('setup', 'song', 'section', 'block')),
  scope_target text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_stems_project_id ON stems(project_id);
CREATE INDEX IF NOT EXISTS idx_sections_project_id_sort ON sections(project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_blocks_stem_id ON blocks(stem_id);
CREATE INDEX IF NOT EXISTS idx_blocks_section_id ON blocks(section_id);
CREATE INDEX IF NOT EXISTS idx_chords_project_bar ON chords(project_id, bar_number);
CREATE INDEX IF NOT EXISTS idx_chat_messages_project_created ON ai_chat_messages(project_id, created_at);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger: create profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, chord_display_mode, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'letter',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger: auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE stems ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chords ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- profiles: own row only
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- projects: own rows only
CREATE POLICY "projects_select_own" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "projects_insert_own" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_own" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "projects_delete_own" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- stems: via project ownership
CREATE POLICY "stems_all_own" ON stems
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- sections: via project ownership
CREATE POLICY "sections_all_own" ON sections
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- blocks: via stem → project ownership
CREATE POLICY "blocks_all_own" ON blocks
  USING (
    stem_id IN (
      SELECT s.id FROM stems s
      JOIN projects p ON p.id = s.project_id
      WHERE p.user_id = auth.uid()
    )
  );

-- chords: via project ownership
CREATE POLICY "chords_all_own" ON chords
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- ai_chat_messages: via project ownership
CREATE POLICY "chat_messages_all_own" ON ai_chat_messages
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );
