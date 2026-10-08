-- Web Push (BACKLOG 3.13, part 2): a notification also reaches the person's
-- phone or desktop when the app is closed — a call sheet issued on the desk
-- arrives on the installed iPhone app.
--
--   public.push_subscriptions   one row per device that said yes; each person
--                               sees and removes only their own.
--   internal.push_config        where to send: the app's dispatch URL and a
--                               shared secret. Empty = push is off (nothing
--                               is sent). Set by the owner per environment.
--   trigger on notifications    after each insert, if push is configured,
--                               posts {notification_id} to the dispatch URL
--                               (pg_net: asynchronous, never blocks or fails
--                               the insert). The app's /api/push/dispatch
--                               checks the secret, the person's notification
--                               settings and their devices, and sends.

CREATE TABLE public.push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE CHECK (endpoint ~ '^https?://' AND length(endpoint) <= 2000),
  p256dh text NOT NULL CHECK (length(p256dh) BETWEEN 40 AND 200),
  auth text NOT NULL CHECK (length(auth) BETWEEN 10 AND 100),
  user_agent text CHECK (user_agent IS NULL OR length(user_agent) <= 500),
  created_at timestamptz DEFAULT now() NOT NULL,
  last_used_at timestamptz
);
CREATE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions read own" ON public.push_subscriptions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "push_subscriptions add own" ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "push_subscriptions remove own" ON public.push_subscriptions FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
-- No UPDATE policy: a device that resubscribes replaces its row.

REVOKE ALL ON public.push_subscriptions FROM anon;
GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;

CREATE TABLE internal.push_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  dispatch_url text NOT NULL CHECK (dispatch_url ~ '^https?://'),
  secret text NOT NULL CHECK (length(secret) >= 32)
);
REVOKE ALL ON internal.push_config FROM PUBLIC, anon, authenticated;

CREATE FUNCTION internal.push_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  cfg internal.push_config;
begin
  select * into cfg from internal.push_config limit 1;
  if cfg.dispatch_url is null then return new; end if;
  -- Only someone with a device to send to.
  if not exists (select 1 from public.push_subscriptions s where s.user_id = new.user_id) then return new; end if;
  perform net.http_post(
    url := cfg.dispatch_url,
    body := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || cfg.secret),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  -- Push is a nicety: a failure here must never lose the notification itself.
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.push_notification() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER notifications_push AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION internal.push_notification();
