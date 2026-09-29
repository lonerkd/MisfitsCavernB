-- The project brief: what the project is, collected phase by phase as
-- choices (not free text), and read back by every part of the suite.
--
-- brief_questions is the catalogue — data, curated by admins. Each option
-- may say what it implies for the rest of the suite (`implies`):
--   crafts     — roles the project will likely need (crafts.name)
--   breakdown  — breakdown categories that matter (breakdown_categories.key)
--   channels   — Lounge channel presets that fit (channel_presets.key)
--   pages_per_day — the shooting pace this choice suggests
-- `ask_when` limits a question to some formats ({"formats": [...]},
-- {"not_formats": [...]}) or to an earlier answer ({"answer": {"goal":
-- ["festivals"]}}).
--
-- project_brief holds a project's answers, one row per question, checked
-- against the catalogue. The team reads them; the owner and contributors
-- (not viewers) answer.
--
-- channel_presets: the Lounge channels a production tends to want, each for
-- an audience and from a phase — suggested to the project's owner when they
-- fit (a "dailies" room once the shoot starts, "legal" for owners…).
--
-- project_context(project) gathers what the suite already knows about a
-- project (scenes, locations, night exteriors, crew crafts, breakdown,
-- castings, channels) for the analysis in lib/brief.

CREATE TABLE public.brief_questions (
  key text PRIMARY KEY CONSTRAINT brief_questions_key_check CHECK (key ~ '^[a-z][a-z0-9_]{1,40}$'),
  phase text NOT NULL CONSTRAINT brief_questions_phase_check CHECK (phase IN ('development', 'pre-production', 'production', 'post-production', 'delivery')),
  label text NOT NULL CONSTRAINT brief_questions_label_check CHECK (char_length(label) BETWEEN 1 AND 120),
  hint text DEFAULT '' NOT NULL CONSTRAINT brief_questions_hint_check CHECK (char_length(hint) <= 300),
  kind text NOT NULL CONSTRAINT brief_questions_kind_check CHECK (kind IN ('one', 'many', 'number')),
  options jsonb DEFAULT '[]'::jsonb NOT NULL CONSTRAINT brief_questions_options_check CHECK (jsonb_typeof(options) = 'array'),
  unit text,
  min_value numeric,
  max_value numeric,
  ask_when jsonb DEFAULT '{}'::jsonb NOT NULL CONSTRAINT brief_questions_ask_when_check CHECK (jsonb_typeof(ask_when) = 'object'),
  position integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT brief_questions_shape_check CHECK ((kind = 'number' AND min_value IS NOT NULL AND max_value IS NOT NULL AND min_value <= max_value) OR (kind <> 'number' AND jsonb_array_length(options) > 0))
);
ALTER TABLE public.brief_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brief_questions read" ON public.brief_questions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "brief_questions admin" ON public.brief_questions FOR ALL TO authenticated
  USING (internal.caller_is_admin()) WITH CHECK (internal.caller_is_admin());

CREATE TABLE public.project_brief (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  question text NOT NULL REFERENCES public.brief_questions(key) ON UPDATE CASCADE ON DELETE CASCADE,
  value jsonb NOT NULL,
  answered_by uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (project_id, question)
);
CREATE INDEX project_brief_question_idx ON public.project_brief USING btree (question);
ALTER TABLE public.project_brief ENABLE ROW LEVEL SECURITY;

-- Owner and contributors shape the project; viewers (guests) only read.
CREATE FUNCTION internal.can_shape_project(pid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select internal.is_project_creator(pid) or exists (
    select 1 from project_crew c join projects p on p.id = c.project_id
     where c.project_id = pid and c.user_id = auth.uid() and c.role in ('lead', 'contributor')
       and coalesce(c.status, 'confirmed') = 'confirmed' and p.visibility <> 'private'
  );
$function$;
REVOKE ALL ON FUNCTION internal.can_shape_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION internal.can_shape_project(uuid) TO authenticated;

CREATE POLICY "project_brief read" ON public.project_brief FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id));
CREATE POLICY "project_brief insert" ON public.project_brief FOR INSERT TO authenticated
  WITH CHECK (internal.can_shape_project(project_id));
