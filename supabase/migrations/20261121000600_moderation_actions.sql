-- Moderation, slice 2: an admin can act on a report.
--
-- Slice 1 (20261013010000 reports, 20261013020000 close job, 20261013030000 hide
-- message, 20261013040000 suspend) gave an admin a queue, "close a job", "hide a
-- message" and a sign-in ban. What was missing, and is here:
--   1. HIDE a reported job or a profile's public page, as a state on the thing
--      (columns, not a second table: the smaller choice) that every reader
--      obeys, with a note the author can read ("removed by moderators").
--   2. SUSPEND enforced in the database. The ban stops sign-in and refresh, but
--      an access token already issued works for up to an hour; now a suspended
--      account cannot post a message, apply, create a job or report in that
--      hour either, and gets a plain sentence saying why. Reinstating works.
--   3. One call that settles a report with what was done (hide / suspend /
--      dismiss, a reason, an audit-log row), and a read that says what state the
--      reported thing and its author are in.
-- Nothing is deleted by any of it.

-- ── Columns ─────────────────────────────────────────────────────────────
ALTER TABLE public.jobs
  ADD COLUMN hidden_at timestamp with time zone,
  ADD COLUMN hidden_by uuid,
  ADD COLUMN hidden_reason text,
  ADD CONSTRAINT jobs_hidden_by_fkey FOREIGN KEY (hidden_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT jobs_hidden_reason_check CHECK (hidden_reason IS NULL OR char_length(hidden_reason) <= 500);

-- profiles is column-granted (clients cannot select these two); admins read them through admin_report_target.
ALTER TABLE public.profiles
  ADD COLUMN hidden_at timestamp with time zone,
  ADD COLUMN suspended_reason text,
  ADD CONSTRAINT profiles_suspended_reason_check CHECK (suspended_reason IS NULL OR char_length(suspended_reason) <= 500);

-- What was done about a report (null for reports settled before this, or settled by hand).
ALTER TABLE public.reports
  ADD COLUMN outcome text,
  ADD CONSTRAINT reports_outcome_check CHECK (outcome IS NULL OR outcome IN ('hidden', 'suspended', 'hidden_and_suspended'));

-- ── Helper: is the caller suspended? ───────────────────────────────────
-- A definer helper because clients cannot read profiles.suspended_at. It answers
-- about the caller only (auth.uid()); false without a JWT (server maintenance).
CREATE FUNCTION internal.is_suspended()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.suspended_at is not null);
$function$;
REVOKE ALL ON FUNCTION internal.is_suspended() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION internal.is_suspended() TO service_role;

-- The jobs read policy now runs for anon too and asks whether the caller is an
-- admin (false without a JWT), as it already does for applied_to.
GRANT EXECUTE ON FUNCTION internal.caller_is_admin() TO anon;

-- ── A suspended account cannot write ────────────────────────────────────
-- A trigger rather than four policy rewrites, so the refusal has a plain
-- message (a policy says only "violates row-level security") and no policy's
-- exact text has to be copied. It also refuses an application to a hidden job.
CREATE FUNCTION internal.moderation_write_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if internal.is_suspended() then
    raise exception 'Your account is suspended: you can read, but not post, apply, create or report.' using errcode = '42501';
  end if;
  if tg_table_name = 'job_applications'
     and exists (select 1 from public.jobs j where j.id = new.job_id and j.hidden_at is not null) then
    raise exception 'This job is not taking applications.' using errcode = '42501';
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.moderation_write_guard() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION internal.moderation_write_guard() TO service_role;

CREATE TRIGGER moderation_write_guard BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION internal.moderation_write_guard();
CREATE TRIGGER moderation_write_guard BEFORE INSERT ON public.jobs FOR EACH ROW EXECUTE FUNCTION internal.moderation_write_guard();
CREATE TRIGGER moderation_write_guard BEFORE INSERT ON public.job_applications FOR EACH ROW EXECUTE FUNCTION internal.moderation_write_guard();
CREATE TRIGGER moderation_write_guard BEFORE INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION internal.moderation_write_guard();

-- A suspended sender cannot edit a message either (edit_message is a definer function, no insert).
CREATE OR REPLACE FUNCTION public.edit_message(p_message uuid, p_content text)
 RETURNS messages
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  m public.messages;
  me uuid := (select auth.uid());
  body text := btrim(coalesce(p_content, ''));
