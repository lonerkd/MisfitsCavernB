-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (linked to Supabase auth)
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

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'concept' CHECK (status IN ('concept', 'pre-production', 'in-production', 'post-production', 'completed')),
  accent_color TEXT,
  budget DECIMAL(12, 2),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project crew
CREATE TABLE IF NOT EXISTS project_crew (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'team member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Scripts table
CREATE TABLE IF NOT EXISTS scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  format TEXT DEFAULT 'screenplay' CHECK (format IN ('screenplay', 'teleplay', 'stage-play')),
  version INT DEFAULT 1,
  last_edited_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Script version history
CREATE TABLE IF NOT EXISTS script_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  script_id UUID NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  version INT NOT NULL,
  edited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Script collaborators
CREATE TABLE IF NOT EXISTS script_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  script_id UUID NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permissions TEXT DEFAULT 'view' CHECK (permissions IN ('view', 'comment', 'edit')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(script_id, user_id)
);

-- Jobs board
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  role TEXT NOT NULL,
  rate DECIMAL(10, 2),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'closed')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job applications
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cover_note TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, applicant_id)
);

-- Messages (channels + DMs)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  channel_id TEXT,
  content TEXT NOT NULL,
  reactions JSONB DEFAULT '{}',
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity feed
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Studio boards
CREATE TABLE IF NOT EXISTS studio_boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  background_color TEXT DEFAULT '#0a0a0a',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Studio assets (mood board pins)
CREATE TABLE IF NOT EXISTS studio_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES studio_boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  asset_url TEXT NOT NULL,
  asset_type TEXT DEFAULT 'image',
  position_x INT DEFAULT 0,
  position_y INT DEFAULT 0,
  width INT DEFAULT 300,
  height INT DEFAULT 300,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio projects
CREATE TABLE IF NOT EXISTS portfolio_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  year INT,
  role TEXT,
  accent_color TEXT,
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio media
CREATE TABLE IF NOT EXISTS portfolio_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
  title TEXT,
  media_type TEXT DEFAULT 'youtube' CHECK (media_type IN ('youtube', 'gdrive', 'image')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project tasks
CREATE TABLE IF NOT EXISTS project_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  assigned_to UUID REFERENCES profiles(id),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_creator ON projects(creator_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_scripts_project ON scripts(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_feed(created_at);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Profiles
CREATE POLICY "Profiles readable by all" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies: Projects
CREATE POLICY "Project members can view" ON projects FOR SELECT USING (
  creator_id = auth.uid() OR
  id IN (SELECT project_id FROM project_crew WHERE user_id = auth.uid())
);
CREATE POLICY "Authenticated users create projects" ON projects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND creator_id = auth.uid());
CREATE POLICY "Creators update projects" ON projects FOR UPDATE USING (creator_id = auth.uid());
CREATE POLICY "Creators delete projects" ON projects FOR DELETE USING (creator_id = auth.uid());

-- RLS Policies: Scripts
CREATE POLICY "Script members can view" ON scripts FOR SELECT USING (
  project_id IS NULL OR
  project_id IN (
    SELECT id FROM projects WHERE creator_id = auth.uid()
    UNION
    SELECT project_id FROM project_crew WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Authenticated users create scripts" ON scripts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Script editors can update" ON scripts FOR UPDATE USING (
  last_edited_by = auth.uid() OR
  project_id IN (SELECT id FROM projects WHERE creator_id = auth.uid())
);

-- RLS Policies: Jobs
CREATE POLICY "Jobs publicly readable" ON jobs FOR SELECT USING (status = 'open' OR created_by = auth.uid());
CREATE POLICY "Authenticated users create jobs" ON jobs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());
CREATE POLICY "Job creators can update" ON jobs FOR UPDATE USING (created_by = auth.uid());

-- RLS Policies: Messages
CREATE POLICY "Channel messages readable" ON messages FOR SELECT USING (
  channel_id IS NOT NULL OR
  sender_id = auth.uid() OR
  receiver_id = auth.uid()
);
CREATE POLICY "Authenticated users send messages" ON messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND sender_id = auth.uid());

-- RLS Policies: Studio
CREATE POLICY "Studio boards owner only" ON studio_boards FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Studio assets owner only" ON studio_assets FOR ALL USING (user_id = auth.uid());

-- RLS Policies: Portfolio
CREATE POLICY "Portfolio publicly readable" ON portfolio_projects FOR SELECT USING (true);
CREATE POLICY "Portfolio owner only write" ON portfolio_projects FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Portfolio media readable" ON portfolio_media FOR SELECT USING (true);

-- RLS Policies: Project Tasks
CREATE POLICY "Project task members can view" ON project_tasks FOR SELECT USING (
  project_id IN (
    SELECT id FROM projects WHERE creator_id = auth.uid()
    UNION
    SELECT project_id FROM project_crew WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Project task members can manage" ON project_tasks FOR ALL USING (
  project_id IN (
    SELECT id FROM projects WHERE creator_id = auth.uid()
    UNION
    SELECT project_id FROM project_crew WHERE user_id = auth.uid()
  )
);

-- Trigger: auto-update profiles.updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER scripts_updated_at BEFORE UPDATE ON scripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
