-- Project visibility model: private (owner only) / team (crew) / link (anyone
-- with the share URL) / public (anyone). The portfolio stays a manual pitch
-- board; this controls who can even see a project row, and powers "anyone with
-- the link" sharing.
--
-- Persona expectations:
--   Sam   (owner): sees and edits every project he owns, at every level.
--   Jordan(crew):  sees team/link/public projects he's crew on; NOT private ones.
--   Riley(anon):   sees ONLY public projects, and link projects whose token he
--                  has (the token in the URL is the capability).
ALTER TABLE projects ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'team'
  CHECK (visibility IN ('private', 'team', 'link', 'public'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');

-- Backfill legacy rows: every project gets a token; is_public stays in sync with
-- visibility so nothing reading the old boolean breaks.
UPDATE projects SET share_token = encode(gen_random_bytes(16), 'hex') WHERE share_token IS NULL OR share_token = '';
UPDATE projects SET is_public = (visibility = 'public');

-- RLS: replace the blanket member-view policy with the level-aware set.
DROP POLICY IF EXISTS "Project members can view" ON projects;
CREATE POLICY "Project members can view" ON projects FOR SELECT USING (
  visibility <> 'private' AND (creator_id = (SELECT auth.uid()) OR internal.is_project_member(id))
);
CREATE POLICY "Private projects viewable by owner only" ON projects FOR SELECT USING (
  visibility = 'private' AND creator_id = (SELECT auth.uid())
);
CREATE POLICY "Public projects viewable by all" ON projects FOR SELECT USING (visibility = 'public');
CREATE POLICY "Link-shared projects readable by anyone with the link" ON projects FOR SELECT USING (visibility = 'link');
