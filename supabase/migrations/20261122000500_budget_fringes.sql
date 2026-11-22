-- Budget depth (competitor parity gap 3): fringes and per diems. A MECHANISM, not a rate book: no union table ships, the project types its own rates.
--
-- FRINGES. `budget_fringes` is a project's own named list (name, percent, an optional cap per line, in money). `budget_item_fringes` links a
-- fringe to a budget line. Chosen over a jsonb column on the line because the link is checked by the database: a composite foreign key keeps
-- the line and the fringe in the same project, a deleted fringe or line takes its links with it, and a fringe's rate is one row, not a copy per line.
--
-- `budget_items.amount` STAYS THE BASE (what every existing reader, import and template already writes). The new `fringe_amount` is the
-- fringe on that base, kept by the database (a BEFORE trigger recomputes it on every write; the client can never set it), so a line's
-- cost is `amount + fringe_amount`. A project with no fringes has `fringe_amount = 0` everywhere and every figure is what it was.
--   one fringe on a line = least(round(amount * percent / 100, 2), cap_per_line when there is a cap)
--   fringe_amount        = the sum of the line's fringes, in cents
--
-- PER DIEMS. `kind = 'per_diem'` lines carry days, a daily rate and people; the database sets `amount = round(days * rate * people, 2)`
-- whatever the client sent. Fringes can be applied to one too (they are a line like any other).
--
-- THE ALERT. `internal.budget_check_over` and the approval stamp now read `amount + fringe_amount`; the alert's triggers also fire when a
-- fringe moves (`fringe_amount`) or a per diem's factors change.
--
-- ACCESS. Read: anyone with `budget.read` on the project (the owner included), like the lines. Write: `can_shape_project` (the owner and lead or
-- contributor crew) who also hold `budget.write` (a designer who shapes the project but cannot write the budget cannot touch it). Outsiders: nothing. One SELECT policy per table.

ALTER TABLE public.budget_items
  ADD COLUMN IF NOT EXISTS fringe_amount numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'line',
  ADD COLUMN IF NOT EXISTS pd_days numeric(8, 2),
  ADD COLUMN IF NOT EXISTS pd_rate numeric(12, 2),
  ADD COLUMN IF NOT EXISTS pd_people numeric(8, 2);
ALTER TABLE public.budget_items
  ADD CONSTRAINT budget_items_kind_check CHECK (kind IN ('line', 'per_diem')),
  ADD CONSTRAINT budget_items_per_diem_check CHECK (
    kind = 'line' OR (pd_days IS NOT NULL AND pd_rate IS NOT NULL AND pd_people IS NOT NULL AND pd_days >= 0 AND pd_rate >= 0 AND pd_people >= 0)
  );

CREATE TABLE public.budget_fringes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid NOT NULL,
  name text NOT NULL,
  percent numeric(7, 3) NOT NULL,
  cap_per_line numeric(12, 2),
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT budget_fringes_pkey PRIMARY KEY (id),
  CONSTRAINT budget_fringes_id_project_key UNIQUE (id, project_id),
  CONSTRAINT budget_fringes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT budget_fringes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT budget_fringes_name_check CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  CONSTRAINT budget_fringes_percent_check CHECK (percent >= 0 AND percent <= 100),
  CONSTRAINT budget_fringes_cap_check CHECK (cap_per_line IS NULL OR cap_per_line >= 0)
);
CREATE UNIQUE INDEX budget_fringes_name_key ON public.budget_fringes (project_id, lower(btrim(name)));
CREATE INDEX budget_fringes_created_by_idx ON public.budget_fringes (created_by);

CREATE TABLE public.budget_item_fringes (
  budget_item_id uuid NOT NULL,
  fringe_id uuid NOT NULL,
  project_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT budget_item_fringes_pkey PRIMARY KEY (budget_item_id, fringe_id),
  CONSTRAINT budget_item_fringes_item_fkey FOREIGN KEY (budget_item_id, project_id) REFERENCES public.budget_items(id, project_id) ON DELETE CASCADE,
  CONSTRAINT budget_item_fringes_fringe_fkey FOREIGN KEY (fringe_id, project_id) REFERENCES public.budget_fringes(id, project_id) ON DELETE CASCADE
);
CREATE INDEX budget_item_fringes_fringe_idx ON public.budget_item_fringes (fringe_id, project_id);
CREATE INDEX budget_item_fringes_item_idx ON public.budget_item_fringes (budget_item_id, project_id);

