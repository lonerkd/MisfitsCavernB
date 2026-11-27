-- Context notifications from the film graph (BACKLOG 3.53, slice 3): the first one. A shoot day is coming and a location it uses still has
-- an open permit. Once a day a worker looks at every shoot day dated in the next three days (today included), finds the scenes on it and
-- their locations, and for each location whose permit is still `needed` or `applied` tells the project's owner and its confirmed leads, once:
-- "Permit still open for DOCK: Day 4 shoots there on 2026-12-03." It names the place, the day and the date, so it makes sense on its own.
--
-- "Once" is public.context_notices: one row per (project, kind, key); the key is the location and the date, so a moved shoot day (a new
-- date) is a new fact and notifies again, and nothing is ever sent twice for the same fact. RLS on, no policies, no grants: only the definer
-- worker touches it. The worker is SECURITY DEFINER in `internal` (no grants): the notifications are for other people. A failure for one
-- project is swallowed so the rest of the run still goes out. The kind is not on the push switches yet (slice 5 adds the per-kind switches);
-- the push sender still holds it for quiet hours.

CREATE TABLE public.context_notices (
  project_id uuid NOT NULL,
  kind text NOT NULL CHECK (char_length(kind) BETWEEN 1 AND 40),
  key text NOT NULL CHECK (char_length(key) BETWEEN 1 AND 200),
  notified_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT context_notices_pkey PRIMARY KEY (project_id, kind, key),
  CONSTRAINT context_notices_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);
ALTER TABLE public.context_notices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.context_notices FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION internal.notify_shoot_soon_permits()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  sent integer := 0;
begin
  for r in
    select distinct on (d.project_id, l.id, d.shoot_date)
           d.project_id, d.day_number, d.shoot_date, l.id as location_id, l.name as place, l.permit,
           p.title as project_title, p.creator_id
    from public.shoot_days d
    join public.scenes s on s.shoot_day_id = d.id and s.project_id = d.project_id and s.removed_at is null
    join public.project_locations l on l.id = s.location_id and l.project_id = s.project_id
    join public.projects p on p.id = d.project_id
    where d.shoot_date between current_date and current_date + 3
      and l.permit in ('needed', 'applied')
    order by d.project_id, l.id, d.shoot_date
  loop
    begin
      -- Atomic: only the run that inserts the row sees it, so two overlapping runs notify once.
      insert into public.context_notices (project_id, kind, key)
        values (r.project_id, 'permit-open', r.location_id::text || ':' || r.shoot_date::text)
        on conflict do nothing;
      if not found then continue; end if;
      insert into public.notifications (user_id, type, title, body, link, created_by)
      select distinct x.uid, 'permit',
             left('Permit still open for ' || r.place, 120),
             left(coalesce(r.project_title, 'A project') || ': Day ' || r.day_number::text || ' shoots at ' || r.place || ' on ' || r.shoot_date::text
                  || ', and its permit is still ' || case when r.permit = 'applied' then 'waiting on an answer.' else 'needed.' end, 300),
             '/studio?project=' || r.project_id::text || '&tab=production&view=locations',
             null::uuid
      from (
        select r.creator_id as uid where r.creator_id is not null
        union
        select pc.user_id from public.project_crew pc
         where pc.project_id = r.project_id and pc.user_id is not null and pc.role = 'lead' and coalesce(pc.status, 'confirmed') = 'confirmed'
      ) x;
      sent := sent + 1;
    exception when others then
      -- One project's failure must not stop the rest of the run.
      null;
    end;
  end loop;
  return sent;
end;
$function$;
REVOKE ALL ON FUNCTION internal.notify_shoot_soon_permits() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('notice-shoot-soon-permits', '0 14 * * *', 'select internal.notify_shoot_soon_permits()');
