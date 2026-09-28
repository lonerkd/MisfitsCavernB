-- Onboarding + the projects board.
--
-- projects.archived_at: the owner shelves a project (finished, abandoned, on
-- hold). It leaves the board and the project pickers until restored; nothing
-- in it changes. Set through the existing "Creators update projects" policy.
--
-- projects_progress(ids): project_progress() for each project the caller can
-- see, keyed by id, in one round trip, so every card on the board can show
-- how far its phase has come. Projects the caller can't see are left out.

ALTER TABLE public.projects ADD COLUMN archived_at timestamp with time zone;

CREATE FUNCTION public.projects_progress(p_projects uuid[])
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_object_agg(x.id, x.progress), '{}'::jsonb)
  from (
    select ids.id, public.project_progress(ids.id) as progress
    from (select distinct unnest(p_projects[1:200]) as id) ids
  ) x
  where x.progress is not null;
$function$;
REVOKE ALL ON FUNCTION public.projects_progress(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.projects_progress(uuid[]) TO authenticated;
