-- Mood boards: a share link can expire. expires_at is optional (null = no expiry). Once it has passed, the link
-- behaves exactly like an unknown token: get_shared_board returns nothing and the board's images stop loading for
-- the link. People who shape the project (internal.can_shape_project, as for making and closing a link) set or
-- clear it; nobody else can, and they can change no other column of the row.

ALTER TABLE public.mood_board_shares ADD COLUMN expires_at timestamp with time zone;

CREATE POLICY "mood_board_shares update" ON public.mood_board_shares FOR UPDATE TO authenticated
  USING (internal.can_shape_project(project_id))
  WITH CHECK (internal.can_shape_project(project_id));
-- Only the expiry is writable: the token, the board and the owner of a link never change (a new link is a new row).
REVOKE UPDATE ON public.mood_board_shares FROM authenticated;
GRANT UPDATE (expires_at) ON public.mood_board_shares TO authenticated;

CREATE OR REPLACE FUNCTION public.get_shared_board(p_token text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with s as (
    select b.id, b.name, b.template, p.title as project_title
    from public.mood_board_shares sh
    join public.mood_boards b on b.id = sh.board_id
    join public.projects p on p.id = b.project_id
    where sh.token = p_token and coalesce(p_token, '') <> ''
      and (sh.expires_at is null or sh.expires_at > now())
  )
  select case when exists (select 1 from s) then jsonb_build_object(
    'name', (select name from s),
    'template', (select template from s),
    'project_title', (select project_title from s),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'x', i.x, 'y', i.y, 'w', i.w, 'z', i.z, 'note', i.note,
        'media', case when m.id is null then null else jsonb_build_object(
          'id', m.id, 'kind', m.kind, 'title', m.title, 'storage_path', m.storage_path,
          'external_url', m.external_url, 'mime_type', m.mime_type, 'width', m.width, 'height', m.height) end
      ) order by i.z, i.created_at, i.id)
      from public.mood_board_items i
      left join public.media m on m.id = i.media_id
      where i.board_id = (select id from s)
    ), '[]'::jsonb)
  ) end;
$function$;
REVOKE ALL ON FUNCTION public.get_shared_board(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_board(text) TO anon, authenticated, service_role;

-- A file on a shared board loads only while the link is live (not expired).
CREATE OR REPLACE FUNCTION internal.is_shared_media_object(object_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.media m join public.projects p on p.id = m.project_id
    where m.storage_path = object_name and m.shared and p.visibility in ('link', 'public')
  ) or exists (
    select 1 from public.media m
    join public.mood_board_items i on i.media_id = m.id and i.project_id = m.project_id
    join public.mood_board_shares sh on sh.board_id = i.board_id
    where m.storage_path = object_name
      and (sh.expires_at is null or sh.expires_at > now())
  );
$function$;
