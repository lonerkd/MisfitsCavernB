-- Drop scenes.cast_list (BACKLOG 3.18 e; plans/2026-11-17-graph-column-drop.md).
--
-- The cast of a scene is its links (scene_characters). The text column only carried the script's cast cue to the trigger
-- that turned it into links, and every reader has been on the links since 2026-10-27. The linking now happens in the one
-- writer, sync_script_scenes, from the same payload key (`cast_list`, the cue the script reader found); nothing is stored as text.
--
--   1. sync_script_scenes links each scene's cast itself (same rules as the trigger: names upper-cased, at most 200
--      characters, characters created when new, links not in the cue removed) and only when the set of names changed.
--   2. characters_rename no longer rewrites a text column (the links follow the character by id).
--   3. the trigger and its function go; then the column.
-- Apply from this file exactly as written. A copy of the column is kept first (internal.cast_list_backup, by hand).

CREATE OR REPLACE FUNCTION public.sync_script_scenes(p_script_id uuid, p_base_ids uuid[], p_scenes jsonb)
 RETURNS uuid[]
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_project uuid;
  v_current uuid[];
  v_ids uuid[];
  v_scene jsonb;
  v_pos bigint;
  v_heading text;
  v_names text[];
  v_linked text[];
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
                                     location, time_of_day, est_duration, removed_at)
    values ((v_scene->>'id')::uuid, v_project, p_script_id, v_pos, v_pos - 1, v_heading, left(v_heading, 200),
            nullif(v_scene->>'location', ''), coalesce(nullif(v_scene->>'time_of_day', ''), 'DAY'),
            nullif(v_scene->>'est_duration', ''), null)
    on conflict (id) do update set
      scene_number = excluded.scene_number, ordinal = excluded.ordinal, heading = excluded.heading,
      title = excluded.title, location = excluded.location, time_of_day = excluded.time_of_day,
      est_duration = excluded.est_duration,
      removed_at = null
    where (sc.scene_number, sc.ordinal, sc.heading, sc.title, sc.location, sc.time_of_day,
           sc.est_duration, sc.removed_at)
          is distinct from
          (excluded.scene_number, excluded.ordinal, excluded.heading, excluded.title, excluded.location,
           excluded.time_of_day, excluded.est_duration, null::timestamptz);

    -- The scene's cast: the script's cue becomes links (and characters, if new). Only when the set of names changed.
    select coalesce(array_agg(distinct n), '{}') into v_names
    from (select upper(btrim(x)) as n from unnest(string_to_array(coalesce(v_scene->>'cast_list', ''), ',')) x) q
    where n <> '' and char_length(n) <= 200;

    select coalesce(array_agg(c.name), '{}') into v_linked
    from public.scene_characters sc2 join public.characters c on c.id = sc2.character_id
    where sc2.scene_id = (v_scene->>'id')::uuid;

    if not (v_names <@ v_linked and v_linked <@ v_names) then
      insert into public.characters (project_id, name)
      select v_project, unnest(v_names)
      on conflict (project_id, name) do nothing;

      delete from public.scene_characters sc2
      where sc2.scene_id = (v_scene->>'id')::uuid
        and not exists (select 1 from public.characters c where c.id = sc2.character_id and c.name = any (v_names));

      insert into public.scene_characters (scene_id, character_id, project_id)
      select (v_scene->>'id')::uuid, c.id, v_project from public.characters c
      where c.project_id = v_project and c.name = any (v_names)
      on conflict do nothing;
    end if;
  end loop;

  return v_ids;
end;
$function$;

-- A rename follows by id: the calls and castings carry the new name; scenes need nothing (their cast is the links).
CREATE OR REPLACE FUNCTION internal.characters_rename()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  update public.character_castings set character_name = new.name where character_id = new.id;
  -- One call per name per sheet is unique, and two calls typed 'Maya' and 'MAYA' both link to this
  -- character: rename one per sheet, and leave a call alone if its sheet already has the new name.
  -- The link (character_id) is the truth; the text on a left-alone call is just older.
  update public.call_sheet_calls k set character_name = new.name
  where k.id in (select distinct on (call_sheet_id) id from public.call_sheet_calls where character_id = new.id order by call_sheet_id, id)
    and not exists (select 1 from public.call_sheet_calls o where o.call_sheet_id = k.call_sheet_id and o.character_name = new.name and o.id <> k.id);
  return null;
end;
$function$;

DROP TRIGGER scenes_link_cast ON public.scenes;
DROP FUNCTION internal.scenes_link_cast();
ALTER TABLE public.scenes DROP COLUMN cast_list;
