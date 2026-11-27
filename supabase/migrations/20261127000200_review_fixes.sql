-- Three fixes from the 2026-11-27 review of the merges since 1 November.
--
-- 1. Casting candidates are written by whoever holds casting.decide, like the castings themselves
--    (20261114000100): the Casting Board offers the shortlist controls to that capability, but the
--    policies only let the project creator write, so crew with casting.decide got refusals.
-- 2. The over-budget alert is re-armed when its notification fails, instead of staying marked as sent.
-- 3. A fringe's created_by must be the person adding it (or empty), like schedule_versions.

DROP POLICY "casting_candidates_insert" ON public.casting_candidates;
DROP POLICY "casting_candidates_update" ON public.casting_candidates;
DROP POLICY "casting_candidates_delete" ON public.casting_candidates;
CREATE POLICY "casting_candidates_insert" ON public.casting_candidates
  FOR INSERT TO authenticated WITH CHECK (internal.has_capability(project_id, 'casting.decide'));
CREATE POLICY "casting_candidates_update" ON public.casting_candidates
  FOR UPDATE TO authenticated USING (internal.has_capability(project_id, 'casting.decide')) WITH CHECK (internal.has_capability(project_id, 'casting.decide'));
CREATE POLICY "casting_candidates_delete" ON public.casting_candidates
  FOR DELETE TO authenticated USING (internal.has_capability(project_id, 'casting.decide'));

CREATE OR REPLACE FUNCTION internal.budget_check_over(p_project uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  planned numeric;
  spent numeric;
  titled text;
begin
  -- A project being deleted cascades its lines and spend through here; there is nothing left to alert about.
  if not exists (select 1 from public.projects p where p.id = p_project) then return; end if;
  select coalesce(sum(b.amount + b.fringe_amount), 0) into planned from public.budget_items b where b.project_id = p_project;
  select coalesce(sum(e.amount), 0) into spent from public.expenses e where e.project_id = p_project;
  insert into public.budget_alerts (project_id) values (p_project) on conflict (project_id) do nothing;

  if planned > 0 and spent > planned then
    -- Atomic: only the statement that flips armed -> alerted sees a row back, so two racing writes notify once.
    update public.budget_alerts set alerted = true, alerted_at = now() where project_id = p_project and not alerted;
    if not found then return; end if;
    select p.title into titled from public.projects p where p.id = p_project;
    begin
    insert into public.notifications (user_id, type, title, body, link, created_by)
    select distinct r.uid, 'budget',
           'Over budget: ' || left(coalesce(titled, 'a project'), 120),
           'Committed and paid spend has passed the planned budget. Open Money for the figures.',
           '/studio?project=' || p_project::text || '&tab=production&view=money',
           null::uuid
    from (
      select p.creator_id as uid from public.projects p where p.id = p_project and p.creator_id is not null
      union
      -- Everyone who holds budget.write: the same rule as internal.has_capability, for each crew member rather than the caller.
      select pc.user_id
      from public.project_crew pc
      join public.projects p on p.id = pc.project_id
      join public.capabilities k on k.key = 'budget.write'
      where pc.project_id = p_project
        and pc.user_id is not null
        and coalesce(pc.status, 'confirmed') = 'confirmed'
        and p.visibility <> 'private'
        and (not k.edits or pc.role in ('lead', 'contributor'))
        and coalesce(
              (select o.granted from public.crew_capability_overrides o
                where o.project_id = pc.project_id and o.user_id = pc.user_id and o.capability = 'budget.write'),
              exists (
                select 1 from public.craft_capabilities cc
                where cc.capability = 'budget.write'
                  and (cc.craft = pc.craft
                       or cc.craft in (select x.craft from public.project_crew_crafts x
                                        where x.project_id = pc.project_id and x.user_id = pc.user_id))
              )
            )
    ) r;
    exception when others then
      -- An alert must never block the money write that caused it. But it must not be lost either: the flag was set above, so
      -- put it back, and the next money write tries the notification again instead of staying silent until spend drops.
      update public.budget_alerts set alerted = false, alerted_at = null where project_id = p_project;
    end;
  else
    -- Back at or under the plan (or no plan): re-arm, so the next crossing notifies again.
    update public.budget_alerts set alerted = false, alerted_at = null where project_id = p_project and alerted;
  end if;
end;
$function$;
REVOKE ALL ON FUNCTION internal.budget_check_over(uuid) FROM PUBLIC, anon, authenticated;

DROP POLICY "budget fringes add" ON public.budget_fringes;
CREATE POLICY "budget fringes add" ON public.budget_fringes FOR INSERT TO authenticated
  WITH CHECK (internal.can_shape_project(project_id) AND internal.has_capability(project_id, 'budget.write')
              AND (created_by IS NULL OR created_by = (select auth.uid())));
