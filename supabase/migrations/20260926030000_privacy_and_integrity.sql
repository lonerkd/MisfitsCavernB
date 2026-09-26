-- Privacy and integrity pass (suite audit, 2026-09-26).
--
-- 1. "Private" means private everywhere. is_project_member() ignored project
--    visibility, so crew kept reading budgets, tasks, scripts, beats… of a
--    project its owner had made private. It now answers false for private
--    projects, which fixes every policy built on it; the remaining policies
--    with inline membership subqueries move to can_access_project().
-- 2. Crew can see their teammates (the crew policy showed each member only
--    their own row, so every crew list was empty for non-owners).
-- 3. Notifications can't be forged: a sender is recorded, links must stay on
--    this site, and you can only notify people you actually work or talk
--    with. (Anyone could notify anyone with any link — a phishing channel.)
-- 4. Project soundtrack notes were readable by everyone, logged out included.
-- 5. Private profile fields (admin flag, notification settings, Discord id)
--    are no longer public; get_my_account() returns them to their owner.
-- 6. Chat messages are live (messages was missing from the publication).
-- 7. Dead tables/functions/views from abandoned features are dropped
--    (all empty in production; guarded below).
-- 8. Doors left open: script access outlived crew membership (anyone who
--    had once saved a project script kept reading and writing it after being
--    removed, or after the project went private) and anyone could add a
--    script to any project; characters of a shared script were writable by
--    every signed-in user; audit log entries could be written in anyone's
--    name, and admins' own reads of them broke with (5); every signed-in
--    user could upload anything to four public buckets.
-- 9. Reactions on channel messages failed for everyone but the sender —
--    and, through a NULL in the permission check, were open to everyone.

-- ── 1. Private means private ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION internal.is_project_member(pid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM project_crew c JOIN projects p ON p.id = c.project_id
    WHERE c.project_id = pid AND c.user_id = auth.uid() AND p.visibility <> 'private'
  );
$function$;

DROP POLICY "Budget members can manage" ON public.budget_items;
DROP POLICY "Budget members can view" ON public.budget_items;
CREATE POLICY "budget_items access" ON public.budget_items FOR ALL TO authenticated
  USING (internal.can_access_project(project_id)) WITH CHECK (internal.can_access_project(project_id));

DROP POLICY "Campaigns: project members can manage" ON public.campaigns;
DROP POLICY "Campaigns: project members can view" ON public.campaigns;
CREATE POLICY "campaigns access" ON public.campaigns FOR ALL TO authenticated
  USING (internal.can_access_project(project_id)) WITH CHECK (internal.can_access_project(project_id));

DROP POLICY "Project members can manage beats" ON public.project_beats;
CREATE POLICY "project_beats access" ON public.project_beats FOR ALL TO authenticated
  USING (internal.can_access_project(project_id)) WITH CHECK (internal.can_access_project(project_id));

DROP POLICY "Project task members can manage" ON public.project_tasks;
DROP POLICY "Project task members can view" ON public.project_tasks;
CREATE POLICY "project_tasks access" ON public.project_tasks FOR ALL TO authenticated
  USING (internal.can_access_project(project_id)) WITH CHECK (internal.can_access_project(project_id));

DROP POLICY "Timeline members can manage" ON public.timeline_items;
DROP POLICY "Timeline members can view" ON public.timeline_items;
CREATE POLICY "timeline_items access" ON public.timeline_items FOR ALL TO authenticated
  USING (internal.can_access_project(project_id)) WITH CHECK (internal.can_access_project(project_id));

-- (scripts: see section 8.)

-- ── 2. Crew see each other ─────────────────────────────────────────────────
DROP POLICY "Project crew viewable by project members" ON public.project_crew;
CREATE POLICY "project_crew view" ON public.project_crew FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR internal.can_access_project(project_id));

-- ── 3. Notifications ───────────────────────────────────────────────────────
ALTER TABLE public.notifications
  ADD COLUMN created_by uuid DEFAULT auth.uid(),
  ADD CONSTRAINT notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT notifications_link_internal CHECK (link IS NULL OR link ~ '^/[^/\\]'),
  ADD CONSTRAINT notifications_title_len CHECK (char_length(title) BETWEEN 1 AND 200),
  ADD CONSTRAINT notifications_body_len CHECK (char_length(body) <= 1000),
  ADD CONSTRAINT notifications_type_len CHECK (char_length(type) <= 40);

