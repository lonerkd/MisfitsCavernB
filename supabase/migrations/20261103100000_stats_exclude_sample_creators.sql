-- The platform totals leave out the sample world (demo data, test and bot
-- accounts). Until now a script or a media item counted unless its *project*
-- was a sample, so a sample account's work with no project (a loose script)
-- still inflated the public numbers. It now also leaves out work created by a
-- sample account. Same signature and return shape; nothing else changes.
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
             and not exists (select 1 from public.profiles u where u.id = s.created_by and u.is_sample)),
         (select count(*) from public.media m
           where not exists (select 1 from public.projects p where p.id = m.project_id and p.is_sample)
             and not exists (select 1 from public.profiles u where u.id = m.created_by and u.is_sample)),
         (select count(*) from public.jobs j
           where not exists (select 1 from public.projects p where p.id = j.project_id and p.is_sample)
             and not exists (select 1 from public.profiles u where u.id = j.created_by and u.is_sample));
$function$;