begin
  select * into m from public.messages where id = p_message for update;
  if not found or me is null or m.sender_id is distinct from me then
    raise exception 'You can only edit your own messages' using errcode = '42501';
  end if;
  if m.hidden_at is not null then
    raise exception 'An admin removed this message' using errcode = '42501';
  end if;
  if internal.is_suspended() then
    raise exception 'Your account is suspended: you can read, but not post, apply, create or report.' using errcode = '42501';
  end if;
  if m.channel_uuid is not null and not public.can_post_channel(m.channel_uuid) then
    raise exception 'You can no longer post in this channel' using errcode = '42501';
  end if;
  if char_length(body) = 0 or char_length(body) > 4000 then
    raise exception 'A message is 1 to 4000 characters' using errcode = '22023';
  end if;
  if body = m.content then
    return m;
  end if;
  update public.messages set content = body, edited_at = now() where id = m.id returning * into m;
  return m;
end;
$function$;

-- ── Nobody but an admin changes the moderation state of a job or a profile ──
CREATE FUNCTION internal.jobs_moderation_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is null or internal.caller_is_admin() then
    return new;
  end if;
  if (tg_op = 'INSERT' and (new.hidden_at is not null or new.hidden_by is not null or new.hidden_reason is not null))
     or (tg_op = 'UPDATE' and (new.hidden_at is distinct from old.hidden_at or new.hidden_by is distinct from old.hidden_by or new.hidden_reason is distinct from old.hidden_reason)) then
    raise exception 'Only a moderator can hide or restore a job' using errcode = '42501';
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.jobs_moderation_guard() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION internal.jobs_moderation_guard() TO service_role;
CREATE TRIGGER jobs_moderation_guard BEFORE INSERT OR UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION internal.jobs_moderation_guard();

-- The existing guard (20260929010000) plus: the moderation columns are an admin's, and a person whose page was
-- taken down cannot turn it back on.
CREATE OR REPLACE FUNCTION internal.profiles_guard()
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
  if (tg_op = 'INSERT' and new.is_sample) or (tg_op = 'UPDATE' and new.is_sample is distinct from old.is_sample) then
    raise exception 'Sample accounts are made by the demo seed only' using errcode = '42501';
  end if;
  if not internal.caller_is_admin() then
    if (tg_op = 'INSERT' and (new.suspended_at is not null or new.suspended_reason is not null or new.hidden_at is not null))
       or (tg_op = 'UPDATE' and (new.suspended_at is distinct from old.suspended_at or new.suspended_reason is distinct from old.suspended_reason or new.hidden_at is distinct from old.hidden_at)) then
      raise exception 'Only a moderator can change that' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.hidden_at is not null and new.portfolio_page is distinct from old.portfolio_page and new.portfolio_page <> 'off' then
      raise exception 'A moderator took your page down' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$function$;

-- ── Hidden jobs are invisible to everyone but the poster and admins ───────
-- (one SELECT policy, as before; Realtime obeys it). An applicant no longer
-- sees a hidden job they applied to either.
DROP POLICY "Jobs readable" ON public.jobs;
CREATE POLICY "Jobs readable" ON public.jobs FOR SELECT TO public
  USING (
    created_by = (SELECT auth.uid())
    OR internal.caller_is_admin()
    OR (
      hidden_at IS NULL
      AND (
        (status = 'open' AND internal.job_listed(created_by, project_id))
        OR internal.applied_to(id)
      )
    )
  );

-- ── Reinstating clears the reason (same signature and checks as 20261013040000) ──
CREATE OR REPLACE FUNCTION public.admin_set_suspended(p_user uuid, p_suspended boolean)
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
    update public.profiles set suspended_at = null, suspended_reason = null where id = p_user;
  end if;
  insert into public.audit_logs (user_id, action, resource_type, resource_id)
    values (me, case when p_suspended then 'admin_suspend_user' else 'admin_unsuspend_user' end, 'user', p_user);
end;
$function$;

