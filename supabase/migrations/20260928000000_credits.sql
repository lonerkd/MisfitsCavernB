-- Credits: who did what on which project, derived from the work itself —
-- the project's creator, its confirmed crew (their craft) and its cast (the
-- character) — never typed twice. They follow people to their profile and
-- portfolio, and fill the project's press kit on its share page.
--
-- Privacy: a person's credits show a project to anyone only when the project
-- is public; teammates also see the team's non-public projects. A press kit
-- resolves only for link/public projects with the exact share token.

CREATE FUNCTION public.get_person_credits(p_user uuid)
 RETURNS TABLE(project_id uuid, title text, project_type text, year integer, accent_color text,
               kind text, credit text, character_name text, department text, portfolio_project_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with credits as (
    select p.id as pid, 'creator'::text as kind, coalesce(nullif(pr.role, ''), 'Filmmaker') as credit, null::text as character_name, 0 as ord
      from public.projects p join public.profiles pr on pr.id = p.creator_id
     where p.creator_id = p_user
    union all
    select c.project_id, 'crew', coalesce(c.craft, initcap(c.role)), null, 1
      from public.project_crew c
     where c.user_id = p_user and coalesce(c.status, 'confirmed') = 'confirmed'
    union all
    select k.project_id, 'cast', 'Cast', k.character_name, 2
      from public.character_castings k
     where k.crew_user_id = p_user
  )
  select p.id, p.title, p.project_type, extract(year from p.created_at)::integer, p.accent_color,
         cr.kind, cr.credit, cr.character_name, cf.department,
         (select pp.id from public.portfolio_projects pp where pp.user_id = p_user and pp.source_project_id = p.id limit 1)
    from credits cr
    join public.projects p on p.id = cr.pid
    left join public.crafts cf on cf.name = cr.credit
   where p.visibility = 'public' or internal.can_access_project(p.id)
   order by p.created_at desc, cr.ord, cr.credit, cr.character_name;
$function$;
REVOKE ALL ON FUNCTION public.get_person_credits(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_person_credits(uuid) TO anon, authenticated;

-- The share page's press kit: cast and crew in department order, and the
-- festivals that selected the film.
CREATE FUNCTION public.get_press_kit(p_token text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'credits', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', x.user_id, 'username', x.username, 'kind', x.kind,
                                          'credit', x.credit, 'character_name', x.character_name, 'department', x.department)
                       order by x.ord, x.pos, x.credit, x.character_name, x.username)
        from (
          select pr.id as user_id, pr.username, 'creator'::text as kind, coalesce(nullif(pr.role, ''), 'Filmmaker') as credit,
                 null::text as character_name, cf.department, 0 as ord, coalesce(cf.position, 0) as pos
            from public.profiles pr left join public.crafts cf on cf.name = pr.role
           where pr.id = p.creator_id
          union all
          select pr.id, pr.username, 'crew', coalesce(c.craft, initcap(c.role)), null, cf.department, 1, coalesce(cf.position, 9999)
            from public.project_crew c join public.profiles pr on pr.id = c.user_id
            left join public.crafts cf on cf.name = c.craft
           where c.project_id = p.id and coalesce(c.status, 'confirmed') = 'confirmed' and c.user_id <> p.creator_id
          union all
          select pr.id, pr.username, 'cast', 'Cast', k.character_name, null, 2, 0
            from public.character_castings k join public.profiles pr on pr.id = k.crew_user_id
           where k.project_id = p.id
        ) x), '[]'::jsonb),
    'laurels', coalesce((
      select jsonb_agg(jsonb_build_object('name', f->>'name') order by f->>'name')
        from jsonb_array_elements(case when jsonb_typeof(p.festival_submissions) = 'array' then p.festival_submissions else '[]'::jsonb end) f
       where f->>'status' = 'accepted' and coalesce(f->>'name', '') <> ''), '[]'::jsonb)
  )
  from public.projects p
  where p.share_token = p_token and p.visibility in ('link', 'public');
$function$;
REVOKE ALL ON FUNCTION public.get_press_kit(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_press_kit(text) TO anon, authenticated;
