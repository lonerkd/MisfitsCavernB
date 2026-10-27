-- Phase gates, review fixes (follows 20261031000000, which was merged before the
-- review landed; nothing had been applied yet).
--   * archived => shared = false on every write, and the lifecycle guard also runs
--     on INSERT (a non-shaper can't create an archived item);
--   * advance_phase takes a default plus exceptions (one atomic step for any
--     library size), locks the project row so gates run serially, and records the
--     counts of what really changed.

CREATE OR REPLACE FUNCTION internal.media_lifecycle_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if ((tg_op = 'INSERT' and new.lifecycle <> 'working') or (tg_op = 'UPDATE' and new.lifecycle is distinct from old.lifecycle))
     and (select auth.uid()) is not null
     and not internal.can_shape_project(new.project_id) then
    raise exception 'Only people who shape the project can archive or restore library items' using errcode = '42501';
  end if;
  if new.lifecycle = 'archived' then
    new.shared := false;
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.media_lifecycle_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER media_lifecycle_guard ON public.media;
CREATE TRIGGER media_lifecycle_guard BEFORE INSERT OR UPDATE ON public.media
  FOR EACH ROW EXECUTE FUNCTION internal.media_lifecycle_guard();


-- The first version took a list of decisions; it is replaced, not kept alongside.
DROP FUNCTION public.advance_phase(uuid, text, jsonb);

-- The choices arrive as a default plus the exceptions to it: p_default 'carry'
-- archives the listed ids; p_default 'archive' archives everything working except
-- the listed ids. Archiving also takes the item off the public share link (the
-- guard trigger). The record counts what really happened.
CREATE FUNCTION public.advance_phase(p_project uuid, p_to text, p_default text DEFAULT 'carry', p_exceptions jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  from_status text;
  ids uuid[];
  archived_n integer := 0;
  carried_n integer;
begin
  if not internal.is_project_creator(p_project) then
    raise exception 'Only the project owner can pass a phase gate' using errcode = '42501';
  end if;
  if p_to not in ('concept', 'pre-production', 'production', 'post-production', 'completed') then
    raise exception 'Unknown phase' using errcode = '22023';
  end if;
  if p_default not in ('carry', 'archive') then
    raise exception 'The default must be carry or archive' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_exceptions, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_exceptions, '[]'::jsonb)) > 1000 then
    raise exception 'Exceptions must be a list of at most 1000 ids' using errcode = '22023';
  end if;
  ids := array(select jsonb_array_elements_text(coalesce(p_exceptions, '[]'::jsonb))::uuid);

  -- One gate at a time per project: the second reads the first's result.
  select status into from_status from public.projects where id = p_project for update;

  if p_default = 'archive' then
    update public.media set lifecycle = 'archived'
     where project_id = p_project and lifecycle = 'working' and not (id = any (ids));
  else
    update public.media set lifecycle = 'archived'
     where project_id = p_project and lifecycle = 'working' and id = any (ids);
  end if;
  get diagnostics archived_n = row_count;
  select count(*) into carried_n from public.media where project_id = p_project and lifecycle = 'working';

  update public.projects set status = p_to where id = p_project;
  insert into public.phase_gates (project_id, from_status, to_status, carried, archived)
  values (p_project, coalesce(from_status, ''), p_to, carried_n, archived_n);
  return jsonb_build_object('archived', archived_n, 'carried', carried_n);
end;
$function$;
REVOKE ALL ON FUNCTION public.advance_phase(uuid, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.advance_phase(uuid, text, text, jsonb) TO authenticated, service_role;
