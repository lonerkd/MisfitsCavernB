-- Client-approval gates (plan: .cavern-intelligence/plans/2026-10-27-guest-review-and-phases.md).
--
-- A format can say which phases cannot be left until the client has approved the
-- work: project_formats.approval_gates. Then no path — the phase buttons, the
-- gate dialog, the projects board — can move the project's phase forward past
-- one of them until, for every script that has been sent for review, its latest
-- sent version is approved by the client AND confirmed by the team (and at
-- least one version has been sent). Moving back is never blocked. A format with
-- no gates behaves as before. Also adds two formats for advertising and copy.

ALTER TABLE public.project_formats
  ADD COLUMN approval_gates text[] NOT NULL DEFAULT '{}'::text[]
  CONSTRAINT project_formats_approval_gates_check
    CHECK (approval_gates <@ ARRAY['development', 'pre-production', 'production', 'post-production']);

-- How many things the client still owes: scripts whose latest sent version is not
-- approved and confirmed, or 1 when nothing has been sent at all.
CREATE FUNCTION internal.approval_pending(p_project uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with latest as (
    select distinct on (script_id) script_id, guest_decision, confirmed_at
    from public.item_versions
    where project_id = p_project and status = 'sent'
    order by script_id, number desc
  )
  select case when count(*) = 0 then 1
              else (count(*) filter (where guest_decision is distinct from 'approved' or confirmed_at is null))::integer
         end
  from latest;
$function$;
REVOKE ALL ON FUNCTION internal.approval_pending(uuid) FROM PUBLIC, anon, authenticated;

-- projects.status → the phase's rank (0 development … 4 delivery).
CREATE FUNCTION internal.phase_rank(p_status text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case p_status
    when 'concept' then 0
    when 'pre-prod' then 1 when 'pre-production' then 1
    when 'production' then 2 when 'in-production' then 2
    when 'post' then 3 when 'post-production' then 3
    when 'released' then 4 when 'completed' then 4 when 'delivery' then 4
    else 0 end;
$function$;
REVOKE ALL ON FUNCTION internal.phase_rank(text) FROM PUBLIC, anon, authenticated;

-- Definer: the person moving the phase cannot call the internal helpers themselves.
CREATE FUNCTION internal.projects_approval_gate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  gates text[];
  from_rank integer;
  to_rank integer;
begin
  -- System updates (migrations, the service role) are not people passing a gate.
  if (select auth.uid()) is null or new.status is not distinct from old.status then
    return new;
  end if;
  from_rank := internal.phase_rank(old.status);
  to_rank := internal.phase_rank(new.status);
  if to_rank <= from_rank then
    return new;
  end if;
  select f.approval_gates into gates from public.project_formats f where f.name = new.project_type;
  if gates is null or cardinality(gates) = 0 then
    return new;
  end if;
  -- Any gated phase the move leaves (from_rank <= gate < to_rank) needs the approval.
  if exists (
    select 1 from unnest(gates) g
    where (case g when 'development' then 0 when 'pre-production' then 1 when 'production' then 2 else 3 end) >= from_rank
      and (case g when 'development' then 0 when 'pre-production' then 1 when 'production' then 2 else 3 end) < to_rank
  ) and internal.approval_pending(new.id) > 0 then
    raise exception 'The client has not approved this yet' using errcode = '55000';
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.projects_approval_gate() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER projects_approval_gate BEFORE UPDATE OF status ON public.projects
  FOR EACH ROW EXECUTE FUNCTION internal.projects_approval_gate();

-- Advertising and copy: the client signs off the concept and copy before the work goes on.
UPDATE public.project_formats SET position = 12 WHERE name = 'Other';
INSERT INTO public.project_formats (name, blurb, icon, script_format, phase_labels, skip_phases, skip_milestones, approval_gates, position) VALUES
  ('Advertising', 'A campaign: brief, concept and copy, client sign-off, production, delivery.', 'megaphone', 'treatment',
    '{"development": {"label": "Brief", "abbr": "BRIEF"}, "pre-production": {"label": "Concept & copy", "abbr": "COPY"}, "post-production": {"label": "Finishing", "abbr": "FIN"}, "delivery": {"label": "Delivered", "abbr": "OUT"}}',
    '{}', '{festival}', '{pre-production}', 10),
  ('Copywriting', 'Words for a client: brief, drafts, approval, delivery.', 'sparkles', 'treatment',
    '{"development": {"label": "Brief", "abbr": "BRIEF"}, "pre-production": {"label": "Drafting", "abbr": "DRAFT"}, "delivery": {"label": "Delivered", "abbr": "OUT"}}',
    '{production,post-production}', '{characters,casting,shots,schedule,wrap-first,wrap-all,festival}', '{pre-production}', 11);
