-- Mood boards: boards as objects of their own (a project can have many), each an arrangement of library items
-- and free notes on a canvas. Positions are percentages of the board (0-100), so a board looks the same at any size.
-- Composite foreign keys pin a board's items to the board's own project and to media of that project.
-- Everyone on the project reads; people who work on the project arrange (the same rule as scene_media).

CREATE TABLE public.mood_boards (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid NOT NULL,
  name text NOT NULL,
  template text DEFAULT 'free' NOT NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT mood_boards_pkey PRIMARY KEY (id),
  CONSTRAINT mood_boards_id_project_key UNIQUE (id, project_id),
  CONSTRAINT mood_boards_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT mood_boards_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT mood_boards_name_check CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  CONSTRAINT mood_boards_template_check CHECK (template IN ('free', 'character', 'location', 'tone', 'colour'))
);
CREATE INDEX mood_boards_project_idx ON public.mood_boards USING btree (project_id);
CREATE INDEX mood_boards_created_by_idx ON public.mood_boards USING btree (created_by);

CREATE TABLE public.mood_board_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  board_id uuid NOT NULL,
  project_id uuid NOT NULL,
  media_id uuid,
  note text,
  x real DEFAULT 5 NOT NULL,
  y real DEFAULT 5 NOT NULL,
  w real DEFAULT 24 NOT NULL,
  z integer DEFAULT 0 NOT NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT mood_board_items_pkey PRIMARY KEY (id),
  CONSTRAINT mood_board_items_board_fkey FOREIGN KEY (board_id, project_id) REFERENCES public.mood_boards(id, project_id) ON DELETE CASCADE,
  CONSTRAINT mood_board_items_media_fkey FOREIGN KEY (media_id, project_id) REFERENCES public.media(id, project_id) ON DELETE CASCADE,
  CONSTRAINT mood_board_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT mood_board_items_one_thing CHECK ((media_id IS NOT NULL) <> (note IS NOT NULL)),
  CONSTRAINT mood_board_items_note_check CHECK (note IS NULL OR char_length(note) BETWEEN 1 AND 1000),
  CONSTRAINT mood_board_items_x_check CHECK (x BETWEEN 0 AND 100),
  CONSTRAINT mood_board_items_y_check CHECK (y BETWEEN 0 AND 100),
  CONSTRAINT mood_board_items_w_check CHECK (w BETWEEN 5 AND 100)
);
CREATE INDEX mood_board_items_board_idx ON public.mood_board_items USING btree (board_id, project_id);
CREATE INDEX mood_board_items_media_idx ON public.mood_board_items USING btree (media_id, project_id);
CREATE INDEX mood_board_items_project_idx ON public.mood_board_items USING btree (project_id);
CREATE INDEX mood_board_items_created_by_idx ON public.mood_board_items USING btree (created_by);

ALTER TABLE public.mood_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mood_boards view" ON public.mood_boards FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id));
CREATE POLICY "mood_boards insert" ON public.mood_boards FOR INSERT TO authenticated
  WITH CHECK (internal.can_access_project(project_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY "mood_boards update" ON public.mood_boards FOR UPDATE TO authenticated
  USING (internal.can_access_project(project_id))
  WITH CHECK (internal.can_access_project(project_id));
CREATE POLICY "mood_boards delete" ON public.mood_boards FOR DELETE TO authenticated
  USING (internal.can_access_project(project_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mood_boards TO authenticated;
REVOKE ALL ON public.mood_boards FROM anon;

ALTER TABLE public.mood_board_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mood_board_items view" ON public.mood_board_items FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id));
CREATE POLICY "mood_board_items insert" ON public.mood_board_items FOR INSERT TO authenticated
  WITH CHECK (internal.can_access_project(project_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY "mood_board_items update" ON public.mood_board_items FOR UPDATE TO authenticated
  USING (internal.can_access_project(project_id))
  WITH CHECK (internal.can_access_project(project_id));
CREATE POLICY "mood_board_items delete" ON public.mood_board_items FOR DELETE TO authenticated
  USING (internal.can_access_project(project_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mood_board_items TO authenticated;
REVOKE ALL ON public.mood_board_items FROM anon;

-- updated_at, so Realtime echoes of our own writes merge in order (as the other live tables do).
CREATE FUNCTION internal.mood_boards_touch()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.mood_boards_touch() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER mood_boards_touch BEFORE UPDATE ON public.mood_boards FOR EACH ROW EXECUTE FUNCTION internal.mood_boards_touch();
CREATE TRIGGER mood_board_items_touch BEFORE UPDATE ON public.mood_board_items FOR EACH ROW EXECUTE FUNCTION internal.mood_boards_touch();

ALTER PUBLICATION supabase_realtime ADD TABLE public.mood_boards, public.mood_board_items;
