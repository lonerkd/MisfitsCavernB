-- Studio core: one media library per project, scenes that stay in sync with
-- the screenplay, media linked to scenes and characters, private storage, a
-- share-link lookbook, and realtime for the tables the app live-syncs.
--
-- Replaces three disconnected, partly broken media systems:
--   concept_assets (+ scene_references, character_references) — URL-only pins
--   project_assets, scene_links — never used by the app
-- All five are empty in production; the guard below refuses to drop them if
-- that is ever not true.

-- ── Access helpers ────────────────────────────────────────────────────────
-- Project access that honours visibility: 'private' means owner only, so crew
-- lose access too (matches the projects row policy). New tables use this.
CREATE FUNCTION internal.can_access_project(pid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.projects p
    where p.id = pid and (
      p.creator_id = (select auth.uid())
      or (p.visibility <> 'private' and exists (
        select 1 from public.project_crew c where c.project_id = pid and c.user_id = (select auth.uid())
      ))
    )
  );
$function$;

-- Storage object names are "<project_id>/<media_id>/<file name>".
CREATE FUNCTION internal.path_project_id(object_name text)
 RETURNS uuid
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case
    when split_part(object_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(object_name, '/', 1)::uuid
  end;
$function$;

-- ── Media library ─────────────────────────────────────────────────────────
CREATE TABLE public.media (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid NOT NULL,
  kind text NOT NULL,
  title text DEFAULT ''::text NOT NULL,
  notes text,
  board text,
  storage_path text,
  external_url text,
  mime_type text,
  size_bytes bigint,
  width integer,
  height integer,
  duration_seconds numeric,
  shared boolean DEFAULT false NOT NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT media_pkey PRIMARY KEY (id),
  CONSTRAINT media_id_project_key UNIQUE (id, project_id),
  CONSTRAINT media_storage_path_key UNIQUE (storage_path),
  CONSTRAINT media_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT media_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT media_kind_check CHECK (kind IN ('image', 'video', 'audio', 'document', 'link')),
  CONSTRAINT media_one_source CHECK ((storage_path IS NULL) <> (external_url IS NULL)),
  CONSTRAINT media_storage_path_check CHECK (
    storage_path IS NULL OR (
      storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]{1,200}$'
      AND split_part(storage_path, '/', 1) = project_id::text
      AND split_part(storage_path, '/', 2) = id::text
    )
  ),
  CONSTRAINT media_external_url_check CHECK (external_url IS NULL OR (external_url ~* '^https?://' AND char_length(external_url) <= 2000)),
  CONSTRAINT media_title_check CHECK (char_length(title) <= 200),
  CONSTRAINT media_notes_check CHECK (char_length(notes) <= 5000),
  CONSTRAINT media_board_check CHECK (char_length(board) <= 60),
  CONSTRAINT media_size_check CHECK (size_bytes IS NULL OR size_bytes >= 0)
);
CREATE INDEX media_project_created_idx ON public.media USING btree (project_id, created_at DESC);
CREATE INDEX media_created_by_idx ON public.media USING btree (created_by);

-- Source and ownership never change after creation; only the project owner
-- decides what is published through a share link. (No JWT = migrations or
-- server maintenance, which may do anything.)
-- SECURITY DEFINER: plpgsql resolves internal.* at run time, and API roles
-- have no USAGE on the internal schema.
CREATE FUNCTION internal.media_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'UPDATE' then
    if new.project_id <> old.project_id
       or new.storage_path is distinct from old.storage_path
       or new.external_url is distinct from old.external_url
       or new.created_by is distinct from old.created_by
       or new.created_at <> old.created_at then
      raise exception 'A media item''s project, source and author cannot be changed' using errcode = '42501';
    end if;
    new.updated_at := now();
  end if;
  if new.shared
     and (tg_op = 'INSERT' or not old.shared)
     and (select auth.uid()) is not null
     and not internal.is_project_creator(new.project_id) then
    raise exception 'Only the project owner can publish media to the share link' using errcode = '42501';
  end if;
  return new;
