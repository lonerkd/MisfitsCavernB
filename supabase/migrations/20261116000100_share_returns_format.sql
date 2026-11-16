-- get_shared_script also returns the script's format, so the public share page
-- reads it with the same rules as the editor (readingFormat). The return type
-- gains a column, so the function is dropped and recreated with the same
-- security, search path and grants. Nothing new is exposed to an unshared
-- script: the WHERE clause is unchanged.

DROP FUNCTION IF EXISTS public.get_shared_script(text);
CREATE FUNCTION public.get_shared_script(p_token text)
 RETURNS TABLE(title text, content text, format text, author_username text, author_avatar_url text, author_role text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT s.title, coalesce(s.content, ''), s.format, p.username, p.avatar_url, p.role
  FROM public.scripts s
  LEFT JOIN public.profiles p ON p.id = s.created_by
  WHERE s.shared
    AND coalesce(p_token, '') <> ''
    AND s.share_token = p_token;
$function$;
REVOKE ALL ON FUNCTION public.get_shared_script(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_script(text) TO anon, authenticated, postgres, service_role;
