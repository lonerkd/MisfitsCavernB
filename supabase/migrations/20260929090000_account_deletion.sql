-- Leaving the suite, and handing a project over.
--
-- delete_my_account(): anyone can delete their own account. What they own on
-- their own goes with them (projects nobody else is crew on, their portfolio,
-- job posts, applications, notifications…). What they wrote in other people's
-- spaces stays — script edits, shots, notes, channel messages, timesheets —
-- shown as "Deleted account": the links to them are cleared, not the work.
-- Direct messages with them go (a conversation with nobody can't be opened).
--
-- A project with other people on its crew is never deleted this way: the owner
-- hands it over first (transfer_project) or deletes it themselves.
--
-- Files in storage can't be removed from SQL (storage.protect_delete); the app
-- removes the files of the projects that go (account_deletion_plan lists them)
-- through the Storage API before calling delete_my_account.

-- ─── Links from other people's spaces: cleared, not cascaded or blocking ───────
ALTER TABLE public.messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE public.timesheets ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.messages DROP CONSTRAINT messages_sender_id_fkey,
  ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.timesheets DROP CONSTRAINT timesheets_user_id_fkey,
  ADD CONSTRAINT timesheets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.budget_items DROP CONSTRAINT budget_items_created_by_fkey,
  ADD CONSTRAINT budget_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.call_sheets DROP CONSTRAINT call_sheets_updated_by_fkey,
  ADD CONSTRAINT call_sheets_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.campaigns DROP CONSTRAINT campaigns_created_by_fkey,
  ADD CONSTRAINT campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.channels DROP CONSTRAINT channels_created_by_fkey,
  ADD CONSTRAINT channels_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.character_castings DROP CONSTRAINT character_castings_created_by_fkey,
  ADD CONSTRAINT character_castings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.discord_integrations DROP CONSTRAINT discord_integrations_created_by_fkey,
  ADD CONSTRAINT discord_integrations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.project_audio_references DROP CONSTRAINT project_audio_references_added_by_fkey,
  ADD CONSTRAINT project_audio_references_added_by_fkey FOREIGN KEY (added_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.project_beats DROP CONSTRAINT project_beats_created_by_fkey,
  ADD CONSTRAINT project_beats_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.project_crew DROP CONSTRAINT project_crew_invited_by_fkey,
  ADD CONSTRAINT project_crew_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.project_tasks DROP CONSTRAINT project_tasks_assigned_to_fkey,
  ADD CONSTRAINT project_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.script_annotations DROP CONSTRAINT script_annotations_created_by_fkey,
  ADD CONSTRAINT script_annotations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.script_characters DROP CONSTRAINT script_characters_updated_by_fkey,
  ADD CONSTRAINT script_characters_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.script_metadata DROP CONSTRAINT script_metadata_updated_by_fkey,
  ADD CONSTRAINT script_metadata_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.script_revisions DROP CONSTRAINT script_revisions_created_by_fkey,
  ADD CONSTRAINT script_revisions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.scripts DROP CONSTRAINT scripts_created_by_fkey,
  ADD CONSTRAINT scripts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.scripts DROP CONSTRAINT scripts_last_edited_by_fkey,
  ADD CONSTRAINT scripts_last_edited_by_fkey FOREIGN KEY (last_edited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.shots DROP CONSTRAINT shots_created_by_fkey,
  ADD CONSTRAINT shots_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.timeline_items DROP CONSTRAINT timeline_items_assigned_to_fkey,
  ADD CONSTRAINT timeline_items_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.timeline_items DROP CONSTRAINT timeline_items_created_by_fkey,
  ADD CONSTRAINT timeline_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
-- jobs.created_by stays required: delete_my_account hands a job on another
-- person's project to that project's owner and removes the rest.

-- ─── Hand a project over ───────────────────────────────────────────────────────
-- The owner gives the project to someone confirmed on its crew. The new owner
-- leaves the crew list (owners aren't crew); the old owner stays on as a lead.
-- The project's job posts move with it.
CREATE FUNCTION public.transfer_project(p_project uuid, p_to uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  if not exists (select 1 from public.projects where id = p_project and creator_id = uid) then
    raise exception 'Only the project''s owner can hand it over.' using errcode = '42501';
  end if;
  if p_to is null or p_to = uid or not exists (
    select 1 from public.project_crew
     where project_id = p_project and user_id = p_to and coalesce(status, 'confirmed') = 'confirmed'
  ) then
    raise exception 'Hand it to someone confirmed on its crew.' using errcode = '22023';
  end if;

  update public.projects set creator_id = p_to, updated_at = now() where id = p_project;
  delete from public.project_crew where project_id = p_project and user_id = p_to;
  insert into public.project_crew (project_id, user_id, role, status, invited_by)
  values (p_project, uid, 'lead', 'confirmed', p_to)
  on conflict (project_id, user_id) do update set role = 'lead', status = 'confirmed';
  update public.jobs set created_by = p_to where project_id = p_project and created_by = uid;
end;
$function$;

REVOKE ALL ON FUNCTION public.transfer_project(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_project(uuid, uuid) TO authenticated;

-- ─── What deleting would do ─────────────────────────────────────────────────────
-- shared: projects to hand over first (with who they can go to);
-- solo: projects that go with the account; files: their stored files.
CREATE FUNCTION public.account_deletion_plan()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with me as (select (select auth.uid()) as uid),
  mine as (
    select p.id, p.title,
      (select coalesce(jsonb_agg(jsonb_build_object('id', c.user_id, 'username', pr.username, 'role', c.role) order by pr.username), '[]'::jsonb)
         from public.project_crew c join public.profiles pr on pr.id = c.user_id
        where c.project_id = p.id and c.user_id <> p.creator_id and coalesce(c.status, 'confirmed') = 'confirmed') as crew
      from public.projects p, me where p.creator_id = me.uid
  )
  select jsonb_build_object(
    'username', (select username from public.profiles where id = me.uid),
    'shared', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'crew', crew) order by title) from mine where jsonb_array_length(crew) > 0), '[]'::jsonb),
    'solo', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title) order by title) from mine where jsonb_array_length(crew) = 0), '[]'::jsonb),
    'files', jsonb_build_object(
      'project-media', coalesce((select jsonb_agg(m.storage_path) from public.media m join mine on mine.id = m.project_id
                                  where jsonb_array_length(mine.crew) = 0 and m.storage_path is not null), '[]'::jsonb),
      'project-papers', coalesce((select jsonb_agg(d.storage_path) from public.project_documents d join mine on mine.id = d.project_id
                                   where jsonb_array_length(mine.crew) = 0 and d.storage_path is not null), '[]'::jsonb)
    )
  )
  from me where me.uid is not null;