end;
$function$;
CREATE TRIGGER media_guard BEFORE INSERT OR UPDATE ON public.media FOR EACH ROW EXECUTE FUNCTION internal.media_guard();

ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media view" ON public.media FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id));
CREATE POLICY "media insert" ON public.media FOR INSERT TO authenticated
  WITH CHECK (internal.can_access_project(project_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY "media update" ON public.media FOR UPDATE TO authenticated
  USING (internal.can_access_project(project_id))
  WITH CHECK (internal.can_access_project(project_id));
-- Crew can remove what they added; the owner can remove anything.
CREATE POLICY "media delete" ON public.media FOR DELETE TO authenticated
  USING (internal.can_access_project(project_id) AND (created_by = (SELECT auth.uid()) OR internal.is_project_creator(project_id)));

-- ── Scenes follow the screenplay ──────────────────────────────────────────
-- A scene row belongs to one script and keeps its id while the script is
-- edited (sync_script_scenes aligns old and new headings). Removed scenes are
-- kept (removed_at) so their links survive a cut-and-paste.
ALTER TABLE public.scenes
  ADD COLUMN script_id uuid,
  ADD COLUMN heading text,
  ADD COLUMN ordinal integer,
  ADD COLUMN removed_at timestamp with time zone,
  ADD COLUMN note text,
  ADD COLUMN color text,
  ADD COLUMN updated_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.scenes
  ADD CONSTRAINT scenes_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE,
  ADD CONSTRAINT scenes_id_project_key UNIQUE (id, project_id),
  ADD CONSTRAINT scenes_note_check CHECK (char_length(note) <= 5000),
  ADD CONSTRAINT scenes_color_check CHECK (color IS NULL OR color ~ '^#[0-9a-fA-F]{6}$'),
  ADD CONSTRAINT scenes_heading_check CHECK (char_length(heading) <= 300);
-- time_of_day is the heading's own wording (CONTINUOUS, LATER, MAGIC HOUR…);
-- the old DAY/NIGHT/DAWN/DUSK whitelist rejected real screenplays outright.
ALTER TABLE public.scenes DROP CONSTRAINT scenes_time_of_day_check;
ALTER TABLE public.scenes ADD CONSTRAINT scenes_time_of_day_check CHECK (char_length(time_of_day) BETWEEN 1 AND 40);
CREATE INDEX scenes_script_ordinal_idx ON public.scenes USING btree (script_id, ordinal) WHERE (removed_at IS NULL);
CREATE TRIGGER scenes_updated_at BEFORE UPDATE ON public.scenes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP POLICY "Scenes: project members can manage" ON public.scenes;
DROP POLICY "Scenes: project members can view" ON public.scenes;
CREATE POLICY "scenes view" ON public.scenes FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id));
CREATE POLICY "scenes insert" ON public.scenes FOR INSERT TO authenticated
  WITH CHECK (internal.can_access_project(project_id));
CREATE POLICY "scenes update" ON public.scenes FOR UPDATE TO authenticated
  USING (internal.can_access_project(project_id))
  WITH CHECK (internal.can_access_project(project_id));
CREATE POLICY "scenes delete" ON public.scenes FOR DELETE TO authenticated
  USING (internal.can_access_project(project_id));

-- Applies a scene-index plan computed by the client (lib/studio/scene-sync.ts)
-- atomically. p_base_ids is the ordered list of active scene ids the plan was
-- computed from; if another sync landed first, it raises 40001 and the client
-- recomputes. Runs as the caller, so RLS decides who may sync.
CREATE FUNCTION public.sync_script_scenes(p_script_id uuid, p_base_ids uuid[], p_scenes jsonb)
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
declare
  v_project uuid;
  v_current uuid[];
  v_ids uuid[];
  v_scene jsonb;
  v_pos bigint;
  v_heading text;
