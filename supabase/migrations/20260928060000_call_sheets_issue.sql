-- Call sheets reach the crew.
--
-- A call sheet stays a live draft until the owner or a lead issues it
-- (issue_call_sheet). Issuing stamps a version and a snapshot of what went
-- out, and tells everyone on the production — each person's own call, where,
-- and on a revision what changed since the last version ("your call 06:30 →
-- 07:00, location"). The crew confirm they've seen it (ack_call_sheet); the
-- sheet shows who has. The day before (and on the day, if issued late) an
-- hourly job reminds everyone once (send_call_sheet_reminders, pg_cron).
--
-- The issue columns are written only by these functions (call_sheets_issue_guard).

ALTER TABLE public.call_sheets
  ADD COLUMN version integer DEFAULT 0 NOT NULL,
  ADD COLUMN issued_at timestamp with time zone,
  ADD COLUMN issued_by uuid,
  ADD COLUMN issued jsonb,
  ADD COLUMN reminded_at timestamp with time zone;
ALTER TABLE public.call_sheets
  ADD CONSTRAINT call_sheets_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT call_sheets_issue_shape CHECK (version >= 0 AND (version = 0) = (issued_at IS NULL) AND (version = 0) = (issued IS NULL));

CREATE FUNCTION internal.call_sheets_issue_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if current_setting('mc.issuing_call_sheet', true) = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.version <> 0 or new.issued_at is not null or new.issued_by is not null or new.issued is not null or new.reminded_at is not null then
      raise exception 'Call sheets are issued with issue_call_sheet()' using errcode = '42501';
    end if;
  elsif (new.version, new.issued_at, new.issued_by, new.issued, new.reminded_at)
        is distinct from (old.version, old.issued_at, old.issued_by, old.issued, old.reminded_at) then
    raise exception 'Call sheets are issued with issue_call_sheet()' using errcode = '42501';
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.call_sheets_issue_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER call_sheets_issue_guard BEFORE INSERT OR UPDATE ON public.call_sheets
  FOR EACH ROW EXECUTE FUNCTION internal.call_sheets_issue_guard();

-- What an issue sends out: the sheet's fields and every call on it.
CREATE FUNCTION internal.call_sheet_snapshot(p_sheet uuid)
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
                            from public.call_sheet_calls c where c.call_sheet_id = s.id and c.character_name is not null), '{}'::jsonb))
  from public.call_sheets s where s.id = p_sheet;
$function$;
REVOKE ALL ON FUNCTION internal.call_sheet_snapshot(uuid) FROM PUBLIC, anon, authenticated;

