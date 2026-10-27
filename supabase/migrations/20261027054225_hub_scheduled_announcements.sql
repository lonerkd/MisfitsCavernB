-- Hub posts (3.28a): scheduled loud posts (important + incidents) were never
-- announced once their publish time passed because the trigger only runs on
-- insert/update. A pg_cron job now scans every five minutes and sends the
-- missing notifications exactly once per post. Only posts that went live within
-- the last day are considered, so the job can never re-announce history.

CREATE OR REPLACE FUNCTION internal.hub_posts_announce_scheduled()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  sent integer := 0;
begin
  with to_send as (
    select h.id, h.title, h.body, h.created_by
    from public.hub_posts h
    where h.published_at is not null
      and h.published_at <= now()
      and h.published_at > now() - interval '1 day'
      and (h.important or h.kind = 'incident')
      and not exists (
        select 1
        from public.notifications n
        where n.link = '/hub/' || h.id
      )
  ), inserted as (
    insert into public.notifications (user_id, type, title, body, link, created_by)
    select p.id, 'hub', left(s.title, 200), left(regexp_replace(s.body, '\s+', ' ', 'g'), 280), '/hub/' || s.id, s.created_by
    from to_send s
    cross join public.profiles p
    returning 1
  )
  select count(*)::integer into sent from inserted;
  return sent;
end;
$function$;

REVOKE ALL ON FUNCTION internal.hub_posts_announce_scheduled() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('hub-post-scheduled-announcements', '*/5 * * * *', 'select internal.hub_posts_announce_scheduled()');