-- Role model, step 3c: the money kinds of `production_records` follow the budget capabilities.
--
-- What was wrong: every record kind was read by anyone who can access the project and written by anyone who can shape it, so the
-- two kinds that are money, purchase orders (vendor and amount) and insurance claims (incident and amount), were open to the
-- whole crew while the budget itself (20261114000100) is not. A sound mixer could read every purchase order.
--
--   kind in ('purchaseOrders', 'claims')   read: budget.read      add / edit / remove: budget.write (and can shape the project)
--   every other kind                       unchanged
--
-- The owner holds every capability, so nothing changes for them. One SELECT policy, as the house rule asks.

DROP POLICY "production records view" ON public.production_records;
CREATE POLICY "production records view" ON public.production_records FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id)
         AND (kind NOT IN ('purchaseOrders', 'claims') OR internal.has_capability(project_id, 'budget.read')));

DROP POLICY "production records add" ON public.production_records;
CREATE POLICY "production records add" ON public.production_records FOR INSERT TO authenticated
  WITH CHECK (internal.can_shape_project(project_id) AND created_by = (SELECT auth.uid())
              AND (kind NOT IN ('purchaseOrders', 'claims') OR internal.has_capability(project_id, 'budget.write')));

DROP POLICY "production records edit" ON public.production_records;
CREATE POLICY "production records edit" ON public.production_records FOR UPDATE TO authenticated
  USING (internal.can_shape_project(project_id) AND (kind NOT IN ('purchaseOrders', 'claims') OR internal.has_capability(project_id, 'budget.write')))
  WITH CHECK (internal.can_shape_project(project_id) AND (kind NOT IN ('purchaseOrders', 'claims') OR internal.has_capability(project_id, 'budget.write')));

DROP POLICY "production records remove" ON public.production_records;
CREATE POLICY "production records remove" ON public.production_records FOR DELETE TO authenticated
  USING (internal.can_shape_project(project_id) AND (kind NOT IN ('purchaseOrders', 'claims') OR internal.has_capability(project_id, 'budget.write')));
