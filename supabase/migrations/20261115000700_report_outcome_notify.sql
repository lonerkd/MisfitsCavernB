-- Moderation: tell the reporter how their report ended.
--
-- When an admin settles a report (open -> resolved or dismissed, from /admin/reports), the person who filed it gets an in-app
-- notification saying the outcome. It names only the kind of thing ("a message / job / profile you reported"): never the reported
-- person's name and never any of the reported content. Done in a trigger so every way of settling a report tells the reporter, and
-- the client needs no new call. It is a definer trigger in `internal` (not callable through the API, no grants), because a
-- reporter cannot insert notifications for themselves and an admin's own insert would carry the wrong `created_by`.
-- Reopening or re-settling a report does not notify again: only the move out of 'open' does.

CREATE OR REPLACE FUNCTION internal.reports_notify_outcome()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  thing text;
begin
  if old.status <> 'open' or new.status not in ('resolved', 'dismissed') then return new; end if;
  thing := case new.kind when 'message' then 'a message' when 'job' then 'a job' else 'a profile' end;
  insert into public.notifications (user_id, type, title, body, link, created_by)
  values (
    new.reporter_id,
    'report',
    case new.status when 'resolved' then 'Your report was resolved' else 'Your report was dismissed' end,
    case new.status
      when 'resolved' then 'We looked at ' || thing || ' you reported and acted on it. Thank you for telling us.'
      else 'We looked at ' || thing || ' you reported and did not take action. Thank you for telling us.'
    end,
    null,
    null
  );
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.reports_notify_outcome() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER reports_notify_outcome AFTER UPDATE OF status ON public.reports
  FOR EACH ROW EXECUTE FUNCTION internal.reports_notify_outcome();