$function$;

REVOKE ALL ON FUNCTION public.account_deletion_plan() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.account_deletion_plan() TO authenticated;

-- ─── Delete my account ──────────────────────────────────────────────────────────
-- p_confirm must be the caller's username (typed in the app), so nothing
-- deletes an account by accident.
CREATE FUNCTION public.delete_my_account(p_confirm text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  if p_confirm is null or not exists (select 1 from public.profiles where id = uid and username = btrim(p_confirm)) then
    raise exception 'Type your username to confirm.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.projects p
     where p.creator_id = uid and exists (
       select 1 from public.project_crew c
        where c.project_id = p.id and c.user_id <> uid and coalesce(c.status, 'confirmed') = 'confirmed')
  ) then
    raise exception 'Hand over or delete the projects other people work on first.' using errcode = '55000';
  end if;
  if (select is_admin from public.profiles where id = uid)
     and not exists (select 1 from public.profiles where is_admin and id <> uid) then
    raise exception 'Make someone else an admin first — you''re the only one.' using errcode = '55000';
  end if;

  -- A job they posted on someone else's project stays with that project.
  update public.jobs j set created_by = p.creator_id
    from public.projects p
   where j.created_by = uid and j.project_id = p.id and p.creator_id <> uid;
  delete from public.jobs where created_by = uid;
  -- Direct messages they sent (those sent to them go with the profile).
  delete from public.messages where sender_id = uid and receiver_id is not null;
  -- Their own projects, with everything in them.
  delete from public.projects where creator_id = uid;
  -- The account; the profile and everything personal follow it.
  delete from auth.users where id = uid;
end;
$function$;

REVOKE ALL ON FUNCTION public.delete_my_account(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account(text) TO authenticated;
