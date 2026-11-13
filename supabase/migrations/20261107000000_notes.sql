-- Notes, in three layers (owner, 2026-11-07): PRIVATE (only the author), PROJECT (the project's people), WRITER (the people who
-- can open that script). A note may hang on a script and a scene; it keeps a line of context ("Scene 12 · INT. KITCHEN - DAY")
-- so it still says what it was about when the scene is rewritten or deleted.
--
--   read    : the author always; a project note: anyone who can access the project; a writer note: anyone who can open the script.
--             A private note is read by nobody else, the project owner included.
--   write   : the author, into a layer they can reach. Only the text of a note can change afterwards (the layer, the place and
--             the author are fixed).
--   delete  : the author; the project owner also deletes a PROJECT note.
--   notify  : a project note tells the owner and confirmed crew, a writer note tells the script's people (never the author, never
--             for a private note).
CREATE TABLE public.notes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  scope text NOT NULL,
  project_id uuid,
  script_id uuid,
  scene_id uuid,
  context text,
  body text NOT NULL,
  created_by uuid DEFAULT auth.uid() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT notes_pkey PRIMARY KEY (id),
  CONSTRAINT notes_scope_check CHECK (scope IN ('private', 'project', 'writer')),
  CONSTRAINT notes_body_check CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  CONSTRAINT notes_context_check CHECK (context IS NULL OR char_length(context) <= 200),
  CONSTRAINT notes_target_check CHECK (scope = 'private' OR (scope = 'project' AND project_id IS NOT NULL) OR (scope = 'writer' AND script_id IS NOT NULL)),
  CONSTRAINT notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT notes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT notes_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE,
  CONSTRAINT notes_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE SET NULL
);
CREATE INDEX notes_created_by_idx ON public.notes USING btree (created_by, created_at DESC);
CREATE INDEX notes_project_idx ON public.notes USING btree (project_id, created_at DESC);
CREATE INDEX notes_script_idx ON public.notes USING btree (script_id, created_at DESC);
CREATE INDEX notes_scene_idx ON public.notes USING btree (scene_id);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
-- One SELECT policy. A private note matches no branch but the first, so only its author reads it.
CREATE POLICY "notes view" ON public.notes FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR (scope = 'project' AND internal.can_access_project(project_id))
    OR (scope = 'writer' AND internal.can_access_script(script_id))
  );
CREATE POLICY "notes insert" ON public.notes FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (
      (scope = 'private' AND (project_id IS NULL OR internal.can_access_project(project_id)) AND (script_id IS NULL OR internal.can_access_script(script_id)))
      OR (scope = 'project' AND internal.can_access_project(project_id))
      OR (scope = 'writer' AND internal.can_access_script(script_id))
    )
  );
CREATE POLICY "notes update" ON public.notes FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    AND (
      scope = 'private'
      OR (scope = 'project' AND internal.can_access_project(project_id))
      OR (scope = 'writer' AND internal.can_access_script(script_id))
    )
  )
  WITH CHECK (created_by = (SELECT auth.uid()));
CREATE POLICY "notes delete" ON public.notes FOR DELETE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR (scope = 'project' AND internal.is_project_creator(project_id))
  );
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
REVOKE ALL ON public.notes FROM anon;

-- The author is the signed-in caller, whatever the client sent; a note on a script takes that script's project; a scene must be
-- in that script. After that only the text can change (the layer, the place and the author are fixed). An invoker trigger: the
-- caller must be able to see the script and scene it names.
CREATE FUNCTION internal.notes_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if TG_OP = 'INSERT' then
    if (select auth.uid()) is not null then new.created_by := (select auth.uid()); end if;
    new.created_at := now();
    new.updated_at := now();
    if new.script_id is not null then
      declare sp uuid;
      begin
        select s.project_id into sp from public.scripts s where s.id = new.script_id;
        if new.project_id is not null and new.project_id is distinct from sp then
          raise exception 'That script is not in this project' using errcode = '23514';
        end if;
        new.project_id := sp;
      end;
    end if;
    if new.scene_id is not null and not exists (
      select 1 from public.scenes sc
      where sc.id = new.scene_id
        and case when new.script_id is not null then sc.script_id = new.script_id else sc.project_id is not distinct from new.project_id end
    ) then
      raise exception 'That scene is not in this script' using errcode = '23514';
    end if;
  else
    -- scene_id may go to NULL (the scene was deleted: the foreign key sets it), but never to a different scene.
    if new.scope is distinct from old.scope or new.project_id is distinct from old.project_id or new.script_id is distinct from old.script_id
       or (new.scene_id is distinct from old.scene_id and new.scene_id is not null)
       or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
      raise exception 'Only the text of a note can change' using errcode = '42501';
    end if;
    new.updated_at := now();
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.notes_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notes_guard BEFORE INSERT OR UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION internal.notes_guard();

-- Tell the people a shared note is for. Definer: it writes other people's notifications, which the author could not read. A
-- private note tells nobody. The author is never told about their own note.
CREATE FUNCTION internal.notes_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  who uuid;
  author text;
  ttl text;
  lnk text;
  txt text;
begin
  if new.scope = 'private' then return new; end if;
  select coalesce(nullif(p.username, ''), 'Someone') into author from public.profiles p where p.id = new.created_by;
  author := coalesce(author, 'Someone');
  ttl := left(format('%s added a %s note', author, case new.scope when 'project' then 'project' else 'writer' end), 200);
  txt := left(case when new.context is null then '' else new.context || ': ' end || new.body, 1000);
  lnk := case new.scope when 'project' then '/studio?project=' || new.project_id else '/editor?script=' || new.script_id end;
  for who in
    select u from (
      select internal.call_sheet_recipients(new.project_id) as u where new.scope = 'project'
      union
      -- A loose script (no project) is read by its owner only; a project's script, by the project's people. Everyone is
      -- chosen by their access today, never by who last touched the script.
      select s.created_by from public.scripts s where s.id = new.script_id and new.scope = 'writer' and s.project_id is null
      union
      select internal.call_sheet_recipients(new.project_id) where new.scope = 'writer' and new.project_id is not null
    ) r where u is not null and u <> new.created_by
  loop
    insert into public.notifications (user_id, type, title, body, link, created_by)
    values (who, 'note', ttl, txt, lnk, new.created_by);
  end loop;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.notes_notify() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notes_notify AFTER INSERT ON public.notes FOR EACH ROW EXECUTE FUNCTION internal.notes_notify();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
