-- One list of film crafts for the whole suite. Until now the Jobs board, the
-- profile editor and the Crew directory each hardcoded their own list (and
-- they disagreed), profiles defaulted to a meaningless 'creator', and
-- project_crew.role mixed two things: a permission level the app reads
-- ('lead' / 'contributor') and a job title ('Cinematographer'). Hiring
-- someone from a Sound Designer job made them a 'contributor' — the craft
-- was lost.
--
-- Now: public.crafts is the reference list (grouped by department, extended
-- by admins). profiles.role and jobs.role point at it by name, so renaming
-- a craft follows through everywhere. project_crew gets its own `craft`, and
-- `role` is only the permission level.

CREATE TABLE public.crafts (
  name text NOT NULL PRIMARY KEY CONSTRAINT crafts_name_len CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  department text NOT NULL CONSTRAINT crafts_department_len CHECK (char_length(btrim(department)) BETWEEN 1 AND 40),
  color text NOT NULL CONSTRAINT crafts_color_check CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  position integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX crafts_department_idx ON public.crafts USING btree (department, position);

ALTER TABLE public.crafts ENABLE ROW LEVEL SECURITY;
-- Reference data: anyone may read it (profiles and jobs are public too).
CREATE POLICY "crafts view" ON public.crafts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "crafts admin write" ON public.crafts FOR ALL TO authenticated
  USING (internal.caller_is_admin()) WITH CHECK (internal.caller_is_admin());

INSERT INTO public.crafts (name, department, color, position) VALUES
  ('Director',                  'Direction',           '#e8431a', 0),
  ('First assistant director',  'Direction',           '#e8431a', 1),
  ('Second assistant director', 'Direction',           '#e8431a', 2),
  ('Script supervisor',         'Direction',           '#e8431a', 3),
  ('Producer',                  'Production',          '#8b5cf6', 10),
  ('Line producer',             'Production',          '#8b5cf6', 11),
  ('Production manager',        'Production',          '#8b5cf6', 12),
  ('Production assistant',      'Production',          '#8b5cf6', 13),
  ('Location manager',          'Production',          '#8b5cf6', 14),
  ('Casting director',          'Production',          '#8b5cf6', 15),
  ('Writer',                    'Writing',             '#3b82f6', 20),
  ('Story editor',              'Writing',             '#3b82f6', 21),
  ('Director of photography',   'Camera',              '#f59e0b', 30),
  ('Camera operator',           'Camera',              '#f59e0b', 31),
  ('First assistant camera',    'Camera',              '#f59e0b', 32),
  ('Second assistant camera',   'Camera',              '#f59e0b', 33),
  ('Steadicam operator',        'Camera',              '#f59e0b', 34),
  ('Drone operator',            'Camera',              '#f59e0b', 35),
  ('DIT',                       'Camera',              '#f59e0b', 36),
  ('Stills photographer',       'Camera',              '#f59e0b', 37),
  ('Gaffer',                    'Lighting & grip',     '#eab308', 40),
  ('Key grip',                  'Lighting & grip',     '#eab308', 41),
  ('Electrician',               'Lighting & grip',     '#eab308', 42),
  ('Grip',                      'Lighting & grip',     '#eab308', 43),
  ('Production sound mixer',    'Sound',               '#10b981', 50),
  ('Boom operator',             'Sound',               '#10b981', 51),
  ('Sound designer',            'Sound',               '#10b981', 52),
  ('Re-recording mixer',        'Sound',               '#10b981', 53),
  ('Production designer',       'Art',                 '#ec4899', 60),
  ('Art director',              'Art',                 '#ec4899', 61),
  ('Set decorator',             'Art',                 '#ec4899', 62),
  ('Prop master',               'Art',                 '#ec4899', 63),
  ('Costume designer',          'Wardrobe, hair & makeup', '#f472b6', 70),
  ('Wardrobe assistant',        'Wardrobe, hair & makeup', '#f472b6', 71),
  ('Makeup artist',             'Wardrobe, hair & makeup', '#f472b6', 72),
  ('Hair stylist',              'Wardrobe, hair & makeup', '#f472b6', 73),
  ('SFX makeup artist',         'Wardrobe, hair & makeup', '#f472b6', 74),
  ('Editor',                    'Editorial & post',    '#6366f1', 80),
  ('Assistant editor',          'Editorial & post',    '#6366f1', 81),
  ('Colorist',                  'Editorial & post',    '#6366f1', 82),
  ('VFX artist',                'Editorial & post',    '#6366f1', 83),
  ('Motion designer',           'Editorial & post',    '#6366f1', 84),
  ('Composer',                  'Music',               '#14b8a6', 90),
  ('Music supervisor',          'Music',               '#14b8a6', 91),
  ('Actor',                     'Performance',         '#22d3ee', 100),
  ('Stunt performer',           'Performance',         '#22d3ee', 101),
  ('Voice actor',               'Performance',         '#22d3ee', 102),
  ('Multi-hyphenate',           'Other',               '#a3a3a3', 110),
  ('Other',                     'Other',               '#a3a3a3', 111);

-- Old free-text values → the craft they meant (case-insensitive; a few
-- spellings the old lists used).
CREATE FUNCTION pg_temp.craft_for(v text) RETURNS text LANGUAGE sql AS $$
  select c.name from public.crafts c
  where lower(c.name) = lower(btrim(case lower(btrim(v))
    when 'dp / cinematographer' then 'Director of photography'
    when 'cinematographer' then 'Director of photography'
    when 'dp' then 'Director of photography'
    when 'pa' then 'Production assistant'
    when 'production designer' then 'Production designer'
    else v end))
$$;

-- ── Profiles: the craft someone works in ───────────────────────────────────
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
UPDATE public.profiles SET role = pg_temp.craft_for(role) WHERE role IS NOT NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_fkey
  FOREIGN KEY (role) REFERENCES public.crafts(name) ON UPDATE CASCADE ON DELETE SET NULL;
CREATE INDEX profiles_role_idx ON public.profiles USING btree (role);

-- ── Jobs: the craft a job is for ───────────────────────────────────────────
UPDATE public.jobs SET role = coalesce(pg_temp.craft_for(role), 'Other');
ALTER TABLE public.jobs ADD CONSTRAINT jobs_role_fkey
  FOREIGN KEY (role) REFERENCES public.crafts(name) ON UPDATE CASCADE;
CREATE INDEX jobs_role_idx ON public.jobs USING btree (role);

-- ── Crew: a craft on the project, and a permission level ───────────────────
ALTER TABLE public.project_crew ADD COLUMN craft text
  REFERENCES public.crafts(name) ON UPDATE CASCADE ON DELETE SET NULL;
UPDATE public.project_crew SET craft = pg_temp.craft_for(role) WHERE role NOT IN ('lead', 'contributor', 'viewer');
UPDATE public.project_crew SET role = 'contributor' WHERE role IS NULL OR role NOT IN ('lead', 'contributor', 'viewer');
ALTER TABLE public.project_crew ALTER COLUMN role SET DEFAULT 'contributor';
ALTER TABLE public.project_crew ALTER COLUMN role SET NOT NULL;
ALTER TABLE public.project_crew ADD CONSTRAINT project_crew_role_check CHECK (role IN ('lead', 'contributor', 'viewer'));
CREATE INDEX project_crew_craft_idx ON public.project_crew USING btree (craft);
