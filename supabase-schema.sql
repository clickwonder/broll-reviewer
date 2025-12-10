-- B-Roll Reviewer Database Schema
-- Auto-runs on Docker container startup

-- Create roles for PostgREST
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;

-- Projects table
CREATE TABLE IF NOT EXISTS broll_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  settings JSONB NOT NULL DEFAULT '{}',
  scenes JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets table
CREATE TABLE IF NOT EXISTS broll_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES broll_projects(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  path TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'regenerating')),
  used_in_scenes TEXT[] DEFAULT '{}',
  image_url TEXT,
  video_url TEXT,
  source TEXT DEFAULT 'local' CHECK (source IN ('ai', 'pexels', 'pixabay', 'local')),
  image_model TEXT,
  video_model TEXT,
  versions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE broll_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE broll_assets ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (since we're using anon key)
CREATE POLICY "Allow all operations on projects" ON broll_projects
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on assets" ON broll_assets
  FOR ALL USING (true) WITH CHECK (true);

-- Index for faster asset lookups by project
CREATE INDEX IF NOT EXISTS idx_broll_assets_project_id ON broll_assets(project_id);

-- Index for project listing by updated_at
CREATE INDEX IF NOT EXISTS idx_broll_projects_updated_at ON broll_projects(updated_at DESC);
