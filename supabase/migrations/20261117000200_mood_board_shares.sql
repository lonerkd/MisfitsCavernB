-- Mood boards: a share link per board. "Anyone with the link" reads one board (its cards, notes and the images on
-- it) and nothing else of the project. The link is a row in mood_board_shares: present = shared, deleted = closed, a
-- new row = a new link. Only people who shape the project (owner, leads, contributors: internal.can_shape_project, as
-- for a script's link) can read or change it; a view-only member or an outsider cannot. The public reads through get_shared_board(token) only; no policy reads a
-- board for being shared.

CREATE TABLE public.mood_board_shares (
  board_id uuid NOT NULL,
  project_id uuid NOT NULL,
  token text DEFAULT (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')) NOT NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT mood_board_shares_pkey PRIMARY KEY (board_id),
  CONSTRAINT mood_board_shares_token_key UNIQUE (token),
  CONSTRAINT mood_board_shares_board_fkey FOREIGN KEY (board_id, project_id) REFERENCES public.mood_boards(id, project_id) ON DELETE CASCADE,
  CONSTRAINT mood_board_shares_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT mood_board_shares_token_check CHECK (char_length(token) >= 32)
);
CREATE INDEX mood_board_shares_project_idx ON public.mood_board_shares USING btree (project_id);
CREATE INDEX mood_board_shares_board_fkey_idx ON public.mood_board_shares USING btree (board_id, project_id);
CREATE INDEX mood_board_shares_created_by_idx ON public.mood_board_shares USING btree (created_by);

ALTER TABLE public.mood_board_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mood_board_shares view" ON public.mood_board_shares FOR SELECT TO authenticated
  USING (internal.can_shape_project(project_id));
CREATE POLICY "mood_board_shares insert" ON public.mood_board_shares FOR INSERT TO authenticated
  WITH CHECK (internal.can_shape_project(project_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY "mood_board_shares delete" ON public.mood_board_shares FOR DELETE TO authenticated
  USING (internal.can_shape_project(project_id));
GRANT SELECT, INSERT, DELETE ON public.mood_board_shares TO authenticated;
REVOKE ALL ON public.mood_board_shares FROM anon;

-- What the link reads: the board, its cards in stacking order, and for each library item only what shows it.
CREATE FUNCTION public.get_shared_board(p_token text)
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

-- A file on a shared board loads for the link: the "shared read" storage rule asks this function, which now also
-- says yes for a file that is on a board with a live link.
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
  );
$function$;

