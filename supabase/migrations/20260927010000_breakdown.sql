-- The breakdown, as the production's own data. Until now a scene's elements
-- were guessed from ALL-CAPS words in its action lines, sorted by word lists
-- in the code, and overwritten on every sync — nobody could correct them, and
-- the budget multiplied their count by rates fixed in the code.
--
-- Now: each project has its own breakdown categories (seeded with the usual
-- set; rename, recolour, re-rate or add your own), its elements (one row per
-- thing the production needs — status, cost, who's on it), and the scenes each
-- element is tagged in. The parser's guesses become suggestions a person
-- accepts or dismisses; they never write here on their own.

-- ── Categories ─────────────────────────────────────────────────────────────
CREATE TABLE public.breakdown_categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  key text NOT NULL CONSTRAINT breakdown_categories_key_check CHECK (key ~ '^[a-z0-9_-]{1,40}$'),
  label text NOT NULL CONSTRAINT breakdown_categories_label_len CHECK (char_length(label) BETWEEN 1 AND 60),
  color text NOT NULL CONSTRAINT breakdown_categories_color_check CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  position integer DEFAULT 0 NOT NULL,
  -- Estimate for one element of this category when the element has no cost of its own.
  unit_cost numeric(12, 2) DEFAULT 0 NOT NULL CONSTRAINT breakdown_categories_unit_cost_check CHECK (unit_cost >= 0),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT breakdown_categories_project_key UNIQUE (project_id, key),
  CONSTRAINT breakdown_categories_id_project_key UNIQUE (id, project_id)
);
CREATE INDEX breakdown_categories_project_idx ON public.breakdown_categories USING btree (project_id, position);

-- ── Elements ───────────────────────────────────────────────────────────────
CREATE TABLE public.breakdown_elements (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  project_id uuid NOT NULL,
  category_id uuid NOT NULL,
  name text NOT NULL CONSTRAINT breakdown_elements_name_len CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  notes text CONSTRAINT breakdown_elements_notes_len CHECK (char_length(notes) <= 2000),
  status text DEFAULT 'needed' NOT NULL CONSTRAINT breakdown_elements_status_check CHECK (status IN ('needed', 'sourcing', 'ready')),
  -- NULL: use the category's unit cost.
  cost numeric(12, 2) CONSTRAINT breakdown_elements_cost_check CHECK (cost IS NULL OR cost >= 0),
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT breakdown_elements_id_project_key UNIQUE (id, project_id),
  CONSTRAINT breakdown_elements_category_fkey FOREIGN KEY (category_id, project_id)
    REFERENCES public.breakdown_categories(id, project_id) ON DELETE CASCADE,
  CONSTRAINT breakdown_elements_project_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);
-- One element per thing: "the revolver" is tagged in many scenes, not created per scene.
CREATE UNIQUE INDEX breakdown_elements_project_name_key ON public.breakdown_elements USING btree (project_id, lower(btrim(name)));
CREATE INDEX breakdown_elements_category_idx ON public.breakdown_elements USING btree (category_id);
CREATE INDEX breakdown_elements_assigned_to_idx ON public.breakdown_elements USING btree (assigned_to);
CREATE INDEX breakdown_elements_created_by_idx ON public.breakdown_elements USING btree (created_by);
CREATE TRIGGER breakdown_elements_updated_at BEFORE UPDATE ON public.breakdown_elements FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Tags: an element in a scene ────────────────────────────────────────────
CREATE TABLE public.scene_elements (
  scene_id uuid NOT NULL,
  element_id uuid NOT NULL,
  project_id uuid NOT NULL,
  created_by uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (scene_id, element_id),
  CONSTRAINT scene_elements_scene_fkey FOREIGN KEY (scene_id, project_id) REFERENCES public.scenes(id, project_id) ON DELETE CASCADE,
  CONSTRAINT scene_elements_element_fkey FOREIGN KEY (element_id, project_id) REFERENCES public.breakdown_elements(id, project_id) ON DELETE CASCADE
);
CREATE INDEX scene_elements_element_idx ON public.scene_elements USING btree (element_id);
CREATE INDEX scene_elements_project_idx ON public.scene_elements USING btree (project_id);
CREATE INDEX scene_elements_created_by_idx ON public.scene_elements USING btree (created_by);

-- ── Suggestions someone said no to ─────────────────────────────────────────
CREATE TABLE public.breakdown_dismissals (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  -- lib/breakdown/core.ts nameKey(): lowercase letters and digits, any script.
  name_key text NOT NULL CONSTRAINT breakdown_dismissals_name_key_check CHECK (char_length(name_key) BETWEEN 1 AND 120 AND name_key = lower(name_key) AND name_key !~ '[[:space:][:punct:]]'),
  created_by uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (project_id, name_key)
);
CREATE INDEX breakdown_dismissals_created_by_idx ON public.breakdown_dismissals USING btree (created_by);

