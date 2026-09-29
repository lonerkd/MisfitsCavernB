-- Crew availability: the dates someone can't work.
--
-- Everyone keeps their own list of dates they're away (a day or a range,
-- with a private note). The people who plan a production — its owner and
-- leads/contributors (internal.can_shape_project) — see the dates, never the
-- notes, of everyone on it, through project_availability(), so the schedule
-- and the crew list can say who's away on a shoot day before the call sheet
-- goes out.

CREATE TABLE public.unavailability (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid DEFAULT auth.uid() NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  note text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT unavailability_pkey PRIMARY KEY (id),
  CONSTRAINT unavailability_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT unavailability_range CHECK (ends_on >= starts_on AND ends_on - starts_on <= 366),
  CONSTRAINT unavailability_note_len CHECK (note IS NULL OR char_length(note) <= 200)
);
CREATE INDEX unavailability_user_idx ON public.unavailability USING btree (user_id, starts_on);
ALTER TABLE public.unavailability ENABLE ROW LEVEL SECURITY;

-- Your own dates, and only yours.
CREATE POLICY "unavailability own read" ON public.unavailability FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "unavailability own insert" ON public.unavailability FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "unavailability own update" ON public.unavailability FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "unavailability own delete" ON public.unavailability FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unavailability TO authenticated;
REVOKE ALL ON public.unavailability FROM anon;

-- Who on a production is away between two dates — dates only, for the
-- people who plan it. Everyone else gets nothing.
CREATE FUNCTION public.project_availability(p_project uuid, p_from date DEFAULT CURRENT_DATE, p_to date DEFAULT (CURRENT_DATE + 400))
 RETURNS TABLE(user_id uuid, starts_on date, ends_on date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select u.user_id, u.starts_on, u.ends_on
    from public.unavailability u
   where internal.can_shape_project(p_project)
     and u.ends_on >= p_from and u.starts_on <= p_to
     and (u.user_id = (select p.creator_id from public.projects p where p.id = p_project)
          or exists (select 1 from public.project_crew c
                      where c.project_id = p_project and c.user_id = u.user_id
                        and coalesce(c.status, 'confirmed') = 'confirmed'))
   order by u.starts_on, u.user_id;
$function$;
REVOKE ALL ON FUNCTION public.project_availability(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.project_availability(uuid, date, date) TO authenticated;
