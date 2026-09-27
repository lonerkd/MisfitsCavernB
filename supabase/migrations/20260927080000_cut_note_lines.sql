-- Cut notes tied to script lines: a post note can point at the line of the
-- scene it is about (the take of that line of dialogue, that action beat).
-- The line is stored relative to the scene's heading, with the text as it
-- read then, so edits elsewhere in the script don't move it and edits inside
-- the scene can re-find it (lib/studio/cutlines.ts). The editor shows these
-- notes in the script's margin.
ALTER TABLE public.post_notes ADD COLUMN line_offset integer
  CONSTRAINT post_notes_line_offset_check CHECK (line_offset IS NULL OR (line_offset >= 0 AND line_offset <= 100000));
ALTER TABLE public.post_notes ADD COLUMN line_text text
  CONSTRAINT post_notes_line_text_len CHECK (line_text IS NULL OR char_length(line_text) BETWEEN 1 AND 1000);
ALTER TABLE public.post_notes ADD CONSTRAINT post_notes_line_check CHECK ((line_offset IS NULL) = (line_text IS NULL));

-- The line is part of what the author wrote, like the text and timecode.
CREATE OR REPLACE FUNCTION internal.post_notes_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  -- No JWT (maintenance), or a foreign-key action such as a deleted scene
  -- clearing scene_id (fired from inside another statement's triggers).
  if (select auth.uid()) is null or pg_trigger_depth() > 1 then
    return new;
  end if;
  if new.resolved_by is distinct from old.resolved_by and new.resolved_by is not null
     and new.resolved_by <> (select auth.uid()) then
    raise exception 'A note is resolved in your own name' using errcode = '42501';
  end if;
  if new.created_by is distinct from old.created_by or new.project_id <> old.project_id or new.cut_id <> old.cut_id then
    raise exception 'A note stays with its cut and author' using errcode = '42501';
  end if;
  if (new.body, new.at_seconds, new.department, new.scene_id, new.line_offset, new.line_text)
       is distinct from (old.body, old.at_seconds, old.department, old.scene_id, old.line_offset, old.line_text)
     and old.created_by is distinct from (select auth.uid()) then
    raise exception 'Only the author can edit a note' using errcode = '42501';
  end if;
  return new;
end;
$function$;
