-- Strengthen respond_to_application:
-- • A second answer for the same application is refused ('Already accepted' /
--   'Already declined') — prevents duplicate notifications and crew rows.
-- • The jobs row is locked with FOR UPDATE before the close step so two
--   concurrent accepts serialise: only one can close the posting; the second
--   gets 'The posting was just filled'.

CREATE OR REPLACE FUNCTION public.respond_to_application(p_application uuid, p_status text, p_close boolean DEFAULT false)
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
    select * into j from public.jobs where id = a.job_id for update;
  end if;
  if not found or j.created_by is distinct from me then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;

  -- Block duplicate finalisations: an accepted application is always final;
  -- a declined one can be overridden (accepted after all), but not declined twice.
  if a.status = 'accepted' then
    raise exception 'Already accepted' using errcode = 'P0003';
  elsif a.status = 'rejected' and p_status = 'rejected' then
    raise exception 'Already declined' using errcode = 'P0003';
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

  -- Close the posting only if it is still open; a concurrent accept may have
  -- already closed it (the FOR UPDATE above serialises the two transactions).
  if p_close then
    update public.jobs set status = 'closed', updated_at = now() where id = j.id and status <> 'closed';
    if not found then
      raise exception 'The posting was just filled' using errcode = 'P0004';
    end if;
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