-- You may notify someone you share a project, a job, a channel or a
-- conversation with — and yourself.
CREATE FUNCTION internal.can_notify(target uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with me as (select (select auth.uid()) as id)
  select target = (select id from me)
    or exists (
      select 1 from public.projects p
      where (p.creator_id = (select id from me) or exists (select 1 from public.project_crew c where c.project_id = p.id and c.user_id = (select id from me)))
        and (p.creator_id = target or exists (select 1 from public.project_crew c where c.project_id = p.id and c.user_id = target))
    )
    or exists (
      select 1 from public.job_applications a join public.jobs j on j.id = a.job_id
      where (j.created_by = (select id from me) and a.applicant_id = target)
         or (j.created_by = target and a.applicant_id = (select id from me))
    )
    or exists (
      select 1 from public.messages m
      where (m.sender_id = (select id from me) and m.receiver_id = target)
         or (m.sender_id = target and m.receiver_id = (select id from me))
    )
    or exists (
      select 1 from public.messages m
      where m.sender_id = target and m.channel_uuid is not null and internal.can_view_channel(m.channel_uuid)
    );
$function$;
REVOKE ALL ON FUNCTION internal.can_notify(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION internal.can_notify(uuid) TO authenticated, service_role;

DROP POLICY "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "notifications insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()) AND internal.can_notify(user_id));

-- ── 4. Project soundtrack notes ────────────────────────────────────────────
DROP POLICY "Project audio refs are viewable by everyone" ON public.project_audio_references;
DROP POLICY "Users can add project audio refs" ON public.project_audio_references;
DROP POLICY "Users can delete own audio refs" ON public.project_audio_references;
CREATE POLICY "audio refs view" ON public.project_audio_references FOR SELECT TO authenticated
  USING (added_by = (SELECT auth.uid()) OR (project_id IS NOT NULL AND internal.can_access_project(project_id)));
CREATE POLICY "audio refs insert" ON public.project_audio_references FOR INSERT TO authenticated
  WITH CHECK (added_by = (SELECT auth.uid()) AND (project_id IS NULL OR internal.can_access_project(project_id)));
CREATE POLICY "audio refs delete" ON public.project_audio_references FOR DELETE TO authenticated
  USING (added_by = (SELECT auth.uid()) OR (project_id IS NOT NULL AND internal.is_project_creator(project_id)));

-- ── 5. Private profile fields ──────────────────────────────────────────────
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, username, avatar_url, bio, role, location, status, discord_username, discord_avatar, created_at, updated_at)
  ON public.profiles TO anon, authenticated;

CREATE FUNCTION public.get_my_account()
 RETURNS TABLE(is_admin boolean, notification_prefs jsonb, discord_id text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(p.is_admin, false), p.notification_prefs, p.discord_id
  from public.profiles p where p.id = (select auth.uid());
$function$;
REVOKE ALL ON FUNCTION public.get_my_account() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_account() TO authenticated, service_role;

-- The admin user list needs the admin flag of everyone: admins only.
CREATE FUNCTION public.admin_list_users()
 RETURNS TABLE(id uuid, username text, avatar_url text, role text, status text, is_admin boolean, created_at timestamptz)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not internal.caller_is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  return query
    select p.id, p.username, p.avatar_url, p.role, p.status, coalesce(p.is_admin, false), p.created_at
    from public.profiles p order by p.created_at desc;
end;
$function$;
REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_discord_webhook(uuid) FROM PUBLIC, anon;

-- ── 6. Live chat ───────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ── 7. Dead weight ─────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.chat_messages) OR EXISTS (SELECT 1 FROM public.chat_channels)
     OR EXISTS (SELECT 1 FROM public.screenplay_collaborators) OR EXISTS (SELECT 1 FROM public.user_presence)
     OR EXISTS (SELECT 1 FROM public.scene_schedule) OR EXISTS (SELECT 1 FROM public.shoot_days)
     OR EXISTS (SELECT 1 FROM public.asset_comments) THEN
    RAISE EXCEPTION 'Refusing to drop unused tables that hold rows — check before dropping.';
  END IF;
END $$;
ALTER PUBLICATION supabase_realtime DROP TABLE public.chat_messages, public.screenplay_collaborators, public.user_presence;
DROP VIEW public.channel_activity, public.active_users;
DROP FUNCTION public.update_collaborator_cursor(text, text, integer, integer);
DROP FUNCTION public.update_user_presence(text, text, text, text);
DROP FUNCTION public.clean_old_presences();
DROP TABLE public.chat_messages, public.chat_channels, public.screenplay_collaborators, public.user_presence,
           public.scene_schedule, public.shoot_days, public.asset_comments;

-- ── 8. Doors left open ─────────────────────────────────────────────────────
-- A project script belongs to the project: access follows the project, not
-- who created or last saved it. A personal script belongs to its author.
CREATE OR REPLACE FUNCTION internal.can_access_script(sid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.scripts s
    where s.id = sid and (
      (s.project_id is null and s.created_by = (select auth.uid()))
      or (s.project_id is not null and internal.can_access_project(s.project_id))
    )
  );
$function$;