begin
  if jsonb_typeof(p_scenes) <> 'array' or jsonb_array_length(p_scenes) > 2000 then
    raise exception 'p_scenes must be an array of at most 2000 scenes' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('scene_index:' || p_script_id::text, 0));

  select s.project_id into v_project from public.scripts s where s.id = p_script_id;
  if not found then
    raise exception 'Script not found' using errcode = 'P0002';
  end if;
  if v_project is null then
    raise exception 'Script is not part of a project' using errcode = '22023';
  end if;
  -- The projects row policy is the same rule as internal.can_access_project
  -- (which this invoker-rights function can't call: no USAGE on internal).
  if not exists (select 1 from public.projects p where p.id = v_project) then
    raise exception 'No access to this project' using errcode = '42501';
  end if;

  select coalesce(array_agg(sc.id order by sc.ordinal), '{}') into v_current
  from public.scenes sc where sc.script_id = p_script_id and sc.removed_at is null;
  if v_current <> coalesce(p_base_ids, '{}') then
    raise exception 'The scene index changed since it was read' using errcode = '40001';
  end if;

  select coalesce(array_agg((e->>'id')::uuid order by i), '{}') into v_ids
  from jsonb_array_elements(p_scenes) with ordinality as t(e, i);
  if (select count(distinct x) from unnest(v_ids) x) <> cardinality(v_ids) then
    raise exception 'Duplicate scene id in plan' using errcode = '22023';
  end if;
  if exists (select 1 from public.scenes sc where sc.id = any(v_ids) and sc.script_id is distinct from p_script_id) then
    raise exception 'Plan references a scene from another script' using errcode = '22023';
  end if;

  update public.scenes sc set removed_at = now()
  where sc.script_id = p_script_id and sc.removed_at is null and not (sc.id = any(v_ids));

  for v_scene, v_pos in select e, i from jsonb_array_elements(p_scenes) with ordinality as t(e, i) loop
    v_heading := left(coalesce(nullif(btrim(v_scene->>'heading'), ''), 'Scene ' || v_pos), 300);
    insert into public.scenes as sc (id, project_id, script_id, scene_number, ordinal, heading, title,
                                     location, time_of_day, cast_list, est_duration, elements, removed_at)
    values ((v_scene->>'id')::uuid, v_project, p_script_id, v_pos, v_pos - 1, v_heading, left(v_heading, 200),
            nullif(v_scene->>'location', ''), coalesce(nullif(v_scene->>'time_of_day', ''), 'DAY'),
            nullif(v_scene->>'cast_list', ''), nullif(v_scene->>'est_duration', ''),
            coalesce(v_scene->'elements', '{}'::jsonb), null)
    on conflict (id) do update set
      scene_number = excluded.scene_number, ordinal = excluded.ordinal, heading = excluded.heading,
      title = excluded.title, location = excluded.location, time_of_day = excluded.time_of_day,
      cast_list = excluded.cast_list, est_duration = excluded.est_duration, elements = excluded.elements,
      removed_at = null
    where (sc.scene_number, sc.ordinal, sc.heading, sc.title, sc.location, sc.time_of_day, sc.cast_list,
           sc.est_duration, sc.elements, sc.removed_at)
          is distinct from
          (excluded.scene_number, excluded.ordinal, excluded.heading, excluded.title, excluded.location,
           excluded.time_of_day, excluded.cast_list, excluded.est_duration, excluded.elements, null::timestamptz);
  end loop;

  return v_ids;
end;
$function$;

-- ── Links: media ↔ scenes, media ↔ characters ─────────────────────────────
-- Composite foreign keys pin both ends to the same project.
CREATE TABLE public.scene_media (
  scene_id uuid NOT NULL,
  media_id uuid NOT NULL,
  project_id uuid NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  note text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT scene_media_pkey PRIMARY KEY (scene_id, media_id),
  CONSTRAINT scene_media_scene_fkey FOREIGN KEY (scene_id, project_id) REFERENCES public.scenes(id, project_id) ON DELETE CASCADE,
  CONSTRAINT scene_media_media_fkey FOREIGN KEY (media_id, project_id) REFERENCES public.media(id, project_id) ON DELETE CASCADE,
  CONSTRAINT scene_media_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT scene_media_note_check CHECK (char_length(note) <= 1000)
);
CREATE INDEX scene_media_media_idx ON public.scene_media USING btree (media_id);
CREATE INDEX scene_media_project_idx ON public.scene_media USING btree (project_id);

ALTER TABLE public.scene_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scene_media view" ON public.scene_media FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id));
CREATE POLICY "scene_media insert" ON public.scene_media FOR INSERT TO authenticated
  WITH CHECK (internal.can_access_project(project_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY "scene_media update" ON public.scene_media FOR UPDATE TO authenticated
  USING (internal.can_access_project(project_id))
  WITH CHECK (internal.can_access_project(project_id));
CREATE POLICY "scene_media delete" ON public.scene_media FOR DELETE TO authenticated
  USING (internal.can_access_project(project_id));

CREATE TABLE public.character_media (
  character_id uuid NOT NULL,
  media_id uuid NOT NULL,
  project_id uuid NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT character_media_pkey PRIMARY KEY (character_id, media_id),
  CONSTRAINT character_media_character_fkey FOREIGN KEY (character_id) REFERENCES public.script_characters(id) ON DELETE CASCADE,
  CONSTRAINT character_media_media_fkey FOREIGN KEY (media_id, project_id) REFERENCES public.media(id, project_id) ON DELETE CASCADE,
  CONSTRAINT character_media_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);
CREATE INDEX character_media_media_idx ON public.character_media USING btree (media_id);
CREATE INDEX character_media_project_idx ON public.character_media USING btree (project_id);

ALTER TABLE public.character_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "character_media view" ON public.character_media FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id));
CREATE POLICY "character_media insert" ON public.character_media FOR INSERT TO authenticated
  WITH CHECK (
    internal.can_access_project(project_id)
    AND created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.script_characters c JOIN public.scripts s ON s.id = c.script_id
      WHERE c.id = character_media.character_id AND s.project_id = character_media.project_id
    )
  );
