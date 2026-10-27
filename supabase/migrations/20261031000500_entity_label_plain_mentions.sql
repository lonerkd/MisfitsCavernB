-- A task's title can now carry mention tokens, `@[Label](entity-id)`. The graph
-- label of a task, document or media item (what the card and the picker show)
-- reads them as plain `@Label`.

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
  end;
  lbl := case tg_table_name
    when 'scenes' then (j->>'scene_number') || '. ' || coalesce(nullif(btrim(j->>'heading'), ''), j->>'title', '')
    when 'shoot_days' then 'Day ' || (j->>'day_number')
    when 'characters' then j->>'name'
    when 'project_locations' then j->>'name'
    else coalesce(nullif(btrim(regexp_replace(j->>'title', '@\[([^\]]*)\]\([0-9a-fA-F-]{36}\)', '@\1', 'g')), ''), 'Untitled')
  end;
  insert into public.entities (id, project_id, kind, label)
  values ((j->>'id')::uuid, (j->>'project_id')::uuid, k, left(coalesce(lbl, ''), 200))
  on conflict (id) do update set label = excluded.label, updated_at = now()
  where public.entities.label is distinct from excluded.label;
  return new;
end;
$function$;
