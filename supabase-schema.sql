-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgtrgm";

-- Users/Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'creator',
  location TEXT,
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'BUSY')),
  discord_id TEXT,
  discord_username TEXT,
  discord_avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pre-production' CHECK (status IN ('concept', 'pre-production', 'in-production', 'post-production', 'completed')),
  accent_color TEXT,
  budget DECIMAL(12, 2),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX (creator_id),
  INDEX (status)
);

-- Project Crew
CREATE TABLE IF NOT EXISTS project_crew (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'team member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Scripts
CREATE TABLE IF NOT EXISTS scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  format TEXT DEFAULT 'screenplay' CHECK (format IN ('screenplay', 'teleplay', 'stage-play')),
  version INT DEFAULT 1,
  last_edited_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX (project_id),
  INDEX (created_at)
);

-- Script Versions (for backup/history)
CREATE TABLE IF NOT EXISTS script_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  script_id UUID NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  version INT NOT NULL,
  edited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Script Collaborators
CREATE TABLE IF NOT EXISTS script_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  script_id UUID NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permissions TEXT DEFAULT 'view' CHECK (permissions IN ('view', 'comment', 'edit')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(script_id, user_id)
);

-- Jobs/Opportunities
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  role TEXT NOT NULL,
  rate DECIMAL(10, 2),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'closed')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX (project_id),
  INDEX (status)
);

-- Job Applications
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, applicant_id)
);

-- Messages (for lounge/DMs)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  channel_id TEXT,
  content TEXT NOT NULL,
  reactions JSONB DEFAULT '{}',
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX (sender_id),
  INDEX (channel_id),
  INDEX (created_at)
);

-- Activity Feed
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX (user_id),
  INDEX (created_at)
);

-- Vault/Assets (for Studio mood boards)
CREATE TABLE IF NOT EXISTS vault_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  asset_url TEXT NOT NULL,
  asset_type TEXT DEFAULT 'image',
  board_id UUID,
  position_x INT,
  position_y INT,
  width INT,
  height INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX (user_id),
  INDEX (board_id)
);

-- Create indexes for performance
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_projects_creator ON projects(creator_id);
CREATE INDEX idx_scripts_project ON scripts(project_id);
CREATE INDEX idx_messages_channel ON messages(channel_id);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles: Everyone can read, users can update their own
CREATE POLICY "Profiles are publicly readable" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Projects: Creators can see all their projects, crew can see projects they're in
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (
    creator_id = auth.uid() OR
    id IN (SELECT project_id FROM project_crew WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (creator_id = auth.uid());

-- Scripts: Only project members can view/edit
CREATE POLICY "Script access via project membership" ON scripts
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE creator_id = auth.uid()
      UNION
      SELECT project_id FROM project_crew WHERE user_id = auth.uid()
    )
  );

