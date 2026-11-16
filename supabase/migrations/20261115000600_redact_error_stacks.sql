-- Error stacks are stored redacted. A stack can carry the origin the page was
-- served from, absolute file paths, query strings (tokens ride in them) and,
-- in a frame that quotes a value, an email or a token. report_client_error now
-- strips all of that before the row is written, whatever the caller sent, so
-- Admin > Errors never shows it. The browser redacts too (lib/errors/redactStack.ts);
-- the rules and their order are the same in both places, change them together.
--
-- Same signature, security and grants as 20260929080000_client_errors.sql;
-- only the stack handling changes. Rows already stored are left as they are.

CREATE OR REPLACE FUNCTION public.report_client_error(p_kind text, p_message text, p_stack text, p_path text, p_digest text, p_release text, p_user_agent text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid := (select auth.uid());
  msg text := left(btrim(coalesce(p_message, '')), 1000);
  stk text := left(coalesce(p_stack, ''), 16000);
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
  -- Redact the stack: an email, a JWT, an origin (scheme://host), a query
  -- string, a long hex run, a long base64-ish run, then every path cut down to
  -- its file name (the :line:col after it stays).
  stk := regexp_replace(stk, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[email]', 'g');
  stk := regexp_replace(stk, 'eyJ[A-Za-z0-9_-]{5,}(?:\.[A-Za-z0-9_-]+){1,2}', '[token]', 'g');
  stk := regexp_replace(stk, '[A-Za-z][A-Za-z0-9+.-]*:\/\/[^\/\s)]*', '[origin]', 'g');
  stk := regexp_replace(stk, '\?[A-Za-z0-9_=&%.~+\/,;@-]*', '', 'g');
  stk := regexp_replace(stk, '[0-9A-Fa-f]{32,}', '[token]', 'g');
  stk := regexp_replace(stk, '[A-Za-z0-9_-]{40,}', '[token]', 'g');
  stk := regexp_replace(stk, '(?:[A-Za-z]:|\.{1,2})?[\\\/](?:[^\s()\\\/]+[\\\/])+([^\s()\\\/:]+)', '/\1', 'g');
  insert into public.client_errors (user_id, kind, message, stack, path, digest, release, user_agent)
  values (uid, p_kind, msg,
          nullif(left(stk, 8000), ''), nullif(left(p_path, 300), ''), nullif(left(p_digest, 100), ''),
          nullif(left(p_release, 60), ''), nullif(left(p_user_agent, 300), ''));
  -- Keep a month.
  delete from public.client_errors where created_at < now() - interval '30 days';
end;
$function$;

REVOKE ALL ON FUNCTION public.report_client_error(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_client_error(text, text, text, text, text, text, text) TO anon, authenticated;
