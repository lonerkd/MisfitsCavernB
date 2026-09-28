-- Money: who you pay, what's committed and paid, and the crew's hours.
--
-- vendors      who the production pays (rentals, locations, catering…)
-- expenses     a spend line: committed (a purchase order is out) or paid,
--              against a budget line and a vendor, with a receipt from the
--              library if there is one. Paid lines keep the budget line's
--              actual_cost in step, so the project page's budget agrees.
-- timesheets   a crew member's hours for a day; the owner and leads approve
--              them (and set the rate), which makes them labour cost.
--
-- Spend and vendors are for the people who shape the project (owner, leads,
-- contributors). Everyone on the production logs and sees their own hours.

ALTER TABLE public.budget_items ADD CONSTRAINT budget_items_id_project_key UNIQUE (id, project_id);

CREATE TABLE public.vendors (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid NOT NULL,
  name text NOT NULL,
  category text,
  contact text,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT vendors_pkey PRIMARY KEY (id),
  CONSTRAINT vendors_id_project_key UNIQUE (id, project_id),
  CONSTRAINT vendors_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT vendors_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT vendors_name_check CHECK (char_length(btrim(name)) BETWEEN 1 AND 200),
  CONSTRAINT vendors_text_len CHECK (char_length(category) <= 60 AND char_length(contact) <= 300 AND char_length(notes) <= 2000)
);
CREATE UNIQUE INDEX vendors_project_name_idx ON public.vendors USING btree (project_id, lower(btrim(name)));
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendors shapers" ON public.vendors FOR ALL TO authenticated
  USING (internal.can_shape_project(project_id)) WITH CHECK (internal.can_shape_project(project_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
REVOKE ALL ON public.vendors FROM anon;

CREATE TABLE public.expenses (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid NOT NULL,
  budget_item_id uuid,
  vendor_id uuid,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL,
  status text DEFAULT 'committed' NOT NULL,
  po_number text,
  spent_on date DEFAULT CURRENT_DATE NOT NULL,
  receipt_media_id uuid,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  paid_at timestamp with time zone,
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT expenses_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT expenses_budget_item_fkey FOREIGN KEY (budget_item_id, project_id) REFERENCES public.budget_items(id, project_id) ON DELETE SET NULL (budget_item_id),
  CONSTRAINT expenses_vendor_fkey FOREIGN KEY (vendor_id, project_id) REFERENCES public.vendors(id, project_id) ON DELETE SET NULL (vendor_id),
  CONSTRAINT expenses_receipt_fkey FOREIGN KEY (receipt_media_id) REFERENCES public.media(id) ON DELETE SET NULL,
  CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT expenses_description_check CHECK (char_length(btrim(description)) BETWEEN 1 AND 300),
  CONSTRAINT expenses_amount_check CHECK (amount >= 0 AND amount < 100000000),
  CONSTRAINT expenses_status_check CHECK (status IN ('committed', 'paid')),
  CONSTRAINT expenses_po_len CHECK (char_length(po_number) <= 40),
  CONSTRAINT expenses_paid_shape CHECK ((status = 'paid') = (paid_at IS NOT NULL))
);
CREATE INDEX expenses_project_idx ON public.expenses USING btree (project_id);
CREATE INDEX expenses_budget_item_idx ON public.expenses USING btree (budget_item_id);
CREATE INDEX expenses_vendor_idx ON public.expenses USING btree (vendor_id);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses shapers" ON public.expenses FOR ALL TO authenticated
  USING (internal.can_shape_project(project_id)) WITH CHECK (internal.can_shape_project(project_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
REVOKE ALL ON public.expenses FROM anon;

-- The receipt must be this project's media; paid_at follows the status.
CREATE FUNCTION internal.expenses_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.receipt_media_id is not null
     and not exists (select 1 from public.media m where m.id = new.receipt_media_id and m.project_id = new.project_id) then
    raise exception 'The receipt must be in this project''s library' using errcode = '23503';
  end if;
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    new.paid_at := now();
  elsif new.status <> 'paid' then
    new.paid_at := null;
  end if;
  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.expenses_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER expenses_guard BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION internal.expenses_guard();

-- A budget line's actual cost is what's been paid against it, once anything has.
CREATE FUNCTION internal.sync_budget_actual(p_line uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  update public.budget_items b
     set actual_cost = (select sum(e.amount) from public.expenses e where e.budget_item_id = p_line and e.status = 'paid'),
         updated_at = now()
   where b.id = p_line
     and exists (select 1 from public.expenses e where e.budget_item_id = p_line);
$function$;
REVOKE ALL ON FUNCTION internal.sync_budget_actual(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION internal.expenses_sync_actuals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op <> 'DELETE' and new.budget_item_id is not null then
    perform internal.sync_budget_actual(new.budget_item_id);
  end if;
  if tg_op <> 'INSERT' and old.budget_item_id is not null
     and (tg_op = 'DELETE' or old.budget_item_id is distinct from new.budget_item_id) then
    perform internal.sync_budget_actual(old.budget_item_id);
  end if;
  return null;
end;
$function$;
REVOKE ALL ON FUNCTION internal.expenses_sync_actuals() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER expenses_sync_actuals AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION internal.expenses_sync_actuals();

CREATE TABLE public.timesheets (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid NOT NULL,
  user_id uuid DEFAULT auth.uid() NOT NULL,
  work_date date NOT NULL,
  hours numeric(4,2) NOT NULL,
  rate numeric(10,2),
  note text,
  status text DEFAULT 'submitted' NOT NULL,
  decided_by uuid,
  decided_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT timesheets_pkey PRIMARY KEY (id),
  CONSTRAINT timesheets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT timesheets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT timesheets_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT timesheets_day_key UNIQUE (project_id, user_id, work_date),
  CONSTRAINT timesheets_hours_check CHECK (hours > 0 AND hours <= 24),
  CONSTRAINT timesheets_rate_check CHECK (rate IS NULL OR rate >= 0),
  CONSTRAINT timesheets_note_len CHECK (char_length(note) <= 500),
  CONSTRAINT timesheets_status_check CHECK (status IN ('submitted', 'approved', 'rejected'))
);
CREATE INDEX timesheets_project_idx ON public.timesheets USING btree (project_id);
CREATE INDEX timesheets_user_idx ON public.timesheets USING btree (user_id);
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "timesheets read" ON public.timesheets FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR internal.can_shape_project(project_id));
CREATE POLICY "timesheets log own" ON public.timesheets FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND internal.can_access_project(project_id));
CREATE POLICY "timesheets change" ON public.timesheets FOR UPDATE TO authenticated
  USING ((user_id = (SELECT auth.uid()) AND status = 'submitted') OR internal.can_shape_project(project_id))
  WITH CHECK ((user_id = (SELECT auth.uid()) AND internal.can_access_project(project_id)) OR internal.can_shape_project(project_id));
CREATE POLICY "timesheets remove" ON public.timesheets FOR DELETE TO authenticated
  USING ((user_id = (SELECT auth.uid()) AND status = 'submitted') OR internal.can_shape_project(project_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timesheets TO authenticated;
REVOKE ALL ON public.timesheets FROM anon;

-- Only the owner and leads decide, and set the rate; a decision is stamped.
-- A changed entry goes back to "submitted".
CREATE FUNCTION internal.timesheets_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  shaper boolean := internal.can_shape_project(new.project_id);
begin
  if tg_op = 'UPDATE' and (new.project_id <> old.project_id or new.user_id <> old.user_id) then
    raise exception 'A timesheet stays with its person and project' using errcode = '42501';
  end if;
  if not shaper then
    if new.status <> 'submitted' then
      raise exception 'Only the owner and leads approve hours' using errcode = '42501';
    end if;
    if tg_op = 'INSERT' then
      new.rate := null;
    else
      new.rate := old.rate;
    end if;
  end if;
  if tg_op = 'UPDATE' and new.status = old.status and old.status <> 'submitted'
     and (new.hours, new.work_date) is distinct from (old.hours, old.work_date) then
    new.status := 'submitted';
  end if;
  if new.status = 'submitted' then
    new.decided_by := null;
    new.decided_at := null;
  elsif tg_op = 'INSERT' or new.status is distinct from old.status then
    new.decided_by := (select auth.uid());
    new.decided_at := now();
  else
    new.decided_by := old.decided_by;
    new.decided_at := old.decided_at;
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.timesheets_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER timesheets_guard BEFORE INSERT OR UPDATE ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION internal.timesheets_guard();

ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses, public.timesheets;
