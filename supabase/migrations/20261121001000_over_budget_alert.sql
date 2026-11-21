-- Money: tell the people who run the budget when spend first goes over the plan.
--
-- When a project's committed + paid spend (every `expenses` row, whatever its status) first exceeds its planned budget (the sum of its
-- `budget_items.amount`, only when that is above zero), the owner and everyone who holds `budget.write` there get one in-app
-- notification linking to Studio > Production > Money. "Once per crossing": `public.budget_alerts` holds one armed/alerted flag per
-- project; the flag is set by the crossing and re-armed when spend drops back to or under the plan (or the plan is removed), so the
-- next crossing notifies again. Labour from timesheets is not in this figure (it is in the Money view's cash flow).
--
-- The text carries no amounts (an override can grant budget.write without budget.read); the figures are in Money. A failed
-- notification is swallowed: the expense or budget line being written always succeeds.
--
-- Cheap by construction: row-level triggers on expenses (insert, delete, or an update that touches amount, status or project) and on
-- budget_items (insert, delete, or an update of amount or project) each run two indexed sums for one project.
--
-- The state table has RLS on and no policies and no grants: only the definer trigger function (owner, bypasses RLS) reads or writes it.
-- The trigger function is SECURITY DEFINER in `internal` (no grants, not callable through the API) because the actor who spends
-- cannot insert notifications for someone else and the recipients' capabilities have to be read for them, not for the caller.

CREATE TABLE public.budget_alerts (
  project_id uuid NOT NULL,
  alerted boolean DEFAULT false NOT NULL,
  alerted_at timestamp with time zone,
  CONSTRAINT budget_alerts_pkey PRIMARY KEY (project_id),
  CONSTRAINT budget_alerts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.budget_alerts FROM PUBLIC, anon, authenticated;

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
  select coalesce(sum(b.amount), 0) into planned from public.budget_items b where b.project_id = p_project;
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
      -- An alert must never block the money write that caused it.
      null;
    end;
  else
    -- Back at or under the plan (or no plan): re-arm, so the next crossing notifies again.
    update public.budget_alerts set alerted = false, alerted_at = null where project_id = p_project and alerted;
  end if;
end;
$function$;
REVOKE ALL ON FUNCTION internal.budget_check_over(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION internal.budget_over_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'DELETE' then
    perform internal.budget_check_over(old.project_id);
  else
    perform internal.budget_check_over(new.project_id);
    if tg_op = 'UPDATE' and old.project_id is distinct from new.project_id then
      perform internal.budget_check_over(old.project_id);
    end if;
  end if;
  return null;
end;
$function$;
REVOKE ALL ON FUNCTION internal.budget_over_trigger() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER expenses_budget_over AFTER INSERT OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION internal.budget_over_trigger();
CREATE TRIGGER expenses_budget_over_upd AFTER UPDATE OF amount, status, project_id ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION internal.budget_over_trigger();
CREATE TRIGGER budget_items_over AFTER INSERT OR DELETE ON public.budget_items
  FOR EACH ROW EXECUTE FUNCTION internal.budget_over_trigger();
CREATE TRIGGER budget_items_over_upd AFTER UPDATE OF amount, project_id ON public.budget_items
  FOR EACH ROW EXECUTE FUNCTION internal.budget_over_trigger();
