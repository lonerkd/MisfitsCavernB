-- Story beat → script (BACKLOG 3.8): add text to the end of a script in one
-- statement, so it can't race a whole-document save that read the script
-- first. The editor's live sync is whole-document, last-writer-wins: the
-- app also broadcasts an `append` on the script's channel, and open editors
-- add the same text to their own copy — a co-writer's unsaved typing is kept
-- and their next save carries the beat.
--
-- SECURITY INVOKER: the "scripts update" policy decides who may append (a
-- personal script's author, or anyone who can open the project). No new
-- definer function.

CREATE FUNCTION public.append_to_script(p_script uuid, p_text text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
declare
  v_length integer;
begin
  if p_text is null or length(p_text) = 0 or length(p_text) > 10000 then
    raise exception 'Text to add must be 1 to 10000 characters' using errcode = '22023';
  end if;
  update public.scripts
     set content = coalesce(content, '') || p_text,
         updated_at = now(),
         last_edited_by = (select auth.uid())
   where id = p_script
  returning length(content) into v_length;
  if v_length is null then
    raise exception 'Script not found' using errcode = 'P0002';
  end if;
  return v_length;
end;
$function$;

REVOKE ALL ON FUNCTION public.append_to_script(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.append_to_script(uuid, text) TO authenticated;
