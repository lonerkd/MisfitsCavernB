-- Themes follow the account: profiles.ui_prefs.theme holds the look someone
-- chose in Settings › Appearance (lib/themes.ts) — a preset by id, "system"
-- (follows the device's light/dark setting), or custom colours — so it's the
-- same on every device they sign in on. This device keeps a copy only to
-- paint the first frame before the account's prefs load.
--
-- set_my_ui_prefs accepts the new key, checked as strictly as the others.

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
    else
      raise exception 'Unknown preference %', k using errcode = '22023';
    end if;
    clean := clean || jsonb_build_object(k, v);
  end loop;
  update public.profiles set ui_prefs = ui_prefs || clean where id = uid returning ui_prefs into out;
  return coalesce(out, '{}'::jsonb);
end;
$function$;
