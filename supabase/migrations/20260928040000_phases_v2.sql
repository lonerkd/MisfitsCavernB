-- Phases v2: the suite suggests the next phase from what's happening, and
-- reveals tools inside the editor and Studio as the production needs them.
--
-- project_progress() also reports the breakdown's size, locked revisions and
-- the shoot's first and last dated day — the signals lib/os/progress uses to
-- suggest a phase ("your first shoot day has arrived") and to open the
-- breakdown and revisions early once that work has started.
--
-- profiles.ui_prefs: private, per-account interface choices —
--   show_all_tools  every tool in every project, at once
--   seen_tools      tools whose one-line intro has been read
--   dismissed       phase suggestions waved off ("<project>:<phase>")
-- read and written only through get_my_ui_prefs / set_my_ui_prefs, which
-- accept only those keys, typed and bounded.

ALTER TABLE public.profiles ADD COLUMN ui_prefs jsonb DEFAULT '{}'::jsonb NOT NULL
  CONSTRAINT profiles_ui_prefs_check CHECK (jsonb_typeof(ui_prefs) = 'object' AND pg_column_size(ui_prefs) < 16384);

CREATE FUNCTION public.get_my_ui_prefs()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((select p.ui_prefs from public.profiles p where p.id = (select auth.uid())), '{}'::jsonb);
$function$;
REVOKE ALL ON FUNCTION public.get_my_ui_prefs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_ui_prefs() TO authenticated;

CREATE FUNCTION public.set_my_ui_prefs(p_patch jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid := (select auth.uid());
  k text;
  v jsonb;
  clean jsonb := '{}'::jsonb;
  out jsonb;
begin
  if uid is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Preferences must be an object' using errcode = '22023';
  end if;
  for k, v in select * from jsonb_each(p_patch) loop
    if k = 'show_all_tools' then
      if jsonb_typeof(v) <> 'boolean' then raise exception 'show_all_tools is true or false' using errcode = '22023'; end if;
    elsif k in ('seen_tools', 'dismissed') then
      if jsonb_typeof(v) <> 'array'
         or jsonb_array_length(v) > 200
         or exists (select 1 from jsonb_array_elements(v) e where jsonb_typeof(e) <> 'string' or char_length(e #>> '{}') not between 1 and 80) then
        raise exception '% is a short list of names', k using errcode = '22023';
      end if;
    else
      raise exception 'Unknown preference %', k using errcode = '22023';
    end if;
    clean := clean || jsonb_build_object(k, v);
  end loop;
  update public.profiles set ui_prefs = ui_prefs || clean where id = uid returning ui_prefs into out;
  return coalesce(out, '{}'::jsonb);
end;
$function$;
REVOKE ALL ON FUNCTION public.set_my_ui_prefs(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_ui_prefs(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.project_progress(p_project uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'status', p.status,
    'project_type', p.project_type,
    'format', (select jsonb_build_object(
                 'phase_labels', f.phase_labels,
                 'skip_phases', to_jsonb(f.skip_phases),
                 'skip_milestones', to_jsonb(f.skip_milestones))
               from public.project_formats f where f.name = p.project_type),
    'visibility', p.visibility,
    'unlock_all', coalesce(p.settings->'unlockAllTools' = 'true'::jsonb, false),
    'logline', char_length(btrim(coalesce(p.description, ''))) >= 10,
    'scripts', (select count(*) from public.scripts s
                 where s.project_id = p.id and char_length(btrim(coalesce(s.content, ''))) > 0),
    'characters', (select count(*) from public.script_characters c
                    join public.scripts s on s.id = c.script_id where s.project_id = p.id),
    'scenes', (select count(*) from public.scenes sc where sc.project_id = p.id and sc.removed_at is null),
    'scenes_wrapped', (select count(*) from public.scenes sc
                        where sc.project_id = p.id and sc.removed_at is null and sc.status = 'wrapped'),
    'beats', (select count(*) from public.project_beats b where b.project_id = p.id),
    'media', (select count(*) from public.media m where m.project_id = p.id),
    'media_shared', (select count(*) from public.media m where m.project_id = p.id and m.shared),
    'crew', (select count(*) from public.project_crew pc where pc.project_id = p.id),
    'castings', (select count(*) from public.character_castings cc where cc.project_id = p.id),
    'shots', (select count(*) from public.shots sh where sh.project_id = p.id),
    'call_sheets', (select count(*) from public.call_sheets cs where cs.project_id = p.id and cs.shoot_date is not null),
    'shoot_start', (select min(cs.shoot_date)::text from public.call_sheets cs where cs.project_id = p.id),
    'shoot_end', (select max(cs.shoot_date)::text from public.call_sheets cs where cs.project_id = p.id),
    'breakdown_elements', (select count(*) from public.breakdown_elements be where be.project_id = p.id),
    'revisions', (select count(*) from public.script_revisions r
                   join public.scripts s on s.id = r.script_id where s.project_id = p.id),
    'tasks', (select count(*) from public.project_tasks t where t.project_id = p.id),
    'tasks_done', (select count(*) from public.project_tasks t where t.project_id = p.id and t.completed),
    'budget_lines', (select count(*) from public.budget_items bi where bi.project_id = p.id),
    'milestones', (select count(*) from public.timeline_items ti where ti.project_id = p.id),
    'cuts', (select count(*) from public.post_cuts pc where pc.project_id = p.id),
    'post_notes', (select count(*) from public.post_notes pn where pn.project_id = p.id),
    'post_notes_open', (select count(*) from public.post_notes pn where pn.project_id = p.id and pn.resolved_at is null),
    'stages', (select count(*) from public.post_items pi where pi.project_id = p.id and pi.kind = 'stage'),
    'stages_done', (select count(*) from public.post_items pi where pi.project_id = p.id and pi.kind = 'stage' and pi.status = 'done'),
    'deliverables', (select count(*) from public.post_items pi where pi.project_id = p.id and pi.kind = 'deliverable'),
    'deliverables_done', (select count(*) from public.post_items pi where pi.project_id = p.id and pi.kind = 'deliverable' and pi.status = 'done'),
    'campaigns', (select count(*) from public.campaigns ca where ca.project_id = p.id),
    'festivals_submitted', (select count(*) from jsonb_array_elements(
                              case when jsonb_typeof(p.festival_submissions) = 'array' then p.festival_submissions else '[]'::jsonb end) f
                            where f->>'status' in ('submitted', 'accepted')),
    'portfolio', (select count(*) from public.portfolio_projects pp where pp.source_project_id = p.id)
  )
  from public.projects p
  where p.id = p_project;
$function$;
