-- A person left off a film's credits can ask to be added, and the project's owner decides (owner, 2026-11-08, portfolio decision 4:
-- "a person left off can ask to be added and the project's owner decides"). A request is a row: who, which project, what they did,
-- a note. Only the owner of a project that has a public page (visibility link or public, with a share token) takes requests; the
-- requester sees their own, the owner sees the project's. Approving is only the owner's answer: the credit then shows on the film's page
-- and the person's page (see the end of this file); it is never a crew row, which would open the project to them.


-- Whether a project takes credit requests: it has a page to be credited on. Definer, because an outsider cannot read `projects`.
CREATE FUNCTION internal.takes_credit_requests(pid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = pid AND p.visibility IN ('link', 'public') AND p.share_token IS NOT NULL);
$function$;
REVOKE ALL ON FUNCTION internal.takes_credit_requests(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION internal.takes_credit_requests(uuid) TO authenticated;

CREATE TABLE public.credit_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  craft text NOT NULL CHECK (char_length(btrim(craft)) BETWEEN 1 AND 60),
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
CREATE UNIQUE INDEX credit_requests_one_pending_idx ON public.credit_requests (project_id, requester_id) WHERE status = 'pending';
CREATE INDEX credit_requests_requester_idx ON public.credit_requests (requester_id);
CREATE INDEX credit_requests_project_idx ON public.credit_requests (project_id, status);
ALTER TABLE public.credit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit requests view" ON public.credit_requests FOR SELECT TO authenticated
  USING (requester_id = (SELECT auth.uid()) OR internal.is_project_creator(project_id));
-- Ask for yourself, on a project with a page, as a person who is not already on the crew.
CREATE POLICY "credit requests ask" ON public.credit_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = (SELECT auth.uid()) AND status = 'pending' AND decided_at IS NULL
              AND internal.takes_credit_requests(project_id)
              AND NOT internal.is_project_creator(project_id)
              AND NOT internal.is_project_member(project_id));
-- Only the project's owner decides.
CREATE POLICY "credit requests decide" ON public.credit_requests FOR UPDATE TO authenticated
  USING (internal.is_project_creator(project_id)) WITH CHECK (internal.is_project_creator(project_id));
-- The requester may withdraw a pending ask; the owner may clear any.
CREATE POLICY "credit requests delete" ON public.credit_requests FOR DELETE TO authenticated
  USING ((requester_id = (SELECT auth.uid()) AND status = 'pending') OR internal.is_project_creator(project_id));

-- Only the answer can change, and it is stamped.
CREATE FUNCTION internal.credit_requests_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.project_id is distinct from old.project_id or new.requester_id is distinct from old.requester_id
     or new.craft is distinct from old.craft or new.note is distinct from old.note or new.created_at is distinct from old.created_at then
    raise exception 'Only the answer to a credit request can change' using errcode = '42501';
  end if;
  if old.status <> 'pending' then
    raise exception 'That request has already been answered' using errcode = '23514';
  end if;
  new.decided_at := now();
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.credit_requests_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER credit_requests_guard BEFORE UPDATE ON public.credit_requests FOR EACH ROW EXECUTE FUNCTION internal.credit_requests_guard();

