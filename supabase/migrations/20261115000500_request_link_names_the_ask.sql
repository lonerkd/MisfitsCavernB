-- The owner's "asks for access" notification now carries who asked and for what in its link (`&grant=<user>.<capability>`),
-- so the crew screen can offer a one-click Grant. The link only names the request: granting still goes through
-- `crew_capability_overrides`, which only the owner can write. Same function otherwise; nothing new is granted.
CREATE OR REPLACE FUNCTION public.request_capability(p_project uuid, p_capability text)
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
       and n.link = '/studio?project=' || p_project::text || '&tab=production&view=crew&grant=' || v_me::text || '.' || p_capability
  ) then return; end if;

  insert into public.notifications (user_id, type, title, body, link, created_by)
  values (v_owner, 'crew', left(v_heading, 200),
          'On “' || coalesce(v_title, 'your project') || '”' || case when v_craft is null then '' else ', as ' || v_craft end
            || '. You can change what they can do on Cast & crew.',
          '/studio?project=' || p_project::text || '&tab=production&view=crew&grant=' || v_me::text || '.' || p_capability, v_me);
end;
$function$;
REVOKE ALL ON FUNCTION public.request_capability(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_capability(uuid, text) TO authenticated, service_role;
