-- When sign-up, reset or change-password refuses a breached password, log it
-- once: a keyed HMAC of the address (never the address), the count and the
-- context. Anyone can write through the function; only admins read.

-- ── secret key ────────────────────────────────────────────────────────────────
-- One row, auto-generated. SECURITY DEFINER functions read it; nothing else has
-- API access (no grant on this table).
create table internal.password_breach_secret (
  id      boolean primary key default true,
  secret  bytea   not null default gen_random_bytes(32),
  constraint one_row check (id)
);
insert into internal.password_breach_secret default values;

-- ── function ──────────────────────────────────────────────────────────────────
create or replace function public.log_password_breach(
  p_breach_count integer,
  p_context      text,
  p_email        text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email      text;
  v_secret     bytea;
  v_hash       text;
  v_user_id    uuid;
  v_daily      integer;
begin
  -- Validate
  v_email := lower(trim(coalesce(p_email, '')));
  if v_email = '' or position('@' in v_email) = 0 then return; end if;
  if coalesce(p_breach_count, 0) <= 0 then return; end if;
  if p_context not in ('signup', 'change', 'reset') then return; end if;

  v_user_id := auth.uid();

  -- Rate limit: max 10 rows per user per calendar day
  select count(*) into v_daily
  from public.audit_logs
  where action = 'password_breach_detected'
    and (
      (v_user_id is not null and user_id = v_user_id)
      or (v_user_id is null and user_id is null
          and created_at >= now() - interval '1 hour')
    )
    and created_at >= (current_date at time zone 'utc');
  if v_daily >= 10 then return; end if;

  -- HMAC-SHA256 with the stored secret (case-folded address)
  select secret into v_secret from internal.password_breach_secret limit 1;
  v_hash := encode(hmac(v_email, v_secret, 'sha256'), 'hex');

  insert into public.audit_logs (user_id, action, resource_type, details)
  values (
    v_user_id,
    'password_breach_detected',
    'auth',
    jsonb_build_object(
      'email_hash',   v_hash,
      'breach_count', least(p_breach_count, 2147483647),
      'context',      p_context
    )
  );
end;
$$;

grant execute on function public.log_password_breach(integer, text, text) to anon, authenticated;

-- ── retention (pg_cron) ───────────────────────────────────────────────────────
select cron.schedule(
  'password-breach-log-retention',
  '0 3 * * *',
  $$delete from public.audit_logs
      where action = 'password_breach_detected'
        and created_at < now() - interval '90 days'$$
);
