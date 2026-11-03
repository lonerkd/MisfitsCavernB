-- The platform totals leave out the sample world (demo data, test and bot
-- accounts). Until now a script counted unless its *project* was a sample, so a
-- sample account's loose script (no project) still inflated the public numbers.
-- A script with no project, created by a sample account, is now left out too.
-- Work inside a real project still counts with that project; media always has a
-- project, so it already followed its project. Same signature and return shape;
-- nothing else changes.
CREATE OR REPLACE FUNCTION public.get_platform_stats()
 RETURNS TABLE(creators bigint, projects bigint, scripts bigint, media bigint, jobs bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select (select count(*) from public.profiles where not is_sample),
         (select count(*) from public.projects where not is_sample),
         (select count(*) from public.scripts s
           where not exists (select 1 from public.projects p where p.id = s.project_id and p.is_sample)
             and not (s.project_id is null and exists (select 1 from public.profiles u where u.id = s.created_by and u.is_sample))),
         (select count(*) from public.media m
           where not exists (select 1 from public.projects p where p.id = m.project_id and p.is_sample)),
         (select count(*) from public.jobs j
           where not exists (select 1 from public.projects p where p.id = j.project_id and p.is_sample)
             and not exists (select 1 from public.profiles u where u.id = j.created_by and u.is_sample));
$function$;
