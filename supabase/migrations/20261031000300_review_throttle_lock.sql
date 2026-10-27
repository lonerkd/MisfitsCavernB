-- The comment-notification throttle (20261031000200) counted and then inserted,
-- so two simultaneous guest requests could both pass the count. Serialise it per
-- recipient with a transaction-scoped advisory lock: the second request waits
-- for the first to commit, then counts again.

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
