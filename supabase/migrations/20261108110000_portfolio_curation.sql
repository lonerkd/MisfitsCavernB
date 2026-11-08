-- A person arranges their own portfolio: pin up to three pieces to the top and put the rest in the order they choose
-- (owner, 2026-11-08: "simple": reorder and pin, no sections). `position` is null until they arrange it (those keep the old
-- order: newest year first); pinned pieces always lead. The limit of three pins is the database's, not the screen's.
-- Who may change them is already decided by the table's own policies (a person's own pieces only). The person's page lists in
-- this order (CREATE OR REPLACE keeps the function's grants; everything else about it is unchanged).
ALTER TABLE public.portfolio_projects
  ADD COLUMN pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN position integer,
  ADD CONSTRAINT portfolio_projects_position_check CHECK (position IS NULL OR position BETWEEN 0 AND 10000);

CREATE FUNCTION internal.portfolio_pin_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.pinned and (select count(*) from public.portfolio_projects x where x.user_id = new.user_id and x.pinned and x.id <> new.id) >= 3 then
    raise exception 'Pin at most three pieces' using errcode = '23514';
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.portfolio_pin_limit() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER portfolio_pin_limit BEFORE INSERT OR UPDATE OF pinned ON public.portfolio_projects
  FOR EACH ROW WHEN (new.pinned) EXECUTE FUNCTION internal.portfolio_pin_limit();

CREATE OR REPLACE FUNCTION public.get_portfolio_page(p_handle text)
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
                                                 'accent_color', p.accent_color, 'share_token', p.share_token, 'pinned', p.pinned)
                              ORDER BY p.pinned DESC, p.position NULLS LAST, p.year DESC NULLS LAST, p.created_at DESC)
               FROM public.portfolio_projects p
              WHERE p.user_id = pr.id AND p.visibility = 'public'), '[]'::jsonb),
           'credits', coalesce((
             SELECT jsonb_agg(jsonb_build_object('title', c.title, 'year', c.year, 'project_type', c.project_type,
                                                 'accent_color', c.accent_color, 'share_token', c.share_token,
                                                 'kind', c.kind, 'credit', c.credit, 'character_name', c.character_name)
                              ORDER BY c.created_at DESC, c.ord, c.credit, c.character_name)
               FROM (
                 SELECT pj.title, extract(year FROM pj.created_at)::integer AS year, pj.project_type, pj.accent_color,
                        pj.share_token, pj.created_at, cr.kind, cr.credit, cr.character_name, cr.ord
                   FROM (
                     SELECT j.id AS pid, 'creator'::text AS kind, coalesce(nullif(pr.role, ''), 'Filmmaker') AS credit, NULL::text AS character_name, 0 AS ord
                       FROM public.projects j WHERE j.creator_id = pr.id
                     UNION ALL
                     SELECT k.project_id, 'crew', coalesce(k.craft, initcap(k.role)), NULL, 1
                       FROM public.project_crew k
                      WHERE k.user_id = pr.id AND coalesce(k.status, 'confirmed') = 'confirmed'
                     UNION ALL
                     SELECT g.project_id, 'cast', 'Cast', g.character_name, 2
                       FROM public.character_castings g WHERE g.crew_user_id = pr.id
                   ) cr
                   JOIN public.projects pj ON pj.id = cr.pid
                  WHERE pj.visibility = 'public' AND pj.share_token IS NOT NULL
               ) c), '[]'::jsonb))
    FROM public.profiles pr
   WHERE coalesce(btrim(p_handle), '') <> ''
     AND lower(pr.username) = lower(btrim(p_handle))
     AND pr.portfolio_page IN ('unlisted', 'public')
   ORDER BY (pr.username = btrim(p_handle)) DESC
   LIMIT 1;
$function$;
