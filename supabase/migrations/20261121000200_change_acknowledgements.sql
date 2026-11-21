-- A director's change reaches the departments (BACKLOG 3.51, X2) and each person it touches can say "seen": one row per person per
-- note. The note itself lives in the project's directorNotes records; this table only records who has acknowledged it. A person
-- acknowledges as themselves, on a project they can open; they read their own, and the people who shape the project (owner, leads and
-- contributors: `can_shape_project`) read everyone's, to see who has not yet.
CREATE TABLE public.change_acknowledgements (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  note_id text NOT NULL CHECK (char_length(note_id) BETWEEN 1 AND 80),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, note_id, user_id)
);
CREATE INDEX change_acknowledgements_user_idx ON public.change_acknowledgements (user_id);
ALTER TABLE public.change_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "change acks view" ON public.change_acknowledgements FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR internal.can_shape_project(project_id));
CREATE POLICY "change acks add" ON public.change_acknowledgements FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND internal.can_access_project(project_id));
CREATE POLICY "change acks withdraw" ON public.change_acknowledgements FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
