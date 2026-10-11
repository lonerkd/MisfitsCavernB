-- The film graph, step 2: people in scenes.
-- A character is a row; who is in a scene is a link; who plays whom follows the
-- character by id, so casting survives a rename. The old text (scenes.cast_list,
-- character_castings.character_name) stays correct and stays what existing code
-- reads and writes — triggers keep both sides in step (the strangler route).

CREATE TABLE public.characters (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT characters_pkey PRIMARY KEY (id),
  CONSTRAINT characters_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT characters_name_key UNIQUE (project_id, name),
  CONSTRAINT characters_id_project_key UNIQUE (id, project_id),
  CONSTRAINT characters_name_check CHECK (char_length(name) BETWEEN 1 AND 200 AND name = upper(btrim(name)))
);
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "characters access" ON public.characters FOR ALL TO authenticated
  USING (internal.can_access_project(project_id)) WITH CHECK (internal.can_access_project(project_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.characters TO authenticated;
REVOKE ALL ON public.characters FROM anon;
ALTER PUBLICATION supabase_realtime ADD TABLE public.characters;

CREATE TABLE public.scene_characters (
  scene_id uuid NOT NULL,
  character_id uuid NOT NULL,
  project_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT scene_characters_pkey PRIMARY KEY (scene_id, character_id),
  CONSTRAINT scene_characters_scene_fkey FOREIGN KEY (scene_id, project_id)
    REFERENCES public.scenes(id, project_id) ON DELETE CASCADE,
  CONSTRAINT scene_characters_character_fkey FOREIGN KEY (character_id, project_id)
    REFERENCES public.characters(id, project_id) ON DELETE CASCADE
);
CREATE INDEX scene_characters_character_idx ON public.scene_characters USING btree (character_id);
CREATE INDEX scene_characters_project_idx ON public.scene_characters USING btree (project_id);
ALTER TABLE public.scene_characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scene_characters access" ON public.scene_characters FOR ALL TO authenticated
  USING (internal.can_access_project(project_id)) WITH CHECK (internal.can_access_project(project_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scene_characters TO authenticated;
REVOKE ALL ON public.scene_characters FROM anon;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scene_characters;

-- Casting follows the character by id. Removing a character unlinks the casting.
ALTER TABLE public.character_castings
  ADD COLUMN character_id uuid,
  ADD CONSTRAINT character_castings_character_fkey FOREIGN KEY (character_id, project_id)
    REFERENCES public.characters(id, project_id) ON DELETE SET NULL (character_id);
CREATE INDEX character_castings_character_idx ON public.character_castings USING btree (character_id);

-- ── What's already there ─────────────────────────────────────
-- Filled directly, with the tables' own triggers off, so nothing looks edited.

INSERT INTO public.characters (project_id, name)
SELECT s.project_id, q.n
FROM public.scenes s
CROSS JOIN LATERAL (SELECT DISTINCT upper(btrim(x)) AS n FROM unnest(string_to_array(coalesce(s.cast_list, ''), ',')) x) q
WHERE q.n <> '' AND char_length(q.n) <= 200
UNION
SELECT project_id, upper(btrim(character_name)) FROM public.character_castings
WHERE btrim(character_name) <> '' AND char_length(upper(btrim(character_name))) <= 200
ON CONFLICT (project_id, name) DO NOTHING;

INSERT INTO public.scene_characters (scene_id, character_id, project_id)
SELECT DISTINCT s.id, c.id, s.project_id
FROM public.scenes s
CROSS JOIN LATERAL (SELECT DISTINCT upper(btrim(x)) AS n FROM unnest(string_to_array(coalesce(s.cast_list, ''), ',')) x) q
JOIN public.characters c ON c.project_id = s.project_id AND c.name = q.n
WHERE q.n <> ''
ON CONFLICT DO NOTHING;

ALTER TABLE public.character_castings DISABLE TRIGGER USER;
UPDATE public.character_castings k SET character_id = c.id
FROM public.characters c
WHERE c.project_id = k.project_id AND c.name = upper(btrim(k.character_name));
ALTER TABLE public.character_castings ENABLE TRIGGER USER;

-- ── Keeping them in step ─────────────────────────────────────
-- These run as whoever is writing, on rows of one project they may already write.

-- A scene's cast list becomes links (and characters, if new).
CREATE FUNCTION internal.scenes_link_cast()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_names text[];
begin
  select coalesce(array_agg(distinct n), '{}') into v_names
  from (select upper(btrim(x)) as n from unnest(string_to_array(coalesce(new.cast_list, ''), ',')) x) q
  where n <> '' and char_length(n) <= 200;

  insert into public.characters (project_id, name)
  select new.project_id, unnest(v_names)
  on conflict (project_id, name) do nothing;

  delete from public.scene_characters sc
  where sc.scene_id = new.id
    and not exists (select 1 from public.characters c where c.id = sc.character_id and c.name = any (v_names));

  insert into public.scene_characters (scene_id, character_id, project_id)
  select new.id, c.id, new.project_id from public.characters c
  where c.project_id = new.project_id and c.name = any (v_names)
  on conflict do nothing;
  return null;
end;
$function$;
REVOKE ALL ON FUNCTION internal.scenes_link_cast() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER scenes_link_cast AFTER INSERT OR UPDATE OF cast_list ON public.scenes
  FOR EACH ROW EXECUTE FUNCTION internal.scenes_link_cast();

-- A casting is of a character.
CREATE FUNCTION internal.castings_link_character()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_name text := upper(btrim(coalesce(new.character_name, '')));
begin
  if v_name = '' or char_length(v_name) > 200 then
    new.character_id := null;
    return new;
  end if;
  select id into new.character_id from public.characters where project_id = new.project_id and name = v_name;
  if new.character_id is null then
    insert into public.characters (project_id, name) values (new.project_id, v_name)
    on conflict (project_id, name) do nothing;
    select id into new.character_id from public.characters where project_id = new.project_id and name = v_name;
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.castings_link_character() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER castings_link_character BEFORE INSERT OR UPDATE OF character_name ON public.character_castings
  FOR EACH ROW EXECUTE FUNCTION internal.castings_link_character();

-- Renaming a character renames it everywhere the old text still lives.
CREATE FUNCTION internal.characters_rename()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  update public.character_castings set character_name = new.name where character_id = new.id;
  update public.scenes s set cast_list = (
    select string_agg(case when upper(btrim(x)) = old.name then new.name else btrim(x) end, ', ')
    from unnest(string_to_array(s.cast_list, ',')) x
  )
  where s.id in (select scene_id from public.scene_characters where character_id = new.id);
  return null;
end;
$function$;
REVOKE ALL ON FUNCTION internal.characters_rename() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER characters_rename AFTER UPDATE OF name ON public.characters
  FOR EACH ROW WHEN (old.name IS DISTINCT FROM new.name) EXECUTE FUNCTION internal.characters_rename();
