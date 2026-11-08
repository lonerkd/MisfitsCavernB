-- Festivals and awards on a person's portfolio, in two honest tiers (owner, 2026-11-08: "a mix of both"):
--  * VERIFIED: the accepted festival submissions of a PUBLIC project the person is credited on (creator, confirmed crew, cast). The
--    project owner records those in the suite; nobody types them twice, and a person cannot add one to themselves.
--  * SELF-REPORTED: a laurel a person adds to one of their own pieces (a selection, award, nomination or screening). The page labels
--    it as the person's own word.
-- `portfolio_laurels` is private to its owner by RLS (they list and edit their own); the public reads them only through
-- get_portfolio_page, with the pieces they belong to (CREATE OR REPLACE keeps the function's grants).
CREATE TABLE public.portfolio_laurels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_project_id uuid NOT NULL REFERENCES public.portfolio_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CONSTRAINT portfolio_laurels_name_check CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  kind text NOT NULL DEFAULT 'selection' CONSTRAINT portfolio_laurels_kind_check CHECK (kind IN ('selection', 'award', 'nomination', 'screening')),
  year integer CONSTRAINT portfolio_laurels_year_check CHECK (year IS NULL OR year BETWEEN 1888 AND 2100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX portfolio_laurels_piece_idx ON public.portfolio_laurels (portfolio_project_id);
CREATE INDEX portfolio_laurels_user_idx ON public.portfolio_laurels (user_id);
ALTER TABLE public.portfolio_laurels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portfolio laurels view" ON public.portfolio_laurels FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "portfolio laurels add" ON public.portfolio_laurels FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.portfolio_projects p WHERE p.id = portfolio_project_id AND p.user_id = (SELECT auth.uid())));
CREATE POLICY "portfolio laurels edit" ON public.portfolio_laurels FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "portfolio laurels remove" ON public.portfolio_laurels FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- A laurel stays on its piece and keeps its owner; a piece holds at most twelve.
CREATE FUNCTION internal.portfolio_laurels_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'UPDATE' then
    if new.portfolio_project_id is distinct from old.portfolio_project_id or new.user_id is distinct from old.user_id then
      raise exception 'A laurel keeps its piece and its owner' using errcode = '42501';
    end if;
    return new;
  end if;
  if (select count(*) from public.portfolio_laurels x where x.portfolio_project_id = new.portfolio_project_id) >= 12 then
    raise exception 'A piece holds at most twelve laurels' using errcode = '23514';
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.portfolio_laurels_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER portfolio_laurels_guard BEFORE INSERT OR UPDATE ON public.portfolio_laurels FOR EACH ROW EXECUTE FUNCTION internal.portfolio_laurels_guard();

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
                                                 'accent_color', p.accent_color, 'share_token', p.share_token, 'pinned', p.pinned,
                                                 'laurels', coalesce((SELECT jsonb_agg(jsonb_build_object('name', l.name, 'kind', l.kind, 'year', l.year)
                                                                                         ORDER BY l.year DESC NULLS LAST, l.created_at)
                                                                        FROM public.portfolio_laurels l WHERE l.portfolio_project_id = p.id), '[]'::jsonb))
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
               ) c), '[]'::jsonb),
           'verified_laurels', coalesce((
             SELECT jsonb_agg(jsonb_build_object('film', v.title, 'share_token', v.share_token, 'name', v.name)
                              ORDER BY v.created_at DESC, v.name)
               FROM (
                 SELECT DISTINCT pj.title, pj.share_token, pj.created_at, f ->> 'name' AS name
                   FROM public.projects pj
                   CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(pj.festival_submissions) = 'array' THEN pj.festival_submissions ELSE '[]'::jsonb END) f
                  WHERE pj.visibility = 'public' AND pj.share_token IS NOT NULL
                    AND (pj.creator_id = pr.id
                         OR EXISTS (SELECT 1 FROM public.project_crew k WHERE k.project_id = pj.id AND k.user_id = pr.id AND coalesce(k.status, 'confirmed') = 'confirmed')
                         OR EXISTS (SELECT 1 FROM public.character_castings g WHERE g.project_id = pj.id AND g.crew_user_id = pr.id))
                    AND f ->> 'status' = 'accepted' AND coalesce(btrim(f ->> 'name'), '') <> ''
               ) v), '[]'::jsonb))
    FROM public.profiles pr
   WHERE coalesce(btrim(p_handle), '') <> ''
     AND lower(pr.username) = lower(btrim(p_handle))
     AND pr.portfolio_page IN ('unlisted', 'public')
   ORDER BY (pr.username = btrim(p_handle)) DESC
   LIMIT 1;
$function$;
