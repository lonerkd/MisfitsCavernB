-- ════════════════════════════════════════════════════════════════════════════
-- Baseline — the production schema of Misfits Cavern as of 2026-09-26,
-- reconstructed object-by-object from the live Postgres catalog (not from the
-- historical root *.sql files, which had drifted from production).
--
-- This file is the starting point of the migration history. Never edit it:
-- every schema change from here on is a new file in supabase/migrations/.
-- `npm run db:drift` proves local == production after migrations apply.
-- ════════════════════════════════════════════════════════════════════════════

SET check_function_bodies = off;

CREATE SCHEMA IF NOT EXISTS internal;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE public.activity_feed (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.asset_comments (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  asset_id uuid NOT NULL,
  user_id uuid NOT NULL,
  timecode text,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.audit_logs (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.budget_items (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  project_id uuid NOT NULL,
  category text NOT NULL,
  description text DEFAULT ''::text,
  amount numeric(12,2) DEFAULT 0 NOT NULL,
  actual_cost numeric(12,2),
  job_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.call_sheet_calls (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  call_sheet_id uuid NOT NULL,
  crew_user_id uuid,
  character_name text,
  role_label text,
  call_time time without time zone,
  remarks text,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.call_sheets (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  project_id uuid NOT NULL,
  shoot_day integer NOT NULL,
  shoot_date date,
  general_call time without time zone,
  shooting_call time without time zone,
  estimated_wrap time without time zone,
  location_address text,
  weather text,
  notes text,
  updated_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.campaigns (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  project_id uuid NOT NULL,
  title text NOT NULL,
  platform text DEFAULT 'Instagram'::text NOT NULL,
  status text DEFAULT 'Drafting'::text NOT NULL,
  target_reach text DEFAULT ''::text,
  notes text DEFAULT ''::text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  target_demographic text,
  budget numeric DEFAULT 0,
  spend numeric DEFAULT 0,
  start_date date,
  end_date date
);
CREATE TABLE public.channel_members (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  channel_id uuid NOT NULL,
  user_id uuid NOT NULL,
  can_post boolean DEFAULT true NOT NULL,
  can_manage boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.channels (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid,
  name text NOT NULL,
  type text DEFAULT 'text'::text NOT NULL,
  topic text,
  "position" integer DEFAULT 0,
  is_private boolean DEFAULT false NOT NULL,
  post_policy text DEFAULT 'viewers'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.character_castings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid NOT NULL,
  character_name text NOT NULL,
  crew_user_id uuid NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.character_references (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid NOT NULL,
  character_id uuid NOT NULL,
  concept_asset_id uuid NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.chat_channels (
  id text NOT NULL,
  project_id text,
  name text NOT NULL,
  description text,
  type text DEFAULT 'text'::text NOT NULL,
  members_json text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.chat_messages (
  id text NOT NULL,
  channel_id text NOT NULL,
  sender_id text NOT NULL,
  content text NOT NULL,
  type text DEFAULT 'text'::text NOT NULL,
  attachments_json text,
  reactions_json text,
  created_at timestamp with time zone DEFAULT now(),
  edited_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.concept_assets (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  project_id uuid NOT NULL,
  title text,
  image_url text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  board text
);
CREATE TABLE public.discord_integrations (
  channel_id uuid NOT NULL,
  webhook_url text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.job_applications (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  job_id uuid NOT NULL,
  applicant_id uuid NOT NULL,
  cover_note text,
  status text DEFAULT 'pending'::text,
  applied_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.jobs (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  project_id uuid,
  title text NOT NULL,
  description text,
  role text NOT NULL,
  rate numeric(10,2),
  status text DEFAULT 'open'::text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  rate_type text DEFAULT 'hourly'::text NOT NULL,
  budget_item_id uuid
);
CREATE TABLE public.messages (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  sender_id uuid NOT NULL,
  receiver_id uuid,
  channel_id text,
  content text NOT NULL,
  reactions jsonb DEFAULT '{}'::jsonb,
  pinned boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  parent_message_id uuid,
  channel_uuid uuid
);
CREATE TABLE public.notifications (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.portfolio_blocks (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  portfolio_project_id uuid NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  block_type text NOT NULL,
  title text,
  body text,
  image_url text,
  meta jsonb,
  source_ref_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.portfolio_media (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  project_id uuid NOT NULL,
  title text,
  media_type text DEFAULT 'youtube'::text,
  url text NOT NULL,
  thumbnail_url text,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.portfolio_projects (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  category text,
  year integer,
  role text,
  accent_color text,
  share_token text DEFAULT encode(gen_random_bytes(16), 'hex'::text),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  source_project_id uuid
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text NOT NULL,
  avatar_url text,
  bio text,
  role text DEFAULT 'creator'::text,
  location text,
  status text DEFAULT 'OPEN'::text,
  discord_id text,
  discord_username text,
  discord_avatar text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_admin boolean DEFAULT false,
  notification_prefs jsonb DEFAULT '{}'::jsonb NOT NULL
);
CREATE TABLE public.project_assets (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  project_id uuid NOT NULL,
  title text DEFAULT ''::text NOT NULL,
  type text DEFAULT 'image'::text NOT NULL,
  url text DEFAULT ''::text NOT NULL,
  thumbnail_url text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.project_audio_references (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  project_id uuid,
  added_by uuid,
  reference_type text,
  uri text NOT NULL,
  title text NOT NULL,
  description text,
  script_id uuid,
  scene_id text
);
CREATE TABLE public.project_beats (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  project_id uuid NOT NULL,
  script_id uuid,
  scene_number text,
  title text,
  content text,
  color text DEFAULT '#ff3c00'::text,
  order_index integer,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.project_crew (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'team member'::text,
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'confirmed'::text,
  invited_by uuid
);
CREATE TABLE public.project_tasks (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  project_id uuid NOT NULL,
  title text NOT NULL,
  completed boolean DEFAULT false,
  assigned_to uuid,
  due_date date,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.projects (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  title text NOT NULL,
  description text,
  creator_id uuid NOT NULL,
  status text DEFAULT 'concept'::text,
  accent_color text,
  budget numeric(12,2),
  start_date date,
  end_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  project_type text DEFAULT 'Feature'::text NOT NULL,
  settings jsonb DEFAULT '{"modules": {"lounge": true, "studio": true, "scriptos": true, "portfolio": true, "distribution": true}, "contentType": "screenplay", "exportProfile": {"format": "fdx", "includeTitlePage": true}, "editorMechanics": {"spellcheck": "en-US", "autoComplete": true, "strictFormatting": true}}'::jsonb,
  festival_submissions jsonb DEFAULT '[]'::jsonb,
  visibility text DEFAULT 'team'::text NOT NULL,
  share_token text DEFAULT encode(gen_random_bytes(16), 'hex'::text) NOT NULL
);
CREATE TABLE public.scene_links (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  script_id uuid NOT NULL,
  scene_number text NOT NULL,
  asset_id uuid NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.scene_references (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid NOT NULL,
  scene_id uuid NOT NULL,
  concept_asset_id uuid NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.scene_schedule (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  project_id uuid NOT NULL,
  script_id uuid,
  scene_number text,
  scene_heading text,
  shoot_day_id uuid,
  location text,
  estimated_hours numeric DEFAULT 0,
  order_index integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.scenes (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  project_id uuid NOT NULL,
  scene_number integer NOT NULL,
  title text NOT NULL,
  time_of_day text DEFAULT 'DAY'::text,
  location text,
  cast_list text,
  est_duration text,
  shoot_day integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'planned'::text NOT NULL,
  elements jsonb DEFAULT '{}'::jsonb NOT NULL
);
CREATE TABLE public.screenplay_collaborators (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  screenplay_id text NOT NULL,
  user_id text NOT NULL,
  role text DEFAULT 'editor'::text NOT NULL,
  cursor_line integer,
  cursor_col integer,
  last_activity timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.script_annotations (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  script_id uuid NOT NULL,
  project_id uuid NOT NULL,
  line_index integer NOT NULL,
  type text NOT NULL,
  text text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.script_characters (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  script_id uuid NOT NULL,
  name text NOT NULL,
  full_name text,
  age text,
  description text,
  backstory text,
  motivation text,
  arc text,
  relationships text,
  notes text,
  color text DEFAULT '#ff3c00'::text,
  updated_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.script_collaborators (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  script_id uuid NOT NULL,
  user_id uuid NOT NULL,
  permissions text DEFAULT 'view'::text,
  joined_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.script_metadata (
  script_id uuid NOT NULL,
  title_page jsonb DEFAULT '{}'::jsonb NOT NULL,
  character_bible jsonb DEFAULT '[]'::jsonb NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.script_notes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  script_id uuid,
  project_id uuid,
  user_id uuid,
  line_id text,
  selected_text text,
  note text NOT NULL,
  status text DEFAULT 'open'::text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE public.script_revisions (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  script_id uuid NOT NULL,
  color_index integer DEFAULT 0 NOT NULL,
  label text NOT NULL,
  snapshot text DEFAULT ''::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.script_versions (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  script_id uuid NOT NULL,
  content text NOT NULL,
  version integer NOT NULL,
  edited_by uuid,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.scripts (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  project_id uuid,
  title text NOT NULL,
  content text DEFAULT ''::text,
  format text DEFAULT 'screenplay'::text,
  version integer DEFAULT 1,
  last_edited_by uuid,
  status text DEFAULT 'draft'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  title_page jsonb DEFAULT '{}'::jsonb,
  stash_items jsonb DEFAULT '[]'::jsonb,
  daily_goal integer DEFAULT 1000,
  sprint_minutes integer DEFAULT 15,
  learned_rules jsonb,
  created_by uuid,
  share_token text DEFAULT encode(gen_random_bytes(16), 'hex'::text),
  shared boolean DEFAULT false
);
CREATE TABLE public.sfx_assets (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  title text NOT NULL,
  audio_url text NOT NULL,
  duration integer,
  tags text[],
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.shoot_days (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  project_id uuid NOT NULL,
  day_number integer,
  shoot_date date,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.shots (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  project_id uuid NOT NULL,
  scene_id uuid NOT NULL,
  shot_number text NOT NULL,
  shot_size text,
  angle text,
  movement text,
  lens text,
  description text,
  status text DEFAULT 'planned'::text,
  order_index integer DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.spotify_connections (
  user_id uuid NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at bigint NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.studio_assets (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  board_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text,
  asset_url text NOT NULL,
  asset_type text DEFAULT 'image'::text,
  position_x integer DEFAULT 0,
  position_y integer DEFAULT 0,
  width integer DEFAULT 300,
  height integer DEFAULT 300,
  created_at timestamp with time zone DEFAULT now(),
  category text
);
CREATE TABLE public.studio_boards (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  background_color text DEFAULT '#0a0a0a'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  project_id uuid
);
CREATE TABLE public.timeline_items (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  project_id uuid NOT NULL,
  title text DEFAULT ''::text NOT NULL,
  description text,
  start_date date,
  end_date date,
  type text DEFAULT 'milestone'::text,
  status text DEFAULT 'pending'::text,
  assigned_to uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.user_presence (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id text NOT NULL,
  status text DEFAULT 'online'::text NOT NULL,
  last_seen timestamp with time zone DEFAULT now(),
  current_location text,
  current_activity text,
  cursor_line integer,
  cursor_col integer,
  updated_at timestamp with time zone DEFAULT now()
);

-- ── Primary keys ────────────────────────────────────────────────────────────

ALTER TABLE public.activity_feed ADD CONSTRAINT activity_feed_pkey PRIMARY KEY (id);
ALTER TABLE public.asset_comments ADD CONSTRAINT asset_comments_pkey PRIMARY KEY (id);
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.budget_items ADD CONSTRAINT budget_items_pkey PRIMARY KEY (id);
ALTER TABLE public.call_sheet_calls ADD CONSTRAINT call_sheet_calls_pkey PRIMARY KEY (id);
ALTER TABLE public.call_sheets ADD CONSTRAINT call_sheets_pkey PRIMARY KEY (id);
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);
ALTER TABLE public.channel_members ADD CONSTRAINT channel_members_pkey PRIMARY KEY (id);
ALTER TABLE public.channels ADD CONSTRAINT channels_pkey PRIMARY KEY (id);
ALTER TABLE public.character_castings ADD CONSTRAINT character_castings_pkey PRIMARY KEY (id);
ALTER TABLE public.character_references ADD CONSTRAINT character_references_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_channels ADD CONSTRAINT chat_channels_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);
ALTER TABLE public.concept_assets ADD CONSTRAINT concept_assets_pkey PRIMARY KEY (id);
ALTER TABLE public.discord_integrations ADD CONSTRAINT discord_integrations_pkey PRIMARY KEY (channel_id);
ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_pkey PRIMARY KEY (id);
ALTER TABLE public.jobs ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);
ALTER TABLE public.messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE public.portfolio_blocks ADD CONSTRAINT portfolio_blocks_pkey PRIMARY KEY (id);
ALTER TABLE public.portfolio_media ADD CONSTRAINT portfolio_media_pkey PRIMARY KEY (id);
ALTER TABLE public.portfolio_projects ADD CONSTRAINT portfolio_projects_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.project_assets ADD CONSTRAINT project_assets_pkey PRIMARY KEY (id);
ALTER TABLE public.project_audio_references ADD CONSTRAINT project_audio_references_pkey PRIMARY KEY (id);
ALTER TABLE public.project_beats ADD CONSTRAINT project_beats_pkey PRIMARY KEY (id);
ALTER TABLE public.project_crew ADD CONSTRAINT project_crew_pkey PRIMARY KEY (id);
ALTER TABLE public.project_tasks ADD CONSTRAINT project_tasks_pkey PRIMARY KEY (id);
ALTER TABLE public.projects ADD CONSTRAINT projects_pkey PRIMARY KEY (id);
ALTER TABLE public.scene_links ADD CONSTRAINT scene_links_pkey PRIMARY KEY (id);
ALTER TABLE public.scene_references ADD CONSTRAINT scene_references_pkey PRIMARY KEY (id);
ALTER TABLE public.scene_schedule ADD CONSTRAINT scene_schedule_pkey PRIMARY KEY (id);
ALTER TABLE public.scenes ADD CONSTRAINT scenes_pkey PRIMARY KEY (id);
ALTER TABLE public.screenplay_collaborators ADD CONSTRAINT screenplay_collaborators_pkey PRIMARY KEY (id);
ALTER TABLE public.script_annotations ADD CONSTRAINT script_annotations_pkey PRIMARY KEY (id);
ALTER TABLE public.script_characters ADD CONSTRAINT script_characters_pkey PRIMARY KEY (id);
ALTER TABLE public.script_collaborators ADD CONSTRAINT script_collaborators_pkey PRIMARY KEY (id);
ALTER TABLE public.script_metadata ADD CONSTRAINT script_metadata_pkey PRIMARY KEY (script_id);
ALTER TABLE public.script_notes ADD CONSTRAINT script_notes_pkey PRIMARY KEY (id);
ALTER TABLE public.script_revisions ADD CONSTRAINT script_revisions_pkey PRIMARY KEY (id);
ALTER TABLE public.script_versions ADD CONSTRAINT script_versions_pkey PRIMARY KEY (id);
ALTER TABLE public.scripts ADD CONSTRAINT scripts_pkey PRIMARY KEY (id);
ALTER TABLE public.sfx_assets ADD CONSTRAINT sfx_assets_pkey PRIMARY KEY (id);
ALTER TABLE public.shoot_days ADD CONSTRAINT shoot_days_pkey PRIMARY KEY (id);
ALTER TABLE public.shots ADD CONSTRAINT shots_pkey PRIMARY KEY (id);
ALTER TABLE public.spotify_connections ADD CONSTRAINT spotify_connections_pkey PRIMARY KEY (user_id);
ALTER TABLE public.studio_assets ADD CONSTRAINT studio_assets_pkey PRIMARY KEY (id);
ALTER TABLE public.studio_boards ADD CONSTRAINT studio_boards_pkey PRIMARY KEY (id);
ALTER TABLE public.timeline_items ADD CONSTRAINT timeline_items_pkey PRIMARY KEY (id);
ALTER TABLE public.user_presence ADD CONSTRAINT user_presence_pkey PRIMARY KEY (id);

-- ── Unique constraints ──────────────────────────────────────────────────────

ALTER TABLE public.call_sheets ADD CONSTRAINT call_sheets_project_id_shoot_day_key UNIQUE (project_id, shoot_day);
ALTER TABLE public.channel_members ADD CONSTRAINT channel_members_channel_id_user_id_key UNIQUE (channel_id, user_id);
ALTER TABLE public.character_castings ADD CONSTRAINT character_castings_project_id_character_name_key UNIQUE (project_id, character_name);
ALTER TABLE public.character_references ADD CONSTRAINT character_references_character_id_concept_asset_id_key UNIQUE (character_id, concept_asset_id);
ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_job_id_applicant_id_key UNIQUE (job_id, applicant_id);
ALTER TABLE public.portfolio_projects ADD CONSTRAINT portfolio_projects_share_token_key UNIQUE (share_token);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
ALTER TABLE public.project_crew ADD CONSTRAINT project_crew_project_id_user_id_key UNIQUE (project_id, user_id);
ALTER TABLE public.projects ADD CONSTRAINT projects_share_token_key UNIQUE (share_token);
ALTER TABLE public.scene_links ADD CONSTRAINT scene_links_script_id_scene_number_asset_id_key UNIQUE (script_id, scene_number, asset_id);
ALTER TABLE public.scene_references ADD CONSTRAINT scene_references_scene_id_concept_asset_id_key UNIQUE (scene_id, concept_asset_id);
ALTER TABLE public.scene_schedule ADD CONSTRAINT scene_schedule_project_id_scene_number_key UNIQUE (project_id, scene_number);
ALTER TABLE public.screenplay_collaborators ADD CONSTRAINT screenplay_collaborators_screenplay_id_user_id_key UNIQUE (screenplay_id, user_id);
ALTER TABLE public.script_characters ADD CONSTRAINT script_characters_script_id_name_key UNIQUE (script_id, name);
ALTER TABLE public.script_collaborators ADD CONSTRAINT script_collaborators_script_id_user_id_key UNIQUE (script_id, user_id);
ALTER TABLE public.scripts ADD CONSTRAINT scripts_share_token_key UNIQUE (share_token);
ALTER TABLE public.shoot_days ADD CONSTRAINT shoot_days_project_id_day_number_key UNIQUE (project_id, day_number);
ALTER TABLE public.user_presence ADD CONSTRAINT user_presence_user_id_key UNIQUE (user_id);

-- ── Check constraints ───────────────────────────────────────────────────────

ALTER TABLE public.channels ADD CONSTRAINT channels_post_policy_check CHECK ((post_policy = ANY (ARRAY['viewers'::text, 'members'::text, 'managers'::text])));
ALTER TABLE public.channels ADD CONSTRAINT channels_type_check CHECK ((type = ANY (ARRAY['text'::text, 'voice'::text])));
ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])));
ALTER TABLE public.jobs ADD CONSTRAINT jobs_rate_type_check CHECK ((rate_type = ANY (ARRAY['hourly'::text, 'fixed'::text])));
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in-progress'::text, 'closed'::text])));
ALTER TABLE public.portfolio_blocks ADD CONSTRAINT portfolio_blocks_block_type_check CHECK ((block_type = ANY (ARRAY['cover'::text, 'concept'::text, 'scene'::text, 'budget'::text, 'crew'::text, 'script'::text, 'text'::text, 'media'::text])));
ALTER TABLE public.portfolio_media ADD CONSTRAINT portfolio_media_media_type_check CHECK ((media_type = ANY (ARRAY['youtube'::text, 'gdrive'::text, 'image'::text])));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK ((status = ANY (ARRAY['OPEN'::text, 'BUSY'::text])));
ALTER TABLE public.project_assets ADD CONSTRAINT project_assets_type_check CHECK ((type = ANY (ARRAY['youtube'::text, 'gdrive'::text, 'image'::text, 'video'::text])));
ALTER TABLE public.project_audio_references ADD CONSTRAINT project_audio_references_reference_type_check CHECK ((reference_type = ANY (ARRAY['spotify'::text, 'youtube'::text, 'custom_upload'::text])));
ALTER TABLE public.project_crew ADD CONSTRAINT project_crew_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'declined'::text])));
ALTER TABLE public.projects ADD CONSTRAINT projects_visibility_check CHECK ((visibility = ANY (ARRAY['private'::text, 'team'::text, 'link'::text, 'public'::text])));
ALTER TABLE public.scenes ADD CONSTRAINT scenes_time_of_day_check CHECK ((time_of_day = ANY (ARRAY['DAY'::text, 'NIGHT'::text, 'DAWN'::text, 'DUSK'::text])));
ALTER TABLE public.script_annotations ADD CONSTRAINT script_annotations_type_check CHECK ((type = ANY (ARRAY['shot'::text, 'beat'::text, 'note'::text, 'revision'::text, 'reference'::text, 'todo'::text])));
ALTER TABLE public.script_collaborators ADD CONSTRAINT script_collaborators_permissions_check CHECK ((permissions = ANY (ARRAY['view'::text, 'comment'::text, 'edit'::text])));
ALTER TABLE public.scripts ADD CONSTRAINT scripts_format_check CHECK ((format = ANY (ARRAY['screenplay'::text, 'teleplay'::text, 'stage-play'::text, 'treatment'::text, 'podcast'::text, 'doc-outline'::text])));
ALTER TABLE public.shots ADD CONSTRAINT shots_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'shot'::text, 'omitted'::text])));
ALTER TABLE public.timeline_items ADD CONSTRAINT timeline_items_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in-progress'::text, 'completed'::text, 'cancelled'::text])));
ALTER TABLE public.timeline_items ADD CONSTRAINT timeline_items_type_check CHECK ((type = ANY (ARRAY['milestone'::text, 'task'::text, 'event'::text, 'deadline'::text])));
ALTER TABLE public.user_presence ADD CONSTRAINT user_presence_status_check CHECK ((status = ANY (ARRAY['online'::text, 'away'::text, 'offline'::text])));

-- ── Foreign keys ────────────────────────────────────────────────────────────

ALTER TABLE public.activity_feed ADD CONSTRAINT activity_feed_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.asset_comments ADD CONSTRAINT asset_comments_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.studio_assets(id) ON DELETE CASCADE;
ALTER TABLE public.asset_comments ADD CONSTRAINT asset_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.budget_items ADD CONSTRAINT budget_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.budget_items ADD CONSTRAINT budget_items_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;
ALTER TABLE public.budget_items ADD CONSTRAINT budget_items_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.call_sheet_calls ADD CONSTRAINT call_sheet_calls_call_sheet_id_fkey FOREIGN KEY (call_sheet_id) REFERENCES public.call_sheets(id) ON DELETE CASCADE;
ALTER TABLE public.call_sheet_calls ADD CONSTRAINT call_sheet_calls_crew_user_id_fkey FOREIGN KEY (crew_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.call_sheets ADD CONSTRAINT call_sheets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.call_sheets ADD CONSTRAINT call_sheets_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id);
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.channel_members ADD CONSTRAINT channel_members_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE;
ALTER TABLE public.channel_members ADD CONSTRAINT channel_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.channels ADD CONSTRAINT channels_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.channels ADD CONSTRAINT channels_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.character_castings ADD CONSTRAINT character_castings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.character_castings ADD CONSTRAINT character_castings_crew_user_id_fkey FOREIGN KEY (crew_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.character_castings ADD CONSTRAINT character_castings_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.character_references ADD CONSTRAINT character_references_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.script_characters(id) ON DELETE CASCADE;
ALTER TABLE public.character_references ADD CONSTRAINT character_references_concept_asset_id_fkey FOREIGN KEY (concept_asset_id) REFERENCES public.concept_assets(id) ON DELETE CASCADE;
ALTER TABLE public.character_references ADD CONSTRAINT character_references_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.character_references ADD CONSTRAINT character_references_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.chat_channels(id) ON DELETE CASCADE;
ALTER TABLE public.concept_assets ADD CONSTRAINT concept_assets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.concept_assets ADD CONSTRAINT concept_assets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.discord_integrations ADD CONSTRAINT discord_integrations_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE;
ALTER TABLE public.discord_integrations ADD CONSTRAINT discord_integrations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_applicant_id_fkey FOREIGN KEY (applicant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_budget_item_id_fkey FOREIGN KEY (budget_item_id) REFERENCES public.budget_items(id) ON DELETE SET NULL;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.jobs ADD CONSTRAINT jobs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_channel_uuid_fkey FOREIGN KEY (channel_uuid) REFERENCES public.channels(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_parent_message_id_fkey FOREIGN KEY (parent_message_id) REFERENCES public.messages(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.portfolio_blocks ADD CONSTRAINT portfolio_blocks_portfolio_project_id_fkey FOREIGN KEY (portfolio_project_id) REFERENCES public.portfolio_projects(id) ON DELETE CASCADE;
ALTER TABLE public.portfolio_media ADD CONSTRAINT portfolio_media_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.portfolio_projects(id) ON DELETE CASCADE;
ALTER TABLE public.portfolio_projects ADD CONSTRAINT portfolio_projects_source_project_id_fkey FOREIGN KEY (source_project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.portfolio_projects ADD CONSTRAINT portfolio_projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.project_assets ADD CONSTRAINT project_assets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.project_assets ADD CONSTRAINT project_assets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.project_audio_references ADD CONSTRAINT project_audio_references_added_by_fkey FOREIGN KEY (added_by) REFERENCES auth.users(id);
ALTER TABLE public.project_audio_references ADD CONSTRAINT project_audio_references_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.project_audio_references ADD CONSTRAINT project_audio_references_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE SET NULL;
ALTER TABLE public.project_beats ADD CONSTRAINT project_beats_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.project_beats ADD CONSTRAINT project_beats_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.project_beats ADD CONSTRAINT project_beats_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE SET NULL;
ALTER TABLE public.project_crew ADD CONSTRAINT project_crew_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id);
ALTER TABLE public.project_crew ADD CONSTRAINT project_crew_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.project_crew ADD CONSTRAINT project_crew_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.project_tasks ADD CONSTRAINT project_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);
ALTER TABLE public.project_tasks ADD CONSTRAINT project_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.projects ADD CONSTRAINT projects_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.scene_links ADD CONSTRAINT scene_links_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.studio_assets(id) ON DELETE CASCADE;
ALTER TABLE public.scene_links ADD CONSTRAINT scene_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.scene_links ADD CONSTRAINT scene_links_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;
ALTER TABLE public.scene_references ADD CONSTRAINT scene_references_concept_asset_id_fkey FOREIGN KEY (concept_asset_id) REFERENCES public.concept_assets(id) ON DELETE CASCADE;
ALTER TABLE public.scene_references ADD CONSTRAINT scene_references_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.scene_references ADD CONSTRAINT scene_references_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.scene_references ADD CONSTRAINT scene_references_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE CASCADE;
ALTER TABLE public.scene_schedule ADD CONSTRAINT scene_schedule_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.scene_schedule ADD CONSTRAINT scene_schedule_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE SET NULL;
ALTER TABLE public.scene_schedule ADD CONSTRAINT scene_schedule_shoot_day_id_fkey FOREIGN KEY (shoot_day_id) REFERENCES public.shoot_days(id) ON DELETE SET NULL;
ALTER TABLE public.scenes ADD CONSTRAINT scenes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.script_annotations ADD CONSTRAINT script_annotations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.script_annotations ADD CONSTRAINT script_annotations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.script_annotations ADD CONSTRAINT script_annotations_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;
ALTER TABLE public.script_characters ADD CONSTRAINT script_characters_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;
ALTER TABLE public.script_characters ADD CONSTRAINT script_characters_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id);
ALTER TABLE public.script_collaborators ADD CONSTRAINT script_collaborators_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;
ALTER TABLE public.script_collaborators ADD CONSTRAINT script_collaborators_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.script_metadata ADD CONSTRAINT script_metadata_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;
ALTER TABLE public.script_metadata ADD CONSTRAINT script_metadata_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE public.script_notes ADD CONSTRAINT script_notes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.script_notes ADD CONSTRAINT script_notes_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;
ALTER TABLE public.script_notes ADD CONSTRAINT script_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.script_revisions ADD CONSTRAINT script_revisions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.script_revisions ADD CONSTRAINT script_revisions_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;
ALTER TABLE public.script_versions ADD CONSTRAINT script_versions_edited_by_fkey FOREIGN KEY (edited_by) REFERENCES public.profiles(id);
ALTER TABLE public.script_versions ADD CONSTRAINT script_versions_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;
ALTER TABLE public.scripts ADD CONSTRAINT scripts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.scripts ADD CONSTRAINT scripts_last_edited_by_fkey FOREIGN KEY (last_edited_by) REFERENCES public.profiles(id);
ALTER TABLE public.scripts ADD CONSTRAINT scripts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.sfx_assets ADD CONSTRAINT sfx_assets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.sfx_assets ADD CONSTRAINT sfx_assets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.shoot_days ADD CONSTRAINT shoot_days_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.shots ADD CONSTRAINT shots_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.shots ADD CONSTRAINT shots_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.shots ADD CONSTRAINT shots_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE CASCADE;
ALTER TABLE public.spotify_connections ADD CONSTRAINT spotify_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.studio_assets ADD CONSTRAINT studio_assets_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.studio_boards(id) ON DELETE CASCADE;
ALTER TABLE public.studio_assets ADD CONSTRAINT studio_assets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.studio_boards ADD CONSTRAINT studio_boards_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.studio_boards ADD CONSTRAINT studio_boards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.timeline_items ADD CONSTRAINT timeline_items_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);
ALTER TABLE public.timeline_items ADD CONSTRAINT timeline_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.timeline_items ADD CONSTRAINT timeline_items_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- ── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_activity_created ON public.activity_feed USING btree (created_at);
CREATE INDEX idx_activity_user ON public.activity_feed USING btree (user_id);
CREATE INDEX idx_asset_comments_asset_id ON public.asset_comments USING btree (asset_id);
CREATE INDEX idx_asset_comments_user_id ON public.asset_comments USING btree (user_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);
CREATE INDEX idx_budget_items_created_by ON public.budget_items USING btree (created_by);
CREATE INDEX idx_budget_items_job_id ON public.budget_items USING btree (job_id);
CREATE INDEX idx_budget_items_project ON public.budget_items USING btree (project_id);
CREATE INDEX idx_call_sheet_calls_sheet ON public.call_sheet_calls USING btree (call_sheet_id);
CREATE INDEX idx_call_sheets_project ON public.call_sheets USING btree (project_id);
CREATE INDEX idx_campaigns_created_by ON public.campaigns USING btree (created_by);
CREATE INDEX idx_campaigns_project ON public.campaigns USING btree (project_id);
CREATE INDEX channel_members_channel_idx ON public.channel_members USING btree (channel_id);
CREATE INDEX idx_channel_members_user_id ON public.channel_members USING btree (user_id);
CREATE INDEX channels_project_idx ON public.channels USING btree (project_id, "position");
CREATE INDEX idx_channels_created_by ON public.channels USING btree (created_by);
CREATE INDEX idx_character_castings_crew_user ON public.character_castings USING btree (crew_user_id);
CREATE INDEX idx_character_castings_project ON public.character_castings USING btree (project_id);
CREATE INDEX idx_character_references_char ON public.character_references USING btree (character_id);
CREATE INDEX idx_character_references_concept_asset_id ON public.character_references USING btree (concept_asset_id);
CREATE INDEX idx_character_references_created_by ON public.character_references USING btree (created_by);
CREATE INDEX idx_character_references_project ON public.character_references USING btree (project_id);
CREATE INDEX idx_chat_channels_created_at ON public.chat_channels USING btree (created_at DESC);
CREATE INDEX idx_chat_channels_project_id ON public.chat_channels USING btree (project_id);
CREATE INDEX idx_chat_messages_channel_id ON public.chat_messages USING btree (channel_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages USING btree (created_at DESC);
CREATE INDEX idx_chat_messages_sender_id ON public.chat_messages USING btree (sender_id);
CREATE INDEX concept_assets_project_board_idx ON public.concept_assets USING btree (project_id, board);
CREATE INDEX idx_concept_assets_created_by ON public.concept_assets USING btree (created_by);
CREATE INDEX idx_concept_assets_project ON public.concept_assets USING btree (project_id);
CREATE INDEX idx_job_applications_applicant_id ON public.job_applications USING btree (applicant_id);
CREATE INDEX idx_jobs_budget_item ON public.jobs USING btree (budget_item_id);
CREATE INDEX idx_jobs_created_by ON public.jobs USING btree (created_by);
CREATE INDEX idx_jobs_project_id ON public.jobs USING btree (project_id);
CREATE INDEX idx_jobs_status ON public.jobs USING btree (status);
CREATE INDEX idx_messages_channel ON public.messages USING btree (channel_id);
CREATE INDEX idx_messages_receiver_id ON public.messages USING btree (receiver_id);
CREATE INDEX idx_messages_sender ON public.messages USING btree (sender_id);
CREATE INDEX messages_channel_uuid_idx ON public.messages USING btree (channel_uuid);
CREATE INDEX messages_parent_idx ON public.messages USING btree (parent_message_id);
CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx ON public.notifications USING btree (user_id, read, created_at DESC);
CREATE INDEX portfolio_blocks_project_idx ON public.portfolio_blocks USING btree (portfolio_project_id, "position");
CREATE INDEX idx_portfolio_media_project_id ON public.portfolio_media USING btree (project_id);
CREATE INDEX idx_portfolio_projects_source ON public.portfolio_projects USING btree (source_project_id);
CREATE UNIQUE INDEX idx_portfolio_projects_source_unique ON public.portfolio_projects USING btree (user_id, source_project_id) WHERE (source_project_id IS NOT NULL);
CREATE INDEX idx_project_assets_created_by ON public.project_assets USING btree (created_by);
CREATE INDEX idx_project_assets_project ON public.project_assets USING btree (project_id);
CREATE INDEX idx_project_beats_created_by ON public.project_beats USING btree (created_by);
CREATE INDEX idx_project_beats_project ON public.project_beats USING btree (project_id);
CREATE INDEX idx_project_beats_script_id ON public.project_beats USING btree (script_id);
CREATE INDEX idx_project_crew_invited_by ON public.project_crew USING btree (invited_by);
CREATE INDEX idx_project_crew_user_id ON public.project_crew USING btree (user_id);
CREATE INDEX idx_project_tasks_assigned_to ON public.project_tasks USING btree (assigned_to);
CREATE INDEX idx_project_tasks_project_id ON public.project_tasks USING btree (project_id);
CREATE INDEX idx_projects_creator ON public.projects USING btree (creator_id);
CREATE INDEX idx_projects_status ON public.projects USING btree (status);
CREATE INDEX idx_scene_links_asset ON public.scene_links USING btree (asset_id);
CREATE INDEX idx_scene_links_created_by ON public.scene_links USING btree (created_by);
CREATE INDEX idx_scene_links_script ON public.scene_links USING btree (script_id, scene_number);
CREATE INDEX idx_scene_references_concept_asset_id ON public.scene_references USING btree (concept_asset_id);
CREATE INDEX idx_scene_references_created_by ON public.scene_references USING btree (created_by);
CREATE INDEX idx_scene_references_project ON public.scene_references USING btree (project_id);
CREATE INDEX idx_scene_references_scene ON public.scene_references USING btree (scene_id);
CREATE INDEX idx_scene_schedule_project ON public.scene_schedule USING btree (project_id);
CREATE INDEX idx_scene_schedule_script_id ON public.scene_schedule USING btree (script_id);
CREATE INDEX idx_scene_schedule_shoot_day_id ON public.scene_schedule USING btree (shoot_day_id);
CREATE INDEX idx_scenes_project ON public.scenes USING btree (project_id);
CREATE INDEX idx_screenplay_collaborators_screenplay_id ON public.screenplay_collaborators USING btree (screenplay_id);
CREATE INDEX idx_screenplay_collaborators_user_id ON public.screenplay_collaborators USING btree (user_id);
CREATE INDEX idx_script_annotations_script ON public.script_annotations USING btree (script_id);
CREATE INDEX idx_script_characters_script ON public.script_characters USING btree (script_id);
CREATE INDEX idx_script_characters_updated_by ON public.script_characters USING btree (updated_by);
CREATE INDEX idx_script_collaborators_user_id ON public.script_collaborators USING btree (user_id);
CREATE INDEX idx_script_metadata_updated_by ON public.script_metadata USING btree (updated_by);
CREATE INDEX idx_script_revisions_created_by ON public.script_revisions USING btree (created_by);
CREATE INDEX idx_script_revisions_script ON public.script_revisions USING btree (script_id, created_at);
CREATE INDEX idx_script_versions_edited_by ON public.script_versions USING btree (edited_by);
CREATE INDEX idx_script_versions_script_id ON public.script_versions USING btree (script_id);
CREATE INDEX idx_scripts_created_by ON public.scripts USING btree (created_by);
CREATE INDEX idx_scripts_last_edited_by ON public.scripts USING btree (last_edited_by);
CREATE INDEX idx_scripts_project ON public.scripts USING btree (project_id);
CREATE INDEX idx_shoot_days_project ON public.shoot_days USING btree (project_id);
CREATE INDEX idx_shots_project ON public.shots USING btree (project_id);
CREATE INDEX idx_shots_scene ON public.shots USING btree (scene_id);
CREATE INDEX idx_studio_assets_board_id ON public.studio_assets USING btree (board_id);
CREATE INDEX idx_studio_assets_user_id ON public.studio_assets USING btree (user_id);
CREATE INDEX idx_studio_boards_user_id ON public.studio_boards USING btree (user_id);
CREATE INDEX idx_timeline_items_assigned_to ON public.timeline_items USING btree (assigned_to);
CREATE INDEX idx_timeline_items_created_by ON public.timeline_items USING btree (created_by);
CREATE INDEX idx_timeline_items_project ON public.timeline_items USING btree (project_id);
CREATE INDEX idx_user_presence_updated_at ON public.user_presence USING btree (updated_at DESC);

-- ── Row level security: on for every table ──────────────────────────────────

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sheet_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_castings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_audio_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_beats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenplay_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sfx_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shoot_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotify_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- ── Functions ───────────────────────────────────────────────────────────────
-- Reproduced exactly as they exist in production, including a known defect:
-- internal.can_access_script references public.is_project_creator /
-- public.is_project_member, which do not exist (the helpers live in `internal`).
-- It is fixed in a later migration, where a test proves the fix.

CREATE OR REPLACE FUNCTION internal.can_access_script(sid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.scripts s
    where s.id = sid and (
      s.created_by = auth.uid()
      or s.last_edited_by = auth.uid()
      or (s.project_id is not null and (
        public.is_project_creator(s.project_id) or public.is_project_member(s.project_id)
      ))
    )
  );
$function$;

CREATE OR REPLACE FUNCTION internal.is_project_creator(pid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM projects WHERE id = pid AND creator_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION internal.is_project_member(pid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM project_crew WHERE project_id = pid AND user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION internal.can_view_channel(cid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from channels c where c.id = cid and (
      c.project_id is null
      or internal.is_project_creator(c.project_id)
      or (c.is_private = false and internal.is_project_member(c.project_id))
      or (c.is_private = true and exists (select 1 from channel_members m where m.channel_id = c.id and m.user_id = auth.uid()))
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_channel(cid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from channels c where c.id = cid and (
      (c.project_id is not null and internal.is_project_creator(c.project_id))
      or (c.project_id is null and c.created_by = auth.uid())
      or exists (select 1 from channel_members m where m.channel_id = c.id and m.user_id = auth.uid() and m.can_manage)
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_post_channel(cid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select internal.can_view_channel(cid) and exists (
    select 1 from channels c where c.id = cid and (
      case c.post_policy
        when 'viewers' then true
        when 'members' then (public.can_manage_channel(cid) or exists (select 1 from channel_members m where m.channel_id = c.id and m.user_id = auth.uid() and m.can_post))
        when 'managers' then public.can_manage_channel(cid)
        else true
      end
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.clean_old_presences()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM user_presence
  WHERE status = 'offline' AND last_seen < now() - interval '24 hours';
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_shared_project(p_token text)
 RETURNS TABLE(title text, description text, status text, accent_color text, visibility text, creator_username text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT p.title, p.description, p.status, p.accent_color, p.visibility, pr.username
  FROM public.projects p
  LEFT JOIN public.profiles pr ON pr.id = p.creator_id
  WHERE p.share_token = p_token
    AND p.visibility IN ('link', 'public');
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uname text;
begin
  uname := coalesce(
    nullif(new.raw_user_meta_data->>'username', ''),
    nullif(split_part(new.email, '@', 1), ''),
    'user_' || substr(new.id::text, 1, 8)
  );
  insert into public.profiles (id, username, status)
  values (new.id, uname, 'OPEN')
  on conflict (id) do nothing;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.has_discord_webhook(cid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM discord_integrations WHERE channel_id = cid);
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_message_reaction(p_message uuid, p_emoji text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid text := auth.uid()::text;
  r jsonb;
  arr jsonb;
  m record;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select id, channel_id, sender_id, receiver_id, reactions into m from messages where id = p_message;
  if not found then raise exception 'message not found'; end if;
  -- Only allow reacting to messages the caller can see (channel, or their DM).
  if not (m.channel_id is not null or m.sender_id::text = uid or m.receiver_id::text = uid) then
    raise exception 'not permitted';
  end if;

  r := coalesce(m.reactions, '{}'::jsonb);
  arr := coalesce(r -> p_emoji, '[]'::jsonb);
  if arr @> to_jsonb(uid) then
    arr := (select coalesce(jsonb_agg(to_jsonb(e)), '[]'::jsonb) from jsonb_array_elements_text(arr) e where e <> uid);
    if jsonb_array_length(arr) = 0 then r := r - p_emoji; else r := jsonb_set(r, array[p_emoji], arr); end if;
  else
    arr := arr || to_jsonb(uid);
    r := jsonb_set(r, array[p_emoji], arr, true);
  end if;

  update messages set reactions = r where id = p_message;
  return r;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_collaborator_cursor(p_screenplay_id text, p_user_id text, p_line integer, p_col integer)
 RETURNS screenplay_collaborators
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  UPDATE screenplay_collaborators
  SET
    cursor_line = p_line,
    cursor_col = p_col,
    last_activity = now(),
    updated_at = now()
  WHERE screenplay_id = p_screenplay_id AND user_id = p_user_id
  RETURNING *;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_presence(p_user_id text, p_status text DEFAULT NULL::text, p_location text DEFAULT NULL::text, p_activity text DEFAULT NULL::text)
 RETURNS user_presence
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  UPDATE user_presence
  SET
    status = COALESCE(p_status, status),
    current_location = COALESCE(p_location, current_location),
    current_activity = COALESCE(p_activity, current_activity),
    last_seen = now(),
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING *;
$function$;

-- ── Function privileges (explicit, matching production exactly) ─────────────

DO $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'internal.can_access_script(uuid)', 'internal.is_project_creator(uuid)',
    'internal.is_project_member(uuid)', 'internal.can_view_channel(uuid)',
    'public.can_manage_channel(uuid)', 'public.can_post_channel(uuid)',
    'public.clean_old_presences()', 'public.get_shared_project(text)',
    'public.handle_new_user()', 'public.has_discord_webhook(uuid)',
    'public.rls_auto_enable()', 'public.toggle_message_reaction(uuid, text)',
    'public.update_collaborator_cursor(text, text, integer, integer)',
    'public.update_updated_at()', 'public.update_updated_at_column()',
    'public.update_user_presence(text, text, text, text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;

-- Signed-in only
GRANT EXECUTE ON FUNCTION internal.can_access_script(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION internal.is_project_creator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION internal.is_project_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION internal.can_view_channel(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_channel(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_post_channel(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_message_reaction(uuid, text) TO authenticated;
-- Share links resolve for anyone holding the token
GRANT EXECUTE ON FUNCTION public.get_shared_project(text) TO anon, authenticated;
-- Callable by everyone (PUBLIC) in production
GRANT EXECUTE ON FUNCTION public.clean_old_presences() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_discord_webhook(uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_collaborator_cursor(text, text, integer, integer) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_presence(text, text, text, text) TO PUBLIC, anon, authenticated;

-- ── Views ───────────────────────────────────────────────────────────────────

CREATE VIEW public.active_users WITH (security_invoker = on) AS
 SELECT id,
    user_id,
    status,
    current_location,
    current_activity,
    last_seen,
    (EXTRACT(epoch FROM (now() - last_seen)))::integer AS idle_seconds
   FROM user_presence
  WHERE (status = ANY (ARRAY['online'::text, 'away'::text]))
  ORDER BY last_seen DESC;

CREATE VIEW public.channel_activity WITH (security_invoker = on) AS
 SELECT c.id,
    c.name,
    count(m.id) AS message_count,
    max(m.created_at) AS last_message,
    count(DISTINCT m.sender_id) AS unique_senders
   FROM (chat_channels c
     LEFT JOIN chat_messages m ON ((c.id = m.channel_id)))
  GROUP BY c.id, c.name
  ORDER BY (max(m.created_at)) DESC NULLS LAST;

-- ── Triggers ────────────────────────────────────────────────────────────────

CREATE TRIGGER budget_items_updated_at BEFORE UPDATE ON public.budget_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_screenplay_collab_updated_at BEFORE UPDATE ON public.screenplay_collaborators FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER scripts_updated_at BEFORE UPDATE ON public.scripts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER timeline_items_updated_at BEFORE UPDATE ON public.timeline_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_user_presence_updated_at BEFORE UPDATE ON public.user_presence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Every new table in public gets RLS switched on automatically.
CREATE EVENT TRIGGER ensure_rls ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();

-- ── Row level security policies ─────────────────────────────────────────────

CREATE POLICY "Activity readable by project members" ON public.activity_feed FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR ((metadata ->> 'project_id'::text) IS NULL) OR (((metadata ->> 'project_id'::text))::uuid IN ( SELECT projects.id
   FROM projects
  WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
UNION
 SELECT project_crew.project_id
   FROM project_crew
  WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "Authenticated users log activity" ON public.activity_feed FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (user_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "Asset owner can comment" ON public.asset_comments FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (user_id = ( SELECT auth.uid() AS uid)) AND (asset_id IN ( SELECT studio_assets.id
   FROM studio_assets
  WHERE (studio_assets.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "Asset owner can view comments" ON public.asset_comments FOR SELECT TO authenticated USING ((asset_id IN ( SELECT studio_assets.id
   FROM studio_assets
  WHERE (studio_assets.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_admin = true)))));
CREATE POLICY "Authenticated users can create audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));
CREATE POLICY "Budget members can manage" ON public.budget_items FOR ALL TO authenticated USING ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
UNION
 SELECT project_crew.project_id
   FROM project_crew
  WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Budget members can view" ON public.budget_items FOR SELECT TO authenticated USING ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
UNION
 SELECT project_crew.project_id
   FROM project_crew
  WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Call sheet calls viewable by project creator or crew" ON public.call_sheet_calls FOR SELECT TO public USING ((call_sheet_id IN ( SELECT call_sheets.id
   FROM call_sheets
  WHERE (internal.is_project_creator(call_sheets.project_id) OR internal.is_project_member(call_sheets.project_id)))));
CREATE POLICY "Call sheet calls writable by project creator or crew" ON public.call_sheet_calls FOR ALL TO public USING ((call_sheet_id IN ( SELECT call_sheets.id
   FROM call_sheets
  WHERE (internal.is_project_creator(call_sheets.project_id) OR internal.is_project_member(call_sheets.project_id))))) WITH CHECK ((call_sheet_id IN ( SELECT call_sheets.id
   FROM call_sheets
  WHERE (internal.is_project_creator(call_sheets.project_id) OR internal.is_project_member(call_sheets.project_id)))));
CREATE POLICY "Call sheets viewable by project creator or crew" ON public.call_sheets FOR SELECT TO public USING ((internal.is_project_creator(project_id) OR internal.is_project_member(project_id)));
CREATE POLICY "Call sheets writable by project creator or crew" ON public.call_sheets FOR ALL TO public USING ((internal.is_project_creator(project_id) OR internal.is_project_member(project_id))) WITH CHECK ((internal.is_project_creator(project_id) OR internal.is_project_member(project_id)));
CREATE POLICY "Campaigns: project members can manage" ON public.campaigns FOR ALL TO authenticated USING ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
UNION
 SELECT project_crew.project_id
   FROM project_crew
  WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Campaigns: project members can view" ON public.campaigns FOR SELECT TO authenticated USING ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
UNION
 SELECT project_crew.project_id
   FROM project_crew
  WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "channel_members manage" ON public.channel_members FOR ALL TO authenticated USING (can_manage_channel(channel_id)) WITH CHECK (can_manage_channel(channel_id));
CREATE POLICY "channel_members viewable" ON public.channel_members FOR SELECT TO authenticated USING (internal.can_view_channel(channel_id));
CREATE POLICY "channels create by project creator or crew" ON public.channels FOR INSERT TO public WITH CHECK (((project_id IS NOT NULL) AND (internal.is_project_creator(project_id) OR internal.is_project_member(project_id))));
CREATE POLICY "channels delete" ON public.channels FOR DELETE TO authenticated USING (can_manage_channel(id));
CREATE POLICY "channels update" ON public.channels FOR UPDATE TO authenticated USING (can_manage_channel(id));
CREATE POLICY "channels viewable" ON public.channels FOR SELECT TO authenticated USING (internal.can_view_channel(id));
CREATE POLICY "Castings viewable by project creator or crew" ON public.character_castings FOR SELECT TO public USING ((internal.is_project_creator(project_id) OR internal.is_project_member(project_id)));
CREATE POLICY "Castings writable by project creator or crew" ON public.character_castings FOR ALL TO public USING ((internal.is_project_creator(project_id) OR internal.is_project_member(project_id))) WITH CHECK ((internal.is_project_creator(project_id) OR internal.is_project_member(project_id)));
CREATE POLICY "char_refs delete" ON public.character_references FOR DELETE TO authenticated USING ((internal.is_project_creator(project_id) OR internal.is_project_member(project_id)));
CREATE POLICY "char_refs insert" ON public.character_references FOR INSERT TO authenticated WITH CHECK (((internal.is_project_creator(project_id) OR internal.is_project_member(project_id)) AND (created_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY "char_refs view" ON public.character_references FOR SELECT TO authenticated USING ((internal.is_project_creator(project_id) OR internal.is_project_member(project_id)));
CREATE POLICY chat_channels_insert ON public.chat_channels FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));
CREATE POLICY chat_channels_read ON public.chat_channels FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) IS NOT NULL));
CREATE POLICY chat_messages_insert ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid))::text = sender_id));
CREATE POLICY chat_messages_read ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Concept assets: project members can manage" ON public.concept_assets FOR ALL TO authenticated USING ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
UNION
 SELECT project_crew.project_id
   FROM project_crew
  WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Concept assets: project members can view" ON public.concept_assets FOR SELECT TO authenticated USING ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
UNION
 SELECT project_crew.project_id
   FROM project_crew
  WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "discord webhook removed by channel managers" ON public.discord_integrations FOR DELETE TO authenticated USING (can_manage_channel(channel_id));
CREATE POLICY "discord webhook set by channel managers" ON public.discord_integrations FOR INSERT TO authenticated WITH CHECK ((can_manage_channel(channel_id) AND (created_by = auth.uid())));
CREATE POLICY "discord webhook updated by channel managers" ON public.discord_integrations FOR UPDATE TO authenticated USING (can_manage_channel(channel_id)) WITH CHECK (can_manage_channel(channel_id));
CREATE POLICY "Job owners can update application status" ON public.job_applications FOR UPDATE TO authenticated USING ((job_id IN ( SELECT jobs.id
   FROM jobs
  WHERE (jobs.created_by = ( SELECT auth.uid() AS uid))))) WITH CHECK ((job_id IN ( SELECT jobs.id
   FROM jobs
  WHERE (jobs.created_by = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Job owners can view applications" ON public.job_applications FOR SELECT TO authenticated USING ((job_id IN ( SELECT jobs.id
   FROM jobs
  WHERE (jobs.created_by = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Users can apply for jobs" ON public.job_applications FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = applicant_id));
CREATE POLICY "Users can view their own applications" ON public.job_applications FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = applicant_id));
CREATE POLICY "Authenticated users create jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (created_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY "Job creators can update" ON public.jobs FOR UPDATE TO authenticated USING ((created_by = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Jobs publicly readable" ON public.jobs FOR SELECT TO public USING (((status = 'open'::text) OR (created_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY "Authenticated users send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (sender_id = ( SELECT auth.uid() AS uid)) AND ((receiver_id IS NOT NULL) OR ((channel_uuid IS NOT NULL) AND can_post_channel(channel_uuid)) OR ((channel_uuid IS NULL) AND (channel_id IS NOT NULL)))));
CREATE POLICY "Channel messages readable" ON public.messages FOR SELECT TO authenticated USING (((sender_id = ( SELECT auth.uid() AS uid)) OR (receiver_id = ( SELECT auth.uid() AS uid)) OR ((channel_uuid IS NOT NULL) AND internal.can_view_channel(channel_uuid)) OR ((channel_uuid IS NULL) AND (channel_id IS NOT NULL))));
CREATE POLICY "Authenticated users can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));
CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Portfolio blocks owner write" ON public.portfolio_blocks FOR ALL TO public USING ((portfolio_project_id IN ( SELECT portfolio_projects.id
   FROM portfolio_projects
  WHERE (portfolio_projects.user_id = auth.uid()))));
CREATE POLICY "Portfolio blocks readable" ON public.portfolio_blocks FOR SELECT TO public USING (true);
CREATE POLICY "Portfolio media owner write" ON public.portfolio_media FOR ALL TO authenticated USING ((project_id IN ( SELECT portfolio_projects.id
   FROM portfolio_projects
  WHERE (portfolio_projects.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Portfolio media readable" ON public.portfolio_media FOR SELECT TO public USING (true);
CREATE POLICY "Portfolio owner can manage media" ON public.portfolio_media FOR ALL TO authenticated USING ((project_id IN ( SELECT portfolio_projects.id
   FROM portfolio_projects
  WHERE (portfolio_projects.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Portfolio owner only write" ON public.portfolio_projects FOR ALL TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Portfolio publicly readable" ON public.portfolio_projects FOR SELECT TO public USING (true);
CREATE POLICY "Profiles readable by all" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = id));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = id));
CREATE POLICY "Project creators can manage assets" ON public.project_assets FOR ALL TO authenticated USING ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))))) WITH CHECK ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.creator_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Project members can view assets" ON public.project_assets FOR SELECT TO authenticated USING ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
UNION
 SELECT project_crew.project_id
   FROM project_crew
  WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Project audio refs are viewable by everyone" ON public.project_audio_references FOR SELECT TO public USING (true);
CREATE POLICY "Users can add project audio refs" ON public.project_audio_references FOR INSERT TO public WITH CHECK ((auth.uid() = added_by));
CREATE POLICY "Users can delete own audio refs" ON public.project_audio_references FOR DELETE TO public USING ((auth.uid() = added_by));
CREATE POLICY "Project members can manage beats" ON public.project_beats FOR ALL TO authenticated USING ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
UNION
 SELECT project_crew.project_id
   FROM project_crew
  WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Project creators can manage crew" ON public.project_crew FOR INSERT TO authenticated WITH CHECK (internal.is_project_creator(project_id));
CREATE POLICY "Project creators can remove crew" ON public.project_crew FOR DELETE TO authenticated USING ((internal.is_project_creator(project_id) OR (user_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "Project creators can update crew" ON public.project_crew FOR UPDATE TO authenticated USING (internal.is_project_creator(project_id));
CREATE POLICY "Project crew viewable by project members" ON public.project_crew FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR internal.is_project_creator(project_id)));
CREATE POLICY "Project task members can manage" ON public.project_tasks FOR ALL TO authenticated USING ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
UNION
 SELECT project_crew.project_id
   FROM project_crew
  WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Project task members can view" ON public.project_tasks FOR SELECT TO authenticated USING ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
UNION
 SELECT project_crew.project_id
   FROM project_crew
  WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Authenticated users create projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (creator_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "Creators delete projects" ON public.projects FOR DELETE TO authenticated USING ((creator_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Creators update projects" ON public.projects FOR UPDATE TO authenticated USING ((creator_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Project members can view" ON public.projects FOR SELECT TO authenticated USING (((creator_id = ( SELECT auth.uid() AS uid)) OR ((visibility <> 'private'::text) AND internal.is_project_member(id))));
CREATE POLICY "Project members can link scenes" ON public.scene_links FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (created_by = ( SELECT auth.uid() AS uid)) AND (script_id IN ( SELECT scripts.id
   FROM scripts
  WHERE (scripts.project_id IN ( SELECT projects.id
           FROM projects
          WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
        UNION
         SELECT project_crew.project_id
           FROM project_crew
          WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid))))))));
CREATE POLICY "Project members can unlink scenes" ON public.scene_links FOR DELETE TO authenticated USING ((script_id IN ( SELECT scripts.id
   FROM scripts
  WHERE (scripts.project_id IN ( SELECT projects.id
           FROM projects
          WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
        UNION
         SELECT project_crew.project_id
           FROM project_crew
          WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "Scene links readable by project members" ON public.scene_links FOR SELECT TO authenticated USING ((script_id IN ( SELECT scripts.id
   FROM scripts
  WHERE (scripts.project_id IN ( SELECT projects.id
           FROM projects
          WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
        UNION
         SELECT project_crew.project_id
           FROM project_crew
          WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "scene_refs delete" ON public.scene_references FOR DELETE TO authenticated USING ((internal.is_project_creator(project_id) OR internal.is_project_member(project_id)));
CREATE POLICY "scene_refs insert" ON public.scene_references FOR INSERT TO authenticated WITH CHECK (((internal.is_project_creator(project_id) OR internal.is_project_member(project_id)) AND (created_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY "scene_refs view" ON public.scene_references FOR SELECT TO authenticated USING ((internal.is_project_creator(project_id) OR internal.is_project_member(project_id)));
CREATE POLICY "Project members can manage scene schedule" ON public.scene_schedule FOR ALL TO authenticated USING ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
UNION
 SELECT project_crew.project_id
   FROM project_crew
  WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Scenes: project members can manage" ON public.scenes FOR ALL TO authenticated USING ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
UNION
 SELECT project_crew.project_id
   FROM project_crew
  WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Scenes: project members can view" ON public.scenes FOR SELECT TO authenticated USING ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
UNION
 SELECT project_crew.project_id
   FROM project_crew
  WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY screenplay_collab_read ON public.screenplay_collaborators FOR SELECT TO authenticated USING (true);
CREATE POLICY screenplay_collab_update ON public.screenplay_collaborators FOR UPDATE TO authenticated USING (((( SELECT auth.uid() AS uid))::text = user_id));
CREATE POLICY "script_annotations delete" ON public.script_annotations FOR DELETE TO authenticated USING ((internal.is_project_creator(project_id) OR internal.is_project_member(project_id)));
CREATE POLICY "script_annotations insert" ON public.script_annotations FOR INSERT TO authenticated WITH CHECK (((internal.is_project_creator(project_id) OR internal.is_project_member(project_id)) AND (created_by = auth.uid())));
CREATE POLICY "script_annotations view" ON public.script_annotations FOR SELECT TO authenticated USING ((internal.is_project_creator(project_id) OR internal.is_project_member(project_id)));
CREATE POLICY "Script members can manage characters" ON public.script_characters FOR ALL TO authenticated USING ((script_id IN ( SELECT scripts.id
   FROM scripts
  WHERE ((scripts.project_id IS NULL) OR (scripts.project_id IN ( SELECT projects.id
           FROM projects
          WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
        UNION
         SELECT project_crew.project_id
           FROM project_crew
          WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid))))))));
CREATE POLICY "Script collaborators viewable by participants" ON public.script_collaborators FOR SELECT TO authenticated USING (((script_id IN ( SELECT scripts.id
   FROM scripts
  WHERE (scripts.created_by = ( SELECT auth.uid() AS uid)))) OR (user_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "Script owners can manage collaborators" ON public.script_collaborators FOR INSERT TO authenticated WITH CHECK ((script_id IN ( SELECT scripts.id
   FROM scripts
  WHERE (scripts.created_by = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Script owners can remove collaborators" ON public.script_collaborators FOR DELETE TO authenticated USING (((script_id IN ( SELECT scripts.id
   FROM scripts
  WHERE (scripts.created_by = ( SELECT auth.uid() AS uid)))) OR (user_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "Script owners can update collaborators" ON public.script_collaborators FOR UPDATE TO authenticated USING ((script_id IN ( SELECT scripts.id
   FROM scripts
  WHERE (scripts.created_by = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "metadata readable by script members" ON public.script_metadata FOR SELECT TO public USING (internal.can_access_script(script_id));
CREATE POLICY "metadata writable by script members" ON public.script_metadata FOR ALL TO public USING (internal.can_access_script(script_id)) WITH CHECK (internal.can_access_script(script_id));
CREATE POLICY "Allow auth" ON public.script_notes FOR ALL TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Script members can manage revisions" ON public.script_revisions FOR ALL TO public USING (internal.can_access_script(script_id)) WITH CHECK (internal.can_access_script(script_id));
CREATE POLICY "Script editors can create versions" ON public.script_versions FOR INSERT TO authenticated WITH CHECK ((script_id IN ( SELECT scripts.id
   FROM scripts
  WHERE (scripts.created_by = ( SELECT auth.uid() AS uid))
UNION
 SELECT script_collaborators.script_id
   FROM script_collaborators
  WHERE ((script_collaborators.user_id = ( SELECT auth.uid() AS uid)) AND (script_collaborators.permissions = 'edit'::text)))));
CREATE POLICY "Script version viewable by script access" ON public.script_versions FOR SELECT TO authenticated USING ((script_id IN ( SELECT scripts.id
   FROM scripts
  WHERE ((scripts.created_by = ( SELECT auth.uid() AS uid)) OR (scripts.shared = true))
UNION
 SELECT script_collaborators.script_id
   FROM script_collaborators
  WHERE (script_collaborators.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Authenticated users create scripts" ON public.scripts FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (created_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY "Script editors can update" ON public.scripts FOR UPDATE TO authenticated USING (((created_by = ( SELECT auth.uid() AS uid)) OR (last_edited_by = ( SELECT auth.uid() AS uid)) OR ((project_id IS NOT NULL) AND (internal.is_project_creator(project_id) OR internal.is_project_member(project_id)))));
CREATE POLICY "Script members can view" ON public.scripts FOR SELECT TO authenticated USING (((shared = true) OR (created_by = ( SELECT auth.uid() AS uid)) OR (last_edited_by = ( SELECT auth.uid() AS uid)) OR ((project_id IS NOT NULL) AND (project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
UNION
 SELECT project_crew.project_id
   FROM project_crew
  WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "Script owners can delete" ON public.scripts FOR DELETE TO authenticated USING ((created_by = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Shared scripts publicly viewable" ON public.scripts FOR SELECT TO anon USING ((shared = true));
CREATE POLICY "SFX assets owner only delete" ON public.sfx_assets FOR DELETE TO public USING ((user_id = auth.uid()));
CREATE POLICY "SFX assets owner only insert" ON public.sfx_assets FOR INSERT TO public WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "SFX assets owner only update" ON public.sfx_assets FOR UPDATE TO public USING ((user_id = auth.uid()));
CREATE POLICY "SFX assets viewable by everyone" ON public.sfx_assets FOR SELECT TO public USING (true);
CREATE POLICY "Project members can manage shoot days" ON public.shoot_days FOR ALL TO authenticated USING ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
UNION
 SELECT project_crew.project_id
   FROM project_crew
  WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Shots viewable by project creator or crew" ON public.shots FOR SELECT TO public USING ((internal.is_project_creator(project_id) OR internal.is_project_member(project_id)));
CREATE POLICY "Shots writable by project creator or crew" ON public.shots FOR ALL TO public USING ((internal.is_project_creator(project_id) OR internal.is_project_member(project_id))) WITH CHECK ((internal.is_project_creator(project_id) OR internal.is_project_member(project_id)));
CREATE POLICY "Users can delete own spotify connection" ON public.spotify_connections FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own spotify connection" ON public.spotify_connections FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own spotify connection" ON public.spotify_connections FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own spotify connection" ON public.spotify_connections FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Studio assets owner only" ON public.studio_assets FOR ALL TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Studio boards owner only" ON public.studio_boards FOR ALL TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Timeline members can manage" ON public.timeline_items FOR ALL TO authenticated USING ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
UNION
 SELECT project_crew.project_id
   FROM project_crew
  WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Timeline members can view" ON public.timeline_items FOR SELECT TO authenticated USING ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.creator_id = ( SELECT auth.uid() AS uid))
UNION
 SELECT project_crew.project_id
   FROM project_crew
  WHERE (project_crew.user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY presence_insert ON public.user_presence FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid))::text = user_id));
CREATE POLICY presence_read ON public.user_presence FOR SELECT TO authenticated USING (true);
CREATE POLICY presence_update ON public.user_presence FOR UPDATE TO authenticated USING (((( SELECT auth.uid() AS uid))::text = user_id));

-- ── Storage ─────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('assets', 'assets', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('sfx-library', 'sfx-library', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('sfx_library', 'sfx_library', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('studio-assets', 'studio-assets', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated uploads to sfx_library" ON storage.objects FOR INSERT TO public WITH CHECK (((bucket_id = 'sfx_library'::text) AND (auth.role() = 'authenticated'::text)));
CREATE POLICY "Auth Users Upload" ON storage.objects FOR INSERT TO public WITH CHECK (((bucket_id = 'assets'::text) AND (auth.role() = 'authenticated'::text)));
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO public WITH CHECK (((bucket_id = 'studio-assets'::text) AND (auth.role() = 'authenticated'::text)));
CREATE POLICY "Public Access" ON storage.objects FOR SELECT TO public USING ((bucket_id = 'studio-assets'::text));
CREATE POLICY "SFX files insertable by authenticated users" ON storage.objects FOR INSERT TO public WITH CHECK (((bucket_id = 'sfx-library'::text) AND (auth.role() = 'authenticated'::text)));
CREATE POLICY "SFX files viewable by everyone" ON storage.objects FOR SELECT TO public USING ((bucket_id = 'sfx-library'::text));
CREATE POLICY "Users Delete Own Files" ON storage.objects FOR DELETE TO public USING (((bucket_id = 'assets'::text) AND (auth.uid() = owner)));
CREATE POLICY "Users can delete their own assets" ON storage.objects FOR DELETE TO public USING (((bucket_id = 'studio-assets'::text) AND (auth.uid() = owner)));

-- ── Realtime ────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.screenplay_collaborators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
