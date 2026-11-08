-- Review of 20261107000000 (Copilot, on #437): the author could rewrite a note's context or clear its scene, and a loose script's
-- recipient came from a field a member can edit. Replaces both functions.
CREATE OR REPLACE FUNCTION internal.notes_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if TG_OP = 'INSERT' then
    if (select auth.uid()) is not null then new.created_by := (select auth.uid()); end if;
    new.created_at := now();
    new.updated_at := now();
    if new.script_id is not null then
      declare sp uuid;
      begin
        select s.project_id into sp from public.scripts s where s.id = new.script_id;
        if new.project_id is not null and new.project_id is distinct from sp then
          raise exception 'That script is not in this project' using errcode = '23514';
        end if;
        new.project_id := sp;
      end;
    end if;
    if new.scene_id is not null and not exists (
      select 1 from public.scenes sc
      where sc.id = new.scene_id
        and case when new.script_id is not null then sc.script_id = new.script_id else sc.project_id is not distinct from new.project_id end
    ) then
      raise exception 'That scene is not in this script' using errcode = '23514';
    end if;
  else
    -- scene_id may go to NULL (the scene was deleted: the foreign key sets it), but never to a different scene.
    if new.scope is distinct from old.scope or new.project_id is distinct from old.project_id or new.script_id is distinct from old.script_id
       or new.context is distinct from old.context
       -- scene_id goes to NULL only when the scene itself is deleted (the foreign key's own UPDATE runs one trigger level
       -- deeper than a client's); a client can neither clear it nor move it.
       or (new.scene_id is distinct from old.scene_id and (new.scene_id is not null or pg_trigger_depth() < 2))
       or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
      raise exception 'Only the text of a note can change' using errcode = '42501';
    end if;
    new.updated_at := now();
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION internal.notes_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  who uuid;
  author text;
  ttl text;
  lnk text;
  txt text;
begin
  if new.scope = 'private' then return new; end if;
  select coalesce(nullif(p.username, ''), 'Someone') into author from public.profiles p where p.id = new.created_by;
  author := coalesce(author, 'Someone');
  ttl := left(format('%s added a %s note', author, case new.scope when 'project' then 'project' else 'writer' end), 200);
  txt := left(case when new.context is null then '' else new.context || ': ' end || new.body, 1000);
  lnk := case new.scope when 'project' then '/studio?project=' || new.project_id else '/editor?script=' || new.script_id end;
  for who in
    select u from (
      select internal.call_sheet_recipients(new.project_id) as u where new.scope = 'project'
      union
      -- Recipients come from the project's roster, never from fields on the script (a member can edit those). A note on a
      -- loose script has nobody to tell: only its owner can open it, and the owner wrote it.
      select internal.call_sheet_recipients(new.project_id) where new.scope = 'writer' and new.project_id is not null
    ) r where u is not null and u <> new.created_by
  loop
    insert into public.notifications (user_id, type, title, body, link, created_by)
    values (who, 'note', ttl, txt, lnk, new.created_by);
  end loop;
  return new;
end;
$function$;
