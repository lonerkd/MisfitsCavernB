-- The link half of slice B. The entity triggers (20261111000000) keep one
-- `entities` row per production thing; this migration keeps the `links` edges
-- in step too, so a shot inserted tomorrow is linked to its scene the way a
-- shot inserted yesterday was by the backfill.
--
-- One function, `internal.entity_sync_link()`, reads the new row's foreign
-- keys and writes the edges the graph implies. It never duplicates (the unique
-- constraint on (from, to, kind) is the guard) and it is a no-op for a row with
-- nothing to link.

CREATE FUNCTION internal.entity_sync_link()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  j jsonb;
  pid uuid;
  sid uuid;
  cid uuid;
  scid uuid;
  mid uuid;
begin
  j := to_jsonb(new);
  pid := (j->>'project_id')::uuid;

  case tg_table_name
    when 'shots' then
      insert into public.links (project_id, from_entity, to_entity, kind)
      values (pid, (j->>'id')::uuid, (j->>'scene_id')::uuid, 'in')
      on conflict (from_entity, to_entity, kind) do nothing;
    when 'scene_elements' then
      insert into public.links (project_id, from_entity, to_entity, kind)
      values (pid, (j->>'element_id')::uuid, (j->>'scene_id')::uuid, 'in')
      on conflict (from_entity, to_entity, kind) do nothing;
    when 'scene_states' then
      insert into public.links (project_id, from_entity, to_entity, kind)
      values (pid, (j->>'id')::uuid, (j->>'scene_id')::uuid, 'continuity')
      on conflict (from_entity, to_entity, kind) do nothing;
      insert into public.links (project_id, from_entity, to_entity, kind)
      values (pid, (j->>'id')::uuid, (j->>'character_id')::uuid, 'continuity')
      on conflict (from_entity, to_entity, kind) do nothing;
    when 'character_castings' then
      -- The casting names its character; the graph joins by id.
      select id into cid from public.characters c
        where c.project_id = pid and upper(btrim(c.name)) = upper(btrim(j->>'character_name'))
        limit 1;
      if cid is not null then
        insert into public.links (project_id, from_entity, to_entity, kind)
        values (pid, (j->>'id')::uuid, cid, 'plays')
        on conflict (from_entity, to_entity, kind) do nothing;
      end if;
    when 'call_sheets' then
      select id into sid from public.shoot_days d
        where d.project_id = pid and d.day_number = (j->>'shoot_day')::int
        limit 1;
      if sid is not null then
        insert into public.links (project_id, from_entity, to_entity, kind)
        values (pid, (j->>'id')::uuid, sid, 'for')
        on conflict (from_entity, to_entity, kind) do nothing;
      end if;
    when 'notes' then
      if (j->>'scene_id') is not null then
        insert into public.links (project_id, from_entity, to_entity, kind)
        values (pid, (j->>'id')::uuid, (j->>'scene_id')::uuid, 'on')
        on conflict (from_entity, to_entity, kind) do nothing;
      end if;
      if (j->>'script_id') is not null then
        insert into public.links (project_id, from_entity, to_entity, kind)
        values (pid, (j->>'id')::uuid, (j->>'script_id')::uuid, 'on')
        on conflict (from_entity, to_entity, kind) do nothing;
      end if;
    when 'project_beats' then
      if (j->>'script_id') is not null then
        insert into public.links (project_id, from_entity, to_entity, kind)
        values (pid, (j->>'id')::uuid, (j->>'script_id')::uuid, 'in')
        on conflict (from_entity, to_entity, kind) do nothing;
      end if;
    when 'post_cuts' then
      if (j->>'media_id') is not null then
        insert into public.links (project_id, from_entity, to_entity, kind)
        values (pid, (j->>'id')::uuid, (j->>'media_id')::uuid, 'from')
        on conflict (from_entity, to_entity, kind) do nothing;
      end if;
    when 'scenes' then
      if (j->>'script_id') is not null then
        insert into public.links (project_id, from_entity, to_entity, kind)
        values (pid, (j->>'id')::uuid, (j->>'script_id')::uuid, 'in')
        on conflict (from_entity, to_entity, kind) do nothing;
      end if;
    else
      null;
  end case;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.entity_sync_link() FROM PUBLIC, anon, authenticated;

-- The link edges follow the same rows the entity triggers do.
CREATE TRIGGER entity_sync_link AFTER INSERT ON public.shots
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync_link();
CREATE TRIGGER entity_sync_link AFTER INSERT ON public.scene_elements
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync_link();
CREATE TRIGGER entity_sync_link AFTER INSERT ON public.scene_states
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync_link();
CREATE TRIGGER entity_sync_link AFTER INSERT ON public.character_castings
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync_link();
CREATE TRIGGER entity_sync_link AFTER INSERT ON public.call_sheets
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync_link();
CREATE TRIGGER entity_sync_link AFTER INSERT ON public.notes
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync_link();
CREATE TRIGGER entity_sync_link AFTER INSERT ON public.project_beats
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync_link();
CREATE TRIGGER entity_sync_link AFTER INSERT ON public.post_cuts
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync_link();
CREATE TRIGGER entity_sync_link AFTER INSERT ON public.scenes
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync_link();

-- A deleted thing takes its edges with it (the links cascade on the entity, but
-- the hand-written ones from this table need the same treatment).
CREATE FUNCTION internal.entity_sync_link_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  delete from public.links where from_entity = old.id or to_entity = old.id;
  return old;
end;
$function$;
REVOKE ALL ON FUNCTION internal.entity_sync_link_delete() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER entity_sync_link_delete AFTER DELETE ON public.shots
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync_link_delete();
CREATE TRIGGER entity_sync_link_delete AFTER DELETE ON public.scene_elements
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync_link_delete();
CREATE TRIGGER entity_sync_link_delete AFTER DELETE ON public.scene_states
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync_link_delete();
CREATE TRIGGER entity_sync_link_delete AFTER DELETE ON public.character_castings
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync_link_delete();
CREATE TRIGGER entity_sync_link_delete AFTER DELETE ON public.call_sheets
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync_link_delete();
CREATE TRIGGER entity_sync_link_delete AFTER DELETE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync_link_delete();
CREATE TRIGGER entity_sync_link_delete AFTER DELETE ON public.project_beats
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync_link_delete();
CREATE TRIGGER entity_sync_link_delete AFTER DELETE ON public.post_cuts
  FOR EACH ROW EXECUTE FUNCTION internal.entity_sync_link_delete();
