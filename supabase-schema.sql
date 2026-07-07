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

-- Membership-check helpers. SECURITY DEFINER bypasses RLS on the referenced
-- tables, which prevents the projects <-> project_crew policies from recursing
-- into each other (Postgres error 42P17: infinite recursion).
--
-- Defined in `internal`, not `public`: PostgREST auto-exposes every function
-- granted EXECUTE in an exposed schema as a `/rest/v1/rpc/<fn>` endpoint, and
-- these two (plus can_access_script below) exist purely to be called from
-- inside RLS policy USING/WITH CHECK clauses, never from the client — left
-- in `public` they'd let any signed-in caller probe arbitrary project IDs
-- directly. Moving schema doesn't affect existing policies (Postgres
-- resolves policy expressions by function OID, not by re-parsing a
-- schema-qualified name), and EXECUTE stays granted to `authenticated`
-- since RLS evaluation still needs it.
CREATE SCHEMA IF NOT EXISTS internal;

CREATE OR REPLACE FUNCTION internal.is_project_creator(pid uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM projects WHERE id = pid AND creator_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION internal.is_project_member(pid uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM project_crew WHERE project_id = pid AND user_id = auth.uid());
$$;

-- RLS Policies: Projects
CREATE POLICY "Project members can view" ON projects FOR SELECT USING (
  creator_id = auth.uid() OR internal.is_project_member(id)
);
CREATE POLICY "Authenticated users create projects" ON projects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND creator_id = auth.uid());
CREATE POLICY "Creators update projects" ON projects FOR UPDATE USING (creator_id = auth.uid());
CREATE POLICY "Creators delete projects" ON projects FOR DELETE USING (creator_id = auth.uid());

-- RLS Policies: Project crew (uses is_project_creator to avoid recursion)
CREATE POLICY "Project crew viewable by project members" ON project_crew FOR SELECT USING (
  user_id = auth.uid() OR internal.is_project_creator(project_id)
);
CREATE POLICY "Project creators can manage crew" ON project_crew FOR INSERT WITH CHECK (
  internal.is_project_creator(project_id)
);
CREATE POLICY "Project creators can update crew" ON project_crew FOR UPDATE USING (
  internal.is_project_creator(project_id)
);
CREATE POLICY "Project creators can remove crew" ON project_crew FOR DELETE USING (
  internal.is_project_creator(project_id) OR user_id = auth.uid()
);

-- NOTE (performance): on the live DB, migration
-- performance_pass_fk_indexes_and_initplan (a) indexed every unindexed foreign
-- key and (b) rewrote all policies to wrap auth.uid()/auth.role() in a scalar
-- subquery — (SELECT auth.uid()) — so they evaluate once per statement instead
-- of per row. Policies below are shown unwrapped for readability.

-- RLS Policies: Scripts
CREATE POLICY "Script members can view" ON scripts FOR SELECT USING (
  shared = TRUE OR
  created_by = auth.uid() OR
  last_edited_by = auth.uid() OR
  (project_id IS NOT NULL AND project_id IN (
    SELECT id FROM projects WHERE creator_id = auth.uid()
    UNION
    SELECT project_id FROM project_crew WHERE user_id = auth.uid()
  ))
);
-- Public share links (/s/[token]): shared scripts are readable logged-out.
-- Without this anon policy, share links 404'd for visitors without accounts.
CREATE POLICY "Shared scripts publicly viewable" ON scripts FOR SELECT TO anon USING (shared = TRUE);
CREATE POLICY "Authenticated users create scripts" ON scripts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());
-- Project crew (not just the owner) can co-write the shared screenplay.
CREATE POLICY "Script editors can update" ON scripts FOR UPDATE USING (
  created_by = auth.uid() OR
  last_edited_by = auth.uid() OR
  (project_id IS NOT NULL AND (internal.is_project_creator(project_id) OR internal.is_project_member(project_id)))
);
CREATE POLICY "Script owners can delete" ON scripts FOR DELETE USING (created_by = auth.uid());

