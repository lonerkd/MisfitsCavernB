-- The film graph, step 1: days and places (.cavern-intelligence/film-graph-spec.md).
--
-- A scene's place and its shoot day become real linked rows instead of a name
-- and a number that each tool matches up for itself:
--   scenes.location_id   → project_locations  (found or made from the heading's name)
--   scenes.shoot_day_id  → shoot_days         (one row per project and day number)
--   call_sheets.shoot_day_id → shoot_days     (the day and its call sheet share one date)
-- and a location can say where it is (latitude, longitude, timezone), which is
-- what the day's light is computed from.
--
-- The old columns stay and stay correct — scenes.location, scenes.shoot_day,
-- call_sheets.shoot_day and call_sheets.shoot_date are still what the app
-- writes. Triggers keep the links in step with them; a later step moves the
-- tools onto the links and drops the text.

-- ── Where a location is ────────────────────────────────────────────────────

ALTER TABLE public.project_locations
  ADD COLUMN latitude numeric(9,6),
  ADD COLUMN longitude numeric(9,6),
  ADD COLUMN timezone text,
  ADD CONSTRAINT project_locations_coordinates_check CHECK (
    (latitude IS NULL) = (longitude IS NULL)
    AND (latitude IS NULL OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))
  ),
  ADD CONSTRAINT project_locations_timezone_check CHECK (timezone IS NULL OR char_length(timezone) BETWEEN 1 AND 64);

-- ── Shoot days ─────────────────────────────────────────────────────────────

CREATE TABLE public.shoot_days (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid NOT NULL,
  day_number integer NOT NULL,
  shoot_date date,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT shoot_days_pkey PRIMARY KEY (id),
  CONSTRAINT shoot_days_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT shoot_days_number_key UNIQUE (project_id, day_number),
  CONSTRAINT shoot_days_id_project_key UNIQUE (id, project_id),
  CONSTRAINT shoot_days_number_positive CHECK (day_number >= 1)
);
ALTER TABLE public.shoot_days ENABLE ROW LEVEL SECURITY;

