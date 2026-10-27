-- Phase gates (spec: .cavern-intelligence/plans/2026-10-27-guest-review-and-phases.md, D3).
--
-- The phase engine already exists (lib/os/phases.ts: five phases, renamed or
-- skipped per project format, stored in projects.status). What this adds is the
-- gate: leaving a phase, the owner decides for the library what carries forward
-- and what is archived. Archiving is never destructive — an archived item is
-- kept, hidden from the library by default, taken off the public share link,
-- and can be restored. (Removing an item stays the library's own delete.)
--
--   media.lifecycle   'working' | 'archived'. Changed by people who shape the
--                     project (a trigger refuses anyone else) or by advance_phase.
--   phase_gates       a record of each gate passed: who, when, from/to, counts.
--   advance_phase()   owner only: applies the decisions and moves the phase in
--                     one transaction.

ALTER TABLE public.media
  ADD COLUMN lifecycle text NOT NULL DEFAULT 'working' CHECK (lifecycle IN ('working', 'archived'));
CREATE INDEX media_lifecycle_idx ON public.media (project_id) WHERE lifecycle = 'archived';

-- Today any project member can update a media row; archiving is for shapers.
CREATE FUNCTION internal.media_lifecycle_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.lifecycle is distinct from old.lifecycle
     and (select auth.uid()) is not null
     and not internal.can_shape_project(new.project_id) then
    raise exception 'Only people who shape the project can archive or restore library items' using errcode = '42501';
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.media_lifecycle_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER media_lifecycle_guard BEFORE UPDATE OF lifecycle ON public.media
  FOR EACH ROW EXECUTE FUNCTION internal.media_lifecycle_guard();

CREATE TABLE public.phase_gates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  from_status text NOT NULL,
  to_status text NOT NULL,
  carried integer NOT NULL DEFAULT 0,
  archived integer NOT NULL DEFAULT 0,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  decided_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX phase_gates_project_idx ON public.phase_gates (project_id, decided_at DESC);
CREATE INDEX phase_gates_decided_by_idx ON public.phase_gates (decided_by);

ALTER TABLE public.phase_gates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phase gates read" ON public.phase_gates FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id));
REVOKE ALL ON public.phase_gates FROM anon, authenticated;
GRANT SELECT ON public.phase_gates TO authenticated;

-- decisions: [{ "id": <media id>, "action": "carry" | "archive" }, …]. Items not
-- listed carry forward. Archiving also takes the item off the public share link.
CREATE FUNCTION public.advance_phase(p_project uuid, p_to text, p_decisions jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  from_status text;
  d jsonb;
  archived_n integer := 0;
  carried_n integer := 0;
  hit integer;
begin
  if not internal.is_project_creator(p_project) then
    raise exception 'Only the project owner can pass a phase gate' using errcode = '42501';
  end if;
  if p_to not in ('concept', 'pre-production', 'production', 'post-production', 'completed') then
    raise exception 'Unknown phase' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_decisions, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_decisions, '[]'::jsonb)) > 1000 then
    raise exception 'Decisions must be a list of at most 1000' using errcode = '22023';
  end if;
  select status into from_status from public.projects where id = p_project;

  for d in select * from jsonb_array_elements(coalesce(p_decisions, '[]'::jsonb)) loop
    if d->>'action' = 'archive' then
      update public.media set lifecycle = 'archived', shared = false
       where id = (d->>'id')::uuid and project_id = p_project and lifecycle = 'working';
      get diagnostics hit = row_count;
      archived_n := archived_n + hit;
    elsif d->>'action' = 'carry' then
      carried_n := carried_n + 1;
    else
      raise exception 'Each decision must be carry or archive' using errcode = '22023';
    end if;
  end loop;

  update public.projects set status = p_to where id = p_project;
  insert into public.phase_gates (project_id, from_status, to_status, carried, archived)
  values (p_project, coalesce(from_status, ''), p_to, carried_n, archived_n);
  return jsonb_build_object('archived', archived_n, 'carried', carried_n);
end;
$function$;
REVOKE ALL ON FUNCTION public.advance_phase(uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.advance_phase(uuid, text, jsonb) TO authenticated, service_role;
