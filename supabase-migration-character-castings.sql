-- Migration: real casting links between screenplay characters and crew members.
--
-- The old script_characters / character_references tables exist live but are
-- completely unused (0 rows, no app code reads/writes them) -- they modeled a
-- relational Character Bible that was superseded by the JSONB-based one in
-- script_metadata.character_bible (see lib/scriptos/bible.ts). Reviving those
-- dead tables would mean migrating live JSONB data into a new relational shape
-- for no reason. Burying casting inside the JSONB blob instead would make it
-- unqueryable in reverse (crew member -> "what am I cast as, and where").
--
-- So casting gets its own small, purpose-built table instead: cheap to join
-- both directions, doesn't touch the JSONB bible at all, and doesn't resurrect
-- the orphaned tables.

CREATE TABLE IF NOT EXISTS character_castings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  character_name TEXT NOT NULL,
  crew_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, character_name)
);

CREATE INDEX IF NOT EXISTS idx_character_castings_project ON character_castings(project_id);
CREATE INDEX IF NOT EXISTS idx_character_castings_crew_user ON character_castings(crew_user_id);

ALTER TABLE character_castings ENABLE ROW LEVEL SECURITY;

-- Same visibility rule as the rest of a project's production data: creator or
-- crew can see it; only creator/crew can write it (reusing the existing
-- is_project_creator/is_project_member helper functions).
CREATE POLICY "Castings viewable by project creator or crew" ON character_castings FOR SELECT
  USING (public.is_project_creator(project_id) OR public.is_project_member(project_id));
CREATE POLICY "Castings writable by project creator or crew" ON character_castings FOR ALL
  USING (public.is_project_creator(project_id) OR public.is_project_member(project_id))
  WITH CHECK (public.is_project_creator(project_id) OR public.is_project_member(project_id));
