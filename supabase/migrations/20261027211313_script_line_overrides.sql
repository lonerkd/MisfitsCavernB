-- A line-type decision a person made in the editor. Overrides belong to the
-- script (not a writer), so every surface reading that script uses the same
-- correction. Exact text plus occurrence keeps the target stable when other
-- lines are inserted above it, while edited text no longer matches stale rules.
CREATE TABLE public.script_line_overrides (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  script_id uuid NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  line_text text NOT NULL,
  occurrence integer NOT NULL,
  line_type text NOT NULL,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT script_line_overrides_line_text_check CHECK (char_length(line_text) BETWEEN 1 AND 2000 AND line_text = btrim(line_text)),
  CONSTRAINT script_line_overrides_occurrence_check CHECK (occurrence >= 0),
  CONSTRAINT script_line_overrides_type_check CHECK (line_type IN ('slug', 'transition', 'character', 'parenthetical', 'dialogue', 'action')),
  CONSTRAINT script_line_overrides_script_line_key UNIQUE (script_id, line_text, occurrence)
);

ALTER TABLE public.script_line_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Script members can manage line overrides" ON public.script_line_overrides
  FOR ALL TO authenticated
  USING (internal.can_access_script(script_id))
  WITH CHECK (internal.can_access_script(script_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.script_line_overrides TO authenticated;
REVOKE ALL ON public.script_line_overrides FROM anon;
ALTER PUBLICATION supabase_realtime ADD TABLE public.script_line_overrides;