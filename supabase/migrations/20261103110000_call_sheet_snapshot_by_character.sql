-- An issued call sheet files a cast call under the character's id as well as the name it had when issued, so a character
-- renamed after issuing still reaches the cast member's own call. `cast_calls` (by name) stays for sheets already issued
-- and for readers that use it; `cast_by_id` is what the call lookup prefers. Nothing is backfilled: an old snapshot keeps
-- working by name until its sheet is next issued.
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
  from public.call_sheets s where s.id = p_sheet;
$function$;

-- One person's call in a snapshot: their own, else the call of a role they're cast in — found by the character's id when
-- the snapshot has it, by name otherwise.
CREATE OR REPLACE FUNCTION internal.call_sheet_call_for(snap jsonb, p_project uuid, p_user uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(
    snap->'calls'->(p_user::text),
    (select (snap->'cast_by_id'->(cc.character_id::text)) - 'name' || jsonb_build_object('as', coalesce(ch.name, cc.character_name))
       from public.character_castings cc
       left join public.characters ch on ch.id = cc.character_id
      where cc.project_id = p_project and cc.crew_user_id = p_user and cc.character_id is not null
        and (snap->'cast_by_id') ? (cc.character_id::text)
      order by cc.character_name
      limit 1),
    (select (snap->'cast_calls'->cc.character_name) || jsonb_build_object('as', cc.character_name)
       from public.character_castings cc
      where cc.project_id = p_project and cc.crew_user_id = p_user and (snap->'cast_calls') ? cc.character_name
      order by cc.character_name
      limit 1));
$function$;
