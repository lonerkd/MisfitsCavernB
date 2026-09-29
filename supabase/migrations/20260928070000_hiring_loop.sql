-- The hiring loop.
--
-- A job can be a casting call for a character in its project
-- (jobs.character_name). Responding to an application goes through
-- respond_to_application(), which in one step: sets the status, adds an
-- accepted applicant to the project's crew (their craft is the job's role;
-- an existing crew member keeps their role), casts them as the character
-- for a casting call, optionally closes the posting, and tells the applicant.
--
-- Posting a job for a project now needs the right to shape that project
-- (owner, or a lead/contributor): before, anyone could link a posting to any
-- project. Applicants can still read a posting after it closes.

ALTER TABLE public.jobs ADD COLUMN character_name text;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_character_name_check CHECK (
    character_name IS NULL OR (project_id IS NOT NULL AND char_length(btrim(character_name)) BETWEEN 1 AND 200));

DROP POLICY "Authenticated users create jobs" ON public.jobs;
CREATE POLICY "Authenticated users create jobs" ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL AND created_by = (SELECT auth.uid())
    AND (project_id IS NULL OR internal.can_shape_project(project_id)));

-- A definer helper: job_applications' own policies read jobs, so a policy on
-- jobs that read job_applications directly would recurse.
CREATE FUNCTION internal.applied_to(p_job uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.job_applications a where a.job_id = p_job and a.applicant_id = (select auth.uid()));
$function$;
REVOKE ALL ON FUNCTION internal.applied_to(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION internal.applied_to(uuid) TO authenticated;

CREATE POLICY "Applicants view jobs they applied to" ON public.jobs FOR SELECT TO authenticated
  USING (internal.applied_to(id));

CREATE FUNCTION public.respond_to_application(p_application uuid, p_status text, p_close boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := (select auth.uid());
  a public.job_applications;
  j public.jobs;
  project_title text;
  joined boolean := false;
  cast_as text;
  title text;
  body text;
  link text;
begin
  if p_status not in ('accepted', 'rejected') then
    raise exception 'Accept or reject' using errcode = '22023';
  end if;
  select * into a from public.job_applications where id = p_application for update;
  if found then
    select * into j from public.jobs where id = a.job_id;
  end if;
  if not found or j.created_by is distinct from me then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;

  update public.job_applications set status = p_status where id = a.id;

  if p_status = 'accepted' and j.project_id is not null then
    if not internal.can_shape_project(j.project_id) then
      raise exception 'Only the project''s owner and leads can hire onto it' using errcode = '42501';
    end if;
    insert into public.project_crew (project_id, user_id, role, craft, status, invited_by)
    values (j.project_id, a.applicant_id, 'contributor', j.role, 'confirmed', me)
    on conflict (project_id, user_id) do update
      set craft = coalesce(public.project_crew.craft, excluded.craft),
          status = 'confirmed'
    returning (xmax = 0) into joined;
    if j.character_name is not null then
      insert into public.character_castings (project_id, character_name, crew_user_id, created_by)
      values (j.project_id, upper(j.character_name), a.applicant_id, me)
      on conflict (project_id, character_name) do update set crew_user_id = excluded.crew_user_id, created_by = excluded.created_by;
      cast_as := j.character_name;
    end if;
  end if;

  if p_close then
    update public.jobs set status = 'closed', updated_at = now() where id = j.id;
  end if;

  select p.title into project_title from public.projects p where p.id = j.project_id;
  link := '/jobs/' || j.id;
  if p_status = 'accepted' then
    title := format('You''re in · %s', j.title);
    body := 'Your application was accepted.';
    if project_title is not null then
      body := format('You''re on the crew of %s as %s.', project_title, j.role);
      link := '/projects/' || j.project_id;
    end if;
    if cast_as is not null then
      body := format('You''re cast as %s in %s.', cast_as, project_title);
    end if;
  else
    title := format('Update · %s', j.title);
    body := 'Your application was not selected this time.';
  end if;
  insert into public.notifications (user_id, type, title, body, link, created_by)
  values (a.applicant_id, 'application', left(title, 200), body, link, me);

  return jsonb_build_object('status', p_status, 'joined_crew', coalesce(joined, false), 'cast_as', cast_as, 'closed', p_close);
end;
$function$;
REVOKE ALL ON FUNCTION public.respond_to_application(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_application(uuid, text, boolean) TO authenticated;