ALTER TABLE public.budget_fringes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_item_fringes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget fringes read" ON public.budget_fringes FOR SELECT TO authenticated USING (internal.has_capability(project_id, 'budget.read'));
CREATE POLICY "budget fringes add" ON public.budget_fringes FOR INSERT TO authenticated WITH CHECK (internal.can_shape_project(project_id) AND internal.has_capability(project_id, 'budget.write'));
CREATE POLICY "budget fringes change" ON public.budget_fringes FOR UPDATE TO authenticated
  USING (internal.can_shape_project(project_id) AND internal.has_capability(project_id, 'budget.write')) WITH CHECK (internal.can_shape_project(project_id) AND internal.has_capability(project_id, 'budget.write'));
CREATE POLICY "budget fringes remove" ON public.budget_fringes FOR DELETE TO authenticated USING (internal.can_shape_project(project_id) AND internal.has_capability(project_id, 'budget.write'));

CREATE POLICY "budget item fringes read" ON public.budget_item_fringes FOR SELECT TO authenticated USING (internal.has_capability(project_id, 'budget.read'));
CREATE POLICY "budget item fringes add" ON public.budget_item_fringes FOR INSERT TO authenticated WITH CHECK (internal.can_shape_project(project_id) AND internal.has_capability(project_id, 'budget.write'));
CREATE POLICY "budget item fringes remove" ON public.budget_item_fringes FOR DELETE TO authenticated USING (internal.can_shape_project(project_id) AND internal.has_capability(project_id, 'budget.write'));

-- The fringe on one line, from its links. A definer helper in `internal` (no grants) so the line's BEFORE trigger can read the links
-- whoever is writing the line.
CREATE OR REPLACE FUNCTION internal.budget_fringe_for(p_item uuid, p_amount numeric)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(sum(least(r.raw, coalesce(f.cap_per_line, r.raw))), 0)::numeric(12, 2)
  from public.budget_item_fringes l
  join public.budget_fringes f on f.id = l.fringe_id
  cross join lateral (select round(coalesce(p_amount, 0) * f.percent / 100, 2) as raw) r
  where l.budget_item_id = p_item;
$function$;
REVOKE ALL ON FUNCTION internal.budget_fringe_for(uuid, numeric) FROM PUBLIC, anon, authenticated;

-- Every write to a line: a per diem's amount is its days x rate x people, and the fringe is recomputed (a new line has no links yet).
CREATE OR REPLACE FUNCTION internal.budget_items_derive()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.kind = 'per_diem' then
    new.amount := round(coalesce(new.pd_days, 0) * coalesce(new.pd_rate, 0) * coalesce(new.pd_people, 0), 2);
  end if;
  if tg_op = 'INSERT' then
    new.fringe_amount := 0;
  else
    new.fringe_amount := internal.budget_fringe_for(new.id, new.amount);
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.budget_items_derive() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER budget_items_derive BEFORE INSERT OR UPDATE ON public.budget_items
  FOR EACH ROW EXECUTE FUNCTION internal.budget_items_derive();

-- A fringe applied to or taken off a line: touch the line so its BEFORE trigger recomputes (and the alert's AFTER trigger runs).
CREATE OR REPLACE FUNCTION internal.budget_item_fringes_touch()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.budget_items set fringe_amount = 0 where id = coalesce(new.budget_item_id, old.budget_item_id);
  return null;
end;
$function$;
REVOKE ALL ON FUNCTION internal.budget_item_fringes_touch() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER budget_item_fringes_touch AFTER INSERT OR DELETE ON public.budget_item_fringes
  FOR EACH ROW EXECUTE FUNCTION internal.budget_item_fringes_touch();

-- A fringe's rate or cap changed: every line that carries it is recomputed.
CREATE OR REPLACE FUNCTION internal.budget_fringes_retouch()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.budget_items set fringe_amount = 0
   where id in (select l.budget_item_id from public.budget_item_fringes l where l.fringe_id = new.id);
  return null;
end;
$function$;
REVOKE ALL ON FUNCTION internal.budget_fringes_retouch() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER budget_fringes_retouch AFTER UPDATE OF percent, cap_per_line ON public.budget_fringes
  FOR EACH ROW EXECUTE FUNCTION internal.budget_fringes_retouch();

-- The over-budget alert: the plan is every line's base plus its fringe.
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

-- The alert also runs when a line's fringe moves or a per diem's factors change.
DROP TRIGGER IF EXISTS budget_items_over_upd ON public.budget_items;
CREATE TRIGGER budget_items_over_upd AFTER UPDATE OF amount, fringe_amount, kind, pd_days, pd_rate, pd_people, project_id ON public.budget_items
  FOR EACH ROW EXECUTE FUNCTION internal.budget_over_trigger();

-- The approval stamp takes the fringed total.
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
      select coalesce(sum(b.amount + b.fringe_amount), 0), count(*)::int
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
