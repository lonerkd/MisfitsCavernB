-- Guides: a walkthrough for each project, as deep as the person needs.
--
-- How someone works — how many hours a week they have, how much they've
-- made before, whether they're alone or have a crew, and how much
-- explanation they want — lives in profiles.ui_prefs.guide (account-wide,
-- private, written only through set_my_ui_prefs, which now accepts it):
--   hours       hours a week for the project (1–80)
--   experience  first | some | seasoned
--   team        solo | small | crew
--   depth       walkthrough | tips | light   (absent: follows experience)
-- Their craft is profiles.role, and the project's stage is its phase.
--
-- guide_progress keeps, per person and project, the guide they chose (a
-- workflow id from lib/guides; null follows the project's format), the steps
-- they ticked by hand (most steps tick themselves from the project's data)
-- and whether they've put the guide away.

CREATE OR REPLACE FUNCTION public.set_my_ui_prefs(p_patch jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid := (select auth.uid());
  k text;
  v jsonb;
  clean jsonb := '{}'::jsonb;
  out jsonb;
begin
  if uid is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Preferences must be an object' using errcode = '22023';
  end if;
  for k, v in select * from jsonb_each(p_patch) loop
    if k = 'show_all_tools' then
      if jsonb_typeof(v) <> 'boolean' then raise exception 'show_all_tools is true or false' using errcode = '22023'; end if;
    elsif k in ('seen_tools', 'dismissed') then
      if jsonb_typeof(v) <> 'array'
         or jsonb_array_length(v) > 200
         or exists (select 1 from jsonb_array_elements(v) e where jsonb_typeof(e) <> 'string' or char_length(e #>> '{}') not between 1 and 80) then
        raise exception '% is a short list of names', k using errcode = '22023';
      end if;
    elsif k = 'guide' then
      -- null forgets the answers; otherwise the whole object is replaced.
      if jsonb_typeof(v) <> 'null' then
        if jsonb_typeof(v) <> 'object'
           or exists (select 1 from jsonb_object_keys(v) g where g not in ('hours', 'experience', 'team', 'depth')) then
          raise exception 'guide holds hours, experience, team and depth' using errcode = '22023';
        end if;
        if v ? 'hours' then
          if jsonb_typeof(v -> 'hours') <> 'number' then
            raise exception 'guide hours is a whole number from 1 to 80' using errcode = '22023';
          end if;
          if (v ->> 'hours')::numeric not between 1 and 80 or (v ->> 'hours')::numeric % 1 <> 0 then
            raise exception 'guide hours is a whole number from 1 to 80' using errcode = '22023';
          end if;
        end if;
        if v ? 'experience' and (jsonb_typeof(v -> 'experience') <> 'string' or v ->> 'experience' not in ('first', 'some', 'seasoned')) then
          raise exception 'guide experience is first, some or seasoned' using errcode = '22023';
        end if;
        if v ? 'team' and (jsonb_typeof(v -> 'team') <> 'string' or v ->> 'team' not in ('solo', 'small', 'crew')) then
          raise exception 'guide team is solo, small or crew' using errcode = '22023';
        end if;
        if v ? 'depth' and (jsonb_typeof(v -> 'depth') <> 'string' or v ->> 'depth' not in ('walkthrough', 'tips', 'light')) then
          raise exception 'guide depth is walkthrough, tips or light' using errcode = '22023';
        end if;
      end if;
    else
      raise exception 'Unknown preference %', k using errcode = '22023';
    end if;
    clean := clean || jsonb_build_object(k, v);
  end loop;
  update public.profiles set ui_prefs = ui_prefs || clean where id = uid returning ui_prefs into out;
  return coalesce(out, '{}'::jsonb);
end;
$function$;

CREATE TABLE public.guide_progress (
  user_id uuid DEFAULT auth.uid() NOT NULL,
  project_id uuid NOT NULL,
  workflow text,
  done text[] DEFAULT '{}'::text[] NOT NULL,
  hidden boolean DEFAULT false NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT guide_progress_pkey PRIMARY KEY (user_id, project_id),
  CONSTRAINT guide_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT guide_progress_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT guide_progress_workflow_check CHECK (workflow IS NULL OR workflow ~ '^[a-z][a-z-]{0,39}$'),
  CONSTRAINT guide_progress_done_check CHECK (cardinality(done) <= 200 AND char_length(array_to_string(done, ',')) <= 8000)
);
CREATE INDEX guide_progress_project_idx ON public.guide_progress USING btree (project_id);
ALTER TABLE public.guide_progress ENABLE ROW LEVEL SECURITY;

-- Your own guide, on projects you can open.
CREATE POLICY "guide_progress own" ON public.guide_progress FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "guide_progress insert own" ON public.guide_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND internal.can_access_project(project_id));
CREATE POLICY "guide_progress update own" ON public.guide_progress FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND internal.can_access_project(project_id));
CREATE POLICY "guide_progress delete own" ON public.guide_progress FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_progress TO authenticated;
REVOKE ALL ON public.guide_progress FROM anon;

CREATE TRIGGER guide_progress_updated_at BEFORE UPDATE ON public.guide_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
