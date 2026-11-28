-- Mood boards: annotation pins. A pin is a short note fixed to a spot on one card of a board (x, y in percent of the
-- card), the way a director marks "this light, not that grain" on a reference. Pins follow their card: they die with it,
-- they are seen by whoever sees the board, they are written by whoever may edit the board (the board's access, see
-- 20261127000510), live for the crew, and appear on the board's share link as part of get_shared_board.

ALTER TABLE public.mood_board_items ADD CONSTRAINT mood_board_items_id_project_key UNIQUE (id, project_id);

CREATE TABLE public.mood_board_pins (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  item_id uuid NOT NULL,
  project_id uuid NOT NULL,
  x real NOT NULL,
  y real NOT NULL,
  text text NOT NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT mood_board_pins_pkey PRIMARY KEY (id),
  CONSTRAINT mood_board_pins_item_fkey FOREIGN KEY (item_id, project_id) REFERENCES public.mood_board_items(id, project_id) ON DELETE CASCADE,
  CONSTRAINT mood_board_pins_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT mood_board_pins_x_check CHECK (x BETWEEN 0 AND 100),
  CONSTRAINT mood_board_pins_y_check CHECK (y BETWEEN 0 AND 100),
  CONSTRAINT mood_board_pins_text_check CHECK (char_length(btrim(text)) BETWEEN 1 AND 500)
);
CREATE INDEX mood_board_pins_item_idx ON public.mood_board_pins USING btree (item_id, project_id);
CREATE INDEX mood_board_pins_project_idx ON public.mood_board_pins USING btree (project_id);
CREATE INDEX mood_board_pins_created_by_idx ON public.mood_board_pins USING btree (created_by);

ALTER TABLE public.mood_board_pins ENABLE ROW LEVEL SECURITY;
-- The card is read through its own row security, so a pin on a private board's card is invisible too.
CREATE POLICY "mood_board_pins view" ON public.mood_board_pins FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id) AND EXISTS (
    SELECT 1 FROM public.mood_board_items i WHERE i.id = mood_board_pins.item_id AND i.project_id = mood_board_pins.project_id));
CREATE POLICY "mood_board_pins insert" ON public.mood_board_pins FOR INSERT TO authenticated
  WITH CHECK (internal.can_access_project(project_id) AND created_by = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.mood_board_items i JOIN public.mood_boards b ON b.id = i.board_id AND b.project_id = i.project_id
    WHERE i.id = mood_board_pins.item_id AND i.project_id = mood_board_pins.project_id
      AND (b.access = 'open' OR internal.can_shape_project(b.project_id))));
CREATE POLICY "mood_board_pins update" ON public.mood_board_pins FOR UPDATE TO authenticated
  USING (internal.can_access_project(project_id) AND EXISTS (
    SELECT 1 FROM public.mood_board_items i JOIN public.mood_boards b ON b.id = i.board_id AND b.project_id = i.project_id
    WHERE i.id = mood_board_pins.item_id AND i.project_id = mood_board_pins.project_id
      AND (b.access = 'open' OR internal.can_shape_project(b.project_id))))
  WITH CHECK (internal.can_access_project(project_id) AND EXISTS (
    SELECT 1 FROM public.mood_board_items i JOIN public.mood_boards b ON b.id = i.board_id AND b.project_id = i.project_id
    WHERE i.id = mood_board_pins.item_id AND i.project_id = mood_board_pins.project_id
      AND (b.access = 'open' OR internal.can_shape_project(b.project_id))));
CREATE POLICY "mood_board_pins delete" ON public.mood_board_pins FOR DELETE TO authenticated
  USING (internal.can_access_project(project_id) AND EXISTS (
    SELECT 1 FROM public.mood_board_items i JOIN public.mood_boards b ON b.id = i.board_id AND b.project_id = i.project_id
    WHERE i.id = mood_board_pins.item_id AND i.project_id = mood_board_pins.project_id
      AND (b.access = 'open' OR internal.can_shape_project(b.project_id))));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mood_board_pins TO authenticated;
REVOKE ALL ON public.mood_board_pins FROM anon;

CREATE TRIGGER mood_board_pins_touch BEFORE UPDATE ON public.mood_board_pins FOR EACH ROW EXECUTE FUNCTION internal.mood_boards_touch();
ALTER PUBLICATION supabase_realtime ADD TABLE public.mood_board_pins;

-- The link now also carries each card's pins, oldest first (the page numbers them 1, 2, 3 in that order).
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
          'external_url', m.external_url, 'mime_type', m.mime_type, 'width', m.width, 'height', m.height) end,
        'pins', coalesce((
          select jsonb_agg(jsonb_build_object('id', pn.id, 'x', pn.x, 'y', pn.y, 'text', pn.text) order by pn.created_at, pn.id)
          from public.mood_board_pins pn where pn.item_id = i.id
        ), '[]'::jsonb)
      ) order by i.z, i.created_at, i.id)
      from public.mood_board_items i
      left join public.media m on m.id = i.media_id
      where i.board_id = (select id from s)
    ), '[]'::jsonb)
  ) end;
$function$;
REVOKE ALL ON FUNCTION public.get_shared_board(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_board(text) TO anon, authenticated, service_role;

-- Who wrote a pin never changes: collaborators on an open board may edit each other's pins (the update policy), but an update
-- cannot move the authorship onto someone else (review of 2026-11-27, as for budget fringes).
CREATE FUNCTION internal.mood_board_pins_keep_author()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.created_by := old.created_by;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.mood_board_pins_keep_author() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER mood_board_pins_keep_author BEFORE UPDATE ON public.mood_board_pins
  FOR EACH ROW EXECUTE FUNCTION internal.mood_board_pins_keep_author();
