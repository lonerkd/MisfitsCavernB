-- A rename by crew now carries the notes and candidates too (nightly review 2026-11-27, #782).
--
-- characters_rename() ran as the person renaming. Any project member may rename a character
-- (the "characters access" policy), but casting_notes may only be updated by the project
-- creator, so when crew renamed one the notes' character_name text silently stayed on the old
-- name (the UPDATE matched no rows under RLS). The trigger only mirrors the new name onto rows
-- already linked to that character by id, in the character's own project, so it runs with
-- definer rights: it grants nothing the rename itself did not. It lives in `internal`, which
-- the API does not expose, and keeps an empty search_path.

CREATE OR REPLACE FUNCTION internal.characters_rename()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
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
REVOKE ALL ON FUNCTION internal.characters_rename() FROM PUBLIC, anon, authenticated;
