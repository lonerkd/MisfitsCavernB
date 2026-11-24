-- Deliver what quiet hours held (BACKLOG 3.53, slice 2). A normal notification that arrives in a person's quiet hours stays in the bell
-- with push_skipped = 'quiet-hours'. Every five minutes this worker asks the app to release them for each person who has any from the
-- last day: the app (/api/push/dispatch, release_for) sends ONE batched push once their quiet hours are over, then clears the marker.
-- A person still inside their quiet hours is simply asked again next time; nothing is lost and nothing is sent twice (the sender clears
-- push_skipped and stamps pushed_at on every row it covers). The worker only posts when push is configured, like internal.push_notification.

CREATE OR REPLACE FUNCTION internal.push_release_held()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  cfg internal.push_config;
  uid uuid;
begin
  select * into cfg from internal.push_config limit 1;
  if cfg.dispatch_url is null then return; end if;
  for uid in
    select distinct n.user_id
    from public.notifications n
    where n.push_skipped = 'quiet-hours'
      and n.pushed_at is null
      and n.created_at > now() - interval '1 day'
      and exists (select 1 from public.push_subscriptions s where s.user_id = n.user_id)
  loop
    perform net.http_post(
      url := cfg.dispatch_url,
      body := jsonb_build_object('release_for', uid),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || cfg.secret),
      timeout_milliseconds := 5000
    );
  end loop;
exception when others then
  -- Push is a nicety: a failure here must never break the worker's schedule.
  return;
end;
$function$;
REVOKE ALL ON FUNCTION internal.push_release_held() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('push-release-held', '*/5 * * * *', 'select internal.push_release_held()');
