-- Acting on a report: a platform admin can close a job that was reported, even
-- though it is not theirs. Closing hides it from the board and stops
-- applications; it deletes nothing, and the poster's own tools are unchanged.
-- Recorded in the audit log.

CREATE FUNCTION public.admin_close_job(p_job uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not internal.caller_is_admin() then
    raise exception 'Only an admin can do this' using errcode = '42501';
  end if;
  update public.jobs set status = 'closed' where id = p_job;
  if not found then
    raise exception 'No such job' using errcode = 'P0002';
  end if;
  insert into public.audit_logs (user_id, action, resource_type, resource_id)
    values ((select auth.uid()), 'admin_close_job', 'job', p_job);
end;
$function$;

REVOKE ALL ON FUNCTION public.admin_close_job(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_close_job(uuid) TO authenticated, service_role;
