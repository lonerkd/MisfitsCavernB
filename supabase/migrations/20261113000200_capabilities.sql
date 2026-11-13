-- Role model, step 2: what a person's craft lets them do, as named capabilities.
--
--  * `capabilities`       the fixed list (a migration is the only way to change it: the app asks for these by name).
--  * `craft_capabilities` the template: which capabilities a craft grants. Data, so an admin can tune it without a deploy.
--  * `project_crew_crafts` more crafts a person holds on a project besides their primary one (`project_crew.craft`).
--  * `crew_capability_overrides` the owner's per-person grant or removal on one project.
--  * `internal.has_capability(project, capability)` answers it; `public.my_capabilities(project)` lists the caller's.
--
-- The permission tier (`project_crew.role`) stays the CEILING: a viewer never holds a capability that edits, however a
-- craft or an override says. Nothing reads this yet (the existing policies are untouched, so no access changes in this
-- migration): step 3 moves budget, casting and paperwork onto it.

CREATE TABLE public.capabilities (
  key text PRIMARY KEY CONSTRAINT capabilities_key_check CHECK (key ~ '^[a-z]+\.[a-z]+$'),
  label text NOT NULL,
  area text NOT NULL,
  -- true: the capability changes project data, so a view-only member can never hold it.
  edits boolean NOT NULL
);
ALTER TABLE public.capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "capabilities view" ON public.capabilities FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.capabilities (key, label, area, edits) VALUES
  ('script.write',     'Write the script',                 'Script',    true),
  ('breakdown.write',  'Tag and edit the breakdown',       'Breakdown', true),
  ('schedule.write',   'Edit the schedule',                'Schedule',  true),
  ('callsheet.issue',  'Issue call sheets',                'Schedule',  true),
  ('locations.write',  'Edit locations',                   'Locations', true),
  ('media.write',      'Add to the boards and the library','Media',     true),
  ('media.approve',    'Approve references and cuts',      'Media',     false),
  ('budget.read',      'See the budget',                   'Budget',    false),
  ('budget.write',     'Edit the budget',                  'Budget',    true),
  ('casting.read',     'See casting submissions',          'Casting',   false),
  ('casting.decide',   'Decide casting',                   'Casting',   true),
  ('paperwork.read',   'See paperwork',                    'Paperwork', false),
  ('paperwork.write',  'Edit paperwork',                   'Paperwork', true),
  ('review.request',   'Send work for review',             'Review',    true),
  ('review.approve',  'Approve work under review',        'Review',    false);

CREATE TABLE public.craft_capabilities (
  craft text NOT NULL REFERENCES public.crafts(name) ON UPDATE CASCADE ON DELETE CASCADE,
  capability text NOT NULL REFERENCES public.capabilities(key) ON UPDATE CASCADE ON DELETE CASCADE,
  PRIMARY KEY (craft, capability)
);
CREATE INDEX craft_capabilities_capability_idx ON public.craft_capabilities USING btree (capability);
ALTER TABLE public.craft_capabilities ENABLE ROW LEVEL SECURITY;
-- Reference data, like crafts: anyone may read it; only an admin changes it.
CREATE POLICY "craft capabilities view" ON public.craft_capabilities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "craft capabilities admin insert" ON public.craft_capabilities FOR INSERT TO authenticated WITH CHECK (internal.caller_is_admin());
CREATE POLICY "craft capabilities admin update" ON public.craft_capabilities FOR UPDATE TO authenticated USING (internal.caller_is_admin()) WITH CHECK (internal.caller_is_admin());
CREATE POLICY "craft capabilities admin delete" ON public.craft_capabilities FOR DELETE TO authenticated USING (internal.caller_is_admin());

