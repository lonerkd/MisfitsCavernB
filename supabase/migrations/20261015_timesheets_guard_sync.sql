CREATE OR REPLACE FUNCTION internal.timesheets_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  me uuid := (select auth.uid());
  shaper boolean := internal.can_shape_project(new.project_id);
begin
  if tg_op = 'UPDATE' and (new.project_id <> old.project_id or new.user_id <> old.user_id) then
    raise exception 'A timesheet stays with its person and project' using errcode = '42501';
  end if;
  if not shaper then
    if new.status <> 'submitted' then
      raise exception 'Only the owner and leads approve hours' using errcode = '42501';
    end if;
    if tg_op = 'INSERT' then
      new.rate := null;
    else
      new.rate := old.rate;
    end if;
  end if;
  -- New: nobody decides their own hours; only the project owner can.
  if me is not null
     and new.user_id = me
     and new.status <> 'submitted'
     and (tg_op = 'INSERT' or new.status is distinct from old.status)
     and not internal.is_project_creator(new.project_id) then
    raise exception 'Someone else has to approve your hours' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.status = old.status and old.status <> 'submitted'
     and (new.hours, new.work_date) is distinct from (old.hours, old.work_date) then
    new.status := 'submitted';
  end if;
  if new.status = 'submitted' then
    new.decided_by := null;
    new.decided_at := null;
  elsif tg_op = 'INSERT' or new.status is distinct from old.status then
    new.decided_by := me;
    new.decided_at := now();
  else
    new.decided_by := old.decided_by;
    new.decided_at := old.decided_at;
  end if;
  return new;
end;
$function$;