-- The production schedules together, as it does scenes and call sheets.
CREATE POLICY "shoot_days access" ON public.shoot_days FOR ALL TO authenticated
  USING (internal.can_access_project(project_id)) WITH CHECK (internal.can_access_project(project_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shoot_days TO authenticated;
REVOKE ALL ON public.shoot_days FROM anon;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shoot_days;

CREATE TRIGGER shoot_days_updated_at BEFORE UPDATE ON public.shoot_days
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── The links ──────────────────────────────────────────────────────────────

-- Same-project by construction: the pair (id, project_id) is what's referenced.
-- Removing a location or a day unlinks its scenes; it doesn't remove them.
ALTER TABLE public.scenes
  ADD COLUMN location_id uuid,
  ADD COLUMN shoot_day_id uuid,
  ADD CONSTRAINT scenes_location_fkey FOREIGN KEY (location_id, project_id)
    REFERENCES public.project_locations(id, project_id) ON DELETE SET NULL (location_id),
  ADD CONSTRAINT scenes_shoot_day_fkey FOREIGN KEY (shoot_day_id, project_id)
    REFERENCES public.shoot_days(id, project_id) ON DELETE SET NULL (shoot_day_id);
CREATE INDEX scenes_location_idx ON public.scenes USING btree (location_id);
CREATE INDEX scenes_shoot_day_idx ON public.scenes USING btree (shoot_day_id);

ALTER TABLE public.call_sheets
  ADD COLUMN shoot_day_id uuid,
  ADD CONSTRAINT call_sheets_shoot_day_fkey FOREIGN KEY (shoot_day_id, project_id)
    REFERENCES public.shoot_days(id, project_id) ON DELETE SET NULL (shoot_day_id);
CREATE UNIQUE INDEX call_sheets_shoot_day_key ON public.call_sheets USING btree (shoot_day_id) WHERE shoot_day_id IS NOT NULL;

-- ── What's already there ───────────────────────────────────────────────────
-- Filled directly, with the tables' own triggers off, so no scene or call
-- sheet looks edited (updated_at doesn't move) because of this migration.

INSERT INTO public.project_locations (project_id, name, created_by)
SELECT DISTINCT s.project_id, upper(btrim(s.location)), NULL::uuid
FROM public.scenes s
WHERE btrim(coalesce(s.location, '')) <> '' AND char_length(upper(btrim(s.location))) <= 200
ON CONFLICT (project_id, name) DO NOTHING;

INSERT INTO public.shoot_days (project_id, day_number)
SELECT project_id, shoot_day FROM public.scenes WHERE shoot_day >= 1
UNION
SELECT project_id, shoot_day FROM public.call_sheets WHERE shoot_day >= 1
ON CONFLICT (project_id, day_number) DO NOTHING;

-- A day takes its call sheet's date.
UPDATE public.shoot_days d SET shoot_date = c.shoot_date
FROM public.call_sheets c
WHERE c.project_id = d.project_id AND c.shoot_day = d.day_number AND c.shoot_date IS NOT NULL;

ALTER TABLE public.scenes DISABLE TRIGGER USER;
UPDATE public.scenes s SET
  location_id = (SELECT l.id FROM public.project_locations l WHERE l.project_id = s.project_id AND l.name = upper(btrim(s.location))),
  shoot_day_id = (SELECT d.id FROM public.shoot_days d WHERE d.project_id = s.project_id AND d.day_number = s.shoot_day);
ALTER TABLE public.scenes ENABLE TRIGGER USER;

ALTER TABLE public.call_sheets DISABLE TRIGGER USER;
UPDATE public.call_sheets c SET
  shoot_day_id = (SELECT d.id FROM public.shoot_days d WHERE d.project_id = c.project_id AND d.day_number = c.shoot_day);
ALTER TABLE public.call_sheets ENABLE TRIGGER USER;

-- ── Keeping them in step ───────────────────────────────────────────────────
-- These run as whoever is writing. They only touch rows of the same project,
-- which that person may already write (the same policy guards all four tables).

-- A scene's place follows its heading; its day follows its day number.
CREATE FUNCTION internal.scenes_link_place_and_day()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_name text := upper(btrim(coalesce(new.location, '')));
begin
  if tg_op = 'INSERT' or new.location is distinct from old.location then
    if v_name = '' or char_length(v_name) > 200 then
      new.location_id := null;
    else
      select id into new.location_id from public.project_locations where project_id = new.project_id and name = v_name;
      if new.location_id is null then
        insert into public.project_locations (project_id, name) values (new.project_id, v_name)
        on conflict (project_id, name) do nothing;
        select id into new.location_id from public.project_locations where project_id = new.project_id and name = v_name;
      end if;
    end if;
  end if;
  if tg_op = 'INSERT' or new.shoot_day is distinct from old.shoot_day then
    if new.shoot_day is null or new.shoot_day < 1 then
      new.shoot_day_id := null;
    else
      select id into new.shoot_day_id from public.shoot_days where project_id = new.project_id and day_number = new.shoot_day;
      if new.shoot_day_id is null then
        insert into public.shoot_days (project_id, day_number) values (new.project_id, new.shoot_day)
        on conflict (project_id, day_number) do nothing;
        select id into new.shoot_day_id from public.shoot_days where project_id = new.project_id and day_number = new.shoot_day;
      end if;
    end if;
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.scenes_link_place_and_day() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER scenes_link_place_and_day BEFORE INSERT OR UPDATE OF location, shoot_day ON public.scenes
  FOR EACH ROW EXECUTE FUNCTION internal.scenes_link_place_and_day();

-- A call sheet belongs to its day, and they share one date: the day's first
-- call sheet takes the day's date if it's given none; a date set (or cleared)
-- on the call sheet is the day's date too.
CREATE FUNCTION internal.call_sheets_link_day()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' or new.shoot_day is distinct from old.shoot_day or new.shoot_day_id is null then
    if new.shoot_day is null or new.shoot_day < 1 then
      new.shoot_day_id := null;
    else
      select id into new.shoot_day_id from public.shoot_days where project_id = new.project_id and day_number = new.shoot_day;
      if new.shoot_day_id is null then
        insert into public.shoot_days (project_id, day_number) values (new.project_id, new.shoot_day)
        on conflict (project_id, day_number) do nothing;
        select id into new.shoot_day_id from public.shoot_days where project_id = new.project_id and day_number = new.shoot_day;
      end if;
    end if;
  end if;
  if tg_op = 'INSERT' and new.shoot_date is null then
    -- The day's first call sheet takes the day's date. An upsert of a sheet
    -- that already exists passes through here too, on its way to the UPDATE:
    -- there a missing date means 'not given' or 'cleared', never 'take the day's'.
    if not exists (select 1 from public.call_sheets where project_id = new.project_id and shoot_day = new.shoot_day) then
      select shoot_date into new.shoot_date from public.shoot_days where id = new.shoot_day_id;
    end if;
  elsif tg_op = 'INSERT' or new.shoot_date is distinct from old.shoot_date then
    update public.shoot_days set shoot_date = new.shoot_date
    where id = new.shoot_day_id and shoot_date is distinct from new.shoot_date;
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.call_sheets_link_day() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER call_sheets_link_day BEFORE INSERT OR UPDATE OF shoot_day, shoot_date ON public.call_sheets
  FOR EACH ROW EXECUTE FUNCTION internal.call_sheets_link_day();

-- A date set on the day itself (the schedule) is its call sheet's date too.
-- Only for a direct change: when the call sheet's own trigger set the day's
-- date, the call sheet already has it.
CREATE FUNCTION internal.shoot_days_date_to_call_sheet()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  update public.call_sheets set shoot_date = new.shoot_date
  where shoot_day_id = new.id and shoot_date is distinct from new.shoot_date;
  return null;
end;
$function$;
REVOKE ALL ON FUNCTION internal.shoot_days_date_to_call_sheet() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER shoot_days_date_to_call_sheet AFTER UPDATE OF shoot_date ON public.shoot_days
  FOR EACH ROW WHEN (pg_trigger_depth() < 1 AND new.shoot_date IS DISTINCT FROM old.shoot_date)
  EXECUTE FUNCTION internal.shoot_days_date_to_call_sheet();

-- A record made (or made again) for a name scenes already use picks them up.
CREATE FUNCTION internal.project_locations_link_scenes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  update public.scenes set location_id = new.id
  where project_id = new.project_id and location_id is null and upper(btrim(coalesce(location, ''))) = new.name;
  return null;
end;
$function$;
REVOKE ALL ON FUNCTION internal.project_locations_link_scenes() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER project_locations_link_scenes AFTER INSERT ON public.project_locations
  FOR EACH ROW EXECUTE FUNCTION internal.project_locations_link_scenes();
