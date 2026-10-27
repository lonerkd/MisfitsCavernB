-- Guest review: a leaked link can still add comments (capped at 200 per link),
-- but it can no longer flood the team's bell. Each recipient gets at most 5
-- "New comment" notifications per 10 minutes; the comments themselves are all
-- kept and shown in Studio › Share › Review. Decisions are never throttled
-- (one per version).

CREATE OR REPLACE FUNCTION internal.notify_review(p_project uuid, p_version uuid, p_title text, p_body text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.notifications (user_id, type, title, body, link)
  select distinct u.id, 'review', left(p_title, 200), left(p_body, 280), '/studio'
  from (
    select created_by as id from public.item_versions where id = p_version
    union
    select creator_id from public.projects where id = p_project
  ) u
  where u.id is not null
    and (
      p_title not like 'New comment%'
      or (select count(*) from public.notifications n
           where n.user_id = u.id and n.type = 'review' and n.title like 'New comment%'
             and n.created_at > now() - interval '10 minutes') < 5
    );
end;
$function$;
