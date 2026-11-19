-- A margin note becomes a thing in the film graph (BACKLOG 3.18, editor rung E5): an entity of kind `note` under the annotation's own id,
-- so it has a card, can be attached to scenes, characters, places, tasks, documents and media, and a note about a scene is linked to the
-- scene by id (it follows the scene through rewrites, which a line number does not). Plain notes only (note, revision, reference): a shot,
-- a beat and a to-do already become their own things. Same visibility as the note itself: the annotation's readers are the project's
-- creator and members, who are exactly who reads entities.

ALTER TABLE public.entities DROP CONSTRAINT entities_kind_check;
ALTER TABLE public.entities ADD CONSTRAINT entities_kind_check
  CHECK (kind IN ('scene', 'character', 'location', 'shoot_day', 'task', 'document', 'media', 'deliverable', 'ad_reference', 'brand_rule', 'note'));

CREATE OR REPLACE FUNCTION internal.entity_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  j jsonb;
  k text;
  lbl text;
begin
  if tg_op = 'DELETE' then
    delete from public.entities where id = old.id;
    return old;
  end if;
  j := to_jsonb(new);
  k := case tg_table_name
    when 'scenes' then 'scene'
    when 'characters' then 'character'
    when 'project_locations' then 'location'
    when 'shoot_days' then 'shoot_day'
    when 'project_tasks' then 'task'
    when 'project_documents' then 'document'
    when 'media' then 'media'
    when 'script_annotations' then 'note'
  end;
  lbl := case tg_table_name
    when 'scenes' then (j->>'scene_number') || '. ' || coalesce(nullif(btrim(j->>'heading'), ''), j->>'title', '')
    when 'shoot_days' then 'Day ' || (j->>'day_number')
    when 'characters' then j->>'name'
    when 'project_locations' then j->>'name'
    when 'script_annotations' then coalesce(nullif(btrim(regexp_replace(j->>'text', '\s+', ' ', 'g')), ''), 'Note')
    else coalesce(nullif(btrim(regexp_replace(j->>'title', '@\[([^\]]*)\]\([0-9a-fA-F-]{36}\)', '@\1', 'g')), ''), 'Untitled')
  end;
  insert into public.entities (id, project_id, kind, label)
  values ((j->>'id')::uuid, (j->>'project_id')::uuid, k, left(coalesce(lbl, ''), 200))
  on conflict (id) do update set label = excluded.label, updated_at = now()
  where public.entities.label is distinct from excluded.label;
  return new;
end;
$function$;

CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF text ON public.script_annotations
  FOR EACH ROW WHEN (new.type IN ('note', 'revision', 'reference')) EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.script_annotations
  FOR EACH ROW WHEN (old.type IN ('note', 'revision', 'reference')) EXECUTE FUNCTION internal.entity_sync();

-- Backfill: an entity for every plain note that exists now.
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'note', left(coalesce(nullif(btrim(regexp_replace(text, '\s+', ' ', 'g')), ''), 'Note'), 200)
FROM public.script_annotations WHERE type IN ('note', 'revision', 'reference')
ON CONFLICT (id) DO NOTHING;