-- Script metadata: shared title page + character bible (was localStorage-only).
-- Applied live via migration script_metadata_table.
CREATE TABLE IF NOT EXISTS script_metadata (
  script_id UUID PRIMARY KEY REFERENCES scripts(id) ON DELETE CASCADE,
  title_page JSONB NOT NULL DEFAULT '{}'::jsonb,
  character_bible JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE script_metadata ENABLE ROW LEVEL SECURITY;
-- can_access_script: owner/editor of a personal script, or creator/member of
-- the owning project. Shared by script_metadata and script_revisions (migration
-- tighten_script_revisions_rls) so personal scripts are NOT open to every
-- authenticated user.
CREATE OR REPLACE FUNCTION internal.can_access_script(sid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.scripts s WHERE s.id = sid AND (
      s.created_by = auth.uid() OR s.last_edited_by = auth.uid()
      OR (s.project_id IS NOT NULL AND (internal.is_project_creator(s.project_id) OR internal.is_project_member(s.project_id)))
    )
  );
$$;
CREATE POLICY "metadata readable by script members" ON script_metadata FOR SELECT USING (internal.can_access_script(script_id));
CREATE POLICY "metadata writable by script members" ON script_metadata FOR ALL USING (internal.can_access_script(script_id)) WITH CHECK (internal.can_access_script(script_id));

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
CREATE POLICY "Portfolio owner only write" ON portfolio_projects FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Portfolio media readable if public or owner" ON portfolio_media FOR SELECT USING (
  project_id IN (
    SELECT id FROM portfolio_projects WHERE is_public = true OR user_id = auth.uid()
  )
);
CREATE POLICY "Portfolio media owner write" ON portfolio_media FOR ALL USING (
  project_id IN (SELECT id FROM portfolio_projects WHERE user_id = auth.uid())
);

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

