-- Transcripts and the paper edit.
--
-- transcript_lines are the words on a library item (an interview, a take, a
-- podcast recording): where each line sits in the recording (start/end in
-- ms, either may be unknown), who speaks, what they say, and its place in the
-- transcript. A line picked for the story carries paper_order: the project's
-- paper edit is its selects, across every recording, in that order.
--
-- Everyone who can open the project's library can read and write its
-- transcripts (the same rule as the library itself); crew remove the lines
-- they added, the owner any line. set_paper_edit rewrites the order in one
-- go, with the caller's rights.

CREATE TABLE public.transcript_lines (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid NOT NULL,
  media_id uuid NOT NULL,
  position integer NOT NULL,
  start_ms integer,
  end_ms integer,
  speaker text,
  text text NOT NULL,
  paper_order integer,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT transcript_lines_pkey PRIMARY KEY (id),
  CONSTRAINT transcript_lines_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT transcript_lines_media_fkey FOREIGN KEY (media_id, project_id) REFERENCES public.media(id, project_id) ON DELETE CASCADE,
  CONSTRAINT transcript_lines_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT transcript_lines_position_check CHECK (position >= 0),
  CONSTRAINT transcript_lines_times_check CHECK (
    (start_ms IS NULL OR start_ms >= 0)
    AND (end_ms IS NULL OR (start_ms IS NOT NULL AND end_ms >= start_ms))
  ),
  CONSTRAINT transcript_lines_text_check CHECK (char_length(btrim(text)) BETWEEN 1 AND 2000),
  CONSTRAINT transcript_lines_speaker_check CHECK (speaker IS NULL OR char_length(btrim(speaker)) BETWEEN 1 AND 60),
  CONSTRAINT transcript_lines_paper_order_check CHECK (paper_order IS NULL OR paper_order >= 0)
);
CREATE INDEX transcript_lines_media_idx ON public.transcript_lines USING btree (media_id, position);
CREATE INDEX transcript_lines_paper_idx ON public.transcript_lines USING btree (project_id, paper_order) WHERE paper_order IS NOT NULL;
CREATE INDEX transcript_lines_created_by_idx ON public.transcript_lines USING btree (created_by);

-- A line stays on its recording and with its author.
CREATE FUNCTION internal.transcript_lines_touch()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    if new.project_id <> old.project_id or new.media_id <> old.media_id then
      raise exception 'A transcript line cannot move to another recording' using errcode = '42501';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.transcript_lines_touch() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER transcript_lines_touch BEFORE INSERT OR UPDATE ON public.transcript_lines
  FOR EACH ROW EXECUTE FUNCTION internal.transcript_lines_touch();

ALTER TABLE public.transcript_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transcript_lines view" ON public.transcript_lines FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id));
CREATE POLICY "transcript_lines insert" ON public.transcript_lines FOR INSERT TO authenticated
  WITH CHECK (internal.can_access_project(project_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY "transcript_lines update" ON public.transcript_lines FOR UPDATE TO authenticated
  USING (internal.can_access_project(project_id))
  WITH CHECK (internal.can_access_project(project_id));
CREATE POLICY "transcript_lines delete" ON public.transcript_lines FOR DELETE TO authenticated
  USING (internal.can_access_project(project_id) AND (created_by = (SELECT auth.uid()) OR internal.is_project_creator(project_id)));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transcript_lines TO authenticated;
REVOKE ALL ON public.transcript_lines FROM anon;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transcript_lines;

-- The paper edit, in order: these lines become the selects 0, 1, 2…; every
-- other line of the project stops being one. Unknown lines, lines of another
-- project, or repeats are refused, and nothing changes.
CREATE FUNCTION public.set_paper_edit(p_project uuid, p_line_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
declare
  n integer := coalesce(cardinality(p_line_ids), 0);
  found integer;
begin
  if n > 1000 then
    raise exception 'A paper edit holds at most 1000 selects' using errcode = '22023';
  end if;
  if (select count(distinct x) from unnest(p_line_ids) as x) <> n then
    raise exception 'A line can be in the paper edit once' using errcode = '22023';
  end if;
  select count(*) into found from public.transcript_lines
   where project_id = p_project and id = any(p_line_ids);
  if found <> n then
    raise exception 'Some of those lines are not in this project' using errcode = '22023';
  end if;
  update public.transcript_lines t set paper_order = null
   where t.project_id = p_project and t.paper_order is not null and not (t.id = any(p_line_ids));
  update public.transcript_lines t set paper_order = o.ord - 1
    from unnest(p_line_ids) with ordinality as o(id, ord)
   where t.id = o.id and t.project_id = p_project and t.paper_order is distinct from (o.ord - 1)::integer;
end;
$function$;
REVOKE ALL ON FUNCTION public.set_paper_edit(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_paper_edit(uuid, uuid[]) TO authenticated;
