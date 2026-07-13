-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (linked to Supabase auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'creator',
  is_admin BOOLEAN DEFAULT false,
  location TEXT,
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'BUSY')),
  discord_id TEXT,
  discord_username TEXT,
  discord_avatar TEXT,
  notification_prefs JSONB NOT NULL DEFAULT '{}'::jsonb, -- {replies,jobs,product}
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
  is_public BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project crew
CREATE TABLE IF NOT EXISTS project_crew (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'team member',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Scripts table
CREATE TABLE IF NOT EXISTS scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  learned_rules JSONB,
  format TEXT DEFAULT 'screenplay' CHECK (format IN ('screenplay', 'teleplay', 'stage-play')),
  version INT DEFAULT 1,
  last_edited_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'draft',
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  shared BOOLEAN DEFAULT FALSE,
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
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
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
  is_public BOOLEAN DEFAULT false,
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

-- Project beats (for outlining)
CREATE TABLE IF NOT EXISTS project_beats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  order_index INT DEFAULT 0,
  color TEXT DEFAULT '#0099ff',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
ALTER TABLE project_beats ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Profiles
CREATE POLICY "Profiles readable by all" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.is_project_creator(pid uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM projects WHERE id = pid AND creator_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(pid uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM project_crew WHERE project_id = pid AND user_id = auth.uid());
$$;

-- RLS Policies: Projects
CREATE POLICY "Project members can view" ON projects FOR SELECT USING (
  creator_id = auth.uid() OR public.is_project_member(id)
);
CREATE POLICY "Authenticated users create projects" ON projects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND creator_id = auth.uid());
CREATE POLICY "Creators update projects" ON projects FOR UPDATE USING (creator_id = auth.uid());
CREATE POLICY "Creators delete projects" ON projects FOR DELETE USING (creator_id = auth.uid());

CREATE POLICY "Project crew viewable by project members" ON project_crew FOR SELECT USING (
  user_id = auth.uid() OR public.is_project_creator(project_id)
);
CREATE POLICY "Project creators can manage crew" ON project_crew FOR INSERT WITH CHECK (
  public.is_project_creator(project_id)
);
CREATE POLICY "Project creators can update crew" ON project_crew FOR UPDATE USING (
  public.is_project_creator(project_id)
);
CREATE POLICY "Project creators can remove crew" ON project_crew FOR DELETE USING (
  public.is_project_creator(project_id) OR user_id = auth.uid()
);

-- NOTE (performance): on the live DB, migration

-- RLS Policies: Scripts
CREATE POLICY "Script members can view" ON scripts FOR SELECT TO authenticated USING (
  shared = TRUE OR
  created_by = auth.uid() OR
  last_edited_by = auth.uid() OR
  (project_id IS NOT NULL AND project_id IN (
    SELECT id FROM projects WHERE creator_id = auth.uid()
    UNION
    SELECT project_id FROM project_crew WHERE user_id = auth.uid()
  ))
);
CREATE POLICY "Shared scripts publicly viewable" ON scripts FOR SELECT TO anon USING (shared = TRUE);
CREATE POLICY "Authenticated users create scripts" ON scripts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());
CREATE POLICY "Script editors can update" ON scripts FOR UPDATE USING (
  created_by = auth.uid() OR
  last_edited_by = auth.uid() OR
  (project_id IS NOT NULL AND (public.is_project_creator(project_id) OR public.is_project_member(project_id)))
);
CREATE POLICY "Script owners can delete" ON scripts FOR DELETE USING (created_by = auth.uid());

CREATE TABLE IF NOT EXISTS script_metadata (
  script_id UUID PRIMARY KEY REFERENCES scripts(id) ON DELETE CASCADE,
  title_page JSONB NOT NULL DEFAULT '{}'::jsonb,
  character_bible JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE script_metadata ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.can_access_script(sid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.scripts s WHERE s.id = sid AND (
      s.created_by = auth.uid() OR s.last_edited_by = auth.uid()
      OR (s.project_id IS NOT NULL AND (public.is_project_creator(s.project_id) OR public.is_project_member(s.project_id)))
    )
  );
$$;
CREATE POLICY "metadata writable by script members" ON script_metadata FOR ALL USING (public.can_access_script(script_id)) WITH CHECK (public.can_access_script(script_id));

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
CREATE POLICY "Portfolio readable if public or owner" ON portfolio_projects FOR SELECT USING (
  is_public = true OR user_id = auth.uid()
);
CREATE POLICY "Portfolio owner insert" ON portfolio_projects FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Portfolio owner update" ON portfolio_projects FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Portfolio owner delete" ON portfolio_projects FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Portfolio media readable if public or owner" ON portfolio_media FOR SELECT USING (
  project_id IN (
    SELECT id FROM portfolio_projects WHERE is_public = true OR user_id = auth.uid()
  )
);
CREATE POLICY "Portfolio media owner insert" ON portfolio_media FOR INSERT WITH CHECK (
  project_id IN (SELECT id FROM portfolio_projects WHERE user_id = auth.uid())
);
CREATE POLICY "Portfolio media owner update" ON portfolio_media FOR UPDATE USING (
  project_id IN (SELECT id FROM portfolio_projects WHERE user_id = auth.uid())
);
CREATE POLICY "Portfolio media owner delete" ON portfolio_media FOR DELETE USING (
  project_id IN (SELECT id FROM portfolio_projects WHERE user_id = auth.uid())
);

