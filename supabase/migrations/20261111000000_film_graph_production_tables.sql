-- The film graph, slice B: the production tables join the graph.
--
-- Slice A (20261029000000) put the core film things in `entities` — scenes,
-- characters, locations, shoot days, tasks, documents, media — and linked them
-- by hand. But the production data lived outside it: shots, breakdown
-- elements, continuity states, castings, call sheets, notes, beats, cuts,
-- scripts, sound, vendors, budget lines and mood boards were not entities at
-- all, so the card could not show what they connect to and nothing could be
-- attached to them.
--
-- This migration adds those kinds, keeps their labels in sync with triggers,
-- backfills the rows that exist, and adds the edges the foreign keys already
-- imply (a shot belongs to its scene, a note to its scene and script, …).

-- ── 1. The kind list ────────────────────────────────────────────────────────
ALTER TABLE public.entities DROP CONSTRAINT IF EXISTS entities_kind_check;
ALTER TABLE public.entities ADD CONSTRAINT entities_kind_check
  CHECK (kind IN (
    'scene', 'character', 'location', 'shoot_day', 'task', 'document', 'media',
    'shot', 'breakdown_element', 'scene_state', 'casting', 'call_sheet',
    'note', 'beat', 'cut', 'script', 'sfx', 'vendor', 'budget_item', 'mood_board'
  ));

-- ── 2. The sync function, extended ───────────────────────────────────────────
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
  pid uuid;
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
    when 'shots' then 'shot'
    when 'breakdown_elements' then 'breakdown_element'
    when 'scene_states' then 'scene_state'
    when 'character_castings' then 'casting'
    when 'call_sheets' then 'call_sheet'
    when 'notes' then 'note'
    when 'project_beats' then 'beat'
    when 'post_cuts' then 'cut'
    when 'scripts' then 'script'
    when 'sfx_assets' then 'sfx'
    when 'vendors' then 'vendor'
    when 'budget_items' then 'budget_item'
    when 'mood_boards' then 'mood_board'
  end;
  -- A note with no project (a private one) has no place in a project's graph.
  if k is null or (k = 'note' and (j->>'project_id') is null) then
    return new;
  end if;
  pid := (j->>'project_id')::uuid;
  lbl := case tg_table_name
    when 'scenes' then (j->>'scene_number') || '. ' || coalesce(nullif(btrim(j->>'heading'), ''), j->>'title', '')
    when 'shoot_days' then 'Day ' || (j->>'day_number')
    when 'characters' then j->>'name'
    when 'project_locations' then j->>'name'
    when 'shots' then coalesce(nullif(btrim(j->>'shot_number'), ''), 'Shot')
    when 'breakdown_elements' then j->>'name'
    when 'scene_states' then 'Continuity'
    when 'character_castings' then j->>'character_name'
    when 'call_sheets' then 'Day ' || coalesce(j->>'shoot_day', '?')
    when 'notes' then left(coalesce(nullif(btrim(j->>'context'), ''), j->>'body', 'Note'), 80)
    when 'project_beats' then coalesce(nullif(btrim(j->>'title'), ''), 'Beat')
    when 'post_cuts' then j->>'title'
    when 'scripts' then j->>'title'
    when 'sfx_assets' then j->>'title'
    when 'vendors' then j->>'name'
    when 'budget_items' then coalesce(nullif(btrim(j->>'description'), ''), j->>'category', 'Budget line')
    when 'mood_boards' then j->>'name'
    else coalesce(nullif(btrim(j->>'title'), ''), 'Untitled')
  end;
  insert into public.entities (id, project_id, kind, label)
  values ((j->>'id')::uuid, pid, k, left(coalesce(lbl, ''), 200))
  on conflict (id) do update set label = excluded.label, updated_at = now()
  where public.entities.label is distinct from excluded.label;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.entity_sync() FROM PUBLIC, anon, authenticated;

-- ── 3. Triggers on the new tables ────────────────────────────────────────────
CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF shot_number ON public.shots
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.shots
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();

CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF name ON public.breakdown_elements
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.breakdown_elements
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();

CREATE TRIGGER entity_sync AFTER INSERT ON public.scene_states
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.scene_states
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();

CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF character_name ON public.character_castings
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.character_castings
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();

CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF shoot_day ON public.call_sheets
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.call_sheets
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();

CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF body, context ON public.notes
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();

CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF title ON public.project_beats
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.project_beats
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();

CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF title ON public.post_cuts
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.post_cuts
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();

CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF title ON public.scripts
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.scripts
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();

CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF title ON public.sfx_assets
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.sfx_assets
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();

CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF name ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();

CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF description, category ON public.budget_items
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.budget_items
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();

CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF name ON public.mood_boards
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.mood_boards
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();

-- ── 4. Backfill the entities ─────────────────────────────────────────────────
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'shot', left(coalesce(nullif(btrim(shot_number), ''), 'Shot'), 200) FROM public.shots
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'breakdown_element', left(name, 200) FROM public.breakdown_elements
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'scene_state', 'Continuity' FROM public.scene_states
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'casting', left(character_name, 200) FROM public.character_castings
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'call_sheet', 'Day ' || shoot_day FROM public.call_sheets
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'note', left(coalesce(nullif(btrim(context), ''), body, 'Note'), 80) FROM public.notes WHERE project_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'beat', left(coalesce(nullif(btrim(title), ''), 'Beat'), 200) FROM public.project_beats
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'cut', left(title, 200) FROM public.post_cuts
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'script', left(title, 200) FROM public.scripts
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'sfx', left(title, 200) FROM public.sfx_assets
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'vendor', left(name, 200) FROM public.vendors
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'budget_item', left(coalesce(nullif(btrim(description), ''), category, 'Budget line'), 200) FROM public.budget_items
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'mood_board', left(name, 200) FROM public.mood_boards
ON CONFLICT (id) DO NOTHING;

-- ── 5. The edges the foreign keys imply ──────────────────────────────────────
-- A shot is in its scene.
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT se.project_id, se.id, se.scene_id, 'in' FROM public.shots se
JOIN public.entities e ON e.id = se.id
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
-- A breakdown element is tagged in its scenes.
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT se.project_id, se.element_id, se.scene_id, 'in' FROM public.scene_elements se
JOIN public.entities e ON e.id = se.element_id
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
-- A continuity state is about its scene and its character.
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT ss.project_id, ss.id, ss.scene_id, 'continuity' FROM public.scene_states ss
JOIN public.entities e ON e.id = ss.id
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT ss.project_id, ss.id, ss.character_id, 'continuity' FROM public.scene_states ss
JOIN public.entities e ON e.id = ss.id
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
-- A casting is of its character (by name, the way the graph joins people).
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT cc.project_id, cc.id, c.id, 'plays' FROM public.character_castings cc
JOIN public.characters c ON c.project_id = cc.project_id AND upper(btrim(c.name)) = upper(btrim(cc.character_name))
JOIN public.entities e ON e.id = cc.id
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
-- A call sheet is for its shoot day.
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT cs.project_id, cs.id, d.id, 'for' FROM public.call_sheets cs
JOIN public.shoot_days d ON d.project_id = cs.project_id AND d.day_number = cs.shoot_day
JOIN public.entities e ON e.id = cs.id
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
-- A note is on its scene and its script.
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT n.project_id, n.id, n.scene_id, 'on' FROM public.notes n
JOIN public.entities e ON e.id = n.id
WHERE n.scene_id IS NOT NULL
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT n.project_id, n.id, n.script_id, 'on' FROM public.notes n
JOIN public.entities e ON e.id = n.id
WHERE n.script_id IS NOT NULL
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
-- A beat belongs to its script.
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT b.project_id, b.id, b.script_id, 'in' FROM public.project_beats b
JOIN public.entities e ON e.id = b.id
WHERE b.script_id IS NOT NULL
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
-- A cut is made from its media.
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT pc.project_id, pc.id, pc.media_id, 'from' FROM public.post_cuts pc
JOIN public.entities e ON e.id = pc.id
WHERE pc.media_id IS NOT NULL
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
-- A scene belongs to its script (the script is an entity now).
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT s.project_id, s.id, s.script_id, 'in' FROM public.scenes s
JOIN public.entities e ON e.id = s.id
WHERE s.script_id IS NOT NULL
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
