-- The deep brain, B8: memory and corrections.
-- What a person tells the reader about their script — "this name is not a
-- character" or "this one is" — kept per project and shared with the crew, so
-- the reader obeys it on every surface (editor, Studio, anything that parses the
-- script) and the next read is better for it. Only what a person put here is
-- ever fed back to the reader as fact (never the reader's own output).

CREATE TABLE public.reading_corrections (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid NOT NULL,
  kind text NOT NULL,
  name text NOT NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT reading_corrections_pkey PRIMARY KEY (id),
  CONSTRAINT reading_corrections_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT reading_corrections_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT reading_corrections_kind_check CHECK (kind IN ('not_character', 'character')),
  CONSTRAINT reading_corrections_name_check CHECK (char_length(name) BETWEEN 1 AND 200 AND name = upper(btrim(name))),
  -- One verdict per name: saying the opposite replaces the old one.
  CONSTRAINT reading_corrections_project_name_key UNIQUE (project_id, name)
);
CREATE INDEX reading_corrections_project_idx ON public.reading_corrections USING btree (project_id);
ALTER TABLE public.reading_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reading_corrections access" ON public.reading_corrections FOR ALL TO authenticated
  USING (internal.can_access_project(project_id)) WITH CHECK (internal.can_access_project(project_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_corrections TO authenticated;
REVOKE ALL ON public.reading_corrections FROM anon;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reading_corrections;
