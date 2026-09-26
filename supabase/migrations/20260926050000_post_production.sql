-- Post-production: cuts under review, timecoded notes tied to scenes, and the
-- post pipeline + deliverables. The suite stopped at the shoot; the edit,
-- sound, colour, music and delivery had nowhere to live.

-- ── Cuts ───────────────────────────────────────────────────────────────────
-- A version of the edit: a link (YouTube, Vimeo, Drive, …) or a video in the
-- project library.
CREATE TABLE public.post_cuts (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL CONSTRAINT post_cuts_title_len CHECK (char_length(title) BETWEEN 1 AND 200),
  url text CONSTRAINT post_cuts_url_check CHECK (url IS NULL OR (url ~* '^https?://' AND char_length(url) <= 2000)),
  media_id uuid,
  created_by uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT post_cuts_id_project_key UNIQUE (id, project_id),
  CONSTRAINT post_cuts_one_source CHECK ((url IS NULL) <> (media_id IS NULL)),
  CONSTRAINT post_cuts_media_fkey FOREIGN KEY (media_id, project_id) REFERENCES public.media(id, project_id) ON DELETE CASCADE
);
CREATE INDEX post_cuts_project_idx ON public.post_cuts USING btree (project_id, created_at);
CREATE INDEX post_cuts_media_idx ON public.post_cuts USING btree (media_id);
CREATE INDEX post_cuts_created_by_idx ON public.post_cuts USING btree (created_by);

-- ── Notes on a cut ─────────────────────────────────────────────────────────
CREATE TABLE public.post_notes (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  project_id uuid NOT NULL,
  cut_id uuid NOT NULL,
  scene_id uuid,
  at_seconds numeric(9, 2) NOT NULL CONSTRAINT post_notes_at_check CHECK (at_seconds >= 0 AND at_seconds < 360000),
  department text DEFAULT 'edit' NOT NULL
    CONSTRAINT post_notes_department_check CHECK (department IN ('edit', 'sound', 'music', 'color', 'vfx', 'titles', 'general')),
  body text NOT NULL CONSTRAINT post_notes_body_len CHECK (char_length(body) BETWEEN 1 AND 4000),
  resolved_at timestamp with time zone,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT post_notes_cut_fkey FOREIGN KEY (cut_id, project_id) REFERENCES public.post_cuts(id, project_id) ON DELETE CASCADE,
  CONSTRAINT post_notes_scene_fkey FOREIGN KEY (scene_id, project_id) REFERENCES public.scenes(id, project_id) ON DELETE SET NULL (scene_id),
  CONSTRAINT post_notes_resolved_check CHECK ((resolved_at IS NULL) = (resolved_by IS NULL))
);
CREATE INDEX post_notes_cut_idx ON public.post_notes USING btree (cut_id, at_seconds);
CREATE INDEX post_notes_project_idx ON public.post_notes USING btree (project_id);
CREATE INDEX post_notes_scene_idx ON public.post_notes USING btree (scene_id);
CREATE INDEX post_notes_created_by_idx ON public.post_notes USING btree (created_by);
CREATE INDEX post_notes_resolved_by_idx ON public.post_notes USING btree (resolved_by);

-- ── Pipeline stages and deliverables ───────────────────────────────────────
CREATE TABLE public.post_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL CONSTRAINT post_items_kind_check CHECK (kind IN ('stage', 'deliverable')),
  title text NOT NULL CONSTRAINT post_items_title_len CHECK (char_length(title) BETWEEN 1 AND 200),
  department text CONSTRAINT post_items_department_check CHECK (department IS NULL OR department IN ('edit', 'sound', 'music', 'color', 'vfx', 'titles', 'general')),
  status text DEFAULT 'todo' NOT NULL CONSTRAINT post_items_status_check CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  due_date date,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text CONSTRAINT post_items_notes_len CHECK (char_length(notes) <= 2000),
  position integer DEFAULT 0 NOT NULL,
  created_by uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX post_items_project_idx ON public.post_items USING btree (project_id, kind, position);
CREATE INDEX post_items_assigned_to_idx ON public.post_items USING btree (assigned_to);
CREATE INDEX post_items_created_by_idx ON public.post_items USING btree (created_by);
CREATE TRIGGER post_items_updated_at BEFORE UPDATE ON public.post_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Access: the project team ───────────────────────────────────────────────
ALTER TABLE public.post_cuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_cuts view" ON public.post_cuts FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id));
CREATE POLICY "post_cuts insert" ON public.post_cuts FOR INSERT TO authenticated
  WITH CHECK (internal.can_access_project(project_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY "post_cuts update" ON public.post_cuts FOR UPDATE TO authenticated
  USING (internal.can_access_project(project_id)) WITH CHECK (internal.can_access_project(project_id));
CREATE POLICY "post_cuts delete" ON public.post_cuts FOR DELETE TO authenticated
  USING (internal.can_access_project(project_id) AND (created_by = (SELECT auth.uid()) OR internal.is_project_creator(project_id)));

CREATE POLICY "post_notes view" ON public.post_notes FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id));
CREATE POLICY "post_notes insert" ON public.post_notes FOR INSERT TO authenticated
  WITH CHECK (internal.can_access_project(project_id) AND created_by = (SELECT auth.uid()) AND resolved_at IS NULL);
-- Anyone on the team can resolve/reopen; authors edit their text (guard below).
CREATE POLICY "post_notes update" ON public.post_notes FOR UPDATE TO authenticated
  USING (internal.can_access_project(project_id)) WITH CHECK (internal.can_access_project(project_id));
CREATE POLICY "post_notes delete" ON public.post_notes FOR DELETE TO authenticated
  USING (internal.can_access_project(project_id) AND (created_by = (SELECT auth.uid()) OR internal.is_project_creator(project_id)));

CREATE POLICY "post_items access" ON public.post_items FOR ALL TO authenticated
  USING (internal.can_access_project(project_id)) WITH CHECK (internal.can_access_project(project_id));

-- A note's text, timecode and author are its author's; anyone on the team
-- may resolve or reopen it, recorded as themselves.
CREATE FUNCTION internal.post_notes_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  -- No JWT (maintenance), or a foreign-key action such as a deleted scene
  -- clearing scene_id (fired from inside another statement's triggers).
  if (select auth.uid()) is null or pg_trigger_depth() > 1 then
    return new;
  end if;
  if new.resolved_by is distinct from old.resolved_by and new.resolved_by is not null
     and new.resolved_by <> (select auth.uid()) then
    raise exception 'A note is resolved in your own name' using errcode = '42501';
  end if;
  if new.created_by is distinct from old.created_by or new.project_id <> old.project_id or new.cut_id <> old.cut_id then
    raise exception 'A note stays with its cut and author' using errcode = '42501';
  end if;
  if (new.body, new.at_seconds, new.department, new.scene_id) is distinct from (old.body, old.at_seconds, old.department, old.scene_id)
     and old.created_by is distinct from (select auth.uid()) then
    raise exception 'Only the author can edit a note' using errcode = '42501';
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.post_notes_guard() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION internal.post_notes_guard() TO service_role;
CREATE TRIGGER post_notes_guard BEFORE UPDATE ON public.post_notes FOR EACH ROW EXECUTE FUNCTION internal.post_notes_guard();

ALTER PUBLICATION supabase_realtime ADD TABLE public.post_cuts, public.post_notes, public.post_items;
