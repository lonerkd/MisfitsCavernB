-- Script annotations route to real work, and the shot list exists.
--
-- The editor's margin notes said "Routes to: Shot List / Beat Board /
-- Call Sheet" but went nowhere: annotations were only dots on the page and
-- nothing read the shots table. Now a Shot, Beat or To-do annotation creates
-- the shot (on that scene), the beat or the project task in the same
-- transaction, and remembers what it created.

-- ── Shots ──────────────────────────────────────────────────────────────────
-- A shot's scene must belong to the shot's project.
ALTER TABLE public.shots
  DROP CONSTRAINT shots_scene_id_fkey,
  ADD CONSTRAINT shots_scene_fkey FOREIGN KEY (scene_id, project_id) REFERENCES public.scenes(id, project_id) ON DELETE CASCADE,
  ADD CONSTRAINT shots_number_len CHECK (char_length(shot_number) BETWEEN 1 AND 12),
  ADD CONSTRAINT shots_description_len CHECK (char_length(description) <= 2000),
  ALTER COLUMN created_by SET DEFAULT auth.uid();

DROP POLICY "Shots viewable by project creator or crew" ON public.shots;
DROP POLICY "Shots writable by project creator or crew" ON public.shots;
CREATE POLICY "shots access" ON public.shots FOR ALL TO authenticated
  USING (internal.can_access_project(project_id)) WITH CHECK (internal.can_access_project(project_id));

ALTER PUBLICATION supabase_realtime ADD TABLE public.shots;

-- ── Annotations ────────────────────────────────────────────────────────────
ALTER TABLE public.script_annotations
  ADD COLUMN routed_table text,
  ADD COLUMN routed_id uuid,
  ALTER COLUMN created_by SET DEFAULT auth.uid(),
  ADD CONSTRAINT script_annotations_text_len CHECK (char_length(text) BETWEEN 1 AND 2000),
  ADD CONSTRAINT script_annotations_routed_check CHECK (
    (routed_table IS NULL AND routed_id IS NULL)
    OR (routed_table IN ('shots', 'project_beats', 'project_tasks') AND routed_id IS NOT NULL)
  );

-- Adds a margin note and, for shot/beat/to-do, the item it routes to.
-- Invoker rights: every insert is checked by the caller's own RLS.
-- The scene is found by its position in the saved script; the heading must
-- match, so a note never lands on the wrong scene after unsaved edits.
CREATE FUNCTION public.add_script_annotation(
  p_script uuid, p_line integer, p_type text, p_text text,
  p_scene_ordinal integer DEFAULT NULL, p_scene_heading text DEFAULT NULL
)
 RETURNS public.script_annotations
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_project uuid;
  v_scene public.scenes;
  v_text text := btrim(p_text);
  v_table text;
  v_id uuid;
  v_row public.script_annotations;
begin
  select s.project_id into v_project from public.scripts s where s.id = p_script;
  if v_project is null then
    raise exception 'Margin notes need a script that belongs to a project' using errcode = '42501';
  end if;

  if p_type in ('shot', 'beat') and p_scene_ordinal is not null then
    select * into v_scene from public.scenes sc
    where sc.script_id = p_script and sc.ordinal = p_scene_ordinal and sc.removed_at is null
      and upper(btrim(sc.heading)) = upper(btrim(coalesce(p_scene_heading, '')));
  end if;

  if p_type = 'shot' then
    if v_scene.id is null then
      raise exception 'Save the script first — this scene isn''t in the shot list yet' using errcode = 'P0002';
    end if;
    insert into public.shots (project_id, scene_id, shot_number, description, order_index)
    values (
      v_project, v_scene.id,
      ((select count(*) from public.shots x where x.scene_id = v_scene.id) + 1)::text,
      v_text,
      (select coalesce(max(x.order_index), -1) + 1 from public.shots x where x.scene_id = v_scene.id)
    )
    returning id into v_id;
    v_table := 'shots';
  elsif p_type = 'beat' then
    insert into public.project_beats (project_id, script_id, title, content, scene_number, created_by, order_index)
    values (
      v_project, p_script, left(v_text, 200), v_text, v_scene.scene_number::text, (select auth.uid()),
      (select coalesce(max(b.order_index), -1) + 1 from public.project_beats b where b.project_id = v_project)
    )
    returning id into v_id;
    v_table := 'project_beats';
  elsif p_type = 'todo' then
    insert into public.project_tasks (project_id, title) values (v_project, v_text) returning id into v_id;
    v_table := 'project_tasks';
  end if;

  insert into public.script_annotations (script_id, project_id, line_index, type, text, routed_table, routed_id)
  values (p_script, v_project, p_line, p_type, v_text, v_table, v_id)
  returning * into v_row;
  return v_row;
end;
$function$;
REVOKE ALL ON FUNCTION public.add_script_annotation(uuid, integer, text, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_script_annotation(uuid, integer, text, text, integer, text) TO authenticated, service_role;
