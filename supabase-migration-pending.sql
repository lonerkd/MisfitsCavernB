-- Pending migration: run this once against the live Supabase DB.
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS guards).

-- 1. Portfolio media was missing a write policy, so creating/deleting media
--    items from /portfolio/manage silently failed under RLS.
DROP POLICY IF EXISTS "Portfolio media owner write" ON portfolio_media;
CREATE POLICY "Portfolio media owner write" ON portfolio_media FOR ALL USING (
  project_id IN (SELECT id FROM portfolio_projects WHERE user_id = auth.uid())
);

-- 2. Script share links: add share_token + shared flag so a script can be
--    made public at /s/[token], same pattern as portfolio_projects.
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS shared BOOLEAN DEFAULT FALSE;
UPDATE scripts SET share_token = encode(gen_random_bytes(16), 'hex') WHERE share_token IS NULL;

-- 3. The old "Script members can view" policy let ANY authenticated user
--    read ANY script with no project_id (project_id IS NULL OR ...), which
--    covers every personal/unassigned script in the app. Replacing it with
--    an ownership + explicit-share check closes that leak.
DROP POLICY IF EXISTS "Script members can view" ON scripts;
CREATE POLICY "Script members can view" ON scripts FOR SELECT USING (
  shared = TRUE OR
  created_by = auth.uid() OR
  last_edited_by = auth.uid() OR
  (project_id IS NOT NULL AND project_id IN (
    SELECT id FROM projects WHERE creator_id = auth.uid()
    UNION
    SELECT project_id FROM project_crew WHERE user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Authenticated users create scripts" ON scripts;
CREATE POLICY "Authenticated users create scripts" ON scripts FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Script editors can update" ON scripts;
CREATE POLICY "Script editors can update" ON scripts FOR UPDATE USING (
  created_by = auth.uid() OR
  last_edited_by = auth.uid() OR
  project_id IN (SELECT id FROM projects WHERE creator_id = auth.uid())
);

DROP POLICY IF EXISTS "Script owners can delete" ON scripts;
CREATE POLICY "Script owners can delete" ON scripts FOR DELETE USING (created_by = auth.uid());
