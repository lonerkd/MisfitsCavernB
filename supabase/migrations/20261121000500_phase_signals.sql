-- BACKLOG 3.52: the phases' milestones read real prerequisites. project_progress gains the counts they need (all read from the project's own
-- records, nothing ticked by hand): crew who have CONFIRMED (an invite is not a crew member), locations and how many are confirmed, permits
-- still to clear, and call sheets actually ISSUED (not only dated). Same function, same privileges (CREATE OR REPLACE keeps them); it
-- stays SECURITY INVOKER, so each caller counts only what they can read.
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
    'crew_confirmed', (select count(*) from public.project_crew pc where pc.project_id = p.id and coalesce(pc.status, 'confirmed') = 'confirmed'),
    'castings', (select count(*) from public.character_castings cc where cc.project_id = p.id),
    'shots', (select count(*) from public.shots sh where sh.project_id = p.id),
    'call_sheets', (select count(*) from public.call_sheets cs where cs.project_id = p.id and cs.shoot_date is not null),
    'call_sheets_issued', (select count(*) from public.call_sheets cs where cs.project_id = p.id and cs.issued_at is not null),
    'shoot_start', (select min(cs.shoot_date)::text from public.call_sheets cs where cs.project_id = p.id),
    'shoot_end', (select max(cs.shoot_date)::text from public.call_sheets cs where cs.project_id = p.id),
    'locations', (select count(*) from public.project_locations l where l.project_id = p.id),
    'locations_confirmed', (select count(*) from public.project_locations l where l.project_id = p.id and l.status = 'confirmed'),
    'permits_open', (select count(*) from public.project_locations l where l.project_id = p.id and l.permit in ('needed', 'applied')),
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

-- The five new pre-production milestones (breakdown, lock-script, locations, permits, call-sheet) do not apply to every format: a
-- milestone a format skips is hidden (not deleted), exactly like the ones it already skips.
UPDATE public.project_formats SET skip_milestones = (SELECT array_agg(DISTINCT m) FROM unnest(skip_milestones || ARRAY['breakdown','lock-script','locations','permits','call-sheet']) m)
 WHERE name IN ('Podcast', 'Copywriting', 'Blog / Newsletter', 'Video Game');
UPDATE public.project_formats SET skip_milestones = (SELECT array_agg(DISTINCT m) FROM unnest(skip_milestones || ARRAY['breakdown','lock-script']) m)
 WHERE name IN ('Documentary', 'Music Video');
