-- Take the per-recipient locks of notify_review in a fixed order (by user id), so
-- two overlapping calls whose recipients are the same two people cannot lock them
-- in opposite orders and deadlock.

CREATE OR REPLACE FUNCTION internal.notify_review(p_project uuid, p_version uuid, p_title text, p_body text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
begin
  for r in
    select distinct u.id
    from (
      select created_by as id from public.item_versions where id = p_version
      union
      select creator_id from public.projects where id = p_project
    ) u
    where u.id is not null
    order by u.id
  loop
    perform pg_advisory_xact_lock(hashtextextended('notify_review:' || r.id::text, 0));
    if p_title not like 'New comment%'
       or (select count(*) from public.notifications n
            where n.user_id = r.id and n.type = 'review' and n.title like 'New comment%'
              and n.created_at > now() - interval '10 minutes') < 5 then
      insert into public.notifications (user_id, type, title, body, link)
      values (r.id, 'review', left(p_title, 200), left(p_body, 280), '/studio');
    end if;
  end loop;
end;
$function$;
