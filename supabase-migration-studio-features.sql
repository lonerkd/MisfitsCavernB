-- Migration: real backing tables for Studio's Beat Board, Concept Board,
-- Scene scheduling, and Marketing Hub. These previously rendered static
-- fabricated data with no way to persist anything a user added.

CREATE TABLE IF NOT EXISTS beats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  color TEXT,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS concept_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT,
  image_url TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scenes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scene_number INT NOT NULL,
  title TEXT NOT NULL,
  time_of_day TEXT DEFAULT 'DAY' CHECK (time_of_day IN ('DAY', 'NIGHT', 'DAWN', 'DUSK')),
  location TEXT,
  cast_list TEXT,
  est_duration TEXT,
  shoot_day INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'drafting' CHECK (status IN ('drafting', 'in-review', 'scheduled', 'live')),
  reach_target TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beats_project ON beats(project_id);
CREATE INDEX IF NOT EXISTS idx_concept_assets_project ON concept_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_scenes_project ON scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_project ON campaigns(project_id);

ALTER TABLE beats ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Beats: project members can view" ON beats FOR SELECT USING (
  project_id IN (
    SELECT id FROM projects WHERE creator_id = auth.uid()
    UNION
    SELECT project_id FROM project_crew WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Beats: project members can manage" ON beats FOR ALL USING (
  project_id IN (
    SELECT id FROM projects WHERE creator_id = auth.uid()
    UNION
    SELECT project_id FROM project_crew WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Concept assets: project members can view" ON concept_assets FOR SELECT USING (
  project_id IN (
    SELECT id FROM projects WHERE creator_id = auth.uid()
    UNION
    SELECT project_id FROM project_crew WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Concept assets: project members can manage" ON concept_assets FOR ALL USING (
  project_id IN (
    SELECT id FROM projects WHERE creator_id = auth.uid()
    UNION
    SELECT project_id FROM project_crew WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Scenes: project members can view" ON scenes FOR SELECT USING (
  project_id IN (
    SELECT id FROM projects WHERE creator_id = auth.uid()
    UNION
    SELECT project_id FROM project_crew WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Scenes: project members can manage" ON scenes FOR ALL USING (
  project_id IN (
    SELECT id FROM projects WHERE creator_id = auth.uid()
    UNION
    SELECT project_id FROM project_crew WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Campaigns: project members can view" ON campaigns FOR SELECT USING (
  project_id IN (
    SELECT id FROM projects WHERE creator_id = auth.uid()
    UNION
    SELECT project_id FROM project_crew WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Campaigns: project members can manage" ON campaigns FOR ALL USING (
  project_id IN (
    SELECT id FROM projects WHERE creator_id = auth.uid()
    UNION
    SELECT project_id FROM project_crew WHERE user_id = auth.uid()
  )
);
