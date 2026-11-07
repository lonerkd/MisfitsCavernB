-- Tracks tagged to scenes (owner, 2026-11-07): a saved track says which scene it is for, in what role (a theme, source music
-- heard in the scene, a temp score, a needle drop, ambience) and with free tags, so the editor's Sound tab and the scene card can
-- show a scene's music. The project's people may tag any of its tracks; a track is still its adder's (and the project owner's)
-- to delete. The scene must be one of the track's own project's.
ALTER TABLE public.project_audio_references
  ADD COLUMN for_scene uuid REFERENCES public.scenes(id) ON DELETE SET NULL,
  ADD COLUMN role text,
  ADD COLUMN tags text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.project_audio_references
  ADD CONSTRAINT project_audio_references_role_check CHECK (role IS NULL OR role IN ('theme', 'source', 'temp', 'needle_drop', 'ambience')),
  ADD CONSTRAINT project_audio_references_tags_check CHECK (cardinality(tags) <= 12);
CREATE INDEX project_audio_references_for_scene_idx ON public.project_audio_references USING btree (for_scene);

-- Anyone who can open the project may tag its tracks (the tag is about the scene, not about who found the song).
CREATE POLICY "audio refs update" ON public.project_audio_references FOR UPDATE TO authenticated
  USING (added_by = (SELECT auth.uid()) OR (project_id IS NOT NULL AND internal.can_access_project(project_id)))
  WITH CHECK (project_id IS NULL OR internal.can_access_project(project_id));

-- An invoker trigger: the scene must belong to the track's project, and only the tags and the note can change afterwards.
CREATE FUNCTION internal.audio_refs_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.for_scene is not null and not exists (select 1 from public.scenes sc where sc.id = new.for_scene and sc.project_id is not distinct from new.project_id) then
    raise exception 'That scene is not in this project' using errcode = '23514';
  end if;
  if exists (select 1 from unnest(new.tags) t where char_length(btrim(t)) not between 1 and 40) then
    raise exception 'A tag is 1 to 40 characters' using errcode = '23514';
  end if;
  if TG_OP = 'UPDATE' and (
       new.project_id is distinct from old.project_id or new.uri is distinct from old.uri or new.reference_type is distinct from old.reference_type
       or new.added_by is distinct from old.added_by or new.title is distinct from old.title or new.created_at is distinct from old.created_at) then
    raise exception 'Only a track''s scene, role, tags and note can change' using errcode = '42501';
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.audio_refs_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER audio_refs_guard BEFORE INSERT OR UPDATE ON public.project_audio_references FOR EACH ROW EXECUTE FUNCTION internal.audio_refs_guard();