CREATE POLICY "character_media delete" ON public.character_media FOR DELETE TO authenticated
  USING (internal.can_access_project(project_id));

-- ── Private storage ───────────────────────────────────────────────────────
-- Files are private; the app reads them through short-lived signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('project-media', 'project-media', false, 52428800,
        ARRAY['image/*', 'video/*', 'audio/*', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Readable by anyone (including anon) only while the owner publishes it:
-- media.shared and the project is link- or public-shared.
CREATE FUNCTION internal.is_shared_media_object(object_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.media m join public.projects p on p.id = m.project_id
    where m.storage_path = object_name and m.shared and p.visibility in ('link', 'public')
  );
$function$;

CREATE POLICY "project-media: members read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'project-media' AND internal.can_access_project(internal.path_project_id(name)));
CREATE POLICY "project-media: shared read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'project-media' AND internal.is_shared_media_object(name));
CREATE POLICY "project-media: members upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-media' AND internal.can_access_project(internal.path_project_id(name)));
CREATE POLICY "project-media: uploader or owner deletes" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-media'
    AND internal.can_access_project(internal.path_project_id(name))
    AND (owner_id = (SELECT auth.uid())::text OR internal.is_project_creator(internal.path_project_id(name)))
  );

-- ── Share link lookbook ───────────────────────────────────────────────────
-- What an "anyone with the link" viewer may see beyond the overview: media the
-- owner published, and the scene headings they're linked to. Never notes,
-- unpublished media, or anything for team/private projects. NULL = no access.
CREATE FUNCTION public.get_shared_lookbook(p_token text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with p as (
    select id from public.projects
    where share_token = p_token and coalesce(p_token, '') <> '' and visibility in ('link', 'public')
  ),
  m as (
    select md.* from public.media md join p on p.id = md.project_id where md.shared
  ),
  sc as (
    select s.id, s.scene_number, coalesce(s.heading, s.title) as heading, s.script_id, s.ordinal,
           array_agg(sm.media_id order by sm.position, sm.created_at) as media_ids
    from public.scenes s
    join public.scene_media sm on sm.scene_id = s.id
    join m on m.id = sm.media_id
    where s.removed_at is null
    group by s.id
  )
  select case when exists (select 1 from p) then jsonb_build_object(
    'media', coalesce((select jsonb_agg(jsonb_build_object(
        'id', m.id, 'kind', m.kind, 'title', m.title, 'board', m.board,
        'storage_path', m.storage_path, 'external_url', m.external_url,
        'mime_type', m.mime_type, 'width', m.width, 'height', m.height
      ) order by m.created_at, m.id) from m), '[]'::jsonb),
    'scenes', coalesce((select jsonb_agg(jsonb_build_object(
        'id', sc.id, 'scene_number', sc.scene_number, 'heading', sc.heading, 'media_ids', to_jsonb(sc.media_ids)
      ) order by sc.script_id, sc.ordinal) from sc), '[]'::jsonb)
  ) end;
$function$;

-- A published file's storage path, for the /m/<id> permalink (the route signs
-- a short-lived URL as anon, which the "shared read" policy allows).
CREATE FUNCTION public.get_published_media(p_media_id uuid)
 RETURNS TABLE(storage_path text, kind text, mime_type text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select m.storage_path, m.kind, m.mime_type
  from public.media m join public.projects p on p.id = m.project_id
  where m.id = p_media_id and m.shared and m.storage_path is not null
    and p.visibility in ('link', 'public');
$function$;

-- The Showcase: published media from projects their owners made Public.
-- (Link-shared projects are never listed.)
CREATE FUNCTION public.get_public_showcase(p_limit integer DEFAULT 24)
 RETURNS TABLE(media_id uuid, kind text, title text, storage_path text, external_url text, project_title text, share_token text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select m.id, m.kind, m.title, m.storage_path, m.external_url, p.title, p.share_token
  from public.media m join public.projects p on p.id = m.project_id
  where m.shared and p.visibility = 'public' and m.kind in ('image', 'video')
  order by m.created_at desc
  limit least(greatest(coalesce(p_limit, 24), 1), 100);
$function$;

-- Platform-wide totals for the home page. Counts only — no rows, no titles.
-- (Counting through RLS showed each person their own totals as "platform" numbers.)
CREATE FUNCTION public.get_platform_stats()
 RETURNS TABLE(creators bigint, projects bigint, scripts bigint, media bigint, jobs bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select (select count(*) from public.profiles),
         (select count(*) from public.projects),
         (select count(*) from public.scripts),
         (select count(*) from public.media),
         (select count(*) from public.jobs);
$function$;

-- ── Function privileges (explicit; nothing executable by default) ─────────
REVOKE ALL ON FUNCTION internal.can_access_project(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION internal.path_project_id(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION internal.media_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION internal.is_shared_media_object(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_script_scenes(uuid, uuid[], jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_shared_lookbook(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_published_media(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_showcase(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_platform_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION internal.can_access_project(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION internal.path_project_id(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION internal.media_guard() TO service_role;
GRANT EXECUTE ON FUNCTION internal.is_shared_media_object(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_script_scenes(uuid, uuid[], jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_shared_lookbook(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_published_media(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_showcase(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO anon, authenticated, service_role;

-- ── Activity feed: scoped to its project ─────────────────────────────────
-- Entries were logged without metadata.project_id, and the old policy let
-- every signed-in user read any such entry — beat titles, scene headings,
-- cast names across every project. Backfill the scope from the target, then
-- allow reading only your own entries or those of projects you can access.
UPDATE public.activity_feed
SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('project_id', target_id::text)
WHERE target_type = 'project' AND target_id IS NOT NULL AND (metadata ->> 'project_id') IS NULL;
UPDATE public.activity_feed a
SET metadata = coalesce(a.metadata, '{}'::jsonb) || jsonb_build_object('project_id', s.project_id::text)
FROM public.scripts s
WHERE a.target_type = 'script' AND s.id = a.target_id AND s.project_id IS NOT NULL AND (a.metadata ->> 'project_id') IS NULL;
UPDATE public.activity_feed a
SET metadata = coalesce(a.metadata, '{}'::jsonb) || jsonb_build_object('project_id', sc.project_id::text)
FROM public.scenes sc
WHERE a.target_type = 'scene' AND sc.id = a.target_id AND (a.metadata ->> 'project_id') IS NULL;

CREATE FUNCTION internal.activity_project_id(meta jsonb)
 RETURNS uuid
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case
    when meta ->> 'project_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then (meta ->> 'project_id')::uuid
  end;
$function$;
REVOKE ALL ON FUNCTION internal.activity_project_id(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION internal.activity_project_id(jsonb) TO authenticated, service_role;

DROP POLICY "Activity readable by project members" ON public.activity_feed;
DROP POLICY "Authenticated users log activity" ON public.activity_feed;
CREATE POLICY "activity view" ON public.activity_feed FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR internal.can_access_project(internal.activity_project_id(metadata)));
CREATE POLICY "activity insert" ON public.activity_feed FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (internal.activity_project_id(metadata) IS NULL OR internal.can_access_project(internal.activity_project_id(metadata)))
  );
CREATE INDEX activity_feed_project_idx ON public.activity_feed USING btree ((metadata ->> 'project_id'), created_at DESC);

-- ── Realtime ──────────────────────────────────────────────────────────────
-- lib/os/sync.ts and the Studio subscribe to these; before this migration only
-- chat, presence and cursors were published, so those subscriptions never
-- fired. Realtime applies each subscriber's RLS to every event.
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.media, public.scene_media, public.character_media, public.scenes,
  public.projects, public.project_crew, public.budget_items, public.timeline_items,
  public.project_beats, public.campaigns, public.notifications, public.activity_feed;

-- ── Retire the old, disconnected media tables ─────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.concept_assets)
     OR EXISTS (SELECT 1 FROM public.scene_references)
     OR EXISTS (SELECT 1 FROM public.character_references)
     OR EXISTS (SELECT 1 FROM public.project_assets)
     OR EXISTS (SELECT 1 FROM public.scene_links) THEN
    RAISE EXCEPTION 'Refusing to drop legacy media tables that still hold rows; migrate them into public.media first.';
  END IF;
END $$;
DROP TABLE public.scene_references, public.character_references, public.concept_assets,
           public.project_assets, public.scene_links;
