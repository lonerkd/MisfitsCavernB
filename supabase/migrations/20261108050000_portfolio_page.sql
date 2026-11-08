-- A person's own portfolio page (/u/<username>): a profile setting says whether it exists. Private until published (owner,
-- 2026-11-08): 'off' by default, 'unlisted' (reachable by the handle, never indexed or listed) or 'public' (indexable and findable).
-- Only the person's PUBLIC pieces are ever on it: an unlisted piece is reached by its own link, a private one by nobody.
ALTER TABLE public.profiles ADD COLUMN portfolio_page text NOT NULL DEFAULT 'off';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_portfolio_page_check CHECK (portfolio_page IN ('off', 'unlisted', 'public'));

-- The page for a handle (the username, matched without regard to case; an exact match wins): the person's public profile fields and
-- their public pieces, or null when there is no such person or their page is off. A definer function so the public, signed-out
-- page reads exactly this and nothing else of the profile (the profiles table itself is not opened to it).
CREATE FUNCTION public.get_portfolio_page(p_handle text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT jsonb_build_object(
           'profile', jsonb_build_object('username', pr.username, 'role', pr.role, 'location', pr.location, 'bio', pr.bio,
                                         'avatar_url', pr.avatar_url, 'status', pr.status),
           'page', pr.portfolio_page,
           'pieces', coalesce((
             SELECT jsonb_agg(jsonb_build_object('title', p.title, 'year', p.year, 'role', p.role, 'category', p.category,
                                                 'description', p.description, 'cover_url', p.cover_url,
                                                 'accent_color', p.accent_color, 'share_token', p.share_token)
                              ORDER BY p.year DESC NULLS LAST, p.created_at DESC)
               FROM public.portfolio_projects p
              WHERE p.user_id = pr.id AND p.visibility = 'public'), '[]'::jsonb))
    FROM public.profiles pr
   WHERE coalesce(btrim(p_handle), '') <> ''
     AND lower(pr.username) = lower(btrim(p_handle))
     AND pr.portfolio_page IN ('unlisted', 'public')
   ORDER BY (pr.username = btrim(p_handle)) DESC
   LIMIT 1;
$function$;
REVOKE ALL ON FUNCTION public.get_portfolio_page(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_portfolio_page(text) TO anon, authenticated;

-- profiles is column-granted (select * is refused): the owner may change this one setting on their own row (the existing row policy
-- limits the update to their own profile) and reads it back through a function. It is deliberately NOT readable through the table,
-- so nobody can enumerate which people have a link-only page.
GRANT UPDATE (portfolio_page) ON public.profiles TO authenticated;

CREATE FUNCTION public.get_my_portfolio_page()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT portfolio_page FROM public.profiles WHERE id = (SELECT auth.uid());
$function$;
REVOKE ALL ON FUNCTION public.get_my_portfolio_page() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_portfolio_page() TO authenticated;