CREATE POLICY "Project task members can manage" ON project_tasks FOR ALL USING (
  project_id IN (
    SELECT id FROM projects WHERE creator_id = auth.uid()
    UNION
    SELECT project_id FROM project_crew WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Project beats members can manage" ON project_beats FOR ALL USING (
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

-- Marketing campaigns
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  platform TEXT,
  status TEXT DEFAULT 'draft',
  reach_estimate TEXT,
  accent_color TEXT DEFAULT '#ffffff',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project marketing members can manage" ON marketing_campaigns FOR ALL USING (
  project_id IN (
    SELECT id FROM projects WHERE creator_id = auth.uid()
    UNION
    SELECT project_id FROM project_crew WHERE user_id = auth.uid()
  )
);

-- Storage Buckets Setup
INSERT INTO storage.buckets (id, name, public) 
VALUES ('studio-assets', 'studio-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for storage.objects (studio-assets bucket)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'studio-assets');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'studio-assets' AND auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own assets' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Users can delete their own assets" ON storage.objects FOR DELETE USING (bucket_id = 'studio-assets' AND auth.uid() = owner);
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS scene_references (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  concept_asset_id UUID NOT NULL REFERENCES concept_assets(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scene_id, concept_asset_id)
);
ALTER TABLE scene_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scene_refs view" ON scene_references FOR SELECT TO authenticated
  USING (public.is_project_creator(project_id) OR public.is_project_member(project_id));
CREATE POLICY "scene_refs insert" ON scene_references FOR INSERT TO authenticated
  WITH CHECK ((public.is_project_creator(project_id) OR public.is_project_member(project_id)) AND created_by = auth.uid());
CREATE POLICY "scene_refs delete" ON scene_references FOR DELETE TO authenticated
  USING (public.is_project_creator(project_id) OR public.is_project_member(project_id));

CREATE TABLE IF NOT EXISTS character_references (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES script_characters(id) ON DELETE CASCADE,
  concept_asset_id UUID NOT NULL REFERENCES concept_assets(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, concept_asset_id)
);
ALTER TABLE character_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "char_refs view" ON character_references FOR SELECT TO authenticated
  USING (public.is_project_creator(project_id) OR public.is_project_member(project_id));
CREATE POLICY "char_refs insert" ON character_references FOR INSERT TO authenticated
  WITH CHECK ((public.is_project_creator(project_id) OR public.is_project_member(project_id)) AND created_by = auth.uid());
CREATE POLICY "char_refs delete" ON character_references FOR DELETE TO authenticated
  USING (public.is_project_creator(project_id) OR public.is_project_member(project_id));

-- Scene shoot status tracking
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'planned';

CREATE POLICY "Users can delete their own notifications" ON notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications (user_id, read, created_at DESC);

CREATE OR REPLACE FUNCTION public.toggle_message_reaction(p_message uuid, p_emoji text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid text := auth.uid()::text; r jsonb; arr jsonb; m record;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id, channel_id, sender_id, receiver_id, reactions INTO m FROM messages WHERE id = p_message;
  IF NOT FOUND THEN RAISE EXCEPTION 'message not found'; END IF;
  IF NOT (m.channel_id IS NOT NULL OR m.sender_id::text = uid OR m.receiver_id::text = uid) THEN
    RAISE EXCEPTION 'not permitted';
  END IF;
  r := coalesce(m.reactions, '{}'::jsonb);
  arr := coalesce(r -> p_emoji, '[]'::jsonb);
  IF arr @> to_jsonb(uid) THEN
    arr := (SELECT coalesce(jsonb_agg(to_jsonb(e)), '[]'::jsonb) FROM jsonb_array_elements_text(arr) e WHERE e <> uid);
    IF jsonb_array_length(arr) = 0 THEN r := r - p_emoji; ELSE r := jsonb_set(r, array[p_emoji], arr); END IF;
  ELSE
    r := jsonb_set(r, array[p_emoji], arr || to_jsonb(uid), true);
  END IF;
  UPDATE messages SET reactions = r WHERE id = p_message;
  RETURN r;
END; $$;
GRANT EXECUTE ON FUNCTION public.toggle_message_reaction(uuid, text) TO authenticated;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS parent_message_id uuid REFERENCES messages(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS messages_parent_idx ON messages (parent_message_id);

ALTER TABLE concept_assets ADD COLUMN IF NOT EXISTS board text;
CREATE INDEX IF NOT EXISTS concept_assets_project_board_idx ON concept_assets (project_id, board);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uname text;
BEGIN
  uname := coalesce(nullif(new.raw_user_meta_data->>'username',''), nullif(split_part(new.email,'@',1),''), 'user_' || substr(new.id::text,1,8));
  INSERT INTO public.profiles (id, username, status) VALUES (new.id, uname, 'OPEN') ON CONFLICT (id) DO NOTHING;
  RETURN new;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,  -- null = global/community
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text','voice')),
  topic TEXT,
  position INT DEFAULT 0,
  is_private BOOLEAN NOT NULL DEFAULT false,
  post_policy TEXT NOT NULL DEFAULT 'viewers' CHECK (post_policy IN ('viewers','members','managers')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  can_post BOOLEAN NOT NULL DEFAULT true,
  can_manage BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel_uuid UUID REFERENCES channels(id) ON DELETE CASCADE;

-- recovered from the live DB on 2026-07-09.)

-- WITH CHECK required created_by = auth.uid() in addition to
--
-- wasn't specific to new code: createChannel() has always used
DROP POLICY IF EXISTS "channels create by project owner" ON channels;
CREATE POLICY "channels create by project creator or crew" ON channels FOR INSERT
  WITH CHECK (
    project_id IS NOT NULL
    AND (public.is_project_creator(project_id) OR public.is_project_member(project_id))
  );

CREATE TABLE IF NOT EXISTS timeline_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  completion INT DEFAULT 0 CHECK (completion >= 0 AND completion <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS budget_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  actual_cost DECIMAL(12, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_timeline_items_project ON timeline_items(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_project ON budget_items(project_id);
ALTER TABLE timeline_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Timeline members can manage" ON timeline_items FOR ALL USING (
  project_id IN (
    SELECT id FROM projects WHERE creator_id = auth.uid()
    UNION
    SELECT project_id FROM project_crew WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Budget members can manage" ON budget_items FOR ALL USING (
  project_id IN (
    SELECT id FROM projects WHERE creator_id = auth.uid()
    UNION
    SELECT project_id FROM project_crew WHERE user_id = auth.uid()
  )
);
CREATE TRIGGER timeline_items_updated_at BEFORE UPDATE ON timeline_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER budget_items_updated_at BEFORE UPDATE ON budget_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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
CREATE POLICY "Beats: project members can manage" ON beats FOR ALL USING (
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
CREATE POLICY "Scenes: project members can manage" ON scenes FOR ALL USING (
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

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS budget_item_id UUID REFERENCES budget_items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_budget_item ON jobs(budget_item_id);

-- Bible that was superseded by the JSONB-based one in
CREATE TABLE IF NOT EXISTS character_castings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  character_name TEXT NOT NULL,
  crew_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, character_name)
);
CREATE INDEX IF NOT EXISTS idx_character_castings_project ON character_castings(project_id);
CREATE INDEX IF NOT EXISTS idx_character_castings_crew_user ON character_castings(crew_user_id);
ALTER TABLE character_castings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Castings writable by project creator or crew" ON character_castings FOR ALL
  USING (public.is_project_creator(project_id) OR public.is_project_member(project_id))
  WITH CHECK (public.is_project_creator(project_id) OR public.is_project_member(project_id));

ALTER TABLE portfolio_projects
  ADD COLUMN IF NOT EXISTS source_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_source ON portfolio_projects(source_project_id);

CREATE TABLE IF NOT EXISTS spotify_connections (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL, -- ms epoch, matches Date.now()-based math already used client-side
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE spotify_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own spotify connection" ON spotify_connections
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own spotify connection" ON spotify_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own spotify connection" ON spotify_connections
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own spotify connection" ON spotify_connections
  FOR DELETE USING (auth.uid() = user_id);

-- this publicly-readable table at add-time — the same pattern
CREATE TABLE IF NOT EXISTS portfolio_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_project_id UUID NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  block_type TEXT NOT NULL CHECK (block_type IN
    ('cover','concept','scene','budget','crew','script','text','media')),
  title TEXT,
  body TEXT,
  image_url TEXT,
  meta JSONB,
  source_ref_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portfolio_blocks_project_idx
  ON portfolio_blocks(portfolio_project_id, position);
ALTER TABLE portfolio_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portfolio blocks readable" ON portfolio_blocks FOR SELECT USING (true);
CREATE POLICY "Portfolio blocks owner insert" ON portfolio_blocks FOR INSERT WITH CHECK (
  portfolio_project_id IN (SELECT id FROM portfolio_projects WHERE user_id = auth.uid())
);
CREATE POLICY "Portfolio blocks owner update" ON portfolio_blocks FOR UPDATE USING (
  portfolio_project_id IN (SELECT id FROM portfolio_projects WHERE user_id = auth.uid())
);
CREATE POLICY "Portfolio blocks owner delete" ON portfolio_blocks FOR DELETE USING (
  portfolio_project_id IN (SELECT id FROM portfolio_projects WHERE user_id = auth.uid())
);

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{"modules":{"scriptos":true,"studio":true,"lounge":true,"portfolio":true,"distribution":true}}'::jsonb;
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS festival_submissions JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS target_demographic TEXT,
  ADD COLUMN IF NOT EXISTS budget NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spend NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;
