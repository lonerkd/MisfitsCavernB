-- Script share links (/s/<token>) — BACKLOG 3.3, found in the bible audit.
--
-- Until now a shared script was readable by anyone, link or not: the anon
-- policy "Shared scripts publicly viewable" was `using (shared = true)` and
-- the signed-in "scripts view" policy had the same arm, so a signed-out
-- `select … where shared` listed every shared script — the token protected
-- nothing. Now:
--   * neither SELECT policy has a `shared` arm — a script is read through the
--     table only by its owner or its project's people;
--   * get_shared_script(token) resolves a link: the exact token, while
--     sharing is on — title, words, format, when it changed, and the author's
--     public profile, nothing else;
--   * turning sharing on or off, or changing the token (revoking the old
--     link), is for the script's owner — on a project script, its shapers
--     (owner, leads, contributors) — and a new token must be long enough to
--     stay unguessable. Viewers still edit the words as before.

DROP POLICY "Shared scripts publicly viewable" ON public.scripts;

DROP POLICY "scripts view" ON public.scripts;
CREATE POLICY "scripts view" ON public.scripts FOR SELECT TO authenticated
  USING (
    (project_id IS NULL AND created_by = (SELECT auth.uid()))
    OR (project_id IS NOT NULL AND internal.can_access_project(project_id))
  );

CREATE FUNCTION public.get_shared_script(p_token text)
 RETURNS TABLE(title text, content text, format text, updated_at timestamp with time zone, author_username text, author_avatar_url text, author_role text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT s.title, coalesce(s.content, ''), s.format, s.updated_at, p.username, p.avatar_url, p.role
  FROM public.scripts s
  LEFT JOIN public.profiles p ON p.id = s.created_by
  WHERE s.shared
    AND coalesce(p_token, '') <> ''
    AND s.share_token = p_token;
$function$;
REVOKE ALL ON FUNCTION public.get_shared_script(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_script(text) TO anon, authenticated, service_role;

-- Definer so it can ask internal.can_shape_project (plpgsql resolves names
-- at run time, and the API roles can't see the internal schema); it decides
-- for the signed-in caller, by auth.uid(). Not callable through the API (a
-- trigger function).
CREATE FUNCTION internal.scripts_share_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  -- Signed-in callers only; the database's own jobs (account deletion, admin
  -- maintenance) have no caller and aren't sharing anything.
  if (select auth.uid()) is null then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new.shared is not distinct from old.shared
     and new.share_token is not distinct from old.share_token then
    return new;
  end if;
  if tg_op = 'INSERT' and not coalesce(new.shared, false) then
    return new;
  end if;
  if not (
    (new.project_id is null and new.created_by = (select auth.uid()))
    or (new.project_id is not null and internal.can_shape_project(new.project_id))
  ) then
    raise exception 'Only the script''s owner can share it' using errcode = '42501';
  end if;
  if new.share_token is null or length(new.share_token) < 24 or new.share_token !~ '^[A-Za-z0-9_-]+$' then
    raise exception 'A share link needs a long random token' using errcode = '22023';
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.scripts_share_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER scripts_share_guard BEFORE INSERT OR UPDATE ON public.scripts
  FOR EACH ROW EXECUTE FUNCTION internal.scripts_share_guard();