-- ── Hide or restore a reported thing ───────────────────────────────────
-- message: the existing admin_hide_message; job: the job's own columns; profile:
-- the public page comes down (portfolio_page 'off', which every public reader
-- already obeys) and stays down until restored. Restoring a profile does not put
-- the page back up: its owner decides that.
CREATE FUNCTION public.admin_hide_content(p_kind text, p_target uuid, p_hidden boolean, p_reason text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := (select auth.uid());
  why text := left(nullif(btrim(coalesce(p_reason, '')), ''), 500);
begin
  if not internal.caller_is_admin() then
    raise exception 'Only an admin can do this' using errcode = '42501';
  end if;
  if p_kind = 'message' then
    perform public.admin_hide_message(p_target, p_hidden);
    return;
  elsif p_kind = 'job' then
    update public.jobs set
      hidden_at = case when p_hidden then coalesce(hidden_at, now()) else null end,
      hidden_by = case when p_hidden then coalesce(hidden_by, me) else null end,
      hidden_reason = case when p_hidden then coalesce(why, hidden_reason) else null end
    where id = p_target;
  elsif p_kind = 'profile' then
    update public.profiles set
      hidden_at = case when p_hidden then coalesce(hidden_at, now()) else null end,
      portfolio_page = case when p_hidden then 'off' else portfolio_page end
    where id = p_target;
  else
    raise exception 'Unknown kind' using errcode = '22023';
  end if;
  if not found then
    raise exception 'No such %', p_kind using errcode = 'P0002';
  end if;
  insert into public.audit_logs (user_id, action, resource_type, resource_id, details)
    values (me, case when p_hidden then 'admin_hide_' else 'admin_unhide_' end || p_kind, p_kind, p_target, jsonb_build_object('reason', why));
end;
$function$;

-- ── What state a report's thing and author are in ──────────────────────
CREATE FUNCTION public.admin_report_target(p_report uuid)
 RETURNS TABLE(author_id uuid, author_name text, hidden boolean, suspended boolean, suspended_reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r public.reports;
  who uuid;
  is_hidden boolean;
begin
  if not internal.caller_is_admin() then
    raise exception 'Only an admin can do this' using errcode = '42501';
  end if;
  select * into r from public.reports where id = p_report;
  if not found then
    raise exception 'No such report' using errcode = 'P0002';
  end if;
  if r.kind = 'message' then
    select m.sender_id, m.hidden_at is not null into who, is_hidden from public.messages m where m.id = r.target_id;
  elsif r.kind = 'job' then
    select j.created_by, j.hidden_at is not null into who, is_hidden from public.jobs j where j.id = r.target_id;
  else
    select p.id, p.hidden_at is not null into who, is_hidden from public.profiles p where p.id = r.target_id;
  end if;
  return query
    select a.id, a.username, coalesce(is_hidden, false), a.suspended_at is not null, a.suspended_reason
    from public.profiles a where a.id = who;
end;
$function$;

-- ── Settle a report with what was done ─────────────────────────────────
-- hide: hides the reported thing; suspend: suspends its author; dismiss: no action.
-- Hide and suspend need a reason (it is kept in the audit log, and a hidden job
-- shows it to its poster). The report becomes resolved (or dismissed), with the
-- outcome; a second action on a resolved report adds to the outcome. The
-- reporter is told by the existing trigger. Everything is audit-logged.
CREATE FUNCTION public.admin_moderate_report(p_report uuid, p_action text, p_reason text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := (select auth.uid());
  r public.reports;
  why text := left(nullif(btrim(coalesce(p_reason, '')), ''), 500);
  who uuid;
  done text;
begin
  if not internal.caller_is_admin() then
    raise exception 'Only an admin can do this' using errcode = '42501';
  end if;
  if p_action not in ('hide', 'suspend', 'dismiss') then
    raise exception 'Unknown action' using errcode = '22023';
  end if;
  if p_action <> 'dismiss' and why is null then
    raise exception 'Say why, in a line' using errcode = '22023';
  end if;
  select * into r from public.reports where id = p_report for update;
  if not found then
    raise exception 'No such report' using errcode = 'P0002';
  end if;

  if p_action = 'dismiss' then
    if r.status <> 'open' then
      raise exception 'This report is already settled' using errcode = '22023';
    end if;
    update public.reports set status = 'dismissed', resolved_by = me, resolved_at = now() where id = r.id;
  else
    if p_action = 'hide' then
      perform public.admin_hide_content(r.kind, r.target_id, true, why);
      done := 'hidden';
    else
      if r.kind = 'message' then select sender_id into who from public.messages where id = r.target_id;
      elsif r.kind = 'job' then select created_by into who from public.jobs where id = r.target_id;
      else who := r.target_id;
      end if;
      if who is null then
        raise exception 'No such person' using errcode = 'P0002';
      end if;
      perform public.admin_set_suspended(who, true);
      update public.profiles set suspended_reason = why where id = who;
      done := 'suspended';
    end if;
    update public.reports set
      status = case when status = 'open' then 'resolved' else status end,
      resolved_by = coalesce(resolved_by, me),
      resolved_at = coalesce(resolved_at, now()),
      outcome = case when outcome is null or outcome = done then done else 'hidden_and_suspended' end
    where id = r.id;
  end if;

  insert into public.audit_logs (user_id, action, resource_type, resource_id, details)
    values (me, 'admin_moderate_report', 'report', r.id, jsonb_build_object('action', p_action, 'kind', r.kind, 'target', r.target_id, 'reason', why));
end;
$function$;

REVOKE ALL ON FUNCTION public.admin_hide_content(text, uuid, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_report_target(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_moderate_report(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_hide_content(text, uuid, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_report_target(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_moderate_report(uuid, text, text) TO authenticated, service_role;
