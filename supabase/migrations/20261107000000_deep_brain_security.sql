-- Harden deep-brain memory: created_by/forced_by are always the acting user, never client-supplied.
-- (Split out from 20261104000000_deep_brain_memory.sql so the applied migration stays untouched.)

CREATE FUNCTION internal.line_overrides_set_forced_by()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.forced_by := auth.uid();
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION internal.line_overrides_set_forced_by() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER reading_line_overrides_set_forced_by BEFORE INSERT OR UPDATE ON public.reading_line_overrides
  FOR EACH ROW EXECUTE FUNCTION internal.line_overrides_set_forced_by();

-- reading_memory_from_correction now attributes to auth.uid() instead of new.created_by.
CREATE OR REPLACE FUNCTION internal.reading_memory_from_correction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then return new; end if;
  insert into public.reading_memory (user_id, script_format, kind, name)
  values (auth.uid(), 'screenplay', case new.kind when 'character' then 'confirmed_name' else 'rejected_name' end, new.name)
  on conflict (user_id, script_format, kind, name) do update set count = public.reading_memory.count + 1, updated_at = now();
  return new;
end;
$function$;
