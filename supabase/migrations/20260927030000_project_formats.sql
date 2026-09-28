-- Project formats as data. Until now a project's format lived in four places
-- that disagreed: the new-project modal offered six, lib/projectTypes.ts had
-- phase templates for eight (with its own phase ids), lib/os/phases.ts had
-- label overrides for five, and the phase engine hardcoded which milestones a
-- Podcast skips. The portfolio had a seventh list. A project's format also
-- couldn't be changed after it was created.
--
-- Now public.project_formats is the reference list. Each format says what its
-- phases are called, which it skips, which milestones don't apply, and which
-- script format a new script starts in. projects.project_type and
-- portfolio_projects.category point at it by name (renames cascade), and
-- project_progress() returns the format's rules with the counts, so the phase
-- engine reads one row instead of a table in the code.

CREATE TABLE public.project_formats (
  name text NOT NULL PRIMARY KEY CONSTRAINT project_formats_name_len CHECK (char_length(btrim(name)) BETWEEN 1 AND 40),
  blurb text DEFAULT '' NOT NULL CONSTRAINT project_formats_blurb_len CHECK (char_length(blurb) <= 140),
  icon text DEFAULT 'film' NOT NULL CONSTRAINT project_formats_icon_check CHECK (icon ~ '^[a-z-]{1,30}$'),
  script_format text DEFAULT 'screenplay' NOT NULL CONSTRAINT project_formats_script_format_check
    CHECK (script_format IN ('screenplay', 'teleplay', 'stage-play', 'treatment', 'podcast', 'doc-outline')),
  -- {"production": {"label": "Shoot", "abbr": "SHOOT"}} — only the five phases.
  phase_labels jsonb DEFAULT '{}'::jsonb NOT NULL CONSTRAINT project_formats_phase_labels_check
    CHECK (jsonb_typeof(phase_labels) = 'object'
      AND phase_labels - ARRAY['development', 'pre-production', 'production', 'post-production', 'delivery'] = '{}'::jsonb),
  -- A project always starts in development and ends in delivery.
  skip_phases text[] DEFAULT '{}'::text[] NOT NULL CONSTRAINT project_formats_skip_phases_check
    CHECK (skip_phases <@ ARRAY['pre-production', 'production', 'post-production']),
  skip_milestones text[] DEFAULT '{}'::text[] NOT NULL,
  position integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.project_formats ENABLE ROW LEVEL SECURITY;
-- Reference data: anyone may read it (public projects and portfolios show it).
CREATE POLICY "project formats view" ON public.project_formats FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "project formats admin write" ON public.project_formats FOR ALL TO authenticated
  USING (internal.caller_is_admin()) WITH CHECK (internal.caller_is_admin());

INSERT INTO public.project_formats (name, blurb, icon, script_format, phase_labels, skip_phases, skip_milestones, position) VALUES
  ('Feature', 'A full-length film, from the script to festivals.', 'film', 'screenplay', '{}', '{}', '{}', 0),
  ('Short Film', 'Under forty minutes. The calling card.', 'clapperboard', 'screenplay', '{}', '{}', '{}', 1),
  ('Series', 'Episodes and seasons, written as teleplays.', 'tv', 'teleplay',
    '{"delivery": {"label": "Released", "abbr": "OUT"}}', '{}', '{}', 2),
  ('Limited Series', 'One season with an ending.', 'tv', 'teleplay',
    '{"delivery": {"label": "Released", "abbr": "OUT"}}', '{}', '{}', 3),
  ('Web Series', 'Short episodes made for online release.', 'globe', 'teleplay',
    '{"delivery": {"label": "Released", "abbr": "OUT"}}', '{}', '{}', 4),
  ('Music Video', 'A treatment, a shoot day or two, and the edit.', 'music', 'treatment',
    '{"production": {"label": "Shoot", "abbr": "SHOOT"}, "post-production": {"label": "Edit", "abbr": "EDIT"}, "delivery": {"label": "Released", "abbr": "OUT"}}',
    '{pre-production}', '{}', 5),
  ('Documentary', 'Real people and places, shaped in the edit.', 'video', 'doc-outline', '{}', '{}', '{characters,casting}', 6),
  ('Commercial', 'A brief, a shoot and a delivery date.', 'megaphone', 'treatment',
    '{"production": {"label": "Shoot", "abbr": "SHOOT"}, "delivery": {"label": "Delivered", "abbr": "OUT"}}', '{}', '{festival}', 7),
  ('Podcast', 'Episodes planned, recorded and edited — no shoot.', 'mic', 'podcast',
    '{"development": {"label": "Planning", "abbr": "PLAN"}, "production": {"label": "Recording", "abbr": "REC"}, "post-production": {"label": "Editing", "abbr": "EDIT"}, "delivery": {"label": "Published", "abbr": "OUT"}}',
    '{pre-production}', '{characters,casting,shots,schedule,wrap-first,wrap-all,festival}', 8),
  ('Other', 'Anything else: the standard five phases.', 'sparkles', 'screenplay', '{}', '{}', '{}', 9);

-- ── Projects: the format a project is made in ──────────────────────────────
-- Only rows whose value changes, so no project's updated_at moves for nothing.
UPDATE public.projects p SET project_type = m.name
FROM (select p2.id, coalesce((select f.name from public.project_formats f
                              where lower(f.name) = lower(btrim(p2.project_type))), 'Other') as name
      from public.projects p2) m
WHERE m.id = p.id AND p.project_type IS DISTINCT FROM m.name;
ALTER TABLE public.projects ADD CONSTRAINT projects_project_type_fkey
  FOREIGN KEY (project_type) REFERENCES public.project_formats(name) ON UPDATE CASCADE;
CREATE INDEX projects_project_type_idx ON public.projects USING btree (project_type);

-- ── Portfolio: the format of a finished piece ──────────────────────────────
UPDATE public.portfolio_projects pp SET category = m.name
FROM (select p2.id, coalesce((select f.name from public.project_formats f
                              where lower(f.name) = lower(btrim(p2.category))), 'Other') as name
      from public.portfolio_projects p2 where p2.category is not null) m
WHERE m.id = pp.id AND pp.category IS DISTINCT FROM m.name;
ALTER TABLE public.portfolio_projects ADD CONSTRAINT portfolio_projects_category_fkey
  FOREIGN KEY (category) REFERENCES public.project_formats(name) ON UPDATE CASCADE ON DELETE SET NULL;
CREATE INDEX portfolio_projects_category_idx ON public.portfolio_projects USING btree (category);

-- ── The phase engine reads the format's rules with the counts ──────────────
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
