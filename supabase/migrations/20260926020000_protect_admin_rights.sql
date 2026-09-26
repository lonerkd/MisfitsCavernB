-- Admin rights could be self-granted: the "Users update own profile" policy has
-- no column restriction, so any signed-in user could run
--   update profiles set is_admin = true where id = auth.uid()
-- and pass the /admin gate (middleware reads profiles.is_admin). The admin
-- page's own toggle for *other* users was blocked by the same policy and
-- reported success anyway.
--
-- Now: is_admin changes only through set_user_admin(), callable by admins.
-- (No JWT = migrations / server maintenance, which may still do anything.)

CREATE FUNCTION internal.caller_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((select p.is_admin from public.profiles p where p.id = (select auth.uid())), false);
$function$;

CREATE FUNCTION internal.profiles_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if tg_op = 'INSERT' and coalesce(new.is_admin, false) then
    raise exception 'Admin rights can only be granted by an admin' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.is_admin is distinct from old.is_admin and not internal.caller_is_admin() then
    raise exception 'Admin rights can only be granted by an admin' using errcode = '42501';
  end if;
  return new;
end;
$function$;
CREATE TRIGGER profiles_guard BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION internal.profiles_guard();

-- The one way to grant or revoke admin. Admins can't revoke themselves, so the
-- platform can't end up with no admin by accident.
CREATE FUNCTION public.set_user_admin(p_user uuid, p_admin boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not internal.caller_is_admin() then
    raise exception 'Only an admin can change admin rights' using errcode = '42501';
  end if;
  if p_user = (select auth.uid()) and not p_admin then
    raise exception 'You can''t remove your own admin rights' using errcode = '42501';
  end if;
  update public.profiles set is_admin = p_admin where id = p_user;
  if not found then
    raise exception 'No such user' using errcode = 'P0002';
  end if;
end;
$function$;

REVOKE ALL ON FUNCTION internal.caller_is_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION internal.profiles_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_user_admin(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION internal.caller_is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION internal.profiles_guard() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_user_admin(uuid, boolean) TO authenticated, service_role;
