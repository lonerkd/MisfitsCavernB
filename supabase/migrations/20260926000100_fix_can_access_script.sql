-- internal.can_access_script referenced public.is_project_creator and
-- public.is_project_member, which have never existed — the helpers live in the
-- `internal` schema. Postgres resolves every function a query can reach when it
-- plans it, so every read or write of script_metadata (title page, character
-- bible) and script_revisions failed with "function public.is_project_creator
-- (uuid) does not exist" — for every user, owner included.
--
-- Proven by tests/integration/scripts-access.test.ts (fails before, passes after).
CREATE OR REPLACE FUNCTION internal.can_access_script(sid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.scripts s
    where s.id = sid and (
      s.created_by = auth.uid()
      or s.last_edited_by = auth.uid()
      or (s.project_id is not null and (
        internal.is_project_creator(s.project_id) or internal.is_project_member(s.project_id)
      ))
    )
  );
$function$;
