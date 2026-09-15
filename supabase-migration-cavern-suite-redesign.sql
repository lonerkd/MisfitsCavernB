-- Cavern Suite redesign — schema delta for PR #36
-- Safe to run as-is: every statement is idempotent (IF NOT EXISTS / IF EXISTS),
-- and the two DROPs are verified zero-reference tables (see comments below).
--
-- NOTE (helper schema): the RLS policies below are written against
-- `internal.is_project_creator` / `internal.is_project_member`. The
-- membership helpers originally lived in `public`; they were moved to
-- `internal` (so PostgREST cannot expose them as RPC) and the `public`
-- versions were dropped. Run this AFTER that move, or on a database built
-- from the current supabase-schema.sql.

-- 1. Per-scene production elements (props/wardrobe/vehicles/sfx/vfx tagged
--    from the script) — the real script -> schedule -> budget breakdown hinge.
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS elements JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. ScriptOS margin gutter: typed, line-anchored annotations on a script.
--    Each one conceptually "routes to" its owning department (shot -> shot
--    list, beat -> board, todo -> call sheet/props) — the routing is a label
--    for now, not yet a write into those tables.
CREATE TABLE IF NOT EXISTS script_annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  script_id UUID NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  line_index INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('shot', 'beat', 'note', 'revision', 'reference', 'todo')),
  text TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_script_annotations_script ON script_annotations(script_id);
ALTER TABLE script_annotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "script_annotations view" ON script_annotations;
CREATE POLICY "script_annotations view" ON script_annotations FOR SELECT TO authenticated
  USING (internal.is_project_creator(project_id) OR internal.is_project_member(project_id));

DROP POLICY IF EXISTS "script_annotations insert" ON script_annotations;
CREATE POLICY "script_annotations insert" ON script_annotations FOR INSERT TO authenticated
  WITH CHECK ((internal.is_project_creator(project_id) OR internal.is_project_member(project_id)) AND created_by = auth.uid());

DROP POLICY IF EXISTS "script_annotations delete" ON script_annotations;
CREATE POLICY "script_annotations delete" ON script_annotations FOR DELETE TO authenticated
  USING (internal.is_project_creator(project_id) OR internal.is_project_member(project_id));

-- 3. Schema debt cleanup: two duplicate-purpose table pairs, checked against
--    every call site in app/ and lib/ before touching either.
--      - `beats` vs `project_beats` -> project_beats is the one every
--        Studio/Editor code path reads and writes. `beats` has zero
--        references anywhere in app/ or lib/.
--      - `campaigns` vs `marketing_campaigns` -> campaigns is the one
--        Studio's Promos tab and Portfolio Distribution both use.
--        marketing_campaigns has zero references anywhere in app/ or lib/.
--    Neither dead table has inbound foreign keys, so dropping is safe with
--    no data migration needed.
DROP TABLE IF EXISTS beats;
DROP TABLE IF EXISTS marketing_campaigns;
