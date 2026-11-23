-- Emergency details on the call sheet: the nearest hospital, the police and the set medic, as plain fields the production
-- types once per location. They are ordinary call sheet columns, so the existing project-scoped RLS applies unchanged
-- (the owner and crew who shape the project write them; the confirmed crew read them; an outsider sees nothing).
-- They go out with the issued snapshot and are compared by the "changed since issued" check; a snapshot issued before
-- this migration has none of the keys, which reads as empty, so an old issued sheet does not read as changed.
ALTER TABLE public.call_sheets
  ADD COLUMN hospital_name text,
  ADD COLUMN hospital_address text,
  ADD COLUMN hospital_phone text,
  ADD COLUMN police_phone text,
  ADD COLUMN medic text;
ALTER TABLE public.call_sheets
  ADD CONSTRAINT call_sheets_safety_len CHECK (
    char_length(hospital_name) <= 200 AND char_length(hospital_address) <= 500 AND char_length(hospital_phone) <= 60
    AND char_length(police_phone) <= 60 AND char_length(medic) <= 200
  );

CREATE OR REPLACE FUNCTION internal.call_sheet_snapshot(p_sheet uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'shoot_date', s.shoot_date,
    'general_call', s.general_call,
    'shooting_call', s.shooting_call,
    'estimated_wrap', s.estimated_wrap,
    'location_address', s.location_address,
    'weather', s.weather,
    'notes', s.notes,
    'calls', coalesce((select jsonb_object_agg(c.crew_user_id::text, jsonb_build_object('call_time', c.call_time, 'remarks', c.remarks))
                       from public.call_sheet_calls c where c.call_sheet_id = s.id and c.crew_user_id is not null), '{}'::jsonb),
    'cast_calls', coalesce((select jsonb_object_agg(c.character_name, jsonb_build_object('call_time', c.call_time, 'remarks', c.remarks))
                            from public.call_sheet_calls c where c.call_sheet_id = s.id and c.character_name is not null), '{}'::jsonb),
    'cast_by_id', coalesce((select jsonb_object_agg(c.character_id::text, jsonb_build_object('call_time', c.call_time, 'remarks', c.remarks, 'name', c.character_name))
                            from public.call_sheet_calls c where c.call_sheet_id = s.id and c.character_id is not null), '{}'::jsonb))
    -- Only the emergency fields that are filled in are written: a sheet with none issues the same snapshot as before this
    -- migration, so "nothing has changed" still holds for a re-issue of an old sheet.
    || jsonb_strip_nulls(jsonb_build_object(
      'hospital_name', s.hospital_name, 'hospital_address', s.hospital_address, 'hospital_phone', s.hospital_phone,
      'police_phone', s.police_phone, 'medic', s.medic))
  from public.call_sheets s where s.id = p_sheet;
$function$;

-- The revision notification also says when the emergency details changed.
CREATE OR REPLACE FUNCTION internal.call_sheet_message(snap jsonb, prev jsonb, p_project uuid, p_user uuid, p_note text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  mine jsonb := internal.call_sheet_call_for(snap, p_project, p_user);
  was jsonb;
  changes text[] := '{}';
  parts text[] := '{}';
  k text;
  labels text[] := array['shoot_date:date', 'general_call:general call', 'shooting_call:shooting call',
                         'estimated_wrap:wrap', 'location_address:location', 'weather:weather', 'notes:notes'];
  safety text[] := array['hospital_name', 'hospital_address', 'hospital_phone', 'police_phone', 'medic'];
begin
  if prev is not null then
    was := internal.call_sheet_call_for(prev, p_project, p_user);
    foreach k in array labels loop
      if (prev->>split_part(k, ':', 1)) is distinct from (snap->>split_part(k, ':', 1)) then
        changes := array_append(changes, split_part(k, ':', 2));
      end if;
    end loop;
    foreach k in array safety loop
      if coalesce(prev->>k, '') is distinct from coalesce(snap->>k, '') then
        changes := array_append(changes, 'emergency details');
        exit;
      end if;
    end loop;
    if (was->>'call_time') is distinct from (mine->>'call_time') then
      changes := array_append(changes, format('your call %s → %s',
        coalesce(left(was->>'call_time', 5), 'none'), coalesce(left(mine->>'call_time', 5), 'none')));
    elsif (was->>'remarks') is distinct from (mine->>'remarks') then
      changes := array_append(changes, 'your remarks');
    end if;
  end if;
  if coalesce(array_length(changes, 1), 0) > 0 then
    parts := array_append(parts, 'Changed: ' || array_to_string(changes, ', ') || '.');
  end if;
  if mine->>'call_time' is not null then
    parts := array_append(parts, 'Your call ' || left(mine->>'call_time', 5) || coalesce(' as ' || (mine->>'as'), '') || '.');
  elsif snap->>'general_call' is not null then
    parts := array_append(parts, 'General call ' || left(snap->>'general_call', 5) || '.');
  end if;
  if nullif(btrim(coalesce(mine->>'remarks', '')), '') is not null then
    parts := array_append(parts, (mine->>'remarks') || '.');
  end if;
  if nullif(btrim(coalesce(snap->>'location_address', '')), '') is not null then
    parts := array_append(parts, 'At ' || (snap->>'location_address') || '.');
  end if;
  if p_note is not null then
    parts := array_append(parts, p_note);
  end if;
  return nullif(left(array_to_string(parts, ' '), 1000), '');
end;
$function$;
