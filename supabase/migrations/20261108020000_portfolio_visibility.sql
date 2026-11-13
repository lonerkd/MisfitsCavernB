-- Portfolio privacy that is real (owner, 2026-11-08: private until published). Until now the three portfolio tables were readable by
-- anyone, signed in or not, by a direct query, so the share token on each piece protected nothing: anyone could list every piece and
-- its token. Now each piece is public, unlisted (reachable only through its share link) or private (its owner only), and the database
-- decides, not the token.
--
-- Existing pieces were already readable by everyone, so they stay public (nothing that was shown disappears); a new piece is private
-- until its owner publishes it.
ALTER TABLE public.portfolio_projects
  ADD COLUMN visibility text NOT NULL DEFAULT 'private',
  ADD CONSTRAINT portfolio_projects_visibility_check CHECK (visibility IN ('public', 'unlisted', 'private'));
UPDATE public.portfolio_projects SET visibility = 'public';

-- One SELECT policy per table. Anyone (anon included) reads public pieces; an owner reads their own whatever their visibility.
-- Unlisted pieces are not readable through the tables at all: they are reached through get_shared_portfolio(token) below.
DROP POLICY "Portfolio publicly readable" ON public.portfolio_projects;
CREATE POLICY "portfolio_projects view" ON public.portfolio_projects FOR SELECT TO anon, authenticated
  USING (visibility = 'public' OR user_id = (SELECT auth.uid()));

-- Media and blocks follow their piece: readable exactly when the piece is (the subquery runs under the caller's own rights on the
-- piece table, so it applies the rule above).
DROP POLICY "Portfolio media readable" ON public.portfolio_media;
CREATE POLICY "portfolio_media view" ON public.portfolio_media FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.portfolio_projects p WHERE p.id = portfolio_media.project_id));
DROP POLICY "Portfolio blocks readable" ON public.portfolio_blocks;
CREATE POLICY "portfolio_blocks view" ON public.portfolio_blocks FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.portfolio_projects p WHERE p.id = portfolio_blocks.portfolio_project_id));

-- A piece by its share link, for the public page and its link preview: public or unlisted, never private. Returns the piece with its
-- media, its blocks in order and its author's public profile, as one document; null for an unknown token or a private piece.
CREATE FUNCTION public.get_shared_portfolio(p_token text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT to_jsonb(p)
         || jsonb_build_object(
              'portfolio_media', coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.created_at, m.id) FROM public.portfolio_media m WHERE m.project_id = p.id), '[]'::jsonb),
              'portfolio_blocks', coalesce((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.position, b.id) FROM public.portfolio_blocks b WHERE b.portfolio_project_id = p.id), '[]'::jsonb),
              'profiles', (SELECT jsonb_build_object('username', pr.username, 'role', pr.role, 'avatar_url', pr.avatar_url) FROM public.profiles pr WHERE pr.id = p.user_id))
    FROM public.portfolio_projects p
   WHERE coalesce(p_token, '') <> ''
     AND p.share_token = p_token
     AND p.visibility IN ('public', 'unlisted');
$function$;
REVOKE ALL ON FUNCTION public.get_shared_portfolio(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_portfolio(text) TO anon, authenticated;

-- The two existing definer functions that listed pieces as "already public" now say so: only public pieces.
CREATE OR REPLACE FUNCTION public.get_recent_work(p_limit integer DEFAULT 3)
 RETURNS TABLE(title text, year integer, category text, role text, accent_color text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select w.title, w.year, w.category, w.role, w.accent_color
    from public.portfolio_projects w
   where w.visibility = 'public'
     and not exists (select 1 from public.profiles u where u.id = w.user_id and u.is_sample)
     and not exists (select 1 from public.projects p where p.id = w.source_project_id and p.is_sample)
   order by w.created_at desc
   limit least(greatest(coalesce(p_limit, 3), 1), 24);
$function$;

CREATE OR REPLACE FUNCTION public.get_person_credits(p_user uuid)
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
         (select pp.id from public.portfolio_projects pp
           where pp.user_id = p_user and pp.source_project_id = p.id
             and (pp.visibility = 'public' or pp.user_id = (select auth.uid()))
           limit 1)
    from credits cr
    join public.projects p on p.id = cr.pid
    left join public.crafts cf on cf.name = cr.credit
   where p.visibility = 'public' or internal.can_access_project(p.id)
   order by p.created_at desc, cr.ord, cr.credit, cr.character_name;
$function$;
