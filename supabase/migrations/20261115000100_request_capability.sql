-- Role model, step 5: when a role is refused something, the person can ask the owner for it.
--
-- `request_capability(project, capability)` is what the "Ask the owner" button calls. A confirmed member of a project (anyone
-- `can_access_project` lets in) asks for one named capability; the project's owner gets a notification that says who asked,
-- in which craft and for what, and links to Studio > Cast & crew, where the owner already switches a person's rights.
-- It grants nothing: only the owner changes a person's rights (`crew_capability_overrides`, owner-only). Asking again while the
-- owner has not yet read the first request does nothing (one open request per person and capability), so the button cannot
-- be used to flood the owner. Asking for what you already hold, or asking as the owner, does nothing either.

CREATE FUNCTION public.request_capability(p_project uuid, p_capability text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_me uuid := (select auth.uid());
  v_owner uuid;
  v_title text;
  v_label text;
  v_name text;
  v_craft text;
  v_heading text;
begin
  if v_me is null then raise exception 'Sign in to ask for access' using errcode = '42501'; end if;
  if not internal.can_access_project(p_project) then raise exception 'You are not on this project' using errcode = '42501'; end if;
  select label into v_label from public.capabilities where key = p_capability;
  if v_label is null then raise exception 'There is no such permission' using errcode = 'P0002'; end if;

  select creator_id, title into v_owner, v_title from public.projects where id = p_project;
  if v_owner is null or v_owner = v_me then return; end if;
  if internal.has_capability(p_project, p_capability) then return; end if;

  select username into v_name from public.profiles where id = v_me;
  select craft into v_craft from public.project_crew where project_id = p_project and user_id = v_me;
  v_heading := coalesce(v_name, 'Someone') || ' asks for access: ' || lower(v_label);
  if exists (
    select 1 from public.notifications n
     where n.user_id = v_owner and n.created_by = v_me and n.read = false and n.type = 'crew' and n.title = v_heading
       and n.link = '/studio?project=' || p_project::text || '&tab=production&view=crew'
  ) then return; end if;

  insert into public.notifications (user_id, type, title, body, link, created_by)
  values (v_owner, 'crew', left(v_heading, 200),
          'On “' || coalesce(v_title, 'your project') || '”' || case when v_craft is null then '' else ', as ' || v_craft end
            || '. You can change what they can do on Cast & crew.',
          '/studio?project=' || p_project::text || '&tab=production&view=crew', v_me);
end;
$function$;
REVOKE ALL ON FUNCTION public.request_capability(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_capability(uuid, text) TO authenticated, service_role;
