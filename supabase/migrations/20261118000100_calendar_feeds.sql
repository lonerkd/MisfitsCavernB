-- A personal calendar feed: one secret link per person that a phone's calendar subscribes to, so the shoot days, the issued
-- call sheets (with their own call time) and the tasks assigned to them appear next to everything else in their day.
--
-- The link is the secret (a random uuid), kept in a table only its owner can read; turning the feed off deletes the row,
-- changing the token revokes the old link. The feed is read by calendar apps with no login, so it goes through one
-- SECURITY DEFINER function that checks the exact token and returns only what that person may already see: projects they
-- created or are confirmed crew on (never archived ones), shoot days with a date, call sheets only once issued, and tasks
-- assigned to them that are not done.

CREATE TABLE public.calendar_feeds (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.calendar_feeds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.calendar_feeds FROM anon;
CREATE POLICY calendar_feeds_owner ON public.calendar_feeds FOR ALL TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

CREATE FUNCTION public.calendar_feed(p_token uuid)
 RETURNS TABLE(kind text, uid text, project_title text, summary text, day date, start_time time without time zone,
               end_time time without time zone, location text, notes text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with me as (select f.user_id from public.calendar_feeds f where f.token = p_token),
  mine as (
    select p.id, p.title, me.user_id
      from public.projects p cross join me
     where p.archived_at is null
       and (p.creator_id = me.user_id
            or exists (select 1 from public.project_crew c
                        where c.project_id = p.id and c.user_id = me.user_id and coalesce(c.status, 'confirmed') = 'confirmed'))
  )
  select 'day'::text, 'day-' || d.id::text, m.title, 'Shoot day ' || d.day_number::text, d.shoot_date,
         null::time, null::time, null::text, null::text
    from public.shoot_days d join mine m on m.id = d.project_id
   where d.shoot_date is not null
     and not exists (select 1 from public.call_sheets s
                      where s.project_id = d.project_id and s.shoot_day_id = d.id and s.issued_at is not null)
  union all
  select 'call'::text, 'sheet-' || s.id::text, m.title, 'Call: day ' || s.shoot_day::text,
         coalesce(s.shoot_date, d.shoot_date),
         coalesce((select min(c.call_time) from public.call_sheet_calls c where c.call_sheet_id = s.id and c.crew_user_id = m.user_id),
                  s.general_call),
         s.estimated_wrap, s.location_address, s.notes
    from public.call_sheets s
    join mine m on m.id = s.project_id
    left join public.shoot_days d on d.id = s.shoot_day_id
   where s.issued_at is not null and coalesce(s.shoot_date, d.shoot_date) is not null
  union all
  select 'task'::text, 'task-' || t.id::text, m.title, t.title, t.due_date::date,
         null::time, null::time, null::text, null::text
    from public.project_tasks t join mine m on m.id = t.project_id
   where t.assigned_to = m.user_id and coalesce(t.completed, false) = false and t.due_date is not null;
$function$;
REVOKE ALL ON FUNCTION public.calendar_feed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calendar_feed(uuid) TO anon, authenticated;
