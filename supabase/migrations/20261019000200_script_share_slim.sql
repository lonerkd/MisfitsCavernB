-- Remove format and updated_at from get_shared_script: callers only need the
-- content and author metadata, and the eco-consolidation test expects exactly
-- (title, content, author_username, author_avatar_url, author_role).

CREATE OR REPLACE FUNCTION public.get_shared_script(p_token text)
 RETURNS TABLE(title text, content text, author_username text, author_avatar_url text, author_role text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT s.title, coalesce(s.content, ''), p.username, p.avatar_url, p.role
  FROM public.scripts s
  LEFT JOIN public.profiles p ON p.id = s.created_by
  WHERE s.shared
    AND coalesce(p_token, '') <> ''
    AND s.share_token = p_token;
$function$;
