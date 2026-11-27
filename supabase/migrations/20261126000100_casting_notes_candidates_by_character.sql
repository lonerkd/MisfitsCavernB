-- The film graph, casting: a casting note or a shortlisted candidate is of a character.
--
-- casting_notes.character_name and casting_candidates.character_name stay correct and stay
-- what the printed sheet reads; character_id is the link the board moves onto, so a note or
-- a candidate follows its character through a rename and stops depending on how a name was
-- typed. Same pattern as character_castings (20261011010000) and call_sheet_calls
-- (20261102100000). RLS otherwise untouched — every policy keys on project_id, so the new
-- column inherits them — with one addition: casting_notes gains the creator UPDATE policy
-- casting_candidates already has, because the rename trigger below runs as whoever renames
-- and notes had no UPDATE policy at all, so a rename silently carried zero notes (the
-- persona tests caught it; the creator could already delete and re-add a note, so the
-- policy grants nothing beyond that).

ALTER TABLE public.casting_notes
  ADD COLUMN character_id uuid,
  ADD CONSTRAINT casting_notes_character_fkey FOREIGN KEY (character_id, project_id)
    REFERENCES public.characters(id, project_id) ON DELETE SET NULL (character_id);
CREATE INDEX casting_notes_character_idx ON public.casting_notes USING btree (character_id, project_id);

ALTER TABLE public.casting_candidates
  ADD COLUMN character_id uuid,
  ADD CONSTRAINT casting_candidates_character_fkey FOREIGN KEY (character_id, project_id)
    REFERENCES public.characters(id, project_id) ON DELETE SET NULL (character_id);
CREATE INDEX casting_candidates_character_idx ON public.casting_candidates USING btree (character_id, project_id);

-- What's already there: characters for any name a note or a candidate uses, then the links.
-- Filled with the tables' own triggers off, so no row looks edited.
-- A name that is blank or longer than a character name may be (200) cannot be a character:
-- those rows keep character_id null and keep their name — nothing is deleted or rewritten,
-- and readers fall back to the name for an unlinked row.
INSERT INTO public.characters (project_id, name)
SELECT DISTINCT project_id, upper(btrim(character_name)) FROM public.casting_notes
WHERE btrim(character_name) <> '' AND char_length(upper(btrim(character_name))) <= 200
UNION
SELECT DISTINCT project_id, upper(btrim(character_name)) FROM public.casting_candidates
WHERE btrim(character_name) <> '' AND char_length(upper(btrim(character_name))) <= 200
ON CONFLICT (project_id, name) DO NOTHING;

ALTER TABLE public.casting_notes DISABLE TRIGGER USER;
UPDATE public.casting_notes k SET character_id = c.id
FROM public.characters c
WHERE c.project_id = k.project_id AND c.name = upper(btrim(k.character_name));
ALTER TABLE public.casting_notes ENABLE TRIGGER USER;

ALTER TABLE public.casting_candidates DISABLE TRIGGER USER;
UPDATE public.casting_candidates k SET character_id = c.id
FROM public.characters c
WHERE c.project_id = k.project_id AND c.name = upper(btrim(k.character_name));
ALTER TABLE public.casting_candidates ENABLE TRIGGER USER;

-- A note for a name is a note for that character (made if new).
CREATE FUNCTION internal.casting_notes_link_character()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_name text := upper(btrim(coalesce(new.character_name, '')));
begin
  -- Unlinking is allowed (the foreign key does it when a character is removed): only a link that
  -- names a character, or a changed name, is made to agree with the name.
  if tg_op = 'UPDATE' and new.character_id is null and new.character_name is not distinct from old.character_name then
    return new;
  end if;
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
REVOKE ALL ON FUNCTION internal.casting_notes_link_character() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER casting_notes_link_character BEFORE INSERT OR UPDATE OF character_name, character_id ON public.casting_notes
  FOR EACH ROW EXECUTE FUNCTION internal.casting_notes_link_character();

-- A candidate for a name is a candidate for that character (made if new).
CREATE FUNCTION internal.casting_candidates_link_character()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_name text := upper(btrim(coalesce(new.character_name, '')));
begin
  -- Unlinking is allowed (the foreign key does it when a character is removed): only a link that
  -- names a character, or a changed name, is made to agree with the name.
  if tg_op = 'UPDATE' and new.character_id is null and new.character_name is not distinct from old.character_name then
    return new;
  end if;
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
REVOKE ALL ON FUNCTION internal.casting_candidates_link_character() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER casting_candidates_link_character BEFORE INSERT OR UPDATE OF character_name, character_id ON public.casting_candidates
  FOR EACH ROW EXECUTE FUNCTION internal.casting_candidates_link_character();

-- The rename below runs as the person renaming, so it can only carry rows that person may
-- update: candidates already allow the creator, notes did not allow anyone.
CREATE POLICY "casting_notes_update" ON public.casting_notes
  FOR UPDATE USING (internal.is_project_creator(project_id)) WITH CHECK (internal.is_project_creator(project_id));

-- Renaming a character renames it in its notes and candidates too (as it already does in
-- castings and calls). Neither table has a name uniqueness rule, so every linked row follows.
CREATE OR REPLACE FUNCTION internal.characters_rename()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  update public.character_castings set character_name = new.name where character_id = new.id;
  update public.casting_notes set character_name = new.name where character_id = new.id;
  update public.casting_candidates set character_name = new.name where character_id = new.id;
  -- One call per name per sheet is unique, and two calls typed 'Maya' and 'MAYA' both link to this
  -- character: rename one per sheet, and leave a call alone if its sheet already has the new name.
  -- The link (character_id) is the truth; the text on a left-alone call is just older.
  update public.call_sheet_calls k set character_name = new.name
  where k.id in (select distinct on (call_sheet_id) id from public.call_sheet_calls where character_id = new.id order by call_sheet_id, id)
    and not exists (select 1 from public.call_sheet_calls o where o.call_sheet_id = k.call_sheet_id and o.character_name = new.name and o.id <> k.id);
  return null;
end;
$function$;
