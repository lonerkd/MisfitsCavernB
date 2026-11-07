-- Reading memory and line overrides: who did it is the acting user, never a value the client supplies.
-- (These two changes began as edits to 20261104000000, which is already applied to production; a merged
-- migration is never edited, so they live here.)

-- A line override's forced_by defaults to the caller but a client could name someone else: a trigger sets it.
CREATE FUNCTION internal.line_overrides_set_forced_by()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.forced_by := (select auth.uid());
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.line_overrides_set_forced_by() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER reading_line_overrides_set_forced_by BEFORE INSERT OR UPDATE ON public.reading_line_overrides
  FOR EACH ROW EXECUTE FUNCTION internal.line_overrides_set_forced_by();

-- A verdict on a name is remembered in the *acting* person's private memory, not under a created_by the client chose.
-- A CHANGED verdict (the Character Bible upserts, so changing NIGHT from "not a character" to "is a character" is an UPDATE)
-- replaces the old one: its entry is counted down (or removed when it was the only one), so a rejection is not left behind
-- beside the new confirmation.
CREATE OR REPLACE FUNCTION internal.reading_memory_from_correction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := (select auth.uid());
  old_kind text;
begin
  if me is null then return new; end if;
  if TG_OP = 'UPDATE' and (old.kind is distinct from new.kind or old.name is distinct from new.name) then
    old_kind := case old.kind when 'character' then 'confirmed_name' else 'rejected_name' end;
    -- Remove the old entry if it was the only verdict behind it, else count it down (delete first: the update lands on count > 1).
    delete from public.reading_memory
     where user_id = me and script_format = 'screenplay' and kind = old_kind and name = old.name and count <= 1;
    update public.reading_memory set count = count - 1, updated_at = now()
     where user_id = me and script_format = 'screenplay' and kind = old_kind and name = old.name and count > 1;
  end if;
  insert into public.reading_memory (user_id, script_format, kind, name)
  values (me, 'screenplay', case new.kind when 'character' then 'confirmed_name' else 'rejected_name' end, new.name)
  on conflict (user_id, script_format, kind, name) do update set count = public.reading_memory.count + 1, updated_at = now();
  return new;
end;
$function$;
CREATE TRIGGER reading_corrections_sync_memory_update AFTER UPDATE OF kind, name ON public.reading_corrections
  FOR EACH ROW WHEN (old.kind IS DISTINCT FROM new.kind OR old.name IS DISTINCT FROM new.name)
  EXECUTE FUNCTION internal.reading_memory_from_correction();
