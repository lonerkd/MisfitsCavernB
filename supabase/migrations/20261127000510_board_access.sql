-- Mood boards: board-level permissions. A board is one of three kinds of access:
--   open    (the default, what every board was until now): everyone with access to the project sees and edits it;
--   view    everyone with access to the project sees it, only people who shape the project (internal.can_shape_project:
--           owner, leads, contributors) edit it;
--   private only people who shape the project see or edit it (a view-only member or an outsider does not even see it).
-- Who may change the access of a board: people who shape the project. A member who does not can only keep a board
-- open (their writes with another access fail the policy check). The cards follow their board through the board's own
-- row security (the subquery below runs as the caller), so a private board's cards are invisible too.
-- Public share links are unaffected: they read through get_shared_board, made by people who shape the project.

ALTER TABLE public.mood_boards ADD COLUMN access text NOT NULL DEFAULT 'open';
ALTER TABLE public.mood_boards ADD CONSTRAINT mood_boards_access_check CHECK (access IN ('open', 'view', 'private'));

DROP POLICY "mood_boards view" ON public.mood_boards;
DROP POLICY "mood_boards insert" ON public.mood_boards;
DROP POLICY "mood_boards update" ON public.mood_boards;
DROP POLICY "mood_boards delete" ON public.mood_boards;

CREATE POLICY "mood_boards view" ON public.mood_boards FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id) AND (access <> 'private' OR internal.can_shape_project(project_id)));
CREATE POLICY "mood_boards insert" ON public.mood_boards FOR INSERT TO authenticated
  WITH CHECK (internal.can_access_project(project_id) AND created_by = (SELECT auth.uid())
    AND (access = 'open' OR internal.can_shape_project(project_id)));
CREATE POLICY "mood_boards update" ON public.mood_boards FOR UPDATE TO authenticated
  USING (internal.can_access_project(project_id) AND (access = 'open' OR internal.can_shape_project(project_id)))
  WITH CHECK (internal.can_access_project(project_id) AND (access = 'open' OR internal.can_shape_project(project_id)));
CREATE POLICY "mood_boards delete" ON public.mood_boards FOR DELETE TO authenticated
  USING (internal.can_access_project(project_id) AND (access = 'open' OR internal.can_shape_project(project_id)));

DROP POLICY "mood_board_items view" ON public.mood_board_items;
DROP POLICY "mood_board_items insert" ON public.mood_board_items;
DROP POLICY "mood_board_items update" ON public.mood_board_items;
DROP POLICY "mood_board_items delete" ON public.mood_board_items;

CREATE POLICY "mood_board_items view" ON public.mood_board_items FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id) AND EXISTS (
    SELECT 1 FROM public.mood_boards b WHERE b.id = mood_board_items.board_id AND b.project_id = mood_board_items.project_id));
CREATE POLICY "mood_board_items insert" ON public.mood_board_items FOR INSERT TO authenticated
  WITH CHECK (internal.can_access_project(project_id) AND created_by = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.mood_boards b WHERE b.id = mood_board_items.board_id AND b.project_id = mood_board_items.project_id
      AND (b.access = 'open' OR internal.can_shape_project(b.project_id))));
CREATE POLICY "mood_board_items update" ON public.mood_board_items FOR UPDATE TO authenticated
  USING (internal.can_access_project(project_id) AND EXISTS (
    SELECT 1 FROM public.mood_boards b WHERE b.id = mood_board_items.board_id AND b.project_id = mood_board_items.project_id
      AND (b.access = 'open' OR internal.can_shape_project(b.project_id))))
  WITH CHECK (internal.can_access_project(project_id) AND EXISTS (
    SELECT 1 FROM public.mood_boards b WHERE b.id = mood_board_items.board_id AND b.project_id = mood_board_items.project_id
      AND (b.access = 'open' OR internal.can_shape_project(b.project_id))));
CREATE POLICY "mood_board_items delete" ON public.mood_board_items FOR DELETE TO authenticated
  USING (internal.can_access_project(project_id) AND EXISTS (
    SELECT 1 FROM public.mood_boards b WHERE b.id = mood_board_items.board_id AND b.project_id = mood_board_items.project_id
      AND (b.access = 'open' OR internal.can_shape_project(b.project_id))));
