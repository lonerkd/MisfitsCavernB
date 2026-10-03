-- Errors people hit, reported by the app itself. Every crash a page shows, and
-- every uncaught error or rejection in the browser, is sent here (message,
-- stack, where, which build) so the team hears about it without waiting for
-- someone to write in. No third-party service; nothing personal beyond the
-- signed-in user's id.
--
-- Written only through report_client_error (anyone, signed in or not — a
-- crash on the landing page matters too), which trims every field and limits
-- how fast one person, or everyone signed out together, can write. Read only
-- by admins (Admin › Errors). Kept 30 days.

CREATE TABLE public.client_errors (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  user_id uuid,
  kind text NOT NULL,
  message text NOT NULL,
  stack text,
  path text,
  digest text,
  release text,
  user_agent text,
  CONSTRAINT client_errors_user_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT client_errors_kind_check CHECK (kind IN ('render', 'window', 'promise')),
  CONSTRAINT client_errors_message_check CHECK (char_length(message) BETWEEN 1 AND 1000),
  CONSTRAINT client_errors_stack_check CHECK (char_length(stack) <= 8000),
  CONSTRAINT client_errors_path_check CHECK (char_length(path) <= 300),
  CONSTRAINT client_errors_digest_check CHECK (char_length(digest) <= 100),
  CONSTRAINT client_errors_release_check CHECK (char_length(release) <= 60),
  CONSTRAINT client_errors_ua_check CHECK (char_length(user_agent) <= 300)
);
CREATE INDEX client_errors_created_idx ON public.client_errors USING btree (created_at DESC);
CREATE INDEX client_errors_user_idx ON public.client_errors USING btree (user_id);

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_errors: admins read" ON public.client_errors FOR SELECT TO authenticated
  USING ((select internal.caller_is_admin()));
CREATE POLICY "client_errors: admins clear" ON public.client_errors FOR DELETE TO authenticated
  USING ((select internal.caller_is_admin()));

CREATE FUNCTION public.report_client_error(p_kind text, p_message text, p_stack text, p_path text, p_digest text, p_release text, p_user_agent text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid := (select auth.uid());
  msg text := left(btrim(coalesce(p_message, '')), 1000);
begin
  if msg = '' or p_kind is null or p_kind not in ('render', 'window', 'promise') then
    return; -- nothing worth keeping; never an error for the caller
  end if;
  -- At most 20 a minute from one person, 60 a minute from everyone signed out.
  if (select count(*) from public.client_errors e
      where e.created_at > now() - interval '1 minute'
        and (e.user_id = uid or (uid is null and e.user_id is null))) >= (case when uid is null then 60 else 20 end) then
    return;
  end if;
  insert into public.client_errors (user_id, kind, message, stack, path, digest, release, user_agent)
  values (uid, p_kind, msg,
          nullif(left(p_stack, 8000), ''), nullif(left(p_path, 300), ''), nullif(left(p_digest, 100), ''),
          nullif(left(p_release, 60), ''), nullif(left(p_user_agent, 300), ''));
  -- Keep a month.
  delete from public.client_errors where created_at < now() - interval '30 days';
end;
$function$;

REVOKE ALL ON FUNCTION public.report_client_error(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_client_error(text, text, text, text, text, text, text) TO anon, authenticated;