DROP POLICY "Script members can view" ON public.scripts;
DROP POLICY "Script editors can update" ON public.scripts;
DROP POLICY "Authenticated users create scripts" ON public.scripts;
DROP POLICY "Script owners can delete" ON public.scripts;
CREATE POLICY "scripts view" ON public.scripts FOR SELECT TO authenticated
  USING (
    shared = true
    OR (project_id IS NULL AND created_by = (SELECT auth.uid()))
    OR (project_id IS NOT NULL AND internal.can_access_project(project_id))
  );
CREATE POLICY "scripts insert" ON public.scripts FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (project_id IS NULL OR internal.can_access_project(project_id))
  );
CREATE POLICY "scripts update" ON public.scripts FOR UPDATE TO authenticated
  USING (
    (project_id IS NULL AND created_by = (SELECT auth.uid()))
    OR (project_id IS NOT NULL AND internal.can_access_project(project_id))
  )
  WITH CHECK (
    (project_id IS NULL AND created_by = (SELECT auth.uid()))
    OR (project_id IS NOT NULL AND internal.can_access_project(project_id))
  );
CREATE POLICY "scripts delete" ON public.scripts FOR DELETE TO authenticated
  USING (
    (project_id IS NULL AND created_by = (SELECT auth.uid()))
    OR (project_id IS NOT NULL AND (
      internal.is_project_creator(project_id)
      OR (created_by = (SELECT auth.uid()) AND internal.can_access_project(project_id))
    ))
  );

DROP POLICY "Script members can manage characters" ON public.script_characters;
CREATE POLICY "script_characters access" ON public.script_characters FOR ALL TO authenticated
  USING (internal.can_access_script(script_id)) WITH CHECK (internal.can_access_script(script_id));

DROP POLICY "Authenticated users can create audit logs" ON public.audit_logs;
DROP POLICY "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "audit_logs insert own" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "audit_logs admins read" ON public.audit_logs FOR SELECT TO authenticated
  USING (internal.caller_is_admin());

-- Messages are direct (to one person) or in a channel you may post in.
DROP POLICY "Authenticated users send messages" ON public.messages;
CREATE POLICY "messages send" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND (
      (receiver_id IS NOT NULL AND channel_uuid IS NULL)
      OR (receiver_id IS NULL AND channel_uuid IS NOT NULL AND public.can_post_channel(channel_uuid))
    )
  );

DROP POLICY "SFX assets owner only insert" ON public.sfx_assets;
CREATE POLICY "sfx_assets insert" ON public.sfx_assets FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND (project_id IS NULL OR internal.can_access_project(project_id)));

-- Storage: the SFX library takes audio only, into the uploader's own folder.
-- The other public buckets are unused (and empty in production): no uploads.
UPDATE storage.buckets SET file_size_limit = 20971520, allowed_mime_types = ARRAY['audio/*'] WHERE id = 'sfx_library';
DROP POLICY "Allow authenticated uploads to sfx_library" ON storage.objects;
CREATE POLICY "sfx_library: upload to own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sfx_library' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "sfx_library: read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'sfx_library' AND owner_id = (SELECT auth.uid())::text);
CREATE POLICY "sfx_library: delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'sfx_library' AND owner_id = (SELECT auth.uid())::text);
DROP POLICY "Auth Users Upload" ON storage.objects;
DROP POLICY "Users Delete Own Files" ON storage.objects;
DROP POLICY "Authenticated users can upload" ON storage.objects;
DROP POLICY "Users can delete their own assets" ON storage.objects;
DROP POLICY "Public Access" ON storage.objects;
DROP POLICY "SFX files insertable by authenticated users" ON storage.objects;
DROP POLICY "SFX files viewable by everyone" ON storage.objects;

-- Unused and empty: script_notes (open to every signed-in user),
-- script_versions and script_collaborators (nothing reads or writes them).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.script_notes) OR EXISTS (SELECT 1 FROM public.script_versions)
     OR EXISTS (SELECT 1 FROM public.script_collaborators) THEN
    RAISE EXCEPTION 'Refusing to drop script tables that hold rows — check before dropping.';
  END IF;
END $$;
DROP TABLE public.script_notes, public.script_versions, public.script_collaborators;

-- ── 9. Reactions ───────────────────────────────────────────────────────────
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
  if p_emoji is null or char_length(p_emoji) not between 1 and 16 then raise exception 'invalid reaction'; end if;
  select id, channel_uuid, sender_id, receiver_id, reactions into m from messages where id = p_message;
  if not found then raise exception 'message not found'; end if;
  -- Only messages the caller can see: their DMs, or a channel they can view.
  -- (IS NOT TRUE: receiver_id is null on channel messages, and NOT NULL
  -- would let everyone through.)
  if (m.sender_id::text = uid or m.receiver_id::text = uid
      or (m.channel_uuid is not null and internal.can_view_channel(m.channel_uuid))) is not true then
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
