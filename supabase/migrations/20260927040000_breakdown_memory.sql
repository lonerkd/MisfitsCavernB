-- The breakdown remembers. Until now, a thing the writer CAPITALISED was
-- sorted by a fixed word list in the parser (GUN → props, JACKET → wardrobe,
-- anything else → props), and the parser's guesses were also stored on every
-- scene (scenes.elements) though nothing reads them any more — the breakdown
-- tables replaced them.
--
-- Now: breakdown_memory() returns what the caller has tagged before, across
-- every project they're on — each thing once, with the category it was filed
-- under most often. The editor uses it to file new mentions the way this
-- team files them, and to spot things by name even when they aren't in caps.
-- scenes.elements is dropped and sync_script_scenes no longer writes it.

-- ── What the caller has tagged before ──────────────────────────────────────
-- Invoker rights: breakdown RLS (internal.can_access_project) limits it to
-- projects the caller owns or crews on.
CREATE FUNCTION public.breakdown_memory(p_exclude uuid DEFAULT NULL)
 RETURNS TABLE(name text, category_key text, projects bigint)
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
  with tagged as (
    select lower(btrim(e.name)) as k, btrim(e.name) as name, c.key, e.project_id, e.updated_at
    from public.breakdown_elements e
    join public.breakdown_categories c on c.id = e.category_id and c.project_id = e.project_id
    where e.project_id is distinct from p_exclude
  ),
  per_category as (
    select k, key, count(distinct project_id) as n, max(updated_at) as last,
           (array_agg(name order by updated_at desc))[1] as name
    from tagged group by k, key
  )
  select distinct on (k) name, key, n
  from per_category
  order by k, n desc, last desc
  limit 5000;
$function$;

REVOKE ALL ON FUNCTION public.breakdown_memory(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.breakdown_memory(uuid) TO authenticated, service_role;

-- ── Scenes no longer store the parser's guesses ────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_script_scenes(p_script_id uuid, p_base_ids uuid[], p_scenes jsonb)
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
                                     location, time_of_day, cast_list, est_duration, removed_at)
    values ((v_scene->>'id')::uuid, v_project, p_script_id, v_pos, v_pos - 1, v_heading, left(v_heading, 200),
            nullif(v_scene->>'location', ''), coalesce(nullif(v_scene->>'time_of_day', ''), 'DAY'),
            nullif(v_scene->>'cast_list', ''), nullif(v_scene->>'est_duration', ''), null)
    on conflict (id) do update set
      scene_number = excluded.scene_number, ordinal = excluded.ordinal, heading = excluded.heading,
      title = excluded.title, location = excluded.location, time_of_day = excluded.time_of_day,
      cast_list = excluded.cast_list, est_duration = excluded.est_duration,
      removed_at = null
    where (sc.scene_number, sc.ordinal, sc.heading, sc.title, sc.location, sc.time_of_day, sc.cast_list,
           sc.est_duration, sc.removed_at)
          is distinct from
          (excluded.scene_number, excluded.ordinal, excluded.heading, excluded.title, excluded.location,
           excluded.time_of_day, excluded.cast_list, excluded.est_duration, null::timestamptz);
  end loop;

  return v_ids;
end;
$function$;

ALTER TABLE public.scenes DROP COLUMN elements;
