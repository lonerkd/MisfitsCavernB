-- Schedule versions (competitor parity, gap 4): named snapshots of the stripboard.
--
-- A version is which scene is on which shoot day plus the day dates, frozen as jsonb:
--   { "scenes": [{ "id", "scene_number", "shoot_day" }], "days": [{ "day", "date" }] }
-- The live schedule stays where it always was (`scenes.shoot_day`, `shoot_days`); a version is only a copy to compare with or
-- go back to. Restoring writes through the ordinary scene and day updates, so their guards and the film-graph sync run.
--
-- Who: the owner and people who shape the project write (insert, remove); the same plus crew holding `schedule.write` read.
-- Nobody else sees anything. A version is immutable once saved: a guard trigger refuses every UPDATE (invoker, no helpers).

CREATE TABLE public.schedule_versions (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  label text NOT NULL CONSTRAINT schedule_versions_label_len CHECK (char_length(btrim(label)) BETWEEN 1 AND 80),
  snapshot jsonb NOT NULL CONSTRAINT schedule_versions_snapshot_check CHECK (
    jsonb_typeof(snapshot) = 'object'
    AND jsonb_typeof(snapshot -> 'scenes') = 'array'
    AND jsonb_typeof(snapshot -> 'days') = 'array'
    AND jsonb_array_length(snapshot -> 'scenes') <= 2000
    AND jsonb_array_length(snapshot -> 'days') <= 400
    AND pg_column_size(snapshot) <= 400000
  ),
  auto boolean DEFAULT false NOT NULL,
  created_by uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX schedule_versions_project_idx ON public.schedule_versions USING btree (project_id, created_at DESC);
CREATE INDEX schedule_versions_created_by_idx ON public.schedule_versions USING btree (created_by);

ALTER TABLE public.schedule_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schedule versions view" ON public.schedule_versions FOR SELECT TO authenticated
  USING (internal.can_shape_project(project_id) OR internal.has_capability(project_id, 'schedule.write'));
CREATE POLICY "schedule versions add" ON public.schedule_versions FOR INSERT TO authenticated
  WITH CHECK (internal.can_shape_project(project_id) AND created_by = (select auth.uid()));
CREATE POLICY "schedule versions remove" ON public.schedule_versions FOR DELETE TO authenticated
  USING (internal.can_shape_project(project_id));
GRANT SELECT, INSERT, DELETE ON public.schedule_versions TO authenticated;
REVOKE ALL ON public.schedule_versions FROM anon;

-- Immutable after insert. An invoker trigger body cannot call internal.* helpers, and needs none: it refuses every change.
CREATE FUNCTION internal.schedule_versions_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  raise exception 'A saved schedule version cannot be changed' using errcode = '42501';
end;
$function$;
REVOKE ALL ON FUNCTION internal.schedule_versions_immutable() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER schedule_versions_immutable BEFORE UPDATE ON public.schedule_versions
  FOR EACH ROW EXECUTE FUNCTION internal.schedule_versions_immutable();
