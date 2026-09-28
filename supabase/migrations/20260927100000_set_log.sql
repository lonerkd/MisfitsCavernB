-- On set: the shoot day's log. The crew stamp the day's clock (crew call,
-- rolling, lunch, back in, wrap — one tap each, latest stamp wins) and note
-- the day; the script supervisor records continuity per scene, shot and take,
-- with a photo. One row per event, live for everyone on the project.
--
-- Clock stamps and day notes belong to a shoot day (deleting the day removes
-- them). Continuity belongs to the scene, not the day — it matters on every
-- day that scene is shot — and survives a day being deleted.

-- Shots can be referenced together with their project (like scenes and media).
CREATE UNIQUE INDEX shots_id_project_key ON public.shots USING btree (id, project_id);

CREATE TABLE public.set_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL
    CONSTRAINT set_log_kind_check CHECK (kind IN ('call', 'rolling', 'lunch', 'back', 'wrap', 'note', 'continuity')),
  at timestamp with time zone DEFAULT now() NOT NULL,
  call_sheet_id uuid,
  scene_id uuid,
  shot_id uuid,
  take smallint CONSTRAINT set_log_take_check CHECK (take IS NULL OR take BETWEEN 1 AND 999),
  body text CONSTRAINT set_log_body_len CHECK (body IS NULL OR char_length(btrim(body)) BETWEEN 1 AND 2000),
  media_id uuid,
  created_by uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT set_log_day_fkey FOREIGN KEY (call_sheet_id, project_id) REFERENCES public.call_sheets(id, project_id) ON DELETE CASCADE,
  CONSTRAINT set_log_scene_fkey FOREIGN KEY (scene_id, project_id) REFERENCES public.scenes(id, project_id) ON DELETE SET NULL (scene_id),
  CONSTRAINT set_log_shot_fkey FOREIGN KEY (shot_id, project_id) REFERENCES public.shots(id, project_id) ON DELETE SET NULL (shot_id),
  CONSTRAINT set_log_media_fkey FOREIGN KEY (media_id, project_id) REFERENCES public.media(id, project_id) ON DELETE SET NULL (media_id),
  -- The day's clock and notes are the day's; continuity is the scene's.
  CONSTRAINT set_log_shape CHECK (
    (kind = 'continuity' AND call_sheet_id IS NULL)
    OR (kind <> 'continuity' AND call_sheet_id IS NOT NULL AND shot_id IS NULL AND take IS NULL AND media_id IS NULL
        AND (kind <> 'note' OR body IS NOT NULL))
  )
);
CREATE INDEX set_log_project_idx ON public.set_log USING btree (project_id, at);
CREATE INDEX set_log_day_idx ON public.set_log USING btree (call_sheet_id);
CREATE INDEX set_log_scene_idx ON public.set_log USING btree (scene_id);
CREATE INDEX set_log_shot_idx ON public.set_log USING btree (shot_id);
CREATE INDEX set_log_media_idx ON public.set_log USING btree (media_id);
CREATE INDEX set_log_created_by_idx ON public.set_log USING btree (created_by);

ALTER TABLE public.set_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "set_log view" ON public.set_log FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id));
CREATE POLICY "set_log insert" ON public.set_log FOR INSERT TO authenticated
  WITH CHECK (internal.can_access_project(project_id) AND created_by = (SELECT auth.uid()));
-- Correcting a stamp's time or a note's text: its author, or the project owner.
CREATE POLICY "set_log update" ON public.set_log FOR UPDATE TO authenticated
  USING (internal.can_access_project(project_id) AND (created_by = (SELECT auth.uid()) OR internal.is_project_creator(project_id)))
  WITH CHECK (internal.can_access_project(project_id));
CREATE POLICY "set_log delete" ON public.set_log FOR DELETE TO authenticated
  USING (internal.can_access_project(project_id) AND (created_by = (SELECT auth.uid()) OR internal.is_project_creator(project_id)));

-- Only the time and the words can change; what an entry is and who made it can't.
REVOKE UPDATE ON public.set_log FROM anon, authenticated;
GRANT UPDATE (at, body, take) ON public.set_log TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.set_log;
