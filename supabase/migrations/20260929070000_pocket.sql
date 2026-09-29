-- Pocket: the suite on the go.
--
-- 1. A note is a library item of its own — a line of dialogue, an idea, what
--    the location manager said — written on a phone and there on the desk.
--    It has no file and no link, only its words (in notes), and it is never
--    part of a share link.
-- 2. places: where someone last worked on each kind of device ("phone",
--    "desktop"), so each can offer to pick up where the other left off. Kept in
--    profiles.ui_prefs, written only through set_my_ui_prefs, checked as
--    strictly as the other keys.

ALTER TABLE public.media DROP CONSTRAINT media_kind_check;
ALTER TABLE public.media ADD CONSTRAINT media_kind_check CHECK (kind IN ('image', 'video', 'audio', 'document', 'link', 'note'));

ALTER TABLE public.media DROP CONSTRAINT media_one_source;
ALTER TABLE public.media ADD CONSTRAINT media_one_source CHECK (
  (kind = 'note' AND storage_path IS NULL AND external_url IS NULL AND char_length(btrim(coalesce(notes, ''))) > 0)
  OR (kind <> 'note' AND (storage_path IS NULL) <> (external_url IS NULL))
);
ALTER TABLE public.media ADD CONSTRAINT media_note_private CHECK (kind <> 'note' OR NOT shared);

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
    elsif k = 'theme' then
      -- A preset by name ("paper", "system"), or custom colours.
      if jsonb_typeof(v) <> 'object'
         or exists (select 1 from jsonb_object_keys(v) t where t not in ('id', 'bg', 'accent'))
         or jsonb_typeof(v -> 'id') is distinct from 'string'
         or (v ->> 'id') !~ '^[a-z]{2,20}$' then
        raise exception 'theme is an id, and colours for a custom theme' using errcode = '22023';
      end if;
      if v ->> 'id' = 'custom' then
        if coalesce(v ->> 'bg', '') !~ '^#[0-9a-fA-F]{6}$' or coalesce(v ->> 'accent', '') !~ '^#[0-9a-fA-F]{6}$' then
          raise exception 'a custom theme needs bg and accent as #rrggbb' using errcode = '22023';
        end if;
      elsif v ? 'bg' or v ? 'accent' then
        raise exception 'only a custom theme has colours' using errcode = '22023';
      end if;
    elsif k = 'places' then
      -- { phone: { path, label, at, project? } | null, desktop: … } — the whole object is replaced.
      if jsonb_typeof(v) <> 'object'
         or exists (select 1 from jsonb_object_keys(v) d where d not in ('phone', 'desktop')) then
        raise exception 'places holds phone and desktop' using errcode = '22023';
      end if;
      if exists (
        select 1 from jsonb_each(v) d
        where jsonb_typeof(d.value) <> 'null' and (
          jsonb_typeof(d.value) <> 'object'
          or exists (select 1 from jsonb_object_keys(d.value) f where f not in ('path', 'label', 'at', 'project'))
          or jsonb_typeof(d.value -> 'path') is distinct from 'string'
          or char_length(d.value ->> 'path') > 300
          or (d.value ->> 'path') !~ '^/([A-Za-z0-9_?=&%.,:+~-][A-Za-z0-9/_?=&%.,:+~-]*)?$'
          or jsonb_typeof(d.value -> 'label') is distinct from 'string'
          or char_length(d.value ->> 'label') not between 1 and 120
          or jsonb_typeof(d.value -> 'at') is distinct from 'string'
          or (d.value ->> 'at') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$'
          or (d.value ? 'project' and jsonb_typeof(d.value -> 'project') <> 'null' and (
            jsonb_typeof(d.value -> 'project') <> 'string'
            or (d.value ->> 'project') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'))
        )
      ) then
        raise exception 'a place is a path in the suite, a short label and when' using errcode = '22023';
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
