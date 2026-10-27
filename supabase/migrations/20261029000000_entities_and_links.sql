-- The link layer (spec: .cavern-intelligence/plans/2026-10-27-link-layer-and-card.md, slice A).
--
--   entities  one identity row per linkable thing — its id IS the source row's
--             id. Written only by triggers on the source tables; nobody can
--             write it through the API.
--   links     a typed edge between two entities of the same project. Composite
--             foreign keys mean a link can't cross projects or dangle; deleting
--             a thing deletes its links.
-- First kinds: scene, character, location, shoot_day, task, document, media.

CREATE TABLE public.entities (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('scene', 'character', 'location', 'shoot_day', 'task', 'document', 'media')),
  label text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, project_id)
);
CREATE INDEX entities_project_idx ON public.entities (project_id, kind);

ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entities read" ON public.entities FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id));
REVOKE ALL ON public.entities FROM anon, authenticated;
GRANT SELECT ON public.entities TO authenticated;

CREATE TABLE public.links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  from_entity uuid NOT NULL,
  to_entity uuid NOT NULL,
  kind text NOT NULL DEFAULT 'about' CHECK (char_length(kind) BETWEEN 1 AND 40),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT links_from_fkey FOREIGN KEY (from_entity, project_id) REFERENCES public.entities (id, project_id) ON DELETE CASCADE,
  CONSTRAINT links_to_fkey FOREIGN KEY (to_entity, project_id) REFERENCES public.entities (id, project_id) ON DELETE CASCADE,
  CONSTRAINT links_distinct CHECK (from_entity <> to_entity),
  CONSTRAINT links_unique UNIQUE (from_entity, to_entity, kind)
);
CREATE INDEX links_to_idx ON public.links (to_entity);
CREATE INDEX links_project_idx ON public.links (project_id);
CREATE INDEX links_created_by_idx ON public.links (created_by);
CREATE INDEX links_from_project_idx ON public.links (from_entity, project_id);
CREATE INDEX links_to_project_idx ON public.links (to_entity, project_id);

ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
-- Anyone on the project reads and attaches; the creator or someone who shapes the project removes.
CREATE POLICY "links read" ON public.links FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id));
CREATE POLICY "links insert" ON public.links FOR INSERT TO authenticated
  WITH CHECK (internal.can_access_project(project_id) AND created_by = (select auth.uid()));
CREATE POLICY "links delete" ON public.links FOR DELETE TO authenticated
  USING (created_by = (select auth.uid()) OR internal.can_shape_project(project_id));
REVOKE ALL ON public.links FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.links TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.links;

-- The only writer of entities: keeps one row per source row, with its display label.
CREATE FUNCTION internal.entity_sync()
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
  end;
  lbl := case tg_table_name
    when 'scenes' then (j->>'scene_number') || '. ' || coalesce(nullif(btrim(j->>'heading'), ''), j->>'title', '')
    when 'shoot_days' then 'Day ' || (j->>'day_number')
    when 'characters' then j->>'name'
    when 'project_locations' then j->>'name'
    else coalesce(nullif(btrim(j->>'title'), ''), 'Untitled')
  end;
  insert into public.entities (id, project_id, kind, label)
  values ((j->>'id')::uuid, (j->>'project_id')::uuid, k, left(coalesce(lbl, ''), 200))
  on conflict (id) do update set label = excluded.label, updated_at = now()
  where public.entities.label is distinct from excluded.label;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.entity_sync() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF scene_number, heading, title ON public.scenes
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.scenes
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF name ON public.characters
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.characters
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF name ON public.project_locations
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.project_locations
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF day_number ON public.shoot_days
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.shoot_days
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF title ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF title ON public.project_documents
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.project_documents
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF title ON public.media
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.media
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();

-- Backfill: an entity for every row that exists now.
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'scene', left(scene_number::text || '. ' || coalesce(nullif(btrim(heading), ''), title, ''), 200) FROM public.scenes
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'character', left(name, 200) FROM public.characters
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'location', left(name, 200) FROM public.project_locations
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'shoot_day', 'Day ' || day_number FROM public.shoot_days
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'task', left(coalesce(nullif(btrim(title), ''), 'Untitled'), 200) FROM public.project_tasks
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'document', left(coalesce(nullif(btrim(title), ''), 'Untitled'), 200) FROM public.project_documents
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'media', left(coalesce(nullif(btrim(title), ''), 'Untitled'), 200) FROM public.media
ON CONFLICT (id) DO NOTHING;
