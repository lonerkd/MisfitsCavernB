-- The public directory of portfolios (/portfolios): the people whose own page is PUBLIC, findable by name, craft or place. A page set
-- to link only is never listed (that is the per-portfolio opt-out, owner 2026-11-08: findable, with an opt-out), and a page that is
-- off does not exist. Sample and test accounts are left out, like every other public total. Only public profile fields and a count and
-- cover of the PUBLIC pieces leave the database. A definer function: the profiles table is column-granted and its page setting is
-- deliberately not readable, so a listing can only come through here.
CREATE FUNCTION public.list_public_portfolios(p_query text DEFAULT NULL, p_limit integer DEFAULT 24, p_offset integer DEFAULT 0)
 RETURNS TABLE(username text, role text, location text, bio text, avatar_url text, status text, pieces integer, cover_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT pr.username, pr.role, pr.location, left(pr.bio, 240), pr.avatar_url, pr.status,
         (SELECT count(*)::integer FROM public.portfolio_projects p WHERE p.user_id = pr.id AND p.visibility = 'public'),
         (SELECT p.cover_url FROM public.portfolio_projects p
           WHERE p.user_id = pr.id AND p.visibility = 'public' AND p.cover_url IS NOT NULL
           ORDER BY p.year DESC NULLS LAST, p.created_at DESC LIMIT 1)
    FROM public.profiles pr
   WHERE pr.portfolio_page = 'public'
     AND NOT pr.is_sample
     AND (coalesce(btrim(p_query), '') = ''
          OR pr.username ILIKE '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
          OR coalesce(pr.role, '') ILIKE '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
          OR coalesce(pr.location, '') ILIKE '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%')
   ORDER BY 7 DESC, pr.username
   LIMIT least(greatest(coalesce(p_limit, 24), 1), 49)
   OFFSET greatest(coalesce(p_offset, 0), 0);
$function$;
REVOKE ALL ON FUNCTION public.list_public_portfolios(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_portfolios(text, integer, integer) TO anon, authenticated;
