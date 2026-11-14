-- Role model, step 3b: an invitation can be answered, and only an accepted one gives access.
--
-- What was wrong: Studio > Cast & crew > Recruit files a `project_crew` row as `pending`, and nothing could ever move it:
-- only the project's creator may update a crew row, so an invitation stayed `pending` forever. And `can_access_project`
-- counted ANY crew row whatever its status, so a person who had been invited (or who had declined) already read every
-- non-private project they were merely asked to join.
--
-- 1. `internal.can_access_project`: a member only counts once confirmed. (`can_shape_project` and `has_capability` already
--    required `confirmed`; this brings the read side in line.) Every existing production row is confirmed, so nobody who is on a
--    project today loses it.
--    `internal.is_project_member` (the helper under the `projects` read policy, who is cast, script notes and channel creation) gets
--    the same rule: before it, an invitee could read the project's own row, title and all.
-- 2. `public.my_crew_invitations()`: the caller's open invitations, with the project's title and who invited them (a pending
--    invitee can no longer read the project itself, so the title cannot come from a plain select).
-- 3. `public.respond_to_crew_invitation(project, accept)`: the invitee accepts or declines their own pending invitation, and only
--    that: it changes the status of the caller's own `pending` row and nothing else (not the tier, not the craft), then tells
--    the person who invited them.
-- The creator can still update a crew row (re-invite a decliner by setting it back to `pending`), as before.

CREATE OR REPLACE FUNCTION internal.can_access_project(pid uuid)
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
        select 1 from public.project_crew c
         where c.project_id = pid and c.user_id = (select auth.uid()) and coalesce(c.status, 'confirmed') = 'confirmed'
      ))
    )
  );
$function$;

CREATE OR REPLACE FUNCTION internal.is_project_member(pid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM project_crew c JOIN projects p ON p.id = c.project_id
    WHERE c.project_id = pid AND c.user_id = auth.uid() AND p.visibility <> 'private'
      AND coalesce(c.status, 'confirmed') = 'confirmed'
  );
$function$;

-- The caller's open invitations. Definer, because the invited person cannot read the project; it answers only about the caller.
CREATE FUNCTION public.my_crew_invitations()
 RETURNS TABLE (project_id uuid, title text, role text, craft text, invited_by_name text, created_at timestamptz)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select c.project_id, p.title, c.role, c.craft,
         coalesce(inv.username, own.username), c.created_at
    from public.project_crew c
    join public.projects p on p.id = c.project_id
    left join public.profiles inv on inv.id = c.invited_by
    left join public.profiles own on own.id = p.creator_id
   where c.user_id = (select auth.uid()) and c.status = 'pending'
   order by c.created_at desc;
$function$;
REVOKE ALL ON FUNCTION public.my_crew_invitations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_crew_invitations() TO authenticated, service_role;

-- Accept or decline your own open invitation.
CREATE FUNCTION public.respond_to_crew_invitation(p_project uuid, p_accept boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_me uuid := (select auth.uid());
  v_row public.project_crew;
  v_title text;
  v_to uuid;
  v_name text;
begin
  if v_me is null then raise exception 'Sign in to answer an invitation' using errcode = '42501'; end if;

  update public.project_crew
     set status = case when p_accept then 'confirmed' else 'declined' end
   where project_id = p_project and user_id = v_me and status = 'pending'
   returning * into v_row;
  if v_row.id is null then raise exception 'There is no open invitation to answer' using errcode = 'P0002'; end if;

  select p.title, coalesce(v_row.invited_by, p.creator_id) into v_title, v_to from public.projects p where p.id = p_project;
  select username into v_name from public.profiles where id = v_me;
  if v_to is not null and v_to <> v_me then
    insert into public.notifications (user_id, type, title, body, link, created_by)
    values (v_to, 'crew',
            coalesce(v_name, 'Someone') || case when p_accept then ' joined the crew' else ' declined the invitation' end,
            case when p_accept then 'On “' else 'To “' end || coalesce(v_title, 'your project') || '”.',
            '/projects', v_me);
  end if;
end;
$function$;
REVOKE ALL ON FUNCTION public.respond_to_crew_invitation(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_crew_invitation(uuid, boolean) TO authenticated, service_role;