-- One person's call in a snapshot: their own, else the call of a role they're cast in.
CREATE FUNCTION internal.call_sheet_call_for(snap jsonb, p_project uuid, p_user uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(
    snap->'calls'->(p_user::text),
    (select (snap->'cast_calls'->cc.character_name) || jsonb_build_object('as', cc.character_name)
       from public.character_castings cc
      where cc.project_id = p_project and cc.crew_user_id = p_user and (snap->'cast_calls') ? cc.character_name
      order by cc.character_name
      limit 1));
$function$;
REVOKE ALL ON FUNCTION internal.call_sheet_call_for(jsonb, uuid, uuid) FROM PUBLIC, anon, authenticated;

-- The notification body for one person: what changed (on a revision), their
-- call, where, and the issuer's note.
CREATE FUNCTION internal.call_sheet_message(snap jsonb, prev jsonb, p_project uuid, p_user uuid, p_note text)
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
begin
  if prev is not null then
    was := internal.call_sheet_call_for(prev, p_project, p_user);
    foreach k in array labels loop
      if (prev->>split_part(k, ':', 1)) is distinct from (snap->>split_part(k, ':', 1)) then
        changes := array_append(changes, split_part(k, ':', 2));
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
REVOKE ALL ON FUNCTION internal.call_sheet_message(jsonb, jsonb, uuid, uuid, text) FROM PUBLIC, anon, authenticated;

-- Who hears about a project's call sheets: its owner and confirmed crew
-- (crew only while the project isn't private — as can_access_project).
CREATE FUNCTION internal.call_sheet_recipients(p_project uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select p.creator_id from public.projects p where p.id = p_project
  union
  select c.user_id from public.project_crew c join public.projects p on p.id = c.project_id
   where c.project_id = p_project and coalesce(c.status, 'confirmed') = 'confirmed' and p.visibility <> 'private';
$function$;
REVOKE ALL ON FUNCTION internal.call_sheet_recipients(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.issue_call_sheet(p_sheet uuid, p_note text DEFAULT NULL)
 RETURNS public.call_sheets
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s public.call_sheets;
  snap jsonb;
  prev jsonb;
  who uuid;
  me uuid := (select auth.uid());
  note text := nullif(btrim(coalesce(p_note, '')), '');
  title text;
  project_title text;
  reminded timestamptz;
begin
  select * into s from public.call_sheets where id = p_sheet for update;
  if not found or not internal.can_access_project(s.project_id) then
    raise exception 'Call sheet not found' using errcode = 'P0002';
  end if;
  if not internal.can_shape_project(s.project_id) then
    raise exception 'Only the owner and leads issue call sheets' using errcode = '42501';
  end if;
  if s.shoot_date is null then
    raise exception 'Date the shoot day before issuing its call sheet' using errcode = '22023';
  end if;
  if char_length(note) > 500 then
    raise exception 'Keep the note under 500 characters' using errcode = '22023';
  end if;

  snap := internal.call_sheet_snapshot(s.id);
  prev := s.issued;
  if prev is not null and prev = snap and note is null then
    raise exception 'Nothing has changed since v%', s.version using errcode = '22023';
  end if;
  -- A moved date earns a fresh reminder.
  reminded := s.reminded_at;
  if (prev->>'shoot_date') is distinct from (snap->>'shoot_date') then
    reminded := null;
  end if;

  perform set_config('mc.issuing_call_sheet', 'on', true);
  update public.call_sheets
     set version = version + 1, issued_at = now(), issued_by = me, issued = snap, reminded_at = reminded
   where id = s.id
  returning * into s;
  perform set_config('mc.issuing_call_sheet', 'off', true);

  select p.title into project_title from public.projects p where p.id = s.project_id;
  title := format('%s — call sheet · Day %s · %s', project_title, s.shoot_day, to_char(s.shoot_date, 'Dy FMDD Mon'));
  if s.version > 1 then
    title := format('%s — revised call sheet (v%s) · Day %s · %s', project_title, s.version, s.shoot_day, to_char(s.shoot_date, 'Dy FMDD Mon'));
  end if;

  for who in select internal.call_sheet_recipients(s.project_id) loop
    continue when who = me;
    insert into public.notifications (user_id, type, title, body, link, created_by)
    values (who, 'call_sheet', left(title, 200), internal.call_sheet_message(snap, prev, s.project_id, who, note), '/call/' || s.id, me);
  end loop;
  return s;
end;
$function$;
REVOKE ALL ON FUNCTION public.issue_call_sheet(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_call_sheet(uuid, text) TO authenticated;

-- ── Confirmations ────────────────────────────────────────────────────────

CREATE TABLE public.call_sheet_acks (
  call_sheet_id uuid NOT NULL,
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  version integer NOT NULL,
  acked_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT call_sheet_acks_pkey PRIMARY KEY (call_sheet_id, user_id),
  CONSTRAINT call_sheet_acks_sheet_fkey FOREIGN KEY (call_sheet_id, project_id) REFERENCES public.call_sheets(id, project_id) ON DELETE CASCADE,
  CONSTRAINT call_sheet_acks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT call_sheet_acks_version_check CHECK (version >= 1)
);
ALTER TABLE public.call_sheet_acks ENABLE ROW LEVEL SECURITY;
CREATE INDEX call_sheet_acks_project_idx ON public.call_sheet_acks USING btree (project_id);
-- Read by the production; written only through ack_call_sheet.
CREATE POLICY "call_sheet_acks read" ON public.call_sheet_acks FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id));
GRANT SELECT ON public.call_sheet_acks TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.call_sheet_acks FROM anon, authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sheet_acks;

CREATE FUNCTION public.ack_call_sheet(p_sheet uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s public.call_sheets;
  me uuid := (select auth.uid());
begin
  select * into s from public.call_sheets where id = p_sheet;
  if not found or me is null or not internal.can_access_project(s.project_id) then
    raise exception 'Call sheet not found' using errcode = 'P0002';
  end if;
  if s.version = 0 then
    raise exception 'This call sheet hasn''t been issued yet' using errcode = '22023';
  end if;
  insert into public.call_sheet_acks (call_sheet_id, project_id, user_id, version)
  values (s.id, s.project_id, me, s.version)
  on conflict (call_sheet_id, user_id) do update set version = excluded.version, acked_at = now();
  return s.version;
end;
$function$;
REVOKE ALL ON FUNCTION public.ack_call_sheet(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ack_call_sheet(uuid) TO authenticated;

-- ── Reminders ────────────────────────────────────────────────────────────

-- Once per issued sheet, from the day before its shoot date (UTC): everyone's
-- own call again. Run hourly by pg_cron; safe to run any time.
CREATE FUNCTION public.send_call_sheet_reminders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s public.call_sheets;
  who uuid;
  n integer := 0;
  project_title text;
  day_word text;
begin
  for s in select * from public.call_sheets
            where version > 0 and reminded_at is null and shoot_date between current_date and current_date + 1
            for update skip locked loop
    select p.title into project_title from public.projects p where p.id = s.project_id;
    day_word := 'Today';
    if s.shoot_date > current_date then
      day_word := 'Tomorrow';
    end if;
    for who in select internal.call_sheet_recipients(s.project_id) loop
      insert into public.notifications (user_id, type, title, body, link, created_by)
      values (who, 'call_sheet', left(format('%s: %s, Day %s', day_word, project_title, s.shoot_day), 200),
              internal.call_sheet_message(s.issued, null, s.project_id, who, null), '/call/' || s.id, null);
      n := n + 1;
    end loop;
    perform set_config('mc.issuing_call_sheet', 'on', true);
    update public.call_sheets set reminded_at = now() where id = s.id;
    perform set_config('mc.issuing_call_sheet', 'off', true);
  end loop;
  return n;
end;
$function$;
REVOKE ALL ON FUNCTION public.send_call_sheet_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_call_sheet_reminders() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('call-sheet-reminders', '7 * * * *', 'select public.send_call_sheet_reminders()');
