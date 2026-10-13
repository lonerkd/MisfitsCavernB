-- Suspending an account: an admin can stop a person signing in, without
-- deleting anything of theirs, and lift it again. It uses the auth service's own
-- ban (auth.users.banned_until), which refuses sign-in and session refresh, and
-- ends the sessions they hold (an access token already issued lasts until it
-- expires, at most an hour). Who is suspended is visible to admins only.
-- Admins cannot suspend themselves or each other.

ALTER TABLE public.profiles ADD COLUMN suspended_at timestamp with time zone;

-- The admin list gains who is suspended (the return type changes, so replace it).
DROP FUNCTION public.admin_list_users();
CREATE FUNCTION public.admin_list_users()
 RETURNS TABLE(id uuid, username text, avatar_url text, role text, status text, is_admin boolean, created_at timestamp with time zone, suspended boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not internal.caller_is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  return query
    select p.id, p.username, p.avatar_url, p.role, p.status, coalesce(p.is_admin, false), p.created_at, p.suspended_at is not null
    from public.profiles p order by p.created_at desc;
end;
$function$;
REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated, service_role;

CREATE FUNCTION public.admin_set_suspended(p_user uuid, p_suspended boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := (select auth.uid());
  target public.profiles;
begin
  if not internal.caller_is_admin() then
    raise exception 'Only an admin can do this' using errcode = '42501';
  end if;
  if p_user = me then
    raise exception 'You can''t suspend your own account' using errcode = '42501';
  end if;
  select * into target from public.profiles where id = p_user;
  if not found then
    raise exception 'No such user' using errcode = 'P0002';
  end if;
  if coalesce(target.is_admin, false) and p_suspended then
    raise exception 'Remove their admin rights before suspending an admin' using errcode = '42501';
  end if;
  if p_suspended then
    update auth.users set banned_until = now() + interval '100 years' where id = p_user;
    delete from auth.refresh_tokens where user_id = p_user::text;
    delete from auth.sessions where user_id = p_user;
    update public.profiles set suspended_at = coalesce(suspended_at, now()) where id = p_user;
  else
    update auth.users set banned_until = null where id = p_user;
    update public.profiles set suspended_at = null where id = p_user;
  end if;
  insert into public.audit_logs (user_id, action, resource_type, resource_id)
    values (me, case when p_suspended then 'admin_suspend_user' else 'admin_unsuspend_user' end, 'user', p_user);
end;
$function$;
REVOKE ALL ON FUNCTION public.admin_set_suspended(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_suspended(uuid, boolean) TO authenticated, service_role;
