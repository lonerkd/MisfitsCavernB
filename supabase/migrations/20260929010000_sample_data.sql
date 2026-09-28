-- Sample data stays in the demo it was made for.
--
-- The demo world (scripts/demo) gives an account projects, crew and cast to
-- play with. Its sample people and projects are real rows, so without this
-- they'd count in the platform's numbers on the landing page, list their
-- casting calls on everyone's Jobs board, fill the crew directory and show
-- up as "recent work". profiles.is_sample / projects.is_sample mark them:
-- public surfaces leave them out, and the people inside the demo (the
-- project's owner and crew) still see everything as usual.

ALTER TABLE public.profiles ADD COLUMN is_sample boolean DEFAULT false NOT NULL;
ALTER TABLE public.projects ADD COLUMN is_sample boolean DEFAULT false NOT NULL;
-- profiles is readable column by column (private fields stay private); this one isn't private.
GRANT SELECT (is_sample) ON public.profiles TO anon, authenticated;

-- What the demo seed already made.
UPDATE public.profiles p SET is_sample = true
  FROM auth.users u
 WHERE u.id = p.id AND u.email LIKE '%@demo.misfitscavern.invalid';
UPDATE public.projects SET is_sample = true
 WHERE settings ->> 'demo' = 'true'
    OR creator_id IN (SELECT id FROM public.profiles WHERE is_sample);

CREATE INDEX profiles_sample_idx ON public.profiles USING btree (id) WHERE is_sample;
CREATE INDEX projects_sample_idx ON public.projects USING btree (id) WHERE is_sample;

-- Nobody marks themselves (or unmarks themselves) as sample.
CREATE OR REPLACE FUNCTION internal.profiles_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if tg_op = 'INSERT' and coalesce(new.is_admin, false) then
    raise exception 'Admin rights can only be granted by an admin' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.is_admin is distinct from old.is_admin and not internal.caller_is_admin() then
    raise exception 'Admin rights can only be granted by an admin' using errcode = '42501';
  end if;
  if (tg_op = 'INSERT' and new.is_sample) or (tg_op = 'UPDATE' and new.is_sample is distinct from old.is_sample) then
    raise exception 'Sample accounts are made by the demo seed only' using errcode = '42501';
  end if;
  return new;
end;
$function$;

-- A job is listed for everyone unless it's sample work — then only for the
-- people inside that demo production (its owner and confirmed crew).
CREATE FUNCTION internal.job_listed(p_creator uuid, p_project uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select not (exists (select 1 from public.profiles where id = p_creator and is_sample)
           or exists (select 1 from public.projects where id = p_project and is_sample))
      or (p_project is not null and (select auth.uid()) is not null and (
            exists (select 1 from public.projects p where p.id = p_project and p.creator_id = (select auth.uid()))
         or exists (select 1 from public.project_crew c
                     where c.project_id = p_project and c.user_id = (select auth.uid()) and c.status = 'confirmed')));
$function$;
REVOKE ALL ON FUNCTION internal.job_listed(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION internal.job_listed(uuid, uuid) TO anon, authenticated;

DROP POLICY "Jobs publicly readable" ON public.jobs;
CREATE POLICY "Jobs publicly readable" ON public.jobs FOR SELECT TO public
  USING (created_by = (SELECT auth.uid()) OR (status = 'open' AND internal.job_listed(created_by, project_id)));

-- Platform totals without the sample world.
CREATE OR REPLACE FUNCTION public.get_platform_stats()
 RETURNS TABLE(creators bigint, projects bigint, scripts bigint, media bigint, jobs bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select (select count(*) from public.profiles where not is_sample),
         (select count(*) from public.projects where not is_sample),
         (select count(*) from public.scripts s
           where not exists (select 1 from public.projects p where p.id = s.project_id and p.is_sample)),
         (select count(*) from public.media m
           where not exists (select 1 from public.projects p where p.id = m.project_id and p.is_sample)),
         (select count(*) from public.jobs j
           where not exists (select 1 from public.projects p where p.id = j.project_id and p.is_sample)
             and not exists (select 1 from public.profiles u where u.id = j.created_by and u.is_sample));
$function$;

CREATE OR REPLACE FUNCTION public.get_public_showcase(p_limit integer DEFAULT 24)
 RETURNS TABLE(media_id uuid, kind text, title text, storage_path text, external_url text, project_title text, share_token text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select m.id, m.kind, m.title, m.storage_path, m.external_url, p.title, p.share_token
  from public.media m join public.projects p on p.id = m.project_id
  where m.shared and p.visibility = 'public' and not p.is_sample and m.kind in ('image', 'video')
  order by m.created_at desc
  limit least(greatest(coalesce(p_limit, 24), 1), 100);
$function$;

-- The newest published work for the landing page, without sample work.
CREATE FUNCTION public.get_recent_work(p_limit integer DEFAULT 3)
 RETURNS TABLE(title text, year integer, category text, role text, accent_color text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select w.title, w.year, w.category, w.role, w.accent_color
    from public.portfolio_projects w
   where not exists (select 1 from public.profiles u where u.id = w.user_id and u.is_sample)
     and not exists (select 1 from public.projects p where p.id = w.source_project_id and p.is_sample)
   order by w.created_at desc
   limit least(greatest(coalesce(p_limit, 3), 1), 24);
$function$;
REVOKE ALL ON FUNCTION public.get_recent_work(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recent_work(integer) TO anon, authenticated;
