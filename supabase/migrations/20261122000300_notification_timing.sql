-- Notifications that learn when they land (BACKLOG 3.53, the notification system). Three facts about each notification, none of which a
-- client can write:
--   read_at       when the person read it, stamped by the database when `read` turns true (and cleared if it turns false);
--   pushed_at     when the push to their devices went out, written by the push sender (service role);
--   push_skipped  why it did not go out: switched-off, quiet-hours, no-devices or failed.
-- Together they say how long a notification took to be read and which ones the phone never got: what timing is built from. Private to the
-- person, like the notification itself (the table's own policies); nothing here is shared or aggregated.
--
-- The guard is an invoker trigger and uses only auth.uid(): a call with no signed-in person (the push sender's service role, the database's
-- own writers) may set pushed_at and push_skipped; a signed-in person's insert or update may not.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS pushed_at timestamptz,
  ADD COLUMN IF NOT EXISTS push_skipped text CONSTRAINT notifications_push_skipped_check CHECK (push_skipped IS NULL OR push_skipped IN ('switched-off', 'quiet-hours', 'no-devices', 'failed'));

CREATE OR REPLACE FUNCTION internal.notifications_timing_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' then
    if (select auth.uid()) is not null then
      new.pushed_at := null;
      new.push_skipped := null;
    end if;
    -- A notification is written unread (the database's own writers may say otherwise, e.g. a seed).
    new.read_at := case when new.read then coalesce(new.read_at, now()) else null end;
    return new;
  end if;

  if (select auth.uid()) is not null then
    new.pushed_at := old.pushed_at;
    new.push_skipped := old.push_skipped;
  end if;
  if new.read and not old.read then
    new.read_at := now();
  elsif not new.read then
    new.read_at := null;
  else
    new.read_at := old.read_at;
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.notifications_timing_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS notifications_timing_guard ON public.notifications;
CREATE TRIGGER notifications_timing_guard BEFORE INSERT OR UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION internal.notifications_timing_guard();