-- The default template per craft. A person with no craft holds none of these (step 3 decides what each protected table
-- does for them). Skipped for a craft an admin removed: the foreign key would refuse it.
INSERT INTO public.craft_capabilities (craft, capability)
SELECT t.craft, k
FROM (VALUES
  ('Writer',                  ARRAY['script.write','media.write','review.request']),
  ('Story editor',            ARRAY['script.write','media.write','review.request']),
  ('Showrunner',              ARRAY['script.write','breakdown.write','media.write','media.approve','review.request','review.approve','budget.read','casting.read']),
  ('Story producer',          ARRAY['script.write','media.write','review.request','casting.read']),
  ('Director',                ARRAY['script.write','media.write','media.approve','review.request','review.approve','casting.read','casting.decide']),
  ('First assistant director',ARRAY['breakdown.write','schedule.write','callsheet.issue','media.write']),
  ('Second assistant director',ARRAY['schedule.write','callsheet.issue','media.write']),
  ('Script supervisor',       ARRAY['media.write']),
  ('Producer',                ARRAY['breakdown.write','schedule.write','callsheet.issue','locations.write','media.write','media.approve','budget.read','budget.write','casting.read','casting.decide','paperwork.read','paperwork.write','review.request','review.approve']),
  ('Line producer',           ARRAY['breakdown.write','schedule.write','callsheet.issue','locations.write','media.write','budget.read','budget.write','casting.read','paperwork.read','paperwork.write','review.request']),
  ('Production manager',      ARRAY['breakdown.write','schedule.write','callsheet.issue','locations.write','media.write','budget.read','budget.write','casting.read','paperwork.read','paperwork.write','review.request']),
  ('Production coordinator',  ARRAY['schedule.write','callsheet.issue','locations.write','media.write','budget.read','casting.read','paperwork.read','paperwork.write']),
  ('Production accountant',   ARRAY['budget.read','budget.write','paperwork.read','paperwork.write']),
  ('Production assistant',    ARRAY['media.write']),
  ('Location manager',        ARRAY['locations.write','media.write','paperwork.read','paperwork.write']),
  ('Casting director',        ARRAY['casting.read','casting.decide','media.write','paperwork.read']),
  ('Director of photography', ARRAY['media.write','budget.read']),
  ('Camera operator',         ARRAY['media.write']),
  ('First assistant camera',  ARRAY['media.write']),
  ('Second assistant camera', ARRAY['media.write']),
  ('Steadicam operator',      ARRAY['media.write']),
  ('Drone operator',          ARRAY['media.write']),
  ('DIT',                     ARRAY['media.write']),
  ('Stills photographer',     ARRAY['media.write']),
  ('Gaffer',                  ARRAY['media.write','budget.read']),
  ('Key grip',                ARRAY['media.write','budget.read']),
  ('Electrician',             ARRAY['media.write']),
  ('Grip',                    ARRAY['media.write']),
  ('Production sound mixer',  ARRAY['media.write','budget.read']),
  ('Boom operator',           ARRAY['media.write']),
  ('Sound designer',          ARRAY['media.write','budget.read']),
  ('Re-recording mixer',      ARRAY['media.write']),
  ('Production designer',     ARRAY['media.write','budget.read']),
  ('Art director',            ARRAY['media.write','budget.read']),
  ('Set decorator',           ARRAY['media.write']),
  ('Prop master',             ARRAY['media.write']),
  ('Costume designer',        ARRAY['media.write','budget.read']),
  ('Wardrobe assistant',      ARRAY['media.write']),
  ('Makeup artist',           ARRAY['media.write']),
  ('Hair stylist',            ARRAY['media.write']),
  ('SFX makeup artist',       ARRAY['media.write']),
  ('Editor',                  ARRAY['media.write','review.request']),
  ('Assistant editor',        ARRAY['media.write']),
  ('Colorist',                ARRAY['media.write']),
  ('VFX artist',              ARRAY['media.write']),
  ('Motion designer',         ARRAY['media.write']),
  ('Post supervisor',         ARRAY['media.write','media.approve','schedule.write','review.request','review.approve','budget.read']),
  ('Composer',                ARRAY['media.write']),
  ('Music supervisor',        ARRAY['media.write','budget.read','paperwork.read','paperwork.write']),
  ('Client',                  ARRAY['media.approve','review.approve']),
  ('Multi-hyphenate',         ARRAY['media.write']),
  ('Other',                   ARRAY['media.write'])
) AS t(craft, ks), unnest(t.ks) AS k
WHERE t.craft IN (SELECT name FROM public.crafts);

