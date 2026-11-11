-- The film graph, slice C: the sub-items, the process records and the script
-- internals. Slice B (20261111000000) brought in the production tables; this
-- brings in everything else that belongs to a film.
--
--   sub-items        mood_board_items (scene_media / character_media are joins)
--   process records  expenses, timesheets, set_log, post_items, timeline_items
--   script internals script_revisions, script_stash
--
-- `scene_media` and `character_media` are not entities: they are pure join
-- tables (composite primary key, no id) and the media they point at is already
-- an entity — the edge between them and their scene/character is written below.
-- `reports` is cross-project (it has no project_id) and stays out.
-- `deliverables` is keyed by script_id, which is already the script's entity.

-- ── 1. The kind list ────────────────────────────────────────────────────────
ALTER TABLE public.entities DROP CONSTRAINT IF EXISTS entities_kind_check;
ALTER TABLE public.entities ADD CONSTRAINT entities_kind_check
  CHECK (kind IN (
    'scene', 'character', 'location', 'shoot_day', 'task', 'document', 'media',
    'shot', 'breakdown_element', 'scene_state', 'casting', 'call_sheet',
    'note', 'beat', 'cut', 'script', 'sfx', 'vendor', 'budget_item', 'mood_board',
    'mood_board_item', 'scene_reference', 'character_reference',
    'expense', 'timesheet', 'set_log', 'post_item', 'timeline_item',
    'script_revision', 'script_version', 'stash_item'
  ));

-- ── 2. The sync function, extended again ─────────────────────────────────────
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
    when 'mood_board_items' then 'mood_board_item'
    when 'expenses' then 'expense'
    when 'timesheets' then 'timesheet'
    when 'set_log' then 'set_log'
    when 'post_items' then 'post_item'
    when 'timeline_items' then 'timeline_item'
    when 'script_revisions' then 'script_revision'
    when 'script_stash' then 'stash_item'
  end;
  -- A note with no project (a private one) has no place in a project's graph.
  if k is null or (k = 'note' and (j->>'project_id') is null) then
    return new;
  end if;
  -- The script internals have no project_id of their own; the script carries it.
  if k in ('script_revision', 'script_version', 'stash_item') then
    select s.project_id into pid from public.scripts s where s.id = (j->>'script_id')::uuid;
  else
    pid := (j->>'project_id')::uuid;
  end if;
  if pid is null then
    return new;
  end if;
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
    when 'mood_board_items' then left(coalesce(nullif(btrim(j->>'note'), ''), 'Board item'), 80)
    when 'expenses' then left(coalesce(nullif(btrim(j->>'description'), ''), 'Expense'), 120)
    when 'timesheets' then coalesce(j->>'work_date', '') || ' · ' || coalesce(j->>'hours', '') || 'h'
    when 'set_log' then coalesce(j->>'kind', 'Log')
    when 'post_items' then j->>'title'
    when 'timeline_items' then j->>'title'
    when 'script_revisions' then j->>'label'
    when 'script_stash' then left(coalesce(j->>'text', 'Snippet'), 80)
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
CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF note, media_id ON public.mood_board_items
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.mood_board_items
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF description ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF work_date, hours ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF kind ON public.set_log
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.set_log
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF title ON public.post_items
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.post_items
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF title ON public.timeline_items
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.timeline_items
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF label ON public.script_revisions
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.script_revisions
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync AFTER INSERT OR UPDATE OF text ON public.script_stash
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();
CREATE TRIGGER entity_sync_delete AFTER DELETE ON public.script_stash
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync();

-- ── 4. Backfill the entities ─────────────────────────────────────────────────
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'mood_board_item', left(coalesce(nullif(btrim(note), ''), 'Board item'), 80) FROM public.mood_board_items
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'expense', left(coalesce(nullif(btrim(description), ''), 'Expense'), 120) FROM public.expenses
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'timesheet', coalesce(work_date::text, '') || ' · ' || coalesce(hours::text, '') || 'h' FROM public.timesheets
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'set_log', coalesce(kind, 'Log') FROM public.set_log
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'post_item', left(title, 200) FROM public.post_items
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT id, project_id, 'timeline_item', left(title, 200) FROM public.timeline_items
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT r.id, s.project_id, 'script_revision', left(r.label, 200) FROM public.script_revisions r JOIN public.scripts s ON s.id = r.script_id
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.entities (id, project_id, kind, label)
SELECT st.id, s.project_id, 'stash_item', left(coalesce(st.text, 'Snippet'), 80) FROM public.script_stash st JOIN public.scripts s ON s.id = st.script_id
ON CONFLICT (id) DO NOTHING;

-- ── 5. The edges ─────────────────────────────────────────────────────────────
-- A mood-board item is on its board.
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT mbi.project_id, mbi.id, mbi.board_id, 'on' FROM public.mood_board_items mbi
JOIN public.entities e ON e.id = mbi.id
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
-- An expense is against its budget line, its vendor and its receipt.
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT ex.project_id, ex.id, ex.budget_item_id, 'against' FROM public.expenses ex
JOIN public.entities e ON e.id = ex.id WHERE ex.budget_item_id IS NOT NULL
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT ex.project_id, ex.id, ex.vendor_id, 'to' FROM public.expenses ex
JOIN public.entities e ON e.id = ex.id WHERE ex.vendor_id IS NOT NULL
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT ex.project_id, ex.id, ex.receipt_media_id, 'receipt' FROM public.expenses ex
JOIN public.entities e ON e.id = ex.id WHERE ex.receipt_media_id IS NOT NULL
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
-- A set-log entry is on its call sheet, and about its scene / shot / media.
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT sl.project_id, sl.id, sl.call_sheet_id, 'on' FROM public.set_log sl
JOIN public.entities e ON e.id = sl.id WHERE sl.call_sheet_id IS NOT NULL
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT sl.project_id, sl.id, sl.scene_id, 'log' FROM public.set_log sl
JOIN public.entities e ON e.id = sl.id WHERE sl.scene_id IS NOT NULL
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT sl.project_id, sl.id, sl.shot_id, 'log' FROM public.set_log sl
JOIN public.entities e ON e.id = sl.id WHERE sl.shot_id IS NOT NULL
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT sl.project_id, sl.id, sl.media_id, 'log' FROM public.set_log sl
JOIN public.entities e ON e.id = sl.id WHERE sl.media_id IS NOT NULL
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
-- A revision, a version and a stash item belong to their script.
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT s.project_id, r.id, r.script_id, 'revision' FROM public.script_revisions r JOIN public.scripts s ON s.id = r.script_id
JOIN public.entities e ON e.id = r.id
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT s.project_id, st.id, st.script_id, 'stash' FROM public.script_stash st JOIN public.scripts s ON s.id = st.script_id
JOIN public.entities e ON e.id = st.id
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
-- A scene's and a character's media is already an edge (the media is an entity).
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT sm.project_id, sm.scene_id, sm.media_id, 'shows' FROM public.scene_media sm
JOIN public.entities e ON e.id = sm.scene_id
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
INSERT INTO public.links (project_id, from_entity, to_entity, kind)
SELECT cm.project_id, cm.character_id, cm.media_id, 'shows' FROM public.character_media cm
JOIN public.entities e ON e.id = cm.character_id
ON CONFLICT (from_entity, to_entity, kind) DO NOTHING;
