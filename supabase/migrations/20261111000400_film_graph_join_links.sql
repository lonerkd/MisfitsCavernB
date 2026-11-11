-- The join tables (scene_media, character_media) also write a graph edge: a
-- scene "shows" its media, a character "shows" theirs. The backfill in slice C
-- covered the rows that existed; these triggers cover the ones added later.

CREATE OR REPLACE FUNCTION internal.entity_link_sync()
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
    when 'mood_board_items' then
      insert into public.links (project_id, from_entity, to_entity, kind)
      values (pid, (j->>'id')::uuid, (j->>'board_id')::uuid, 'on')
      on conflict (from_entity, to_entity, kind) do nothing;
    when 'expenses' then
      if (j->>'budget_item_id') is not null then
        insert into public.links (project_id, from_entity, to_entity, kind)
        values (pid, (j->>'id')::uuid, (j->>'budget_item_id')::uuid, 'against')
        on conflict (from_entity, to_entity, kind) do nothing;
      end if;
      if (j->>'vendor_id') is not null then
        insert into public.links (project_id, from_entity, to_entity, kind)
        values (pid, (j->>'id')::uuid, (j->>'vendor_id')::uuid, 'to')
        on conflict (from_entity, to_entity, kind) do nothing;
      end if;
      if (j->>'receipt_media_id') is not null then
        insert into public.links (project_id, from_entity, to_entity, kind)
        values (pid, (j->>'id')::uuid, (j->>'receipt_media_id')::uuid, 'receipt')
        on conflict (from_entity, to_entity, kind) do nothing;
      end if;
    when 'set_log' then
      if (j->>'call_sheet_id') is not null then
        insert into public.links (project_id, from_entity, to_entity, kind)
        values (pid, (j->>'id')::uuid, (j->>'call_sheet_id')::uuid, 'on')
        on conflict (from_entity, to_entity, kind) do nothing;
      end if;
      if (j->>'scene_id') is not null then
        insert into public.links (project_id, from_entity, to_entity, kind)
        values (pid, (j->>'id')::uuid, (j->>'scene_id')::uuid, 'log')
        on conflict (from_entity, to_entity, kind) do nothing;
      end if;
      if (j->>'shot_id') is not null then
        insert into public.links (project_id, from_entity, to_entity, kind)
        values (pid, (j->>'id')::uuid, (j->>'shot_id')::uuid, 'log')
        on conflict (from_entity, to_entity, kind) do nothing;
      end if;
      if (j->>'media_id') is not null then
        insert into public.links (project_id, from_entity, to_entity, kind)
        values (pid, (j->>'id')::uuid, (j->>'media_id')::uuid, 'log')
        on conflict (from_entity, to_entity, kind) do nothing;
      end if;
    when 'script_revisions' then
      select s.project_id into pid from public.scripts s where s.id = (j->>'script_id')::uuid;
      insert into public.links (project_id, from_entity, to_entity, kind)
      values (pid, (j->>'id')::uuid, (j->>'script_id')::uuid, 'revision')
      on conflict (from_entity, to_entity, kind) do nothing;
    when 'script_stash' then
      select s.project_id into pid from public.scripts s where s.id = (j->>'script_id')::uuid;
      insert into public.links (project_id, from_entity, to_entity, kind)
      values (pid, (j->>'id')::uuid, (j->>'script_id')::uuid, 'stash')
      on conflict (from_entity, to_entity, kind) do nothing;
    -- The join tables: the scene/character "shows" its media.
    when 'scene_media' then
      insert into public.links (project_id, from_entity, to_entity, kind)
      values (pid, (j->>'scene_id')::uuid, (j->>'media_id')::uuid, 'shows')
      on conflict (from_entity, to_entity, kind) do nothing;
    when 'character_media' then
      insert into public.links (project_id, from_entity, to_entity, kind)
      values (pid, (j->>'character_id')::uuid, (j->>'media_id')::uuid, 'shows')
      on conflict (from_entity, to_entity, kind) do nothing;
    else
      null;
  end case;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.entity_link_sync() FROM PUBLIC, anon, authenticated;

-- The join tables have no entity trigger (they have no id); these run on insert.
CREATE TRIGGER entity_sync_link AFTER INSERT ON public.scene_media
  FOR EACH ROW EXECUTE FUNCTION internal.entity_link_sync();
CREATE TRIGGER entity_sync_link AFTER INSERT ON public.character_media
  FOR EACH ROW EXECUTE FUNCTION internal.entity_link_sync();