CREATE POLICY "project_brief update" ON public.project_brief FOR UPDATE TO authenticated
  USING (internal.can_shape_project(project_id)) WITH CHECK (internal.can_shape_project(project_id));
CREATE POLICY "project_brief delete" ON public.project_brief FOR DELETE TO authenticated
  USING (internal.can_shape_project(project_id));

-- An answer must fit its question: one of its options, a set of them, or a
-- number in range. Who answered and when are recorded, not supplied.
CREATE FUNCTION internal.project_brief_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  q public.brief_questions;
  ids text[];
begin
  select * into q from public.brief_questions where key = new.question;
  select coalesce(array_agg(o->>'id'), '{}') into ids from jsonb_array_elements(q.options) o;
  if q.kind = 'one' then
    if jsonb_typeof(new.value) <> 'string' or not (new.value #>> '{}') = any (ids) then
      raise exception 'Pick one of the options' using errcode = '22023';
    end if;
  elsif q.kind = 'many' then
    if jsonb_typeof(new.value) <> 'array' or jsonb_array_length(new.value) = 0
       or exists (select 1 from jsonb_array_elements(new.value) v where jsonb_typeof(v) <> 'string' or not (v #>> '{}') = any (ids))
       or (select count(distinct v) from jsonb_array_elements(new.value) v) <> jsonb_array_length(new.value) then
      raise exception 'Pick from the options' using errcode = '22023';
    end if;
  else
    if jsonb_typeof(new.value) <> 'number' or (new.value)::numeric < q.min_value or (new.value)::numeric > q.max_value then
      raise exception 'Enter a number from % to %', q.min_value, q.max_value using errcode = '22023';
    end if;
  end if;
  new.answered_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.project_brief_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER project_brief_guard BEFORE INSERT OR UPDATE ON public.project_brief
  FOR EACH ROW EXECUTE FUNCTION internal.project_brief_guard();

CREATE TABLE public.channel_presets (
  key text PRIMARY KEY CONSTRAINT channel_presets_key_check CHECK (key ~ '^[a-z][a-z0-9-]{1,40}$'),
  name text NOT NULL CONSTRAINT channel_presets_name_check CHECK (char_length(name) BETWEEN 1 AND 40),
  type text DEFAULT 'text' NOT NULL CONSTRAINT channel_presets_type_check CHECK (type IN ('text', 'voice', 'guide')),
  audience text DEFAULT 'team' NOT NULL CONSTRAINT channel_presets_audience_check CHECK (audience IN ('team', 'owners', 'above', 'below', 'guests', 'public')),
  post_policy text DEFAULT 'viewers' NOT NULL CONSTRAINT channel_presets_post_policy_check CHECK (post_policy IN ('viewers', 'members', 'managers')),
  topic text DEFAULT '' NOT NULL,
  phase text DEFAULT 'development' NOT NULL CONSTRAINT channel_presets_phase_check CHECK (phase IN ('development', 'pre-production', 'production', 'post-production', 'delivery')),
  why text DEFAULT '' NOT NULL,
  position integer DEFAULT 0 NOT NULL
);
ALTER TABLE public.channel_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "channel_presets read" ON public.channel_presets FOR SELECT TO authenticated USING (true);
CREATE POLICY "channel_presets admin" ON public.channel_presets FOR ALL TO authenticated
  USING (internal.caller_is_admin()) WITH CHECK (internal.caller_is_admin());

-- What the suite already knows about a project, for the brief's analysis.
CREATE FUNCTION public.project_context(p_project uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with sc as (
    select s.id, upper(coalesce(s.heading, '')) as heading, upper(coalesce(s.time_of_day, '')) as tod,
           nullif(upper(trim(coalesce(s.location, ''))), '') as loc, s.shoot_day,
           exists (select 1 from public.scene_media m where m.scene_id = s.id) as has_refs
      from public.scenes s
     where s.project_id = p_project and s.removed_at is null
  )
  select case when not internal.can_access_project(p_project) then null else jsonb_build_object(
    'scenes', (select count(*) from sc),
    'exteriors', (select count(*) from sc where heading like 'EXT%' or heading like 'I/E%' or heading like 'INT./EXT%' or heading like 'INT/EXT%'),
    'night_exteriors', (select count(*) from sc where (heading like 'EXT%' or heading like 'I/E%' or heading like 'INT./EXT%' or heading like 'INT/EXT%') and tod like '%NIGHT%'),
    'locations', (select count(distinct loc) from sc),
    'scenes_with_refs', (select count(*) from sc where has_refs),
    'shoot_days', (select count(*) from public.call_sheets c where c.project_id = p_project),
    'characters', (select count(distinct upper(ch.name)) from public.script_characters ch join public.scripts s on s.id = ch.script_id where s.project_id = p_project),
    'cast', (select count(distinct upper(k.character_name)) from public.character_castings k where k.project_id = p_project),
    'crafts', coalesce((select jsonb_agg(distinct c.craft) from public.project_crew c
                         where c.project_id = p_project and c.craft is not null and coalesce(c.status, 'confirmed') = 'confirmed'), '[]'::jsonb),
    'crew', (select count(*) from public.project_crew c where c.project_id = p_project and coalesce(c.status, 'confirmed') = 'confirmed'),
    'viewers', (select count(*) from public.project_crew c where c.project_id = p_project and c.role = 'viewer' and coalesce(c.status, 'confirmed') = 'confirmed'),
    'breakdown', coalesce((select jsonb_object_agg(k.key, jsonb_build_object('label', k.label, 'n', k.n)) from (
                  select bc.key, bc.label, count(be.id) as n from public.breakdown_categories bc
                    left join public.breakdown_elements be on be.category_id = bc.id
                   where bc.project_id = p_project group by bc.key, bc.label) k), '{}'::jsonb),
    'channels', coalesce((select jsonb_agg(ch.name order by ch.name) from public.channels ch where ch.project_id = p_project), '[]'::jsonb),
    'budget', coalesce((select sum(b.amount) from public.budget_items b where b.project_id = p_project), 0)
  ) end;
$function$;
REVOKE ALL ON FUNCTION public.project_context(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.project_context(uuid) TO authenticated;

-- ── The catalogue ────────────────────────────────────────────────────────
INSERT INTO public.brief_questions (key, phase, label, hint, kind, options, unit, min_value, max_value, ask_when, position) VALUES
('genre', 'development', 'Genre', 'Pick all that fit. It shapes what the breakdown watches for and who you’ll need.', 'many', '[
  {"id":"drama","label":"Drama"},
  {"id":"comedy","label":"Comedy"},
  {"id":"thriller","label":"Thriller","implies":{"breakdown":["props"]}},
  {"id":"horror","label":"Horror","implies":{"crafts":["SFX makeup artist"],"breakdown":["makeup","sfx"]}},
  {"id":"action","label":"Action","implies":{"crafts":["Stunt performer"],"breakdown":["stunts","vehicles","sfx"]}},
  {"id":"scifi","label":"Sci-fi","implies":{"crafts":["VFX artist","Production designer"],"breakdown":["vfx","props"]}},
  {"id":"fantasy","label":"Fantasy","implies":{"crafts":["Costume designer","VFX artist"],"breakdown":["wardrobe","makeup","vfx"]}},
  {"id":"romance","label":"Romance"},
  {"id":"crime","label":"Crime","implies":{"breakdown":["props","vehicles"]}},
  {"id":"mystery","label":"Mystery"},
  {"id":"musical","label":"Musical","implies":{"crafts":["Composer","Music supervisor"],"breakdown":["sound"]}},
  {"id":"family","label":"Family"},
  {"id":"experimental","label":"Experimental"}
]', NULL, NULL, NULL, '{"not_formats":["Podcast"]}', 0),
('tone', 'development', 'Tone', 'How it should feel. A note for everyone who joins.', 'one', '[
  {"id":"grounded","label":"Grounded","hint":"Naturalistic, real-world"},
  {"id":"heightened","label":"Heightened","hint":"Stylised, bigger than life"},
  {"id":"dark","label":"Dark"},
  {"id":"light","label":"Light-hearted"},
  {"id":"satirical","label":"Satirical"},
  {"id":"dreamlike","label":"Dreamlike"}
]', NULL, NULL, NULL, '{}', 1),
('target_runtime', 'development', 'Target length', 'What length you’re aiming for. The editor measures the script against it.', 'number', '[]', 'minutes', 1, 600, '{}', 2),
('era', 'development', 'When it’s set', 'Period and invented worlds need more from wardrobe, art and props.', 'one', '[
  {"id":"contemporary","label":"Today"},
  {"id":"period","label":"The past","implies":{"crafts":["Costume designer","Production designer"],"breakdown":["wardrobe","set-dressing","props","vehicles"]}},
  {"id":"future","label":"The future","implies":{"crafts":["Production designer","VFX artist"],"breakdown":["set-dressing","vfx"]}},
  {"id":"invented","label":"An invented world","implies":{"crafts":["Production designer","Costume designer"],"breakdown":["set-dressing","wardrobe"]}}
]', NULL, NULL, NULL, '{"not_formats":["Podcast","Commercial"]}', 3),
('goal', 'development', 'Where it’s headed', 'Pick all that apply. It decides what delivery asks for later.', 'many', '[
  {"id":"festivals","label":"Festivals"},
  {"id":"online","label":"Online release"},
  {"id":"distribution","label":"Sales & distribution"},
  {"id":"portfolio","label":"Portfolio / reel"},
  {"id":"proof","label":"Proof of concept / pitch"},
  {"id":"client","label":"Client work"}
]', NULL, NULL, NULL, '{}', 4),
('audience', 'development', 'Audience', 'Who it’s for — and what it may show.', 'one', '[
  {"id":"everyone","label":"Everyone"},
  {"id":"teens","label":"Teens and up"},
  {"id":"adults","label":"Adults"}
]', NULL, NULL, NULL, '{}', 5),
('structure', 'development', 'Story structure', 'The shape you’re building on. The beat board follows it.', 'one', '[
  {"id":"three_act","label":"Three acts"},
  {"id":"save_the_cat","label":"Save the Cat beats"},
  {"id":"heros_journey","label":"Hero’s journey"},
  {"id":"story_circle","label":"Story circle"},
  {"id":"tv_acts","label":"TV acts","hint":"Teaser, acts, tag"},
  {"id":"doc_arc","label":"Documentary arc"},
  {"id":"freeform","label":"Free-form"}
]', NULL, NULL, NULL, '{"not_formats":["Podcast","Commercial","Music Video"]}', 6),
('budget_tier', 'pre-production', 'Budget level', 'Sets the pace the schedule expects — how many pages a day you can shoot.', 'one', '[
  {"id":"none","label":"Self-funded","hint":"Favours and friends","implies":{"pages_per_day":6}},
  {"id":"micro","label":"Micro-budget","implies":{"pages_per_day":5}},
  {"id":"low","label":"Low budget","implies":{"pages_per_day":4}},
  {"id":"indie","label":"Independent","implies":{"pages_per_day":3}},
  {"id":"funded","label":"Fully funded","implies":{"pages_per_day":2.5}}
]', NULL, NULL, NULL, '{}', 10),
('shoot_days', 'pre-production', 'Planned shooting days', 'Compared with what the script needs at your pace.', 'number', '[]', 'days', 1, 300, '{"not_formats":["Podcast"]}', 11),
('style', 'pre-production', 'Camera style', 'Pick all that fit.', 'many', '[
  {"id":"handheld","label":"Handheld"},
  {"id":"locked","label":"Locked-off"},
  {"id":"gimbal","label":"Gimbal / Steadicam","implies":{"crafts":["Steadicam operator"],"breakdown":["equipment"]}},
  {"id":"drone","label":"Drone","implies":{"crafts":["Drone operator"],"breakdown":["equipment"]}},
  {"id":"multicam","label":"Multi-camera","implies":{"crafts":["Camera operator"]}},
  {"id":"long_takes","label":"Long takes"}
]', NULL, NULL, NULL, '{"not_formats":["Podcast"]}', 12),
('capture', 'pre-production', 'Shooting on', '', 'one', '[
  {"id":"cinema","label":"Cinema camera","implies":{"crafts":["First assistant camera","DIT"]}},
  {"id":"mirrorless","label":"Mirrorless / DSLR"},
  {"id":"phone","label":"Phone"},
  {"id":"film","label":"Film","implies":{"crafts":["First assistant camera","Second assistant camera"]}}
]', NULL, NULL, NULL, '{"not_formats":["Podcast"]}', 13),
('locations', 'pre-production', 'Where you’ll shoot', '', 'one', '[
  {"id":"practical","label":"Real locations","implies":{"crafts":["Location manager"]}},
  {"id":"stage","label":"Studio / stage","implies":{"crafts":["Production designer","Art director"],"breakdown":["set-dressing"]}},
  {"id":"mixed","label":"Both","implies":{"crafts":["Location manager","Production designer"]}},
  {"id":"virtual","label":"Virtual production","implies":{"crafts":["VFX artist"],"breakdown":["vfx"]}}
]', NULL, NULL, NULL, '{"not_formats":["Podcast"]}', 14),
('needs', 'pre-production', 'Anything special on set?', 'Each one needs planning — and usually someone who does it for a living.', 'many', '[
  {"id":"stunts","label":"Stunts or fights","implies":{"crafts":["Stunt performer"],"breakdown":["stunts"]}},
  {"id":"weapons","label":"Weapons","implies":{"crafts":["Prop master"],"breakdown":["props"]}},
  {"id":"vehicles","label":"Vehicles","implies":{"breakdown":["vehicles"]}},
  {"id":"animals","label":"Animals","implies":{"breakdown":["vehicles"]}},
  {"id":"children","label":"Children"},
  {"id":"water","label":"Water, rain or weather","implies":{"breakdown":["sfx"]}},
  {"id":"crowds","label":"Crowds","implies":{"breakdown":["extras"]}},
  {"id":"night","label":"Night exteriors","implies":{"crafts":["Gaffer","Electrician"],"breakdown":["equipment"]}},
  {"id":"prosthetics","label":"Prosthetics / SFX makeup","implies":{"crafts":["SFX makeup artist"],"breakdown":["makeup"]}},
  {"id":"vfx","label":"Visual effects","implies":{"crafts":["VFX artist"],"breakdown":["vfx"]}}
]', NULL, NULL, NULL, '{"not_formats":["Podcast"]}', 15),
('dailies', 'production', 'Reviewing dailies', 'How the team looks at what was shot.', 'one', '[
  {"id":"daily","label":"Every day","implies":{"channels":["dailies"],"crafts":["DIT"]}},
  {"id":"few_days","label":"Every few days","implies":{"channels":["dailies"]}},
  {"id":"later","label":"Not until the edit"}
]', NULL, NULL, NULL, '{"not_formats":["Podcast"]}', 20),
('music', 'post-production', 'Music', '', 'one', '[
  {"id":"score","label":"Original score","implies":{"crafts":["Composer"]}},
  {"id":"licensed","label":"Licensed tracks","implies":{"crafts":["Music supervisor"]}},
  {"id":"library","label":"Library music"},
  {"id":"mix","label":"A mix of these","implies":{"crafts":["Composer","Music supervisor"]}},
  {"id":"none","label":"No music"}
]', NULL, NULL, NULL, '{}', 30),
('sound_mix', 'post-production', 'Sound mix', '', 'one', '[
  {"id":"stereo","label":"Stereo"},
  {"id":"surround","label":"5.1 surround","implies":{"crafts":["Re-recording mixer"]}},
  {"id":"atmos","label":"Dolby Atmos","implies":{"crafts":["Re-recording mixer"]}}
]', NULL, NULL, NULL, '{}', 31),
('aspect', 'post-production', 'Frame', '', 'one', '[
  {"id":"scope","label":"2.39:1 scope"},
  {"id":"flat","label":"1.85:1"},
  {"id":"hd","label":"16:9"},
  {"id":"academy","label":"4:3"},
  {"id":"vertical","label":"9:16 vertical"},
  {"id":"square","label":"1:1 square"}
]', NULL, NULL, NULL, '{"not_formats":["Podcast"]}', 32),
('finishing', 'post-production', 'Finishing', 'Pick what the film gets before it’s done.', 'many', '[
  {"id":"grade","label":"Colour grade","implies":{"crafts":["Colorist"]}},
  {"id":"sound_design","label":"Sound design","implies":{"crafts":["Sound designer"]}},
  {"id":"titles","label":"Titles & graphics","implies":{"crafts":["Motion designer"]}},
  {"id":"vfx","label":"VFX shots","implies":{"crafts":["VFX artist"],"breakdown":["vfx"]}},
  {"id":"captions","label":"Captions & subtitles"}
]', NULL, NULL, NULL, '{}', 33),
('festivals', 'delivery', 'Which festivals', 'Where to aim first.', 'many', '[
  {"id":"a_list","label":"Top-tier"},
  {"id":"genre","label":"Genre festivals"},
  {"id":"shorts","label":"Short-film festivals"},
  {"id":"regional","label":"Regional & local"},
  {"id":"online","label":"Online festivals"},
  {"id":"student","label":"Student festivals"}
]', NULL, NULL, NULL, '{"answer":{"goal":["festivals"]}}', 40),
('platforms', 'delivery', 'Release on', '', 'many', '[
  {"id":"youtube","label":"YouTube"},
  {"id":"vimeo","label":"Vimeo"},
  {"id":"social","label":"Instagram / TikTok"},
  {"id":"streaming","label":"Streaming services"},
  {"id":"theatrical","label":"Cinemas"},
  {"id":"broadcast","label":"TV broadcast"},
  {"id":"podcast","label":"Podcast apps"}
]', NULL, NULL, NULL, '{"answer":{"goal":["online","distribution","client"]}}', 41),
('access', 'delivery', 'Accessibility', 'What every version ships with.', 'many', '[
  {"id":"captions","label":"Closed captions"},
  {"id":"audio_description","label":"Audio description"},
  {"id":"translations","label":"Translated subtitles"}
]', NULL, NULL, NULL, '{}', 42);

INSERT INTO public.channel_presets (key, name, type, audience, post_policy, topic, phase, why, position) VALUES
('script-notes', 'script-notes', 'text', 'above', 'viewers', 'Notes on the pages — writers, director, producers.', 'development', 'Script conversations stay with the people shaping it.', 0),
('legal', 'legal', 'text', 'owners', 'viewers', 'Contracts, releases, rights and clearances.', 'development', 'Agreements and clearances, owners only.', 1),
('announcements', 'announcements', 'text', 'team', 'managers', 'Call times, changes, news — from the people running it.', 'pre-production', 'One place the whole team checks.', 2),
('production', 'production', 'text', 'below', 'viewers', 'Departments: gear, locations, logistics.', 'pre-production', 'Where the crafts plan the shoot.', 3),
('guests', 'guests', 'text', 'guests', 'viewers', 'For collaborators and visitors.', 'pre-production', 'Somewhere for people you’ve added as viewers.', 4),
('dailies', 'dailies', 'text', 'team', 'viewers', 'Today’s footage and notes on it.', 'production', 'Look at what was shot while you can still reshoot.', 5),
('set', 'set', 'voice', 'team', 'viewers', 'Talk on the day.', 'production', 'A voice room for the shoot.', 6),
('post', 'post', 'text', 'team', 'viewers', 'The edit, sound, grade and VFX.', 'post-production', 'Post-production’s own room.', 7),
('updates', 'updates', 'text', 'public', 'managers', 'News for everyone following the film.', 'delivery', 'Anyone signed in can follow the release.', 8);
