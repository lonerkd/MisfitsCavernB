-- The role tools hold a scene (and, for Costumes and Makeup, a character) as typed text. The film graph has the real rows, so a
-- record can now LINK to them: `scene_ids` (one or several scenes of the record's own project) and `character_id`. The typed text
-- stays in `data` as a label, never as the truth: a record whose scene was deleted keeps its label.
ALTER TABLE public.production_records
  ADD COLUMN scene_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN character_id uuid;
ALTER TABLE public.production_records
  ADD CONSTRAINT production_records_scene_ids_check CHECK (cardinality(scene_ids) <= 50),
  -- A character link is a real foreign key, same project; deleting the character clears only the link (not the project).
  ADD CONSTRAINT production_records_character_fkey FOREIGN KEY (character_id, project_id)
    REFERENCES public.characters (id, project_id) ON DELETE SET NULL (character_id);
CREATE INDEX production_records_character_idx ON public.production_records (character_id, project_id);
CREATE INDEX production_records_scene_ids_idx ON public.production_records USING gin (scene_ids);

-- An array cannot carry a foreign key: every linked scene must be a scene of this record's own project (a link into another
-- project would leak its scene numbers and headings through the record).
CREATE FUNCTION internal.production_records_links_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if cardinality(new.scene_ids) > 0 and exists (
       select 1 from unnest(new.scene_ids) sid
        where not exists (select 1 from public.scenes sc where sc.id = sid and sc.project_id = new.project_id)) then
    raise exception 'A linked scene must be in this project' using errcode = '23514';
  end if;
  if (select count(*) from unnest(new.scene_ids) sid) <> (select count(distinct sid) from unnest(new.scene_ids) sid) then
    raise exception 'A scene is linked once' using errcode = '23514';
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.production_records_links_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER production_records_links_guard BEFORE INSERT OR UPDATE OF scene_ids, project_id ON public.production_records
  FOR EACH ROW EXECUTE FUNCTION internal.production_records_links_guard();

-- A scene that is really deleted leaves the records' links (its label stays). An invoker trigger: whoever deletes a scene shapes
-- the project (or is the sync, which runs as its owner), so the update passes the same policy as any other record edit.
CREATE FUNCTION internal.production_records_unlink_scene()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  update public.production_records
     set scene_ids = array_remove(scene_ids, old.id)
   where project_id = old.project_id and old.id = any(scene_ids);
  return old;
end;
$function$;
REVOKE ALL ON FUNCTION internal.production_records_unlink_scene() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER production_records_unlink_scene AFTER DELETE ON public.scenes
  FOR EACH ROW EXECUTE FUNCTION internal.production_records_unlink_scene();

-- Backfill: match the typed text to a real scene or character only when the match is unambiguous (a scene number that exists
-- once in the project; a character name that matches exactly, as characters are stored: upper case). Anything else stays a label.
UPDATE public.production_records r
   SET scene_ids = m.ids
  FROM (
    SELECT r2.id,
           array_agg(DISTINCT sc.id) AS ids
      FROM public.production_records r2
      CROSS JOIN LATERAL regexp_split_to_table(
        regexp_replace(COALESCE(r2.data ->> 'scenes', r2.data ->> 'scene', ''), '[^0-9]+', ' ', 'g'), ' ') AS tok
      JOIN public.scenes sc ON sc.project_id = r2.project_id AND sc.removed_at IS NULL AND sc.scene_number::text = tok
     WHERE tok <> ''
       AND (SELECT count(*) FROM public.scenes s2 WHERE s2.project_id = r2.project_id AND s2.removed_at IS NULL AND s2.scene_number::text = tok) = 1
     GROUP BY r2.id
  ) m
 WHERE r.id = m.id AND r.kind IN ('cameraReports','soundReports','scriptNotes','directorNotes','vfxShots','costumes','makeup','rehearsals');

UPDATE public.production_records r
   SET character_id = c.id
  FROM public.characters c
 WHERE r.kind IN ('costumes','makeup') AND c.project_id = r.project_id AND c.name = upper(btrim(r.data ->> 'character'));
