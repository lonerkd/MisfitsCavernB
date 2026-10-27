-- The hub's Help: support cases (plan: .cavern-intelligence/plans/2026-10-25-lounge-overhaul.md,
-- slice L3).
--
--   support_cases          one per question: a subject, the page the person was
--                          on, a status (open = waiting on us, waiting = waiting
--                          on the person, resolved). Only the opener and admins
--                          read it; only admins change it.
--   support_case_messages  the conversation. The opener and admins write in
--                          cases they can read. An admin's reply moves the case
--                          to 'waiting' and notifies the opener; the opener's
--                          message moves it back to 'open' and notifies the
--                          admins.

CREATE TABLE public.support_cases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  opened_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  subject text NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 1 AND 200),
  page text CHECK (page IS NULL OR char_length(page) <= 500),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'waiting', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_cases_opened_by_idx ON public.support_cases (opened_by, updated_at DESC);
CREATE INDEX support_cases_status_idx ON public.support_cases (status, updated_at DESC);

ALTER TABLE public.support_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support cases read" ON public.support_cases FOR SELECT TO authenticated
  USING (opened_by = (select auth.uid()) OR internal.caller_is_admin());
CREATE POLICY "support cases insert" ON public.support_cases FOR INSERT TO authenticated
  WITH CHECK (opened_by = (select auth.uid()) AND status = 'open');
CREATE POLICY "support cases update" ON public.support_cases FOR UPDATE TO authenticated
  USING (internal.caller_is_admin()) WITH CHECK (internal.caller_is_admin());

REVOKE ALL ON public.support_cases FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.support_cases TO authenticated;

CREATE TABLE public.support_case_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES public.support_cases(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  from_admin boolean NOT NULL DEFAULT false,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_case_messages_case_idx ON public.support_case_messages (case_id, created_at);
CREATE INDEX support_case_messages_author_idx ON public.support_case_messages (author_id);

ALTER TABLE public.support_case_messages ENABLE ROW LEVEL SECURITY;

-- Readable with the case: the subquery runs under the caller's support_cases policy.
CREATE POLICY "support case messages read" ON public.support_case_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.support_cases c WHERE c.id = case_id));
CREATE POLICY "support case messages insert" ON public.support_case_messages FOR INSERT TO authenticated
  WITH CHECK (author_id = (select auth.uid()) AND EXISTS (SELECT 1 FROM public.support_cases c WHERE c.id = case_id));

REVOKE ALL ON public.support_case_messages FROM anon;
GRANT SELECT, INSERT ON public.support_case_messages TO authenticated;

-- updated_at; the opener, subject and page can't be rewritten.
CREATE FUNCTION internal.support_cases_touch()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.opened_by := old.opened_by;
    new.subject := old.subject;
    new.page := old.page;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.support_cases_touch() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER support_cases_touch BEFORE INSERT OR UPDATE ON public.support_cases
  FOR EACH ROW EXECUTE FUNCTION internal.support_cases_touch();

-- Whether a message is an admin's answer is decided here, never by the client.
-- Definer: it reads the admin flag (internal.caller_is_admin) for the caller.
CREATE FUNCTION internal.support_messages_stamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.from_admin := internal.caller_is_admin()
    and not exists (select 1 from public.support_cases c where c.id = new.case_id and c.opened_by = new.author_id);
  new.created_at := now();
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.support_messages_stamp() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER support_messages_stamp BEFORE INSERT ON public.support_case_messages
  FOR EACH ROW EXECUTE FUNCTION internal.support_messages_stamp();

-- Move the case and tell the other side. Definer: it updates a case the opener
-- may not update, and writes other people's notifications.
CREATE FUNCTION internal.support_messages_route()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.support_cases;
  first_message boolean;
begin
  select * into c from public.support_cases where id = new.case_id;
  first_message := not exists (select 1 from public.support_case_messages m where m.case_id = new.case_id and m.id <> new.id);
  if new.from_admin then
    update public.support_cases set status = 'waiting' where id = c.id and status <> 'resolved';
    insert into public.notifications (user_id, type, title, body, link, created_by)
    values (c.opened_by, 'support', left('Reply: ' || c.subject, 200), left(regexp_replace(new.body, '\s+', ' ', 'g'), 280), '/hub/help/' || c.id, new.author_id);
  else
    update public.support_cases set status = 'open' where id = c.id and status <> 'open';
    insert into public.notifications (user_id, type, title, body, link, created_by)
    select p.id, 'support', left((case when first_message then 'New case: ' else 'Case reply: ' end) || c.subject, 200),
           left(regexp_replace(new.body, '\s+', ' ', 'g'), 280), '/admin/support?case=' || c.id, new.author_id
    from public.profiles p where p.is_admin and p.id <> new.author_id;
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.support_messages_route() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER support_messages_route AFTER INSERT ON public.support_case_messages
  FOR EACH ROW EXECUTE FUNCTION internal.support_messages_route();
