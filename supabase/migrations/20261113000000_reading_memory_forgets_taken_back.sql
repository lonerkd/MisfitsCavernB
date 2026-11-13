-- Taking a verdict back (removing a reading correction) must also take it out of the person's own reading memory.
-- reading_memory_from_correction() already adds a count on INSERT and counts the old entry down when a verdict is
-- CHANGED; deleting one left the memory row behind, so "Read X as a character again" was undone on the next load of the
-- editor (the memory still said "rejected") and X stayed rejected in that person's other scripts.
--
-- A definer trigger in `internal` (no grants). It touches only the ACTING person's own memory row: someone on the crew
-- removing another person's verdict does not reach into that person's private memory. System deletes (no auth.uid(),
-- for example a project being deleted) change nothing.
CREATE FUNCTION internal.reading_memory_forget_correction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := (select auth.uid());
  mem_kind text := case old.kind when 'character' then 'confirmed_name' else 'rejected_name' end;
begin
  if me is null then return old; end if;
  -- Remove the entry if this verdict was the only one behind it, else count it down (delete first: the update lands on count > 1).
  delete from public.reading_memory
   where user_id = me and script_format = 'screenplay' and kind = mem_kind and name = old.name and count <= 1;
  update public.reading_memory set count = count - 1, updated_at = now()
   where user_id = me and script_format = 'screenplay' and kind = mem_kind and name = old.name and count > 1;
  return old;
end;
$function$;
REVOKE ALL ON FUNCTION internal.reading_memory_forget_correction() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER reading_corrections_forget_memory AFTER DELETE ON public.reading_corrections
  FOR EACH ROW EXECUTE FUNCTION internal.reading_memory_forget_correction();
