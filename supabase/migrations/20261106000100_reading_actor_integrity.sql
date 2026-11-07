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
CREATE OR REPLACE FUNCTION internal.reading_memory_from_correction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is null then return new; end if;
  insert into public.reading_memory (user_id, script_format, kind, name)
  values ((select auth.uid()), 'screenplay', case new.kind when 'character' then 'confirmed_name' else 'rejected_name' end, new.name)
  on conflict (user_id, script_format, kind, name) do update set count = public.reading_memory.count + 1, updated_at = now();
  return new;
end;
$function$;
