-- Role model, step 3b: an invitee can accept or decline their own crew invitation.
--
-- What was wrong: project_crew.status stays 'pending' forever because only the project's
-- creator could UPDATE the row (the "Project creators can update crew" policy). An invited
-- person had no way to confirm they are on the project — or to say they're not.
-- A side-effect: can_access_project counts any project_crew row regardless of status,
-- so a pending or declined member reads every non-private project they were ever invited to.
--
-- What changes:
--   1. respond_to_crew_invite(project_id, 'confirmed' | 'declined') — the invitee sets their
--      own status; notifies the owner; audit-logged.
--   2. can_access_project — filters project_crew to confirmed rows only.
--
-- The invite notification already points to /projects, which will show the pending banner.
-- Nothing changes for the owner: their view of the crew still shows all statuses.

-- ── 1. RPC ───────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.respond_to_crew_invite(p_project_id uuid, p_response text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_owner uuid;
  v_title text;
  v_craft text;
  v_role text;
BEGIN
  IF p_response NOT IN ('confirmed', 'declined') THEN
    RAISE EXCEPTION 'response must be confirmed or declined';
  END IF;

  -- Update only a pending row that belongs to the caller.
  UPDATE public.project_crew
  SET status = p_response
  WHERE project_id = p_project_id AND user_id = v_uid AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no pending invitation found';
  END IF;

  -- Look up project owner + title for the notification.
  SELECT creator_id, title INTO v_owner, v_title
  FROM public.projects WHERE id = p_project_id;

  SELECT craft, role INTO v_craft, v_role
  FROM public.project_crew WHERE project_id = p_project_id AND user_id = v_uid;

  -- Notify the owner.
  IF v_owner IS NOT NULL AND v_owner <> v_uid THEN
    DECLARE v_username text;
    BEGIN
      SELECT username INTO v_username FROM public.profiles WHERE id = v_uid;
      INSERT INTO public.notifications (user_id, type, title, body, link, read)
      VALUES (
        v_owner,
        'crew',
        CASE WHEN p_response = 'confirmed'
             THEN coalesce(v_username, 'Someone') || ' accepted your invitation'
             ELSE coalesce(v_username, 'Someone') || ' declined your invitation'
        END,
        CASE WHEN v_title IS NOT NULL
             THEN 'On "' || v_title || '"' || CASE WHEN v_craft IS NOT NULL THEN ' as ' || v_craft ELSE '' END || '.'
             ELSE 'Crew invitation ' || p_response || '.'
        END,
        '/studio?project=' || p_project_id::text || '&view=Cast+%26+crew',
        false
      );
    END;
  END IF;

  -- Audit log.
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
  VALUES (v_uid, 'crew_invite_responded', 'project_crew', p_project_id::text || ':' || v_uid::text,
          jsonb_build_object('response', p_response, 'craft', v_craft, 'role', v_role));
END;
$function$;

REVOKE ALL ON FUNCTION public.respond_to_crew_invite(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_crew_invite(uuid, text) TO authenticated;

-- ── 2. can_access_project — confirmed members only ───────────────────────────────────────────
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
        where c.project_id = pid and c.user_id = (select auth.uid()) and c.status = 'confirmed'
      ))
    )
  );
$function$;