-- ── Access: the project team ───────────────────────────────────────────────
ALTER TABLE public.breakdown_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breakdown_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breakdown_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "breakdown_categories view" ON public.breakdown_categories FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id));
CREATE POLICY "breakdown_categories insert" ON public.breakdown_categories FOR INSERT TO authenticated
  WITH CHECK (internal.can_access_project(project_id));
CREATE POLICY "breakdown_categories update" ON public.breakdown_categories FOR UPDATE TO authenticated
  USING (internal.can_access_project(project_id)) WITH CHECK (internal.can_access_project(project_id));
-- Removing a category removes its elements everywhere: the owner's call.
CREATE POLICY "breakdown_categories delete" ON public.breakdown_categories FOR DELETE TO authenticated
  USING (internal.is_project_creator(project_id));

CREATE POLICY "breakdown_elements access" ON public.breakdown_elements FOR ALL TO authenticated
  USING (internal.can_access_project(project_id)) WITH CHECK (internal.can_access_project(project_id));
CREATE POLICY "scene_elements access" ON public.scene_elements FOR ALL TO authenticated
  USING (internal.can_access_project(project_id)) WITH CHECK (internal.can_access_project(project_id));
CREATE POLICY "breakdown_dismissals access" ON public.breakdown_dismissals FOR ALL TO authenticated
  USING (internal.can_access_project(project_id)) WITH CHECK (internal.can_access_project(project_id));

-- ── Every project starts with the usual categories ─────────────────────────
-- Data, not code: the team renames, recolours, re-rates or adds to them.
CREATE FUNCTION internal.seed_breakdown_categories(p_project uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  insert into public.breakdown_categories (project_id, key, label, color, position, unit_cost)
  values
    (p_project, 'cast',         'Cast',              '#e5484d', 0,  0),
    (p_project, 'extras',       'Extras',            '#30a46c', 1,  0),
    (p_project, 'stunts',       'Stunts',            '#f76b15', 2,  0),
    (p_project, 'props',        'Props',             '#8e4ec6', 3,  0),
    (p_project, 'wardrobe',     'Wardrobe',          '#3e63dd', 4,  0),
    (p_project, 'makeup',       'Hair & makeup',     '#d6409f', 5,  0),
    (p_project, 'set-dressing', 'Set dressing',      '#ad7f58', 6,  0),
    (p_project, 'vehicles',     'Vehicles & animals','#ffb224', 7,  0),
    (p_project, 'sfx',          'Special effects',   '#0090ff', 8,  0),
    (p_project, 'vfx',          'Visual effects',    '#12a594', 9,  0),
    (p_project, 'sound',        'Sound & music',     '#a18072', 10, 0),
    (p_project, 'equipment',    'Special equipment', '#8d8d8d', 11, 0)
  on conflict (project_id, key) do nothing;
$function$;
REVOKE ALL ON FUNCTION internal.seed_breakdown_categories(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION internal.seed_breakdown_categories(uuid) TO service_role;

CREATE FUNCTION internal.projects_seed_breakdown()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform internal.seed_breakdown_categories(new.id);
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.projects_seed_breakdown() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION internal.projects_seed_breakdown() TO service_role;
CREATE TRIGGER projects_seed_breakdown AFTER INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION internal.projects_seed_breakdown();

SELECT internal.seed_breakdown_categories(id) FROM public.projects;

-- ── Tag an element in a scene, creating the element if it's new ────────────
-- One transaction, invoker rights (RLS applies): tagging "the revolver" in
-- scene 12 finds the project's revolver or makes it, then tags the scene.
CREATE FUNCTION public.tag_scene_element(p_scene uuid, p_name text, p_category uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
declare
  v_project uuid;
  v_element uuid;
  v_name text := btrim(coalesce(p_name, ''));
begin
  select sc.project_id into v_project from public.scenes sc where sc.id = p_scene;
  if v_project is null then
    raise exception 'Scene not found' using errcode = '42501';
  end if;
  if char_length(v_name) = 0 then
    raise exception 'Name the element' using errcode = '22023';
  end if;

  select e.id into v_element from public.breakdown_elements e
   where e.project_id = v_project and lower(btrim(e.name)) = lower(v_name);
  if v_element is null then
    insert into public.breakdown_elements (project_id, category_id, name)
    values (v_project, p_category, v_name)
    on conflict (project_id, lower(btrim(name))) do nothing
    returning id into v_element;
    if v_element is null then
      select e.id into v_element from public.breakdown_elements e
       where e.project_id = v_project and lower(btrim(e.name)) = lower(v_name);
    end if;
  end if;

  insert into public.scene_elements (scene_id, element_id, project_id)
  values (p_scene, v_element, v_project)
  on conflict do nothing;
  return v_element;
end;
$function$;
REVOKE ALL ON FUNCTION public.tag_scene_element(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tag_scene_element(uuid, text, uuid) TO authenticated, service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.breakdown_categories, public.breakdown_elements, public.scene_elements, public.breakdown_dismissals;
