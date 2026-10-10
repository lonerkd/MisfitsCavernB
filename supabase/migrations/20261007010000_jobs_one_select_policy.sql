-- One SELECT policy on jobs (BACKLOG 3.9).
--
-- The performance advisor flags multiple_permissive_policies on public.jobs:
-- "Jobs publicly readable" (to public) and "Applicants view jobs they applied
-- to" (to authenticated) both run on every read by a signed-in user. Merge
-- them into one policy with the same meaning:
--   - the poster sees their own postings, whatever their status;
--   - anyone sees open postings that are listed (internal.job_listed: not
--     sample work, unless you're inside that demo production);
--   - an applicant sees a posting they applied to, even once it's closed.
--
-- internal.applied_to is now executable by anon too, so the one policy can
-- run for signed-out readers: it asks whether *you* applied, which for anon
-- (no auth.uid()) is always false. The internal schema isn't exposed by the
-- API, so nobody can call it directly.

GRANT EXECUTE ON FUNCTION internal.applied_to(uuid) TO anon;

DROP POLICY "Jobs publicly readable" ON public.jobs;
DROP POLICY "Applicants view jobs they applied to" ON public.jobs;

CREATE POLICY "Jobs readable" ON public.jobs FOR SELECT TO public
  USING (
    created_by = (SELECT auth.uid())
    OR (status = 'open' AND internal.job_listed(created_by, project_id))
    OR internal.applied_to(id)
  );
