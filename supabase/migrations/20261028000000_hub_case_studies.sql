-- The hub's Case studies (plan: .cavern-intelligence/plans/2026-10-25-lounge-overhaul.md,
-- slice L4; owner decision 4: only productions whose owner opts in).
--
--   projects.case_study_ok   the owner's consent (default off). Only the creator
--                            can change it (the projects update policy).
--   hub_posts.project_id     a case study may name one production, but only one
--                            whose owner consented — checked on every write.
--                            Withdrawing consent unlinks the case study and
--                            takes it back to draft.
--   admin_case_study_projects()  the productions an admin may link (admins can't
--                            read other people's projects otherwise).
--   hub_case_study_project() the linked production's title and logline, for
--                            whoever can read the published case study.

ALTER TABLE public.projects ADD COLUMN case_study_ok boolean NOT NULL DEFAULT false;

ALTER TABLE public.hub_posts DROP CONSTRAINT hub_posts_kind_check;
ALTER TABLE public.hub_posts ADD CONSTRAINT hub_posts_kind_check CHECK (kind IN ('update', 'guide', 'incident', 'case_study'));
ALTER TABLE public.hub_posts
  ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD CONSTRAINT hub_posts_project_only_case_study CHECK (project_id IS NULL OR kind = 'case_study');
CREATE INDEX hub_posts_project_idx ON public.hub_posts (project_id) WHERE project_id IS NOT NULL;

-- A case study can name only a production whose owner said yes.
CREATE FUNCTION internal.hub_posts_check_consent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.project_id is not null
     and (tg_op = 'INSERT' or new.project_id is distinct from old.project_id)
     and not exists (select 1 from public.projects p where p.id = new.project_id and p.case_study_ok) then
    raise exception 'The production''s owner has not agreed to a case study' using errcode = '23514';
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.hub_posts_check_consent() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER hub_posts_check_consent BEFORE INSERT OR UPDATE OF project_id ON public.hub_posts
  FOR EACH ROW EXECUTE FUNCTION internal.hub_posts_check_consent();

-- Withdrawing consent pulls its case studies back: unlinked and unpublished.
CREATE FUNCTION internal.projects_withdraw_case_study()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.hub_posts set project_id = null, published_at = null where project_id = new.id;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.projects_withdraw_case_study() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER projects_withdraw_case_study AFTER UPDATE OF case_study_ok ON public.projects
  FOR EACH ROW WHEN (old.case_study_ok AND NOT new.case_study_ok)
  EXECUTE FUNCTION internal.projects_withdraw_case_study();

-- Admin: the productions whose owners agreed.
CREATE FUNCTION public.admin_case_study_projects()
 RETURNS TABLE(id uuid, title text)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not internal.caller_is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  return query select p.id, p.title from public.projects p where p.case_study_ok order by p.title;
end;
$function$;
REVOKE ALL ON FUNCTION public.admin_case_study_projects() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_case_study_projects() TO authenticated;

-- The linked production's title and logline, for anyone who can read the case study.
CREATE FUNCTION public.hub_case_study_project(p_post uuid)
 RETURNS TABLE(title text, description text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p.title, p.description
  from public.hub_posts h
  join public.projects p on p.id = h.project_id
  where h.id = p_post
    and h.kind = 'case_study'
    and p.case_study_ok
    and ((h.published_at is not null and h.published_at <= now()) or internal.caller_is_admin());
$function$;
REVOKE ALL ON FUNCTION public.hub_case_study_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hub_case_study_project(uuid) TO authenticated;