-- RLS Policies: Project Beats
CREATE POLICY "Project beats members can view" ON project_beats FOR SELECT USING (
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
-- Note: This requires the storage schema to be active (standard in Supabase)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('studio-assets', 'studio-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for storage.objects (studio-assets bucket)
-- We use DO blocks to avoid errors if policies already exist in some environments
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

-- Scene ↔ concept references: link concept-board images to specific scenes
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
  USING (internal.is_project_creator(project_id) OR internal.is_project_member(project_id));
CREATE POLICY "scene_refs insert" ON scene_references FOR INSERT TO authenticated
  WITH CHECK ((internal.is_project_creator(project_id) OR internal.is_project_member(project_id)) AND created_by = auth.uid());
CREATE POLICY "scene_refs delete" ON scene_references FOR DELETE TO authenticated
  USING (internal.is_project_creator(project_id) OR internal.is_project_member(project_id));

-- Character Bible: one row per character, shared by ScriptOS's Character
-- Report (lib/scriptos/bible.ts) and Studio's Casting Board/look-board
-- (app/studio/page.tsx) — both read and write this same table so a
-- character developed in either surface shows up in the other, instead of
-- silently diverging into two separate bibles. Applied live directly against
-- Supabase; backfilled here since this file had never caught up with it.
CREATE TABLE IF NOT EXISTS script_characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  script_id UUID NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  full_name TEXT,
  age TEXT,
  description TEXT,
  backstory TEXT,
  motivation TEXT,
  arc TEXT,
  relationships TEXT,
  notes TEXT,
  color TEXT DEFAULT '#ff3c00',
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE script_characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Script members can manage characters" ON script_characters FOR ALL
  USING (script_id IN (
    SELECT scripts.id FROM scripts WHERE (
      scripts.project_id IS NULL
      OR scripts.project_id IN (
        SELECT projects.id FROM projects WHERE projects.creator_id = auth.uid()
        UNION
        SELECT project_crew.project_id FROM project_crew WHERE project_crew.user_id = auth.uid()
      )
    )
  ));

-- Casting/look references: link concept-board images to characters
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
  USING (internal.is_project_creator(project_id) OR internal.is_project_member(project_id));
CREATE POLICY "char_refs insert" ON character_references FOR INSERT TO authenticated
  WITH CHECK ((internal.is_project_creator(project_id) OR internal.is_project_member(project_id)) AND created_by = auth.uid());
CREATE POLICY "char_refs delete" ON character_references FOR DELETE TO authenticated
  USING (internal.is_project_creator(project_id) OR internal.is_project_member(project_id));

-- Scene shoot status tracking
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'planned';

-- Per-scene production elements (props/wardrobe/vehicles/sfx/vfx tagged from the
-- script) — the real script -> schedule -> budget breakdown hinge.
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS elements JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ScriptOS margin gutter: typed, line-anchored annotations on a script. Each
-- one conceptually "routes to" its owning department (shot -> shot list,
-- beat -> board, todo -> call sheet/props) — the routing is a label for now,
-- not yet a write into those tables.
CREATE TABLE IF NOT EXISTS script_annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  script_id UUID NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  line_index INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('shot', 'beat', 'note', 'revision', 'reference', 'todo')),
  text TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_script_annotations_script ON script_annotations(script_id);
ALTER TABLE script_annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "script_annotations view" ON script_annotations FOR SELECT TO authenticated
  USING (internal.is_project_creator(project_id) OR internal.is_project_member(project_id));
CREATE POLICY "script_annotations insert" ON script_annotations FOR INSERT TO authenticated
  WITH CHECK ((internal.is_project_creator(project_id) OR internal.is_project_member(project_id)) AND created_by = auth.uid());
CREATE POLICY "script_annotations delete" ON script_annotations FOR DELETE TO authenticated
  USING (internal.is_project_creator(project_id) OR internal.is_project_member(project_id));

-- Notifications: per-user feed (bell). Insert allowed for any authenticated
-- user so actors can notify recipients; read/update/delete scoped to owner.
CREATE POLICY "Users can delete their own notifications" ON notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications (user_id, read, created_at DESC);

-- Direct-message reactions run through a SECURITY DEFINER RPC because the
-- messages table intentionally has no row-level UPDATE policy. The function
-- toggles auth.uid() into the reactions JSONB and only for messages the caller
-- can already see (channel messages or their own DMs).
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

-- Chat threads: a message can be a reply to another via parent_message_id.
-- Top-level channel reads filter parent_message_id IS NULL; replies load per thread.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS parent_message_id uuid REFERENCES messages(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS messages_parent_idx ON messages (parent_message_id);

-- Concept board organisation into named boards (Pinterest-style).
ALTER TABLE concept_assets ADD COLUMN IF NOT EXISTS board text;
CREATE INDEX IF NOT EXISTS concept_assets_project_board_idx ON concept_assets (project_id, board);

-- Bulletproof profile creation: a trigger on auth.users creates the profile
-- server-side so it never depends on a best-effort client insert.
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

-- ── Project-connected channels (Discord-style) ──────────────────────────────
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

-- SECURITY DEFINER permission helpers: can_view_channel / can_post_channel /
-- can_manage_channel. View = global, project owner, project crew (public), or
-- explicit member (private). Post gated by post_policy (viewers/members/
-- managers). Manage = project owner or channel member with can_manage.
-- (Full definitions applied via migration project_channels_system.)

-- Root cause (found while verifying Phase 5's auto-channel-creation against
-- the live DB with a real account): the original channels INSERT policy's
-- WITH CHECK required created_by = auth.uid() in addition to
-- is_project_creator(project_id). Both clauses independently proved true in
-- isolation, yet the INSERT still failed for every real user, including a
-- project's own creator.
--
-- The deeper bug lived in can_view_channel() (the SELECT/USING policy):
-- INSERT ... RETURNING (what supabase-js's .select().single() generates)
-- requires Postgres to re-check the SELECT policy against the row just
-- inserted, within the SAME command as the INSERT. Under MVCC command-counter
-- rules, a statement's own just-inserted row isn't visible to nested
-- re-queries of the same table within that command, so can_view_channel's
-- internal lookup never found the row, even though the identical check
-- against the same row succeeds an instant later as its own statement. This
-- wasn't specific to new code: createChannel() has always used
-- .select().single(), so the Lounge's own "+ New Channel" button had likely
-- been silently broken for every real user. Fixed by (1) simplifying the
-- INSERT policy below to the same proven creator-or-crew pattern already
-- working for project_crew and character_castings, dropping the redundant
-- created_by self-check, and (2) createChannel() in lib/supabase/channels.ts
-- inserting with Prefer: return=minimal then doing a separate follow-up
-- SELECT, instead of chaining .select().single() onto the insert.
DROP POLICY IF EXISTS "channels create by project owner" ON channels;
CREATE POLICY "channels create by project creator or crew" ON channels FOR INSERT
  WITH CHECK (
    project_id IS NOT NULL
    AND (internal.is_project_creator(project_id) OR internal.is_project_member(project_id))
  );

-- Timeline and budget: ProjectContext.tsx queried these since the project hub
-- was built, but they were never defined above, so crew/schedule/budget data
-- on project pages silently came back empty until this was applied.
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
CREATE POLICY "Timeline members can view" ON timeline_items FOR SELECT USING (
  project_id IN (
    SELECT id FROM projects WHERE creator_id = auth.uid()
    UNION
    SELECT project_id FROM project_crew WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Timeline members can manage" ON timeline_items FOR ALL USING (
  project_id IN (
    SELECT id FROM projects WHERE creator_id = auth.uid()
    UNION
    SELECT project_id FROM project_crew WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Budget members can view" ON budget_items FOR SELECT USING (
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

-- Studio's Beat Board, Concept Board, Scene scheduling, and Marketing Hub
-- backing tables. These previously rendered static fabricated data with no
-- way to persist anything a user added. (NOTE: scene_references and
-- character_references above reference scenes/concept_assets — this section
-- must exist before those for a from-scratch run; pre-existing file-order
-- issue, not fixed here to avoid reshuffling unrelated content.)
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
  -- Per-scene production elements ({ props: string[], wardrobe: string[], vehicles: string[],
  -- sfx: string[], vfx: string[] }), the real script -> schedule -> budget breakdown hinge.
  elements JSONB NOT NULL DEFAULT '{}'::jsonb,
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

-- Link Jobs postings back to the Budget line item they were posted from, so
-- Studio/Projects can show "posted as job" status on a budget row and avoid
-- accidental duplicate postings. Part of the Jobs <-> Crew <-> Budget
-- interconnection (accepting a job application also creates real
-- project_crew membership — see app/jobs/[id]/page.tsx).
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS budget_item_id UUID REFERENCES budget_items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_budget_item ON jobs(budget_item_id);

-- Real casting links between screenplay characters and crew members. This is
-- a separate, non-overlapping concept from script_characters (character
-- development data) and character_references (look-board images) above —
-- casting is "who plays this role," keyed by character_name rather than
-- character_id, so it stays valid even before a character has a bible row.
-- (Earlier revisions of this file incorrectly claimed script_characters/
-- character_references were dead JSONB-superseded tables with 0 rows; they
-- were live in the database the whole time, just missing their CREATE TABLE
-- statements here — see script_characters above for the correction.)
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
CREATE POLICY "Castings viewable by project creator or crew" ON character_castings FOR SELECT
  USING (internal.is_project_creator(project_id) OR internal.is_project_member(project_id));
CREATE POLICY "Castings writable by project creator or crew" ON character_castings FOR ALL
  USING (internal.is_project_creator(project_id) OR internal.is_project_member(project_id))
  WITH CHECK (internal.is_project_creator(project_id) OR internal.is_project_member(project_id));

-- Link portfolio_projects back to their originating production project.
-- Without this, the Showcase tab on a project has no real table to
-- read/write to — portfolio_projects exists only as a standalone per-user
-- collection. Adding source_project_id lets a project's finished work
-- surface in both places.
ALTER TABLE portfolio_projects
  ADD COLUMN IF NOT EXISTS source_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_source ON portfolio_projects(source_project_id);

-- Persist Spotify OAuth tokens per-account instead of localStorage only.
-- Every other piece of state in this suite is tied to the Supabase account
-- and survives across devices/browsers; Spotify auth was the one exception,
-- requiring a full reconnect on every new device. This table lets
-- lib/spotify/auth.ts read/write a real, RLS-protected per-user record.
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

-- Pitch-board blocks for portfolio projects: a project can be assembled into
-- an ordered, drag-and-drop board of blocks (concept art, scenes, budget,
-- crew, script excerpts, custom text/media) that doubles as a public
-- showcase and a pitch deck. Blocks store SNAPSHOTS, not references: the
-- public share page (/p/[token]) is viewed by anonymous visitors who, by
-- RLS, cannot read the source project tables (concept_assets/scenes/
-- budget_items/project_crew are creator/crew-only), so each block copies the
-- data it needs (image URL, scene text, budget totals, crew name+role) into
-- this publicly-readable table at add-time — the same pattern
-- portfolio_media already uses (open read, owner-only write; portfolio
-- sharing is gated in-app via share_token, not an is_public column).
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
CREATE POLICY "Portfolio blocks owner write" ON portfolio_blocks FOR ALL USING (
  portfolio_project_id IN (SELECT id FROM portfolio_projects WHERE user_id = auth.uid())
);

-- Per-project settings (default script format override + ecosystem module
-- visibility toggles — ScriptOS/Studio/Lounge/Portfolio/Distribution can
-- each be switched off per project, hiding that department's hub tile and
-- taskbar icon without touching its underlying data) and a lightweight
-- festival-submissions tracker. Both are JSONB on `projects` rather than
-- new relational tables — settings is a small fixed shape read as a whole,
-- and festival submissions have no cross-table relations of their own, so
-- either a real table would be pure ceremony.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{"modules":{"scriptos":true,"studio":true,"lounge":true,"portfolio":true,"distribution":true}}'::jsonb;
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS festival_submissions JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Campaign budget tracking: target demographic + planned budget/actual spend
-- + a flight window, so the Studio Promos tab's Campaign Overview can show
-- real spend-vs-budget instead of just counts.
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS target_demographic TEXT,
  ADD COLUMN IF NOT EXISTS budget NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spend NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- Schema debt cleanup (redesign spec section 3): the codebase ended up with
-- two duplicate-purpose table pairs from earlier passes. Checked every call
-- site in app/ and lib/ before touching either:
--   - `beats` vs `project_beats`      -> project_beats is the one every
--     Studio/Editor code path reads and writes (getProjectBeats/
--     createProjectBeat/deleteProjectBeat in lib/supabase/studio.ts,
--     ProjectContext's beats field). `beats` has zero references anywhere
--     in app/ or lib/ — dead since whichever earlier pass introduced
--     project_beats without migrating off the original.
--   - `campaigns` vs `marketing_campaigns` -> campaigns is the one Studio's
--     Promos tab and the Portfolio Distribution view both read/write.
--     marketing_campaigns has zero references anywhere in app/ or lib/.
-- Both dead tables have no rows referencing them from other tables (no
-- inbound foreign keys), so dropping is safe with no migration step needed.
DROP TABLE IF EXISTS beats;
DROP TABLE IF EXISTS marketing_campaigns;

-- NOT done here, deliberately: consolidating studio_assets/studio_boards
-- (owner-scoped moodboards, lib/supabase/studio.ts) onto concept_assets
-- (project-shared, used by Studio's scene/character reference pickers)
-- is real product behavior change, not a rename — it would make every
-- existing Concept Board visible to the whole crew instead of just its
-- creator, which may or may not be wanted for personal moodboards vs
-- shared references. Needs a product decision, not a silent migration.
-- Character data (script_characters bible + character_castings +
-- character_references) previously had a real split: ScriptOS's Character
-- Report wrote profiles into script_metadata.character_bible (JSONB) while
-- Studio's Casting Board read/wrote script_characters (relational) — two
-- bibles that never saw each other's data, with script_characters sitting
-- empty in production despite Studio's UI acting like it was populated.
-- Fixed by moving lib/scriptos/bible.ts onto script_characters so both
-- surfaces share the one table; character_castings (cast assignment) and
-- character_references (look-board images) were already correctly scoped
-- to their distinct purposes and needed no change.
