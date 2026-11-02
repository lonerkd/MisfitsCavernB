-- The film graph, step 2 (finished): a call-sheet call for a character is of a character.
--
-- call_sheet_calls.character_name stays correct and stays what existing code
-- reads; call_sheet_calls.character_id is the link the tools move onto, so a
-- call follows its character through a rename and stops depending on how a
-- name was typed. Same pattern as character_castings (20261011010000).

ALTER TABLE public.call_sheet_calls
  ADD COLUMN character_id uuid,
  ADD CONSTRAINT call_sheet_calls_character_fkey FOREIGN KEY (character_id, project_id)
    REFERENCES public.characters(id, project_id) ON DELETE SET NULL (character_id);
CREATE INDEX call_sheet_calls_character_idx ON public.call_sheet_calls USING btree (character_id);

-- What's already there: characters for any name a call uses, then the links.
-- Filled with the table's own triggers off, so no call looks edited.
INSERT INTO public.characters (project_id, name)
SELECT DISTINCT project_id, upper(btrim(character_name)) FROM public.call_sheet_calls
WHERE character_name IS NOT NULL AND btrim(character_name) <> '' AND char_length(upper(btrim(character_name))) <= 200
ON CONFLICT (project_id, name) DO NOTHING;

ALTER TABLE public.call_sheet_calls DISABLE TRIGGER USER;
UPDATE public.call_sheet_calls k SET character_id = c.id
FROM public.characters c
WHERE k.character_name IS NOT NULL AND c.project_id = k.project_id AND c.name = upper(btrim(k.character_name));
ALTER TABLE public.call_sheet_calls ENABLE TRIGGER USER;

-- A call for a name is a call for that character (made if new).
CREATE FUNCTION internal.calls_link_character()
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
REVOKE ALL ON FUNCTION internal.calls_link_character() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER calls_link_character BEFORE INSERT OR UPDATE OF character_name ON public.call_sheet_calls
  FOR EACH ROW EXECUTE FUNCTION internal.calls_link_character();

-- Renaming a character renames it in its calls too (as it already does in castings and scenes).
CREATE OR REPLACE FUNCTION internal.characters_rename()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  update public.character_castings set character_name = new.name where character_id = new.id;
  update public.call_sheet_calls set character_name = new.name where character_id = new.id;
  update public.scenes s set cast_list = (
    select string_agg(case when upper(btrim(x)) = old.name then new.name else btrim(x) end, ', ')
    from unnest(string_to_array(s.cast_list, ',')) x
  )
  where s.id in (select scene_id from public.scene_characters where character_id = new.id);
  return null;
end;
$function$;
