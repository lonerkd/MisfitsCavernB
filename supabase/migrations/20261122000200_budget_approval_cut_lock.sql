-- BACKLOG 3.52 (owner decisions 2026-11-22): a budget is approved by the owner's button, and a cut can be locked, which freezes it.
--
-- BUDGET APPROVAL. projects gains budget_approved_at / _by and what the budget was when it was approved (its total and line count), so
-- the Money tool can say "changed since approved". Only the project's creator can update a project row (its existing policy); the
-- trigger below takes the stamp, the person and the figures from the database, never from the client, and clears them together.
--
-- CUT LOCK. post_cuts gains locked_at / locked_by. Locking and unlocking are the project creator's alone. A locked cut cannot be edited
-- or deleted (a delete that comes from deleting the whole project still goes through), and takes no new note: notes go on the next cut.
-- Resolving an existing note stays possible.
--
-- project_progress gains budget_approved and cuts_locked, the signals for the two milestones.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS budget_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS budget_approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS budget_approved_total numeric(14, 2),
  ADD COLUMN IF NOT EXISTS budget_approved_lines integer;
CREATE INDEX IF NOT EXISTS projects_budget_approved_by_idx ON public.projects (budget_approved_by);

CREATE OR REPLACE FUNCTION internal.projects_budget_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' then
    -- A new project starts unapproved, whatever the client sends.
    new.budget_approved_at := null;
    new.budget_approved_by := null;
    new.budget_approved_total := null;
    new.budget_approved_lines := null;
    return new;
  end if;
  if new.budget_approved_at is distinct from old.budget_approved_at then
    if new.budget_approved_at is null then
      new.budget_approved_by := null;
      new.budget_approved_total := null;
      new.budget_approved_lines := null;
    else
      new.budget_approved_at := now();
      new.budget_approved_by := (select auth.uid());
      select coalesce(sum(b.amount), 0), count(*)::int
        into new.budget_approved_total, new.budget_approved_lines
        from public.budget_items b where b.project_id = new.id;
    end if;
  else
    -- Nothing else changes who approved it, when, or what was approved.
    new.budget_approved_by := old.budget_approved_by;
    new.budget_approved_total := old.budget_approved_total;
    new.budget_approved_lines := old.budget_approved_lines;
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.projects_budget_approval() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS projects_budget_approval ON public.projects;
CREATE TRIGGER projects_budget_approval BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION internal.projects_budget_approval();

ALTER TABLE public.post_cuts
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS post_cuts_locked_by_idx ON public.post_cuts (locked_by);

CREATE OR REPLACE FUNCTION internal.post_cuts_lock_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'DELETE' then
    -- (The owner check is written out, not called through internal.is_project_creator: an invoker trigger body cannot reach the internal schema.)
    -- A locked cut stays; deleting the project (a cascade, one trigger level down) takes it with the rest.
    if old.locked_at is not null and pg_trigger_depth() <= 1 then
      raise exception 'This cut is locked. Unlock it first.' using errcode = '42501';
    end if;
    return old;
  end if;

  if old.locked_at is not null then
    -- Locked: the only change allowed is the owner unlocking it, with nothing else touched.
    if new.locked_at is null and exists (select 1 from public.projects pr where pr.id = old.project_id and pr.creator_id = (select auth.uid()))
       and new.title is not distinct from old.title and new.url is not distinct from old.url
       and new.media_id is not distinct from old.media_id then
      new.locked_by := null;
      return new;
    end if;
    raise exception 'This cut is locked. Unlock it first.' using errcode = '42501';
  end if;

  if new.locked_at is not null then
    if not exists (select 1 from public.projects pr where pr.id = old.project_id and pr.creator_id = (select auth.uid())) then
      raise exception 'Only the project owner can lock a cut.' using errcode = '42501';
    end if;
    new.locked_at := now();
    new.locked_by := (select auth.uid());
  else
    new.locked_by := null;
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.post_cuts_lock_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS post_cuts_lock_guard ON public.post_cuts;
CREATE TRIGGER post_cuts_lock_guard BEFORE UPDATE OR DELETE ON public.post_cuts
  FOR EACH ROW EXECUTE FUNCTION internal.post_cuts_lock_guard();

CREATE OR REPLACE FUNCTION internal.post_notes_lock_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if exists (select 1 from public.post_cuts c where c.id = new.cut_id and c.locked_at is not null) then
    raise exception 'This cut is locked. Put the note on the next cut.' using errcode = '42501';
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.post_notes_lock_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS post_notes_lock_guard ON public.post_notes;
CREATE TRIGGER post_notes_lock_guard BEFORE INSERT ON public.post_notes
  FOR EACH ROW EXECUTE FUNCTION internal.post_notes_lock_guard();

-- project_progress: the two new signals (same function, same privileges, still SECURITY INVOKER).
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
    'budget_approved', (p.budget_approved_at is not null),
    'cuts_locked', (select count(*) from public.post_cuts pc2 where pc2.project_id = p.id and pc2.locked_at is not null),
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

-- A format that skips the budget or the cut skips their new milestones too (hidden, not deleted), like the ones they already skip.
UPDATE public.project_formats SET skip_milestones = (SELECT array_agg(DISTINCT m) FROM unnest(skip_milestones || ARRAY['budget-approved']) m)
 WHERE 'budget' = ANY (skip_milestones);
UPDATE public.project_formats SET skip_milestones = (SELECT array_agg(DISTINCT m) FROM unnest(skip_milestones || ARRAY['cut-locked']) m)
 WHERE 'cut' = ANY (skip_milestones);