-- More crafts a person holds on this project, besides the primary one on project_crew.craft (a writer-director).
CREATE TABLE public.project_crew_crafts (
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  craft text NOT NULL REFERENCES public.crafts(name) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (project_id, user_id, craft),
  FOREIGN KEY (project_id, user_id) REFERENCES public.project_crew(project_id, user_id) ON DELETE CASCADE
);
CREATE INDEX project_crew_crafts_user_idx ON public.project_crew_crafts USING btree (user_id);
ALTER TABLE public.project_crew_crafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crew crafts view" ON public.project_crew_crafts FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR internal.can_access_project(project_id));
CREATE POLICY "crew crafts add" ON public.project_crew_crafts FOR INSERT TO authenticated WITH CHECK (internal.is_project_creator(project_id));
CREATE POLICY "crew crafts remove" ON public.project_crew_crafts FOR DELETE TO authenticated USING (internal.is_project_creator(project_id));

-- The owner's per-person change on one project: granted = true adds a capability, false takes one away.
CREATE TABLE public.crew_capability_overrides (
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  capability text NOT NULL REFERENCES public.capabilities(key) ON UPDATE CASCADE ON DELETE CASCADE,
  granted boolean NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (project_id, user_id, capability),
  FOREIGN KEY (project_id, user_id) REFERENCES public.project_crew(project_id, user_id) ON DELETE CASCADE
);
ALTER TABLE public.crew_capability_overrides ENABLE ROW LEVEL SECURITY;
-- Only the owner and the person themselves read it (a colleague does not see why someone's rights differ).
CREATE POLICY "capability overrides view" ON public.crew_capability_overrides FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR internal.is_project_creator(project_id));
CREATE POLICY "capability overrides add" ON public.crew_capability_overrides FOR INSERT TO authenticated WITH CHECK (internal.is_project_creator(project_id));
CREATE POLICY "capability overrides change" ON public.crew_capability_overrides FOR UPDATE TO authenticated
  USING (internal.is_project_creator(project_id)) WITH CHECK (internal.is_project_creator(project_id));
CREATE POLICY "capability overrides remove" ON public.crew_capability_overrides FOR DELETE TO authenticated USING (internal.is_project_creator(project_id));

-- Does the caller hold this capability on this project?
--   the project's creator: every capability;
--   a confirmed member of a non-private project (the same people `can_shape_project` counts): the union of what each of
--   their crafts grants, then the owner's override for that capability wins, and the tier is the ceiling
--   (a viewer never holds a capability that edits);
--   anyone else, and a capability that does not exist: no.
CREATE FUNCTION internal.has_capability(pid uuid, cap text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.capabilities k where k.key = cap) and (
    internal.is_project_creator(pid)
    or exists (
      select 1
      from public.project_crew pc
      join public.projects p on p.id = pc.project_id
      join public.capabilities k on k.key = cap
      where pc.project_id = pid
        and pc.user_id = (select auth.uid())
        and coalesce(pc.status, 'confirmed') = 'confirmed'
        and p.visibility <> 'private'
        and (not k.edits or pc.role in ('lead', 'contributor'))
        and coalesce(
              (select o.granted from public.crew_capability_overrides o
                where o.project_id = pc.project_id and o.user_id = pc.user_id and o.capability = cap),
              exists (
                select 1 from public.craft_capabilities cc
                where cc.capability = cap
                  and (cc.craft = pc.craft
                       or cc.craft in (select x.craft from public.project_crew_crafts x
                                        where x.project_id = pc.project_id and x.user_id = pc.user_id))
              )
            )
    )
  );
$function$;
REVOKE ALL ON FUNCTION internal.has_capability(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION internal.has_capability(uuid, text) TO authenticated, service_role;

-- The caller's capabilities on a project, for the interface ("what can I do here"). A definer function because the
-- signed-in role has no USAGE on the `internal` schema (policies reach the helpers through a stored reference, a SQL
-- function resolves its names when it runs). It answers only for the caller: `has_capability` reads `auth.uid()`.
CREATE FUNCTION public.my_capabilities(pid uuid)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(array_agg(k.key order by k.key), '{}')
  from public.capabilities k
  where internal.has_capability(pid, k.key);
$function$;
REVOKE ALL ON FUNCTION public.my_capabilities(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_capabilities(uuid) TO authenticated, service_role;
