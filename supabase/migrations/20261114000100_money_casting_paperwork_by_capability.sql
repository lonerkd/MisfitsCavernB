-- Role model, step 3a: the budget, who is cast, and the paperwork follow what a person's role lets them do
-- (`internal.has_capability`, 20261113000200), not just "is on the project".
--
-- What was wrong: `budget_items` had ONE policy for everything that let anyone who could access the project read AND write
-- the budget (a view-only member too); castings could be written by any confirmed member, view-only included.
--
--   budget_items, expenses, vendors   read: budget.read      write: budget.write
--   timesheets                        read: your own, or budget.write (everyone's hours are payroll)
--                                     change / remove: your own while submitted, or budget.write
--                                     (logging your own hours is unchanged)
--   character_castings                read: unchanged (who plays whom is project knowledge: call sheets and continuity use it)
--                                     write: casting.decide
--   project_documents + the project-papers bucket
--                                     read: paperwork.read, or a document about you     write: paperwork.write
--
-- The project's owner holds every capability, so nothing changes for them. A member now holds only what their craft grants
-- (plus the owner's per-person changes), and a view-only member never holds anything that edits.

-- ── Budget ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
DROP POLICY "budget_items access" ON public.budget_items;
CREATE POLICY "budget items read" ON public.budget_items FOR SELECT TO authenticated USING (internal.has_capability(project_id, 'budget.read'));
CREATE POLICY "budget items add" ON public.budget_items FOR INSERT TO authenticated WITH CHECK (internal.has_capability(project_id, 'budget.write'));
CREATE POLICY "budget items change" ON public.budget_items FOR UPDATE TO authenticated
  USING (internal.has_capability(project_id, 'budget.write')) WITH CHECK (internal.has_capability(project_id, 'budget.write'));
CREATE POLICY "budget items remove" ON public.budget_items FOR DELETE TO authenticated USING (internal.has_capability(project_id, 'budget.write'));

DROP POLICY "expenses shapers" ON public.expenses;
CREATE POLICY "expenses read" ON public.expenses FOR SELECT TO authenticated USING (internal.has_capability(project_id, 'budget.read'));
CREATE POLICY "expenses add" ON public.expenses FOR INSERT TO authenticated WITH CHECK (internal.has_capability(project_id, 'budget.write'));
CREATE POLICY "expenses change" ON public.expenses FOR UPDATE TO authenticated
  USING (internal.has_capability(project_id, 'budget.write')) WITH CHECK (internal.has_capability(project_id, 'budget.write'));
CREATE POLICY "expenses remove" ON public.expenses FOR DELETE TO authenticated USING (internal.has_capability(project_id, 'budget.write'));

DROP POLICY "vendors shapers" ON public.vendors;
CREATE POLICY "vendors read" ON public.vendors FOR SELECT TO authenticated USING (internal.has_capability(project_id, 'budget.read'));
CREATE POLICY "vendors add" ON public.vendors FOR INSERT TO authenticated WITH CHECK (internal.has_capability(project_id, 'budget.write'));
CREATE POLICY "vendors change" ON public.vendors FOR UPDATE TO authenticated
  USING (internal.has_capability(project_id, 'budget.write')) WITH CHECK (internal.has_capability(project_id, 'budget.write'));
CREATE POLICY "vendors remove" ON public.vendors FOR DELETE TO authenticated USING (internal.has_capability(project_id, 'budget.write'));

-- Hours: you always see and may submit your own; seeing everyone's, like approving them, is payroll: budget.write
-- (a department head holds budget.read for their own spend, which must not show everyone's hours).
DROP POLICY "timesheets read" ON public.timesheets;
CREATE POLICY "timesheets read" ON public.timesheets FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR internal.has_capability(project_id, 'budget.write'));
DROP POLICY "timesheets change" ON public.timesheets;
CREATE POLICY "timesheets change" ON public.timesheets FOR UPDATE TO authenticated
  USING ((user_id = (SELECT auth.uid()) AND status = 'submitted') OR internal.has_capability(project_id, 'budget.write'))
  WITH CHECK ((user_id = (SELECT auth.uid()) AND internal.can_access_project(project_id)) OR internal.has_capability(project_id, 'budget.write'));
DROP POLICY "timesheets remove" ON public.timesheets;
CREATE POLICY "timesheets remove" ON public.timesheets FOR DELETE TO authenticated
  USING ((user_id = (SELECT auth.uid()) AND status = 'submitted') OR internal.has_capability(project_id, 'budget.write'));

-- ── Who is cast ─────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Reading stays as it was; deciding is the casting decision.
DROP POLICY "castings insert" ON public.character_castings;
CREATE POLICY "castings insert" ON public.character_castings FOR INSERT TO authenticated WITH CHECK (internal.has_capability(project_id, 'casting.decide'));
DROP POLICY "castings update" ON public.character_castings;
CREATE POLICY "castings update" ON public.character_castings FOR UPDATE TO authenticated
  USING (internal.has_capability(project_id, 'casting.decide')) WITH CHECK (internal.has_capability(project_id, 'casting.decide'));
DROP POLICY "castings delete" ON public.character_castings;
CREATE POLICY "castings delete" ON public.character_castings FOR DELETE TO authenticated USING (internal.has_capability(project_id, 'casting.decide'));

-- ── Paperwork ───────────────────────────────────────────────────────────────────────────────────────────────────────────
DROP POLICY "project_documents read" ON public.project_documents;
CREATE POLICY "project_documents read" ON public.project_documents FOR SELECT TO authenticated
  USING (internal.has_capability(project_id, 'paperwork.read') OR person_id = (SELECT auth.uid()));
DROP POLICY "project_documents insert" ON public.project_documents;
CREATE POLICY "project_documents insert" ON public.project_documents FOR INSERT TO authenticated WITH CHECK (internal.has_capability(project_id, 'paperwork.write'));
DROP POLICY "project_documents update" ON public.project_documents;
CREATE POLICY "project_documents update" ON public.project_documents FOR UPDATE TO authenticated
  USING (internal.has_capability(project_id, 'paperwork.write')) WITH CHECK (internal.has_capability(project_id, 'paperwork.write'));
DROP POLICY "project_documents delete" ON public.project_documents;
CREATE POLICY "project_documents delete" ON public.project_documents FOR DELETE TO authenticated USING (internal.has_capability(project_id, 'paperwork.write'));

-- The files: the storage policies follow the same rules (the bucket policy's read goes through `can_read_paper`).
CREATE OR REPLACE FUNCTION internal.can_read_paper(object_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select internal.has_capability(internal.path_project_id(object_name), 'paperwork.read')
      or exists (select 1 from public.project_documents d
                  where d.storage_path = object_name and d.person_id = (select auth.uid()));
$function$;
DROP POLICY "project-papers: upload" ON storage.objects;
CREATE POLICY "project-papers: upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-papers' AND internal.has_capability(internal.path_project_id(name), 'paperwork.write'));
DROP POLICY "project-papers: delete" ON storage.objects;
CREATE POLICY "project-papers: delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-papers' AND internal.has_capability(internal.path_project_id(name), 'paperwork.write'));
