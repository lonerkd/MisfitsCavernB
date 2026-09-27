-- Scene readiness reads who's cast (character_castings) alongside the
-- breakdown, shots and schedule, and must change the moment someone casts a
-- role — on this screen or a crewmate's. Castings join the Realtime
-- publication (RLS still decides who receives each change).
ALTER PUBLICATION supabase_realtime ADD TABLE public.character_castings;

-- The old canvas boards (studio_boards / studio_assets) were replaced by the
-- media library and have no reader or writer left in the app. Dropped with
-- the owner's approval; the two remaining assets were external links on a
-- board with no project (recorded in the PR description).
DROP TABLE public.studio_assets;
DROP TABLE public.studio_boards;
