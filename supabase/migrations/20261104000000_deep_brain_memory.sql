-- The deep brain, B8 continued: per-writer memory and line overrides.
-- Per-writer (private) memory: what this writer has confirmed or rejected becomes
-- priors for their next reads. Line overrides are per-script corrections a person
-- makes on a line, shared with the project's people (the same rule as
-- reading_corrections).

-- Per-writer reading memory: private, never shared with the crew; feeds the reader
-- only when this writer parses.
CREATE TABLE public.reading_memory (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  script_format text NOT NULL DEFAULT 'screenplay',
  kind text NOT NULL,
  name text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  count integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT reading_memory_pkey PRIMARY KEY (id),
  CONSTRAINT reading_memory_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT reading_memory_kind_check CHECK (kind IN ('confirmed_name', 'rejected_name', 'title_case_cue', 'colon_cue', 'extension', 'transition_pattern')),
  CONSTRAINT reading_memory_name_check CHECK (char_length(name) BETWEEN 1 AND 200),
  CONSTRAINT reading_memory_user_format_kind_name_key UNIQUE (user_id, script_format, kind, name)
);
CREATE INDEX reading_memory_user_format_idx ON public.reading_memory USING btree (user_id, script_format);
ALTER TABLE public.reading_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reading_memory own" ON public.reading_memory FOR ALL TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_memory TO authenticated;
REVOKE ALL ON public.reading_memory FROM anon;

-- Per-script line overrides: a person's correction on one line. Overrides the decoder's choice.
CREATE TABLE public.reading_line_overrides (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid NOT NULL,
  script_id uuid NOT NULL,
  line_index integer NOT NULL,
  forced_type text NOT NULL,
  forced_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT reading_line_overrides_pkey PRIMARY KEY (id),
  CONSTRAINT reading_line_overrides_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT reading_line_overrides_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE,
  CONSTRAINT reading_line_overrides_forced_by_fkey FOREIGN KEY (forced_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT reading_line_overrides_line_check CHECK (line_index >= 0),
  CONSTRAINT reading_line_overrides_type_check CHECK (forced_type IN ('slug', 'action', 'character', 'dialogue', 'parenthetical', 'transition', 'shot', 'text', 'title', 'centered', 'section', 'synopsis', 'lyric', 'scene', 'note', 'dual', 'pagebreak', 'boneyard', 'empty')),
  CONSTRAINT reading_line_overrides_project_script_line_key UNIQUE (project_id, script_id, line_index)
);
CREATE INDEX reading_line_overrides_project_script_idx ON public.reading_line_overrides USING btree (project_id, script_id);
CREATE INDEX reading_line_overrides_script_idx ON public.reading_line_overrides USING btree (script_id);
CREATE INDEX reading_line_overrides_forced_by_idx ON public.reading_line_overrides USING btree (forced_by);
ALTER TABLE public.reading_line_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reading_line_overrides access" ON public.reading_line_overrides FOR ALL TO authenticated
  USING (internal.can_access_project(project_id)) WITH CHECK (internal.can_access_project(project_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_line_overrides TO authenticated;
REVOKE ALL ON public.reading_line_overrides FROM anon;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reading_line_overrides;

-- An override must be on a script of its own project (an invoker trigger: the caller must be able to see the script).
CREATE FUNCTION internal.line_overrides_check_script()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if not exists (select 1 from public.scripts s where s.id = new.script_id and s.project_id = new.project_id) then
    raise exception 'That script is not in this project' using errcode = '22023';
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.line_overrides_check_script() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER reading_line_overrides_check_script BEFORE INSERT OR UPDATE OF project_id, script_id ON public.reading_line_overrides
  FOR EACH ROW EXECUTE FUNCTION internal.line_overrides_check_script();

-- Helpers for the reader (invoker: row security still decides what a caller sees).
CREATE FUNCTION public.reading_memory_for_user(p_user_id uuid, p_format text DEFAULT 'screenplay')
 RETURNS TABLE(kind text, name text, metadata jsonb, count integer)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select m.kind, m.name, m.metadata, m.count
    from public.reading_memory m
   where m.user_id = p_user_id and m.script_format = p_format
   order by m.count desc, m.updated_at desc;
$function$;
REVOKE ALL ON FUNCTION public.reading_memory_for_user(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reading_memory_for_user(uuid, text) TO authenticated;

-- A person's verdict on a name (reading_corrections) is also remembered for the next script they write. A definer
-- trigger in `internal`: it writes the verdicter's own private memory row, which they could write themselves.
CREATE FUNCTION internal.reading_memory_from_correction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.created_by is null then return new; end if;
  insert into public.reading_memory (user_id, script_format, kind, name)
  values (new.created_by, 'screenplay', case new.kind when 'character' then 'confirmed_name' else 'rejected_name' end, new.name)
  on conflict (user_id, script_format, kind, name) do update set count = public.reading_memory.count + 1, updated_at = now();
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.reading_memory_from_correction() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER reading_corrections_sync_memory AFTER INSERT ON public.reading_corrections
  FOR EACH ROW EXECUTE FUNCTION internal.reading_memory_from_correction();