-- The share page needs the project's id to send a request, and an outsider cannot read `projects`. This gives it to a SIGNED-IN person
-- who holds the exact share token of a link/public project (nothing else, no anon).
CREATE FUNCTION public.get_shared_project_id(p_token text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT p.id FROM public.projects p
   WHERE auth.uid() IS NOT NULL AND coalesce(btrim(p_token), '') <> '' AND p.share_token = p_token AND p.visibility IN ('link', 'public');
$function$;
REVOKE ALL ON FUNCTION public.get_shared_project_id(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_shared_project_id(text) TO authenticated;

-- An approved request is a CREDIT, never access: a crew row (even a viewer) opens the project's script, budget and channels to the person
-- (internal.can_access_project reads any confirmed crew row), so approving only records the answer here and the three places credits are
-- derived (a person's credits, the press kit, a person's public page) read approved requests as one more crew credit. Same bodies as
-- 20261115000200 plus that one branch; CREATE OR REPLACE keeps their grants and privacy rules.

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
    select x.project_id, 'crew', x.craft, null, 1
      from public.project_crew_crafts x join public.project_crew c on c.project_id = x.project_id and c.user_id = x.user_id
     where x.user_id = p_user and coalesce(c.status, 'confirmed') = 'confirmed' and x.craft is distinct from c.craft
    union all
    select k.project_id, 'cast', 'Cast', k.character_name, 2
      from public.character_castings k
     where k.crew_user_id = p_user
    union all
    select r.project_id, 'crew', r.craft, null, 1
      from public.credit_requests r
     where r.requester_id = p_user and r.status = 'approved'
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

CREATE OR REPLACE FUNCTION public.get_press_kit(p_token text)
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
          select pr.id, pr.username, 'crew', x.craft, null, cf.department, 1, coalesce(cf.position, 9999)
            from public.project_crew_crafts x
            join public.project_crew c on c.project_id = x.project_id and c.user_id = x.user_id
            join public.profiles pr on pr.id = x.user_id
            left join public.crafts cf on cf.name = x.craft
           where x.project_id = p.id and coalesce(c.status, 'confirmed') = 'confirmed' and c.user_id <> p.creator_id
             and x.craft is distinct from c.craft
          union all
          select pr.id, pr.username, 'cast', 'Cast', k.character_name, null, 2, 0
            from public.character_castings k join public.profiles pr on pr.id = k.crew_user_id
           where k.project_id = p.id
          union all
          select pr.id, pr.username, 'crew', r.craft, null, cf.department, 1, coalesce(cf.position, 9999)
            from public.credit_requests r join public.profiles pr on pr.id = r.requester_id
            left join public.crafts cf on cf.name = r.craft
           where r.project_id = p.id and r.status = 'approved'
        ) x), '[]'::jsonb),
    'laurels', coalesce((
      select jsonb_agg(jsonb_build_object('name', f->>'name') order by f->>'name')
        from jsonb_array_elements(case when jsonb_typeof(p.festival_submissions) = 'array' then p.festival_submissions else '[]'::jsonb end) f
       where f->>'status' = 'accepted' and coalesce(f->>'name', '') <> ''), '[]'::jsonb)
  )
  from public.projects p
  where p.share_token = p_token and p.visibility in ('link', 'public');
$function$;

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
                     SELECT x.project_id, 'crew', x.craft, NULL, 1
                       FROM public.project_crew_crafts x JOIN public.project_crew k ON k.project_id = x.project_id AND k.user_id = x.user_id
                      WHERE x.user_id = pr.id AND coalesce(k.status, 'confirmed') = 'confirmed' AND x.craft IS DISTINCT FROM k.craft
                     UNION ALL
                     SELECT g.project_id, 'cast', 'Cast', g.character_name, 2
                       FROM public.character_castings g WHERE g.crew_user_id = pr.id
                     UNION ALL
                     SELECT r.project_id, 'crew', r.craft, NULL, 1
                       FROM public.credit_requests r WHERE r.requester_id = pr.id AND r.status = 'approved'
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
                         OR EXISTS (SELECT 1 FROM public.character_castings g WHERE g.project_id = pj.id AND g.crew_user_id = pr.id)
                         OR EXISTS (SELECT 1 FROM public.credit_requests r WHERE r.project_id = pj.id AND r.requester_id = pr.id AND r.status = 'approved'))
                    AND f ->> 'status' = 'accepted' AND coalesce(btrim(f ->> 'name'), '') <> ''
               ) v), '[]'::jsonb))
    FROM public.profiles pr
   WHERE coalesce(btrim(p_handle), '') <> ''
     AND lower(pr.username) = lower(btrim(p_handle))
     AND pr.portfolio_page IN ('unlisted', 'public')
   ORDER BY (pr.username = btrim(p_handle)) DESC
   LIMIT 1;
$function$;
