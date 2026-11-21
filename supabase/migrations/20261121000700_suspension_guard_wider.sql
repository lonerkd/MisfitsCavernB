-- Moderation, slice 3: a suspended account is refused on the other user-authored
-- write paths too.
--
-- 20261121000600 put internal.moderation_write_guard on messages, jobs,
-- job_applications and reports. The same function (no change: it reads only
-- auth.uid(), the suspended flag and, for job_applications, new.job_id) now also
-- guards the places a person writes what they make: projects, scripts and their
-- annotations, notes, media, comments, tasks, documents, the portfolio, support cases, and
-- their own profile. INSERT everywhere; UPDATE where a person edits their own
-- work (a suspended account can read and export, not change). DELETE is left
-- alone, so a person can still take their own things down. A server call
-- (auth.uid() null) and admins are unaffected, as before. No new function.

CREATE TRIGGER moderation_write_guard BEFORE INSERT OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION internal.moderation_write_guard();
CREATE TRIGGER moderation_write_guard BEFORE INSERT OR UPDATE ON public.scripts FOR EACH ROW EXECUTE FUNCTION internal.moderation_write_guard();
CREATE TRIGGER moderation_write_guard BEFORE INSERT OR UPDATE ON public.script_annotations FOR EACH ROW EXECUTE FUNCTION internal.moderation_write_guard();
CREATE TRIGGER moderation_write_guard BEFORE INSERT OR UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION internal.moderation_write_guard();
CREATE TRIGGER moderation_write_guard BEFORE INSERT OR UPDATE ON public.media FOR EACH ROW EXECUTE FUNCTION internal.moderation_write_guard();
CREATE TRIGGER moderation_write_guard BEFORE INSERT OR UPDATE ON public.project_tasks FOR EACH ROW EXECUTE FUNCTION internal.moderation_write_guard();
CREATE TRIGGER moderation_write_guard BEFORE INSERT OR UPDATE ON public.project_documents FOR EACH ROW EXECUTE FUNCTION internal.moderation_write_guard();
CREATE TRIGGER moderation_write_guard BEFORE INSERT OR UPDATE ON public.review_comments FOR EACH ROW EXECUTE FUNCTION internal.moderation_write_guard();
CREATE TRIGGER moderation_write_guard BEFORE INSERT OR UPDATE ON public.portfolio_projects FOR EACH ROW EXECUTE FUNCTION internal.moderation_write_guard();
CREATE TRIGGER moderation_write_guard BEFORE INSERT OR UPDATE ON public.support_cases FOR EACH ROW EXECUTE FUNCTION internal.moderation_write_guard();
CREATE TRIGGER moderation_write_guard BEFORE INSERT ON public.support_case_messages FOR EACH ROW EXECUTE FUNCTION internal.moderation_write_guard();
-- A person's own profile edits (the admin's suspend writes as the admin, so it is not blocked).
CREATE TRIGGER moderation_write_guard BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION internal.moderation_write_guard();

-- The public totals leave out a job a moderator took down (body as 20261103100000, plus hidden_at).
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
             and not (s.project_id is null and exists (select 1 from public.profiles u where u.id = s.created_by and u.is_sample))),
         (select count(*) from public.media m
           where not exists (select 1 from public.projects p where p.id = m.project_id and p.is_sample)),
         (select count(*) from public.jobs j
           where j.hidden_at is null
             and not exists (select 1 from public.projects p where p.id = j.project_id and p.is_sample)
             and not exists (select 1 from public.profiles u where u.id = j.created_by and u.is_sample));
$function$;
